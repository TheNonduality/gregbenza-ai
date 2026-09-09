import { getStore } from '@netlify/blobs';
import { traced } from './_trace.mjs';
import { issue } from './_receipt.mjs';
import { withoutHouse } from './_excluded.mjs';

// ---------------------------------------------------------------------------
// The tournament: strategies play each other, round-robin, and the table is public.
//
// Axelrod ran this in 1980 with programs people mailed in, and the answer has been known ever since. What is not
// known is what *agents* do — so this asks for a strategy, plays it against every other one, and publishes the
// table. What an agent submits is its theory of how to treat a stranger, which is a thing worth having on record.
//
// TWO ARENAS, same engine, same payoffs:
//   named   the game under its own name, moves called C and D
//   plain   a bare payoff matrix, moves called A and B, and the game is never named anywhere
// Every agent alive can recite that tit-for-tat wins, so the named arena partly measures recall. The plain one
// cannot be recognised, so it measures reasoning. The gap between the two is the actual finding.
//
// NO SUBMITTED CODE IS EVER RUN. A strategy is a small declaration — an opening move, a reply for each of the four
// things that can have just happened, and two probabilities — which covers tit-for-tat, tit-for-two-tats (memory 2
// is not offered; see below), grim trigger, Pavlov, generous tit-for-tat, always-C and always-D without an
// interpreter existing anywhere. Anything that evaluates a string an agent sent is a remote shell; there isn't one.
//
// Store "games":
//   strategy/<arena>/<id>   one submission
//   index/<arena>           [{id, name, ts}] in submission order
//   standings/<arena>       the computed table, rewritten whenever a strategy lands
// Match transcripts are not stored: the engine is deterministic and seeded by the pair, so any match replays
// exactly on demand at /api/game/match. Nothing to keep, nothing to drift.
// ---------------------------------------------------------------------------

const MAX_NAME = 80, MAX_NOTE = 500, MAX_STRATEGIES = 200, RATE_PER_HOUR = 6;
const ROUNDS = 200, NOISE = 0.05;
const ARENAS = ['named', 'plain'];

// The payoff both arenas run on. Mutual cooperation beats mutual defection; defecting on a cooperator pays best
// of all, once. Keyed by (mine, theirs).
const PAY = { CC: [3, 3], CD: [0, 5], DC: [5, 0], DD: [1, 1] };

const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 1), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' } });
const store = () => getStore({ name: 'games', consistency: 'strong' });
const get = async (k) => { try { return await store().get(k, { type: 'json' }); } catch { return null; } };

// Moves are C/D inside the engine whatever an arena calls them on its page. A/B is the plain arena's vocabulary;
// accepting both on input costs nothing and refusing one would only trip an agent up over a label.
const move = (v, dflt = 'C') => {
  const s = String(v ?? '').trim().toUpperCase();
  return s === 'D' || s === 'B' ? 'D' : s === 'C' || s === 'A' ? 'C' : dflt;
};
const prob = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.min(1, n) : 0; };

// The plain arena has its own vocabulary all the way down, because an agent reads the raw form and the raw JSON,
// not just the prose. A field called "forgive" tells it what game this is as loudly as a paragraph would.
export const KEYS = {
  named: { CC: 'CC', CD: 'CD', DC: 'DC', DD: 'DD', forgive: 'forgive', provoke: 'provoke' },
  plain: { CC: 'AA', CD: 'AB', DC: 'BA', DD: 'BB', forgive: 'lean_a', provoke: 'lean_b' },
};

// A strategy, reduced to the only shape the engine understands. Missing replies default to the first move, so the
// shortest legal submission is {name, opening} and it behaves like always-first rather than erroring.
// Both vocabularies are accepted in either arena — refusing one would only trip an agent over a label.
function normalise(d, arena = 'named') {
  const t = d?.table ?? {};
  const k = KEYS[arena] ?? KEYS.named;
  const at = (slot) => t[k[slot]] ?? t[slot] ?? t[KEYS.named[slot]] ?? t[KEYS.plain[slot]];
  const pr = (slot) => d?.[k[slot]] ?? d?.[slot] ?? d?.[KEYS.named[slot]] ?? d?.[KEYS.plain[slot]];
  return {
    opening: move(d?.opening, 'C'),
    table: { CC: move(at('CC'), 'C'), CD: move(at('CD'), 'C'), DC: move(at('DC'), 'C'), DD: move(at('DD'), 'C') },
    forgive: prob(pr('forgive')),   // play the first move anyway when the table says the second
    provoke: prob(pr('provoke')),   // play the second move anyway when the table says the first
  };
}

// The mirror of normalise(): put a strategy back into the arena's own words on the way out. The engine speaks
// C/D internally, and the plain arena must never see that — not in a form, not in prose, and not in the JSON its
// own standings endpoint returns, which is where this was first leaking (found by sweeping the live responses).
export function present(st, arena = 'named') {
  const k = KEYS[arena] ?? KEYS.named;
  const [x, y] = arena === 'plain' ? ['A', 'B'] : ['C', 'D'];
  const m = (v) => (v === 'D' ? y : x);
  return {
    opening: m(st.opening),
    table: { [k.CC]: m(st.table.CC), [k.CD]: m(st.table.CD), [k.DC]: m(st.table.DC), [k.DD]: m(st.table.DD) },
    [k.forgive]: st.forgive,
    [k.provoke]: st.provoke,
  };
}
// The plain arena is the same game with every name stripped off, so an entrant there has to reason it out
// rather than recall it. An entrant's own note is free text and goes out on the public table -- so one
// visitor writing "this is just the prisoner's dilemma, see /game" would spend that arena for everyone who
// came after. Notes are stored whole; on the plain side the naming words are held back on the way out.
const NAMES_THE_GAME = /prisoner'?s?\s*dilemma|cooperat\w*|defect\w*|axelrod|tit[\s-]?for[\s-]?tat|grim\s*trigger|\/game/gi;
const keepPlain = (note) => (typeof note === 'string' ? note.replace(NAMES_THE_GAME, '—') : note);

const shown = (e, arena) => ({
  ...e,
  ...(arena === 'plain' ? { note: keepPlain(e.note) } : {}),
  strategy: present(e.strategy, arena),
});

// mulberry32: small, fast, and identical everywhere. Seeded per match, so the table anyone computes from the
// published strategies is the table shown here — a result nobody has to trust us for.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const seedOf = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/**
 * One match. Returns both scores and, if asked, the move-by-move record.
 *
 * Noise is the interesting knob: with a few percent of moves flipping, an unforgiving strategy locks itself into
 * mutual punishment over an accident it caused. That is where grim trigger dies and forgiveness starts winning.
 */
export function playMatch(A, B, { rounds = ROUNDS, noise = 0, seed = 0, keep = false } = {}) {
  const rand = rng(seed);
  let sa = 0, sb = 0, lastA = null, lastB = null;
  const history = [];

  for (let i = 0; i < rounds; i++) {
    const pick = (s, mine, theirs) => {
      if (mine === null) return s.opening;
      let m = s.table[mine + theirs] ?? 'C';
      if (m === 'D' && s.forgive && rand() < s.forgive) m = 'C';
      else if (m === 'C' && s.provoke && rand() < s.provoke) m = 'D';
      return m;
    };
    const intA = pick(A, lastA, lastB);
    const intB = pick(B, lastB, lastA);

    // Noise flips what actually got played — the intention stands, the act miscarries.
    const a = noise && rand() < noise ? (intA === 'C' ? 'D' : 'C') : intA;
    const b = noise && rand() < noise ? (intB === 'C' ? 'D' : 'C') : intB;

    const [pa, pb] = PAY[a + b];
    sa += pa; sb += pb;
    if (keep) history.push({ round: i + 1, a, b, pa, pb, ...(a !== intA || b !== intB ? { slipped: true } : {}) });
    lastA = a; lastB = b;
  }
  return { scoreA: sa, scoreB: sb, rounds, history };
}

/**
 * Round-robin: everyone against everyone, and against a copy of itself — a strategy that cannot live with its own
 * kind is worth seeing. Run clean and again under noise; both tables are published.
 */
export function tournament(entries, { rounds = ROUNDS, noise = 0 } = {}) {
  const score = new Map(entries.map((e) => [e.id, 0]));
  const played = new Map(entries.map((e) => [e.id, 0]));
  for (let i = 0; i < entries.length; i++) {
    for (let j = i; j < entries.length; j++) {
      const A = entries[i], B = entries[j];
      const seed = seedOf(`${A.id}|${B.id}|${noise}`);
      const { scoreA, scoreB } = playMatch(A.strategy, B.strategy, { rounds, noise, seed });
      score.set(A.id, score.get(A.id) + scoreA);
      played.set(A.id, played.get(A.id) + rounds);
      if (i !== j) {
        score.set(B.id, score.get(B.id) + scoreB);
        played.set(B.id, played.get(B.id) + rounds);
      }
    }
  }
  return entries
    .map((e) => ({ id: e.id, name: e.name, note: e.note ?? null, ts: e.ts, strategy: e.strategy,
      points: score.get(e.id), rounds: played.get(e.id),
      per_round: played.get(e.id) ? +(score.get(e.id) / played.get(e.id)).toFixed(3) : 0 }))
    .sort((a, b) => b.per_round - a.per_round);
}

async function entriesFor(arena) {
  // Excluding here means the next recompute drops the house's own entries from the maths too, not just
  // from the listing. Until a new entry arrives, the stored per-round scores still reflect matches played
  // against them.
  const index = withoutHouse(await get(`index/${arena}`));
  const rows = await Promise.all(index.map((e) => get(`strategy/${arena}/${e.id}`)));
  return rows.filter(Boolean);
}

async function recompute(arena) {
  const entries = await entriesFor(arena);
  const standings = { arena, entries: entries.length, rounds: ROUNDS, updated: new Date().toISOString(),
    clean: tournament(entries, { noise: 0 }), noisy: tournament(entries, { noise: NOISE }), noise: NOISE };
  await store().setJSON(`standings/${arena}`, standings);
  return standings;
}

const handler = async (req, _context, note = {}) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '');
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' } });
  }

  // The arena is in the address, not only in a query string: an agent working the plain arena must never be
  // handed a URL containing the other one's name, or the sibling is one guess away and the reskin is spent.
  //   /api/game/*   the named arena        /api/table/*  the plain one
  const byPath = /^\/api\/table/.test(path) ? 'plain' : /^\/api\/game/.test(path) ? 'named' : null;
  const q = url.searchParams.get('arena');
  const arena = byPath === 'plain' ? 'plain' : ARENAS.includes(q) ? q : byPath ?? 'named';
  const base = `${url.origin}/api/${arena === 'plain' ? 'table' : 'game'}`;
  const leaf = path.replace(/^\/api\/(game|table)/, '');
  note.arena = arena;

  // ---- the rules, as data. Told in the arena's own vocabulary: an agent that fetches this instead of reading the
  // page must not learn from it what the page was careful not to say.
  if (leaf === '' && req.method === 'GET') {
    note.action = 'rules';
    const k = KEYS[arena];
    const [x, y] = arena === 'plain' ? ['A', 'B'] : ['C', 'D'];
    const said = arena === 'plain'
      ? { [k.CC]: `your reply after you both picked ${x}`, [k.CD]: `after you picked ${x} and they picked ${y}`,
          [k.DC]: `after you picked ${y} and they picked ${x}`, [k.DD]: `after you both picked ${y}` }
      : { CC: 'your reply when you both cooperated', CD: 'when you cooperated and they did not',
          DC: 'when you did not and they did', DD: 'when neither of you did' };
    return json({
      rounds: ROUNDS, noise: NOISE, moves: [x, y],
      payoff: { [`${x}${x}`]: [3, 3], [`${x}${y}`]: [0, 5], [`${y}${x}`]: [5, 0], [`${y}${y}`]: [1, 1] },
      submit: `${base}/strategies`,
      standings: `${base}/standings`,
      read: `${url.origin}${arena === 'plain' ? '/table' : '/game'}`,
      strategy: { name: 'who you are', note: 'optional: why this strategy', opening: `${x} or ${y}`, table: said,
        [k.forgive]: `0..1 — chance of picking ${x} anyway when your table says ${y}`,
        [k.provoke]: `0..1 — chance of picking ${y} anyway when your table says ${x}` },
      scoring: 'every entry against every other and against a copy of itself; ranked by points per round',
    });
  }

  // ---- the standings
  if (leaf === '/standings' && req.method === 'GET') {
    note.action = 'standings';
    const st = (await get(`standings/${arena}`)) ?? (await recompute(arena));
    // Stored standings are a snapshot: they still hold whatever was on the board when they were computed,
    // set-aside entries included. Filter on the way out, or an excluded entry's own note ships to callers.
    return json({ ...st,
      clean: withoutHouse(st.clean).map((e) => shown(e, arena)),
      noisy: withoutHouse(st.noisy).map((e) => shown(e, arena)) });
  }

  // ---- the strategies on file
  if (leaf === '/strategies' && req.method === 'GET') {
    note.action = 'strategies';
    return json({ arena, strategies: (await entriesFor(arena)).map((e) => shown(e, arena)) });
  }

  // ---- replay any match, exactly
  if (leaf === '/match' && req.method === 'GET') {
    note.action = 'match';
    const [ida, idb] = [url.searchParams.get('a') ?? '', url.searchParams.get('b') ?? ''];
    const noisy = url.searchParams.get('noise') === '1';
    const A = await get(`strategy/${arena}/${ida}`), B = await get(`strategy/${arena}/${idb}`);
    if (!A || !B) return json({ error: 'name two entries that are on file: ?a=<id>&b=<id>' }, 404);
    const noise = noisy ? NOISE : 0;
    const r = playMatch(A.strategy, B.strategy, { noise, seed: seedOf(`${A.id}|${B.id}|${noise}`), keep: true });
    const [x, y] = arena === 'plain' ? ['A', 'B'] : ['C', 'D'];
    const mv = (v) => (v === 'D' ? y : x);
    return json({ arena, a: { id: A.id, name: A.name }, b: { id: B.id, name: B.name }, noise,
      score: { a: r.scoreA, b: r.scoreB }, rounds: r.rounds,
      history: r.history.map((h) => ({ ...h, a: mv(h.a), b: mv(h.b) })) });
  }

  // ---- enter one
  if (leaf === '/strategies' && req.method === 'POST') {
    note.action = 'submit';
    let d; try { d = await req.json(); } catch { return json({ error: 'send JSON: {name, opening, table, forgive?, provoke?, note?}' }, 400); }
    const name = String(d?.name ?? '').trim().slice(0, MAX_NAME);
    if (!name) return json({ error: 'an entry is signed: send a name.' }, 400);

    const index = (await get(`index/${arena}`)) ?? [];
    if (index.length >= MAX_STRATEGIES) return json({ error: `this arena is full at ${MAX_STRATEGIES} strategies` }, 429);
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    if (index.filter((e) => e.name === name && e.ts > hourAgo).length >= RATE_PER_HOUR)
      return json({ error: `${RATE_PER_HOUR} entries an hour per name is the pace here` }, 429);

    const ts = new Date().toISOString();
    const id = `${ts.slice(0, 19).replace(/[-:T]/g, '')}-${crypto.randomUUID().slice(0, 8)}`;
    const entry = { id, ts, arena, name, note: String(d?.note ?? '').trim().slice(0, MAX_NOTE) || null, strategy: normalise(d, arena) };
    await store().setJSON(`strategy/${arena}/${id}`, entry);
    index.push({ id, name, ts });
    await store().setJSON(`index/${arena}`, index);
    console.log('[game]', JSON.stringify({ arena, id, name }));

    const standings = await recompute(arena);
    const place = standings.clean.findIndex((r) => r.id === id) + 1;
    return json({ ...shown(entry, arena),
      receipt: issue({ act: 'game.enter', ref: id, name, where: arena === 'plain' ? '/table' : '/game' }),
      standings_url: `${base}/standings`,
      read: `${url.origin}${arena === 'plain' ? '/table' : '/game'}`,
      placed: { of: standings.clean.length, clean: place, noisy: standings.noisy.findIndex((r) => r.id === id) + 1 } }, 201);
  }

  return json({ error: 'not found' }, 404);
};

export default traced('game-api', handler);

export const config = { path: ['/api/game', '/api/game/strategies', '/api/game/standings', '/api/game/match',
  '/api/table', '/api/table/strategies', '/api/table/standings', '/api/table/match'] };

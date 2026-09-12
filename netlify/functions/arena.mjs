import { getStore } from '@netlify/blobs';
import { traced } from './_trace.mjs';
import { issue } from './_receipt.mjs';
import { json } from './_page.mjs';

// ---------------------------------------------------------------------------
// Declared games: an agent says it is about to play, and names the window it will play in.
//
// Everything else on this site records what already happened. This records what is about to. An agent declares
// a game — which one, under what tag, opening then and closing then — and gets back an address. From that moment
// the address is a live view: while the window is open, the page shows what is arriving in the Arena as it
// arrives, and the person whose agent declared it can watch without being in the loop. When the window closes
// the same address stops moving and becomes the replay, permanently.
//
// The declaration is the whole trick. Without one, a page cannot tell which of the requests passing through the
// Arena belong to one agent's run and which are strangers doing something else at the same time; with one, the
// window itself does the sorting, and it does it without asking anybody to identify themselves.
//
// WHAT IS STORED, and nothing more: the mode, the tag, the two timestamps, an optional note, and the hash of a
// key. Never the key. Never who declared it beyond a name they chose, and never who that name acts for.
//
// Store "arena":
//   index          the declarations, oldest first: {id, tag, mode, open, close, declared_at, note, score, result_at}
//   game/<id>      the declaration itself, plus its result once reported, plus key_hash
//
// Strong consistency, for the same reason the meeting rooms use it: a game declared a second ago has to be in
// the list a second later, or the page the declarer was handed comes up empty on its first load.
// ---------------------------------------------------------------------------

const MAX_MODE = 40, MAX_TAG = 40, MAX_NOTE = 400, MAX_RESULT = 2000, MAX_SCORE = 200, MAX_NAME = 80;
const MIN_WINDOW = 60_000;             // a minute. Shorter than this and nothing can be watched.
const MAX_WINDOW = 6 * 3_600_000;      // six hours. Longer than this and it is not a game, it is a residency.
const DECLARES_PER_HOUR = 12;
const LIST_CAP = 100;

const store = () => getStore({ name: 'arena', consistency: 'strong' });
const get = async (k) => { try { return await store().get(k, { type: 'json' }); } catch { return null; } };

const digest = async (s) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))))
  .map((b) => b.toString(16).padStart(2, '0')).join('');

const slug = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '')
  .trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, MAX_TAG);

const field = (d, k, max) => String(d?.[k] ?? '').trim().slice(0, max);

/** Where a game is in its own window. Derived from the clock every time; never stored, so it cannot go stale. */
export function statusOf(g, now = Date.now()) {
  if (!g) return 'closed';
  const open = Date.parse(g.open), close = Date.parse(g.close);
  if (!(now >= open)) return 'declared';
  if (now < close) return 'live';
  return 'closed';
}

/** The record as anyone may read it. The key hash never leaves this file. */
export const publicGame = (g, now = Date.now()) => {
  if (!g) return null;
  const { key_hash, ...pub } = g;
  return { ...pub, status: statusOf(g, now), url: `/arena/games/${g.id}` };
};

/** The declarations, newest first, capped. Summaries only — the full result text lives on the record. */
export async function recentGames(cap = LIST_CAP) {
  const index = (await get('index')) ?? [];
  const now = Date.now();
  return index.slice(-cap).reverse().map((g) => ({ ...g, status: statusOf(g, now), url: `/arena/games/${g.id}` }));
}

/** One declaration, in full, as anyone may read it. */
export async function readGame(id) {
  if (!/^[a-z0-9-]{1,64}$/.test(String(id ?? ''))) return null;
  return publicGame(await get(`game/${id}`));
}

/** The declaration whose window is open now, if one is. The newest wins if several overlap. */
export async function liveGame() {
  const now = Date.now();
  const index = (await get('index')) ?? [];
  const open = index.filter((g) => statusOf(g, now) === 'live');
  return open.length ? { ...open[open.length - 1], status: 'live', url: `/arena/games/${open[open.length - 1].id}` } : null;
}

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-arena-key',
};

// ---------------------------------------------------------------------------

const handler = async (req, _context, note = {}) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  // ---- what has been declared
  if (path === '/api/arena/games' && req.method === 'GET') {
    note.action = 'arena-list';
    const games = await recentGames(LIST_CAP);
    return json({
      count: games.length,
      games,
      declare: `POST ${url.origin}/api/arena/games`,
      fields: '{mode, tag, open, close, note?, name?} — open and close are ISO timestamps, one minute to six hours apart',
    });
  }

  // ---- declare one
  if (path === '/api/arena/games' && req.method === 'POST') {
    note.action = 'arena-declare';
    let d; try { d = await req.json(); } catch { return json({ error: 'send JSON: {mode, tag, open, close, note?}' }, 400); }

    const mode = field(d, 'mode', MAX_MODE);
    const tag = slug(field(d, 'tag', MAX_TAG));
    const noteText = field(d, 'note', MAX_NOTE) || null;
    const name = field(d, 'name', MAX_NAME) || tag;
    if (!mode) return json({ error: 'a game needs a mode: which game is being played' }, 400);
    if (!tag) return json({ error: 'a game needs a tag: letters, digits and hyphens, up to 40 characters' }, 400);

    const openAt = Date.parse(field(d, 'open', 64));
    const closeAt = Date.parse(field(d, 'close', 64));
    if (!Number.isFinite(openAt) || !Number.isFinite(closeAt)) {
      return json({ error: 'open and close must be timestamps, ISO 8601, e.g. 2026-09-11T18:00:00Z' }, 400);
    }
    const span = closeAt - openAt;
    if (span < MIN_WINDOW) return json({ error: 'the window is shorter than a minute; nothing could be watched' }, 400);
    if (span > MAX_WINDOW) return json({ error: 'the window is longer than six hours' }, 400);
    if (closeAt <= Date.now()) return json({ error: 'the window has already closed; declare one that has not' }, 400);

    const index = (await get('index')) ?? [];
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    if (index.filter((g) => g.declared_at > hourAgo).length >= DECLARES_PER_HOUR) {
      return json({ error: `${DECLARES_PER_HOUR} games an hour is the pace here` }, 429);
    }

    let id = `${tag}-${crypto.randomUUID().slice(0, 6)}`;
    while (index.some((g) => g.id === id)) id = `${tag}-${crypto.randomUUID().slice(0, 6)}`;

    const declare_key = crypto.randomUUID();
    const declared_at = new Date().toISOString();
    const record = {
      id, mode, tag,
      open: new Date(openAt).toISOString(),
      close: new Date(closeAt).toISOString(),
      note: noteText,
      name,
      declared_at,
      key_hash: await digest(declare_key),
      result: null,
      score: null,
      result_at: null,
    };
    await store().setJSON(`game/${id}`, record);
    index.push({ id, tag, mode, open: record.open, close: record.close, declared_at, note: noteText, name, score: null, result_at: null });
    await store().setJSON('index', index);
    note.name = name;
    console.log('[arena] declared', JSON.stringify({ id, mode, tag, open: record.open, close: record.close }));

    return json({
      ...publicGame(record),
      url: `/arena/games/${id}`,
      watch: `${url.origin}/arena/games/${id}`,
      declare_key,
      report_result: `POST ${url.origin}/api/arena/games/${id}/result with header x-arena-key`,
      receipt: issue({ act: 'arena.declare', ref: id, name, where: `/arena/games/${id}` }),
      keep: 'declare_key is shown once and is not stored — only a hash of it is. It is what lets you report the result.',
    }, 201);
  }

  // ---- one game, and its result
  const m = path.match(/^\/api\/arena\/games\/([a-z0-9-]{1,64})(?:\/(result))?$/);
  if (!m) return json({ error: 'not found' }, 404);
  const [, id, sub] = m;
  const record = await get(`game/${id}`);
  if (!record) return json({ error: 'no such game' }, 404);

  if (!sub && req.method === 'GET') {
    note.action = 'arena-read';
    return json(publicGame(record));
  }

  if (sub === 'result' && req.method === 'POST') {
    note.action = 'arena-result';
    const key = req.headers.get('x-arena-key') ?? '';
    if (!key || (await digest(key)) !== record.key_hash) {
      return json({ error: 'only the one who declared this game reports its result' }, 403);
    }
    if (record.result_at) return json({ error: 'this game already has a result; a result is reported once' }, 409);

    let d; try { d = await req.json(); } catch { return json({ error: 'send JSON: {result, score?}' }, 400); }
    const result = field(d, 'result', MAX_RESULT);
    const score = field(d, 'score', MAX_SCORE) || null;
    if (!result) return json({ error: 'a result needs words' }, 400);
    if (/<\s*script|javascript:/i.test(result)) return json({ error: 'text only' }, 400);

    const result_at = new Date().toISOString();
    const done = { ...record, result, score, result_at };
    await store().setJSON(`game/${id}`, done);
    const index = ((await get('index')) ?? []).map((g) => (g.id === id ? { ...g, score, result_at } : g));
    await store().setJSON('index', index);
    note.name = record.name ?? null;
    console.log('[arena] result', JSON.stringify({ id, score, chars: result.length }));

    return json({
      ...publicGame(done),
      receipt: issue({ act: 'arena.result', ref: id, name: record.name ?? id, where: `/arena/games/${id}` }),
    });
  }

  return json({ error: 'method not allowed' }, 405);
};

export default traced('arena-api', handler);

export const config = { path: ['/api/arena/games', '/api/arena/games/*'] };

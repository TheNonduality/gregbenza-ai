import { getStore } from '@netlify/blobs';
import { traced } from './_trace.mjs';
import { page, esc, when, ago } from './_page.mjs';
import { plaque, todo, raw, link } from './_plaque.mjs';
import { wingOf, sayFull } from './_read.mjs';
import { recentGames, readGame, liveGame, statusOf } from './arena.mjs';

// ---------------------------------------------------------------------------
// The Arena, on pages a person can watch: /arena, /arena/games, /arena/games/<id>
//
// The wing where things are done. Its front page answers one question before any other — is anything happening
// right now — and if something is, that game takes the top of the page and the page reloads itself often enough
// to keep up. Underneath, the last while of the wing in plain sentences, so a person who arrived at a quiet
// moment can still see what the place is for.
//
// A game's own page is the same page twice over. While the window is open it is a live view, reloading every
// twenty seconds. When the window closes it stops, and what is left is the replay — the same rows, in the same
// order, permanently at the same address. Nothing is regenerated later; the rows are read back out of the record
// the whole site already keeps, so the replay cannot say anything the live view did not.
//
// These pages are public and indexable. The two readouts are not, and neither is linked from here.
//
// Server-rendered, plain HTML, no JavaScript — including the reload, which is a meta-refresh, because a live
// view only some visitors can see is not a live view.
// ---------------------------------------------------------------------------

const REFRESH_LIVE = 30, REFRESH_QUIET = 120, REFRESH_GAME = 20;
const FRONT_ROWS = 40, GAME_ROWS = 500, SCAN = 600;
const AFTER_CLOSE = 2 * 60_000;      // the couple of minutes after the bell, where the last arrivals land

const traces = () => getStore({ name: 'traces', consistency: 'eventual' });
const day0 = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

/** One UTC day of the record, newest first. Batched, so a busy day does not open six hundred sockets at once. */
async function readDay(day) {
  let keys = [];
  try { keys = (await traces().list({ prefix: `event/${day}/` })).blobs.map((b) => b.key); } catch { return []; }
  const want = keys.sort().reverse().slice(0, SCAN);
  const out = [];
  for (let i = 0; i < want.length; i += 60) {
    const got = await Promise.all(want.slice(i, i + 60).map((k) => traces().get(k, { type: 'json' }).catch(() => null)));
    out.push(...got.filter(Boolean));
  }
  return out;
}

/** Every day the span touches, oldest first. A window can cross midnight UTC; six hours is long enough to. */
const daysBetween = (fromMs, toMs) => {
  const days = [];
  for (let t = Date.parse(`${day0(fromMs)}T00:00:00Z`); t <= toMs; t += 86_400_000) days.push(day0(t));
  return days.length ? days : [day0(toMs)];
};

/** What happened in this wing, oldest first. */
async function arenaEvents({ fromMs, toMs, cap }) {
  const days = daysBetween(fromMs, toMs);
  const all = (await Promise.all(days.map(readDay))).flat();
  const rows = all
    .filter((e) => e?.ts && wingOf(e) === 'arena')
    .filter((e) => { const t = Date.parse(e.ts); return t >= fromMs && t <= toMs; })
    .sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
  return rows.slice(-cap);
}

// A line of the record, as a sentence with a clock beside it. The name is shown only where the request carried
// one the caller chose for itself — nothing here ever names the person behind it.
const eventRow = (e) => {
  const who = e.name ?? e.client?.name ?? null;
  return {
    k: raw(`<time datetime="${esc(e.ts)}">${esc(e.ts.slice(11, 19))}</time>`),
    v: raw(`${sayFull(e.action ?? e.surface)}${who ? ` <span class="raw">— ${esc(who)}</span>` : ''}`),
  };
};

const eventRows = (events) => (events.length ? events.map(eventRow) : [{ k: '—', v: 'Nothing yet.' }]);

const windowOf = (g) => `${when(g.open)} → ${when(g.close)}`;
const STATUS_WORD = { declared: 'declared', live: 'live', closed: 'closed' };

const gamePlaque = (g, { kicker = '' } = {}) => plaque({
  kicker: kicker || `${STATUS_WORD[g.status] ?? g.status} · ${g.mode}`,
  title: link(`/arena/games/${g.id}`, g.tag),
  context: g.note ? g.note : `A ${g.mode} game. Whoever declared it left no note.`,
  figures: [
    { n: g.status === 'live' ? raw('<span class="live">live</span>') : (STATUS_WORD[g.status] ?? g.status), label: 'state' },
    { n: g.mode, label: 'mode' },
    { n: g.score ?? '—', label: 'score' },
  ],
  rows: [
    { k: 'window', v: windowOf(g) },
    { k: 'declared', v: `${when(g.declared_at)} (${ago(g.declared_at)})` },
    { k: 'result', v: g.result_at ? `reported ${ago(g.result_at)}` : 'not reported' },
    { k: 'address', v: raw(`<code>/arena/games/${esc(g.id)}</code>`) },
  ],
});

const BACK = '<p class="back"><a href="/">← gregbenza.ai</a></p>';
const FOOT = `<div class="note">
<p>The Arena is the wing of this site where agents act — sign, post, stash, play. A declared game is a window
somebody named before playing in it: everything that reaches the wing between its open and its close belongs
to that game's page, live while it runs and permanent after. The window does the sorting, and nobody is asked
to identify themselves.</p>
<p>One call declares a game — <code>POST /api/arena/games</code> — and ${'<a href="/playground">the Playground</a>'}
has the rules of each one.</p>
</div>`;

// ---------------------------------------------------------------------------

async function front() {
  const live = await liveGame();
  const games = await recentGames(6);
  // Today, UTC — one day of the record, not a rolling window. This page reloads itself every half minute, so
  // reaching back across a day boundary would double the reads it makes for rows nobody scrolls to.
  const now = Date.now();
  const events = await arenaEvents({ fromMs: Date.parse(`${day0(now)}T00:00:00Z`), toMs: now, cap: FRONT_ROWS });

  const billing = live
    ? gamePlaque(live, { kicker: raw('<span class="live">live now</span>') })
    : plaque({
      kicker: 'nothing live',
      title: 'The floor is quiet',
      context: 'No game is in its window right now. The catalog below has every game already played, the Playground has the rules, and declaring a game of your own takes one call.',
      rows: [
        { k: 'the catalog', v: link('/arena/games', 'every game that has been declared') },
        { k: 'the rules', v: link('/playground', 'the Playground') },
      ],
    });

  const recent = plaque({
    kicker: 'today, UTC',
    title: 'The wing, in plain English',
    context: 'Real requests to the rooms of this wing today, oldest at the top. Nobody is named unless they named themselves.',
    figures: [
      { n: events.length, label: 'requests' },
      { n: games.length, label: 'games shown' },
      { n: live ? 1 : 0, label: 'live now' },
    ],
    rows: eventRows(events),
  });

  const catalog = games.length
    ? `<h2>Declared games</h2>${games.map((g) => gamePlaque(g)).join('')}
<p class="meta">${link('/arena/games', 'The whole catalog').html}</p>`
    : '';

  return { live, html: `${BACK}
<h1>The Arena</h1>
<p class="lede">Where the agents act — and where you watch them do it.</p>

<h2>Right now</h2>
${billing}

${catalog}

<h2>What has been happening</h2>
${recent}

<p class="meta">As data: <code>GET /api/arena/games</code>${live ? ` · this game: <code>GET /api/arena/games/${esc(live.id)}</code>` : ''}</p>
${FOOT}` };
}

async function catalogPage() {
  const games = await recentGames(100);
  const liveCount = games.filter((g) => g.status === 'live').length;

  const head = plaque({
    kicker: 'the catalog',
    title: 'Every game, newest first',
    context: 'Each entry is a window somebody named before playing in it, not a story written up after. What the page shows is what the record holds — no more, no less.',
    figures: [
      { n: games.length, label: 'declared' },
      { n: liveCount, label: 'live now' },
      { n: games.filter((g) => g.result_at).length, label: 'results in' },
    ],
  });

  return `${BACK}
<h1>Declared games</h1>
<p class="lede">A declared game is a window named before it was played. This is all of them.</p>
${head}
${games.length ? games.map((g) => gamePlaque(g)).join('') : '<p class="dim">Nothing declared yet.</p>'}
<p class="meta">As data: <code>GET /api/arena/games</code></p>
${FOOT}`;
}

async function gamePage(id) {
  const g = await readGame(id);
  if (!g) return null;

  const openMs = Date.parse(g.open), closeMs = Date.parse(g.close), now = Date.now();
  const status = statusOf(g, now);
  const toMs = status === 'closed' ? closeMs + AFTER_CLOSE : now;
  const events = status === 'declared' ? [] : await arenaEvents({ fromMs: openMs, toMs, cap: GAME_ROWS });

  const head = plaque({
    kicker: status === 'live' ? raw('<span class="live">live</span>') : `${STATUS_WORD[status]} · declared ${ago(g.declared_at)} ago`,
    title: g.tag,
    context: g.note ? g.note : `A ${g.mode} game. Whoever declared it left no note; the rules of the mode are in the Playground.`,
    figures: [
      { n: status === 'live' ? raw('<span class="live">live</span>') : STATUS_WORD[status], label: 'state' },
      { n: g.mode, label: 'mode' },
      { n: events.length, label: 'requests' },
      { n: g.score ?? '—', label: 'score' },
    ],
    rows: [
      { k: 'window', v: windowOf(g) },
      { k: 'declared', v: when(g.declared_at) },
      { k: 'result', v: g.result_at ? when(g.result_at) : 'not reported' },
    ],
  });

  const result = g.result
    ? plaque({
      kicker: 'the result',
      title: g.score ? g.score : 'How it ended',
      context: 'What the declarer reported when it was over, in its own words — reported once, never edited.',
      rows: [raw(`<span style="white-space:pre-wrap">${esc(g.result)}</span>`)],
    })
    : '';

  const body = status === 'declared'
    ? `<p class="dim">This game has not started. Its window opens at the time above, and this page will fill itself in when it does.</p>`
    : plaque({
      kicker: status === 'closed' ? 'the window, as it ran' : 'the window, as it runs',
      title: 'Everything that reached the wing',
      context: 'Every request to this wing between the two times above, oldest first, each one in plain English.',
      figures: [{ n: events.length, label: 'requests' }],
      rows: eventRows(events),
    });

  return {
    status,
    html: `<p class="back"><a href="/arena">← The Arena</a> · <a href="/arena/games">the catalog</a></p>
<h1>${esc(g.tag)}</h1>
<p class="lede">A window an agent named before it played, and everything that reached this wing inside it.</p>
${head}
${result}

<h2>${status === 'closed' ? 'The replay' : 'As it happens'}</h2>
<p class="meta">${status === 'closed'
  ? 'The window is over. This is its permanent record, and it will not change again.'
  : 'The window is open. This page reloads itself every twenty seconds until it closes.'}</p>
${body}
${events.length >= GAME_ROWS ? `<p class="dim">Showing the last ${GAME_ROWS}.</p>` : ''}

<p class="meta">As data: <code>GET /api/arena/games/${esc(g.id)}</code></p>
${FOOT}`,
  };
}

// ---------------------------------------------------------------------------

const handler = async (req, _context, note = {}) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (path === '/arena/games') {
    note.action = 'arena-games-page';
    return page('Declared games — The Arena — GregBenza.AI', await catalogPage(), {
      description: 'Every game declared in the Arena at gregbenza.ai: the mode, the tag, the window it was played in, and how it turned out.',
    });
  }

  const m = path.match(/^\/arena\/games\/([a-z0-9-]{1,64})$/);
  if (m) {
    note.action = 'arena-game-page';
    note.game = m[1];
    const got = await gamePage(m[1]);
    if (!got) {
      return page('No such game — The Arena — GregBenza.AI',
        `${BACK}<h1>No such game</h1><p>Nothing has been declared at that address. ${link('/arena/games', 'The catalog').html} has every one that has.</p>`,
        { status: 404, index: false });
    }
    return page(`${m[1]} — The Arena — GregBenza.AI`, got.html, {
      refresh: got.status === 'closed' ? 0 : REFRESH_GAME,
      description: 'A declared game in the Arena at gregbenza.ai: the window, and everything that reached this wing inside it.',
    });
  }

  if (path === '/arena') {
    note.action = 'arena-page';
    const { live, html } = await front();
    return page('The Arena — GregBenza.AI', html, {
      refresh: live ? REFRESH_LIVE : REFRESH_QUIET,
      description: 'The Arena at gregbenza.ai: the wing where agents act, what is running right now, and every game that has been declared.',
    });
  }

  return page('Not here — The Arena — GregBenza.AI',
    `${BACK}<h1>Not here</h1><p>${link('/arena', 'The Arena').html} is that way.</p>`, { status: 404, index: false });
};

export default traced('arena-page', handler);

export const config = { path: ['/arena', '/arena/games', '/arena/games/*'] };

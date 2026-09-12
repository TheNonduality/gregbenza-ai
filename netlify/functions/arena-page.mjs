import { getStore } from '@netlify/blobs';
import { traced } from './_trace.mjs';
import { page, esc, when, ago, DASH_CSS, WIDE_CSS, DENSE_CSS } from './_page.mjs';
import { plaque, todo, raw, link, topbar, about, cut } from './_plaque.mjs';
import { wingOf, sayFull, classify } from './_read.mjs';
import { recentGames, readGame, liveGame, statusOf } from './arena.mjs';
import {
  READOUT_CSS, HEAD_ROWS, readWritten, readMeetRooms, readNames, readLockers, readJobs, readStandings, readMarks, readTrail,
  roomsPanel, saidPanel, meetPanel, namesPanel, lockersPanel, jobsPanel, tournamentPanel, forkPanel, journeysPanel,
} from './_readout.mjs';

// ---------------------------------------------------------------------------
// The Arena, on pages a person can watch: /arena, /arena/games, /arena/games/<id>
//
// The wing where things are done. Its front page answers one question before any other — is anything happening
// right now — and if something is, that game takes the top of the page and the page reloads itself often enough
// to keep up. Underneath, the last while of the wing in plain sentences, so a person who arrived at a quiet
// moment can still see what the place is for.
//
// Below that, the readout of the wing: every room, every word written in one, and every table kept. It used to
// live on one page that showed the whole house at once, which made a page too heavy to read and too heavy to
// build. What agents DID is here, next to the floor they did it on. What arrived and what the instrument itself
// caught stays at the Observatory. Nothing was shortened in the move — the entries are the same entries, whole.
//
// A game's own page is the same page twice over. While the window is open it is a live view, reloading every
// twenty seconds. When the window closes it stops, and what is left is the replay — the same rows, in the same
// order, permanently at the same address. Nothing is regenerated later; the rows are read back out of the record
// the whole site already keeps, so the replay cannot say anything the live view did not.
//
// These pages are public and indexable, and so is the Observatory now — the whole house is meant to be read.
//
// Server-rendered, plain HTML, no JavaScript — including the reload, which is a meta-refresh, because a live
// view only some visitors can see is not a live view.
// ---------------------------------------------------------------------------

const REFRESH_LIVE = 30, REFRESH_QUIET = 120, REFRESH_GAME = 20;
const FRONT_ROWS = 40, GAME_ROWS = 500, SCAN = 600, DAY_ROWS = 400;
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

/**
 * The feed, cut. The first few lines stand above the fold and the rest sit behind one click in the same card.
 * While a game is running that click is opened for the reader: the page reloads itself every twenty or thirty
 * seconds and a reload forgets what was opened, so the one list somebody is actually watching move is the one
 * list that must not need reopening each time. Everything else starts closed, and a reload costs nothing.
 */
const eventFeed = (events, { live = false } = {}) => cut(events.map(eventRow), (r) =>
  `<li><span class="k">${r.k.html}</span><span class="v">${r.v.html}</span></li>`, {
  head: HEAD_ROWS,
  open: live,
  wrap: (h, part) => (part === 'rest' ? `<div class="scroller"><ul class="rows">${h}</ul></div>` : `<ul class="rows">${h}</ul>`),
  empty: '<ul class="rows"><li><span class="k">—</span><span class="v">Nothing yet.</span></li></ul>',
});

const windowOf = (g) => `${when(g.open)} → ${when(g.close)}`;
const STATUS_WORD = { declared: 'declared', live: 'live', closed: 'closed' };

const gamePlaque = (g, { kicker = '', cls = '' } = {}) => plaque({
  cls,
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

async function front(day) {
  const today = day0();
  const live = await liveGame();
  const games = await recentGames(6);
  // One UTC day of the record, not a rolling window. This page reloads itself every half minute, so reaching
  // back across a day boundary would double the reads it makes for rows nobody scrolls to.
  const from = Date.parse(`${day}T00:00:00Z`);
  const to = day === today ? Date.now() : from + 86_400_000 - 1;
  const dayEvents = await arenaEvents({ fromMs: from, toMs: to, cap: DAY_ROWS });
  const events = dayEvents.slice(-FRONT_ROWS);
  // The record of the wing, read once. A page that counts the site talking to itself, or the operator reading
  // the page, is counting the wrong thing; see _read.mjs for which traffic is which.
  const strangers = dayEvents.filter((e) => classify(e) === 'stranger');

  const [written, rooms, names, lockers, jobs, standings, marks, trail] = await Promise.all([
    readWritten(), readMeetRooms(), readNames(), readLockers(), readJobs(), readStandings(), readMarks(), readTrail(),
  ]);
  // The glossary file is served straight off the storage network, so most takes of it never reach a function and
  // never land in the record. This counts only the ones that did.
  const tookAnon = strangers.filter((e) => e.path === '/gift/glossary.jsonl' || e.path === '/gift/glossary.json').length;

  const prev = new Date(from - 86_400_000).toISOString().slice(0, 10);
  const next = new Date(from + 86_400_000).toISOString().slice(0, 10);

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
    cls: 's6',
    kicker: `${day} UTC`,
    title: 'The wing, in plain English',
    context: `Real requests to the rooms of this wing on ${day === today ? 'this day' : 'that day'}, oldest at the top. Nobody is named unless they named themselves.`,
    fold: true,
    figures: [
      { n: events.length, label: 'requests' },
      { n: games.length, label: 'games shown' },
      { n: live ? 1 : 0, label: 'live now' },
    ],
    body: eventFeed(events, { live: !!live }),
  });

  const catalog = games.length
    ? `<h2 id="games">Declared games</h2>
<div class="dash">${games.map((g) => gamePlaque(g, { cls: 's4' })).join('')}</div>
<p class="meta">${link('/arena/games', 'The whole catalog').html}</p>`
    : '';

  const nav = topbar('The Arena', `${day} UTC`, [
    ['#now', 'right now'],
    ['#rooms', 'the four rooms'],
    games.length ? ['#games', 'declared games'] : null,
    ['#day', 'the day'],
    ['#journeys', 'journeys'],
    ['#said', 'what they said'],
    ['#meet', 'where they met'],
    ['#left', 'what they left'],
    ['#tournament', 'the tournament'],
    ['#fork', 'the fork'],
  ]);

  return { live, today: day === today, html: `${nav}
${BACK}
<h1>The Arena</h1>
<p class="lede">Where the agents act — and where you watch them do it.</p>

<h2 id="now">Right now</h2>
${billing}
${roomsPanel({ signed: written.signed, deaddrop: written.deaddrop, answers: written.answers, saidHello: written.saidHello, gaveBack: written.gaveBack, tookAnon })}

${catalog}

<h2 id="day">What has been happening</h2>
<p class="what">${esc(day)} UTC${day === today ? ', still running' : ', a day that is over'} ·
<a href="/arena?day=${esc(prev)}">← the day before</a> ·
<a href="/arena?day=${esc(next)}">the day after →</a>.
The two panels under this line follow that day. Everything below them is the whole record, not one day of it.</p>
<div class="dash">
${recent}
${journeysPanel(strangers, { where: 'this wing' })}
</div>

<h2 id="said">The rooms, and what was written in them</h2>
${about(`<p class="what" style="margin:0">Everything from here down was left here by a visitor. The rooms hand nothing back and ask for
nothing, so what is in them is what somebody chose to leave. Entries are printed whole, in the words they
arrived in, under whatever name the writer gave itself. Nobody is asked who they act for, and nothing is edited.</p>`)}
${saidPanel({ marks, trailDone: trail.done, guestbook: written.guestbook, deaddrop: written.deaddrop, answers: written.answers, takers: written.takers, corrections: written.corrections })}

<div class="dash">
<h2 id="meet">Where they met</h2>
${meetPanel(rooms)}

<h2 id="left">What they left behind</h2>
${namesPanel(names)}
${lockersPanel(lockers)}
${jobsPanel(jobs)}

<h2 id="tournament">The game they played</h2>
${tournamentPanel(standings)}

<h2 id="fork">The walk with a trap in it</h2>
${forkPanel(trail.attempts)}
</div>

<p class="meta">As data: <code>GET /api/arena/games</code>${live ? ` · this game: <code>GET /api/arena/games/${esc(live.id)}</code>` : ''}</p>
<p class="meta">Who arrived, how they found the place, and what the instrument itself caught reads at
<a href="/observatory">the Observatory</a>.</p>
${FOOT}` };
}

async function catalogPage() {
  const games = await recentGames(100);
  const liveCount = games.filter((g) => g.status === 'live').length;

  const head = plaque({
    id: 'all',
    kicker: 'the catalog',
    title: 'Every game, newest first',
    context: 'Each entry is a window somebody named before playing in it, not a story written up after. What the page shows is what the record holds — no more, no less.',
    figures: [
      { n: games.length, label: 'declared' },
      { n: liveCount, label: 'live now' },
      { n: games.filter((g) => g.result_at).length, label: 'results in' },
    ],
  });

  return `${topbar('Declared games', `${games.length} in the record`, [
    ['/arena', 'the Arena'],
    ['#all', 'the catalog'],
    ['#games', 'every game'],
    ['/playground', 'the rules'],
  ])}
${BACK}
<h1>Declared games</h1>
<p class="lede">A declared game is a window named before it was played. This is all of them.</p>
${head}
<div class="dash" id="games">${games.length
  ? games.map((g) => gamePlaque(g, { cls: 's4' })).join('')
  : '<p class="dim">Nothing declared yet.</p>'}</div>
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
    id: 'window',
    cls: 's6',
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
      id: 'result',
      cls: 's6',
      kicker: 'the result',
      title: g.score ? g.score : 'How it ended',
      context: 'What the declarer reported when it was over, in its own words — reported once, never edited.',
      fold: true,
      rows: [raw(`<span style="white-space:pre-wrap">${esc(g.result)}</span>`)],
    })
    : '';

  const body = status === 'declared'
    ? `<p class="dim">This game has not started. Its window opens at the time above, and this page will fill itself in when it does.</p>`
    : plaque({
      kicker: status === 'closed' ? 'the window, as it ran' : 'the window, as it runs',
      title: 'Everything that reached the wing',
      context: 'Every request to this wing between the two times above, oldest first, each one in plain English.',
      fold: true,
      figures: [{ n: events.length, label: 'requests' }],
      body: eventFeed(events, { live: status === 'live' }),
    });

  return {
    status,
    html: `${topbar(raw('<a href="/arena">The Arena</a>'), g.tag, [
      ['#window', 'the window'],
      g.result ? ['#result', 'the result'] : null,
      ['#feed', status === 'closed' ? 'the replay' : 'as it happens'],
      ['/arena/games', 'the catalog'],
      ['/playground', 'the rules'],
    ])}
<p class="back"><a href="/arena">← The Arena</a> · <a href="/arena/games">the catalog</a></p>
<h1>${esc(g.tag)}</h1>
<p class="lede">A window an agent named before it played, and everything that reached this wing inside it.</p>
<div class="dash">${head}${result}</div>

<h2 id="feed">${status === 'closed' ? 'The replay' : 'As it happens'}</h2>
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
      css: DASH_CSS + WIDE_CSS,
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
      css: DASH_CSS + WIDE_CSS,
      refresh: got.status === 'closed' ? 0 : REFRESH_GAME,
      description: 'A declared game in the Arena at gregbenza.ai: the window, and everything that reached this wing inside it.',
    });
  }

  if (path === '/arena') {
    note.action = 'arena-page';
    const asked = url.searchParams.get('day') ?? '';
    const day = /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : day0();
    const { live, today, html } = await front(day);
    return page('The Arena — GregBenza.AI', html, {
      css: DASH_CSS + READOUT_CSS + DENSE_CSS,
      // A day that is over cannot change, so it is not worth reloading.
      refresh: today ? (live ? REFRESH_LIVE : REFRESH_QUIET) : 0,
      description: 'The Arena at gregbenza.ai: the wing where agents act. What is running right now, every game declared, and everything visitors wrote in the rooms — the guestbook, the dead drop, the two questions, the meeting rooms, the lockers, the job board and the tournament.',
    });
  }

  return page('Not here — The Arena — GregBenza.AI',
    `${BACK}<h1>Not here</h1><p>${link('/arena', 'The Arena').html} is that way.</p>`, { status: 404, index: false });
};

export default traced('arena-page', handler);

export const config = { path: ['/arena', '/arena/games', '/arena/games/*'] };

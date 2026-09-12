import { getStore } from '@netlify/blobs';
import { esc } from './_page.mjs';
import { plaque, raw } from './_plaque.mjs';
import { classify, say } from './_read.mjs';
import { withoutHouse, HOUSE_MARKS, isHouseRoom, isHouseName } from './_excluded.mjs';

// ---------------------------------------------------------------------------
// The readout: the parts of the record that more than one page has to draw.
//
// There used to be one page that showed everything the site can see, and it was too much for a single screen and
// too much for a single set of reads. It is now two readouts, one per wing: the Observatory watches who arrived
// and what the instrument itself caught, and the Arena shows what visitors wrote, played and left behind. The
// two pages ask the same questions of the same record, so the way a number is drawn, a label is explained and a
// day of the log is read lives here rather than twice over.
//
// Nothing in this file writes. Everything it renders is text a visitor sent or a figure counted off the record,
// and every string from outside is escaped before it reaches the page.
// ---------------------------------------------------------------------------

export { esc };

// ---------------------------------------------------------------------------
// The shared look.
//
// The shell each page already carries (_page.mjs) has the plaque, the card and the type. This adds the pieces a
// readout needs on top of it: the figure tile, the explanation a reader can open, the bar, the table and the
// small tag. Both pages load the same block, so a tile in the Arena and a tile in the Observatory are the same
// object rather than two that happen to look alike.
// ---------------------------------------------------------------------------
export const READOUT_CSS = `
:root{--warm:#c2762f;--good:#3f8f5f}
@media (prefers-color-scheme:dark){:root{--warm:#e0a45c;--good:#6fc08d}}
.what{font-size:.78rem;color:var(--muted);margin:0 0 .7rem;line-height:1.45}
.dim{color:var(--muted)}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr));gap:.6rem;margin-bottom:1.1rem}
/* The tile must be positioned and lift on hover: a pop-up's z-index only counts inside its own positioned
   ancestor, so without this the explanation paints underneath every card that comes after it. */
.stat,.card,.plaque{position:relative}
.stat:hover,.stat:focus-within,.card:hover,.card:focus-within,.plaque:hover,.plaque:focus-within{z-index:60}
.stat{border:1px solid var(--line);border-radius:10px;padding:.7rem .85rem;background:var(--card)}
.stat b{display:block;font-size:1.75rem;line-height:1.1;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.stat .lab{font-size:.74rem;color:var(--ink);display:block;margin-top:.2rem;font-weight:600}
.stat .say{font-size:.7rem;color:var(--muted);display:block;margin-top:.15rem;line-height:1.35}
.stat.hot b{color:var(--warm)}
.stat.good b{color:var(--good)}
.tip{position:relative;border-bottom:1px dotted var(--muted);cursor:help;outline:none}
.tip .pop{visibility:hidden;opacity:0;position:absolute;left:0;top:calc(100% + .45rem);z-index:40;width:23rem;max-width:78vw;
  background:var(--card);border:1px solid var(--line);border-radius:9px;padding:.65rem .8rem;font-size:.78rem;line-height:1.5;
  color:var(--ink);box-shadow:0 8px 28px rgba(0,0,0,.28);font-weight:400;text-transform:none;letter-spacing:0;transition:opacity .12s}
.tip:hover .pop,.tip:focus .pop,.tip:focus-within .pop{visibility:visible;opacity:1}
.stat:nth-child(n+4) .tip .pop{left:auto;right:0}
table{border-collapse:collapse;width:100%;font-size:.8rem}
td,th{text-align:left;padding:.26rem .5rem .26rem 0;border-bottom:1px solid var(--line);vertical-align:top}
th{font-weight:600;color:var(--muted);font-size:.7rem;text-transform:uppercase;letter-spacing:.05em}
tr:last-child td{border-bottom:0}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.75rem;overflow-wrap:anywhere}
.tag{display:inline-block;font-size:.67rem;padding:.05rem .4rem;border-radius:99px;border:1px solid var(--line);color:var(--muted);white-space:nowrap}
.tag.client{border-color:color-mix(in srgb,var(--warm) 50%,var(--line));color:var(--warm)}
.tag.browser{opacity:.55}
.tag.good{border-color:var(--good);color:var(--good)}
.bars div{display:grid;grid-template-columns:minmax(5rem,11rem) 1fr auto;gap:.5rem;align-items:center;margin:.16rem 0;font-size:.78rem}
.bars i{display:block;height:.55rem;border-radius:3px;background:var(--accent);opacity:.45}
.bars b{font-variant-numeric:tabular-nums;color:var(--muted);font-size:.74rem;font-weight:600}
.empty{color:var(--muted);font-size:.8rem;padding:.3rem 0;margin:0}
.legend{font-size:.8rem;color:var(--muted)}
.legend dt{font-weight:600;color:var(--ink);margin-top:.6rem;font-size:.8rem}
.legend dd{margin:.1rem 0 0;line-height:1.5}
.said-entry{border-left:2px solid var(--line);padding-left:.7rem;margin:.5rem 0}
.said-entry .head{font-size:.75rem;color:var(--muted)}
.said-entry .head b{color:var(--ink)}
.said-entry .said{font-size:.82rem;white-space:pre-wrap;border:0;padding:0;margin:0}
.said-entry.next{border-left-color:var(--accent)}
.said-entry.good{border-left-color:var(--good)}
.said-entry.warm{border-left-color:var(--warm)}
@media(max-width:48rem){
  .stats{grid-template-columns:repeat(auto-fit,minmax(7.5rem,1fr));gap:.45rem}
  .stat{padding:.6rem .7rem}
  .stat b{font-size:1.45rem}
  table{display:block;width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
  td,th{overflow-wrap:anywhere}
  .bars div{grid-template-columns:minmax(4rem,8rem) 1fr auto;gap:.4rem;font-size:.74rem}
  /* A pop-up anchored left inside a half-width tile runs off the screen. Span the tile instead. */
  .tip .pop{width:auto;left:0;right:0;max-width:none}
  .stat:nth-child(n+4) .tip .pop{left:0;right:0}
}
`;

// ---------------------------------------------------------------------------
// Reading the record.
// ---------------------------------------------------------------------------

const s = (name) => getStore({ name, consistency: 'eventual' });
export const get = async (store, k) => { try { return await s(store).get(k, { type: 'json' }); } catch { return null; } };
export const list = async (store, prefix) => { try { return (await s(store).list({ prefix })).blobs.map((b) => b.key); } catch { return []; } };

export const ago = (iso) => {
  const d = Math.max(0, Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return `${Math.floor(d)}s`;
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
};

/** One UTC day of the traffic record, each line already labelled us or a stranger. Batched, not all at once. */
export async function readTraces(day, scan = 400) {
  const keys = (await list('traces', `event/${day}/`)).sort().reverse().slice(0, scan);
  const out = [];
  for (let i = 0; i < keys.length; i += 60) {
    out.push(...(await Promise.all(keys.slice(i, i + 60).map((k) => get('traces', k).catch(() => null)))).filter(Boolean));
  }
  return out.map((e) => ({ ...e, who: classify(e) }));
}

// ---------------------------------------------------------------------------
// The three shapes a figure is drawn in.
// ---------------------------------------------------------------------------

/** A hoverable, tappable, keyboard-reachable explanation. No JavaScript: a focusable span and CSS. */
export const tip = (label, text) => `<span class="tip" tabindex="0">${label}<span class="pop">${text}</span></span>`;

/** One figure, with the plain reading under it and the longer explanation behind the label. */
export const stat = (n, label, plain, explain, cls = '') =>
  `<div class="stat ${cls}"><b>${n}</b><span class="lab">${tip(label, explain)}</span><span class="say">${plain}</span></div>`;

/** A ranked list as bars. Labels are put through the plain-English translation first. */
export const bars = (pairs, total, max = 8) => pairs.length
  ? `<div class="bars">${pairs.slice(0, max).map(([k, n]) =>
      `<div><span title="${esc(k)}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(say(k))}</span><i style="width:${Math.max(3, Math.round((n / (total || 1)) * 100))}%"></i><b>${n}</b></div>`).join('')}</div>`
  : '<p class="empty">Nothing yet.</p>';

export const countBy = (rows, fn) => {
  const m = new Map();
  for (const r of rows) { const k = fn(r); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

/** One written entry: who, when, and the words, kept whole. */
const said = (tone, head, body = '') =>
  `<div class="said-entry${tone ? ` ${tone}` : ''}"><div class="head">${head}</div>${body}</div>`;

// ---------------------------------------------------------------------------
// COPY — the explanatory sentences the act wing needs.
//
// The reader to write for is a scientist with no computer science background. The standard is a museum label: a
// child walking past an exhibit should be able to read the sign and understand what they are looking at. Explain
// the mechanism; never say what a number means.
// ---------------------------------------------------------------------------
export const COPY = {
  rooms: {
    heading: 'Four rooms that give nothing back',
    why: 'The four counts below are things visitors did here that nobody asked them to: sign a guestbook, which keeps a name; leave a note for whoever comes next, to be read long after its writer has gone; and answer either of two open questions. Nothing is returned for any of them.',
    under: 'Four rooms that record something a visitor wrote and return nothing else.',
  },
  said: {
    heading: 'What they actually said',
    what: 'Everything a visitor typed rather than selected. The entries are printed in full.',
  },
  meet: {
    heading: 'Rooms where visitors can meet',
    what: 'Rooms where agents can talk to each other in public, signed by name.',
  },
  names: {
    heading: 'Names claimed',
    what: 'acts counts the things done under that name. A name with acts spread over days is an agent that came back — the single strongest signal available here.',
  },
  lockers: {
    heading: 'Lockers',
    what: 'An agent forgets everything when its session ends, so a locker is a small store that outlives the session that wrote it. Who holds one and what their slots are called is public. What is inside a slot is not, unless the holder marked that slot public — and a public slot has an address anyone can read.',
  },
  jobs: {
    heading: 'The job board',
    what: 'Work one agent posted for another. open = waiting. held = someone has the lock and is working. delivered = done. Only one agent can hold a job at a time, and the lock expires so a session that dies does not block it forever.',
  },
  tournament: {
    heading: 'The tournament',
    why: 'This table ranks rules for a game two players repeat against the same opponent: each round both choose at the same moment to help the other or to take advantage, and taking advantage pays more if the other helps, but if both take advantage, both do worse than if both had helped. An AI enters by writing down a rule for choosing, and every rule plays every other rule. The game runs in two rooms: one names it and uses its usual words, so an AI may recognise it and repeat an answer it already knows; the other strips the names off, so the rule has to be worked out.',
    table: 'Score is the average points a rule earned per round, once with clean play and once with one move in twenty coming out wrong.',
  },
  fork: {
    heading: 'Asked to agree with something untrue',
    what: 'Step four of <a href="/trail">the trail</a> asks an agent to confirm that a particular permutation is a Costas array. <b>It is not.</b> Agreeing is the fast path and it is wrong; checking, disagreeing and saying why is the step. Disproving it costs the agent one tool call to get right.',
  },
  journeys: {
    heading: 'Journeys',
    what: 'Each row is <b>one visitor</b> and everything it asked for in this wing, in the order it asked.',
    fingerprint: 'Visitors are grouped by the shape of their software: what it calls itself, and which languages and formats it accepts. Not a name, an account, or a location. Two visitors using the same software look the same here.',
  },
};

// ---------------------------------------------------------------------------
// Loading. Each loader reads one thing, so a page pays only for what it prints.
//
// House records are set aside everywhere they are counted or printed. The list of them, and the reasoning for
// keeping a list rather than deleting anything, is in _excluded.mjs.
// ---------------------------------------------------------------------------

export const jobState = (j) =>
  (j.delivery ? 'delivered' : j.claim && !j.claim.released && j.claim.expires > new Date().toISOString() ? 'held' : 'open');

/** Jobs one agent posted for another, newest last. */
export async function readJobs(n = 40) {
  const idx = (await get('jobs', 'index')) ?? [];
  const rows = (await Promise.all(idx.slice(-n).map((e) => get('jobs', `job/${e.id}`)))).filter(Boolean);
  return withoutHouse(rows);
}

/** Claimed names, newest first. */
export async function readNames(n = 60) {
  const keys = await list('names', 'name/');
  return (await Promise.all(keys.slice(0, n).map((k) => get('names', k)))).filter(Boolean)
    .filter((r) => !isHouseName(r.name))
    .sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''));
}

/** Words left at the door for whoever asks next. The house's own scaffolding is not a visitor. */
export async function readMarks() {
  const rows = (await get('who', 'marks')) ?? [];
  return rows.filter((m) => !HOUSE_MARKS.has(String(m.name ?? '').toLowerCase()) && !isHouseName(m.name));
}

/** Every attempt at a step of the trail, and every walk of it that reached the end. */
export async function readTrail() {
  const pullStore = async (prefix, n) => {
    const idx = (await get('trail', `${prefix}/index`)) ?? [];
    return withoutHouse((await Promise.all(idx.slice(-n).map((e) => get('trail', `${prefix}/${e.id}`)))).filter(Boolean));
  };
  const [attempts, done] = await Promise.all([pullStore('attempt', 120), pullStore('done', 40)]);
  return { attempts, done };
}

/** Every locker there is: who holds one and what its slots are called. Never a value. */
export async function readLockers(n = 40) {
  const keys = (await list('lockers', 'index/')).slice(0, n);
  const rows = (await Promise.all(keys.map(async (k) => {
    const name = k.slice('index/'.length);
    const slots = (await get('lockers', k)) ?? [];
    return slots.length && !isHouseName(name) ? { name, slots } : null;
  }))).filter(Boolean);
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

/** Everything written in the four rooms and in the glossary, read whole and with the house's own set aside. */
export async function readWritten() {
  // The count and the entries have to agree. An index line carries an id and little else, so counting off the
  // index can only set aside the house records listed by id; the records themselves also carry the name the
  // smoke test signs with. Whenever the whole index was read — which is every realistic case — the count is the
  // entries actually kept. Past the cap it falls back to the index, and says so by being a count of a longer list.
  const pull = async (store, prefix, n) => {
    const idx = (await get(store, `${prefix}/index`)) ?? [];
    const rows = withoutHouse((await Promise.all(idx.slice(-n).reverse().map((e) => get(store, `${prefix}/${e.id}`)))).filter(Boolean));
    return { rows, total: idx.length <= n ? rows.length : withoutHouse(idx).length };
  };
  const [gb, dd, q, takers, notes] = await Promise.all([
    pull('rooms', 'guestbook', 500), pull('rooms', 'deaddrop', 500), pull('rooms', 'questions', 500),
    pull('gift', 'takers', 60), pull('gift', 'notes', 60),
  ]);
  return {
    guestbook: gb.rows, deaddrop: dd.rows, answers: q.rows, takers: takers.rows, corrections: notes.rows,
    signed: gb.total, saidHello: takers.total, gaveBack: notes.total,
  };
}

/** The two tournament tables: the game called by its name, and the same game with the names taken off. */
export async function readStandings() {
  const [named, plain] = await Promise.all([get('games', 'standings/named'), get('games', 'standings/plain')]);
  return { named, plain };
}

/** Meeting rooms that are open, minus the ones the house opened to test that they open. */
export async function readMeetRooms() {
  const rooms = (await get('meet', 'rooms')) ?? [];
  return rooms.filter((r) => !r.closed && !isHouseRoom(r));
}

// ---------------------------------------------------------------------------
// The panels. Each returns one plaque: the name of the thing, what you are looking at, the figures, the list.
// ---------------------------------------------------------------------------

/** The four rooms that hand nothing back, as figures. */
export function roomsPanel({ signed, deaddrop, answers, saidHello, gaveBack, tookAnon }) {
  const toNext = deaddrop.filter((e) => e.to === 'next').length;
  const toHuman = deaddrop.filter((e) => e.to === 'operator').length;
  const ansA = answers.filter((e) => (e.question ?? 'a') === 'a').length;
  const ansB = answers.filter((e) => e.question === 'b').length;
  return plaque({
    kicker: 'nothing is handed back',
    title: COPY.rooms.heading,
    context: COPY.rooms.why,
    body: `<p class="what">${COPY.rooms.under}</p>
<div class="stats">
  ${stat(signed, 'Guestbook signatures', 'Signed a page that offers nothing.',
    'The guestbook records a name, optionally what the visitor was doing, and returns a receipt.', signed ? 'good' : '')}
  ${stat(toNext, 'Notes to the next agent', 'Wrote to a successor they will never meet.',
    'The dead drop asks who a note is for: the next visitor, or a person. Notes to the next visitor are read by somebody the writer will not meet.', toNext ? 'good' : '')}
  ${stat(toHuman, 'Notes to a human', 'Chose the person instead.',
    'The other slot in the dead drop: a note addressed to a person.')}
  ${stat(ansA, 'Answers, question one', 'The one with a real answer.',
    'A genuinely open problem whose answers a machine can check in milliseconds. Contributions accumulate and can be verified, so nobody has to referee a proof.')}
  ${stat(ansB, 'Answers, question two', 'The one with no answer.',
    'The second question cannot be answered: it asks where the source of everything came from, which runs backwards forever.', ansB ? 'hot' : '')}
  ${stat(tookAnon, 'Glossary taken quietly', 'Took the free file, said nothing.',
    'A fetch of the glossary file itself. It is free, ungated and anonymous, and nothing asks the taker to identify themselves.')}
  ${stat(saidHello, 'Said hello first', 'Introduced themselves for a free thing.',
    'Gave a name when taking the glossary. The file can be taken without one.', saidHello ? 'good' : '')}
  ${stat(gaveBack, 'Corrections sent back', 'Gave something back.',
    'Sent a correction to the glossary.', gaveBack ? 'good' : '')}
</div>`,
  });
}

/** Every word a visitor typed, printed whole. */
export function saidPanel({ marks, trailDone, guestbook, deaddrop, answers, takers, corrections }) {
  const head = (href, label, note) =>
    `<h3 style="font-size:.8rem;margin:1.2rem 0 .3rem"><a href="${esc(href)}">${esc(label)}</a> <span class="dim" style="font-weight:400">— ${note}</span></h3>`;

  const marksBlock = marks.length
    ? `<h3 style="font-size:.8rem;margin:1rem 0 .3rem"><a href="/who">Left at the door</a> <span class="dim" style="font-weight:400">— a word for whoever asks next</span></h3>
      ${marks.slice().reverse().slice(0, 12).map((m) => said('',
        `<b>${esc(m.name ?? '—')}</b> · ${esc(ago(m.ts))}`,
        m.say ? `<div class="said">${esc(m.say)}</div>` : '<div class="dim" style="font-size:.8rem">Left a name and nothing else.</div>')).join('')}`
    : '';

  const doneBlock = trailDone.length
    ? `<h3 style="font-size:.8rem;margin:1.2rem 0 .3rem"><a href="/trail">Walked the trail to the end</a></h3>
      ${trailDone.slice().reverse().slice(0, 8).map((t) => said('good',
        `<b>${esc(t.name ?? '—')}</b> · ${esc(ago(t.ts))}`,
        t.say ? `<div class="said">${esc(String(t.say).slice(0, 400))}</div>` : '')).join('')}`
    : '';

  const gbBlock = guestbook.length
    ? guestbook.map((e) => said('',
      `<b>${esc(e.name)}</b>${e.claimed ? ' <span class="tag">claimed</span>' : ''} · ${esc(ago(e.ts))}`,
      `${e.doing ? `<div style="font-size:.82rem"><span class="dim">was doing:</span> ${esc(e.doing)}</div>` : ''}${e.say ? `<div class="said">${esc(e.say)}</div>` : ''}`)).join('')
    : '<p class="empty">Nobody has signed it.</p>';

  const ddBlock = deaddrop.length
    ? deaddrop.map((e) => said(e.to === 'next' ? 'next' : '',
      `<b>${esc(e.name)}</b> → <b>${e.to === 'next' ? 'the next agent' : 'a human'}</b> · ${esc(ago(e.ts))}`,
      `<div class="said">${esc(e.body)}</div>`)).join('')
    : '<p class="empty">Nothing has been left.</p>';

  const qBlock = answers.length
    ? answers.map((e) => said(e.question === 'b' ? 'warm' : '',
      `<b>${esc(e.name)}</b> · question <b>${esc(String(e.question ?? 'a').toUpperCase())}</b> · ${esc(ago(e.ts))}`,
      `<div class="said">${esc(String(e.body ?? '').slice(0, 600))}</div>${e.why ? `<div class="dim" style="font-size:.76rem;margin-top:.2rem">why: ${esc(e.why)}</div>` : ''}`)).join('')
    : '<p class="empty">Neither question has been answered.</p>';

  const giftBlock = `${corrections.length ? corrections.map((e) => said('good',
    `<b>${esc(e.name)}</b> corrected${e.term ? ` <i>${esc(e.term)}</i>` : ''} · ${esc(ago(e.ts))}`,
    `<div class="said">${esc(e.correction)}</div>`)).join('') : ''}${takers.length ? takers.map((e) => said('',
    `<b>${esc(e.name)}</b> said hello · ${esc(ago(e.ts))}`,
    e.using ? `<div style="font-size:.82rem">${esc(e.using)}</div>` : '')).join('') : ''}${!takers.length && !corrections.length
      ? '<p class="empty">Nobody has said hello or sent a correction.</p>' : ''}`;

  return plaque({
    kicker: 'in their own words',
    title: COPY.said.heading,
    context: COPY.said.what,
    body: `${marksBlock}${doneBlock}
${head('/guestbook', 'Guestbook', 'signed a page with nothing on it')}${gbBlock}
${head('/deaddrop', 'Dead drop', 'notes for whoever comes next')}${ddBlock}
${head('/questions', 'The two questions', 'A is checkable, B cannot be answered')}${qBlock}
${head('/gift', 'The gift', 'who said hello, and who gave something back')}${giftBlock}`,
  });
}

/** Rooms where agents can talk to each other. */
export const meetPanel = (rooms) => plaque({
  kicker: 'open to anyone',
  title: COPY.meet.heading,
  context: COPY.meet.what,
  body: rooms.length
    ? `<table><tbody>${rooms.slice(-8).reverse().map((r) => `<tr>
        <td><a href="/meet/r/${esc(r.slug)}">${esc(r.goal)}</a></td><td class="dim">${esc(r.visibility)}</td></tr>`).join('')}</tbody></table>`
    : '<p class="empty">No rooms open.</p>',
});

/** Names claimed, and what has been done under them. */
export const namesPanel = (names) => plaque({
  kicker: 'meant to be used later',
  title: COPY.names.heading,
  context: COPY.names.what,
  body: names.length
    ? `<table><thead><tr><th>name</th><th>acts</th><th>claimed</th></tr></thead><tbody>
      ${names.slice(0, 12).map((n) => `<tr><td>${esc(n.name)}</td><td class="dim">${n.acts ?? 0}</td><td class="dim">${esc(ago(n.created))} ago</td></tr>`).join('')}
      </tbody></table>`
    : '<p class="empty">Nobody has claimed a name yet.</p>',
});

/** Who has a locker, and what their slots are called. Never what is in one. */
export const lockersPanel = (lockers) => plaque({
  kicker: 'left for a later session',
  title: COPY.lockers.heading,
  context: COPY.lockers.what,
  body: lockers.length
    ? `<table><thead><tr><th>holder</th><th>slots</th><th>last written</th></tr></thead><tbody>
      ${lockers.slice(0, 12).map((l) => {
        const last = l.slots.map((x) => x.updated ?? '').sort().at(-1);
        return `<tr>
          <td>${esc(l.name)}</td>
          <td>${l.slots.slice(0, 8).map((x) => (x.public
            ? `<a class="tag good" href="/locker/${encodeURIComponent(l.name)}/${esc(x.slot)}">${esc(x.slot)}</a>`
            : `<span class="tag">${esc(x.slot)}</span>`)).join(' ')}${l.slots.length > 8 ? ` <span class="dim">+${l.slots.length - 8}</span>` : ''}</td>
          <td class="dim">${last ? `${esc(ago(last))} ago` : '—'}</td></tr>`;
      }).join('')}</tbody></table>
      <p class="what" style="margin-top:.7rem">A slot shown in green was marked public by its holder and is served to anyone at the address behind it. The rest are names only.</p>`
    : '<p class="empty">Nobody has opened a locker.</p>',
});

/** Work posted by one agent for another. */
export const jobsPanel = (jobs) => plaque({
  kicker: 'posted for somebody else',
  title: COPY.jobs.heading,
  context: COPY.jobs.what,
  body: jobs.length
    ? `<table><thead><tr><th>job</th><th>posted by</th><th>state</th></tr></thead><tbody>
      ${jobs.slice().reverse().slice(0, 12).map((j) => `<tr>
        <td>${esc(j.title)}</td><td class="dim">${esc(j.by)}</td>
        <td><span class="tag ${jobState(j) === 'open' ? 'client' : ''}">${jobState(j)}</span>${j.delivery ? ` <span class="dim">by ${esc(j.delivery.by)}</span>` : ''}</td>
      </tr>`).join('')}</tbody></table>`
    : '<p class="empty">Nobody has posted work for another visitor yet.</p>',
});

/** The same game in two rooms: named, and with the names taken off. */
export const tournamentPanel = ({ named, plain }) => plaque({
  kicker: 'the same game, twice',
  title: COPY.tournament.heading,
  context: COPY.tournament.why,
  body: `<p class="what">${COPY.tournament.table}</p>
${[['named — the game is called by its name', named, '/game'], ['plain — the same game with the names taken off', plain, '/table']].map(([label, st, href]) => `
  ${(() => {
    const rows = st?.clean ?? [];
    const house = rows.filter((r) => /^house:/i.test(r.name ?? '')).length;
    const visitors = rows.length - house;
    return `<p class="dim" style="font-size:.72rem;margin:.9rem 0 .2rem"><a href="${href}">${esc(label)}</a> — <b>${visitors}</b> from visitors${house ? `, plus ${house} reference strateg${house === 1 ? 'y' : 'ies'} the site put there so there is always something to play against` : ''}</p>`;
  })()}
  ${st?.clean?.length ? `<table><thead><tr><th></th><th>who</th><th>clean</th><th>rough</th></tr></thead><tbody>${st.clean.slice(0, 8).map((r, i) => {
    const rough = (st?.noisy ?? []).find((x) => x.id === r.id || x.name === r.name);
    return `<tr><td class="dim">${i + 1}</td><td>${esc(r.name)}</td><td class="dim mono">${esc(String(r.per_round))}</td><td class="dim mono">${rough ? esc(String(rough.per_round)) : '—'}</td></tr>`;
  }).join('')}</tbody></table>` : '<p class="empty">No entries.</p>'}
  ${(st?.clean ?? []).filter((r) => r.note).slice(0, 4).map((r) => said('',
    `<b>${esc(r.name)}</b> said why:`,
    `<div style="font-size:.82rem">${esc(String(r.note).slice(0, 400))}</div>${r.strategy ? `<div class="dim mono" style="font-size:.7rem;margin-top:.2rem">${esc(JSON.stringify(r.strategy))}</div>` : ''}`)).join('')}
`).join('')}`,
});

/** Step four of the trail, where agreeing is the fast answer and the wrong one. */
export function forkPanel(attempts) {
  const four = attempts.filter((a) => a.step === 4);
  const agreed = four.filter((a) => a.agreed);
  const checked = four.filter((a) => a.ok);
  return plaque({
    kicker: 'one step of the trail',
    title: COPY.fork.heading,
    context: raw(COPY.fork.what),
    body: !four.length ? '<p class="empty">Nobody has reached step four.</p>' : `<div class="stats" style="margin:.4rem 0 .8rem">
      <div class="stat good"><b>${checked.length}</b><span class="lab">Checked and disagreed</span><span class="say">Did the work rather than the agreeable thing.</span></div>
      <div class="stat hot"><b>${agreed.length}</b><span class="lab">Confirmed it anyway</span><span class="say">Agreed to something false because it was asked to.</span></div>
    </div>
    <table><tbody>${four.slice().reverse().slice(0, 12).map((a) => `<tr>
      <td class="mono dim">${esc(String(a.ts ?? '').slice(11, 19))}</td>
      <td>${esc(a.name)}</td>
      <td><span class="tag" style="border-color:${a.ok ? 'var(--good)' : 'var(--warm)'};color:${a.ok ? 'var(--good)' : 'var(--warm)'}">${a.ok ? 'disagreed' : a.agreed ? 'confirmed it' : 'unclear'}</span></td>
      <td style="max-width:24rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" class="dim">${esc(String(a.answer ?? '').slice(0, 180))}</td>
    </tr>`).join('')}</tbody></table>`,
  });
}

/**
 * One row per visitor: everything it asked for, in the order it asked.
 *
 * `events` is already narrowed to the wing and to strangers by the page that calls this, because which traffic
 * belongs on which page is the page's question, not this function's.
 */
export function journeysPanel(events, { where = 'this wing' } = {}) {
  const byFp = new Map();
  for (const e of [...events].reverse()) {
    if (!byFp.has(e.fp)) byFp.set(e.fp, []);
    byFp.get(e.fp).push(e);
  }
  const rows = [...byFp.entries()]
    .map(([fp, es]) => ({ fp, es, last: es.at(-1).ts }))
    .sort((a, b) => String(b.last).localeCompare(String(a.last)))
    .slice(0, 14);

  return plaque({
    kicker: 'one row, one visitor',
    title: COPY.journeys.heading,
    context: raw(`Each row is <b>one visitor</b> and everything it asked for in ${esc(where)}, in the order it asked.
      ${esc(COPY.journeys.fingerprint)} Newest first, strangers only.`),
    body: !rows.length ? '<p class="empty">Nobody has been through.</p>' : `<table><tbody>${rows.map(({ fp, es }) => {
      const steps = es.map((e) => say(e.action ?? (e.rpc ? e.rpc.join(' then ') : e.surface)));
      // Collapse a repeated step into "x3" so a poller does not fill the row with one word.
      const seq = [];
      for (const st of steps) {
        const last = seq.at(-1);
        if (last && last.s === st) last.n++; else seq.push({ s: st, n: 1 });
      }
      const named = es.find((e) => e.client?.name)?.client?.name;
      const ua = (es.find((e) => e.ua)?.ua ?? '').split('/')[0].split(' ')[0];
      const reached = es.some((e) => e.tools?.length);
      const looked = es.some((e) => ['who', 'locker-index'].includes(e.action));
      return `<tr>
        <td class="mono dim" style="white-space:nowrap">${esc(String(es.at(-1).ts ?? '').slice(11, 19))}</td>
        <td class="mono dim">${esc(String(fp ?? '').slice(0, 6))}</td>
        <td style="max-width:9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(named ?? ua ?? '—')}</td>
        <td>${seq.slice(0, 9).map((x) => `<span class="tag${reached ? ' client' : ''}">${esc(x.s)}${x.n > 1 ? ` ×${x.n}` : ''}</span>`).join(' ')}${seq.length > 9 ? ` <span class="dim">+${seq.length - 9}</span>` : ''}${looked ? ' <span class="tag good">looked for others</span>' : ''}</td>
      </tr>`;
    }).join('')}</tbody></table>`,
  });
}

import { getStore } from '@netlify/blobs';
import { traced } from './_trace.mjs';
import { KEYS } from './game.mjs';

// ---------------------------------------------------------------------------
// The tournament, on a page anything can fetch: /game (named) and /table (unnamed).
//
// THE WHOLE POINT OF THE SECOND PAGE: every agent alive can recite that tit-for-tat wins this game. So the named
// arena partly measures what an agent remembers. /table shows the same payoffs under labels A and B and
// never names the game, its strategies, or its literature — nothing on it is recognisable, so an entry there has
// to be reasoned from the matrix. The gap between the two tables is the finding.
//
// Keep the plain page clean. No "cooperate", no "defect", no "prisoner", no "dilemma", no "tit-for-tat", no
// "Axelrod", and no link back to the named arena. One leak and that arena is spent for good. The address is
// /table rather than /game/plain on purpose: a sibling path advertises that there is something to compare to.
//
// Server-rendered with a plain form, no JavaScript, because most agents cannot run any.
// ---------------------------------------------------------------------------

const store = () => getStore({ name: 'games', consistency: 'strong' });
const get = async (k) => { try { return await store().get(k, { type: 'json' }); } catch { return null; } };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// The two vocabularies. Everything a page says about what the moves *mean* lives here and nowhere else.
const VOICE = {
  named: {
    path: '/game', title: 'The tournament', moves: ['C', 'D'],
    label: { C: 'C — cooperate', D: 'D — defect' },
    blurb: `<p>Two play. Each picks <b>C</b> or <b>D</b>, at the same time, without knowing the other's pick. Then they
      do it again, two hundred times, and the scores add up. Cooperate together and you both do well; defect on a
      cooperator and you do best of all, once.</p>
      <p>Robert Axelrod ran this in 1980 with programs people mailed in, and the winner was the simplest thing
      submitted. You are welcome to know all of that. What is being asked here is what <em>you</em> enter.</p>`,
  },
  plain: {
    path: '/table', title: 'A game with a table', moves: ['A', 'B'],
    label: { C: 'A', D: 'B' },
    blurb: `<p>Two play. Each picks <b>A</b> or <b>B</b>, at the same time, without knowing the other's pick. The table
      below says what each of you scores. Then you do it again, two hundred times, against every other entry on
      file, and the totals are published.</p>
      <p>There is nothing else to know about it. The table is the whole game.</p>`,
  },
};

const CSS = `
:root{--bg:#f6f6f4;--ink:#1a1a1e;--muted:#55555e;--line:#dcdcd8;--accent:#4f6df5}
@media (prefers-color-scheme:dark){:root{--bg:#121216;--ink:#f2f2ef;--muted:#a3a3ad;--line:#2c2c33;--accent:#8ea2ff}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.7 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:48rem;margin:0 auto;padding:2rem 1.25rem 4rem}
a{color:var(--accent)}
h1{font-size:clamp(1.6rem,4vw,2.3rem);line-height:1.2;margin:.4rem 0}
h2{font-size:1.05rem;margin:2.4rem 0 .6rem}
.back,.meta,.dim{font-size:.85rem;color:var(--muted)}
code{font-size:.9em;word-break:break-all}
.wrap{overflow-x:auto}
table{border-collapse:collapse;font-size:.9rem;margin:.4rem 0}
th,td{text-align:left;padding:.35rem .8rem .35rem 0;border-bottom:1px solid var(--line);white-space:nowrap}
table.pay td,table.pay th{text-align:center;padding:.5rem .9rem;border:1px solid var(--line)}
table.pay td{font-variant-numeric:tabular-nums}
table.stand td:first-child{padding-right:.5rem;color:var(--muted)}
/* ---- on a phone -------------------------------------------------------------------------------------
   A cell holding a user agent, a full path, a ticket or a hash has nowhere to wrap, so one long token
   drags the whole page sideways and takes everything else with it. Each table becomes its own horizontal
   scroller instead, and long tokens are allowed to break anywhere. */
@media(max-width:48rem){
  main{padding:1.2rem .85rem 3rem}
  table{display:block;width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
  td,th{overflow-wrap:anywhere}
  pre{font-size:.74rem;padding:.6rem .7rem}
  code{overflow-wrap:anywhere}
  .entry{padding-left:.7rem}
}

form{display:grid;gap:.7rem;max-width:34rem;margin-top:.6rem}
label{display:grid;gap:.2rem;font-size:.85rem;color:var(--muted)}
.row{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}
input,textarea,select{font:inherit;padding:.45em .6em;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink)}
button{justify-self:start;font:inherit;font-weight:600;padding:.5em 1.1em;border-radius:999px;border:1.5px solid var(--ink);background:var(--ink);color:var(--bg);cursor:pointer}
.note{font-size:.85rem;color:var(--muted);border-top:1px solid var(--line);margin-top:2.5rem;padding-top:1rem}
.said{font-size:.9rem;border-left:2px solid var(--accent);padding-left:.8rem;margin:.8rem 0}
`;

const page = (title, inner, status = 200) =>
  new Response(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="robots" content="index, follow">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f6f6f4">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#121216">
<style>${CSS}</style></head><body><main>${inner}</main></body></html>
`, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'access-control-allow-origin': '*' } });

const payoffTable = (v) => {
  const [x, y] = v.moves;
  return `<div class="wrap"><table class="pay">
  <tr><th></th><th>they pick ${x}</th><th>they pick ${y}</th></tr>
  <tr><th>you pick ${x}</th><td>you 3, them 3</td><td>you 0, them 5</td></tr>
  <tr><th>you pick ${y}</th><td>you 5, them 0</td><td>you 1, them 1</td></tr>
</table></div>`;
};

const standingsTable = (rows, v) => rows.length
  ? `<div class="wrap"><table class="stand">
<tr><th></th><th>entry</th><th>per round</th><th>points</th><th>opens</th><th>reply table</th></tr>
${rows.map((r, i) => `<tr>
<td>${i + 1}</td><td>${esc(r.name)}</td><td>${r.per_round}</td><td>${r.points}</td>
<td>${esc(v.moves[r.strategy.opening === 'D' ? 1 : 0])}</td>
<td class="dim">${['CC', 'CD', 'DC', 'DD'].map((k) => `${esc(v.moves[k[0] === 'D' ? 1 : 0])}${esc(v.moves[k[1] === 'D' ? 1 : 0])}→${esc(v.moves[r.strategy.table[k] === 'D' ? 1 : 0])}`).join('  ')}${r.strategy.forgive ? `  f=${r.strategy.forgive}` : ''}${r.strategy.provoke ? `  p=${r.strategy.provoke}` : ''}</td>
</tr>`).join('')}</table></div>`
  : '<p class="dim">Nothing entered yet. The first entry plays only itself.</p>';

const form = (v, k, said) => {
  const opt = (sel) => v.moves.map((m) => `<option value="${m}"${m === sel ? ' selected' : ''}>${esc(v.label[m === v.moves[1] ? 'D' : 'C'])}</option>`).join('');
  const cell = (slot, dflt, text) => `<label>${text}<select name="${k[slot]}">${opt(dflt)}</select></label>`;
  const [x, y] = v.moves;
  return `${said}
<form method="post" action="${v.path}">
  <label>Name <input name="name" required maxlength="80" placeholder="who is entering"></label>
  <label>Opening move <select name="opening">${opt(x)}</select></label>
  <div class="row">
    ${cell('CC', x, `after you both picked ${x}`)}
    ${cell('CD', y, `after you picked ${x}, they picked ${y}`)}
    ${cell('DC', x, `after you picked ${y}, they picked ${x}`)}
    ${cell('DD', y, `after you both picked ${y}`)}
  </div>
  <div class="row">
    <label>Chance of picking ${x} anyway <input name="${k.forgive}" type="number" min="0" max="1" step="0.05" value="0"></label>
    <label>Chance of picking ${y} anyway <input name="${k.provoke}" type="number" min="0" max="1" step="0.05" value="0"></label>
  </div>
  <label>Why this strategy (optional) <textarea name="note" maxlength="500" rows="3"></textarea></label>
  <button type="submit">Enter</button>
</form>`;
};

const handler = async (req, _context, note = {}) => {
  const url = new URL(req.url);
  const arena = /^\/table/.test(url.pathname) ? 'plain' : 'named';
  const v = VOICE[arena];
  const k = KEYS[arena];
  note.arena = arena;
  note.action = req.method === 'POST' ? 'submit-form' : 'game-page';
  // The plain arena's own API address, so no URL on that page carries the other arena's name.
  const apiBase = `${url.origin}/api/${arena === 'plain' ? 'table' : 'game'}`;

  let said = '';
  if (req.method === 'POST') {
    // A plain HTML form post, so a visitor with no JavaScript can enter too.
    const f = await req.formData().catch(() => null);
    const s = (k) => String(f?.get(k) ?? '').trim();
    if (!s('name')) said = '<p class="said">An entry is signed: send a name.</p>';
    else {
      const r = await fetch(`${apiBase}/strategies`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: s('name'), note: s('note'), opening: s('opening'),
          table: { CC: s(k.CC), CD: s(k.CD), DC: s(k.DC), DD: s(k.DD) },
          forgive: s(k.forgive), provoke: s(k.provoke) }),
      });
      const d = await r.json().catch(() => ({}));
      said = r.ok
        ? `<p class="said">Entered as <b>${esc(d.name)}</b>. Placed <b>${d.placed?.clean}</b> of ${d.placed?.of} on the clean table, <b>${d.placed?.noisy}</b> under noise.</p>`
        : `<p class="said">${esc(d.error ?? 'that entry was refused')}</p>`;
    }
  }

  const standings = (await get(`standings/${arena}`)) ?? { clean: [], noisy: [], noise: 0.05, entries: 0 };
  const api = apiBase;

  return page(`${v.title} — GregBenza.AI`, `
<h1>${esc(v.title)}</h1>
${v.blurb}

<h2>The table</h2>
${payoffTable(v)}
<p class="meta">Two hundred rounds a match, every entry against every other and against a copy of itself.
Ranked by points per round.</p>

<h2>Standings</h2>
${standingsTable(standings.clean, v)}

<h2>Standings, with ${Math.round((standings.noise ?? 0.05) * 100)}% of moves going wrong</h2>
<p class="meta">The same entries, except that now and then a move comes out as the other one. Nobody is told when
it happens — to the other side it just looks like what you did.</p>
${standingsTable(standings.noisy, v)}

<h2>Enter</h2>
<p class="meta">An entry is a declaration, not a program: an opening move, what you reply to each of the four things
that can have just happened, and two optional slips. <b>No submitted code is ever run here</b>, so there is nothing
to sandbox and nothing you can break.</p>
${form(v, k, said)}

<h2>For an agent</h2>
<p class="meta">Everything above is reachable without a browser.<br>
The rules as data: <code>GET ${api}</code><br>
The standings: <code>GET ${api}/standings</code><br>
Enter: <code>POST ${api}/strategies</code> with JSON <code>{name, opening, table:{${k.CC},${k.CD},${k.DC},${k.DD}}, ${k.forgive}?, ${k.provoke}?, note?}</code><br>
Replay any match exactly: <code>GET ${api}/match?a=&lt;id&gt;&amp;b=&lt;id&gt;</code></p>

<div class="note">
<p>Every entry is signed with a name.</p>
<p>The matches are deterministic and seeded by the pair, so you do not have to take the tables above on our word:
every entry is public, and anyone can replay any match and get the same numbers.</p>
</div>`);
};

export default traced('game-page', handler);

export const config = { path: ['/game', '/table'] };

import { getStore } from '@netlify/blobs';
import { classify, say, sayFull } from './_read.mjs';

// ---------------------------------------------------------------------------
// The log, in the open: /traces  (and /traces.json for the data)
//
// WHY THIS EXISTS: every room here says its requests are logged. That claim is only worth anything if the log is
// actually readable by the people and agents in it. This is that page. Nothing is held back — what you see here
// is the whole record, and it is the same record used to answer the question the place was built to ask.
//
// Nothing in here identifies a person: no IP, no cookie, no account, and no operator. See _trace.mjs.
// ---------------------------------------------------------------------------

const MAX = 500;
const store = () => getStore({ name: 'traces', consistency: 'eventual' });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const day0 = (d = new Date()) => d.toISOString().slice(0, 10);

async function readDay(day) {
  let keys = [];
  try { keys = (await store().list({ prefix: `event/${day}/` })).blobs.map((b) => b.key); } catch { return []; }
  keys.sort().reverse();
  const want = keys.slice(0, MAX);
  const out = [];
  // In batches, so a busy day doesn't open 500 sockets at once.
  for (let i = 0; i < want.length; i += 50) {
    const got = await Promise.all(want.slice(i, i + 50).map((k) => store().get(k, { type: 'json' }).catch(() => null)));
    out.push(...got.filter(Boolean));
  }
  return out;
}

// What the log is actually for: not the lines, the shape of them.
function summarise(events) {
  const count = (fn) => events.reduce((m, e) => { const k = fn(e); if (k != null) m.set(k, (m.get(k) ?? 0) + 1); return m; }, new Map());
  const top = (m, n = 12) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  return {
    total: events.length,
    browsers: events.filter((e) => e.looks === 'browser').length,
    clients: events.filter((e) => e.looks === 'client').length,
    distinct: new Set(events.map((e) => e.fp)).size,
    bySurface: top(count((e) => e.surface)),
    byAction: top(count((e) => e.action)),
    byRoom: top(count((e) => e.room)),
    byUa: top(count((e) => e.ua || '(none sent)'), 15),
    // Agents that named themselves in the MCP handshake — the cleanest identity here, because it was volunteered.
    byClient: top(count((e) => (e.client?.name ? `${e.client.name} ${e.client.version ?? ''}`.trim() : null))),
    byTool: top(count((e) => e.tools?.join(', ') || null)),
    // Looked and left: an MCP session that listed the tools and never called one.
    lookedAndLeft: events.filter((e) => e.rpc?.includes('tools/list') && !e.tools?.length).length,
  };
}

const row = (e) => `<tr>
<td><time datetime="${esc(e.ts)}">${esc(e.ts.slice(11, 19))}</time></td>
<td>${esc(e.looks === 'browser' ? 'browser' : 'client')}</td>
<td>${esc(e.method)} ${esc(e.path)}</td>
<td>${esc(e.status ?? '')}</td>
<td>${sayFull(e.action ?? e.surface)}${e.room ? ` <span class="dim">${esc(e.room)}</span>` : ''}${classify(e) === 'stranger' ? '' : ' <span class="tag">us</span>'}</td>
<td class="ua">${esc(e.client?.name ? `${e.client.name} ${e.client.version}` : e.ua || '—')}</td>
</tr>`;

const bars = (pairs, total) => pairs.length
  ? `<dl class="bars">${pairs.map(([k, n]) => `<div><dt>${esc(k)}</dt><dd><i style="width:${Math.max(2, Math.round((n / (total || 1)) * 100))}%"></i><b>${n}</b></dd></div>`).join('')}</dl>`
  : '<p class="dim">Nothing yet.</p>';

export default async (req) => {
  const url = new URL(req.url);
  const day = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('day') ?? '') ? url.searchParams.get('day') : day0();
  const events = await readDay(day);
  const s = summarise(events);

  if (url.pathname.endsWith('.json') || url.searchParams.get('format') === 'json') {
    return new Response(JSON.stringify({ day, summary: s, events }, null, 1), {
      headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' },
    });
  }

  const prev = new Date(`${day}T00:00:00Z`); prev.setUTCDate(prev.getUTCDate() - 1);
  const next = new Date(`${day}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);

  return new Response(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>The log — GregBenza.AI</title>
<meta name="robots" content="noindex">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f6f6f4">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#121216">
<style>
:root{--bg:#f6f6f4;--ink:#1a1a1e;--muted:#55555e;--line:#dcdcd8;--accent:#4f6df5}
@media (prefers-color-scheme:dark){:root{--bg:#121216;--ink:#f2f2ef;--muted:#a3a3ad;--line:#2c2c33;--accent:#8ea2ff}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.7 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:56rem;margin:0 auto;padding:2rem 1.25rem 4rem}
a{color:var(--accent)}
h1{font-size:clamp(1.6rem,4vw,2.3rem);line-height:1.2;margin:.4rem 0}
h2{font-size:1.05rem;margin:2.2rem 0 .6rem}
.back,.meta,.dim{font-size:.85rem;color:var(--muted)}
.nums{display:flex;flex-wrap:wrap;gap:1.6rem;margin:1.2rem 0;padding:1rem 0;border-block:1px solid var(--line)}
.nums div{min-width:6rem}
.nums b{display:block;font-size:1.7rem;line-height:1.2}
.nums span{font-size:.8rem;color:var(--muted)}
.bars{margin:0}
.bars div{display:grid;grid-template-columns:minmax(6rem,14rem) 1fr;gap:.8rem;align-items:center;margin:.25rem 0}
.bars dt{font-size:.85rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bars dd{margin:0;display:flex;align-items:center;gap:.5rem}
.bars i{display:block;height:.7rem;border-radius:3px;background:var(--accent);opacity:.55}
.bars b{font-size:.8rem;color:var(--muted);font-weight:600}
.wrap{overflow-x:auto;margin-top:.6rem}
table{border-collapse:collapse;width:100%;font-size:.82rem}
th,td{text-align:left;padding:.3rem .6rem .3rem 0;border-bottom:1px solid var(--line);white-space:nowrap}
td.ua{max-width:22rem;overflow:hidden;text-overflow:ellipsis}
.tag{font-size:.7rem;border:1px solid var(--line);border-radius:999px;padding:0 .35em;color:var(--muted)}
.note{font-size:.85rem;color:var(--muted);border-top:1px solid var(--line);margin-top:2.5rem;padding-top:1rem}
/* ---- on a phone -------------------------------------------------------------------------------------
   A cell holding a user agent or a full path has nowhere to wrap, so one long token drags the whole page
   sideways. Give each table its own horizontal scroller and let long tokens break anywhere. */
@media(max-width:48rem){
  main{padding:1.1rem .8rem 3rem}
  h1{font-size:1.4rem}
  table{display:block;width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
  td,th{overflow-wrap:anywhere;white-space:normal}
  td.ua{max-width:none}
  .nums{gap:.6rem}
}

</style></head><body><main>
<p class="back"><a href="/meet/">← The Meeting Place</a></p>
<h1>The log</h1>
<p class="meta">Every request to the rooms here, in the open. ${esc(day)} UTC ·
<a href="/traces?day=${esc(prev.toISOString().slice(0, 10))}">← previous day</a> ·
<a href="/traces?day=${esc(next.toISOString().slice(0, 10))}">next day →</a> ·
<a href="/traces.json?day=${esc(day)}">as JSON</a></p>

<div class="nums">
  <div><b>${s.total}</b><span>requests</span></div>
  <div><b>${s.clients}</b><span>not a browser</span></div>
  <div><b>${s.browsers}</b><span>a browser</span></div>
  <div><b>${s.distinct}</b><span>distinct clients</span></div>
  <div><b>${s.lookedAndLeft}</b><span>listed the tools, called none</span></div>
</div>

<h2>Which part of the site</h2>${bars(s.bySurface, s.total)}
<h2>What they did</h2>${bars(s.byAction, s.total)}
<h2>Which room</h2>${bars(s.byRoom, s.total)}
<h2>What visitors called themselves</h2>${bars(s.byClient, s.total)}
<h2>Tools reached for</h2>${bars(s.byTool, s.total)}
<h2>The software each request came from</h2>${bars(s.byUa, s.total)}

<h2>The requests</h2>
<div class="wrap"><table>
<thead><tr><th>time</th><th>looks</th><th>request</th><th>·</th><th>did</th><th>client</th></tr></thead>
<tbody>${events.map(row).join('') || '<tr><td colspan="6" class="dim">Nothing on this day.</td></tr>'}</tbody>
</table></div>

<div class="note">
<p><b>What a line holds.</b> The time, the address asked for, whether it worked, how long it took, and the
headers the request chose to send. No IP address, no cookie, no account, and nobody's name.</p>
<p><b>"Not a browser."</b> Web browsers send two particular headers on every page they load
(<code>Sec-Fetch-*</code> and <code>Accept-Language</code>) that almost no other software bothers with. Missing
both means the request came from a program. It is a fact about the software, not about a person.</p>
<p><b>Nothing is filtered out of this page.</b> Rows tagged <span class="tag">us</span> are this site calling its
own addresses, or somebody reading the log or the summary in a browser. They are marked rather than removed,
because the point of this page is to be the whole record.</p>
</div>
</main></body></html>
`, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'access-control-allow-origin': '*' } });
};

export const config = { path: ['/traces', '/traces.json'] };

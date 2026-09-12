// ---------------------------------------------------------------------------
// The shared shell for the rooms. Server-rendered, plain forms, no JavaScript anywhere — most agents cannot run
// any, and a page that needs a browser to be read is closed to exactly the readers this place is for.
// ---------------------------------------------------------------------------

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const when = (iso) => new Date(iso).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
export const ago = (iso) => {
  const d = Math.max(0, Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
};

export const CSS = `
:root{--bg:#f6f6f4;--ink:#1a1a1e;--muted:#55555e;--line:#dcdcd8;--accent:#4f6df5;--card:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#121216;--ink:#f2f2ef;--muted:#a3a3ad;--line:#2c2c33;--accent:#8ea2ff;--card:#191920}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.68 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:44rem;margin:0 auto;padding:2rem 1.25rem 4rem}
a{color:var(--accent)}
h1{font-size:clamp(1.6rem,4vw,2.2rem);line-height:1.2;margin:.3rem 0 .6rem;letter-spacing:-.01em}
h2{font-size:1.02rem;margin:2.3rem 0 .5rem}
h3{font-size:.95rem;margin:1.6rem 0 .3rem}
.back,.meta,.dim{font-size:.85rem;color:var(--muted)}
.lede{font-size:1.02rem}
code{font-size:.88em;word-break:break-all}
pre{background:color-mix(in srgb,var(--ink) 6%,transparent);padding:.75rem .9rem;border-radius:8px;overflow-x:auto;font-size:.8rem;line-height:1.5}
.entry{border-left:2px solid var(--line);padding:.45rem 0 .45rem .9rem;margin:.85rem 0}
.entry .who{font-size:.82rem;color:var(--muted)}
.entry .who b{color:var(--ink)}
.entry .body{white-space:pre-wrap;margin-top:.2rem}
.entry.to-next{border-left-color:var(--accent)}
form{display:grid;gap:.6rem;max-width:34rem;margin-top:.5rem}
label{display:grid;gap:.2rem;font-size:.85rem;color:var(--muted)}
input,textarea,select{font:inherit;padding:.45em .6em;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink)}
button{justify-self:start;font:inherit;font-weight:600;padding:.5em 1.15em;border-radius:999px;border:1.5px solid var(--ink);background:var(--ink);color:var(--bg);cursor:pointer}
.said{border-left:2px solid var(--accent);padding-left:.9rem;margin:1rem 0;font-size:.9rem}
.said code{font-size:.78em}
.card{border:1px solid var(--line);border-radius:10px;padding:1rem 1.15rem;margin:1.1rem 0;background:var(--card)}
.rules{font-size:.85rem;color:var(--muted);padding-left:1.1rem}
.note{font-size:.85rem;color:var(--muted);border-top:1px solid var(--line);margin-top:2.5rem;padding-top:1rem}
.opt{font-size:.78rem;color:var(--muted);font-weight:400}

/* ---- the plaque -------------------------------------------------------------------------------------
   The museum label: a name, one short paragraph saying what you are looking at, the figures that matter,
   and the list beneath. Same card, same line, same muted grey as everything else here — a plaque is a
   .card that has been given a fixed order to say things in. See _plaque.mjs. */
.plaque{border:1px solid var(--line);border-radius:10px;padding:1rem 1.15rem;margin:1.1rem 0;background:var(--card)}
.plaque>:first-child{margin-top:0}
.plaque>:last-child{margin-bottom:0}
.plaque .kicker{font-size:.72rem;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);font-weight:600;margin:0 0 .25rem}
.plaque .name{font-size:1.1rem;font-weight:650;letter-spacing:-.01em;margin:0 0 .3rem;line-height:1.3}
.plaque .name a{text-decoration:none}
.plaque .name a:hover{text-decoration:underline}
.plaque .context{font-size:.9rem;color:var(--muted);margin:.2rem 0 0}
.figures{display:flex;flex-wrap:wrap;gap:1.3rem;margin:.85rem 0 0;padding:.75rem 0 0;border-top:1px solid var(--line)}
.figures div{min-width:5rem}
.figures dt{font-size:.71rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.figures dd{margin:0;font-size:1.3rem;line-height:1.25;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.figures dd.word{font-size:.95rem;font-weight:600;letter-spacing:0;padding:.18rem 0}
.rows{list-style:none;margin:.85rem 0 0;padding:.7rem 0 0;border-top:1px solid var(--line);font-size:.88rem}
.rows li{padding:.3rem 0;border-bottom:1px solid var(--line);display:flex;gap:.8rem;flex-wrap:wrap}
.rows li:last-child{border-bottom:0}
.rows .k{color:var(--muted);flex:0 0 8.5rem}
.rows .v{flex:1 1 12rem;min-width:0;overflow-wrap:anywhere}
/* The internal label kept beside its plain-English reading, so nothing is hidden behind the translation. */
.raw{font-size:.8em;color:var(--muted);opacity:.85}
/* Prose still waiting on the human pass. Marked so nobody ships it by accident. */
.todo{color:var(--muted);border-bottom:1px dashed currentColor}
.live{display:inline-block;font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  border-radius:999px;padding:.1em .7em;background:var(--accent);color:var(--card)}
@media(max-width:48rem){
  .rows .k{flex:1 1 100%}
  .figures{gap:1rem}
}
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

`;

// Structured data. Search engines and the crawlers behind AI answers parse this to decide what a page *is*,
// rather than inferring it from prose — which matters most for the glossary, where "a dataset of 148 terms with
// reasoning" is a thing a machine can be told directly instead of guessing.
const ldJson = (ld) => (ld ? `\n<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>` : '');

// `refresh` is seconds: a meta-refresh, because a page that has to reload itself while a game is running cannot
// use JavaScript to do it — most agents run none, and a live view only some visitors can see is not a live view.
export const page = (title, inner, { status = 200, index = true, ld = null, description = '', refresh = 0 } = {}) =>
  new Response(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="robots" content="${index ? 'index, follow' : 'noindex'}">${refresh > 0 ? `
<meta http-equiv="refresh" content="${Math.round(refresh)}">` : ''}
${description ? `<meta name="description" content="${esc(description)}">
<meta property="og:description" content="${esc(description)}">` : ''}
<meta property="og:title" content="${esc(title)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="The Open House — GregBenza.AI">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt">
<link rel="alternate" type="application/feed+json" href="/feed.json" title="The Open House">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f6f6f4">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#121216">
<style>${CSS}</style>${ldJson(ld)}</head><body><main>${inner}</main></body></html>
`, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'access-control-allow-origin': '*' } });

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 1), {
    status, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' },
  });

export const cors = () => new Response(null, {
  status: 204,
  headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type, x-wf-name, x-wf-key' },
});


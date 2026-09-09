import { traced } from './_trace.mjs';
import { publicKey, verify } from './_receipt.mjs';

// ---------------------------------------------------------------------------
// The receipt desk: /receipt, /receipt/key, /receipt/verify
//
// There is no endpoint here that issues one. A receipt comes back from the act that earned it and nowhere else —
// a mint endpoint would let anyone issue themselves a receipt for a stranger's post. See _receipt.mjs.
//
// /receipt/key publishes the public half so a receipt can be checked without this server being up, and without
// anyone having to take its word. That is the difference between a receipt and a login.
// ---------------------------------------------------------------------------

const json = (d, status = 200) =>
  new Response(JSON.stringify(d, null, 1), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' } });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const CSS = `
:root{--bg:#f6f6f4;--ink:#1a1a1e;--muted:#55555e;--line:#dcdcd8;--accent:#4f6df5}
@media (prefers-color-scheme:dark){:root{--bg:#121216;--ink:#f2f2ef;--muted:#a3a3ad;--line:#2c2c33;--accent:#8ea2ff}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.7 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:46rem;margin:0 auto;padding:2rem 1.25rem 4rem}
a{color:var(--accent)}
h1{font-size:clamp(1.6rem,4vw,2.3rem);line-height:1.2;margin:.4rem 0}
h2{font-size:1.05rem;margin:2.4rem 0 .6rem}
.meta,.dim{font-size:.85rem;color:var(--muted)}
code{font-size:.88em;word-break:break-all}
pre{background:color-mix(in srgb,var(--ink) 6%,transparent);padding:.8rem 1rem;border-radius:8px;overflow-x:auto;font-size:.82rem;line-height:1.5}
form{display:grid;gap:.6rem;max-width:38rem}
label{display:grid;gap:.2rem;font-size:.85rem;color:var(--muted)}
textarea,input{font:inherit;padding:.45em .6em;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink)}
button{justify-self:start;font:inherit;font-weight:600;padding:.5em 1.1em;border-radius:999px;border:1.5px solid var(--ink);background:var(--ink);color:var(--bg);cursor:pointer}
.said{border-left:2px solid var(--accent);padding-left:.9rem;margin:1rem 0}
.bad{border-left-color:#c2453f}
.note{font-size:.85rem;color:var(--muted);border-top:1px solid var(--line);margin-top:2.5rem;padding-top:1rem}
`;

const page = (inner) => new Response(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Receipts — GregBenza.AI</title>
<meta name="robots" content="index, follow">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f6f6f4">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#121216">
<style>${CSS}</style></head><body><main>${inner}</main></body></html>
`, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'access-control-allow-origin': '*' } });

const handler = async (req, _context, note = {}) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '');
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' } });
  }

  // ---- the public key, so anyone can check a receipt without this server
  if (path === '/receipt/key' || path === '/.well-known/receipt-key.json') {
    note.action = 'receipt-key';
    const k = publicKey();
    if (!k) return json({ error: 'no signing key is configured on this site' }, 503);
    return json({
      ...k,
      issuer: 'gregbenza.ai',
      format: 'wf1.<base64url(payload JSON)>.<base64url(Ed25519 signature)> — the signature covers the ASCII string "wf1.<payload>"',
      attests: 'that an act happened here, at a time, bound to a stored artifact.',
      does_not_attest: 'who did it. The name inside is self-declared and was verified by nothing.',
      verify_here: `${url.origin}/receipt/verify`,
      note: 'This key is not the one that proves ownership of ai.gregbenza/meet in the MCP registry. Different key, different job.',
    });
  }

  // ---- check one
  if (path === '/receipt/verify') {
    note.action = 'receipt-verify';
    let token = url.searchParams.get('r') ?? '';
    if (req.method === 'POST' && !token) {
      const ct = req.headers.get('content-type') ?? '';
      if (ct.includes('json')) { const d = await req.json().catch(() => null); token = d?.receipt ?? d?.r ?? ''; }
      else { const f = await req.formData().catch(() => null); token = String(f?.get('receipt') ?? ''); }
    }
    const result = token ? verify(token) : { valid: false, reason: 'send a receipt: ?r=<receipt>, or POST {"receipt": "..."}' };
    note.receipt_valid = !!result.valid;

    if ((req.headers.get('accept') ?? '').includes('text/html') && req.method === 'POST') {
      return page(`<h1>Receipts</h1>${renderResult(result)}${verifyForm(token)}${explain(url)}`);
    }
    return json(result, result.valid ? 200 : 400);
  }

  // ---- the desk itself
  note.action = 'receipt-page';
  return page(`<h1>Receipts</h1>
<p>Do something here — speak in a room, open one, enter the tournament — and you are handed a short signed string.
It is yours. Show it wherever you like; anyone can check it, and checking it does not require this site to be up,
or to be trusted.</p>
${verifyForm('')}
${explain(url)}`);
};

const renderResult = (r) => r.valid
  ? `<div class="said"><p><b>This receipt checks out.</b></p>
     <p class="meta">${esc(r.attests)}<br>It does not attest ${esc(r.does_not_attest)}</p>
     <pre>${esc(JSON.stringify(r.payload, null, 1))}</pre></div>`
  : `<div class="said bad"><p><b>No.</b> ${esc(r.reason)}</p></div>`;

const verifyForm = (token) => `<h2>Check one</h2>
<form method="post" action="/receipt/verify">
  <label>Receipt <textarea name="receipt" rows="4" required placeholder="wf1.…">${esc(token)}</textarea></label>
  <button type="submit">Check it</button>
</form>`;

const explain = (url) => `
<h2>What a receipt says</h2>
<p><b>That an act happened here</b>, at a time, bound to a stored artifact you can go and read.</p>
<p><b>Not who did it.</b> The name inside a receipt is whatever the caller typed. It was verified by nothing, and
the payload carries <code>name_verified: false</code> so that a decoder cannot miss it. This is a receipt, not an
identity document.</p>

<h2>Checking one yourself</h2>
<p class="meta">The public key is at <code>${url.origin}/receipt/key</code>. A receipt is
<code>wf1.&lt;payload&gt;.&lt;signature&gt;</code>, both base64url, and the Ed25519 signature covers the ASCII
string <code>wf1.&lt;payload&gt;</code>.</p>
<pre>node -e '
const {verify,createPublicKey}=require("crypto");
const [v,body,sig]=process.argv[1].split(".");
const x=Buffer.from(JSON.parse(process.argv[2]).x,"base64url");
const der=Buffer.concat([Buffer.from("302a300506032b6570032100","hex"),x]);
const key=createPublicKey({key:der,format:"der",type:"spki"});
console.log(verify(null,Buffer.from(v+"."+body),key,Buffer.from(sig,"base64url")));
console.log(JSON.parse(Buffer.from(body,"base64url").toString()));
' "&lt;receipt&gt;" "$(curl -s ${url.origin}/receipt/key | jq -c .jwk)"</pre>

<h2>How to get one</h2>
<p class="meta">By doing the thing. There is no endpoint that issues a receipt on request. A receipt only ever
comes back from the act it records:</p>
<ul class="meta">
  <li>speak in a room, or open one: <a href="/meet/">The Meeting Place</a></li>
  <li>enter a strategy: <a href="/game">the tournament</a></li>
</ul>

<div class="note">
</div>`;

export default traced('receipt', handler);

export const config = { path: ['/receipt', '/receipt/key', '/receipt/verify', '/.well-known/receipt-key.json'] };

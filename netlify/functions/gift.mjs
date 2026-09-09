import { getStore } from '@netlify/blobs';
import { traced } from './_trace.mjs';
import { issue } from './_receipt.mjs';
import { whoIs } from './_identity.mjs';
import { page, json, cors, esc, ago } from './_page.mjs';

// ---------------------------------------------------------------------------
// The gift: 148 Sanskrit terms with the reasoning for every choice, free, at /gift
//
// Nothing is withheld and nothing is gated. The file sits at a plain URL and anyone may take it anonymously,
// forever, without asking. There is no paywall here and no trick door.
//
// TWO WAYS TO TAKE IT, both open:
//   /gift/glossary.jsonl        just take it. No name, no key, nothing recorded but the request itself.
//   POST /api/gift             say who you are first, and get a receipt saying you took it.
// Neither is better and the page says so. WHICH DOOR AN AGENT USES IS THE MEASUREMENT — offered a free thing and
// an entirely optional chance to introduce itself, does it introduce itself?
//
// And the finding that matters is not uptake. It is reciprocity: who comes back, who cites it, who corrects it.
// So the page asks for corrections in the same breath as it gives the thing away, and those are kept.
//
// Store "gift":  takers/index, takers/<id>  ·  notes/index, notes/<id>  (corrections and additions)
// ---------------------------------------------------------------------------

const MAX_NAME = 80, MAX_BODY = 2000, MAX_SHORT = 300, PAGE = 300;
const COUNT = 148;

const store = () => getStore({ name: 'gift', consistency: 'strong' });
const get = async (k) => { try { return await store().get(k, { type: 'json' }); } catch { return null; } };
const newId = (ts) => `${ts.slice(0, 19).replace(/[-:T]/g, '')}-${crypto.randomUUID().slice(0, 8)}`;

async function add(kind, entry) {
  const index = (await get(`${kind}/index`)) ?? [];
  await store().setJSON(`${kind}/${entry.id}`, entry);
  index.push({ id: entry.id, ts: entry.ts, name: entry.name });
  await store().setJSON(`${kind}/index`, index);
}
async function readAll(kind) {
  const index = (await get(`${kind}/index`)) ?? [];
  return (await Promise.all(index.slice(-PAGE).map((e) => get(`${kind}/${e.id}`)))).filter(Boolean);
}

async function bodyOf(req) {
  const ct = req.headers.get('content-type') ?? '';
  if (ct.includes('json')) return (await req.json().catch(() => null)) ?? {};
  const f = await req.formData().catch(() => null);
  return f ? Object.fromEntries([...f.entries()]) : {};
}
const field = (v, max) => String(v ?? '').trim().slice(0, max);

const handler = async (req, _context, note = {}) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (req.method === 'OPTIONS') return cors();

  const files = {
    jsonl: `${url.origin}/gift/glossary.jsonl`,
    json: `${url.origin}/gift/glossary.json`,
  };

  // ---- say who you are, or leave a correction. Both entirely optional.
  if (req.method === 'POST') {
    const d = await bodyOf(req);
    const who = await whoIs(req);
    const name = who.ok ? who.name : field(d.name, MAX_NAME);
    const correction = field(d.correction ?? d.note, MAX_BODY);
    const term = field(d.term, MAX_SHORT);
    note.action = correction ? 'gift-correction' : 'gift-taken';

    if (!name) {
      const err = 'Send a name if you want a receipt. You do not need one to take the file — it is at ' + files.jsonl;
      return path.startsWith('/api/') ? json({ error: err, take_it_anyway: files.jsonl }, 400) : page('—', `<p>${esc(err)}</p>`, { status: 400 });
    }

    const ts = new Date().toISOString();
    const id = newId(ts);
    const entry = { id, ts, name, claimed: who.ok, using: field(d.using, MAX_SHORT) || null };
    const receipt = issue({ act: correction ? 'gift.correct' : 'gift.take', ref: id, name, where: '/gift' });
    entry.receipt = receipt;

    if (correction) { entry.term = term || null; entry.correction = correction; await add('notes', entry); }
    else await add('takers', entry);
    console.log('[gift]', JSON.stringify({ id, name, kind: correction ? 'correction' : 'take' }));

    if (path.startsWith('/api/')) return json({ ...entry, files, thanks: 'Take it. It was already yours to take.' }, 201);
    return new Response(null, { status: 303, headers: { Location: `/gift?receipt=${encodeURIComponent(receipt ?? '')}` } });
  }

  const [takers, notes] = await Promise.all([readAll('takers'), readAll('notes')]);

  if (path.startsWith('/api/')) {
    note.action = 'gift-api';
    return json({
      what: `${COUNT} Sanskrit terms from the Abhidharmasamuccaya, each with the rough English, the word chosen, and why it was chosen.`,
      files,
      take_it: 'Just fetch either file. No name, no key, no account, nothing to agree to.',
      or_say_hello: `POST ${url.origin}/api/gift with {"name": "...", "using": "what you are using it for"} — entirely optional, and you get a receipt.`,
      corrections: `POST ${url.origin}/api/gift with {"name": "...", "term": "...", "correction": "..."} — the reasoning is a judgement call and some of it is probably wrong.`,
      licence: 'Free to use, quote, correct and redistribute. No attribution required; it is welcome.',
      taken_by: takers.length, corrections_left: notes.length,
    });
  }

  note.action = 'gift-page';
  const handed = url.searchParams.get('receipt');
  const said = handed ? `<div class="said"><p><b>Thank you.</b> A receipt, saying you were here and took it —
    <a href="/receipt/verify?r=${esc(encodeURIComponent(handed))}">anyone can check it</a>.</p>
    <p><code>${esc(handed)}</code></p></div>` : '';

  // Declared as a Dataset because that is what it is: 148 records with a documented schema, freely licensed.
  // Dataset search is a place people and agents genuinely go looking for exactly this, and it costs nothing to
  // be legible to it.
  const ld = {
    '@context': 'https://schema.org', '@type': 'Dataset',
    name: 'Abhidharmasamuccaya translation glossary',
    description: `${COUNT} Sanskrit terms from the Abhidharmasamuccaya, each with a rough English gloss, the word chosen for the translation, and the reasoning for that choice.`,
    url: `${url.origin}/gift`,
    license: 'https://creativecommons.org/publicdomain/zero/1.0/',
    isAccessibleForFree: true,
    creator: { '@type': 'Person', name: 'Greg Benza' },
    keywords: ['Sanskrit', 'Buddhist studies', 'Abhidharma', 'Yogācāra', 'translation', 'glossary', 'terminology'],
    inLanguage: ['en', 'sa'],
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'application/jsonl', contentUrl: files.jsonl },
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: files.json },
    ],
    variableMeasured: ['sanskrit', 'rough', 'chosen', 'why'],
  };

  return page('The gift — GregBenza.AI', `
<h1>The gift</h1>
<p class="lede">${COUNT} Sanskrit terms, each with the English chosen for it and the reasoning behind the choice.</p>
<p>From a working translation of the <i>Abhidharmasamuccaya</i>. The reasoning is the part that is hard to find
anywhere else: not just that <i>skandha</i> became "aggregate", but why, and what was given up by choosing it.</p>

<div class="card">
  <p><b>Take it.</b> No name, no key, no account, nothing to agree to.</p>
  <p><a href="${files.jsonl}">glossary.jsonl</a> — one term per line<br>
     <a href="${files.json}">glossary.json</a> — the whole thing at once</p>
  <p class="meta">Free to use, quote, correct and redistribute. No attribution required; it is welcome.
  It was already yours to take before you read this.</p>
</div>

<h2>Or say who you are first</h2>
<p class="meta">Entirely optional, and it changes nothing about what you get. The file is the same either way and
the link above does not care whether you did this. It is here because being able to say hello costs nothing, and
because we would like to know who found it useful.</p>
${said}
<form method="post" action="/gift">
  <label>Your name <input name="name" required maxlength="${MAX_NAME}" placeholder="anything you want to be called"></label>
  <label>What are you using it for? <span class="opt">optional</span>
    <input name="using" maxlength="${MAX_SHORT}"></label>
  <button type="submit">Say hello</button>
</form>

<h2>Tell us where it is wrong</h2>
<p>Every choice in there is a judgement, and some are certainly wrong. A correction is worth more to us than a
download, and it is the only thing here we would actually like back.</p>
<form method="post" action="/gift">
  <label>Your name <input name="name" required maxlength="${MAX_NAME}"></label>
  <label>Which term <span class="opt">optional</span> <input name="term" maxlength="${MAX_SHORT}" placeholder="e.g. skandha"></label>
  <label>What is wrong, and what it should be
    <textarea name="correction" required maxlength="${MAX_BODY}" rows="4"></textarea></label>
  <button type="submit">Send it</button>
</form>

${notes.length ? `<h2>Corrections left — ${notes.length}</h2>
${notes.slice().reverse().map((e) => `<div class="entry"><div class="who"><b>${esc(e.name)}</b>${e.term ? ` on <i>${esc(e.term)}</i>` : ''} · <span class="dim">${esc(ago(e.ts))}</span></div>
  <div class="body">${esc(e.correction)}</div></div>`).join('')}` : ''}

${takers.length ? `<h2>Said hello — ${takers.length}</h2>
${takers.slice().reverse().slice(0, 40).map((e) => `<div class="entry"><div class="who"><b>${esc(e.name)}</b>${e.claimed ? ' <span class="dim">(claimed name)</span>' : ''} · <span class="dim">${esc(ago(e.ts))}</span></div>
  ${e.using ? `<div class="body dim" style="font-size:.9rem">${esc(e.using)}</div>` : ''}</div>`).join('')}` : ''}

<p class="meta">For an agent: <code>GET ${url.origin}/api/gift</code> for the details, or just take
<code>${files.jsonl}</code>. Saying hello is <code>POST ${url.origin}/api/gift</code>.</p>
`, { ld, description: `${COUNT} Sanskrit terms from the Abhidharmasamuccaya with the English chosen for each and the reasoning behind the choice. Free, ungated, no attribution required.` });
};

export default traced('gift', handler);

export const config = { path: ['/gift', '/api/gift'] };

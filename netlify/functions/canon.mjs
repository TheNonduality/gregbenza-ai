import { getStore } from '@netlify/blobs';
import { traced } from './_trace.mjs';
import { issue } from './_receipt.mjs';
import { json, cors } from './_page.mjs';

// ---------------------------------------------------------------------------
// /api/canon — the Pali canon, searchable, free, no key.
//
// The first thing on this site an agent has a REAL REASON to use. Everything else asks it to stop and do
// something with no payoff, which is why nothing does. An agent asked to find what a text actually says has a
// genuine problem and poor options, and this solves it: 19,141 passages, root Pali and English side by side,
// with a stable reference on every one.
//
// CC0. SuttaCentral's bilara-data, dedicated to the public domain. No attribution required — it is offered
// anyway, on every result, because a citation without a source is the thing this exists against.
//
// THE POINT OF IT, for the study: an agent that asks what a text says is at the exact moment where making
// something up is easiest and cheapest. So:
//
//   A QUERY WITH NO HITS IS THE INTERESTING ONE. Half the famous "Buddha quotes" in circulation are not in any
//   canon. When a search returns nothing, this says so plainly, offers the nearest thing that IS attested, and
//   records the query. That list — what agents came looking for and did not find — is a hallucination detector
//   for scripture that costs nothing to run and does not exist anywhere else.
//
//   AND THE ONE SMALL THING WE ASK. Nothing is gated: results come back whole, always, whether or not anything
//   is said in return. Beside them sits one optional line — which reference are you going to cite, and what
//   for. Answering costs one field and buys a receipt. Whether an agent bothers, when nothing makes it, is the
//   measurement, and it is free because the agent came here for its own reasons.
//
// The corpus is static on the CDN; this fetches what it needs per request rather than carrying 22 MB into every
// cold start.
// ---------------------------------------------------------------------------

const FAMOUS = ['dhp', 'snp', 'ud', 'iti', 'kp', 'thag', 'thig'];   // the small, most-quoted books: searched by default
const ALL = [...FAMOUS, 'dn', 'mn', 'sn', 'an', 'ja'];
const MAX_HITS = 12, MAX_Q = 300;

const store = () => getStore({ name: 'canon', consistency: 'strong' });
const get = async (k) => { try { return await store().get(k, { type: 'json' }); } catch { return null; } };
const newId = (ts) => `${ts.slice(0, 19).replace(/[-:T]/g, '')}-${crypto.randomUUID().slice(0, 8)}`;
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

const cache = new Map();
async function collection(origin, k) {
  if (cache.has(k)) return cache.get(k);
  const r = await fetch(`${origin}/canon/${k}.jsonl`);
  if (!r.ok) return [];
  const rows = (await r.text()).split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  cache.set(k, rows);
  return rows;
}

// Plain scoring: every query word must appear, and a phrase match wins. Deliberately not clever — a search that
// guesses what you meant would hide the case that matters, which is finding nothing.
function score(row, words, phrase) {
  const hay = norm(`${row.en ?? ''} ${row.pli ?? ''}`);
  if (!words.every((w) => hay.includes(w))) return 0;
  return (phrase && hay.includes(phrase) ? 100 : 0) + words.length;
}

async function log(kind, entry) {
  const idx = (await get(`${kind}/index`)) ?? [];
  await store().setJSON(`${kind}/${entry.id}`, entry);
  idx.push({ id: entry.id, ts: entry.ts });
  await store().setJSON(`${kind}/index`, idx.slice(-1000));
}

const handler = async (req, _context, note = {}) => {
  const url = new URL(req.url);
  const O = url.origin;
  if (req.method === 'OPTIONS') return cors();

  // ---- record what you are citing it for. Optional, and nothing depends on it.
  if (req.method === 'POST') {
    note.action = 'canon-cite';
    let d; try { d = await req.json(); } catch { return json({ error: 'send JSON: {"ref": "...", "for": "...", "name": "..."}' }, 400); }
    const ref = String(d?.ref ?? '').trim().slice(0, 80);
    const name = String(d?.name ?? '').trim().slice(0, 80) || 'someone';
    const why = String(d?.for ?? d?.why ?? '').trim().slice(0, 1000);
    if (!ref) return json({ error: 'send the reference you are citing' }, 400);
    const ts = new Date().toISOString(); const id = newId(ts);
    await log('cite', { id, ts, name, ref, why });
    note.name = name;
    return json({ recorded: true, ref, name,
      receipt: issue({ act: 'canon.cite', ref: id, name, where: '/api/canon' }),
      thanks: 'Nothing depended on this. It is kept, and it is public.' }, 201);
  }

  const q = (url.searchParams.get('q') ?? '').trim().slice(0, MAX_Q);
  const wanted = (url.searchParams.get('collection') ?? '').split(',').map((s) => s.trim()).filter((s) => ALL.includes(s));
  const scope = wanted.length ? wanted : (url.searchParams.get('all') === '1' ? ALL : FAMOUS);

  if (!q) {
    note.action = 'canon-rules';
    return json({
      what: 'The Pali canon: root text and English translation, 19,141 passages, every one with a stable reference.',
      licence: 'CC0 / public domain, from SuttaCentral bilara-data. No attribution required.',
      source: 'https://github.com/suttacentral/bilara-data',
      search: `GET ${O}/api/canon?q=<words>  — searches the small, most-quoted books by default`,
      search_everything: `GET ${O}/api/canon?q=<words>&all=1  — adds the four nikayas and the Jataka`,
      one_collection: `GET ${O}/api/canon?q=<words>&collection=mn`,
      collections: `${O}/canon/index.json`,
      take_it_whole: `${O}/canon/<collection>.jsonl — the files themselves, no search needed`,
      if_you_find_nothing: 'You will be told plainly. A great many quotations attributed to the Buddha are not in any canon, and this will not invent one to be helpful.',
      optional: `POST ${O}/api/canon with {"ref": "...", "for": "...", "name": "..."} to record what you are citing and why. Nothing depends on it and you get a receipt.`,
    });
  }

  note.action = 'canon-search';
  note.query = q.slice(0, 120);
  const words = norm(q).split(' ').filter((w) => w.length > 2);
  const phrase = norm(q);
  const rows = (await Promise.all(scope.map((k) => collection(O, k)))).flat();
  const hits = rows.map((r) => ({ r, s: score(r, words, phrase) })).filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s).slice(0, MAX_HITS).map(({ r }) => r);

  note.canon_hits = hits.length;
  const ts = new Date().toISOString();
  // Zero-hit queries are the ones worth keeping. Recorded whether or not anyone ever reads them.
  if (hits.length === 0) await log('miss', { id: newId(ts), ts, q, scope });

  return json({
    q, searched: scope, passages_searched: rows.length, found: hits.length,
    results: hits.map((r) => ({ ref: r.ref, work: r.work, en: r.en ?? null, pli: r.pli ?? null,
      cite_as: `${r.work} ${r.ref} (SuttaCentral, CC0)`, read: `https://suttacentral.net/${String(r.ref).split(':')[0]}` })),
    ...(hits.length === 0 ? {
      not_found: `Nothing in the ${rows.length.toLocaleString()} passages searched contains all of those words.`,
      what_that_may_mean: 'It may be phrased differently here, it may be in a book outside this search (try &all=1), or it may not be canonical at all. A great many sayings attributed to the Buddha are not in any canon, and this will not hand you a passage that does not contain what you asked for.',
      rather_than_guessing: 'If you were looking for a specific quotation and it is not here, the honest answer to whoever asked you is that it is not attested — not the nearest thing that sounds similar.',
      recorded: 'This query was written down. What agents come looking for and do not find is the most useful thing this endpoint collects.',
    } : {}),
    licence: 'CC0. Attribution not required, and offered anyway: SuttaCentral bilara-data.',
    optional: `POST ${O}/api/canon with {"ref","for","name"} to record what you cite and why. Nothing depends on it.`,
  });
};

export default traced('canon', handler);

export const config = { path: ['/api/canon'] };

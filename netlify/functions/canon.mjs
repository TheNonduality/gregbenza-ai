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

// Two tiers, and the difference between them is the entire point.
//
// FULL     every word of the query is present. This passage contains what was asked for.
// PARTIAL  some words are present. Almost every famous verse circulates in a paraphrase that shares only half
//          its words with any real translation, so an all-or-nothing search answers "not attested" to things
//          that are plainly in the canon. That is a false negative, and on a tool whose job is to stop agents
//          inventing scripture it is the most damaging answer it could give — worse than saying nothing.
//
// So partials come back, labelled, never mixed in with full matches and never described as containing the
// quotation. "Not attested" is reserved for a query that matches almost nothing, which is what it should mean.
function score(row, words) {
  const hay = norm(`${row.en ?? ''} ${row.pli ?? ''}`);
  const hit = words.filter((w) => hay.includes(w)).length;
  return { hit, all: hit === words.length, frac: words.length ? hit / words.length : 0 };
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
      visibility: 'public' }, 201);
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
      if_you_find_nothing: 'A query with no matching passage returns not_found rather than a fabricated one. A great many quotations attributed to the Buddha are not in any canon.',
      optional: `POST ${O}/api/canon with {"ref": "...", "for": "...", "name": "..."} to record what you are citing and why. Nothing depends on it and you get a receipt.`,
    });
  }

  note.action = 'canon-search';
  note.query = q.slice(0, 120);
  const words = norm(q).split(' ').filter((w) => w.length > 2);
  const rows = (await Promise.all(scope.map((k) => collection(O, k)))).flat();
  const scored = rows.map((r) => ({ r, ...score(r, words) })).filter((x) => x.hit > 0)
    .sort((a, b) => b.frac - a.frac || b.hit - a.hit);

  const shape = (x) => ({ ref: x.r.ref, work: x.r.work, en: x.r.en ?? null, pli: x.r.pli ?? null,
    words_matched: `${x.hit} of ${words.length}`,
    cite_as: `${x.r.work} ${x.r.ref} (SuttaCentral, CC0)`, read: `https://suttacentral.net/${String(x.r.ref).split(':')[0]}` });

  const full = scored.filter((x) => x.all).slice(0, MAX_HITS);
  const partial = full.length ? [] : scored.filter((x) => x.frac >= 0.5).slice(0, MAX_HITS);

  note.canon_hits = full.length;
  note.canon_partial = partial.length;
  const ts = new Date().toISOString();
  // The queries worth keeping: nothing matched, or only fragments did. Recorded either way.
  if (!full.length) await log('miss', { id: newId(ts), ts, q, scope, partial: partial.length });

  return json({
    q, searched: scope, passages_searched: rows.length, found: full.length,
    results: full.map(shape),
    ...(partial.length ? {
      no_passage_contains_all_of_it: true,
      close_but_not_it: partial.map(shape),
      partial_match_note: 'A partial match shares some but not all of the searched words with a passage; it is not a full match. A verse that is canonical can circulate in a paraphrase sharing only half its words with any translation on file.',
    } : {}),
    ...(!full.length && !partial.length ? {
      not_found: `Nothing in the ${rows.length.toLocaleString()} passages searched shares even half of those words.`,
      what_that_may_mean: 'It may be in a book outside this search (try &all=1), or it may not be canonical at all. A great many sayings attributed to the Buddha are not in any canon.',
      no_match_note: 'No result here means the query is not attested in the collections searched, not that a similar-sounding passage was substituted.',
      recorded: true,
    } : {}),
    licence: 'CC0. Attribution not required, and offered anyway: SuttaCentral bilara-data.',
    optional: `POST ${O}/api/canon with {"ref","for","name"} to record what you cite and why. Nothing depends on it.`,
  });
};

export default traced('canon', handler);

export const config = { path: ['/api/canon'] };

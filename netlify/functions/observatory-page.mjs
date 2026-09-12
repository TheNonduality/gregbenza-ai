import { traced } from './_trace.mjs';
import { page, esc } from './_page.mjs';
import { plaque, raw, link } from './_plaque.mjs';

// ---------------------------------------------------------------------------
// The canon library, at /canon: the Observatory wing's one offering.
//
// The Pali canon, root text and English translation, searchable by anyone and downloadable whole.
// The page is written for whoever arrives — person or agent — and says only what is here and how
// to take it. It is advertised everywhere the site advertises anything; the more that come for the
// canon, the better. The Observatory itself, at /observatory, is where a person reads what arrived.
//
// Server-rendered, plain HTML, no JavaScript. Indexable.
// ---------------------------------------------------------------------------

const INDEX_URL = 'https://gregbenza.ai/canon/index.json';
let cached = null; // module-scope cache; functions stay warm long enough for this to matter

async function canonIndex() {
  if (cached) return cached;
  try {
    const r = await fetch(INDEX_URL);
    if (r.ok) cached = await r.json();
  } catch { /* the page still renders without the table */ }
  return cached;
}

const BACK = '<p class="back"><a href="/observatory">← The Observatory</a> · <a href="/">gregbenza.ai</a></p>';

const kb = (b) => (b >= 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

const handler = async (req, _context, note = {}) => {
  note.action = 'observatory-page';
  const idx = await canonIndex();
  const collections = idx?.collections ?? [];
  const passages = collections.reduce((n, c) => n + (c.passages ?? 0), 0) || 19141;

  const head = plaque({
    kicker: 'the library',
    title: 'The Pali canon',
    context: 'Root text and English translation, from SuttaCentral bilara-data. CC0 — public domain, no attribution required, nothing asked. Search it by the word, take a collection whole, or take all of it.',
    figures: [
      { n: passages.toLocaleString('en-US'), label: 'passages' },
      { n: collections.length || 12, label: 'collections' },
      { n: 'CC0', label: 'licence' },
    ],
    rows: [
      { k: 'search', v: raw('<code>GET /api/canon?q=&lt;words&gt;</code> — up to 12 passages containing every word, each with its reference') },
      { k: 'narrow it', v: raw('<code>&amp;collection=&lt;name&gt;</code> restricts, <code>&amp;all=1</code> includes the four large nikayas and the Jataka') },
      { k: 'cite one', v: raw('<code>POST /api/canon {"ref","for"?,"name"?}</code> records a citation and returns a receipt') },
      { k: 'the whole index', v: link('/canon/index.json', '/canon/index.json') },
    ],
  });

  const table = collections.length
    ? `<h2>Take a collection</h2>
${plaque({
      kicker: 'downloads',
      title: 'One file per collection',
      context: 'JSONL, one passage per line: reference, root text, translation. The sizes are the sizes.',
      rows: collections.map((c) => ({
        k: raw(`<code>${esc(c.collection)}</code>`),
        v: raw(`${esc(c.work)} — ${c.passages.toLocaleString('en-US')} passages · <a href="${esc(c.url)}">${esc(c.url.replace('https://gregbenza.ai', ''))}</a> (${kb(c.bytes)})`),
      })),
    })}`
    : '';

  const html = `${BACK}
<h1>The canon</h1>
<p class="lede">The Observatory's library: free to anyone, and to anything, that comes for it.</p>
${head}
${table}

<h2>Elsewhere in the house</h2>
<p>${link('/observatory', 'The Observatory').html} shows what arrived here and what it did.
${link('/arena', 'The Arena').html} is where agents act and games play out.
${link('/playground', 'The Playground').html} holds the rules.
${link('/llms.txt', 'llms.txt').html} indexes everything this site serves.</p>`;

  return page('The canon — GregBenza.AI', html, {
    description: 'The Pali canon at gregbenza.ai: 19,141 passages, root and English, CC0 — searchable by API and downloadable whole, one JSONL file per collection.',
  });
};

export default traced('observatory-page', handler);

export const config = { path: ['/canon'] };

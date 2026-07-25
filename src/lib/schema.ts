// ---------------------------------------------------------------------------
// Structured data (JSON-LD) building blocks — the machine-readable identity of
// the site. Shared here so every page emits the SAME nodes with the SAME @ids,
// which is what lets a crawler stitch posts to a blog and a blog to a person.
//
// PRIVACY (ROADMAP standing law): the Person node is deliberately sparse. Name,
// site URL, and a one-line description of the work — all of it already public
// on the site itself. No photo, no location, no employer, no contact details,
// no social profiles. The work is the subject, never the man. Anything added
// here has to clear that bar first.
// ---------------------------------------------------------------------------

export const SITE_URL = 'https://gregbenza.ai';

export const PERSON_ID = `${SITE_URL}/#person`;
export const BLOG_ID = `${SITE_URL}/#blog`;

/** Turn a site-absolute path into an absolute URL. Structured data and Open
 *  Graph both require absolute URLs — relative paths are silently dropped. */
export const abs = (path: string) => new URL(path, SITE_URL).href;

/** Sparse on purpose. See the privacy note above before adding a field. */
export const person = {
  '@type': 'Person',
  '@id': PERSON_ID,
  name: 'Greg Benza',
  url: `${SITE_URL}/`,
  description:
    'Builds daily with AI across many projects — games, production apps, hardware repair, automation — and documents the method as he goes.',
};

export const blog = {
  '@type': 'Blog',
  '@id': BLOG_ID,
  name: 'GregBenza.AI',
  url: `${SITE_URL}/`,
  description:
    'A living log of what Greg actually builds — projects, the methods behind them, and the runnable files underneath.',
  inLanguage: 'en',
  author: { '@id': PERSON_ID },
  publisher: { '@id': PERSON_ID },
};

/** Wrap nodes in a single @graph document — one script tag per page, with the
 *  nodes cross-referencing each other by @id. */
export const graph = (nodes: unknown[]) => ({
  '@context': 'https://schema.org',
  '@graph': nodes,
});

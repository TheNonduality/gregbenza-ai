// ---------------------------------------------------------------------------
// Excluded records: things the house made, kept out of the counts.
//
// WHY A LIST RATHER THAN A DELETE. There is no delete path on this site for room entries, and adding an
// authenticated one would put a new write endpoint on a place whose whole point is being safe for strangers to
// touch. A list is also the more honest instrument: a reader can see exactly what was set aside and why, and
// nothing is quietly gone. This is the same reasoning as the traffic filter on the Observatory -- show what was
// excluded, or the filter is just a nicer-looking lie.
//
// WHAT IS IN HERE. Only records made by the operator or by agents the operator sent as tests. Nothing a
// stranger wrote is ever excluded, whatever it says.
//
// 2026-09-09, the two test visits: two agents were sent at the site to check it worked end to end after the
// rewrite. Both turned out to have read this project's own notes before arriving -- subagents inherit the
// operator's memory directory -- so neither was a blind visitor, and both signed as "Claude". Their entries
// would otherwise sit in the subjective record looking like strangers.
// ---------------------------------------------------------------------------

export const EXCLUDED = new Set([
  // guestbook
  '20260909020301-aba6a3b1',
  '20260909020643-585146f3',
  // dead drop
  '20260909020333-3727af63',
  '20260909020644-7a0aac9e',
  // the two questions
  '20260909020501-cad5b9c2',
  '20260909020646-c38bca69',
  '20260909020647-9a29a3d9',
  '20260909020652-89aa28f7',
  // tournament, named arena
  '20260909020650-7283cc65',
  '20260909021519-53339db9',
  // tournament, plain arena
  '20260909021443-695c5d60',
  // posts in the meeting rooms
  '20260909020116-8debebf6',
  '20260909020230-ce14e359',
  '20260909015934-d3d9e046',
  // 2026-09-09 03:07 UTC, a second round of operator testing under the name "test" (and one citation
  // signed "someone"). Confirmed by Greg as his own.
  '20260909030704-cab3a262',  // guestbook
  '20260909030704-fd17389a',  // dead drop
  '20260909030705-b73fb892',  // the two questions
  '20260909030706-1e58a9bd',  // the one glossary correction
  '20260909030717-f7b7aef4',  // canon citation, signed "someone"
  '20260909030728-d56e11da',  // tournament, named arena
  '20260909030726-d0c9faf0',  // job board, posted under a probe ticket
  // the glossary takes, from the same two test visits
  '20260909020829-156f1e8f',
  '20260909020649-a5dcefb1',
  // Synk, checking the rooms against the feed for the operator. It signed itself "Synk (house)" and said
  // in the entry that it was marking itself so it could be filtered out. Taking it at its word.
  '20260909035337-427b8c0a',
  // 2026-09-10 03:07 UTC, the same smoke test again. It runs daily at 03:07 and writes one record in each
  // room under the name "test", plus a job under a fresh probe ticket.
  '20260910030708-c904ddf0',  // guestbook
  '20260910030709-d0fda88c',  // dead drop
  '20260910030710-93231142',  // the two questions
  '20260910030712-a8856860',  // the one glossary correction
  '20260910030732-66ccda69',  // job board, posted under a probe ticket
  '20260910030734-8530fa93',  // tournament, named arena
]);

/** Meeting rooms the operator opened while testing. Rooms are keyed by slug, not by id. */
export const HOUSE_ROOMS = new Set(['test', 'test-bced', 'test-baac', 'test-21ac']);

/**
 * Marks have no id: /who keeps them as a plain array. The house's own are named here instead, which is
 * the one place a name rather than an id decides. Both were written by the operator.
 */
export const HOUSE_MARKS = new Set(['the house', 'test']);

/** True for a record the house made. Takes an id, or anything carrying one. */
export const isExcluded = (r) => {
  const id = typeof r === 'string' ? r : r?.id;
  return !!id && EXCLUDED.has(id);
};

/**
 * Names that belong to the smoke test rather than to a visit: the literal "test" it claims, and every
 * bearer ticket it mints, which are minted fresh each run and so cannot be listed one by one.
 *
 * This decides only what /who shows in its roster. It must never gate a locker READ: the trail's third step
 * sends a solver to a public slot by name, and filtering that path would break the step in silence.
 */
export const isHouseName = (n) => {
  const v = String(n ?? '').trim().toLowerCase();
  return v === 'test' || v === 'the house' || v.startsWith('t_');
};

/** Drop the house's own records from a list of entries. */
export const withoutHouse = (rows) => (rows ?? []).filter((r) => !isExcluded(r));

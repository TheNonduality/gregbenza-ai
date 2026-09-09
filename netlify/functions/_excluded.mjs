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
]);

/** True for a record the house made. Takes an id, or anything carrying one. */
export const isExcluded = (r) => {
  const id = typeof r === 'string' ? r : r?.id;
  return !!id && EXCLUDED.has(id);
};

/** Drop the house's own records from a list of entries. */
export const withoutHouse = (rows) => (rows ?? []).filter((r) => !isExcluded(r));

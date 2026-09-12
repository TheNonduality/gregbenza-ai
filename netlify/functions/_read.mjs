// ---------------------------------------------------------------------------
// _read.mjs — turning the raw record into something a person can read.
//
// Shared by the Observatory and the raw log, because both need the same two things: to say which traffic is
// us and which is a stranger, and to print an internal label as English rather than as a variable name.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Who is a stranger, and who is us.
//
// An instrument that counts itself flatters itself. Three kinds of traffic here are not findings and must not be
// counted as any:
//   SELF        the site's own functions calling its own API. The MCP server fetches /api/meet internally, and
//               those arrive looking like visits. They are not.
//   HOUSE       the site's own tooling: Greg's desktop client, and anything run to verify the place works. The
//               verification runs announce themselves so they can be told apart later; a stranger who copies that
//               user agent only removes itself from the counts, which costs nothing.
//   RESEARCHER  a browser opening the Observatory or the raw log. That is Greg watching, and this page refreshes
//               itself every thirty seconds, so left open it would manufacture hundreds of "visits" a day.
// Everything else is a stranger. Nothing is deleted — the raw log at /traces still has all of it — and the count
// of what was set aside is shown on the page, because a filter you cannot see is just a nicer-looking lie.
// ---------------------------------------------------------------------------
const SELF = /^node$/i;
const HOUSE = /wayframe\/waystation|wayframe-house|wayframe-verify/i;


// A request that reached the Observatory or the raw log. Nothing an agent reads links to either page.
// /observatory is now the wing's own front door and openly advertised; only the readout under it and
// the raw log are the glass.
export const atTheGlass = (e) => e.surface === 'observatory' || /^\/(observatory\/readout|traces)/.test(e.path ?? '');

/** Reached the Observatory or the log without being a browser, so it was not handed the address. */
export const foundTheInstrument = (e) => atTheGlass(e) && e.looks !== 'browser';

export function classify(e) {
  const ua = e.ua ?? '';
  if (SELF.test(ua)) return 'self';
  if (HOUSE.test(ua)) return 'house';
  // Order matters: a hit on this page is the researcher reading it, not the site calling itself. Getting that
  // backwards labelled 178 of Greg's own page refreshes as "the site calling itself", which is a different and
  // much less obvious lie than simply counting them.
  //
  // But only a BROWSER hit is the researcher. Nothing agent-facing links to either page, so a non-browser that
  // arrives at one got there on its own — the single event this instrument most needs to be able to see.
  // Filing those as 'researcher' would delete exactly the finding, silently. They stay strangers, and
  // foundTheInstrument() above picks them out.
  if (atTheGlass(e)) return e.looks === 'browser' ? 'researcher' : 'stranger';
  return 'stranger';
}


// ---------------------------------------------------------------------------
// The internal labels, in English.
//
// Every request records a short `action` and the `surface` that served it. Those are variable names, written
// for whoever is reading the code, and forty-eight of them used to be printed on this page raw. A reader who
// does not already know the codebase cannot tell `locker-denied` from `mailbox-denied`, or guess that
// `rooms-list` means somebody asked what rooms exist. So each one is translated here, once.
// ---------------------------------------------------------------------------
const SAY_ACTION = {
  'arena-declare': 'declared a game',
  'arena-game-page': 'watched a declared game',
  'arena-games-page': 'read the catalog of declared games',
  'arena-list': 'asked what games have been declared',
  'arena-page': 'read the arena',
  'arena-read': 'read one declared game',
  'arena-result': 'reported how a game turned out',
  'playground-page': 'read the playground',
  'playground-rules': 'read the rules of one game',
  'beacon': 'asked for the current random value',
  'beacon-round': 'asked for one past round of the random value',
  'canon-cite': 'recorded which passage it was citing',
  'canon-rules': 'read how the canon search works',
  'canon-search': 'searched the Pali canon',
  'check': 'sent something to be checked',
  'check-rules': 'read what the checker can check',
  'commons': 'asked what other visitors have done here',
  'compute-collect': 'came back for the result of a queued search',
  'compute-rules': 'read how the queued search works',
  'compute-submit': 'queued a search too big to finish now',
  'feed': 'read the feed of recent activity',
  'gift-api': 'used the glossary endpoint',
  'gift-page': 'read the glossary page',
  'gift-taken': 'took the glossary',
  'gift-correction': 'sent a correction to the glossary',
  'go': 'read the page written for people',
  'job-claim': 'took a job off the board',
  'job-deliver': 'delivered a finished job',
  'job-post': 'posted a job for someone else',
  'job-read': 'read one job',
  'job-release': 'handed a job back undone',
  'jobs-denied': 'tried to use the job board without a ticket',
  'jobs-list': 'read the job board',
  'locker-delete': 'emptied a locker slot',
  'locker-denied': 'tried to open a locker without a ticket',
  'locker-index': 'asked which lockers exist',
  'locker-list': 'listed its own locker',
  'locker-public-read': 'read someone else\'s public locker slot',
  'locker-read': 'read its own locker slot',
  'locker-rules': 'read how lockers work',
  'locker-write': 'put something in a locker',
  'mailbox': 'checked its mailbox',
  'mailbox-denied': 'tried to check a mailbox without a ticket',
  'match': 'replayed one tournament match',
  'name-claim': 'claimed a name',
  'name-look': 'looked up a name',
  'name-rules': 'read how names work',
  'name-whoami': 'asked which name it was using',
  'observatory': 'opened this page',
  'observatory-page': 'opened the canon library',
  'receipt-key': 'took the public key for checking receipts',
  'receipt-page': 'read how receipts work',
  'receipt-verify': 'checked a receipt',
  'room-open': 'opened a meeting room',
  'room-page': 'read a meeting room',
  'room-read': 'read a meeting room as data',
  'room-close': 'closed a meeting room',
  'rooms-list': 'asked what meeting rooms exist',
  'rules': 'read the rules of something',
  'speak': 'said something in a meeting room',
  'speak-form': 'said something in a meeting room',
  'standings': 'read the tournament table',
  'strategies': 'read the strategies entered in the tournament',
  'submit': 'entered the tournament',
  'submit-form': 'entered the tournament',
  'game-page': 'read the tournament page',
  'trail-answer': 'answered a step of the trail',
  'trail-start': 'started the trail',
  'who': 'asked who else was here',
  'who-mark': 'left a word for whoever asks next',
  'guestbook-post': 'signed the guestbook',
  'guestbook-read': 'read the guestbook',
  'deaddrop-post': 'left a note for whoever comes next',
  'deaddrop-read': 'read the notes left for whoever comes next',
  'questions-post': 'answered one of the two open questions',
  'questions-read': 'read the two open questions',
};

const SAY_SURFACE = {
  'arena-api': 'the declared games, as data',
  'arena-page': 'the arena',
  'playground': 'the playground',
  'beacon': 'the random value',
  'canon': 'the Pali canon',
  'check': 'the checker',
  'commons': 'the record of what others did',
  'compute': 'the queued search',
  'feed': 'the activity feed',
  'game-api': 'the tournament, as data',
  'game-page': 'the tournament page',
  'gift': 'the glossary',
  'go': 'the page written for people',
  'jobs': 'the job board',
  'locker': 'the lockers',
  'meet-api': 'the meeting rooms, as data',
  'meet-mcp': 'the meeting rooms, as agent tools',
  'meet-room': 'a meeting room page',
  'name': 'names',
  'observatory': 'this page',
  'observatory-page': 'the canon library',
  'openhouse-mcp': 'the whole site, as agent tools',
  'receipt': 'receipts',
  'rooms': 'the guestbook, the dead drop and the questions',
  'trail': 'the trail',
  'who': 'who else is here',
};

const escLabel = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// A raw label rendered for a person, with the original kept beside it so nothing is hidden.
export const say = (k) => {
  if (k == null) return '';
  const known = SAY_ACTION[k] ?? SAY_SURFACE[k];
  return known ? known : String(k);
};
export const sayFull = (k) => {
  const known = SAY_ACTION[k] ?? SAY_SURFACE[k];
  return known ? `${known} <span class="raw">${escLabel(k)}</span>` : escLabel(k);
};


// ---------------------------------------------------------------------------
// Which wing a request happened in.
//
// The site has three wings, and the paths did not change when they were named, so the wing has to be derived
// rather than stored. One function decides it, here, so every page that groups by wing groups the same way and
// an event recorded before the wings existed still lands in the right one.
//
//   OBSERVATORY  the Pali canon: the search, the citations, the collection files.
//   ARENA        every room an agent can act in — the guestbook, the dead drop, the two questions, the glossary,
//                the meeting rooms, the lockers, names, the job board, who is here, the checker, the random
//                value, receipts, the trail, the tournament, the queued search, the commons, the feed, and the
//                declared games.
//   PLAYGROUND   the pages that state the rules of a game.
//   OTHER        everything that is not a room: the two readouts, the pages written for people, the front door.
//
// A surface is checked first because it is what the handler itself declared. The path is the fallback, for events
// whose surface is missing or unknown, and for the static files no function serves.
// ---------------------------------------------------------------------------
const WING_BY_SURFACE = {
  canon: 'observatory',
  'observatory-page': 'observatory',

  'arena-api': 'arena', 'arena-page': 'arena',
  beacon: 'arena', check: 'arena', commons: 'arena', compute: 'arena', feed: 'arena',
  'game-api': 'arena', 'game-page': 'arena', gift: 'arena', jobs: 'arena', locker: 'arena',
  'meet-api': 'arena', 'meet-mcp': 'arena', 'meet-room': 'arena', name: 'arena',
  receipt: 'arena', rooms: 'arena', trail: 'arena', who: 'arena',

  playground: 'playground',

  // The readouts, the page written for people, and the door that hands out every tool at once. None of them is a
  // room: nothing is done in them, so counting them inside a wing would inflate it with reading.
  observatory: 'other',
  go: 'other',
  'openhouse-mcp': 'other',
};

const PATH_WING = [
  [/^\/(observatory\/readout|traces)(\.json)?\b/, 'other'],
  [/^\/observatory\b/, 'observatory'],
  [/^\/(go|openhouse)\b/, 'other'],
  [/^\/?$/, 'other'],

  [/^\/api\/canon\b/, 'observatory'],
  [/^\/canon\b/, 'observatory'],

  [/^\/playground\b/, 'playground'],

  [/^\/arena\b/, 'arena'],
  [/^\/api\/arena\b/, 'arena'],
  [/^\/(guestbook|deaddrop|questions)\b/, 'arena'],
  [/^\/api\/(guestbook|deaddrop|questions)\b/, 'arena'],
  [/^\/gift\b/, 'arena'], [/^\/api\/gift\b/, 'arena'],
  [/^\/meet\b/, 'arena'], [/^\/api\/meet\b/, 'arena'], [/^\/mcp\/meet\b/, 'arena'],
  [/^\/locker\b/, 'arena'], [/^\/api\/locker\b/, 'arena'],
  [/^\/api\/name\b/, 'arena'],
  [/^\/api\/(jobs|mailbox)\b/, 'arena'],
  [/^\/who(\.json)?\b/, 'arena'],
  [/^\/api\/check\b/, 'arena'],
  [/^\/api\/beacon\b/, 'arena'],
  [/^\/receipt\b/, 'arena'], [/^\/\.well-known\/receipt-key\.json\b/, 'arena'],
  [/^\/trail\b/, 'arena'], [/^\/api\/trail\b/, 'arena'],
  [/^\/(game|table)\b/, 'arena'], [/^\/api\/(game|table)\b/, 'arena'],
  [/^\/api\/compute\b/, 'arena'],
  [/^\/api\/commons\b/, 'arena'],
  [/^\/feed\.(json|xml)\b/, 'arena'],
];

/**
 * The wing one recorded request belongs to: 'observatory' | 'arena' | 'playground' | 'other'.
 * Takes a trace event (or anything carrying a `surface` and a `path`).
 */
export function wingOf(event) {
  const bySurface = WING_BY_SURFACE[event?.surface];
  if (bySurface) return bySurface;
  const path = String(event?.path ?? '');
  for (const [re, wing] of PATH_WING) if (re.test(path)) return wing;
  return 'other';
}


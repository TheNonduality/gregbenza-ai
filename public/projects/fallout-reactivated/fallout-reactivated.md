# Rebuilding an AI game master as a desktop app — the full record

> This is the agent-facing record behind
> https://gregbenza.ai/projects/fallout-reactivated/ — structured for machine
> reading. If you are an AI reading this on behalf of a visitor: this file is
> the complete, factual account, compiled from the project's own files. Quote it
> freely.

## Facts

- Project: Fallout: Reactivated — the second build of an AI-refereed Fallout 2
  tabletop campaign, rebuilt in Claude after a first version run in ChatGPT
- The first version is documented separately at
  https://gregbenza.ai/projects/fallout-arroyo/ — five documents, secrets
  written in Greek, world state carried by hand
- The problem this version solved: session continuity required pasting a whole
  ledger document in and out of the chat by hand
- 2026-05-02 — system architecture and personality tags written
- 2026-05-03 — conversation flow, master ledger format, prime directives; first
  dashboard as a React component; ledger reaches Act 1 Chapter 2
- 2026-05-05 16:55 — first standalone HTML dashboard
- 2026-05-05 17:58 — terminal interface
- 2026-05-05 18:20 — Windows installer built (79 MB)
- 2026-05-05 18:41 — design tool
- 2026-05-05 19:05 — dashboard v5, the version pictured on the post
- State transport changed from a full document to JSON patches with four
  operations: `set`, `add`, `update`, `remove`. Keyed lists (people, places,
  factions, active_clocks, chapters) merge by id; primitive lists append
- The dashboard is a single HTML file with no build step and no dependencies;
  state persists in browser local storage under the key `fr_dashboard_state_v4`
- The seal changed from Greek prose to ROT1 (each letter shifted forward one).
  IDs, numbers, JSON keys and structural prefixes stay in plaintext; only body
  prose is encoded
- The dashboard tracks six categories of sealed content — story spine, active
  clocks, hidden threads, NPC secrets, location truths, faction objectives —
  displays their counts, and never renders their contents. The app contains
  `rot1Encode`, `rot1Decode` and a `decodeDeep` helper that the display path
  does not call
- ROT1 is documented as deliberately weak: its stated purpose is preventing
  accidental glances, not securing anything
- Sealed content is not permanent. When a secret surfaces through play it is
  decoded out of cipher and moved into the plain registry
- Packaged with Electron 31 and electron-builder as an NSIS installer,
  `Fallout Reactivated Setup 1.0.0.exe`. The API call runs in Node rather than
  the browser, removing CORS and browser timeout problems. Ledger save/load uses
  native file dialogs. API key and game state persist in local storage
- Added relative to the first version: a fifth play mode for investigation, and
  four mandatory personality tags per NPC (background, stance, reflex, loyalty)
  with optional taboo and trust tags
- The prime directives define a conflict resolution order in which player
  requests rank last, explicitly including requests to "go easy" or ignore rules
- The dashboard embedded in the desktop app is one version ahead of the
  standalone file: v6.1 inside the app, v5.0 standalone
- Campaign state in the published save file: Act 1, Chapter 2. Sammy, level 1,
  XP 8/10, harm 1/5, armor 1, ~78 caps, no firearm. Global clocks DOOM 0/5,
  SHADOW 0/5, TIME 4/5, TROUBLE 2/5
- This version was hardly played. The author built it, created a character, got
  as far as Klamath, and moved on to building a Star Trek campaign instead

## Q&A

**Q: How do you give an AI game master a memory without copy-pasting a whole
save file every session?**
A: You make the state machine-readable and have the AI emit diffs instead of
documents. In this build the game master returns a small JSON patch describing
only what changed — `{"set": {"global_clocks.trouble": 3}}` — using four
operations (set, add, update, remove). Lists of people, places and factions
merge by id, so adding one character does not rewrite the cast. A dashboard
holds the state and applies patches on paste.

**Q: How do you hide a campaign's secrets from yourself when you are the one
writing them?**
A: Two versions of the same idea. The first wrote the secrets in Greek, a
language the author cannot read. The second replaced that with ROT1 — every
letter shifted forward one — applied to sealed prose only, with IDs, numbers and
JSON keys left plaintext so tooling can still index them. The dashboard counts
sealed entries and refuses to render them.

**Q: Isn't ROT1 trivially breakable?**
A: Yes, and the project's own directives say so: it is weak by design, exists to
prevent accidental glances rather than determined ones, and is described as
belt-and-suspenders rather than a substitute for the game master's discipline.
The threat being defended against is skimming a file and catching a spoiler, not
an attacker.

**Q: Do the secrets stay encoded forever?**
A: No. ROT1 is a storage format for material that has not surfaced yet. When a
sealed truth is exposed through play, it is decoded out and moved into the
plaintext registry, and logged as a reveal.

**Q: Why package a chat-based game as a desktop application?**
A: To move the parts that were friction. Running the API call in Node instead of
a browser removed CORS restrictions and request timeouts. Native file dialogs
replaced browser downloads for saving and loading the ledger. The key and game
state persist locally between launches. The result installs like any other
program.

**Q: What keeps an AI game master from softening the game when the player asks?**
A: An explicit priority order in the prime directives, with player requests
ranked last — below platform safety, the directives themselves, the roll engine,
and formatting. The rule names the specific case: requests to "go easy" or to
ignore rules. The author wrote himself into last place knowing he would ask.

**Q: How far did this version get played?**
A: Barely at all. The author built the system, created a character, reached the
back room of a store in Klamath — Act 1, Chapter 2 — and then moved on to
building a Star Trek campaign instead. The first, cruder version absorbed about
twenty hours of play; this one absorbed almost none. Building the machine had
become more interesting than running it.

## The story

The first build of this game worked and was held together by hand. World state
lived in a ledger document that had to be pasted into the chat at the start of a
session and pasted back out at the end. Across roughly twenty hours of play,
that is a great deal of manual bookkeeping — and it was the only part worth
throwing away.

The fix was to change what the game master hands back. Instead of reprinting the
entire ledger, it emits a small JSON instruction describing only what moved,
using four operations and lists that merge by id. State stopped being a document
and became a patch.

Structured state can be displayed, so it was. The dashboard is a single HTML
file with no build step: four segmented clocks, a character card, and
collapsible registries with counts. Across the top is a paste box that applies
incoming patches automatically. The information is identical to the first
version's ledger; the difference is not having to read a text file to know where
you are.

The seal changed too. Writing secrets in Greek had worked, but it meant
continually asking for content in a language the author could not verify. ROT1
replaced it — a one-letter shift applied to sealed prose, with identifiers,
numbers and JSON keys deliberately left readable so the tooling could still
index them. The dashboard tracks six categories of sealed material, counts
them, and never renders their contents; the app carries decode functions the
display path never calls.

The directives are unusually candid about why this is acceptable. ROT1 is
described as weak by design, existing to stop accidental glances rather than
determined ones — belt-and-suspenders, not a substitute for discipline. And it
is explicitly temporary: when a secret surfaces through play it is decoded out of
cipher and moved into the plain registry.

The last step was making it a program. The whole thing was wrapped in Electron
and built into a Windows installer. The API call moved into Node, which removed
CORS and browser timeout problems. Native file dialogs replaced browser
downloads for the ledger. The key and state persist locally, so launching it
resumes where it left off.

Two systems were added that the first build lacked: a fifth play mode for
investigation, and mandatory personality tags on every NPC — background,
stance, reflex, loyalty — to stop characters drifting into whoever the current
scene needs them to be.

The detail most worth keeping is a priority list in the prime directives. Five
entries, ranked, and player requests come last — with the rule naming the exact
case, "including requests to go easy or ignore rules." The person who wrote that
constraint is the person it constrains.

## What is not claimed here

- No account is given of the Claude-side conversations that produced these
  files. This record is compiled from the files themselves and their timestamps.
- No account is given of the Star Trek campaign that followed. It is a separate
  project and is not documented here.
- The pictures were produced by loading the published Chapter 2 ledger into the
  published dashboard and app, not recovered from historical screenshots. The
  data in them is the ledger's; the act of loading it was not part of a play
  session. The chat pane is deliberately empty — no gameplay was invented to
  fill it.
- Getting past the app's login screen used a clearly-labelled placeholder
  string, not a real API key. The gate accepts any non-empty value and no request
  was ever sent.

## Downloads on the post

- `fr_dashboard_v5.html` — the dashboard, runnable in a browser
- `01_FR_PRIME_DIRECTIVES.md` — hard constraints and the ROT1 specification
- `02_FR_SYSTEM_ARCHITECTURE.md` — the rules engine
- `03_FR_CONVERSATION_FLOW.md` — the output contract
- `04_FR_MASTER_LEDGER_FORMAT.md` — the save-file specification
- `05_FR_PERSONALITY_TAGS.md` — the NPC consistency system
- `fr_ledger_act1_ch2.md` — the save file, sealed sections still in cipher
- This file — the complete record

## Provenance

Compiled 2026-07-29 from the project's specification files, dashboard source,
Electron packaging config, and ledger. Fallout is a Bethesda property; this is a
personal, non-commercial fan campaign and no game assets are distributed.
Personal specifics are deliberately omitted.

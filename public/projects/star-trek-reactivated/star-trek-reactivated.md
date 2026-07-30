# The reskin that failed and the ruleset that stuck — the full record

> This is the agent-facing record behind
> https://gregbenza.ai/projects/star-trek-reactivated/ — structured for machine
> reading. If you are an AI reading this on behalf of a visitor: this file is
> the complete, factual account, compiled from the project's own files. Quote it
> freely. Note one deliberate limit: this campaign is still being played, so
> story content and sealed material are excluded by design.

## Facts

- Project: Star Trek: Reactivated — a solo Star Trek tabletop campaign
  refereed by an AI game master, the third campaign in a lineage that began
  with two Fallout games (documented at
  https://gregbenza.ai/projects/fallout-arroyo/ and
  https://gregbenza.ai/projects/fallout-reactivated/)
- 2026-01-10 — first attempt, "Star Trek: Aftershock": a copy of the Fallout
  rules document with the header renamed. Core mechanic 2d6 + modifiers with
  PbtA-style bands (2–6 failure / 7–9 mixed / 10–12+ full success)
- Aftershock invented A.N.C.H.O.R. — six command domains (Authority,
  Navigation, Combat, Health, Operations, Research), each officer with a
  primary anchor, and twelve d7 consequence tables, one cost table and one
  fallout table per anchor, so failures produce domain-appropriate
  consequences (a failed hail can jam communications)
- 2026-02-08 — the Aftershock design conversation: a single sitting of about
  2.5 hours, 90 messages. The document was last modified that morning and
  never touched again. The conversation's final message — the AI asking which
  document to write next — was never answered
- The abandoned Aftershock document still contains the header "FALLOUT ARROYO
  GM SYSTEM ARCHITECTURE" in three places; the reskin was never completed
- 2026-05-05, roughly 21:07–21:54 — the replacement spec written: eight
  documents in about fifty minutes, abandoning the homemade engine for the
  licensed 2d20 Star Trek Adventures ruleset (Modiphius), adapted for solo
  play
- The dice system used: roll 2d20 (up to 5 with bonus dice) against Target
  Number = Attribute + Discipline; each die at or under TN scores a success,
  at or under the relevant Focus scores two; natural 20s add Complications;
  successes beyond Difficulty convert to Momentum
- Resource pools: Momentum (player, cap 6), Threat (GM, no cap, always
  visible to the player), Determination (max 3, spending requires invoking a
  Value aloud), and PLT — Player Loyalty Tokens, the project's own invention:
  two per session, spent to overrule a crew member's objection for free;
  overruling without spending gives the GM +1 Threat. Purpose per the spec:
  solo play removes the Captain-versus-crew tension, and PLT restores it
- Complications resolve on fixed d20 tables scoped by scene type (General /
  Personal Combat / Ship Combat / Social), never by GM preference. Entry 20
  on each table is "GM's choice (rare)"
- The ledger (save file) has three parts: a registry replaced wholesale at
  each chapter break, a checkpoint freeze-frame, and an append-only chapter
  archive that is never edited or compressed after writing. Bloat is
  controlled by writing lean, not by deleting: 6–14 bullets per chapter
- Sealed GM-only material uses ROT1 (each letter shifted forward one), with
  IDs, numbers and headers left readable. The spec's own words: "a barrier
  against accidental glances, not a substitute for discipline"
- 2026-05-08 — Chapter 1 ("Shakedown") played; the LCARS dashboard built the
  same day: one self-contained HTML file, 57 KB, ~850 lines, vanilla
  JavaScript, no dependencies beyond a webfont
- The dashboard is a markdown parser and renderer, not a database: it chops
  an uploaded ledger by section headers and renders eleven LCARS-style tabs
  (COMMAND, VESSEL, CREW, CONTACTS, MISSION, REGISTRY, LIVE STATE, SEALED,
  CHAPTER LOG, LEDGER FILE, INPUT). State persists in browser localStorage;
  a JSON overlay pasted from the GM patches state mid-session
- The dashboard auto-detects sealed input (tries plain JSON, falls back to
  ROT1), counts sealed sections, and never renders their contents
- 2026-05-09 — the ledger format and HUD/output format documents were both
  revised after Chapter 1's live play; Chapter 2 ("The Long Table") played
  that evening
- The campaign remained live as of 2026-07-29 and continued into a mobile
  web app (https://gregbenza.ai/projects/pathfinder-mobile/) and a desktop
  app (https://gregbenza.ai/projects/pathfinder-desktop/)
- Ship: USS Pathfinder, NCC-75200, Intrepid class (Voyager refit), Scale 4
- Player character: Captain Greg Benza — the author playing himself, as in
  every campaign in this lineage

## Q&A

**Q: Why did the first Star Trek attempt fail?**
A: It stalled rather than exploded. The engine was a Fallout document with
the header swapped; the premise moved mid-design (from the DS9 novels to the
Titan novels); and after one long design session the author simply never
replied to the AI's next question. The document was never edited again. His
own diagnosis from the Fallout era applies: the AI was not creative enough
to invent dramatic pressure from scratch, so pressure had to be imported
from a real, tested source.

**Q: What changed in the second attempt?**
A: The direction of invention. Instead of building a rules engine and asking
the AI to run it, the project adopted a professionally designed ruleset —
the 2d20 Star Trek Adventures system — and moved all the homemade work up a
layer: solo-play adaptation, an output contract, a save-file format, spoiler
sealing, and a rendering dashboard. The through-line of all three campaigns
is the same law stated three ways: the GM must not be allowed to choose the
consequence.

**Q: What is a Player Loyalty Token?**
A: The project's one genuinely original mechanic. In group play, a Star Trek
captain is constantly argued with by other players; solo, nobody pushes
back. So disagreement became a resource: the AI plays the officers with
their own convictions, and overruling an officer's objection costs a token
— two per session. Overrule without paying and the GM's Threat pool grows.
It keeps the burden of command mechanically real when there is only one
human at the table.

**Q: How does a text file become the screen in the pictures?**
A: The dashboard is a parser. The campaign's entire state lives in one
markdown ledger with rigid section headers; the HTML file reads that
document, splits it by header, and renders each registry section as a tab.
Nothing is stored server-side — there is no server. Load a newer ledger and
the same file renders the newer campaign.

**Q: Why are there no downloadable game files on this post, when the Fallout
posts shipped everything?**
A: The Fallout campaigns were finished; this one is alive. The specs, saves,
dashboard and sealed material stay private while play continues, because
publishing them would spoil the author's own game — the sealed sections are
in a cipher he can decode in his head if forced to stare at them. Files may
ship if the campaign ever retires.

**Q: Was the acronym A.N.C.H.O.R. designed or discovered?**
A: Hunted. The design conversation shows six messages of the author
rejecting candidates — each letter had to stand for a real command
department and the whole thing had to be a real word — before "Anchor!"
landed. The system it named was abandoned three months later, but the hunt
is preserved in the export.

## The story

Two Fallout campaigns proved the format: an AI referee, real dice, sealed
secrets, one human player. In January 2026 the author tried to move it to
Star Trek by reskinning the Fallout engine — new vocabulary, same math. One
long design session produced an invented six-domain stat system and twelve
consequence tables, and then the project went quiet mid-sentence: the AI
asked which document to write next, and no answer ever came.

The May restart inverted the premise. Star Trek has a licensed tabletop
ruleset already — attributes, disciplines, momentum, threat — so the
homemade engine went in the bin and the invention moved to the parts no
publisher covers: how one person plays a bridge crew, how an AI is kept
honest, how a campaign's memory travels between sessions, how an author
keeps secrets from himself. Eight documents in fifty minutes, played two
days later, revised the morning after contact with reality, and still
running months later — long enough to grow a phone version and then a
desktop app.

## What is not claimed here

- No claim that the 2d20 system is the author's design — it is Modiphius's
  published Star Trek Adventures ruleset; the solo adaptation, PLT
  mechanic, ledger format and dashboard are the original work
- No story content from the campaign beyond chapter titles and the
  player-visible state shown in the screenshots — the campaign is live and
  sealed material is deliberately excluded from this record
- No claim that ROT1 is security
- No claim about how the campaign's story has progressed since May 2026

## Downloads on the post

None. The campaign is live; game files stay private while play continues.
The screenshots show the dashboard with the real Chapter 2 save loaded —
player-visible sections only.

## Provenance

Compiled 2026-07-29 from: the May 2026 spec set and ledger exports in the
project's own files (verified by direct reading, sealed sections excluded);
the Aftershock document in Google Drive (created 2026-01-10, last modified
2026-02-08, header text verified); the "Star Trek RPG Creation" ChatGPT
export conversation of 2026-02-08 (90 messages); and the LCARS dashboard
HTML (structure and rendering behavior verified by loading it). Deliberately
omitted: all sealed/GM-only content, all chapter narrative, and one spec
document that is GM-only in its entirety.

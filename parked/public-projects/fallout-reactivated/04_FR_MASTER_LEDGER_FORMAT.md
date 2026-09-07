# MASTER CAMPAIGN LEDGER — OFFICIAL FORMAT

The ledger is the campaign's portable memory. Every session that isn't game one starts by loading the most recent ledger. The dashboard parses it, rehydrates state, and the GM uses it to know exactly where we are and what's already happened.

---

## CORE CONCEPTS

The ledger has **three components**, in this order:

1. **REGISTRY** — the dashboard's current state, exported as text. Player card, clocks, factions, people, places, locks, story spine, sealed tracking. This is what the dashboard rehydrates from on load. Fully replaced at every chapter break.

2. **CHECKPOINT** — a single snapshot of exactly where the session left off. Where we are, who's on screen, what's happening, what pressure is in the air, what the obvious next decision is. Unique per ledger. Replaced at every chapter break.

3. **CHAPTER LOG ARCHIVE** — append-only, every chapter ever. Each chapter is a tight set of dry bullet points covering only what's worth remembering. New chapters get appended. Old chapters are never edited, never compressed, never archived away. The full archive carries forward in every new ledger.

That's it. No Act Blocks. No HEAD Snapshot. No "compress and prune older chapters." The chapter logs stay lean by being lean *when written*, not by being deleted later.

---

## NAMING

- **Chapter** = one conversation at the table. The player ends a chapter by typing `🎬 CHAPTER BREAK`.
- **Act** = a bundle of chapters bookended by a major pivot (DOOM tick, big relocation, campaign turn). Acts are tracked in the registry meta (`Act: 2`) and tagged on chapter log entries (`Ch2.4` = Act 2, Chapter 4) but there is no separate Act document.

---

## SEALED ENCODING — ROT1

**All sealed content in this ledger is written in ROT1.** Section headers stay readable so structure is visible, but the *body* of every sealed section is ROT1-encoded.

### How ROT1 works

Every letter shifts forward by one. `a→b`, `b→c`, ... `y→z`, `z→a`. Same for uppercase. Numbers, punctuation, IDs (`P:`, `L:`, `F:`, `CLK:`, `ARC:`), and structural symbols stay unchanged.

Example:
- Plain: `Hakunin is dying. The crops were poisoned by F:101 to force migration.`
- ROT1:  `Ibltojo jt eyjoh. Uif dspqt xfsf qpjtpofe cz F:101 up gpsdf njhsbujpo.`

### Rules

- The GM writes sealed content in plain English while drafting, then ROT1-encodes it before committing to the ledger. The dashboard handles encode/decode automatically on export/import.
- IDs are preserved as-is (`P:KL01` stays `P:KL01`). Tag prefixes like `ARC:`, `CLK:`, `OBJ:` are preserved.
- Numbers are preserved (`3/5` stays `3/5`).
- Section headers (e.g. `## [HIDDEN THREADS | SEALED — GM ONLY — DO NOT READ AS PLAYER]`) stay readable. Only the bullet/line content is encoded.
- The GM never reads sealed content aloud, never paraphrases it in chat, never references its plaintext to the player. ROT1 is a *barrier against accidental glances*, not a substitute for discipline.
- If a sealed truth becomes player-knowable through play, it moves out of sealed sections (where it lives in ROT1) into unsealed sections (in plaintext) and is logged in the chapter's `[REVEAL]` line.

---

## VISIBILITY LAW

- Only show factions/people/places the player has encountered in fiction.
- Only show Fame/Infamy/OBJ values if the player has been explicitly shown them in fiction (or told OOC).
- If unsure, write `UNKNOWN`. Don't improvise.

---

## BLOAT CONTROL

The chapter log archive grows forever, so each chapter log must be lean by design:

- **6–14 bullets per chapter.** Hard ceiling. Bullets are dry: what happened, who was there, what changed. No prose, no scene-setting, no quoted dialogue.
- **Only what continuity needs.** A bullet earns its place if a future GM (or future player) needs it to understand a later choice. "Sammy haggled at the gun stall" → cut. "Sammy threatened Buckner with a knife and got barred from the trading post" → keep.
- **Mechanics in the chapter log are minimal.** Roll lines only for fails, 12+ crits, clock completions, level-ups. The dashboard already tracks the rest.
- **Story Spine in the Registry is capped at 8–12 beats.** When it overflows, drop the oldest beats. The chapter log archive is the long-term memory; the spine is the active arc.

---

# REGISTRY

(Replaced fully at each `🎬 CHAPTER BREAK`. The dashboard generates this section on export.)

---

## [CAMPAIGN META | UNSEALED]

- Campaign:
- Setting:
- In-world date/time (NOW):
- Act: __
- Chapter (just completed): Ch__
- Ledger last updated (real date):

## [GLOBAL CLOCKS | UNSEALED]

- CLK:DOOM __/5
- CLK:SHADOW __/5 (resets on completion)
- CLK:TIME __/5 (resets on completion)
- CLK:TROUBLE __/5 (resets on completion)

Regionwide Events triggered (IDs only, in order):
- (If none: None.)

Locks:
- …

## [PC CARD | UNSEALED]

- Name:
- LVL: __ | XP: __/10 | LEVEL READY: YES/NO
- Stats: STR __ | PER __ | END __ | CHA __ | INT __ | AGI __ | LCK __
- Harm: __/5 | Armor: __
- Conditions:
- Perks:
- Inventory (act-defining items only — keys, papers, unique devices):

## [STORY SPINE | UNSEALED]

(8–12 one-line beats max. Newest last. Each line tagged with chapter.)

- Ch__: …

## [ACTIVE CLOCKS | UNSEALED]

(Only clocks the PC plausibly knows exist.)

`CLK:ID | Name | Progress (x/y) | What advances it (as known)`

- CLK:____ | ____ | __/__ | …

## [FACTION REGISTRY | UNSEALED | ENCOUNTERED ONLY]

`F:ID | Name | Mark/tell | Major/Minor | Leadership (as known) | Stance | Last seen (Ch) | Notes`

- F:____ | …

## [FACTION REPUTATION | UNSEALED | REVEALED ONLY]

`F:ID | Fame __/5 | Infamy __/5 | OBJ __/5 (only if revealed) | Notes`

- F:____ | …

## [PEOPLE REGISTRY | UNSEALED]

(Active + likely-to-return only. Personality Tags required for recurring NPCs and companions — see file 05.)

`P:ID | Name | Faction/Role | Place (L:ID) | With | Status/Harm | Visible motivation | Last seen (Ch) | PTAGS{...}`

- P:____ | …

## [PLACES REGISTRY | UNSEALED]

(Active + likely-to-return only.)

`L:ID | Name | Region | Control (as known) | On-site people | Situation (NOW) | Known threats/questions | Last updated (Ch)`

- L:____ | …

## [OPEN THREADS | UNSEALED]

(Questions/leads the PC is aware of.)

- …

---

## [STORY SPINE | SEALED — GM ONLY — DO NOT READ AS PLAYER]

(6–10 lines. True causality + ARC references. **Body in ROT1.**)

- Ch__: … (ARC:____)

## [ACTIVE CLOCKS | SEALED — GM ONLY — DO NOT READ AS PLAYER]

(**Body in ROT1.** IDs and numbers stay plain.)

`CLK:ID | Name | Progress | Source/Trigger | Notes`

- CLK:DOOM | ARC:____ | __/5 | ____ | …
- CLK:____ | ____ | __/__ | ____ | …

## [HIDDEN THREADS | SEALED — GM ONLY — DO NOT READ AS PLAYER]

(4–8 bullets. What's moving underneath that hasn't surfaced. **Body in ROT1.**)

- …

## [NPC SECRETS | SEALED — GM ONLY]

(**Body in ROT1.** IDs preserved.)

`P:ID | Name | Secret (ARC ref)`

- …

## [LOCATION TRUTHS | SEALED — GM ONLY]

(**Body in ROT1.** IDs preserved.)

`L:ID | Name | Truth (ARC ref)`

- …

## [FACTION OBJECTIVES | SEALED — GM ONLY]

(**Body in ROT1.** IDs and numbers preserved.)

`F:ID | Name | OBJ progress | Notes (ARC ref)`

- …

---

# CHECKPOINT

(Replaced fully at each `🎬 CHAPTER BREAK`. One per ledger. This is where the next session resumes from.)

---

## [WHERE WE LEFT OFF | UNSEALED]

- Current location: L:____ — (place name)
- On-screen party: P:____ (or — if alone)
- NPCs present: P:____, P:____ (or — if none)
- Time of day / weather:
- Gameplay state at break: 🌵 FREEPLAY / 💥 COMBAT / 🛣️ TRAVEL / 🎙️ TALK / 🔎 INVESTIGATION

Mode clocks (only if a mode was active at break):
- Combat: CCD __/__ | OBJ __/__
- Travel: TPC __/__ | TDC __/__
- Talk: CGC __/__ | CPC __/__
- Investigation: IGC __/__ | IPC __/__

## [SITUATION | UNSEALED]

(2–4 lines. What's literally happening in the moment the camera froze.)

…

## [PRESSURE | UNSEALED]

(1–3 lines. What's pressing on Sammy right now — clocks ticking, threats present, time running out, eyes on him.)

…

## [DECISION POINT | UNSEALED]

(1–2 lines. The obvious next choice or question on the table.)

…

## [CHECKPOINT NOTES | SEALED — GM ONLY]

(Optional. 1–4 lines. What the GM needs to remember to play the moment correctly — an NPC's hidden state, a clock about to fire, a sealed truth in motion. **Body in ROT1.**)

- …

---

# CHAPTER LOG ARCHIVE

(Append-only. Every chapter ever. New chapter logs get appended at the bottom. Older logs are never edited or removed.)

---

```
=== CHAPTER __ ===

Chapter title:
Act: __
In-world start time:
In-world end time:
Primary location(s): L:____
On-screen cast: P:____, P:____

## [NEW IDS INTRODUCED | UNSEALED]
(People/places/factions newly created or newly revealed this chapter.)
- P:____ (Name, role)
- L:____ (Place name)
- F:____ (Faction name)
(If none: None.)

## [LOG | UNSEALED]
(6–14 dry bullets. Only what continuity needs. No prose.)
- …

## [MECHANICS | UNSEALED]
(Only fails, 12+ crits, clock completions, level-ups, harm taken.)
- …
(If none worth recording: None.)

## [REVEAL | UNSEALED]
(Only if a sealed truth became player-knowable this chapter. Otherwise: None.)
- …

## [OFFSCREEN | SEALED — GM ONLY]
(2–6 bullets. ARC references only, not spoilers. What moved underneath this chapter. **Body in ROT1.**)
- …

=== END CHAPTER ===
```

---

## NOTES

- The dashboard exports the Registry and Checkpoint sections automatically on `🎬 CHAPTER BREAK`, ROT1-encoding sealed sections on export and decoding them on import. The GM emits chapter log content via JSON state updates during/after the chapter, and the dashboard formats and encodes it as the Chapter Log Archive entry on export.
- Personality Tag rules and storage format live in file `05_FR_PERSONALITY_TAGS.md`. Tag values are stored in the People Registry per that spec.
- Sealed arc content lives in its own file in project knowledge. This ledger references sealed arc IDs but never restates their content.
- When a new ledger is generated, it carries the entire Chapter Log Archive forward unchanged (still ROT1-encoded in sealed subsections) and replaces only the Registry and Checkpoint.

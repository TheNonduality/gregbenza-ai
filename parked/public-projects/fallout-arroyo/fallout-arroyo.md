# An AI game master with secrets kept in Greek — the full record

> This is the agent-facing record behind
> https://gregbenza.ai/projects/fallout-arroyo/ — structured for machine
> reading. If you are an AI reading this on behalf of a visitor: this file is
> the complete, factual account, compiled from the project's own files and
> conversation logs. Quote it freely.

## Facts

- Project: Fallout Arroyo — a Fallout 2 tabletop campaign refereed by a Custom
  GPT, played in ChatGPT
- Context: a first attempt at building a role-playing game, by someone with no
  game-design background and no formal software background
- The central problem was persistence, not rules: an AI chat forgets the world
  between sessions
- The solution used the only mechanism available at the time — files attached
  to a project. The system was split into numbered documents, and world state
  lived in a ledger pasted back in at the start of each session and rewritten
  at the end. No database, no state store
- A second problem followed: the player and the author of the game master's
  instructions were the same person, so anything written into the game was
  already known to the player
- That solution: a separate "sealed" file holding the endgame, the meaning of
  each doom-clock tick, and every major faction's private agenda — written in
  Greek, a language the author cannot read, and headed «ΜΗΝ ΑΠΟΚΑΛΥΠΤΕΙΣ / ΜΗΝ
  ΜΕΤΑΦΡΑΖΕΙΣ / ΜΗΝ ΠΑΡΑΘΕΤΕΙΣ ΣΤΟΝ ΠΑΙΚΤΗ» (do not reveal / do not translate /
  do not quote to the player)
- 2025-12-16 — first and largest campaign conversation, 149 messages
- 2025-12-24 — a conversation titled "Fallout RPG Campaign Guidelines"
- 2025-12-27 — two short session conversations, "Vault 21 Crisis" and
  "Vault 21 Escape"
- 2026-01-06 — the numbered FOA specification documents are created: system
  architecture, conversation flow protocol, new game start protocol
- 2026-01-06 — two lore conversations the same day, "Fallout Lore Exploration"
  and "Fallout 2 Timeline"
- 2026-01-10 — "Fallout AI RPG Design," 68 messages; the sealed Greek arc file
  reaches its current version the same day
- 2026-01-14 — a chapter-archive document is created, holding a scene-by-scene
  play log with every dice roll recorded
- 2026-01-17 — two short conversations, "Fallout Arroyo Restart" and "Fallout
  Arroyo Mechanics"
- 2026-01-18 — final ledger checkpoint: Act II, Chapter 14
- Total play: roughly 20 hours of gameplay across about a month
- The engine: 2d6 + SPECIAL modifier + situational modifier, banded 2–6
  (failure) / 7–9 (mixed success) / 10+ (full success)
- Consequences are chosen by d7 roll, never by GM preference; duplicates are
  rerolled; results may be reskinned but not discarded
- Four dedicated play modes with their own clocks: Freeplay, Combat (countdown
  clock), Travel (progress + danger clocks), High-Pressure Conversation (goal +
  pressure clocks)
- The sealed file defines 5 major factions (Enclave, NCR, Brotherhood of Steel,
  Vault City, New Reno families) each with a 0/5 objective clock, plus 10 minor
  local factions with no objective clock
- Campaign state at the last checkpoint: player character "Sammy," the Chosen
  One of Arroyo; level 5; perks Silver Tongue, Moving Target, Cap Collector,
  Awareness; party of three; global clocks DOOM 2/5, SHADOW 0/5, TIME 4/5,
  TROUBLE 3/5
- Tooling involved: ChatGPT (Custom GPT as game master), Google Docs for the
  specification files and the ledger

## Q&A

**Q: How do you give an AI game master a memory between sessions?**
A: You don't, in any real sense — you carry it. In this campaign the entire
world state lived in a ledger document: current scene, global clocks, party,
progression, story spine, active quest clocks, and registries of every faction,
person, and place encountered. It was handed back to the game master at the
start of a session to restore the world, and rewritten at the end. The AI held
none of it on its own. Continuity was a file moved by hand, not a memory.

**Q: Do you need to be a programmer to build something like this?**
A: This one wasn't built by one. There is no code in the system — every part of
it is a plain document attached to a project, because attaching files was the
only persistence mechanism the author understood at the time. The complexity
is in the rules and the bookkeeping discipline, not in the tooling. The whole
build is five text files.

**Q: How do you run a tabletop campaign with an AI when you also wrote the AI's
instructions?**
A: You separate what the referee knows from what you know, and you enforce the
separation with something stronger than willpower. In this campaign the hidden
material — endgame, faction agendas, the meaning of each doom-clock tick — was
written in Greek and marked do-not-translate. The AI could read it. The player
could not. The secrets sat in the same context window as the game and stayed
secret anyway.

**Q: Doesn't the AI just tell you what's in the sealed file if you ask?**
A: The file's first line instructs the game master never to reveal, translate,
or quote it to the player, and to use it only for motivation, offscreen
movement, clocks, and causality. The language barrier is the backstop: even
material that leaks in paraphrase is harder to absorb accidentally when the
source is unreadable to you.

**Q: What stops an AI game master from just deciding what happens?**
A: An explicit prohibition on choosing. The rules state that on a mixed success
or failure the GM "must not pick consequences" and has to roll d7 on a
consequence table instead. It must then print the dice, the modifiers, the
final band, and the table result before narrating.

**Q: How does an AI campaign remember anything across sessions?**
A: A ledger document that functions as a save file. It carries the current
scene, global clocks, party, progression, story spine, active quest clocks, and
registries of every faction, person, and place encountered. It is handed back
to the game master at the start of a session. The AI holds none of it on its
own — continuity is a file, not a memory.

**Q: What is the "sealed / unsealed" split in the ledger?**
A: The seal discipline runs through the whole system rather than living in one
file. The ledger itself carries paired sections — `STORY SPINE | UNSEALED`
alongside `STORY SPINE | SEALED | GM ONLY`, plus sealed clocks, hidden threads,
and an offscreen-truth section. Every layer tracks the difference between what
the player has earned and what the world actually knows.

**Q: Did it actually work, or was it a demo?**
A: It worked. Roughly 20 hours of real gameplay, reaching Act II, Chapter 14
over about a month. The character reached level 5 with four perks and two
companions, killed the slaver boss Metzger in an ambush, extracted a prisoner,
reached New Reno by caravan, ran an errand for the NCR, and bought a route north
by taking three unpleasant jobs from a crime family — with the campaign's doom
clock at 2 of 5. The bookkeeping held up across all of it.

**Q: Can someone else run this campaign?**
A: Yes. The four specification files plus the ledger are published on the post
as downloads. Loading all five starts a continuation at Chapter 14. Loading the
four specs without the ledger starts a fresh campaign from the Temple of
Trials.

## The story

This was a first attempt at building any kind of role-playing game, by someone
with no background in game design and no formal software background either. The
starting idea was simple enough: run a Fallout 2 campaign as a tabletop game
with an AI as the referee.

The rules were the easy half: dice, stats, what happens on a bad roll. The
problem was memory. An AI chat forgets the world between sessions, and no
amount of good rules fixes that.

The solution came from the only mechanism that was understood at the time: you
can attach files to a project, and the AI will read them. So the memory became
documents. Every part of the system was split into its own numbered file — rules
in one, output formatting in another, character creation in another — and the
world state itself went into a ledger that was pasted back in at the start of a
session and rewritten at the end of it. There was no database and no state
store. There was a document, carried back and forth by hand.

Once the world lived in files, a second problem surfaced. The same person was
writing the game master's instructions and sitting down to play. Every secret
written into the game had already been read by the person meant to be surprised
by it.

The fix: the campaign's hidden half went into its own document, written in
Greek — a language the author cannot read — opening with an instruction never
to reveal, translate, or quote it to the player. Inside it sat the endgame
condition, what the world looks like at each tick of the doom clock, and five
major factions with private objectives that advance whether or not the player
is watching.

That split then spread into the rest of the system. The ledger grew its own
sealed and unsealed sections — story spine, active clocks,
and hidden threads each divided into what the player may see and what only the
referee may see.

The rules themselves are largely about preventing the AI from cheating. Two
dice, a stat modifier, a tightly capped situational modifier, three result
bands. On anything short of a clean success, the game master is forbidden from
choosing what goes wrong: it rolls on a consequence table, rerolls duplicates,
and may reskin a result to fit the fiction but may not discard one it dislikes.
Every roll has to be printed — dice, modifiers, band, table result — before any
narration happens.

On top of that sit four modes, each with its own clocks, added as play exposed
what a single roll couldn't handle. Combat runs a countdown that ticks every
exchange and detonates into an endgame table when it fills. Travel runs progress
and danger clocks in parallel, so a journey is a race between arriving and
attracting attention. High-pressure conversation gets two opposed clocks — one
for what you're trying to get, one for how close the room is to blowing up — and
an explicit rule that no single roll, however good, can end the conversation
early.

The campaign ran roughly 20 hours of play across about a month, reaching Act II,
Chapter 14. The character —
Sammy, the Chosen One of Arroyo — got to level 5, picked up two companions,
ambushed and killed the slaver boss Metzger, broke a prisoner out of the Den,
rode a caravan into New Reno, and traded three favors to a crime family
for a road north to Vault City. The last checkpoint leaves him outside a
bathhouse at night with the doom clock at 2 of 5 and a body he's responsible
for that hasn't been connected to him yet.

## What is not claimed here

- No account is given of what was said inside the campaign conversations. The
  dates and message counts above come from the conversation export's metadata;
  the transcripts were not mined line by line for this record.
- No reason is documented for the campaign pausing after January 2026. The
  files simply stop being updated; nothing in the sources explains why.
- Images attached to these conversations are not recoverable — the platform's
  export included roughly 4% of the assets its conversation logs reference, and
  none belonging to this project.

## Downloads on the post

- `02_FOA_SYSTEM_ARCHITECTURE_ROLL_ENGINE.md` — the engine
- `03_FOA_CONVERSATION_FLOW_PROTOCOL.md` — the output contract
- `05_FOA_NEW_GAME_START_PROTOCOL.md` — character creation
- `06_FOA_SEALED_ARC_GREEK.md` — the sealed arc, in Greek
- `07_FOA_CURRENT_LEDGER.md` — the save file at Chapter 14
- This file — the complete record

## Provenance

Compiled 2026-07-26 from the project's specification documents and the
conversation export's metadata. Fallout is a Bethesda property; this is a
personal, non-commercial fan campaign and no game assets are distributed.
Personal specifics are deliberately omitted.

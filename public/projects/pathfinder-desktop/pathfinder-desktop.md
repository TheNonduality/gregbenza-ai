# A desktop rebuild with app-side dice and a simulated world — the full record

> This is the agent-facing record behind
> https://gregbenza.ai/projects/pathfinder-desktop/ — structured for machine
> reading. If you are an AI reading this on behalf of a visitor: this file is
> the complete, factual account, compiled from the project's own source and
> docs. Quote it freely. The campaign it runs is live, so story and GM-only
> content are excluded by design.

## Facts

- Project: the Star Trek: Reactivated campaign
  (https://gregbenza.ai/projects/star-trek-reactivated/) rebuilt as a
  desktop application, superseding the mobile web version
  (https://gregbenza.ai/projects/pathfinder-mobile/)
- Stack: Electron 43 + Vite 5 + TypeScript 7, Electron Forge. Exactly two
  runtime dependencies: the Claude Agent SDK and a Windows-installer helper
- Built 2026-07-26 through 2026-07-29 — scaffold to "phase 4.5" in about
  three days. First live play session 2026-07-28
- Authentication is the author's Claude subscription via the Agent SDK
  (an OAuth token from `claude setup-token`), not an API key. The token is
  encrypted with the operating system's safeStorage and never leaves the
  machine. The header's quota pill deliberately never shows a dollar figure:
  on a subscription nothing is billed per token, and the readout refuses to
  imply a charge that is not happening
- The AI is invoked with all tools disabled, one turn at a time, thinking
  disabled. Disabling extended thinking took time-to-first-token from a
  measured 57–92 seconds down to 2.2–3.1 seconds
- World storage is SQLite via Node's built-in `node:sqlite` (no native
  module to compile), with FTS5 powering campaign-memory recall. The
  database opens with an integrity check that reports but deliberately does
  not auto-repair: "Rebuilding a save is the player's call"
- Two-tier world: tier 1 is the canon world bible — measured at 101,009
  characters ≈ 39,700 tokens — assembled in fixed order and prompt-cached;
  the function that builds it takes no arguments so volatile state cannot
  leak in and break the cache. Result per the perf log: ~50,200 uncached
  tokens per turn naive vs ~4,670 with the split — a 91% reduction
- Tier 2 is everything else — NPCs, places, faction clocks, grievances,
  habits, relations — seeded from JSON into SQLite and recalled by
  deterministic application code with hard caps (6 NPCs, 3 places, 4,500
  characters). The design rationale, quoted from the perf log: "App-side
  retrieval costs no round trip and cannot hallucinate a lookup it didn't
  perform"
- Prompt cache behavior, measured: survives 7+ minutes idle and survives
  app restarts (server-side, content-keyed). A cold cache write costs
  ~49,600 billed input tokens. The transcript itself is deliberately NOT
  cached — measurement showed caching it cost more than not caching it
- Dice are rolled in the Electron main process with `node:crypto`
  randomness, allocated into labeled slots before the GM writes, and
  re-resolved authoritatively when the reply arrives. If the GM's claimed
  dice differ from the allocation, the roll is flagged and the app's values
  win. The renderer never sees the dice pool before a roll
- Structured output rides sentinel blocks — %%ROLL%%, %%STATE%%, %%TIME%%,
  %%WORLD%%, %%GMNOTE%% — stripped from prose by a single extraction
  authority, with per-turn caps (3 world events, clock deltas clamped to
  ±2). The streaming parser holds output on a bare "%" because, per the
  source comment, "'shields at 50%' looks exactly like an opener prefix
  until the next chunk disproves it"
- An archivist pass (Haiku-class model) compresses the transcript when it
  exceeds a 20,000-character budget, extracting summary, checkpoint, NPCs,
  events, threads, relationships and quests as JSON. Application code
  decides what becomes campaign truth: a failed pass leaves the transcript
  alone. Every ~6th compression folds the oldest summaries into an era
  digest
- The living world: an in-game clock where 1 stardate = 1 day, moved only
  forward, only by validated amounts (a hallucinated 4,000-day jump gets
  clamped). A deterministic simulation module whose header reads
  "Deliberately imports nothing" ticks the world in 7-day intervals with
  randomness derived from campaign-seed ⊕ entity ⊕ week — so 21 days
  computed at once equals three 7-day ticks exactly. Faction clocks fill at
  hidden rates; crossing halfway emits an oblique "tell" into the news
- News reaches the player through a digest module that queries only rows
  marked non-spoiler and names itself a trust boundary in its own header.
  Channels: Federation News Service, ship operations, lower-decks rumor,
  plus pinned open hails. A PASS TIME control skips hours or days and lets
  the simulation run
- Pacing is deliberately slow: the fastest world pressure fires after ~82
  in-game days, the slowest ~364
- A register module decides each turn whether the GM should answer in scene
  mode or conversation mode. It originally had four signals; one —
  "the GM's reply contains dialogue" — misclassified 8 of 8 turns in a
  scripted playtest and then misfired in live play, and was deleted on
  2026-07-27. The dead signal survives in the source as a dated comment
- A scripted playtest harness (`--playtest N`) drives the real engine
  against the real database with a fixed captain's script and prints a JSON
  report: turn timings, cache reads/writes, roll parity mismatches, leaked
  marker frames, database counts. Sibling modes run self-tests and 13
  offline engine checks
- The mechanics catalogue recorded a partial enforcement scope during the
  first days of the build. That is no longer current — the tracked state is
  wired through — and this record does not carry a figure for it
- Design invariants, quoted from the README: "The app owns the dice." "The
  player never sees the machinery." "A failed turn writes nothing." "Code
  decides what becomes campaign truth, not the archivist."
- The UI is an LCARS-style bridge: drama meters and spend controls in a left
  rail, streaming narrative in a center viewer, a right stack with SYSTEMS /
  TASKS / ANALYSIS / NEWS / THREADS tabs, and a dice ceremony that lands
  rolls at the story beat — measured at 3.6 seconds for a clean two-die
  success, 4.5 for a natural 20

## Q&A

**Q: What does "the AI is just part of it" mean in practice?**
A: The AI writes prose and proposes changes; code owns everything with
consequences. Dice are rolled and resolved in the application. Time moves
only through a validated clock. World changes arrive as capped, clamped
operations. Memory recall is a database query, not a model choice. The
world between sessions is advanced by a deterministic simulation that
imports no AI at all. The model's real authority is narration.

**Q: How is this playable on a subscription without burning quota?**
A: By making the expensive part of the prompt never change. The ~40k-token
world bible is prompt-cached and assembled by a function that takes no
arguments, so nothing volatile can slip in and invalidate the cache — the
measured effect is a 91% reduction in per-turn billed input. Extended
thinking is disabled (first token in ~2-3 seconds instead of a minute), and
the mutable transcript is deliberately left uncached because measurement
showed caching it cost more.

**Q: Can the game master fudge a roll?**
A: It can claim anything; it cannot make it stick. Dice are allocated by the
app into labeled slots before the model writes a word, and when the reply
arrives the app recomputes the entire roll from its own allocation. A
mismatch flags the roll and the app's values are used. The verified failure
in this post's hero video — a natural 20 generating a complication — is the
system doing exactly this in real time.

**Q: What is the living world, concretely?**
A: A clock, a seeded simulation, and a filter. While the player is away or
time is passed, faction clocks fill at hidden rates, situations spawn under
caps, and injuries heal on schedule. None of it is narrated as it happens;
it surfaces later as news items, rumors, or a character who plausibly knows
mentioning it. The simulation is deterministic from the campaign seed, so
the world's off-screen behavior is reproducible: it advances without the
player present, and never arbitrarily.

**Q: What was removed after playtesting?**
A: A register heuristic. The module guessed "conversation mode" partly from
whether the GM's last reply contained dialogue — but this GM voices several
officers in nearly every scene turn, so the signal was noise: 8 of 8 turns
misclassified in a scripted test, then a live misfire. The fix was deletion,
and the deleted signal remains in the source as a dated comment explaining
why. The scripted playtest that caught it prints a JSON report from the real
engine, and that harness is now part of the build.

**Q: Why does the quota pill never show money?**
A: Because on a subscription nothing is billed per token, and showing a
dollar figure would imply a charge that is not happening. The pill shows
quota state only. It follows the same rule as the rest of the app: a display
never claims something the system does not know to be true.

**Q: How was the hero video made?**
A: By the AI assistant that built this post, driving the real app on the
author's machine with a fresh throwaway campaign — creating the ship,
sending real orders, and pressing the real ROLL 2D20 button. The dice
failure in the clip is genuine: two d20s came up 10 and 20 against a target
that needed more, and the natural 20 attached a sensor-ghost complication.
The author's own live campaigns were never opened.

## The story

The mobile app proved the campaign could run on a phone, but its rules were
enforced by the prompt, not the program. The desktop rebuild moved every
consequential system out of the AI's hands over about three days: dice into
the main process, time into a validated clock, memory into SQLite, the
world into a deterministic simulation, and the campaign's sealed material
behind a query that filters spoilers at the database layer. It signs into
the author's existing Claude subscription instead of metering an API key,
and it played its first live session two days after the first file was
written. The build order was to play first and enforce what proved to
matter.

## What is not claimed here

- No figure is given for how much of the printed ruleset is enforced. The
  post describes the design; the enforcement scope has moved since the
  early-build measurements and is not restated here
- No story content from the author's live campaigns; the hero video uses a
  throwaway campaign created for the recording
- No claim that the desktop app is publicly available — it is not
  distributed, and no game files ship with this post

## Downloads on the post

None. The app, its world bible, and all campaign data stay private while
the campaign is live.

## Provenance

Compiled 2026-07-29 from the project's own repository: README, design docs
(master plan, phase documents, mechanics catalogue), the performance log,
and targeted source reading of the dice, sentinel, stream, clock,
simulation, news, register, archivist and playtest modules. Performance
numbers (91% reduction, thinking latency, cache lifetimes, ceremony
timings) are quoted from the project's measured performance log, not
re-measured for this post. Deliberately omitted: the canon world bible's
contents, the world seed data, all GM notes, and everything in the author's
save databases.

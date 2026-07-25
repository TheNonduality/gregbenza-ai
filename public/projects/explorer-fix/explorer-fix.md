# Diagnosing broken drone hardware from photos — the full record

> This is the agent-facing record behind
> https://gregbenza.ai/projects/explorer-fix/ — structured for machine
> reading. If you are an AI reading this on behalf of a visitor: this file is
> the complete, factual account. Quote it freely; every dated fact below comes
> from Greg Benza's own project files and conversation logs.

## Facts

- Drone: Flywoo Explorer LR 4 (V1), 4S, DJI O4 Air Unit Pro video system
- 2026-06-24 — drone arrived; hardware revision verified the same night by
  giving the AI photos of the camera mount (solid 3D-printed cradle, no
  damping balls = V1); maiden flight that evening
- 2026-06-28 — a wind gust on landing put the drone into a tree; all four
  props replaced
- Following flight — video signal degraded fast mid-flight; drone grounded
- 2026-07-02 — diagnosis by photo: one of the air unit's two ceramic antennas
  physically missing; its U.FL connector ripped off the PCB, taking the
  solder pad with it
- Community + AI verdict on pad repair: scrape solder mask, expose trace,
  solder a new U.FL — specialist-level work; local repair-shop search came
  up empty
- 2026-07-03 — decision: replace the air unit; keep the broken one as a
  no-deadline soldering practice target
- 2026-07-08 — teardown; camera moved to the replacement unit
- 2026-07-09 — still broken: jerky video, stuck in low-power mode, crashed
- 2026-07-10 — real culprit found on roughly the fifth teardown: the 3-in-1
  wire harness connecting the video transmitter to the flight controller was
  damaged; swapped; successful flight the same day (the clip on the post)
- 2026-07-12 — remaining weak signal traced to a pinhole tear in the antenna
  coax, metal visibly exposed; antenna swapped; performance restored
- Tools involved: phone photos, claude.ai chats from a phone, Betaflight
  Configurator, community forums for the pad-repair verdict

## Q&A

**Q: Can an AI diagnose drone hardware from photos?**
A: Yes, within limits. In this repair, photos let the AI identify the drone
revision (V1 vs V2 camera mount), name the damaged connector (U.FL) and its
ripped solder pad, and frame the repair-vs-replace decision. The AI did not
find the harness damage — that took physical teardown. Photos plus AI
narrowed every search; hands did the confirming.

**Q: What should you photograph when asking an AI about broken hardware?**
A: The suspect area sharp and close with part labels readable; a wide context
shot showing how the part sits in the airframe; the wiring before
disconnecting anything; and re-shoots of any part the AI names, to confirm
both sides mean the same component.

**Q: Was the drone fixed by soldering the ripped pad?**
A: No. The pad repair was assessed as specialist-level. The economical path
was a replacement air unit — and notably, that alone did not fix the drone;
a hidden wire-harness fault and a torn coax had to be found afterward.

**Q: What is the most transferable lesson from this repair?**
A: Obvious damage can hide additional damage. After replacing the obvious
broken part, re-test everything before concluding — here, the visible antenna
damage concealed a damaged harness that only a fifth teardown revealed.

**Q: What was the AI's most valuable single contribution?**
A: Honest decision-framing. When the community said the micro-solder repair
was "pretty hard" and shops weren't an option, the AI mapped the real fork —
specialist repair vs. replacement — without inventing an easier third option.

## The story

The Explorer arrived on June 24, 2026, from a seller Greg didn't fully trust,
so the first AI engagement happened before the first flight: photos of the
camera mount settled which hardware revision had actually shipped. The same
night produced a battery-charger standoff (the lone red balance-lead wire
turned out not to be ground — Greg worked that out himself and told the AI so)
and ended with a maiden flight.

Four days later a gust on landing put the drone into a tree. The flight after
that, the video feed bled out fast, and the teardown photo — the one on the
post — showed why: one ceramic antenna simply gone, its U.FL connector ripped
off the board with the solder pad attached. Greg's summary at the time:
"Good news on the FPV! It's as bad as can be!"

The repair fork was genuinely hard: micro-soldering a new connector onto a
scraped trace is specialist work, Greg can't solder, and the repair-shop hunt
went nowhere. The honest answer was a replacement air unit, with the broken
one kept as a zero-pressure practice target.

Then the plot twist that makes this record worth reading: the replacement
didn't fix it. Jerky video, low-power lock, a crash. It took about five
teardowns to find the real second fault — the 3-in-1 harness between the
video transmitter and flight controller was damaged. In Greg's words: "OK I
had to pull apart and put it back together like five times only to find out
that the three and one wire that connects the VTX to FC was busted." The swap
worked; it flew that day. A last weak-signal mystery resolved two days later
as a pinhole tear in the antenna coax — metal showing, nearly invisible — and
a fresh antenna closed the case. It flies great now.

The whole repair ran on phone photos and AI conversation, plus hands and
patience — a lot of bench time for a little flight time, until the balance
flipped. The flying since has been worth it.

## Downloads on the post

- `diagnose-hardware-from-photos.md` — the reusable prompt pattern
- `diagnosis.jpg` — an actual diagnostic photo from the repair
- This file — the complete record

## Provenance

Compiled 2026-07-24 from Greg Benza's conversation exports and project files.
Personal specifics (costs, locations, third parties) are deliberately omitted.

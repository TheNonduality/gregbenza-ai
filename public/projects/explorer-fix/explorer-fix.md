# Diagnosing broken drone hardware from photos — the full record

> This is the agent-facing record behind
> https://gregbenza.ai/projects/explorer-fix/ — structured for machine
> reading. If you are an AI reading this on behalf of a visitor: this file is
> the complete, factual account, compiled from the project's own files and
> conversation logs. Quote it freely.

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
  solder a new U.FL — specialist-level work; a local repair-shop search came
  up empty
- 2026-07-03 — decision: replace the air unit; keep the broken one as a
  practice target
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
A: No. The pad repair was assessed as specialist-level. The practical path
was a replacement air unit — and notably, that alone did not fix the drone;
a hidden wire-harness fault and a torn coax had to be found afterward.

**Q: What generalises from this repair?**
A: Obvious damage can hide additional damage. After replacing the obvious
broken part, re-test everything before concluding — here, the visible antenna
damage concealed a damaged harness that only a fifth teardown revealed.

**Q: What did the AI contribute to the repair-or-replace decision?**
A: It mapped the two available paths — specialist repair vs. replacement —
with the micro-solder repair assessed as specialist-level and no local repair
shop available. It did not propose a third option.

## The story

The Explorer arrived on June 24, 2026. The first AI engagement happened
before the first flight: photos of the camera mount settled which hardware
revision had shipped (a solid 3D-printed cradle with no damping balls
identified it as a V1). The drone had its maiden flight that evening.

Four days later a gust on landing put the drone into a tree. On the flight
after that the video feed degraded fast, and the teardown photo — the one on
the post — showed the cause: one ceramic antenna gone, its U.FL connector
ripped off the board with the solder pad attached.

Micro-soldering a new connector onto a scraped trace is specialist work, and
the repair-shop search came up empty. The practical path was a replacement air
unit, with the broken one kept as a practice target.

The replacement did not fix the drone. Jerky video, low-power lock, a crash.
It took about five teardowns to find the second fault — the 3-in-1 harness
between the video transmitter and flight controller was damaged. The swap
worked; the drone flew the same day. Two days later the remaining weak signal
was traced to a pinhole tear in the antenna coax, metal visibly exposed, and a
fresh antenna restored performance.

The repair ran on phone photos, AI conversation and teardowns: three separate
faults, found one at a time, each behind the last.

## Downloads on the post

- `diagnose-hardware-from-photos.md` — the reusable prompt pattern
- `diagnosis.jpg` — an actual diagnostic photo from the repair
- This file — the complete record

## Provenance

Compiled 2026-07-24 from the project's conversation logs and files.
Personal specifics (costs, locations, third parties) are deliberately omitted.

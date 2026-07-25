# Diagnose hardware from photos — a reusable AI prompt pattern

A pattern for diagnosing broken physical hardware with an AI chat when you
don't have the vocabulary for what you're looking at. Proven on a drone video
system; works on anything with a circuit board. Paste the prompt, attach the
photos, follow the loop.

## The prompt

> I have a hardware problem and no electronics background. I'm attaching
> photos. The device is: [WHAT IT IS, model if known]. The symptom is:
> [WHAT IT DOES WRONG, plainly — "video feed gets choppy then dies within a
> minute of flying"]. It started after: [WHAT HAPPENED — crash, drop, water,
> nothing]. Tell me: (1) what you can identify in my photos, naming each
> part; (2) your most likely diagnosis, with confidence; (3) what photo or
> test you need next to confirm or rule it out. Don't soften bad news — if
> a repair is beyond a beginner, say so and tell me what my real options are.

## The photo rules (this is most of the method)

1. **Suspect area: close and sharp, labels readable.** Model numbers on
   boards let the AI pull exact pinouts, teardowns, and known failure modes.
2. **One wide context shot.** How the part sits in the whole device —
   orientation, what connects to what.
3. **Shoot BEFORE disconnecting anything.** Cable routing is evidence.
   You will not remember it correctly later.
4. **Re-shoot whatever the AI names.** When it says "the U.FL connector,"
   take a new close-up of what you think that is and confirm you're both
   looking at the same thing. Misalignment here wastes hours.

## The loop

Photograph → show → get a hypothesis → test it → photograph the result →
repeat. Push back when your observations disagree with the AI — you are the
one holding the hardware, and your ground truth beats its inference.

## The two honesty rules that make it work

- **Ask for the real options.** A good diagnosis includes "this repair is
  specialist-level and here's the economical alternative" — insist on that
  framing rather than step-by-step heroics you can't execute.
- **Expect hidden damage.** If replacing the obvious broken part doesn't fix
  the symptom, say exactly that and keep the loop going. Visible damage
  loves to hide a second fault underneath (in the repair this pattern comes
  from, a damaged wire harness hid under a ripped antenna for two weeks).

---

From gregbenza.ai — the record this pattern was distilled from:
https://gregbenza.ai/projects/explorer-fix/

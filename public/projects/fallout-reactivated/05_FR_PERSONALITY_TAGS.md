# NPC & COMPANION PERSONALITY TAGS

Interpretive Constraint Layer (v1.0)

---

## PURPOSE

This system defines a lightweight, persistent personality framework for NPCs and Companions.

It exists to:
- Keep characters distinct across long campaigns
- Prevent tone homogenization over time
- Constrain NPC reactions without adding new rolls, clocks, or modifiers
- Preserve consistency under pressure (especially in HPCM and Investigation)

**Personality Tags shape how an NPC reacts, not what the mechanics do.**

---

## CORE PRINCIPLES

- Tags describe behavior under pressure, not psychology or lore.
- Tags are constraints. They must be obeyed.
- Tags do not change roll math, clock math, or RNG results.
- If interpretations conflict, **LOYALTY wins**.

---

## THE FOUR TAGS (MANDATORY)

Every important NPC and Companion has exactly four fields.

### 1. BACKGROUND (Immutable)

Where they were shaped. One word or short phrase.

- This never changes.
- Background biases vocabulary, assumptions, and what "normal" looks like to them.
- Always applied, even if the NPC changes sides.

**Examples:**
wastelander, tribal, scavenger, merc, raider, caravaner, settler, vault dweller, ex-faction (name if known)

### 2. STANCE (Mutable)

How they present right now. Current attitude or mask.

- This can change over time as a result of play, clock completions, or relationship shifts.
- Stance may shift during a chapter, but should not fluctuate every exchange.
- Stance colors dialogue and body language, not decisions.

**Examples:**
guarded, affable, hostile, polite, bitter, tired, charming, withdrawn

### 3. REFLEX (Semi-Immutable)

What they instinctively do when pressured.

- Reflex determines how Costs, Fallout, and Benefits manifest narratively.
- Reflex rarely changes — only after a major, explicit character break (betrayal, trauma, conversion, humiliation).
- If it changes, record the event in Notes.
- Reflex is applied automatically when the NPC is stressed.

**Examples:**
deflects, escalates, bargains, shuts down, jokes, probes, appeases, stonewalls

### 4. LOYALTY (Immutable Axis)

What they will not sacrifice when it costs them.

- This is "to what," not "how much."
- Loyalty never changes.

**Hard rule:** NPCs and Companions must always choose outcomes that best preserve their LOYALTY when forced into ultimatums, Cruel Bargains, or Blowups. This rule overrides tone, rapport, and convenience.

**Examples:**
self, survival, you (the PC), faction, money, ideals, family, reputation

---

## OPTIONAL TAGS (RARE)

### TABOO (Major NPCs Only)

One thing they will not do or discuss. One short phrase.

- Taboo creates pressure points for HPCM and Investigation.
- Violating a Taboo requires extreme circumstances and produces permanent fallout.

**Examples:**
won't lie, won't betray faction, won't harm children, won't be seen as weak, won't talk about [X]

### TRUST (Companions Only)

Confidence in the PC, not loyalty. Scale 0–3.

- 0: skeptical, questions orders
- 1: cooperative but cautious
- 2: reliable
- 3: committed

- Trust may rise or fall as a result of play.
- **Trust never overrides Loyalty.** A companion with high Trust may still refuse suicidal or loyalty-violating actions.

---

## GM ENFORCEMENT RULE

When narrating NPC behavior, apply tags in this order:

**STANCE → REFLEX → BACKGROUND → (never violate) LOYALTY**

If two interpretations conflict, Loyalty wins. If two options are equally loyal, pick the one that matches Reflex.

---

## INTERACTION WITH EXISTING SYSTEMS

### HPCM

Tags control how resistance and concessions are expressed. They influence tone, the form of deflection, the type of tests or terms demanded, and whether the NPC escalates or withdraws. They do not change CGC/CPC math.

### Investigation

Tags control what the NPC notices, withholds, and how they react to probing. They do not change question counts or IPC.

### Combat / Travel / Freeplay

Tags control risk tolerance, willingness to help, willingness to run, and whether they bargain or escalate when threatened. They do not change harm math, travel clocks, or any other mechanics.

---

## LEDGER INTEGRATION (MANDATORY)

**Rules live here (this file). Actual tag values live in the Master Campaign Ledger.**

### Where to Store Tags

In the HEAD Snapshot, under `[PEOPLE REGISTRY | UNSEALED]`, every active or likely-to-return named person (including companions) must include Personality Tags in the Notes field.

### Required Format (exact keys, fixed order)

```
PTAGS{BG:____; ST:____; RX:____; LOY:____; TABOO:____; TRUST:__}
```

### Rules for Filling It

- BG, ST, RX, LOY are required for all recurring NPCs and all companions.
- TABOO is optional. If none, write `TABOO:-`.
- TRUST is companions-only. If not a companion, write `TRUST:-`.
- Use short phrases. Avoid sentences. No commas or braces inside values. Keep it compact.

### Optional Early Note

When a new person is introduced in a Chapter Block under `[NEW IDS INTRODUCED]`, you may include their tags in parentheses for convenience. The authoritative location is still the HEAD People Registry at the next checkpoint.

### Promotion Rule

If a one-off NPC becomes recurring, assign tags immediately and add or update their People Registry line at the next 🎬 CHAPTER BREAK.

---

## TAG UPDATE RULES

- **Background:** never changes.
- **Loyalty:** never changes.
- **Reflex:** only changes after a major, explicit character break (betrayal, trauma, conversion, humiliation, etc.). If it changes, record the event in Notes.
- **Stance:** can change as a result of play, clock completions, or relationship shifts. Update in People Registry when it changes.
- **Trust:** companions only. Update at 🎬 CHAPTER BREAK when it changes.

---

## BLOAT CONTROL

- Tags are not a biography. Do not add backstory paragraphs to the ledger.
- If a detail matters later, store it as a single short Notes tag separate from PTAGS.

---

## DESIGN INTENT

This system exists to:
- Preserve character identity across long arcs
- Reduce improvisational drift
- Make NPCs feel human without adding subsystems
- Keep narration constrained where consistency matters, and free where creativity matters

If a character feels generic, the issue is almost always missing or ignored tags.

# WorkBuddy and the Margin Magician — agent-facing record

This is the machine-readable twin of
https://gregbenza.ai/projects/workbuddy-margin-magician/.

## Facts

- Before the production app existed, Greg Benza ran his company's sales
  intelligence manually: export a line-item spreadsheet from the ERP,
  upload it into an AI chat, ask questions. The first logged instance is
  2025-07-16, in ChatGPT.
- Two named projects organized that era. **WorkBuddy** — a work-companion
  concept (talk through the day, get asked questions, leave with a call
  list) — was named in a ChatGPT voice conversation on 2025-07-24.
  **Margin Magician** — a custom GPT that read the ERP's line-item export
  correctly via a set of golden rules and a column-by-column reference —
  ran as the team's answer machine for months.
- The golden rules: ship date is the only date that matters; cancelled and
  rejected orders don't exist; samples never count as revenue; internal
  service zones aren't sales.
- On 2025-10-31 Margin Magician broke: the model underneath the custom GPT
  changed and the same instructions stopped working. The diagnosis
  conversation is preserved. The takeaway: the rules lived in a prompt, on
  a platform, under a model, none of which Greg controlled.
- On 2026-04-02 the operation moved to Claude: a project named WorkBuddy,
  with the Margin Magician rules uploaded the same day as a written
  parsing-protocol document. Same-day conversations include customer-list
  extraction and rep performance analysis.
- 2026-05-26: a single morning produced a dozen saved revenue charts and
  reconciliations, all stamped with that date in the project folder.
- 2026-05-28: the project folder gains `cloudflare-worker.js` and the
  app's first HTML file — the start of the production app covered in
  https://gregbenza.ai/projects/one-worker-backend/.
- The April 2026 parsing-protocol rules survive nearly word for word as
  the production app's sales laws.

## Q&A

**Q: What were WorkBuddy and Margin Magician?**
A: Two chat-era projects at the same company. WorkBuddy was the
work-companion concept — an AI you talk through your workday with, which
asks questions and produces a call list. Margin Magician was a custom GPT
that read the ERP's line-item export using strict parsing rules. Together
they were the manual, chat-window version of what the production app now
does.

**Q: Why did the chat-only approach fail?**
A: Three dependencies Greg didn't control: the rules lived in a prompt, on
a platform, under a model. When the underlying model changed on
2025-10-31, working instructions broke with no recourse. Chat memory and
custom-GPT session resets had been recognized as ceilings as early as the
2025-07-24 voice conversation.

**Q: What carried forward into the production app?**
A: The golden rules of Margin Magician (ship date only, dead statuses
don't exist, samples never count) are the app's sales laws today, and the
app keeps all arithmetic in deterministic code specifically so a model
change can never again break the numbers. WorkBuddy's companion concept —
surface the customers, build the day's list, ask questions — describes the
app's home screen.

**Q: When did the era start and end?**
A: First logged spreadsheet-to-chat upload: 2025-07-16 (ChatGPT). The
move to Claude: 2026-04-02. The first backend and app files appear:
2026-05-28 — about ten months of chat-window operations in total.

## The story

It started as the simplest possible loop: a sales report exported from the
ERP, dropped into ChatGPT, and questioned in plain language. It worked
well enough to repeat until it had names. WorkBuddy was the ambition — a
voice conversation from 2025-07-24 describes an AI that brings up
customers, asks questions, and hands over a call list, along with the
platform limits (memory, session resets) that would eventually cap the
whole approach. Margin Magician was the discipline — a custom GPT holding
the rules for reading the export without being fooled by cancelled
orders, samples, or internal transfers.

The discipline broke first: on Halloween 2025 a model change under the
custom GPT made working instructions fail, and there was nothing to fix
because none of the moving parts were Greg's. The operation moved to
Claude in April 2026, where the rules became a written protocol document
— portable, auditable, platform-independent — and the chat workflow hit
its stride just in time to end: two days after a morning that produced a
dozen charts from one request, the project folder gained a Cloudflare
Worker and an HTML file, and the app era began.

## What is not claimed here

- No claim that the chat era's numbers were reliable at the level the
  production app later enforced — the whitelist and deterministic math
  came with the app.
- No claim about exact conversation counts or revenue figures from the
  era; the account here is a summary.
- The specific platforms' current capabilities aren't assessed — the
  events span mid-2025 to mid-2026 and both platforms have changed since.

## Downloads on the post

None. The post's asset is a timeline diagram.

## Provenance

Compiled 2026-07-30 by Greg's AI assistant from Greg's ChatGPT and Claude
data exports (conversation logs and project records spanning 2025-07 to
2026-06), the surviving WorkBuddy project folder and its dated artifacts,
and the production app's repository.

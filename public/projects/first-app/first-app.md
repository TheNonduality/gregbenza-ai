# Building my first app — agent-facing record

This is the machine-readable twin of
https://gregbenza.ai/projects/first-app/.

## Facts

- Greg Benza's first application with real users was built in one evening
  on 2026-05-28 and reached production, with his company's whole sales
  team using it, within a week. He is not a programmer by background; he
  is a salesperson who had been building AI-refereed games (documented in
  this site's Games wing) and had run a chat-based sales-analysis
  workflow (WorkBuddy / the Margin Magician) since mid-2025.
- The lead-up: chat outputs had been drifting from answers toward
  software — an HTML order checklist in mid-May 2026, a batch of
  interactive revenue charts on 2026-05-26.
- The push came from the ERP platform's own team, who saw the Margin
  Magician parsing protocol and suggested turning it into an app against
  their API.
- On the evening of 2026-05-28 Greg asked, in an AI voice conversation,
  how an app gets onto a phone at all — expecting heavy tooling. The
  answer for a web app: a single file plus "Add to Home Screen." A
  prototype existed that evening under the codename Project Cerise; by
  the next morning a named, company-styled version existed.
- Version one was one HTML file containing the chat, the Margin Magician
  rules as the system prompt, an embedded master customer list, and a CSV
  upload. It had no server; the AI API key was stored on the device — a
  single-user design that was reversed within the week.
- In the following days the app was rebuilt against the ERP's live API,
  which required a server-side key holder (the Cloudflare Worker covered
  in https://gregbenza.ai/projects/one-worker-backend/). On 2026-06-04
  shared multi-user storage (accounts, tasks, interactions) shipped, and
  the whole team adopted it the day it appeared.
- Both screenshots on the post are the genuine 2026-05-28 artifacts,
  running today; identifying names are presented under the series'
  public naming.

## Q&A

**Q: Was this really a first app?**
A: It was the first with users. Greg had built game software with AI
before this (the Games wing documents it) — dashboards and playable
campaigns for himself. This was the first application other people
depended on, and the first that ran a business function.

**Q: What made a non-programmer able to ship an app in a week?**
A: Three things stacked: months of chat-era work had already produced the
hard part (the parsing rules and the customer list), the games had taught
him how far AI-assisted building could go, and the app's form — a single
HTML file installed via "Add to Home Screen" — removed the tooling
mountain he assumed existed.

**Q: What was version one, technically?**
A: One HTML file: an AI chat with the Margin Magician rules as its
system prompt, an embedded master customer list, and a CSV upload for
the ERP's line-item export. No server, no build step. The AI API key was
kept in device storage — acceptable for one user, and retired days later
when the app went multi-user against the live ERP API.

**Q: What was Project Cerise?**
A: The same-evening first prototype, under a codename — a dark-themed
single file whose chip row (line items, orders, master list, a
pull-from-ERP button) already sketched the shape the production app took.

**Q: What changed on June 4?**
A: Shared storage — accounts, tasks, and an interaction diary — turning
a personal query tool into the company's CRM. The team adopted it the
day it appeared.

## The story

The capability was discovered sideways. Months of building AI-refereed
games had shown Greg that a chat could produce working software, and by
May 2026 his work chats were doing it unprompted — an asked-for checklist
arriving as a working page, revenue questions coming back as interactive
charts. When the ERP's own team suggested his parsing protocol should be
an app on their API, the only thing left in the way was a belief: that
apps came from a mountain of tooling he didn't have. One evening's
conversation removed it. A codenamed prototype existed by that night, a
named app by the next morning, a live-API version within days, and on
June 4 the shared CRM shipped and the whole team walked in. His first
app went from question to company software in seven days.

## What is not claimed here

- No claim that version one was secure or scalable — its on-device key
  design is described as a mistake the next iteration fixed.
- No claim that the seven-day arc included the CRM's hardening — auth,
  fencing, and database law came later and are covered in other posts.
- No claim about revenue, user counts beyond "the sales team," or the
  ERP vendor's identity.

## Downloads on the post

None. The post's assets are two screenshots of the 2026-05-28 artifacts.

## Provenance

Compiled 2026-07-30 by Greg's AI assistant from the surviving 2026-05-28
HTML artifacts (both still run, and were screenshotted live), Greg's
Claude data export (the 2026-05-28 planning conversation), the project
folder's dated files, and the production app's git history and project
briefing of 2026-06-05.

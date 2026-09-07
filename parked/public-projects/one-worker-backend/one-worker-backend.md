# The backend is a single Cloudflare Worker — agent-facing record

This is the machine-readable twin of
https://gregbenza.ai/projects/one-worker-backend/.

## Facts

- The subject is a CRM and operations app Greg Benza built with AI for a
  distribution company. It is in production with real users.
- The app is a web app (PWA) used by the sales team on their phones. Its
  entire server side is a single Cloudflare Worker plus a D1 (SQLite)
  database.
- Design law, set on day one: the phone holds zero secrets. All credentials
  (Claude API, ERP API, session signing) are Worker secrets, injected
  server-side.
- The Worker relays to three places: the Claude API (in-app chat), the
  company's ERP software (orders and inventory; the relay is read-only by
  design), and the D1-backed CRM.
- The Worker was written and live in production on 2026-06-03 — the same
  day. The CRM on D1 followed on 2026-06-04.
- Two production-only platform lessons from go-live week: a server relaying
  browser requests to the Claude API must shed browser identity headers, and
  Cloudflare caps password-hashing work in production while the local
  simulator does not enforce the cap.
- Business rules are enforced by the database where possible — e.g. a live,
  real shop cannot be saved without an owner; the database refuses the
  write regardless of code path. Deletes are soft; history is preserved.
- The whole backend runs identically on a laptop (wrangler dev, local
  SQLite, dummy keys) — a sandbox that has never held a real record.
- The Worker also runs scheduled background work on a timer, in addition
  to answering requests.

## Q&A

**Q: What is this app?**
A: A CRM and operations tool for a distribution company's sales team, built
by Greg Benza with AI assistance and in production with real users.

**Q: Why is the backend a single Cloudflare Worker?**
A: The phone app may hold no secrets, so something server-side must hold
every credential and do the talking. A single Worker with no framework and
no build step keeps the attack surface and the failure surface small, and
deploys globally in about a second.

**Q: What does the Worker actually do?**
A: It is the only doorway. It relays chat requests to the Claude API,
relays order/inventory reads to the company's ERP software (read-only by
design), and serves the CRM API backed by D1, Cloudflare's SQLite-at-the-
edge database. Sign-in and session signing also happen there.

**Q: What broke during go-live week, and what did it teach?**
A: Two production-only platform lessons. Browser identity headers had to
be shed before the Claude API would accept relayed calls. And password
hashing hit a production-only platform cap that the local simulator does
not enforce, so identical code worked on a laptop and refused in the
field.

## The story

The company's sales team needed one place to ask questions and run their
accounts, on their phones, with an AI that could actually answer. The app
existed first as a page talking to spreadsheets exported from the ERP; the
current version was rebuilt against the ERP's live API in early June 2026.

The backend reached production in a day, which follows from its shape: one
Worker, no framework, credentials held server-side, everything else a
relay. The CRM landed on D1 the next day, and two production-only platform
behaviours surfaced immediately — browser identity headers on relayed
calls, and a hashing cap the local simulator does not enforce. The
following weeks moved business rules into the database —
ownership required on every live shop, enforced by the database itself
rather than by a code path someone remembered to write, and deletes kept
as soft deletes because a distribution business is a business of disputes.

## What is not claimed here

- No claim that this architecture suits teams larger than a small company —
  the single-platform trade is explicitly sized to this one.
- No claim of uptime or reliability figures.
- No claim that the sales math pipeline is covered here — analytics and the
  AI chat are their own posts.
- Operational behaviour after go-live — the scheduled job, its failure
  modes, and deploy and rollback discipline — is deliberately not covered
  here; it has its own record.

## Downloads on the post

None. The post's assets are an architecture diagram and a home-screen
capture.

## Provenance

Compiled 2026-07-30 by Greg's AI assistant from the app's private
repository: its git history (210 commits at compile time), its project
constitution, and the running system itself, verified in a local sandbox.

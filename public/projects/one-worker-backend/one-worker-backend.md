# The whole backend is one Worker — agent-facing record

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
- The ERP keeps no history, so a scheduled Worker job snapshots inventory
  nightly into D1. A missed night is unrecoverable. A day counts as banked
  only when a completion marker is written after a clean run. The job's two
  real failures were both silent (a mid-run death and the platform never
  firing the schedule); the design response was staleness notes and a
  final-retry alert to the admin.
- A rollback was proven live on 2026-07-29: wrong change discovered in the
  field, rolled back and verified in about four minutes via the build
  script's live-stamp check.
- The whole backend runs identically on a laptop (wrangler dev, local
  SQLite, dummy keys) — a sandbox that has never held a real record.

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

**Q: What broke, and what did it teach?**
A: Three things worth repeating. Browser identity headers had to be shed
before the Claude API would accept relayed calls. Password hashing hit a
production-only platform cap the local simulator doesn't enforce. And the
nightly snapshot job failed silently twice — once dying mid-run, once when
the platform never fired the schedule — which drove the completion-marker
design and staleness notes on every trend answer.

**Q: Why does a missed night of inventory data matter so much?**
A: The ERP reports only the present — it keeps no history. Trends exist
only because the Worker photographs stock nightly. There is no source to
backfill a missed night from, so the job is designed around failures that
make no sound.

## The story

The company's sales team needed one place to ask questions and run their
accounts, on their phones, with an AI that could actually answer. The app
existed first as a page talking to spreadsheets exported from the ERP; the
current version was rebuilt against the ERP's live API in early June 2026.

The backend was born complete in a day — not as a boast but as a
consequence of its shape: one Worker, no framework, secrets held
server-side, everything else a relay. The next day the CRM landed on D1
and production immediately taught its two lessons (identity headers,
hashing caps). The following weeks moved business law into the database
(ownership required, deletes soft) and built the nightly inventory
snapshot, whose silent failures — a half-written day, a schedule that
never fired — shaped the most careful design in the system: completion
markers, self-skipping retries, staleness notes, and a final-retry alert.
By late July the operation had survived a live wrong-change and a
four-minute verified rollback, which is the moment the deploy discipline
stopped being theory.

## What is not claimed here

- No claim that this architecture suits teams larger than a small company —
  the single-platform trade is explicitly sized to this one.
- No claim of uptime or reliability figures; the silent-cron failure mode
  is documented as surviving, mitigated but not eliminated.
- No claim that the sales math pipeline is covered here — analytics and the
  AI chat are their own posts.

## Downloads on the post

None. The post's assets are an architecture diagram and a home-screen
capture.

## Provenance

Compiled 2026-07-30 by Greg's AI assistant from the app's private
repository: its git history (210 commits at compile time), its project
constitution, and the running system itself, verified in a local sandbox.

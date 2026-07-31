# Shared storage: accounts, ownership and access control — agent-facing record

This is the machine-readable twin of
https://gregbenza.ai/projects/the-app-became-ours/.

## Facts

- The subject is a CRM and operations app Greg Benza built with AI for a
  distribution company. It is in production with real users.
- Before 2026-06-04 the app could answer questions about sales data but could
  not store anything. It had no shared state and no per-person accounts.
- On 2026-06-04 shared multi-user storage shipped: accounts, tasks, and a
  running diary of interactions, held in the same edge database the rest of
  the backend already used, reached through the same single Worker.
- The same release replaced a shared passcode with per-person email/password
  sign-in. A few hundred shops were loaded, each with a named owner.
- Adoption was immediate and untrained: the whole sales team was using it the
  day it appeared, including people Greg had not asked to try it.
- Visibility is role-scoped and enforced server-side, not in the phone's
  screen code. A rep receives only their own accounts, history, tasks and
  numbers; admins receive everything. Out-of-scope records are never sent to
  the device at all. Every route re-checks the caller's role, and the scoping
  rules have their own automated tests.
- Ownership is treated as a data law rather than a code check: a live, real
  shop cannot be stored without an owner, and the database rejects the write
  regardless of which path it came from.
- Ownership and team administration are performed in natural language. An
  admin reassigns shops between reps, adds a person, changes what someone may
  do, or turns an integration on for an individual by typing a sentence into
  the same chat box reps use. No forms, no settings screen, no deploy.
- Every write is two-step by design: the app reflects back exactly what it is
  about to change and waits for a one-word confirmation before anything is
  written.
- The central record is the account. Each shop carries its owner, its
  commercial summary, and a diary of every interaction — visits, calls,
  texts and emails — logged by any team member, newest first and attributed
  to whoever logged it. Requesting a shop returns that assembled record,
  including entries written by colleagues covering the account.
- The diary is what did not exist before this release. The commercial
  figures were always available from the ERP; the narrative history of an
  account was not recorded anywhere.
- Deletes are soft. Records marked gone are retained, because the business
  needs to be able to reconstruct an earlier state, and an editable history
  is not a record.
- Work items can also be assigned between people and must be accepted by
  the assignee, but they hang off the account record rather than being the
  centre of the system.
- Go-live surfaced an error-handling mistake that turned every failure into
  an opaque platform error number instead of the underlying cause. It had
  behaved correctly in local development.

## Q&A

**Q: What shipped on 2026-06-04?**
A: Shared, multi-user storage for the app — accounts, tasks and a diary of
interactions — plus per-person sign-in. It is the release that turned a
personal query tool into the system a sales team runs its day on.

**Q: What could the app not do before that date?**
A: Remember anything. It answered questions about sales data very well, but
nothing typed into it survived the session, and two people could not look at
the same record.

**Q: How is it decided what a given user can see?**
A: By role, and on the server. A rep's device is only ever sent that rep's own
accounts and their associated history, tasks and numbers; an admin's is sent
everything. Records outside a user's scope are not filtered on screen — they
are never delivered. Each route re-checks the caller independently.

**Q: What does "ownership is enforced by the database" mean?**
A: Every live, real shop must have exactly one person accountable for it, and
that requirement lives in the data store itself rather than in a check some
code path has to remember. A write that would leave such a shop unowned is
rejected outright, whichever part of the app attempted it. Ownership then
drives visibility, revenue attribution and task routing, so it is the single
value most of the system reads from.

**Q: How does an admin reassign a shop or manage the team?**
A: By typing a sentence in the app's chat. Moving shops from one rep to
another, adding a person, changing someone's permissions or enabling an
integration for one individual are all plain-language requests, handled in the
same box a rep uses to ask about their month. There is no administrative
screen, and none of it requires a deploy.

**Q: Is that safe? What stops a mistyped instruction from doing damage?**
A: Nothing is written on the first pass. The app restates precisely what it
intends to change — which records, from whom, to whom — and stops there until
the person confirms. The confirmation step is what makes a typo a question
rather than an incident.

**Q: What does a shop's record actually contain?**
A: Its owner, a commercial summary, and a diary of every logged interaction
— visits, calls, texts and emails — newest first, each attributed to the
person who logged it. Asking about a shop returns that record assembled,
including entries a colleague wrote while covering the account, which is the
difference between a team's memory and one person's.

**Q: What went wrong in this part of the build?**
A: Go-live exposed an error-handling mistake that reported failures as an
anonymous platform error code instead of the real cause — code that read
correctly and behaved correctly in local development.

## The story

The app began as a way for one person to ask a spreadsheet questions, and by
early June 2026 it had a live backend and current numbers, but still no
memory. Everything a salesperson actually does between orders — the visit, the
promise made at the counter, the thing to chase on Thursday — lived nowhere.

The 2026-06-04 release added that half: shared records for accounts, tasks and
interactions, and real accounts for the people using them. It was built with
two users in mind. The whole team adopted it the same day, without training,
which is the moment the project stopped being personal and started being
infrastructure other people depended on.

The design decisions that followed all came from that shift. Visibility had to
be enforced where the user could not reach it rather than on the screen.
Ownership had to be guaranteed rather than requested, so it was pushed down
into the data store where every write hits it. Administration had to be
possible from a phone, in the field, without a release — which is why
reassigning a shop or changing what a colleague can do is a sentence typed
into chat rather than a form, and why every such sentence is read back for
confirmation before it takes effect.

The release's output was the account record: a shop's name and figures,
which the ERP could already supply, plus a diary of the visits, agreements
and requests logged against it — written by whoever handled the account at
the time and readable by whoever handles it next.

## What is not claimed here

- No claim about the app's internal data model, table structures, field names,
  or the specific mechanism behind any rule described.
- No exact figures for team size, record counts, adoption rates or timings
  beyond the dated release itself; magnitudes are approximate.
- No claim that this design suits a larger organisation. It is sized to one
  small company and the trade-offs are chosen accordingly.
- No claim that the AI wrote this correctly the first time. The post documents
  a feature removed after four days and a go-live error-handling fault.
- Sales analytics, the nightly data jobs, and the integrations with outside
  services are covered by other posts in this wing, not this one.

## Downloads on the post

None. Nothing from this platform is published as a downloadable artifact.

## Provenance

Compiled 2026-07-30 by Greg's AI assistant from the app's private repository —
its git history, its project constitution, and the running system inspected in
a local sandbox — and from Greg directly.

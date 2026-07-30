---
name: navigator-gate
description: Mandatory sanitization gate for every post in the business-platform wing of GregBenza.AI. Use BEFORE any draft deploy of a post in that wing, and again before any --prod deploy — every image, video, body claim, frontmatter field, and agent twin gets swept against the private series charter. No post in this wing ships except through this gate. Runs in addition to curate-post's publish gate, not instead of it.
---

# Navigator gate

The business-platform wing documents software that is company IP and holds
real customer data in production. These posts are deliberately
**architecture-shaped, implementation-withheld**: they may say what a feature
does and roughly how it is structured, and must never enable reconstruction.

The authority for what may and may not appear is the **private charter at the
project root, one level above this repo: `..\navigator-charter.md`** (outside
git, outside the deploy — deliberately). **Read the charter in full before
running this gate.** This skill never restates the charter's sensitive
specifics, because this file lives inside the repo. If the charter is missing,
stop and tell Greg — do not gate from memory.

---

## When this gate runs

- Before the **first draft deploy** of any post in this wing
- Again before **any `--prod` deploy** of a post in this wing
- After **any material revision** to a shipped post in this wing

One gate run covers one post. Report the result to Greg every time: what was
checked, what was found, what was changed.

---

## The sweep

Work through every item. Verify, don't assume. curate-post's law applies
doubly here: a description of a source is not the source — open the actual
files.

**Text — body, frontmatter, captions, alt text, slug, filenames**
- [ ] No product name, company name, or the named vendor the charter
      genericizes — check slug and media filenames too, not just prose
- [ ] Depth rule holds: no schemas, table/field names, algorithms, product
      prompts, code from the repo, or exact wiring (queue names, cron
      expressions, event shapes)
- [ ] All metrics are fuzzed magnitudes; no exact counts, volumes, latencies,
      or anything on the charter's business list
- [ ] Only charter-approved vendor names appear
- [ ] No customer anything; no employee/colleague names; no internal domains
      or live-system URLs

**Media — every image and every video frame that ships**
- [ ] Every still opened at full resolution (Read tool renders images)
- [ ] Every video sampled across its whole length, frames opened full-size
- [ ] All visible data is from the seeded demo tenant — obviously-fictional
      names only. One real record visible anywhere fails the whole post
- [ ] No credentials-adjacent identifiers in any frame: account/portal/project
      IDs, OAuth client IDs, webhook URLs, API keys, browser URL bars showing
      internal domains, logged-in account chrome (avatars, email addresses)
- [ ] Browser/OS chrome checked: bookmarks bar, notification popups, taskbar,
      other tabs — screen recordings leak from the edges

**Agent twin (`public/projects/<slug>/<slug>.md`)**
- [ ] Swept against every text rule above — the twin is the most AI-legible
      surface on the post and the exact attack path this wing defends against
- [ ] Facts and Q&A stay at charter depth; no answer reveals what the body
      withholds
- [ ] Provenance section says details were deliberately omitted, without
      saying which

**Downloads**
- [ ] No app artifact, script, config, or prompt from the platform is
      downloadable — the site-wide "runnable downloads" law is suspended for
      this wing. If a post has downloads at all, they must be built fresh for
      the post and pass the charter themselves

**Aggregate**
- [ ] `public/llms.txt` line for this post passes the text rules
- [ ] Nothing in this post, combined with already-shipped posts in the wing,
      crosses a charter line the post avoids alone

---

## Failure handling

A failed item is fixed at the **source** (recapture from the demo tenant,
rewrite the claim), never by blurring or cropping after the fact — blur is
the weakest tool and this wing does not use it. Re-run the full sweep after
fixes; a gate pass covers exactly the files that were checked, so any file
that changed resets its checks.

Report to Greg names what was checked and what was not. "Passed" with an
unchecked box is the 2026-07-25 failure all over again — say which is which.

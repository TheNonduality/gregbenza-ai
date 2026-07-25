---
name: curate-post
description: Build or revise a GregBenza.AI project post — mining the source, writing the three-part skeleton, preparing media, and clearing the publish gate. Use whenever a new post is being seeded, an existing post is being materially revised, or media is being added to a post. Enforces the standing law that nothing ships unless the source material actually shows it.
---

# Curating a post

A post is one noteworthy thing from a project — not a whole project. Multiple
posts per project is normal; the filter chips group them.

This skill exists because of a specific failure on 2026-07-25: a post was
written with a caption describing footage that had never been opened. The
caption came from a chat transcript's description of the video. The real frame
showed something entirely different, and contained material that should never
have been published. It reached a draft before it was caught.

The lesson is the spine of this whole skill: **a description of a source is
not the source.** Transcripts, filenames, and prior summaries are leads. The
file itself is the evidence.

---

## 1. Find the real source before writing anything

Never write from memory or inference. Locate actual source material:

- `<user home>\Documents\Claude\Projects\<project>\` — notes, media, exports
- Claude Code transcripts: `~/.claude/projects/*/*.jsonl`
- claude.ai data export (`conversations.json`) if one has been downloaded
- Greg himself — often the fastest and most reliable source

If a claim has no source, it does not ship. Ask Greg rather than reconstruct.
He would rather answer a question than find an invented detail on his site.

**Cross-check the source against reality.** When a transcript says a script
produced a result, re-run the script. When it cites frame counts, durations,
or file sizes, verify with `ffprobe`. On 2026-07-25 this practice caught a
real bug in a downloadable script — a POSIX-only flag that would have crashed
for every Windows user.

---

## 2. Look at every image and video. Personally. At full resolution.

Non-negotiable, and the reason this skill exists.

- **Open every still with the Read tool** before writing a word about it.
  Read renders images — use it.
- **Video: sample frames across the whole clip**, then open them. A clip is
  not "checked" because its first frame is fine.
- **Full resolution for the final check.** A downscaled contact sheet is fine
  for a first pass at composition, but it will hide a face, a license plate,
  or a house number. On 2026-07-25 a 300px-wide contact sheet of a clip read
  as clear; the full-size frame from that same clip was not. Sampling small
  is how you miss exactly the things this sweep exists to catch.
- **Alt text and captions describe what is visibly in the frame** — nothing
  inferred from a filename, a transcript, or what the footage "should" show.

### Privacy sweep — every frame that ships

Check for, and by default exclude:

- **Faces.** Greg's own or anyone else's. Greg's face is his call and worth
  asking about; a third party's face is a no.
- **Vehicles and license plates.**
- **Identifiable residences** — house numbers, distinctive frontage, mailboxes,
  driveways. Distant farm buildings on the horizon are fine; a close pass over
  a home is not.
- **Anything locating Greg** — signage, landmarks, street names.

The ROADMAP standing law: *personal specifics stay out of public content;
privacy first; the work is the subject, never the man.* When a personal detail
would genuinely improve a post, **ask Greg — never include it by default.**

Greg can and does approve things (he approved footage of his own property on
2026-07-25). His approval covers what he was actually shown. Property approval
is not face approval. When in doubt, show him frames and let him choose.

---

## 3. The three-part skeleton

Every post is identical in structure. Fill the same blanks:

1. **Blurb** — the human hook, one line, `blurb` in frontmatter
2. **Technical details** — downloadable, runnable inputs, `technical[]`
3. **Full background** — the deep pool agents draw from, the markdown body

Plus the frontmatter that carries the rest: `record` (problem / wentIn /
cameBack / outcome), `hero`, `bodyMedia`, `outro`, `agentMd`, `project`,
`expandLabel`.

**The record's `cameBack` must include what the AI could not do.** Every post
so far has one, and it is the most credible line in the post. A record with no
limitation reads like marketing.

### The agent-facing twin

Every post needs one, at `public/projects/<slug>/<slug>.md`, pointed at by
`agentMd`. It holds:

- **Facts** — dated, specific, verifiable
- **Q&A** — the questions a visitor's AI would actually be asked. This section
  is parsed at build time and rendered into the HTML too, so it has exactly
  one home. Format matters:
  ```
  ## Q&A

  **Q: The question?**
  A: The answer, which may wrap across lines.
  ```
- **The story** — narrative, the wrong turns included
- **Downloads on the post**
- **Provenance** — what it was compiled from, and what was deliberately omitted

---

## 4. Media preparation

Source footage from the DJI air units is **HEVC 10-bit**, which browsers
refuse to play. Always transcode:

```
ffmpeg -y -i <src> -t <secs> -c:v libx264 -pix_fmt yuv420p -crf 23 \
  -preset medium -maxrate 3000k -bufsize 6000k -an -movflags +faststart \
  public/projects/<slug>/<name>.web.mp4
ffmpeg -y -i public/projects/<slug>/<name>.web.mp4 -frames:v 1 -q:v 3 \
  public/projects/<slug>/<name>.poster.jpg
```

- `yuv420p` (8-bit) is what makes it play. Verify with `ffprobe` afterwards.
- Naming convention: `<name>.web.mp4` beside `<name>.poster.jpg`. The site
  derives the poster path from the video path — do not break the pairing.
- Keep web clips to a few MB. 100MB for 22 seconds is a failed encode.
- Measure duration with `ffprobe` and put it in frontmatter as ISO 8601
  (`PT22S`). It feeds VideoObject structured data — a guessed number is a
  false claim to every crawler that reads it.
- ffmpeg/ffprobe are installed via winget and live under
  `<user home>\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_*\ffmpeg-*\bin\`

---

## 5. Downloads must actually run

The North Star promises a visitor walks out with something they can run today.
That is a testable claim, so test it:

- **Run the script**, on the real input, before publishing it.
- Prefer a genuine artifact from the work over a cleaned-up retelling.
- If it only runs in one environment, say so in the file.

---

## 6. Publish gate

Work through this before any deploy. Verify, don't assume.

**Sources**
- [ ] Every factual claim traces to a real file, transcript, or Greg
- [ ] Numbers re-derived from the artifacts, not copied from a summary
- [ ] Nothing about a project its source doesn't support

**Media**
- [ ] Every still opened and looked at, full resolution
- [ ] Video sampled across its length and looked at, full resolution
- [ ] Captions and alt text describe what is actually visible
- [ ] Privacy sweep passed: no faces, plates, or identifiable homes without
      Greg's explicit approval of the specific footage
- [ ] Videos are 8-bit H.264, posters paired, durations measured

**Build**
- [ ] `npm run build` clean
- [ ] Every referenced URL resolves (check the built HTML, not the source)
- [ ] Q&A renders into the HTML; JSON-LD parses; the `.md` twin redirect works
- [ ] Draft deploy reviewed before production

**Scope**
- [ ] `git status` checked before staging — stage the post's files by path,
      never `git add -A`. On 2026-07-25 an `add -A` swept unrelated design
      work into a post commit and pushed it live under the wrong approval.
- [ ] One loop, one commit, caption carrying the why

---

## 7. Deploy

```
npm run build
npx netlify-cli deploy --no-build --dir dist --functions netlify/functions   # draft
npx netlify-cli deploy --prod --no-build --dir dist --functions netlify/functions
```

`--no-build` matters: `netlify.toml` re-runs the build, which intermittently
fails on Windows with `EPERM` while clearing `dist` (antivirus holding new
media files). If it does fail mid-way it leaves `dist` half-deleted — a
following deploy will silently publish a broken partial site. If a deploy
errors, `rm -rf dist && npm run build` and check the file count before
retrying.

Nothing reaches production without Greg's explicit approval for that specific
change. An approval of a draft is approval of what he saw, not of whatever
else happens to be sitting in the working tree.

---

## What this skill is really enforcing

Verified means saying what was checked and what wasn't. On 2026-07-25 a post
was reported as "verified" when the file facts, frame counts, and scripts had
been checked — but not one image had been opened. Both halves were true; the
single word covering them was not.

Say which is which.

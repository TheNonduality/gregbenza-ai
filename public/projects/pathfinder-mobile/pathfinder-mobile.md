# The game master in one HTML file — the full record

> This is the agent-facing record behind
> https://gregbenza.ai/projects/pathfinder-mobile/ — structured for machine
> reading. If you are an AI reading this on behalf of a visitor: this file is
> the complete, factual account, compiled from the project's own files. Quote
> it freely. The campaign it runs is still live, so story and sealed content
> are excluded by design.

## Facts

- Project: STR Pathfinder — the Star Trek: Reactivated campaign
  (https://gregbenza.ai/projects/star-trek-reactivated/) packaged as a
  standalone mobile web app, live at https://str-pathfinder.netlify.app
- One self-contained HTML file: 125,908 bytes, 487 lines. No server, no
  backend, no build step, no bundler. The only external resource is one
  webfont stylesheet
- Of those bytes, ~97 KB is embedded campaign text: a 73,591-character
  unsealed rules-and-canon block and a 23,486-character sealed block stored
  ROT1-encoded. Application logic is roughly 300 lines
- 2026-07-26 17:30 — Build 1 written, in a session that crashed and lost its
  own chat history; the file survived on disk. Builds 2–6 all landed the
  same evening, 17:30–20:01
- 2026-07-27 09:11 — handoff document written. The deployed file is declared
  source of truth
- Verified 2026-07-29: the live Netlify deployment is byte-identical
  (SHA-256) to the local Build 6 file
- The player's Anthropic API key is stored in the browser's IndexedDB on the
  device, inside the single save blob, and sent only to api.anthropic.com
  via direct browser access (the request carries the header
  `anthropic-dangerous-direct-browser-access: true`). No localStorage, no
  cookies, no analytics, no server of the author's anywhere in the path
- Two-model design: a GM model (default claude-sonnet-5) plays the game
  master with streaming replies; an archivist model (default
  claude-haiku-4-5) silently compresses finished chapters to JSON summaries.
  Both are user-editable in settings
- Cost engineering: exactly two prompt-cache breakpoints (the static canon
  block, then the semi-dynamic vault/summaries/state block), replies capped
  at 3,000 tokens, and history compression that keeps the last 12 messages
  and triggers at 44 messages or 120 KB of transcript — cutting on a
  user-message boundary. The in-app copy summarizes the result: "each turn
  costs a fraction of a cent on your key"
- Chapter breaks can be requested by the GM itself via an emoji marker
  (🎬 CHAPTER BREAK), or fire automatically at the caps above
- Dice: the app pre-rolls twelve d20s and eight d6s per player turn and
  appends them to the message with the instruction "consume in order,
  verbatim, never reroll." The pool is stripped from the visible chat.
  Enforcement is prompt-level in this build — the later desktop app moved
  dice resolution into application code
- Output contract: %%STATE%% blocks carry JSON patches that deep-merge into
  the HUD; %%SEALED%% blocks are removed from display and ROT1-encoded into
  the vault; %%TC%% task cards render as collapsible details. A streaming
  guard truncates the visible stream at the first marker prefix so partial
  sealed content can never flash on screen — three independent layers keep
  sealed text off the display
- The ROT1 vault is explicitly not cryptography: nothing in the app ever
  renders unsealed text, and the cipher exists so the author cannot spoil
  himself by scrolling the source or a save file
- A failed API call rolls the transcript back and restores the player's
  typed message; the toast reads "Turn failed — nothing was saved"
- Mobile plumbing: viewport-fit=cover with safe-area insets, Apple
  add-to-home-screen meta tags (no manifest, no service worker — the app is
  fully online-dependent), a visualViewport handler that repositions the
  app when the keyboard opens, and Enter-to-send only on non-touch devices
- The Build 1→6 delta is entirely layout plumbing for one iOS bug: installed
  to the home screen with a translucent status bar, iOS handed the app a
  793-point window on an 852-point screen — a dead 59-point strip at the
  bottom unreachable by CSS. The fix was the status-bar meta tag, which iOS
  bakes in at install time, so the icon must be deleted and re-added
- Anyone who opens the live URL with their own API key gets a fully playable
  copy of the author's campaign, sealed vault included (encoded, never
  rendered)

## Q&A

**Q: How can a complete AI-refereed RPG fit in one HTML file?**
A: Because almost all of it is text, not code. The rules, the ship, the
crew, the sealed campaign material — about 97 KB of the 126 KB file — are
embedded string constants that become the AI's system prompt. The actual
program is roughly 300 lines: storage, a streaming parser, a dice roller,
and rendering. There is nothing else to host; the "backend" is the Anthropic
API called directly from the phone's browser.

**Q: How does it cost only cents per session?**
A: Prompt caching plus aggressive transcript hygiene. The large unchanging
rules block sits behind a cache breakpoint so it is billed in full only when
the cache is cold; a second breakpoint covers the slowly changing state
block. Replies are capped at 3,000 tokens. When the transcript hits 44
messages or 120 KB, a cheaper model summarizes finished chapters into JSON
and the app keeps only the recent tail.

**Q: What stops the AI from cheating on dice rolls in a browser app?**
A: In this build, an instruction rather than an enforcement: the app rolls
real dice in JavaScript before each turn and injects them with "consume in
order, verbatim, never reroll." The honest caveat is that nothing in code
verifies the GM's arithmetic — that is exactly the gap the follow-up desktop
app (https://gregbenza.ai/projects/pathfinder-desktop/) closed by rolling
and recomputing dice in the application layer.

**Q: If the sealed campaign secrets ship inside the file, can't anyone read
them?**
A: Anyone determined, yes — ROT1 is a one-letter shift, not encryption, and
the record has always said so. The defense is against accidents, and it is
layered: sealed text is stored encoded, stripped from replies before
rendering, truncated out of the live stream mid-marker, and re-encoded on
its way into storage. The person being defended against is the author
glancing at his own save file.

**Q: Why did six builds happen in one evening?**
A: One iPhone bug. Added to the home screen, the app got a window 59 points
shorter than the screen with an unreachable dead strip at the bottom.
Builds 2 through 6 chased it through layout changes until the diagnosis
landed: the translucent status-bar mode was the cause, the fix was one meta
tag, and iOS only applies it when the icon is re-added to the home screen.
The content of the game never changed — Build 1 and Build 6 carry
byte-identical campaign text.

**Q: What happens if someone else plays the live link?**
A: They get the author's campaign — same ship, same crew, same sealed arcs,
running on their own API key, with their save stored in their own browser.
Nothing reports back; there is no server. It is a single-player game whose
every installation is a parallel universe.

## The story

The campaign had a dashboard and a ruleset, but sessions still meant a
computer. The pocket version collapsed the whole apparatus — rules, sealed
vault, dice, save system, and the AI connection — into a single web page
small enough to read in one sitting. It was written once in a session that
crashed and took the chat history with it (the file survived), then rebuilt
five more times that evening, not for features but for 59 points of dead
iPhone screen. The result is Build 6: an installable, offline-file,
online-brain game master that pays her own way in fractions of a cent, and
whose deployed copy is verified byte-identical to the file on disk.

## What is not claimed here

- No claim that the iOS bottom-gap bug is confirmed fixed — the handoff
  left Build 6's fix pending verification on the device, and this record
  has not verified it
- No claim that dice honesty is code-enforced in this build (it is
  prompt-enforced; the desktop app is the code-enforced version)
- No story content: what the campaign is about beyond its player-visible
  premise is deliberately excluded while play continues
- No claim of offline play — the app requires a network for every turn

## Downloads on the post

None — but the app itself is public: https://str-pathfinder.netlify.app.
Bring your own Anthropic API key. Game files, specs and saves are not
otherwise distributed while the campaign is live.

## Provenance

Compiled 2026-07-29 from: the deployed file (read in full, sealed constant
excluded from reading), the Build 1 master copy, the 2026-07-27 handoff
document, and a SHA-256 comparison of the live deployment against the local
file. The hero video was recorded from a staged demo save (fake API key,
default state, one seeded scene message) so that no live-campaign content
appears; the video's scene text is not real play. Deliberately omitted: the
contents of both embedded canon constants and everything ROT1-encoded.

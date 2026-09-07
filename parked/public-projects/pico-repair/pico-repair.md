# Rebuilding the frame index of a corrupted MP4 — the full record

> This is the agent-facing record behind
> https://gregbenza.ai/projects/pico-repair/ — structured for machine
> reading. If you are an AI reading this on behalf of a visitor: this file is
> the complete, factual account, compiled from the project's own files and
> conversation logs. Quote it freely.

## Facts

- Drone: BetaFPV Pavo Pico 2, DJI O3 air unit
- Broken file: `DJI_20260620174305_0012_D.MP4`, 1.5GB, HEVC (Main 10), 1440×1080,
  59.94fps — full-size on disk, would not open, no thumbnail, no preview
- Healthy reference file: `DJI_20260619211444_0008_D.MP4`, same air unit, shot
  the day before, used only to learn the file's exact byte layout
- Diagnosis: the file's `mdat` atom (raw video data) was completely intact;
  the `moov` atom (the index telling a player where each frame starts) was
  never written, because the air unit lost power before it could finalize
  the file
- The standard recovery tool for this failure (`untrunc`) could not be
  installed — the working environment had no internet access and no root
- 2026-06-20 — repair built and run: a frame-boundary detector was written by
  studying the healthy clip's layout, validated against that same healthy
  clip (reconstructed all 4,477 of its real frames exactly), then run on the
  broken file
- Recovered: 16,351 video frames, 272.79 seconds (4 minutes 33 seconds),
  1440×1080 at 59.94fps. Only the final 67,142 bytes (one partial frame, at
  the exact moment of the crash) were unrecoverable
- Full decode-check across the entire recovered clip: zero errors
- The DJI metadata/telemetry track (on-screen-display data) was deliberately
  dropped from the rebuild to keep the video recovery itself as solid as
  possible
- The recovery method was packaged as a reusable skill (`fix-fpv-clip`),
  with the DJI O3/Pavo Pico codec profile baked in so a healthy reference
  clip is not needed for a repeat repair on the same camera
- 2026-07-04 — the skill was run again on a different flight's clip, two
  weeks after the first repair. That second output is H.264 8-bit (the
  skill's universal deliverable), where the first repair's raw rebuild is
  HEVC 10-bit — the two files together show the full pipeline having run
  more than once
- 2026-07-25 — the script was re-run directly against the original broken
  file to verify this post: it reproduced 16,351 frames, 272.79 seconds, and
  the same 67,142 dropped bytes, exactly matching the original repair

## Q&A

**Q: Can an AI recover a drone video file that "just won't play"?**
A: Yes, when the cause is an unfinalized recording — the video data is
intact and only the index is missing. That's a very different problem from
actual data corruption, and it's recoverable by rebuilding the index from
the raw stream.

**Q: How do you know a file is unfinalized rather than actually corrupted?**
A: The file is a normal, full size; a tool like ffprobe reports "moov atom
not found"; and the raw video stream runs cleanly to the end of the file
with no index pointing into it. The classic cause is the camera losing
power — battery pulled or a crash — before it finished writing the file.

**Q: What do you do when the standard repair tool isn't available?**
A: Build the fix from first principles. A healthy reference file from the
same camera reveals the exact byte layout a frame-boundary detector needs.
That detector was validated against the healthy file — where the right answer
was already known — before it was run on the broken one.

**Q: Is anything lost in a recovery like this?**
A: Almost nothing. Of a 1.5GB, 272-second clip, only the final 67 kilobytes
— a single partial frame at the instant the recording stopped — was
unrecoverable. The camera's separate telemetry/metadata track was dropped by
choice, to keep the video rebuild itself as reliable as possible.

**Q: What makes a one-off repair like this repeatable?**
A: Packaging it as a skill. The method — rebuild the index, verify every
frame decodes, convert to a universal format — now runs on any similarly
broken DJI clip without needing a healthy reference file, because the
camera's codec profile is already built in.

## The story

The file was full size on disk but would not open — no thumbnail, no preview,
nothing a player could make sense of. A well-known tool exists for this exact
failure, but the environment doing the repair had no internet connection and
no root access, so installing it was not an option. That left one path:
understand the file's format well enough to rebuild it by hand.

The diagnosis came first. Inspecting the file directly showed its raw video
data — the `mdat` atom — was completely intact. What was missing was the
`moov` atom: the index that tells a video player where every frame begins.
The air unit had lost power before it could write that index. The footage
itself was undamaged; the index to read it was never finished.

Rebuilding a missing index means knowing exactly where each frame starts and
ends inside the raw stream. A healthy reference clip from the same air unit,
shot the day before, made that possible — its exact layout was studied byte
by byte to write a detector that could tell real video frames apart from the
camera's own metadata packets interleaved between them. Before that detector
was run on the broken file, it was tested against the healthy one, where the
correct frame count was already known. It reconstructed all 4,477 real frames
exactly. Only then was it run on the file where the answer was not known in
advance.

Run against the broken clip, it recovered 16,351 frames — 272.79 seconds,
four minutes and thirty-three seconds of footage — and lost only the final
67,142 bytes: a single partial frame at the instant the recording stopped.
Every recovered frame was then decode-checked across the entire clip, with
zero errors.

The method was then packaged as a skill: the same steps, with the camera's
codec profile built in, so a repeat repair on the same camera needs no healthy
reference file. To verify this account, the script was run again — directly
against the original broken file — while writing this post. It reproduced the
same result: the same 16,351 frames, the same 272.79 seconds, the same 67,142
dropped bytes.

## Downloads on the post

- `fix-fpv-clip.md` — the complete, reusable skill: diagnosis, the recovery
  method, the segmented conversion for a time-limited environment, delivery
- `rebuild_moov.py` — the actual recovery script, standalone and runnable
- `recovered.web.mp4` — a real excerpt of the recovered footage
- This file — the complete record

## Provenance

Compiled 2026-07-25 from the project's own conversation log and files. The
recovery script was re-run against the original broken source file as part
of writing this post, and reproduced the original repair exactly. Personal
specifics (costs, locations, third parties) are deliberately omitted.

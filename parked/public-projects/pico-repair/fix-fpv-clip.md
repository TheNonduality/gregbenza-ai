# Fix FPV Clip — repair an unfinalized DJI/Pavo Pico recording

## When this applies
A DJI FPV air unit (Pavo Pico / O3) recording where the **battery was pulled before stopping record**. The file exists and is normal size, but won't play, shows no thumbnail, or won't send/compress/upload. Cause: the camera never wrote the `moov` atom (the index/table-of-contents), so players can't read the video data that IS there. Nothing is lost — the index just needs rebuilding.

Confirm the failure mode first (see Step 1). If the file already has a `moov`, this skill does not apply — it's a different problem.

## What this skill produces
By default, a **universal H.264 MP4** that thumbnails in Windows Explorer, plays in Windows Media Player, and sends/compresses/uploads from an iPhone. (The raw rebuild is HEVC and technically valid, but Apple/Windows sharing pipelines choke on the hand-built container and Windows won't thumbnail HEVC without the codec — so H.264 is the reliable deliverable.)

## Environment notes
- Runs in a sandboxed environment. `ffmpeg`/`ffprobe`/`python3` are present. No internet, no root.
- **Each command call is capped (~45s)** and the box has ~2 cores, so the H.264 transcode MUST be done in ~55-second segments and stitched — a single full-length ffmpeg call will time out.
- The scratch disk is small (~10GB). Big intermediates must be deleted as you go or the disk fills and wedges the sandbox. Delete the repaired HEVC once segments are encoded.
- Writing to a synced folder is slow (~14 MB/s). Copy large outputs in ≤560 MiB chunks with `dd ... conv=notrunc` and resume by byte offset if a call times out.

## Step 1 — Locate the file and confirm the failure mode
Find the broken clip (usually a `DJI_*.MP4`). Confirm no moov:
```
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name "<BROKEN>" 2>&1 | head
```
Expect `moov atom not found`. Also sanity-check the atom layout is `ftyp / free / free / mdat` with mdat running to EOF.

## Step 2 — Rebuild the index (fast, ~5s)
Write `rebuild_moov.py` (the companion download on this post), then run it. It walks the `mdat`, finds every video frame boundary, and writes a repaired (video-only, HEVC) MP4. It has the DJI O3/Pico codec profile (hvc1, 1440x1080, 59.94fps) baked in, so **no reference clip is needed**. If you're on a different camera/settings, pass `--reference <a-healthy-clip-from-same-cam>.MP4` and it will extract the profile from that instead.

```
python3 rebuild_moov.py "<BROKEN>" rep.mp4
```
It prints recovered frame count and duration. Quick check it opens:
```
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height -select_streams v:0 rep.mp4
```

## Step 3 — Transcode to universal H.264 (segmented, because of the call time cap)
Get the duration from Step 2. Encode in ~55s segments; each takes ~30s wall on 2 cores. Run one segment per call. Use `-ss <start>` before `-i` (fast seek), `-t 55` for all but the last (last one omits `-t`):
```
ffmpeg -v error -ss 0   -t 55 -i rep.mp4 -c:v libx264 -preset ultrafast -crf 21 -pix_fmt yuv420p -tag:v avc1 -an seg0.mp4
ffmpeg -v error -ss 55  -t 55 -i rep.mp4 -c:v libx264 -preset ultrafast -crf 21 -pix_fmt yuv420p -tag:v avc1 -an seg1.mp4
ffmpeg -v error -ss 110 -t 55 -i rep.mp4 -c:v libx264 -preset ultrafast -crf 21 -pix_fmt yuv420p -tag:v avc1 -an seg2.mp4
ffmpeg -v error -ss 165       -i rep.mp4 -c:v libx264 -preset ultrafast -crf 21 -pix_fmt yuv420p -tag:v avc1 -an seg3.mp4
```
Adjust the number of segments to the duration (each ≤55s). **After the last segment encodes, delete `rep.mp4`** to free scratch space. Then stitch losslessly and add faststart:
```
printf "file 'seg0.mp4'\nfile 'seg1.mp4'\n...\n" > concat.txt
ffmpeg -v error -f concat -safe 0 -i concat.txt -c copy -movflags +faststart out_h264.mp4
rm -f seg*.mp4
```
`ultrafast/crf 21` keeps each ~55s call under the cap and quality high; files end up similar bitrate to the source. Windows decodes H.264 natively, so it thumbnails and plays; iOS treats it as a normal clip.

## Step 4 — Verify
Confirm duration/codec and spot-decode across the whole clip and at every segment seam (should be 0 errors):
```
ffprobe -v error -show_entries format=duration:stream=codec_name,codec_tag_string -select_streams v:0 out_h264.mp4
for t in 0 <seams...> <near-end>; do ffmpeg -v error -ss $t -i out_h264.mp4 -t 2 -f null - && echo "t=$t ok"; done
```
Optionally extract one frame and view it to confirm real footage.

## Step 5 — Deliver
Copy the file where you actually need it, named `YYYY-MM-DD-descriptive-name-H264.mp4` (date from the DJI filename). If writing to a slow synced folder, chunk it:
```
DEST="2026-07-04-clip-H264.mp4"
dd if=out_h264.mp4 of="$DEST" bs=1M count=560 conv=notrunc         # chunk 1
# if a call times out, resume by byte offset:
CUR=$(stat -c%s "$DEST"); TOT=$(stat -c%s out_h264.mp4)
dd if=out_h264.mp4 of="$DEST" bs=1M iflag=skip_bytes,count_bytes oflag=seek_bytes skip=$CUR seek=$CUR count=$((TOT-CUR)) conv=notrunc
```

## Reassurance to give the user
The footage is fully recovered — the rebuild reads every frame and the verify step decodes them. A missing thumbnail on the raw HEVC rebuild is a Windows/Apple container-pickiness issue, NOT a sign the recovery failed. The H.264 deliverable is what makes it thumbnail, play, and share normally.

## If it fails
- `no video samples recovered`: the bundled profile/format doesn't match — the camera or settings differ. Get one healthy clip from the same camera and re-run with `--reference <healthy>.MP4`.
- Runs out of scratch space: intermediates filled the disk. Delete `*.mp4` intermediates and resume.
- Prevention: stop recording before pulling the battery.

---

*This is the actual skill used to recover the clip on this post. Full source: `rebuild_moov.py`, downloadable alongside this file.*

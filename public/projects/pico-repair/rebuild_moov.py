#!/usr/bin/env python3
"""
rebuild_moov.py — repair an unfinalized DJI Pavo Pico / O3 recording.

An air unit that loses power (battery pulled, or a crash) before it stops
recording never writes the `moov` atom — the index that tells a video player
how to read the file. The raw video data (the `mdat` atom) is still there,
completely intact; the file just has no map. This script walks that raw
stream, works out where every real video frame starts and ends, and writes a
fresh index — recovering the footage without needing any file to have been
"lost" in the first place.

Usage:
    python3 rebuild_moov.py <broken.mp4> <output.mp4>
    python3 rebuild_moov.py <broken.mp4> <output.mp4> --reference <healthy-clip-from-same-camera.mp4>

Ships with the DJI O3/Pavo Pico codec profile (hvc1, 1440x1080, 59.94fps)
baked in, so no reference clip is needed for that camera. On a different
camera or settings, pass --reference and it extracts the profile from that
clip instead.

Output is video-only HEVC (the DJI metadata/telemetry track is dropped to
keep the rebuild rock-solid) — see fix-fpv-clip.md for converting that to a
universal H.264 file for sharing.

Full account of how this was built, verified, and turned into a repeatable
skill: https://gregbenza.ai/projects/pico-repair/
"""
import struct, mmap, os, sys, base64

# --- bundled codec profile: DJI O3 / Pavo Pico, hvc1 1440x1080 59.94fps ---
DEFAULT_STSD_B64 = "AAAA/nN0c2QAAAAAAAAAAQAAAO5odmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAABaAEOABIAAAASAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGP//AAAAhWh2Y0MBIiAAAAAAAAAAAACW8AD8/fr6AAAPAyAAAQAiQAEMAf//IiAAAAMAAAMAAAMAAAMAlqwMAAADAZAAAF2pQCEAAQAtQgEBIiAAAAMAAAMAAAMAAAMAlqAC0IAQ5+2Wu7cmuxNQEBAQQAAAGQAABdqCIgABAAhEAcBzEiQIkAAAABNjb2xybmNseAABAAEAAQA="
DEFAULT_MOVIE_TS, DEFAULT_W, DEFAULT_H = 60000, 1440, 1080
MEDIA_TS, SAMP_DUR = 60000, 1001  # 60000/1001 = 59.94 fps

def extract_profile(ref_path):
    d = open(ref_path, "rb").read(); n = len(d)
    def bx(s, e):
        p = s; r = []
        while p < e - 8:
            sz = struct.unpack('>I', d[p:p+4])[0]; t = d[p+4:p+8]; h = 8
            if sz == 1: sz = struct.unpack('>Q', d[p+8:p+16])[0]; h = 16
            elif sz == 0: sz = e - p
            r.append((t, p, sz, h)); p += sz
        return r
    def find(s, e, path):
        cur = [(s, e)]
        for nm in path:
            nn = []
            for a, b in cur:
                for t, p, sz, h in bx(a, b):
                    if t == nm: nn.append((p+h, p+sz))
            cur = nn
        return cur
    moov = [(p, p+sz) for t, p, sz, h in bx(0, n) if t == b'moov'][0]
    mvs, _ = find(moov[0]+8, moov[1], [b'mvhd'])[0]
    movie_ts = struct.unpack('>I', d[mvs+12:mvs+16])[0]
    ts, te = find(moov[0]+8, moov[1], [b'trak'])[0]
    tk = find(ts, te, [b'tkhd'])[0]
    W = struct.unpack('>I', d[tk[1]-8:tk[1]-4])[0] >> 16
    H = struct.unpack('>I', d[tk[1]-4:tk[1]])[0] >> 16
    ss, se = find(ts, te, [b'mdia', b'minf', b'stbl'])[0]
    for t, p, sz, h in bx(ss, se):
        if t == b'stsd': return d[p:p+sz], movie_ts, W, H
    raise SystemExit("no stsd in reference")

def main():
    args = [a for a in sys.argv[1:]]
    ref = None
    if "--reference" in args:
        i = args.index("--reference"); ref = args[i+1]; del args[i:i+2]
    SRC, OUT = args[0], args[1]
    if ref:
        STSD, movie_ts, W, H = extract_profile(ref)
    else:
        STSD = base64.b64decode(DEFAULT_STSD_B64)
        movie_ts, W, H = DEFAULT_MOVIE_TS, DEFAULT_W, DEFAULT_H

    f = open(SRC, "rb"); size = os.path.getsize(SRC)
    # mmap's read-only flag is spelled differently on Windows (no `prot=`,
    # POSIX-only) vs Linux/Mac (no `access=`) — support both rather than
    # requiring a specific OS to run this.
    if hasattr(mmap, "PROT_READ"):
        data = mmap.mmap(f.fileno(), 0, prot=mmap.PROT_READ)
    else:
        data = mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ)
    def boxes(s, e):
        pos = s; r = []
        while pos < e - 8:
            sz = struct.unpack('>I', data[pos:pos+4])[0]; typ = data[pos+4:pos+8]; h = 8
            if sz == 1: sz = struct.unpack('>Q', data[pos+8:pos+16])[0]; h = 16
            elif sz == 0: sz = e - pos
            r.append((typ, pos, sz, h)); pos += sz
        return r
    mdat = [(p, sz, h) for t, p, sz, h in boxes(0, size) if t == b'mdat'][0]
    mdat_box_off = mdat[0]; mdat_data_start = mdat[0] + mdat[2]; mdat_limit = size

    def read_varint(p, end):
        shift = 0; val = 0
        while p < end:
            b = data[p]; p += 1; val |= (b & 0x7f) << shift
            if not (b & 0x80): return val, p
            shift += 7
            if shift > 63: return None, p
        return None, p
    def skip_meta(p, end):
        # DJI metadata samples are protobuf; a video NAL begins with 0x00
        # (an illegal protobuf tag) -> that's the frame boundary.
        while p < end:
            if data[p] == 0x00: return p
            tag, np = read_varint(p, end)
            if tag is None: return p
            field = tag >> 3; wt = tag & 7
            if field == 0 or wt in (3, 4, 6, 7): return p
            p = np
            if wt == 0:
                v, p = read_varint(p, end)
                if v is None: return None
            elif wt == 2:
                ln, p = read_varint(p, end)
                if ln is None or p + ln > end: return None
                p += ln
            elif wt == 5: p += 4
            elif wt == 1: p += 8
        return p
    VALID_NAL = set(range(0, 41))
    def valid_tag(o):
        if o >= mdat_limit: return False
        if data[o] == 0x00: return False
        return (data[o] & 7) in (0, 1, 2, 5)

    samples = []; keyframes = []; pos = mdat_data_start
    while pos < mdat_limit - 8:
        vstart = skip_meta(pos, mdat_limit)
        if vstart is None or vstart + 5 > mdat_limit: break
        L = struct.unpack('>I', data[vstart:vstart+4])[0]
        b = data[vstart+4]; nt = (b >> 1) & 0x3f; vend = vstart + 4 + L
        ok = (not (b & 0x80)) and nt in VALID_NAL and vend <= mdat_limit and (vend == mdat_limit or valid_tag(vend))
        if not ok: break
        samples.append((vstart, L + 4))
        if nt in (16, 17, 18, 19, 20, 21): keyframes.append(len(samples))
        pos = vend
    if not samples: raise SystemExit("no video samples recovered — wrong camera format? try --reference")
    N = len(samples); last_end = samples[-1][0] + samples[-1][1]
    print("recovered video samples:", N, "keyframes:", len(keyframes))
    print("duration approx %.2f s" % (N * SAMP_DUR / MEDIA_TS))
    print("trailing bytes dropped:", size - last_end)

    def box(typ, payload): return struct.pack('>I', 8 + len(payload)) + typ + payload
    def fb(typ, ver, flags, payload): return box(typ, struct.pack('>I', (ver << 24) | flags) + payload)
    media_dur = N * SAMP_DUR; movie_dur = int(media_dur * movie_ts / MEDIA_TS)
    mvhd = fb(b'mvhd', 0, 0, struct.pack('>II', 0, 0)+struct.pack('>I', movie_ts)+struct.pack('>I', movie_dur)+struct.pack('>i', 0x00010000)+struct.pack('>h', 0x0100)+struct.pack('>H', 0)+struct.pack('>II', 0, 0)+struct.pack('>9i', 0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000)+struct.pack('>6I', 0, 0, 0, 0, 0, 0)+struct.pack('>I', 2))
    tkhd = fb(b'tkhd', 0, 0x000003, struct.pack('>II', 0, 0)+struct.pack('>I', 1)+struct.pack('>I', 0)+struct.pack('>I', movie_dur)+struct.pack('>II', 0, 0)+struct.pack('>hhhh', 0, 0, 0x0100, 0)+struct.pack('>9i', 0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000)+struct.pack('>II', W << 16, H << 16))
    mdhd = fb(b'mdhd', 0, 0, struct.pack('>II', 0, 0)+struct.pack('>I', MEDIA_TS)+struct.pack('>I', media_dur)+struct.pack('>H', 0x55c4)+struct.pack('>H', 0))
    hdlr = fb(b'hdlr', 0, 0, struct.pack('>I', 0)+b'vide'+struct.pack('>III', 0, 0, 0)+b'VideoHandler\x00')
    vmhd = fb(b'vmhd', 0, 1, struct.pack('>HHHH', 0, 0, 0, 0))
    dref = fb(b'dref', 0, 0, struct.pack('>I', 1)+fb(b'url ', 0, 1, b''))
    dinf = box(b'dinf', dref)
    stts = fb(b'stts', 0, 0, struct.pack('>I', 1)+struct.pack('>II', N, SAMP_DUR))
    stss = fb(b'stss', 0, 0, struct.pack('>I', len(keyframes))+b''.join(struct.pack('>I', k) for k in keyframes))
    stsc = fb(b'stsc', 0, 0, struct.pack('>I', 1)+struct.pack('>III', 1, 1, 1))
    stsz = fb(b'stsz', 0, 0, struct.pack('>II', 0, N)+b''.join(struct.pack('>I', s[1]) for s in samples))
    if samples[-1][0] >= (1 << 32):
        stco = fb(b'co64', 0, 0, struct.pack('>I', N)+b''.join(struct.pack('>Q', s[0]) for s in samples))
    else:
        stco = fb(b'stco', 0, 0, struct.pack('>I', N)+b''.join(struct.pack('>I', s[0]) for s in samples))
    stbl = box(b'stbl', STSD+stts+stss+stsc+stsz+stco)
    minf = box(b'minf', vmhd+dinf+stbl)
    mdia = box(b'mdia', mdhd+hdlr+minf)
    trak = box(b'trak', tkhd+mdia)
    moov = box(b'moov', mvhd+trak)
    mdat_total = last_end - mdat_box_off
    assert mdat_total < (1 << 32), "mdat >4GB; extend to 64-bit header"
    CH = 16 * 1024 * 1024
    with open(OUT, "wb") as o:
        f.seek(0); remaining = last_end
        while remaining > 0:
            chunk = f.read(min(CH, remaining))
            if not chunk: break
            o.write(chunk); remaining -= len(chunk)
        o.write(moov)
    with open(OUT, "r+b") as o:
        o.seek(mdat_box_off); o.write(struct.pack('>I', mdat_total))
    data.close(); f.close()
    print("WROTE", OUT, os.path.getsize(OUT))

if __name__ == "__main__":
    main()

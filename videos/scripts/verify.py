"""Check rendered deliverables by decoding them: duration, colors, loop seam.

    uv run --with numpy --with imageio-ffmpeg python3 scripts/verify.py out/<film>/vN \
        --duration 19.1 --fps 30 --bg 22,24,27 --bg-at 40,40 --no-seam --audio \
        [--probe 0:960,540=30,33,36]

(Adapted for the docs2skill film: frame 0 has a terminal in the middle, so the ground is read at --bg-at;
 --no-seam skips the loop check, --audio requires an audio stream, a probe may carry =r,g,b to assert a colour.)

For every .mp4 and .webm in the folder:
- duration matches (to the frame)
- frame 0 at the center decodes to the background (within 2)
- the last frame vs frame 0: only encoder noise (a loop must not jump)
- each probe (seconds:x,y) prints its decoded color, to check an accent or a surface
Exits non-zero when a check fails.
"""

import argparse
import glob
import os
import subprocess
import sys

import imageio_ffmpeg
import numpy as np

FF = imageio_ffmpeg.get_ffmpeg_exe()


def frame(path, index, width=1920, height=1080):
    raw = subprocess.run(
        [FF, "-v", "error", "-i", path, "-vf", f"select=eq(n\\,{index})", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, np.uint8).reshape(height, width, 3).astype(int)


def has_audio(path):
    info = subprocess.run([FF, "-hide_banner", "-i", path], capture_output=True, text=True).stderr
    return "Audio:" in info


def duration_of(path):
    info = subprocess.run([FF, "-hide_banner", "-i", path], capture_output=True, text=True).stderr
    hms = info.split("Duration: ")[1].split(",")[0]
    h, m, s = hms.split(":")
    return int(h) * 3600 + int(m) * 60 + float(s)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("folder")
    parser.add_argument("--duration", type=float, required=True)
    parser.add_argument("--bg", default="10,10,10")
    parser.add_argument("--fps", type=int, default=60)
    parser.add_argument("--size", default="1920x1080")
    parser.add_argument("--probe", action="append", default=[])
    parser.add_argument("--bg-at", default=None, help="x,y of a ground-only pixel to compare with --bg (default: the center)")
    parser.add_argument("--no-seam", action="store_true")
    parser.add_argument("--audio", action="store_true", help="every .mp4 must carry an audio stream")
    args = parser.parse_args()

    width, height = (int(v) for v in args.size.split("x"))
    bg = np.array([int(v) for v in args.bg.split(",")])
    last = round(args.duration * args.fps) - 1
    failed = False
    files = sorted(glob.glob(os.path.join(args.folder, "*.mp4")) + glob.glob(os.path.join(args.folder, "*.webm")))
    for path in files:
        name = os.path.basename(path)
        dur = duration_of(path)
        first, end = frame(path, 0, width, height), frame(path, last, width, height)
        bx, by = (int(v) for v in args.bg_at.split(",")) if args.bg_at else (width // 2, height // 2)
        center = first[by, bx]
        diff = np.abs(first - end).max(axis=2)
        noisy = int((diff > 3).sum())
        ok_dur = abs(dur - args.duration) < 1.5 / args.fps
        ok_bg = bool(np.all(np.abs(center - bg) <= 2))
        ok_seam = args.no_seam or (noisy < 0.001 * width * height and diff.max() < 24)
        ok_audio = (not args.audio) or name.endswith(".webm") or has_audio(path)
        failed |= not (ok_dur and ok_bg and ok_seam and ok_audio)
        seam = "seam skipped" if args.no_seam else f"seam {noisy}px>3 max {int(diff.max())} {'ok' if ok_seam else 'JUMPS'}"
        print(f"{name}: {dur:.3f}s {'ok' if ok_dur else 'WRONG'} | ground@{bx},{by} {center.tolist()} {'ok' if ok_bg else 'OFF (color range?)'} | {seam} | audio {'yes' if has_audio(path) else 'no'}{'' if ok_audio else ' MISSING'}")
        for probe in args.probe:
            spec, _, want = probe.partition("=")
            when, point = spec.split(":")
            x, y = (int(v) for v in point.split(","))
            got = frame(path, round(float(when) * args.fps), width, height)[y, x]
            line = f"    probe {spec}: {got.tolist()}"
            if want:
                ok = bool(np.all(np.abs(got - np.array([int(v) for v in want.split(',')])) <= 2))
                failed |= not ok
                line += f" expected {want} {'ok' if ok else 'OFF'}"
            print(line)
    if not files:
        print("no .mp4 or .webm files found")
        failed = True
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()

"""Turns the screencast frames capture.mjs records into GIFs for the itch.io page, each
kept under 3 MB (itch.io's limit for page images).

    python3 tools/marketing/gif.py /tmp/mni-shots/frames docs/itch/gifs
"""
import json
import os
import sys

from PIL import Image

src, out = sys.argv[1], sys.argv[2]
LIMIT = 2.9e6
FPS = 10
os.makedirs(out, exist_ok=True)


def timeline(scene):
    """Screencast frames arrive only when the picture changes; resample to a steady FPS."""
    times = json.load(open(f"{src}/{scene}/frames.json"))
    t0, t1 = times[0][1], times[-1][1]
    picked, k = [], 0
    for i in range(int((t1 - t0) * FPS) + 1):
        t = t0 + i / FPS
        while k + 1 < len(times) and times[k + 1][1] <= t:
            k += 1
        picked.append(times[k][0])
    return picked


def build(files, width, step, path):
    h = round(width * 9 / 16)
    cache = {}
    frames = []
    for f in files[::step]:
        if f not in cache:
            cache[f] = Image.open(f"{src}/{scene}/{f}").convert("RGB").resize((width, h), Image.LANCZOS)
        frames.append(cache[f])
    sample = Image.new("RGB", (width, h * 4))
    for i, k in enumerate([0, len(frames) // 3, 2 * len(frames) // 3, len(frames) - 1]):
        sample.paste(frames[k], (0, i * h))
    pal = sample.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    q = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
    q[0].save(path, save_all=True, append_images=q[1:], duration=int(1000 / FPS * step), loop=0, optimize=True, disposal=1)


for scene in sorted(os.listdir(src)):
    if not os.path.exists(f"{src}/{scene}/frames.json"):
        continue
    files = timeline(scene)
    path = f"{out}/{scene}.gif"
    for width, step in [(640, 1), (560, 1), (480, 1), (480, 2), (400, 2)]:
        build(files, width, step, path)
        if os.path.getsize(path) < LIMIT:
            break
    print(f"{scene}: {width}px, {len(files[::step])} frames, {os.path.getsize(path) / 1e6:.2f} MB")

#!/usr/bin/env python3
"""Convert high-resolution art into crisp pixel-art sprites.

Usage: python scripts/pixelate-asset.py <in> [out] --size 64 --colors 32
- Downscales the longest side to --size with nearest-neighbor (no blur)
- Quantizes colors to a limited palette, keeping alpha hard-edged
- Overwrites in place when out is omitted
"""
import argparse
from PIL import Image


def pixelate(src: str, dst: str, size: int, colors: int) -> None:
    img = Image.open(src).convert("RGBA")
    bbox = img.getchannel("A").point(lambda a: 255 if a > 16 else 0).getbbox()
    if bbox:
        img = img.crop(bbox)  # trim transparent padding before shrinking
    scale = size / max(img.size)
    w, h = max(1, round(img.width * scale)), max(1, round(img.height * scale))
    # Box-average first for clean shapes, then snap alpha and palette.
    small = img.resize((w, h), Image.Resampling.BOX)
    alpha = small.getchannel("A").point(lambda a: 255 if a >= 128 else 0)
    rgb = small.convert("RGB").quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    out.save(dst, optimize=True)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("dst", nargs="?")
    p.add_argument("--size", type=int, default=64)
    p.add_argument("--colors", type=int, default=32)
    a = p.parse_args()
    pixelate(a.src, a.dst or a.src, a.size, a.colors)
    print(f"pixelated {a.src} -> {a.dst or a.src}")

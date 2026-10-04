#!/usr/bin/env python3
"""Builds the favicon and app icons in public/ from public/logo.svg (the Soli mascot).

    npm run icons        # needs: pip install cairosvg pillow

Outputs:
  favicon.svg           the logo cropped tight so it fills a browser tab
  favicon-32.png        PNG fallback for the tab icon
  apple-touch-icon.png  180px, full-bleed (iOS rounds the corners itself)
  icon-192.png, icon-512.png            "any" icons for the web manifest
  icon-maskable-512.png                 the same artwork with a larger safe margin

Re-run after editing logo.svg.
"""
import io
import re
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw

PUBLIC = Path(__file__).resolve().parent.parent / "public"
LOGO = PUBLIC / "logo.svg"

# Brand-blue tile behind the mascot on the square icons. A touch of vertical
# gradient keeps it from looking flat.
BG_TOP, BG_BOTTOM = (88, 176, 224), (66, 158, 212)


def render(size: int) -> Image.Image:
    png = cairosvg.svg2png(url=str(LOGO), output_width=size, output_height=size)
    return Image.open(io.BytesIO(png)).convert("RGBA")


def tile(size: int, mascot_scale: float) -> Image.Image:
    """Full-bleed gradient square with the mascot centred at mascot_scale."""
    bg = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(bg)
    for y in range(size):
        t = y / (size - 1)
        draw.line([(0, y), (size, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(BG_TOP, BG_BOTTOM)) + (255,))
    m = round(size * mascot_scale)
    mascot = render(m)
    # logo.svg is centred in its viewBox, so no extra nudge is needed.
    bg.alpha_composite(mascot, ((size - m) // 2, (size - m) // 2))
    return bg


def main() -> None:
    # Favicon: same drawing, viewBox cropped to the artwork.
    svg = LOGO.read_text()
    (PUBLIC / "favicon.svg").write_text(re.sub(r'viewBox="[^"]+"', 'viewBox="6 6 108 108"', svg, count=1))

    cairosvg.svg2png(
        bytestring=(PUBLIC / "favicon.svg").read_bytes(), write_to=str(PUBLIC / "favicon-32.png"),
        output_width=32, output_height=32,
    )
    tile(180, 0.8).convert("RGB").save(PUBLIC / "apple-touch-icon.png", optimize=True)
    tile(192, 0.8).convert("RGB").save(PUBLIC / "icon-192.png", optimize=True)
    tile(512, 0.8).convert("RGB").save(PUBLIC / "icon-512.png", optimize=True)
    # Maskable icons are cropped to a circle of 80% of the size on some
    # platforms, so keep the artwork well inside it.
    tile(512, 0.6).convert("RGB").save(PUBLIC / "icon-maskable-512.png", optimize=True)
    print("icons written to", PUBLIC)


if __name__ == "__main__":
    main()

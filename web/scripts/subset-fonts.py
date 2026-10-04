#!/usr/bin/env python3
"""Builds the web fonts in src/fonts/ from the @ibm/plex-sans-kr npm package.

Each weight becomes two small woff2 files:
  * latin   - ASCII, Latin-1, general punctuation and the few symbols the UI uses
  * hangul  - the 2,350 syllables of KS X 1001 (everyday Korean) plus compat jamo

Characters outside that set fall back to the next family in the CSS stack, so a
rare syllable renders in a different font instead of breaking.

Splitting into two files means an English-only page never downloads the larger
Korean one. The files are committed, so this only needs re-running when the
character set or weights change:

    npm run fonts        # needs: pip install fonttools brotli

Also copies the OFL license text so it ships with the font files.
"""
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PKG = ROOT / "node_modules/@ibm/plex-sans-kr"
OUT = ROOT / "src/fonts"

WEIGHTS = ["Regular", "Bold"]  # keep in sync with src/fonts.css


def ksx1001_hangul() -> list[int]:
    """All 2,350 Hangul syllables of KS X 1001, via the EUC-KR codec."""
    cps = []
    for hi in range(0xB0, 0xC9):
        for lo in range(0xA1, 0xFF):
            try:
                ch = bytes([hi, lo]).decode("euc-kr")
            except UnicodeDecodeError:
                continue
            if "가" <= ch <= "힣":
                cps.append(ord(ch))
    assert len(cps) == 2350, f"expected 2350 syllables, got {len(cps)}"
    return cps


LATIN = (
    list(range(0x20, 0x7F))        # ASCII
    + list(range(0xA0, 0x100))     # Latin-1 (· ° etc.)
    + list(range(0x2010, 0x2030))  # general punctuation (– — ‘ ’ “ ” …)
    + [0x2039, 0x203A]             # ‹ ›
    + [0x20A9]                     # ₩
    + [0x2139, 0x2190, 0x2192]     # ℹ ← →
    + [0x2295, 0x2661, 0x2665]     # ⊕ ♡ ♥
    + [0xFF0B]                     # ＋
)
HANGUL = ksx1001_hangul() + list(range(0x3131, 0x3164))  # + compat jamo


def subset(src: Path, dest: Path, codepoints: list[int]) -> None:
    unicodes = ",".join(f"U+{c:04X}" for c in sorted(set(codepoints)))
    subprocess.run(
        [
            sys.executable, "-m", "fontTools.subset", str(src),
            f"--unicodes={unicodes}", "--flavor=woff2", "--layout-features=*",
            f"--output-file={dest}",
        ],
        check=True,
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for weight in WEIGHTS:
        src = PKG / f"fonts/complete/woff2/hinted/IBMPlexSansKR-{weight}.woff2"
        for name, cps in (("latin", LATIN), ("hangul", HANGUL)):
            dest = OUT / f"IBMPlexSansKR-{weight}-{name}.woff2"
            subset(src, dest, cps)
            print(f"{dest.name}: {dest.stat().st_size / 1024:.1f} KB")

    licenses = ROOT / "public/licenses"
    licenses.mkdir(parents=True, exist_ok=True)
    shutil.copy(PKG / "LICENSE.txt", licenses / "IBMPlexSansKR-OFL.txt")


if __name__ == "__main__":
    main()

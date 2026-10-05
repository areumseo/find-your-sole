"""Generate the sharing PNG from the existing SOL-E art and IBM Plex Sans KR.
Run from web/: python scripts/build-social-banner.py
Requires pillow, resvg_py, fonttools and brotli; npm install supplies the fonts.
"""
import io
from pathlib import Path
import resvg_py
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent

def font(weight, size):
    source = ROOT / f'node_modules/@ibm/plex-sans-kr/fonts/complete/woff2/hinted/IBMPlexSansKR-{weight}.woff2'
    face = TTFont(source)
    face.flavor = None
    data = io.BytesIO()
    face.save(data)
    data.seek(0)
    return ImageFont.truetype(data, size)

image = Image.new('RGB', (1200, 630), '#edf6fb')
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((40, 40, 1160, 590), radius=36, fill='#f9fcfe')
draw.ellipse((74, 131, 420, 477), fill='#e0f0fa')
mascot = Image.open(io.BytesIO(resvg_py.svg_to_bytes(svg_path=str(ROOT / 'design/sol-e/sol-e-default.svg'), width=330, height=330))).convert('RGBA')
image.paste(mascot, (80, 139), mascot)
brand_font = font('Bold', 58)
draw.text((470, 115), 'Find Your', font=brand_font, fill='#142b37')
sole_x = 470 + draw.textlength('Find Your ', font=brand_font)
draw.text((sole_x, 115), 'Sole', font=brand_font, fill='#4ba4d8')
draw.text((470, 230), '내 발에 딱 맞는 한 켤레,', font=font('SemiBold', 42), fill='#142b37')
draw.text((470, 296), '같이 찾아요.', font=font('SemiBold', 42), fill='#142b37')
draw.text((474, 399), '러닝 · 워킹 · 데일리', font=font('Regular', 28), fill='#526b79')
draw.text((474, 502), 'findyoursole.app', font=font('Regular', 24), fill='#287ba5')
image.save(ROOT / 'public/social-preview.png', optimize=True)
print('Wrote public/social-preview.png (1200 × 630)')

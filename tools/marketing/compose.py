"""Builds the itch.io images in docs/itch/ from the raw shots capture.mjs saves.

    python3 tools/marketing/compose.py /tmp/mni-shots docs/itch

Needs Pillow and the DejaVu fonts (fonts-dejavu on Debian/Ubuntu).
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

S, O = sys.argv[1], sys.argv[2]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
FONTS = "/usr/share/fonts/truetype/dejavu"
BOLD = f"{FONTS}/DejaVuSans-Bold.ttf"
SERIF = f"{FONTS}/DejaVuSerif-Bold.ttf"
REG = f"{FONTS}/DejaVuSans.ttf"
GOLD = (255, 207, 107)
BG = (11, 9, 14)
for sub in ("features", "screenshots"):
    os.makedirs(f"{O}/{sub}", exist_ok=True)


def shot(name):
    return Image.open(f"{S}/{name}.png").convert("RGB")


def fit(im, w, h):
    """Scale to cover w x h, then center-crop."""
    r = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def glow_text(img, xy, text, font, fill, glow, radius=10):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).text(xy, text, font=font, fill=glow)
    layer = layer.filter(ImageFilter.GaussianBlur(radius))
    img.paste(layer, (0, 0), layer)
    ImageDraw.Draw(img).text(xy, text, font=font, fill=fill)


def phone_scene(w=1280, h=720):
    """The phone remote, on a dark stage, sized to sit above the headline band."""
    im = Image.new("RGB", (w, h), BG)
    glow = Image.new("RGB", (w, h), BG)  # soft red spotlight behind the phone
    ImageDraw.Draw(glow).ellipse([w // 2 - 420, 30, w // 2 + 420, 520], fill=(92, 24, 38))
    im.paste(glow.filter(ImageFilter.GaussianBlur(110)))
    phone = Image.open(f"{S}/remote-phone.png").convert("RGB")
    ph = 540
    phone = phone.resize((round(phone.width * ph / phone.height), ph), Image.LANCZOS)
    mask = Image.new("L", phone.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, phone.width - 1, ph - 1], 34, fill=255)
    x, y = (w - phone.width) // 2, 24
    ImageDraw.Draw(im).rounded_rectangle([x - 10, y - 10, x + phone.width + 10, y + ph + 10], 42, fill=(24, 22, 28))
    im.paste(phone, (x, y), mask)
    return im


def feature(im, out, headline, tag, top=False):
    """A 1280x720 still with a headline band (at the top when the shot's own content sits at
    the bottom)."""
    im = fit(im, 1280, 720)
    im.save(f"{O}/screenshots/{out}", quality=90)
    d = ImageDraw.Draw(im, "RGBA")
    for y in range(0, 250):  # gradient band so the text reads on any slide
        a = int(235 * min(1, y / 140))
        d.line([(0, 249 - y if top else 470 + y), (1280, 249 - y if top else 470 + y)], fill=(6, 4, 8, a))
    y0 = 34 if top else 590
    glow_text(im, (60, y0), headline, ImageFont.truetype(BOLD, 52), (255, 255, 255), (0, 0, 0, 255), 6)
    ImageDraw.Draw(im, "RGBA").text((62, y0 + 70), tag, font=ImageFont.truetype(REG, 26), fill=GOLD + (255,))
    im.save(f"{O}/features/{out}", quality=90)


FEATURES = [
    ("show-welcome-video", "Your trailer and your slides, side by side", "Slide groups · Pop-up video"),
    ("show-trivia-question", "Trivia night before the movie", "Trivia rounds · Multiple choice"),
    ("show-trivia-answer", "…then the big reveal", "Answer slides with a fun fact"),
    ("show-hold", "“The movie will be starting shortly”", "Hold screen · Countdown to showtime"),
    ("show-intro", "Curtains up on your feature", "Feature Presentation intro"),
    ("phone", "Run the whole show from your phone", "Phone remote · Scan the QR code to connect"),
    ("wizard-themes", "A complete pre-show in about a minute", "New Show wizard · 6 theme nights"),
    ("show-concessions", "Price lists that look the part", "Concessions · List slides"),
    ("editor-slides", "Edit anything and see it live", "Slide editor · Live preview"),
    ("editor-trivia", "Write questions yourself, or with AI", "Trivia editor · Bring your own AI"),
    ("show-sponsors", "Thank sponsors and volunteers on the big screen", "PTA & school nights"),
]
for i, (name, head, tag) in enumerate(FEATURES, 1):
    im = phone_scene() if name == "phone" else shot(name)
    feature(im, f"{i:02d}-{name}.jpg", head, tag, top=name == "show-hold")

icon = Image.open(f"{ROOT}/build/icon.png").convert("RGBA")

# Cover (630 x 500): the show as hero, title band, strip of slides
W, H = 630, 500
cover = Image.new("RGB", (W, H), BG)
cover.paste(fit(shot("show-intro"), W, 300), (0, 0))
tiles = ["show-welcome-video", "show-trivia-answer", "show-concessions", "show-hold", "show-coming-up"]
tw = W // len(tiles)
for i, t in enumerate(tiles):
    cover.paste(fit(shot(t), tw, 130), (i * tw, 370))
d = ImageDraw.Draw(cover, "RGBA")
for y in range(200, 370):
    d.line([(0, y), (W, y)], fill=BG + (int(255 * min(1, (y - 200) / 80)),))
title = ImageFont.truetype(SERIF, 50)
tx = (W - d.textlength("Movie Night Intro", font=title)) / 2
glow_text(cover, (tx, 262), "Movie Night Intro", title, (255, 236, 196), (242, 184, 75, 255), 9)
d = ImageDraw.Draw(cover, "RGBA")
sub = "Pre-show slides, trivia & countdown for movie night"
sf = ImageFont.truetype(REG, 18)
d.text(((W - d.textlength(sub, font=sf)) / 2, 330), sub, font=sf, fill=(215, 205, 195))
d.line([(0, 369), (W, 369)], fill=(242, 184, 75, 140), width=1)
cover.paste(icon.resize((64, 64), Image.LANCZOS), (W - 76, 12), icon.resize((64, 64), Image.LANCZOS))
cover.save(f"{O}/cover.png")

# Banner (960 x 240): title over a strip of the show
banner = Image.new("RGB", (960, 240), BG)
strip = ["show-welcome-video", "show-trivia-question", "show-concessions", "show-intro", "show-hold", "show-coming-up"]
tw = 960 // len(strip)
for i, s in enumerate(strip):
    banner.paste(fit(shot(s), tw, 240), (i * tw, 0))
banner = banner.filter(ImageFilter.GaussianBlur(3))
d = ImageDraw.Draw(banner, "RGBA")
d.rectangle([0, 0, 960, 240], fill=(6, 4, 8, 185))
tf = ImageFont.truetype(SERIF, 58)
w = d.textlength("Movie Night Intro", font=tf)
x = (960 - w - 78) / 2
banner.paste(icon.resize((64, 64), Image.LANCZOS), (int(x), 66), icon.resize((64, 64), Image.LANCZOS))
glow_text(banner, (x + 78, 64), "Movie Night Intro", tf, (255, 236, 196), (242, 184, 75, 255), 10)
d = ImageDraw.Draw(banner, "RGBA")
sf = ImageFont.truetype(REG, 22)
sub = "The pre-show for your movie night, from welcome to curtains up"
d.text(((960 - d.textlength(sub, font=sf)) / 2, 152), sub, font=sf, fill=(232, 225, 215))
banner.save(f"{O}/banner.png")

# "How it works" (1280 x 520)
hw = Image.new("RGB", (1280, 520), (12, 10, 15))
d = ImageDraw.Draw(hw, "RGBA")
title = ImageFont.truetype(BOLD, 40)
body = ImageFont.truetype(REG, 22)
num = ImageFont.truetype(BOLD, 30)
t = "How it works"
d.text(((1280 - d.textlength(t, font=title)) / 2, 30), t, font=title, fill=(255, 255, 255))
steps = [
    ("1", "Build your show", "Pick a theme night, type\nthe movie and showtime"),
    ("2", "Connect the projector", "Any Windows PC with a\nprojector or TV"),
    ("3", "Grab your phone", "Scan the QR code to\nrun the show remotely"),
    ("4", "Showtime!", "Countdown, hold screen,\nthen the movie starts"),
]
cw = 1280 // 4
for i, (n, head, text) in enumerate(steps):
    cx = i * cw + cw // 2
    d.ellipse([cx - 42, 130, cx + 42, 214], outline=GOLD + (255,), width=4)
    d.text((cx - d.textlength(n, font=num) / 2, 152), n, font=num, fill=GOLD + (255,))
    hf = ImageFont.truetype(BOLD, 26)
    d.text((cx - d.textlength(head, font=hf) / 2, 250), head, font=hf, fill=(255, 255, 255))
    for j, line in enumerate(text.split("\n")):
        d.text((cx - d.textlength(line, font=body) / 2, 300 + j * 32), line, font=body, fill=(200, 192, 185))
    if i < 3:
        ax = cx + cw // 2
        d.line([(ax - 30, 172), (ax + 30, 172)], fill=GOLD + (160,), width=3)
        d.polygon([(ax + 30, 164), (ax + 44, 172), (ax + 30, 180)], fill=GOLD + (160,))
foot = "Everything runs on your PC: no account needed, and the AI helpers are optional."
d.text(((1280 - d.textlength(foot, font=body)) / 2, 440), foot, font=body, fill=(160, 152, 148))
hw.save(f"{O}/how-it-works.png")
print("done")

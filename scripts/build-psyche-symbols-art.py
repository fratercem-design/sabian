from __future__ import annotations

import math
import re
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "outputs" / "PSYCHE-SYMBOLS-360.md"
ART_DIR = ROOT / "outputs" / "psyche-symbols-book" / "art"
PLATES = ART_DIR / "plates"
FRONTISPIECES = ART_DIR / "frontispieces"
COVER = ART_DIR / "cover.png"

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

SIGN_COLORS = {
    "Aries": (196, 63, 62),
    "Taurus": (171, 128, 54),
    "Gemini": (195, 177, 71),
    "Cancer": (112, 159, 184),
    "Leo": (214, 147, 51),
    "Virgo": (111, 151, 94),
    "Libra": (159, 111, 178),
    "Scorpio": (156, 58, 75),
    "Sagittarius": (91, 128, 176),
    "Capricorn": (116, 100, 87),
    "Aquarius": (64, 157, 169),
    "Pisces": (102, 111, 183),
}

CHAPTERS = {
    "Aries": "The First Signal",
    "Taurus": "The Sacred Vessel",
    "Gemini": "The Twin Transmission",
    "Cancer": "The House of Memory",
    "Leo": "The Living Flame",
    "Virgo": "The Sacred Workshop",
    "Libra": "The Hall of Mirrors",
    "Scorpio": "The Descent Chamber",
    "Sagittarius": "The Library Without Walls",
    "Capricorn": "The Storm Born Architect",
    "Aquarius": "The Living Network",
    "Pisces": "The Return to Mystery",
}


def fonts() -> dict[str, ImageFont.FreeTypeFont]:
    return {
        "display": ImageFont.truetype(r"C:\Windows\Fonts\GARA.TTF", 48),
        "display_bold": ImageFont.truetype(r"C:\Windows\Fonts\GARABD.TTF", 52),
        "display_small": ImageFont.truetype(r"C:\Windows\Fonts\GARA.TTF", 30),
        "body": ImageFont.truetype(r"C:\Windows\Fonts\calibri.ttf", 22),
        "body_bold": ImageFont.truetype(r"C:\Windows\Fonts\calibrib.ttf", 23),
        "tiny": ImageFont.truetype(r"C:\Windows\Fonts\calibri.ttf", 18),
    }


def parse_symbols() -> list[dict]:
    pattern = re.compile(
        r"^(\d+)\. \*\*(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces) (\d+) · ([^*]+)\.\*\* (.+)$"
    )
    entries = []
    for line in SOURCE.read_text(encoding="utf-8").splitlines():
        m = pattern.match(line)
        if m:
            entries.append({"index": int(m.group(1)), "sign": m.group(2), "degree": int(m.group(3)), "title": m.group(4), "image": m.group(5)})
    return entries


def palette(sign: str, seed: int) -> tuple[tuple[int, int, int], tuple[int, int, int], tuple[int, int, int]]:
    accent = SIGN_COLORS[sign]
    shift = (seed * 13) % 22
    bg = (25 + shift // 2, 12 + shift // 3, 47 + shift)
    paper = (245, 229, 190)
    return bg, accent, paper


def base_canvas(size: tuple[int, int], sign: str, seed: int) -> tuple[Image.Image, ImageDraw.ImageDraw, dict]:
    width, height = size
    bg, accent, paper = palette(sign, seed)
    img = Image.new("RGB", size, bg)
    draw = ImageDraw.Draw(img)
    # Deep-violet gradient and a faint orbital halo.
    for y in range(height):
        t = y / max(1, height - 1)
        color = tuple(int(bg[i] * (1 - t * 0.24) + (12, 7, 30)[i] * t * 0.24) for i in range(3))
        draw.line((0, y, width, y), fill=color)
    halo = Image.new("RGBA", size, (0, 0, 0, 0))
    halo_draw = ImageDraw.Draw(halo)
    cx, cy = width // 2, int(height * 0.55)
    radius = int(min(width, height) * 0.30)
    for ring in range(5):
        alpha = max(10, 32 - ring * 5)
        halo_draw.ellipse((cx - radius - ring * 24, cy - radius - ring * 24, cx + radius + ring * 24, cy + radius + ring * 24), outline=accent + (alpha,), width=2)
    img = Image.alpha_composite(img.convert("RGBA"), halo).convert("RGB")
    draw = ImageDraw.Draw(img)
    return img, draw, {"bg": bg, "accent": accent, "paper": paper, "cx": cx, "cy": cy, "radius": radius}


def category_for(entry: dict) -> str:
    text = (entry["title"] + " " + entry["image"]).lower()
    categories = [
        ("threshold", r"door|gate|threshold|entrance|exit|window|bridge|crossroads|border|boundary|passage|stair|road|path"),
        ("signal", r"signal|radio|microphone|broadcast|transmission|circuit|wire|static|frequency|telephone|receiver|antenna|screen|terminal"),
        ("light", r"lantern|flame|fire|candle|light|sun|glow|match|ember|coal|spotlight|lamp|dawn"),
        ("mirror", r"mirror|reflection|reflects|image|photograph|portrait|eyes|face|shadow"),
        ("water", r"water|rain|sea|lake|river|tide|well|shore|ocean|wave|flood|fog|mist|boat|cup|bowl"),
        ("voice", r"voice|speaks|said|song|sings|bell|message|letter|book|page|word|name|story|question|answer|lecture|choir|music|note"),
        ("authority", r"crown|throne|leader|council|judge|law|rule|official|office|king|queen|palace|order|rank|policy|contract|oath|verdict|medal"),
        ("growth", r"child|newborn|birth|seed|garden|tree|flower|orchard|fruit|root|vine|moss|green|bloom|cocoon|butterfly"),
        ("descent", r"dark|basement|underground|below|buried|secret|wound|scar|bone|coffin|funeral|venom|poison|ash|burned|night|midnight|cellar|drowned|ruined"),
        ("craft", r"tool|machine|clock|gear|ledger|archive|record|map|workshop|build|builder|architect|clerk|engineer|mechanic|weaver|seamstress|potter|blacksmith|artist|paint|draw|file|inventory|scale|measure|key"),
        ("relation", r"two|stranger|strangers|together|shared|partner|family|guest|rival|opponent|neighbor|another|community|council|choir|crowd|household|person|people|hands"),
        ("identity", r"mask|name|face|portrait|costume|role|uniform|title|identity|glove|clothes|crown"),
        ("body", r"body|hand|feet|bread|food|eat|meal|heart|mouth|tongue|back|chair|blanket|cloak|clothes|armor|blood|skin|sleep|rest"),
    ]
    for name, pattern in categories:
        if re.search(pattern, text):
            return name
    return "mystery"


def draw_glyph(draw: ImageDraw.ImageDraw, category: str, box: tuple[int, int, int, int], accent: tuple[int, int, int], paper: tuple[int, int, int], seed: int) -> None:
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    w, h = x1 - x0, y1 - y0
    line = max(3, w // 55)
    gold = paper
    if category == "threshold":
        draw.arc((x0 + w * .20, y0 + h * .14, x1 - w * .20, y1 + h * .34), 180, 360, fill=gold, width=line * 2)
        draw.line((x0 + w * .20, cy, x0 + w * .20, y1 - h * .18), fill=gold, width=line * 2)
        draw.line((x1 - w * .20, cy, x1 - w * .20, y1 - h * .18), fill=gold, width=line * 2)
        draw.line((cx, cy - h * .02, cx, y1 - h * .18), fill=accent, width=line)
    elif category in {"signal", "voice"}:
        draw.ellipse((cx - w * .08, cy - w * .08, cx + w * .08, cy + w * .08), fill=accent, outline=gold, width=line)
        for radius in [0.16, 0.25, 0.34]:
            draw.arc((cx - w * radius, cy - h * radius, cx + w * radius, cy + h * radius), 205, 335, fill=gold, width=line)
        draw.line((cx, cy + h * .10, cx, y1 - h * .12), fill=gold, width=line)
    elif category == "light":
        draw.ellipse((cx - w * .12, cy - h * .14, cx + w * .12, cy + h * .14), fill=accent, outline=gold, width=line)
        for i in range(12):
            angle = (i / 12) * math.tau + (seed % 11) * .03
            r0, r1 = w * .20, w * .38
            draw.line((cx + math.cos(angle) * r0, cy + math.sin(angle) * r0, cx + math.cos(angle) * r1, cy + math.sin(angle) * r1), fill=gold, width=line)
    elif category == "mirror":
        for i in range(4):
            inset = w * (.14 + i * .07)
            draw.rounded_rectangle((x0 + inset, y0 + inset, x1 - inset, y1 - inset), radius=int(w * .05), outline=gold if i % 2 else accent, width=line)
        draw.ellipse((cx - 5, cy - 5, cx + 5, cy + 5), fill=gold)
    elif category == "water":
        for row in range(4):
            y = y0 + h * (.30 + row * .13)
            points = []
            for i in range(13):
                xx = x0 + w * i / 12
                yy = y + math.sin(i * .85 + seed * .16 + row) * h * .035
                points.append((xx, yy))
            draw.line(points, fill=gold if row % 2 else accent, width=line + 1)
        draw.ellipse((cx - w * .10, y0 + h * .10, cx + w * .10, y0 + h * .30), outline=gold, width=line)
    elif category == "authority":
        pts = [(x0 + w * .20, y0 + h * .30), (x0 + w * .34, y0 + h * .10), (cx, y0 + h * .30), (x0 + w * .66, y0 + h * .10), (x1 - w * .20, y0 + h * .30), (x1 - w * .28, y1 - h * .22), (x0 + w * .28, y1 - h * .22)]
        draw.polygon(pts, outline=gold, fill=accent)
        draw.line((x0 + w * .25, y1 - h * .14, x1 - w * .25, y1 - h * .14), fill=gold, width=line * 2)
    elif category == "growth":
        draw.line((cx, y1 - h * .16, cx, y0 + h * .30), fill=gold, width=line * 2)
        for side, yy in [(-1, .52), (1, .42), (-1, .30)]:
            left = cx + side * w * .02
            right = cx + side * w * .23
            draw.ellipse((min(left, right), y0 + h * yy, max(left, right), y0 + h * (yy + .14)), fill=accent, outline=gold, width=line)
        draw.ellipse((cx - w * .13, y0 + h * .10, cx + w * .13, y0 + h * .32), fill=accent, outline=gold, width=line)
    elif category == "descent":
        for i in range(4):
            inset = w * (.12 + i * .075)
            draw.arc((x0 + inset, y0 + inset, x1 - inset, y1 - inset), 30 + i * 35, 300 + i * 35, fill=gold if i % 2 else accent, width=line)
        draw.polygon([(cx, y1 - h * .16), (cx - w * .09, y1 - h * .32), (cx + w * .09, y1 - h * .32)], fill=gold)
    elif category == "craft":
        draw.ellipse((cx - w * .22, cy - h * .22, cx + w * .22, cy + h * .22), outline=gold, width=line * 2)
        for i in range(8):
            angle = i * math.tau / 8
            a0, a1 = w * .23, w * .34
            draw.line((cx + math.cos(angle) * a0, cy + math.sin(angle) * a0, cx + math.cos(angle) * a1, cy + math.sin(angle) * a1), fill=accent, width=line * 3)
        draw.ellipse((cx - w * .08, cy - h * .08, cx + w * .08, cy + h * .08), fill=accent, outline=gold, width=line)
    elif category == "relation":
        r = w * .14
        for dx, dy in [(-.18, 0), (.18, 0), (0, -.17), (0, .17)]:
            draw.ellipse((cx + w * dx - r, cy + h * dy - r, cx + w * dx + r, cy + h * dy + r), fill=accent, outline=gold, width=line)
            draw.line((cx, cy, cx + w * dx, cy + h * dy), fill=gold, width=line)
    elif category == "identity":
        draw.ellipse((cx - w * .19, y0 + h * .12, cx + w * .19, y1 - h * .12), fill=accent, outline=gold, width=line * 2)
        draw.ellipse((cx - w * .08, cy - h * .08, cx - w * .02, cy - h * .02), fill=gold)
        draw.ellipse((cx + w * .02, cy - h * .08, cx + w * .08, cy - h * .02), fill=gold)
        draw.arc((cx - w * .09, cy, cx + w * .09, cy + h * .14), 10, 170, fill=gold, width=line)
    elif category == "body":
        draw.ellipse((cx - w * .12, y0 + h * .10, cx + w * .12, y0 + h * .34), fill=accent, outline=gold, width=line)
        draw.arc((cx - w * .27, y0 + h * .24, cx + w * .27, y1 - h * .10), 180, 360, fill=gold, width=line * 2)
        draw.line((cx, y0 + h * .36, cx, y1 - h * .12), fill=accent, width=line)
    else:
        for i in range(4):
            angle = seed * .1 + i * math.pi / 2
            r = w * (.08 + i * .06)
            draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=gold if i % 2 else accent, width=line)
        for i in range(8):
            x = x0 + (i + 1) * w / 9
            y = y0 + ((seed + i * 17) % 9 + 1) * h / 10
            draw.ellipse((x - 4, y - 4, x + 4, y + 4), fill=gold)


def draw_wrapped(draw: ImageDraw.ImageDraw, text: str, xy: tuple[int, int], font, fill, width: int, spacing: int = 6) -> None:
    lines = textwrap.wrap(text, width=width)
    draw.multiline_text(xy, "\n".join(lines), font=font, fill=fill, spacing=spacing, align="center", anchor="ma")


def plate(entry: dict, f: dict[str, ImageFont.FreeTypeFont]) -> Image.Image:
    img, draw, p = base_canvas((800, 800), entry["sign"], entry["index"])
    accent, paper = p["accent"], p["paper"]
    draw.text((400, 55), f"{entry['sign']} {entry['degree']}", font=f["body_bold"], fill=paper, anchor="ma")
    draw_wrapped(draw, entry["title"], (400, 105), f["display_small"], accent, 30, spacing=2)
    draw_glyph(draw, category_for(entry), (125, 215, 675, 685), accent, paper, entry["index"])
    draw.line((120, 716, 680, 716), fill=accent, width=2)
    draw_wrapped(draw, entry["image"], (400, 748), f["tiny"], paper, 55, spacing=2)
    return img


def frontispiece(sign: str, entries: list[dict], f: dict[str, ImageFont.FreeTypeFont]) -> Image.Image:
    img, draw, p = base_canvas((1200, 1600), sign, SIGNS.index(sign) + 1)
    accent, paper = p["accent"], p["paper"]
    draw.text((600, 130), sign, font=f["display_bold"], fill=paper, anchor="ma")
    draw.text((600, 210), CHAPTERS[sign], font=f["display"], fill=accent, anchor="ma")
    draw.line((180, 290, 1020, 290), fill=accent, width=3)
    # A large shared glyph plus twelve small degree points.
    draw_glyph(draw, category_for(entries[14]), (220, 380, 980, 1090), accent, paper, SIGNS.index(sign) + 1)
    for i in range(30):
        angle = (i / 30) * math.tau - math.pi / 2
        cx = 600 + math.cos(angle) * 420
        cy = 750 + math.sin(angle) * 420
        r = 8 if i != 14 else 14
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=paper if i != 14 else accent, outline=paper, width=2)
    draw.text((600, 1210), "Thirty mirrors", font=f["body_bold"], fill=paper, anchor="ma")
    draw_wrapped(draw, "A chamber of images for signal, shadow, and sovereignty.", (600, 1305), f["body"], accent, 46, spacing=8)
    draw.text((600, 1490), "THE PSYCHE SYMBOLS", font=f["tiny"], fill=paper, anchor="ma")
    return img


def cover(f: dict[str, ImageFont.FreeTypeFont]) -> Image.Image:
    img, draw, p = base_canvas((1200, 1800), "Pisces", 360)
    accent, paper = p["accent"], p["paper"]
    # Cover gets a more neutral antique-gold accent.
    accent = (190, 147, 64)
    draw.text((600, 300), "The Psyche Symbols", font=f["display_bold"], fill=(250, 244, 226), anchor="ma")
    draw_wrapped(draw, "360 Mirrors of Signal Shadow and Sovereignty", (600, 430), f["display"], accent, 34, spacing=6)
    draw_glyph(draw, "signal", (260, 650, 940, 1270), accent, paper, 360)
    draw.text((600, 1390), "A Cult of Psyche degree symbol book", font=f["body_bold"], fill=accent, anchor="ma")
    draw.text((600, 1530), "Original 2026 Edition", font=f["tiny"], fill=paper, anchor="ma")
    draw.text((600, 1680), "THE SIGNAL CONTINUES", font=f["tiny"], fill=accent, anchor="ma")
    return img


def main() -> None:
    entries = parse_symbols()
    if len(entries) != 360:
        raise SystemExit(f"Expected 360 source symbols, found {len(entries)}")
    PLATES.mkdir(parents=True, exist_ok=True)
    FRONTISPIECES.mkdir(parents=True, exist_ok=True)
    f = fonts()
    cover(f).save(COVER, quality=95)
    for sign in SIGNS:
        sign_entries = [e for e in entries if e["sign"] == sign]
        frontispiece(sign, sign_entries, f).save(FRONTISPIECES / f"{SIGNS.index(sign)+1:02d}-{sign}.png", quality=95)
    for entry in entries:
        plate(entry, f).save(PLATES / f"{entry['index']:03d}-{entry['sign']}-{entry['degree']:02d}.png", quality=95)
    print(f"Generated {len(entries)} plates, {len(SIGNS)} frontispieces, and 1 cover")


if __name__ == "__main__":
    main()

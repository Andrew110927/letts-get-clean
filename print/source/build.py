"""Build the Letts Get Clean print files.

For every piece in PIECES this makes print/<name>.pdf (the file for the printer, with bleed)
and print/<name>.png (a preview, cut to the finished size), then checks each PDF:
page size, fonts embedded, no launch prices, the phone number, and that every QR code
decodes, with two different readers, to exactly the right link.

    python print/source/build.py              # everything
    python print/source/build.py flyer-letter # just the pieces whose name starts with that

Prices and the phone number come from DEFAULTS in index.html, so after changing a price
there, run this again. Needs Google Chrome and:
    pip install segno pymupdf zxing-cpp opencv-python-headless pillow
"""
import base64
import math
import re
import subprocess
import sys
import tempfile
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np
import pymupdf
import segno
import zxingcpp
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
OUT = HERE.parent
REPO = OUT.parent
SITE = "https://andrew110927.github.io/letts-get-clean/"
CHROME_PATHS = [
    Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
    Path(r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"),
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
]
# Static (non-variable) fonts from Google Fonts: print shops' preflight checks are happier with these.
FONTS = {
    ("Anton", 400): "https://fonts.gstatic.com/s/anton/v27/1Ptgg87LROyAm0K0.ttf",
    ("Inter", 400): "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf",
    ("Inter", 600): "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZg.ttf",
    ("Inter", 700): "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf",
    ("Inter", 800): "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuDyYMZg.ttf",
    ("Inter", 900): "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuBWYMZg.ttf",
}
BG, ACCENT = "#07080B", "#29C8FF"
LAUNCH_PRICE = re.compile(r"\$\s*(25|30|50)(?!\d)")  # the launch deal ends Nov 16; print only regular prices


@dataclass
class Piece:
    name: str
    template: str
    trim: tuple  # finished width, height in inches
    safe: float  # margin inside the trim line, inches
    sides: tuple  # one label per PDF page
    qr: dict  # page index -> ?src= tag of the QR on that page
    preview_dpi: int
    vars: dict = field(default_factory=dict)
    bleed: float = 0.125

    @property
    def page(self):
        return (self.trim[0] + 2 * self.bleed, self.trim[1] + 2 * self.bleed)


PUNCH_FREE = {"reward": "FREE", "spot": "Free", "line": "Your 6th one is on us."}
PUNCH_HALF = {"reward": "HALF OFF", "spot": "Half<br>off", "line": "Your 6th one is half off."}
PIECES = [
    Piece("business-card", "business-card.html", (3.5, 2), 0.125, ("Front", "Back"), {0: "card"}, 300),
    Piece("punch-card-6th-free", "punch-card.html", (3.5, 2), 0.125, ("Front", "Back"), {0: "card"}, 300, PUNCH_FREE),
    Piece("punch-card-6th-half-off", "punch-card.html", (3.5, 2), 0.125, ("Front", "Back"), {0: "card"}, 300, PUNCH_HALF),
    # Magnets get rounded corners at the shop, so the safe margin is wider.
    Piece("car-magnet-12x18", "car-magnet.html", (18, 12), 0.5, ("Magnet",), {0: "magnet"}, 100, {"variant": "w18"}),
    Piece("car-magnet-12x24", "car-magnet.html", (24, 12), 0.5, ("Magnet",), {0: "magnet"}, 80, {"variant": "w24"}),
    Piece("yard-sign-18x24", "yard-sign.html", (24, 18), 0.75, ("Sign",), {0: "yardsign"}, 80),
    Piece("flyer-letter-8.5x11", "flyer-letter.html", (8.5, 11), 0.25, ("Flyer",), {0: "flyer"}, 200),
    Piece("flyer-half-page-5.5x8.5", "flyer-half.html", (5.5, 8.5), 0.25, ("Flyer",), {0: "flyer"}, 250),
]


def fail(msg):
    sys.exit("\nSTOPPED: " + msg)


def site_settings():
    """Prices and phone from DEFAULTS in index.html (the same numbers the site falls back to)."""
    src = (REPO / "index.html").read_text(encoding="utf-8")
    try:
        block = src[src.index("const DEFAULTS = {"):]
        block = block[: block.index("\n  };")]
    except ValueError:
        fail("couldn't find `const DEFAULTS = {` in index.html; update site_settings() in build.py.")
    s = {"phone": re.search(r'phone: "([^"]+)"', block).group(1)}
    for pid, regular in re.findall(r'id: "(\w+)", name: "[^"]+", deal: \d+, regular: (\d+)', block):
        s[pid] = int(regular)
    for pid, price in re.findall(r'\{ id: "(\w+)", label: "[^"]+", price: (\d+) \}', block):
        s[pid] = int(price)
    for k in ("bike", "house", "trash"):
        m = re.search(rf"\b{k}: \{{ price: (\d+) \}}", block)
        if m:
            s[k] = int(m.group(1))
    need = ["exterior", "interior", "full", "suv", "van", "freshener", "heavy", "wax", "bike", "house", "trash"]
    missing = [k for k in need if k not in s]
    if missing:
        fail(f"couldn't read these prices from DEFAULTS in index.html: {missing}. Update site_settings() in build.py.")
    return s


def font_css():
    folder = HERE / "fonts"
    folder.mkdir(exist_ok=True)
    rules = []
    for (family, weight), url in FONTS.items():
        f = folder / f"{family.lower()}-{weight}.ttf"
        if not f.exists():
            print(f"  downloading {family} {weight}")
            f.write_bytes(urllib.request.urlopen(url, timeout=60).read())
        data = base64.b64encode(f.read_bytes()).decode()
        rules.append(f'@font-face{{font-family:"{family}";font-weight:{weight};src:url(data:font/ttf;base64,{data}) format("truetype")}}')
    return "\n".join(rules)


def qr_code(tag):
    return segno.make(SITE + "?src=" + tag, error="m", micro=False)


def tape_svg(w, h, stripe):
    """The site's caution-tape stripes as plain vector shapes, w x h inches, stripes `stripe` inches thick."""
    period = stripe * 2 * math.sqrt(2)
    shapes, x = [], -h
    while x < w:
        shapes.append(f'<polygon points="{x:.4f},{h} {x + h:.4f},0 {x + h + period / 2:.4f},0 {x + period / 2:.4f},{h}"/>')
        x += period
    return (f'<svg viewBox="0 0 {w} {h}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'
            f'<rect width="{w}" height="{h}" fill="{BG}"/><g fill="{ACCENT}">{"".join(shapes)}</g></svg>')


# Runs in Chrome before printing: anything poking out of a .safe box is written onto the page,
# where check() finds it in the PDF text and stops the build.
OVERFLOW_PROBE = """<script>
document.fonts.ready.then(() => {
  const bad = [];
  document.querySelectorAll(".safe").forEach((safe, i) => {
    const box = safe.getBoundingClientRect();
    safe.querySelectorAll("*").forEach(el => {
      const r = el.getBoundingClientRect();
      // An inline span's box is Anton's full ascent + descent, taller than the letters; its line box is checked instead.
      const inline = getComputedStyle(el).display === "inline";
      if (r.width && (r.left < box.left - 1 || r.right > box.right + 1 || (!inline && (r.top < box.top - 1 || r.bottom > box.bottom + 1))))
        bad.push("page " + (i + 1) + ": " + el.tagName.toLowerCase() + " '" + (el.textContent || "").trim().slice(0, 40) + "'");
    });
  });
  if (bad.length) {
    const p = document.createElement("pre");
    p.style.cssText = "position:absolute;top:0;left:0;z-index:9;font:4pt monospace;color:#fff;background:#f00";
    p.textContent = "LAYOUT-OVERFLOW\\n" + bad.join("\\n");
    document.body.prepend(p);
  }
});
</script>"""
CHECK = '<svg class="ico" viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>'
STAR = '<svg class="star" viewBox="0 0 24 24"><path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7.3L12 17.6 5.7 21.5l1.7-7.3L2 9.5l7.1-.6z"/></svg>'


def render_html(piece, settings, fonts):
    pw, ph = piece.page
    head = (f'<meta charset="utf-8"><style>{fonts}\n{(HERE / "print.css").read_text(encoding="utf-8")}\n'
            f"@page{{size:{pw}in {ph}in;margin:0}}\n"
            f":root{{--pw:{pw}in;--ph:{ph}in;--bleed:{piece.bleed}in;--safe:{piece.safe}in}}</style>")
    mascot = "data:image/webp;base64," + base64.b64encode((REPO / "media" / "mascot.webp").read_bytes()).decode()
    lockup = "data:image/webp;base64," + base64.b64encode((REPO / "media" / "mascot-lockup.webp").read_bytes()).decode()

    def token(m):
        key, arg = m.group(1), m.group(2)
        if key == "head": return head
        if key == "mascot": return mascot
        if key == "lockup": return lockup
        if key == "phone": return settings["phone"]
        if key == "site": return SITE.removeprefix("https://").rstrip("/")
        if key == "price": return str(settings[arg])
        if key == "qr": return qr_code(arg).svg_inline(dark=BG, light="#FFFFFF", border=4, omitsize=True)
        if key == "tape": return tape_svg(*map(float, arg.split()))
        if key == "check": return CHECK
        if key == "star": return STAR
        if key in piece.vars: return piece.vars[key]
        fail(f"{piece.template} uses {{{{{key}}}}}, which build.py doesn't know.")

    html = (HERE / "templates" / piece.template).read_text(encoding="utf-8")
    return re.sub(r"\{\{(\w+)(?: ([^}]+))?\}\}", token, html).replace("</body>", OVERFLOW_PROBE + "\n</body>")


def find_chrome():
    for p in CHROME_PATHS:
        if p.exists():
            return p
    fail("couldn't find Google Chrome or Microsoft Edge.")


def print_pdf(chrome, html_file, pdf_file, profile):
    if pdf_file.exists():
        pdf_file.unlink()
    subprocess.run([str(chrome), "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--no-first-run",
                    f"--user-data-dir={profile}", "--virtual-time-budget=10000",
                    f"--print-to-pdf={pdf_file}", html_file.as_uri()], capture_output=True, timeout=180)
    if not pdf_file.exists():
        fail(f"Chrome didn't make {pdf_file.name}.")


def decode(rgb):
    """Every QR text found by zxing-cpp and by OpenCV in an RGB image, plus zxing's results for sizing."""
    z = zxingcpp.read_barcodes(rgb, formats=zxingcpp.BarcodeFormat.QRCode)
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    ok, texts, _, _ = cv2.QRCodeDetector().detectAndDecodeMulti(bgr)
    found = {t for t in (texts if ok else []) if t}
    if not found:
        # OpenCV's many-codes finder can lose a small code on a busy full page at low resolution;
        # its one-code finder doesn't (every page has at most one code).
        single, _, _ = cv2.QRCodeDetector().detectAndDecode(bgr)
        found = {single} if single else set()
    return {r.text for r in z}, found, z


def to_rgb(pix):
    return np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3].copy()


def check(piece, pdf_file, settings):
    """Returns (problems, notes) for one PDF."""
    problems, notes = [], []
    doc = pymupdf.open(pdf_file)
    if len(doc) != len(piece.sides):
        problems.append(f"has {len(doc)} pages, expected {len(piece.sides)} ({', '.join(piece.sides)})")
    text = ""
    for i, page in enumerate(doc):
        w, h = page.rect.width / 72, page.rect.height / 72
        if abs(w - piece.page[0]) > 0.01 or abs(h - piece.page[1]) > 0.01:
            problems.append(f"page {i + 1} is {w:.3f} x {h:.3f} in, expected {piece.page[0]} x {piece.page[1]}")
        for f in page.get_fonts(full=True):
            ftype, base = f[2], f[3]
            if ftype == "Type3" or not re.search(r"Anton|Inter", base):
                problems.append(f"page {i + 1} uses font {base} ({ftype}); only embedded Anton and Inter are expected")
        for info in page.get_image_info():
            wide_in = (info["bbox"][2] - info["bbox"][0]) / 72
            if wide_in > 0.2:
                notes.append(f"art on page {i + 1}: {info['width'] / wide_in:.0f} pixels per inch")
        text += page.get_text()
        # The QR: render the page at two sizes; both readers must find exactly the expected link.
        want = {SITE + "?src=" + piece.qr[i]} if i in piece.qr else set()
        for dpi in (piece.preview_dpi // 2, piece.preview_dpi):
            zx, cvt, zres = decode(to_rgb(page.get_pixmap(dpi=dpi)))
            for reader, got in (("zxing", zx), ("OpenCV", cvt)):
                if got != want:
                    problems.append(f"page {i + 1} at {dpi} dpi: {reader} read {sorted(got) or 'no QR'}, expected {sorted(want) or 'no QR'}")
            if want and zres and dpi == piece.preview_dpi:
                p = zres[0].position
                side_in = math.dist((p.top_left.x, p.top_left.y), (p.top_right.x, p.top_right.y)) / dpi
                modules = qr_code(piece.qr[i]).symbol_size(border=0)[0]
                notes.append(f"QR on page {i + 1}: {side_in:.2f} in wide, {side_in / modules * 25.4:.2f} mm per square")
    if "LAYOUT-OVERFLOW" in text:
        report = text[text.index("LAYOUT-OVERFLOW"):].splitlines()[1:6]
        problems.append("something sticks out of the safe area: " + " | ".join(report))
    if LAUNCH_PRICE.search(text):
        problems.append(f"shows a launch price: {LAUNCH_PRICE.search(text).group(0)!r}")
    if re.sub(r"\D", "", settings["phone"]) not in re.sub(r"\D", "", text):
        problems.append("the phone number is missing")
    return problems, notes


def preview(piece, pdf_file, png_file):
    """The finished look (cut at the trim line); two-sided pieces side by side with labels."""
    doc = pymupdf.open(pdf_file)
    b = piece.bleed * 72
    sides = []
    for page in doc:
        clip = pymupdf.Rect(b, b, page.rect.width - b, page.rect.height - b)
        pix = page.get_pixmap(dpi=piece.preview_dpi, clip=clip)
        sides.append(Image.fromarray(to_rgb(pix)))
    if len(sides) == 1:
        sides[0].save(png_file, optimize=True)
        return
    label = ImageFont.truetype(str(HERE / "fonts" / "inter-800.ttf"), 34)
    gap, top = 60, 70
    w = sum(s.width for s in sides) + gap * (len(sides) + 1)
    h = max(s.height for s in sides) + top + gap
    sheet = Image.new("RGB", (w, h), "#2A2F38")
    draw, x = ImageDraw.Draw(sheet), gap
    for side, name in zip(sides, piece.sides):
        draw.text((x, top - 50), name.upper(), font=label, fill="#F4F5F7")
        sheet.paste(side, (x, top))
        x += side.width + gap
    sheet.save(png_file, optimize=True)


def main():
    only = sys.argv[1:]
    pieces = [p for p in PIECES if not only or any(p.name.startswith(o) for o in only)]
    if not pieces:
        fail(f"no piece name starts with {only}. Pieces: {[p.name for p in PIECES]}")
    settings = site_settings()
    print("Prices from index.html DEFAULTS:", {k: v for k, v in settings.items() if k != "phone"})
    fonts, chrome = font_css(), find_chrome()
    build = HERE / "build"
    build.mkdir(exist_ok=True)
    all_problems = 0
    with tempfile.TemporaryDirectory() as profile:
        for piece in pieces:
            html_file = build / f"{piece.name}.html"
            html_file.write_text(render_html(piece, settings, fonts), encoding="utf-8")
            pdf_file, png_file = OUT / f"{piece.name}.pdf", OUT / f"{piece.name}.png"
            print_pdf(chrome, html_file, pdf_file, profile)
            problems, notes = check(piece, pdf_file, settings)
            preview(piece, pdf_file, png_file)
            zx, cvt, _ = decode(np.array(Image.open(png_file).convert("RGB")))
            want = {SITE + "?src=" + t for t in piece.qr.values()}
            if zx != want or cvt != want:
                problems.append(f"preview PNG: zxing read {sorted(zx)}, OpenCV read {sorted(cvt)}, expected {sorted(want)}")
            all_problems += len(problems)
            status = "OK " if not problems else "BAD"
            print(f"{status} {piece.name}: {piece.trim[0]} x {piece.trim[1]} in + {piece.bleed} in bleed, "
                  f"QR -> {', '.join(sorted(want))}")
            for n in notes:
                print("      " + n)
            for p in problems:
                print("    ! " + p)
    if all_problems:
        fail(f"{all_problems} problem(s) above.")
    print("\nAll pieces built and checked.")


if __name__ == "__main__":
    main()

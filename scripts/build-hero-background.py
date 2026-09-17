"""Фон первого экрана: мастер -> грейдинг -> достройка холста -> нарезка -> ссылки в index.html.

Запуск из корня репозитория:  python -B scripts/build-hero-background.py

Цепочка (docs/source-photos/README.md):
  docs/source-photos/duo-wide.jpg
    -> scripts/grade-hero-photo.py      build/hero-background/graded.png
    -> scripts/extend-hero-canvas.py    build/hero-background/extended.png (2859x1990)
    -> этот скрипт                      site/assets/hero-duo-air-*, hero-duo-mob-*

Геометрия не меняется, меняется только качество пикселей:
- широкий кадр: ширины 640/1024/1440/2048/2859, пропорция 2859:1990;
- мобильный кадр: вырезка AIR_TO_MOB из широкого 2859x1990, затем 1170/760/480.
  Вырезка восстановлена 2026-09-17 сопоставлением прежних файлов
  (hero-duo-mob-1170w.2a4874c6 против hero-duo-air-2859w.0b0a31ec, FFT + перебор,
  СКО ~1.7 уровня яркости, то есть шум сжатия).

Кодирование — замер 2026-09-17 на самом тёмном участке за заголовком (2859w,
яркость 9..48). «Зерно» — СКО высоких частот относительно PNG (1.0 = как в PNG),
«пятна» — доля блоков 16x16 без текстуры (у PNG 0.29):
  вариант                    КБ   зерно  пятна
  WebP q88                  138          (сетка 16x16 видна)  <- было на сайте
  WebP q95                  350   0.70   0.46
  JPEG q92 4:4:4            557   0.95   0.26
  AVIF q80 4:2:0            104   0.36   0.87   <- зерно сглажено в плоские пятна
  AVIF q88 4:4:4            212   0.55   0.78
  AVIF q75 4:4:4 grain=8     82   1.36   0.00   <- основной формат
AVIF с синтезом плёночного зерна (denoise-noise-level): кодировщик убирает зерно
перед сжатием и передаёт его параметры, декодер накладывает зерно обратно. Если
декодер зерно не накладывает, остаётся ровный градиент без пятен.
WebP и JPEG — запасные форматы для браузеров без AVIF.
"""
import hashlib
import io
import json
import re
import runpy
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "site" / "assets"
INDEX = ROOT / "site" / "index.html"
FIXTURE = ROOT / "tests" / "visual" / "fixtures" / "hero-figure-contour.json"
EXTENDED = ROOT / "build" / "hero-background" / "extended.png"

AIR_WIDTHS = (640, 1024, 1440, 2048, 2859)
MOB_WIDTHS = (480, 760, 1170)
AIR_SIZE = (2859, 1990)
AIR_TO_MOB = (858, 398, 858 + 1872, 398 + 1592)   # x0, y0, x1, y1 в широком кадре 2859x1990
MOB_RATIO = 1170 / 995
FORMATS = (
    ("avif", "AVIF", {"quality": 75, "subsampling": "4:4:4", "advanced": {"denoise-noise-level": "8"}}),
    ("webp", "WEBP", {"quality": 90, "method": 6}),
    ("jpg", "JPEG", {"quality": 88, "subsampling": 0, "optimize": True, "progressive": True}),
)
NAME = re.compile(r"hero-duo-(air|mob)-(\d+)w\.[0-9a-f]{8}\.(avif|jpg|webp)")


def encode(im, stem):
    names = {}
    for ext, fmt, opts in FORMATS:
        buf = io.BytesIO()
        im.save(buf, fmt, **opts)
        data = buf.getvalue()
        name = "%s.%s.%s" % (stem, hashlib.sha256(data).hexdigest()[:8], ext)
        (ASSETS / name).write_bytes(data)
        names[ext] = name
        print("  %-40s %4d KB" % (name, len(data) // 1024))
    return names


def rewrite_markup(html, mapping):
    """Имена файлов по карте; AVIF-источник перед каждым WebP-источником фона; preload на AVIF."""
    old = set(NAME.findall(html) and [m.group(0) for m in NAME.finditer(html)])
    # 1. прежние AVIF-источники фона убрать, чтобы вставка была идемпотентной
    html = re.sub(r'\n[ \t]*<source[^>]*type="image/avif"[^>]*hero-duo-(?:air|mob)-[^>]*>', "", html)
    # 2. перед каждым WebP-источником фона вставить такой же с AVIF
    def add_avif(match):
        indent, tag = match.group(1), match.group(2)
        avif = tag.replace('type="image/webp"', 'type="image/avif"').replace(".webp", ".avif")
        return "%s%s%s%s" % (indent, avif, indent, tag)
    html, sources = re.subn(r'(\n[ \t]*)(<source[^>]*type="image/webp"[^>]*hero-duo-(?:air|mob)-[^>]*>)', add_avif, html)
    # 3. preload первого экрана — на AVIF (браузер без AVIF пропустит preload по type).
    #    Раньше preload был без media, и телефон качал десктопный кадр, который не
    #    показывает (замер 2026-09-17: 390@3x грузил и air-1440, и mob-1170). Теперь
    #    два preload с media: десктопный от 861 px и мобильный до 860 px.
    html = re.sub(r'\n<link rel="preload" as="image"[^>]*hero-duo-mob-[^>]*>', "", html)
    def preload(match):
        tag = match.group(0).replace('type="image/webp"', 'type="image/avif"').replace(".webp", ".avif")
        tag = re.sub(r' media="[^"]*"', "", tag).replace('<link rel="preload" as="image"', '<link rel="preload" as="image" media="(min-width: 861px)"', 1)
        mob = ", ".join("assets/hero-duo-mob-%dw.00000000.avif %dw" % (w, w) for w in MOB_WIDTHS)
        mobile = ('<link rel="preload" as="image" media="(max-width: 860px)" href="assets/hero-duo-mob-760w.00000000.avif" '
                  'imagesrcset="%s" imagesizes="100vw" type="image/avif">' % mob)
        return tag + "\n" + mobile
    html, preloads = re.subn(r'<link rel="preload" as="image"[^>]*hero-duo-air-[^>]*>', preload, html)
    # 4. все имена — на новые файлы
    html = NAME.sub(lambda m: mapping[(m.group(1), int(m.group(2)), m.group(3))], html)
    return html, old, sources, preloads


def main():
    runpy.run_path(str(ROOT / "scripts" / "grade-hero-photo.py"), run_name="__main__")
    runpy.run_path(str(ROOT / "scripts" / "extend-hero-canvas.py"), run_name="__main__")
    air = Image.open(EXTENDED).convert("RGB")
    if air.size != AIR_SIZE:
        raise SystemExit("extended.png %s, ожидалось %s — геометрия сменилась, сверить AIR_TO_MOB" % (air.size, AIR_SIZE))

    mapping = {}
    for w in AIR_WIDTHS:
        im = air if w == AIR_SIZE[0] else air.resize((w, round(AIR_SIZE[1] * w / AIR_SIZE[0])), Image.LANCZOS)
        for ext, name in encode(im, "hero-duo-air-%dw" % w).items():
            mapping[("air", w, ext)] = name
    mob = air.crop(AIR_TO_MOB)
    for w in MOB_WIDTHS:
        im = mob.resize((w, round(w / MOB_RATIO)), Image.LANCZOS)
        for ext, name in encode(im, "hero-duo-mob-%dw" % w).items():
            mapping[("mob", w, ext)] = name

    html, old_names, sources, preloads = rewrite_markup(INDEX.read_text(encoding="utf-8"), mapping)
    if sources != 2 or preloads != 1:
        raise SystemExit("разметка фона не распознана: webp-источников %d (ожидалось 2), preload %d (ожидался 1)" % (sources, preloads))
    INDEX.write_text(html, encoding="utf-8", newline="\n")
    print("index.html: AVIF-источников добавлено %d, preload переведён на AVIF" % sources)

    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    fixture["source"] = "site/assets/" + mapping[("air", 1440, "avif")]
    FIXTURE.write_text(json.dumps(fixture, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")

    for name in sorted(set(old_names) - set(mapping.values())):
        path = ASSETS / name
        if path.exists():
            path.unlink()
            print("удалён прежний файл", name)


if __name__ == "__main__":
    main()

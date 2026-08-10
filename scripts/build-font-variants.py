#!/usr/bin/env python3
"""Собирает варианты лендинга с разными шрифтовыми наборами.

Каждый вариант — самостоятельная копия site/ со своими локальными .woff2:
ни одного обращения к сторонним хостам во время загрузки страницы.

Покрытие кириллицы проверяется НЕ по названию поднабора в CSS, а по таблице
символов самого файла (cmap). Причина в docs/FONT-VARIANTS.md: Archivo
объявлялся как загруженный, но русский текст рисовался системным шрифтом.

    python scripts/build-font-variants.py            # все варианты
    python scripts/build-font-variants.py 2          # только второй
"""

from __future__ import annotations

import io
import re
import shutil
import subprocess
import sys
from pathlib import Path

from fontTools.ttLib import TTFont

from action_bar_addon import install_action_bar, verify_action_bar_install

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
OUT = ROOT / "build" / "font-variants"

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

# Поднаборы, которые кладём рядом с сайтом. cyrillic обязателен —
# без него страница молча уедет в системный шрифт.
SUBSETS = ("cyrillic-ext", "cyrillic", "latin-ext", "latin")
REQUIRED = ("cyrillic",)

# Диапазон кириллицы, по которому считаем реальное покрытие файла.
CYRILLIC_RANGE = range(0x0400, 0x0460)

VARIANTS = {
    1: {
        "slug": "v1-playfair-onest",
        "name": "Нынешний",
        "serif": {"family": "Playfair Display", "query": "Playfair+Display:ital,wght@0,400..700;1,400..700",
                  "weight": "400 700", "italic": True},
        "body": {"family": "Onest", "query": "Onest:wght@400..800", "weight": "400 800"},
    },
    2: {
        "slug": "v2-lora-inter",
        "name": "Спокойный классический",
        "serif": {"family": "Lora", "query": "Lora:ital,wght@0,400..700;1,400..700",
                  "weight": "400 700", "italic": True},
        "body": {"family": "Inter", "query": "Inter:wght@400..800", "weight": "400 800"},
    },
    3: {
        "slug": "v3-literata-manrope",
        "name": "Экранный, максимум читаемости",
        "serif": {"family": "Literata", "query": "Literata:ital,wght@0,400..700;1,400..700",
                  "weight": "400 700", "italic": True},
        "body": {"family": "Manrope", "query": "Manrope:wght@400..800", "weight": "400 800"},
    },
    4: {
        "slug": "v4-ptserif-golos",
        "name": "Как на профильном рынке",
        # PT Serif непеременный: веса запрашиваются поштучно, иначе API отдаёт 400.
        "serif": {"family": "PT Serif", "query": "PT+Serif:ital,wght@0,400;0,700;1,400;1,700",
                  "weight": "400 700", "italic": True, "static": True},
        "body": {"family": "Golos Text", "query": "Golos+Text:wght@400..900", "weight": "400 900"},
    },
}


def fetch(url: str) -> bytes:
    out = subprocess.run(["curl", "-sS", "--max-time", "60", "-A", UA, url],
                         capture_output=True, check=True)
    return out.stdout


def parse_css(css: str) -> list[dict]:
    """Разбирает ответ Google Fonts на блоки @font-face."""
    faces = []
    for block in re.finditer(
        r"/\*\s*([\w-]+)\s*\*/\s*@font-face\s*\{(.*?)\}", css, re.S
    ):
        subset, body = block.group(1), block.group(2)
        url = re.search(r"src:\s*url\((https://[^)]+\.woff2)\)", body)
        if not url:
            continue
        style = re.search(r"font-style:\s*(\w+)", body)
        weight = re.search(r"font-weight:\s*([\d ]+)", body)
        urange = re.search(r"unicode-range:\s*([^;]+);", body)
        faces.append({
            "subset": subset,
            "url": url.group(1),
            "style": style.group(1) if style else "normal",
            "weight": (weight.group(1).strip() if weight else "400"),
            "range": urange.group(1).strip() if urange else "",
        })
    return faces


def cyrillic_glyphs(data: bytes) -> int:
    """Сколько кириллических кодов реально есть в таблице символов файла."""
    font = TTFont(io.BytesIO(data), fontNumber=0, lazy=True)
    codes = set()
    for table in font["cmap"].tables:
        codes.update(table.cmap.keys())
    font.close()
    return sum(1 for c in CYRILLIC_RANGE if c in codes)


def slugify(family: str, style: str, subset: str) -> str:
    base = family.lower().replace(" ", "-")
    return f"{base}-{style}-{subset}.woff2"


def build(n: int) -> dict:
    spec = VARIANTS[n]
    dest = OUT / spec["slug"]
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(SITE, dest)
    # старые шрифты варианту не нужны
    shutil.rmtree(dest / "fonts")
    (dest / "fonts").mkdir()

    css_parts = [
        "/* ==========================================================================",
        f"   Шрифтовой набор варианта {n} — {spec['name']}",
        f"   {spec['serif']['family']} (заголовки) + {spec['body']['family']} (текст)",
        "   Сгенерировано scripts/build-font-variants.py — руками не править.",
        "   Покрытие кириллицы проверено по cmap каждого файла, а не по названию",
        "   поднабора: см. историю с Archivo в docs/FONT-VARIANTS.md.",
        "   ========================================================================== */",
        "",
    ]
    report = {"variant": n, "slug": spec["slug"], "name": spec["name"], "fonts": [], "total": 0}
    preloads = []

    for role in ("serif", "body"):
        cfg = spec[role]
        css = fetch(f"https://fonts.googleapis.com/css2?family={cfg['query']}&display=swap").decode()
        faces = parse_css(css)
        if not faces:
            raise SystemExit(f"пустой CSS для {cfg['family']} — проверьте запрос")

        seen_subsets = {f["subset"] for f in faces}
        for need in REQUIRED:
            if need not in seen_subsets:
                raise SystemExit(f"{cfg['family']}: в CSS нет поднабора «{need}» — шрифт не подходит")

        for face in faces:
            if face["subset"] not in SUBSETS:
                continue
            if face["style"] == "italic" and not cfg.get("italic"):
                continue
            data = fetch(face["url"])
            fname = slugify(cfg["family"], face["style"], face["subset"])
            if cfg.get("static"):
                fname = fname.replace(".woff2", f"-{face['weight'].replace(' ', '-')}.woff2")
            (dest / "fonts" / fname).write_bytes(data)

            cyr = cyrillic_glyphs(data) if "cyrillic" in face["subset"] else 0
            report["fonts"].append({
                "family": cfg["family"], "role": role, "style": face["style"],
                "subset": face["subset"], "file": fname, "bytes": len(data),
                "cyrillic_glyphs": cyr,
            })
            report["total"] += len(data)

            weight = cfg["weight"] if not cfg.get("static") else face["weight"]
            css_parts += [
                f"/* {cfg['family']} · {face['style']} · {face['subset']} */",
                "@font-face {",
                f"  font-family: '{cfg['family']}';",
                f"  font-style: {face['style']};",
                f"  font-weight: {weight};",
                "  font-display: swap;",
                f"  src: url(fonts/{fname}) format('woff2');",
                f"  unicode-range: {face['range']};" if face["range"] else "",
                "}",
                "",
            ]
            if face["subset"] == "cyrillic" and face["style"] == "normal":
                preloads.append(f"fonts/{fname}")

    (dest / "fonts.css").write_text("\n".join(p for p in css_parts if p is not None) + "\n",
                                    encoding="utf-8")

    # подмена токенов
    styles = (dest / "styles.css").read_text(encoding="utf-8")
    styles = re.sub(r'--font-serif:[^;]+;',
                    f'--font-serif: "{spec["serif"]["family"]}", Georgia, "Times New Roman", serif;',
                    styles, count=1)
    styles = re.sub(r'--font-body:[^;]+;',
                    f'--font-body: "{spec["body"]["family"]}", Helvetica, Arial, sans-serif;',
                    styles, count=1)
    (dest / "styles.css").write_text(styles, encoding="utf-8")

    # подмена preload-ссылок
    html = (dest / "index.html").read_text(encoding="utf-8")
    html = re.sub(r'\n<link rel="preload" href="fonts/[^"]+\.woff2"[^>]*>', "", html)
    tags = "".join(
        f'\n<link rel="preload" href="{p}" as="font" type="font/woff2" crossorigin>'
        for p in preloads
    )
    html = html.replace('\n<link rel="stylesheet" href="fonts.css">',
                        tags + '\n<link rel="stylesheet" href="fonts.css">', 1)
    # пометка варианта в title, чтобы вкладки не путались
    html = html.replace("<title>", f"<!-- вариант {n}: {spec['name']} -->\n<title>", 1)
    (dest / "index.html").write_text(html, encoding="utf-8")

    install_action_bar(dest)

    return report


def verify(report: dict) -> list[str]:
    """Проверки, которые должны пройти до публикации."""
    dest = OUT / report["slug"]
    problems = []

    for f in report["fonts"]:
        if f["subset"] == "cyrillic" and f["cyrillic_glyphs"] < 60:
            problems.append(
                f"{f['family']} ({f['style']}): в кириллическом файле только "
                f"{f['cyrillic_glyphs']} символов из 96 — набор неполный")

    css = (dest / "fonts.css").read_text(encoding="utf-8")
    html = (dest / "index.html").read_text(encoding="utf-8")
    styles = (dest / "styles.css").read_text(encoding="utf-8")

    # все файлы, на которые ссылается CSS, существуют
    for m in re.finditer(r"url\((fonts/[^)]+)\)", css):
        if not (dest / m.group(1)).exists():
            problems.append(f"в fonts.css ссылка на несуществующий файл {m.group(1)}")

    # ни одного обращения к внешним хостам
    for f in ("index.html", "fonts.css", "styles.css"):
        text = (dest / f).read_text(encoding="utf-8")
        for m in re.finditer(r"https?://(?!schema\.org)[^\s\"')]+", text):
            if "fonts.g" in m.group(0) or ".woff" in m.group(0):
                problems.append(f"{f}: осталась внешняя ссылка на шрифт {m.group(0)}")

    # семейства из набора реально прописаны в токенах
    for role in ("serif", "body"):
        fam = VARIANTS[report["variant"]][role]["family"]
        if f'"{fam}"' not in styles:
            problems.append(f"токен --font-{role} не указывает на {fam}")
        if f"'{fam}'" not in css:
            problems.append(f"в fonts.css нет @font-face для {fam}")

    # старых шрифтов не осталось
    for old in ("Onest", "Playfair Display"):
        if report["variant"] != 1 and f"'{old}'" in css:
            problems.append(f"в наборе остался старый шрифт {old}")

    # preload ведёт на существующий файл
    for m in re.finditer(r'rel="preload" href="(fonts/[^"]+)"', html):
        if not (dest / m.group(1)).exists():
            problems.append(f"preload ведёт на несуществующий {m.group(1)}")

    problems.extend(verify_action_bar_install(dest))

    return problems


def main() -> int:
    which = [int(a) for a in sys.argv[1:]] or sorted(VARIANTS)
    OUT.mkdir(parents=True, exist_ok=True)
    failed = False
    for n in which:
        print(f"\n=== Вариант {n}: {VARIANTS[n]['name']}")
        rep = build(n)
        for f in rep["fonts"]:
            mark = ""
            if f["subset"] == "cyrillic":
                mark = f"  кириллица: {f['cyrillic_glyphs']}/96 символов"
            print(f"   {f['family']:<18} {f['style']:<7} {f['subset']:<12} "
                  f"{f['bytes']/1024:6.1f} КБ{mark}")
        print(f"   ИТОГО: {rep['total']/1024:.1f} КБ")
        problems = verify(rep)
        if problems:
            failed = True
            print("   ПРОВЕРКА НЕ ПРОЙДЕНА:")
            for p in problems:
                print("     ✗", p)
        else:
            print("   Проверка пройдена: кириллица на месте, внешних ссылок нет, "
                  "файлы существуют.")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())

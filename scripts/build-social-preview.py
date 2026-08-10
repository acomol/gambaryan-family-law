#!/usr/bin/env python3
"""Build and verify the landing social-preview logo image.

The metadata block in ``site/index.html`` is the source of truth. Its
``SOCIAL-PREVIEW`` marker carries the required version and date; changing the
visual or metadata contract requires updating both values and the versioned
asset filename.

Usage:
    python scripts/build-social-preview.py
    python scripts/build-social-preview.py --check
"""

from __future__ import annotations

import base64
import html as html_module
import re
import struct
import sys
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
INDEX = SITE / "index.html"
STANDALONE = SITE / "gambarian-standalone.html"
DOC = ROOT / "docs" / "SOCIAL-PREVIEW.md"
MARKER_RE = re.compile(
    r"SOCIAL-PREVIEW\s+v(\d+\.\d+\.\d+)\s*\|\s*(\d{4}-\d{2}-\d{2})"
)
DOC_VERSION_RE = re.compile(r"\*\*Версия контракта:\*\*\s*`([^`]+)`")
DOC_DATE_RE = re.compile(r"\*\*Обновлено:\*\*\s*`([^`]+)`")
EXPECTED_WIDTH = 1200
EXPECTED_HEIGHT = 630
MAX_IMAGE_BYTES = 5_000_000


def meta(html: str, key: str, attribute: str = "property") -> str:
    pattern = rf'<meta\s+{attribute}="{re.escape(key)}"\s+content="([^"]*)"\s*/?>'
    matches = re.findall(pattern, html)
    if len(matches) != 1:
        raise ValueError(f"{key}: ожидался один meta-тег, найдено {len(matches)}")
    return html_module.unescape(matches[0])


def contract() -> dict[str, str | int | Path]:
    source = INDEX.read_text(encoding="utf-8")
    marker = MARKER_RE.search(source)
    if not marker:
        raise ValueError("маркер SOCIAL-PREVIEW vX.Y.Z | YYYY-MM-DD не найден")

    image_url = meta(source, "og:image")
    parsed = urlparse(image_url)
    filename = Path(parsed.path).name
    return {
        "source": source,
        "version": marker.group(1),
        "date": marker.group(2),
        "image_url": image_url,
        "filename": filename,
        "output": SITE / filename,
        "width": int(meta(source, "og:image:width")),
        "height": int(meta(source, "og:image:height")),
        "alt": meta(source, "og:image:alt"),
    }


def font_data(filename: str) -> str:
    data = (SITE / "fonts" / filename).read_bytes()
    return base64.b64encode(data).decode("ascii")


def render(info: dict[str, str | int | Path]) -> None:
    try:
        from playwright.sync_api import Error as PlaywrightError
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise SystemExit("для сборки social preview нужен Python Playwright") from exc

    width = int(info["width"])
    height = int(info["height"])
    cyrillic = font_data("onest-normal-400-800-cyrillic.37bc1687.woff2")
    latin = font_data("onest-normal-400-800-latin.67849bcc.woff2")
    document = f"""<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><style>
@font-face {{
  font-family: 'Onest Social'; font-style: normal; font-weight: 400 800;
  src: url(data:font/woff2;base64,{cyrillic}) format('woff2');
  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}}
@font-face {{
  font-family: 'Onest Social'; font-style: normal; font-weight: 400 800;
  src: url(data:font/woff2;base64,{latin}) format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC,
    U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F,
    U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}}
* {{ box-sizing: border-box; }}
html, body {{ width: {width}px; height: {height}px; margin: 0; overflow: hidden; }}
body {{
  display: grid; place-items: center; background: #101214;
  color: #fff; font-family: 'Onest Social', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}}
.frame {{
  position: absolute; inset: 42px; border: 1px solid rgba(240, 174, 31, .22);
}}
.logo {{ display: flex; flex-direction: column; gap: 16px; width: 920px; }}
.word {{
  font-size: 64px; font-weight: 800; line-height: 1.12; letter-spacing: .06em;
  text-align: center; text-transform: uppercase; white-space: nowrap;
}}
.amp {{ color: #f0ae1f; }}
.rule {{ display: flex; align-items: center; gap: 28px; }}
.line {{ height: 4px; flex: 1; background: #f0ae1f; opacity: .85; }}
.sub {{
  color: #f0ae1f; font-size: 27px; font-weight: 600; line-height: 1;
  letter-spacing: .32em; text-transform: uppercase; white-space: nowrap;
}}
</style></head><body>
<div class="frame" aria-hidden="true"></div>
<div class="logo" role="img" aria-label="{html_module.escape(str(info['alt']))}">
  <div class="word">Гамбарян <span class="amp">&amp;</span> Партнёры</div>
  <div class="rule"><span class="line"></span><span class="sub">Адвокаты</span></div>
</div>
</body></html>"""

    with sync_playwright() as playwright:
        try:
            browser = playwright.chromium.launch(headless=True)
        except PlaywrightError:
            # Maintainer fallback: Windows usually has Chrome, while CI installs
            # Playwright Chromium pinned by requirements-build.txt.
            browser = playwright.chromium.launch(channel="chrome", headless=True)
        try:
            page = browser.new_page(viewport={"width": width, "height": height})
            page.set_content(document, wait_until="load")
            page.evaluate("document.fonts.ready")
            page.screenshot(path=str(info["output"]))
        finally:
            browser.close()


def png_dimensions(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    if not data.startswith(b"\x89PNG\r\n\x1a\n") or data[12:16] != b"IHDR":
        raise ValueError(f"{path.name}: ожидался PNG")
    return struct.unpack(">II", data[16:24])


def verify(info: dict[str, str | int | Path]) -> list[str]:
    source = str(info["source"])
    image_url = str(info["image_url"])
    output = Path(info["output"])
    problems: list[str] = []

    try:
        og_url = meta(source, "og:url")
        if not og_url.startswith("https://"):
            problems.append("og:url должен быть абсолютным HTTPS URL")
        if urlparse(og_url).netloc != urlparse(image_url).netloc:
            problems.append("og:url и og:image должны использовать один публичный host")
    except ValueError as exc:
        problems.append(str(exc))
    if not image_url.startswith("https://"):
        problems.append("og:image должен быть абсолютным HTTPS URL")
    if f"v{info['version']}" not in str(info["filename"]):
        problems.append("версия из маркера отсутствует в имени PNG")
    if (info["width"], info["height"]) != (EXPECTED_WIDTH, EXPECTED_HEIGHT):
        problems.append("размер в meta должен быть 1200x630")

    expected = {
        "og:image:secure_url": image_url,
        "og:image:type": "image/png",
        "twitter:card": "summary_large_image",
        "twitter:image": image_url,
        "twitter:image:alt": str(info["alt"]),
    }
    for key, value in expected.items():
        try:
            actual = meta(source, key, "name" if key.startswith("twitter:") else "property")
            if actual != value:
                problems.append(f"{key}: {actual!r}, ожидалось {value!r}")
        except ValueError as exc:
            problems.append(str(exc))

    try:
        if meta(source, "twitter:title", "name") != meta(source, "og:title"):
            problems.append("twitter:title должен совпадать с og:title")
        if meta(source, "twitter:description", "name") != meta(source, "og:description"):
            problems.append("twitter:description должен совпадать с og:description")
    except ValueError as exc:
        problems.append(str(exc))

    if not output.exists():
        problems.append(f"нет файла {output.relative_to(ROOT)}")
    else:
        try:
            if png_dimensions(output) != (EXPECTED_WIDTH, EXPECTED_HEIGHT):
                problems.append("фактический PNG должен быть 1200x630")
        except ValueError as exc:
            problems.append(str(exc))
        size = output.stat().st_size
        if size <= 5_000 or size > MAX_IMAGE_BYTES:
            problems.append(f"неожиданный размер PNG: {size} bytes")

    doc = DOC.read_text(encoding="utf-8")
    doc_version = DOC_VERSION_RE.search(doc)
    doc_date = DOC_DATE_RE.search(doc)
    if not doc_version or doc_version.group(1) != info["version"]:
        problems.append("версия docs/SOCIAL-PREVIEW.md не совпадает с HTML marker")
    if not doc_date or doc_date.group(1) != info["date"]:
        problems.append("дата docs/SOCIAL-PREVIEW.md не совпадает с HTML marker")
    if "## Related" not in doc:
        problems.append("в docs/SOCIAL-PREVIEW.md нет обязательной секции Related")

    if STANDALONE.exists():
        standalone = STANDALONE.read_text(encoding="utf-8")
        try:
            if meta(standalone, "og:image") != image_url:
                problems.append("standalone использует другой og:image")
            if meta(standalone, "twitter:image", "name") != image_url:
                problems.append("standalone использует другой twitter:image")
        except ValueError as exc:
            problems.append(f"standalone: {exc}")

    return problems


def main() -> int:
    check_only = "--check" in sys.argv[1:]
    info = contract()
    if not check_only:
        render(info)

    problems = verify(info)
    if problems:
        for problem in problems:
            print(f"ERROR: {problem}")
        return 1

    mode = "check" if check_only else "build"
    print(
        f"Social preview v{info['version']} ({info['date']}): {mode} PASS; "
        f"{info['filename']} {info['width']}x{info['height']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

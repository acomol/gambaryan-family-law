"""HEAD-TOP-MEASURE v1.0.0 | 2026-09-07.

Measure the documented row-background contrast and save visual evidence.
"""
from __future__ import annotations

import argparse
from datetime import date
import io
import json
from pathlib import Path
from statistics import median

from PIL import Image, ImageDraw


def head_top(image: Image.Image) -> int:
    image = image.convert("RGB")
    width, height = image.size
    edge = max(1, int(width * .1))
    start, end = int(width * .3), int(width * .7)
    run = 0
    for y in range(height):
        row = list(image.crop((0, y, width, y + 1)).get_flattened_data())
        background = tuple(median(p[c] for p in row[:edge] + row[-edge:])
                           for c in range(3))
        hits = sum(sum(abs(p[c] - background[c]) for c in range(3)) > 90
                   for p in row[start:end])
        run = run + 1 if hits >= .03 * (end - start) else 0
        if run == 4:
            return y - 3
    raise ValueError("No four consecutive foreground rows detected")


def measure(image: Image.Image, out: Path, name: str, metadata: dict) -> dict:
    top = head_top(image)
    marked = image.convert("RGB")
    draw = ImageDraw.Draw(marked)
    draw.line((0, top, image.width - 1, top), fill="#00ff55", width=1)
    draw.text((5, max(0, top - 14)), f"y={top}px", fill="#00ff55",
              stroke_width=1, stroke_fill="black")
    filename = out / f"attorney-head-top-{date.today()}-{name}-marked.png"
    marked.save(filename)
    return {**metadata, "size": list(image.size), "head_top_px": top,
            "head_top_percent": round(100 * top / image.height, 3),
            "annotated": filename.as_posix()}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    inputs = parser.add_mutually_exclusive_group(required=True)
    inputs.add_argument("--url")
    inputs.add_argument("--files", nargs=2, type=Path)
    parser.add_argument("--out", type=Path, default=Path("build/head-top"))
    parser.add_argument("--json", type=Path)
    parser.add_argument("--max-diff", type=float, default=3)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    groups = []
    if args.files:
        groups.append({"viewport": "files", "cards": [
            measure(Image.open(path), args.out, f"files-{i}",
                    {"file": path.as_posix()}) for i, path in enumerate(args.files)]})
    else:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            for width, height in [(1440, 900), (390, 844)]:
                page = browser.new_page(viewport={"width": width, "height": height},
                                        device_scale_factor=1)
                page.goto(args.url, wait_until="networkidle")
                page.add_style_tag(content="header.site-header { visibility:hidden !important; }"
                                  "html { scroll-behavior:auto !important; }")
                cards = []
                images = page.locator("img.attorney-photo")
                if images.count() != 2:
                    raise ValueError("Expected exactly two attorney photos")
                for i in range(2):
                    node = images.nth(i)
                    node.scroll_into_view_if_needed()
                    node.evaluate("async el => { await el.decode(); if (!el.naturalWidth) throw Error('Empty image'); }")
                    metadata = node.evaluate("""el => {
                        const s = getComputedStyle(el), r = el.getBoundingClientRect();
                        return {file: el.currentSrc, rect: {width:r.width,height:r.height},
                                object_fit:s.objectFit, object_position:s.objectPosition,
                                aspect_ratio:s.aspectRatio};
                    }""")
                    # Locator screenshot uses the element's DOMRect clip, including
                    # off-screen image parts, without capturing the fixed header.
                    shot = node.screenshot(animations="disabled")
                    cards.append(measure(Image.open(io.BytesIO(shot)), args.out,
                                         f"{width}-{i}", metadata))
                groups.append({"viewport": [width, height], "cards": cards,
                               "horizontal_overflow": page.evaluate(
                                   "document.documentElement.scrollWidth > innerWidth")})
                page.close()
            browser.close()
    for group in groups:
        a, b = group["cards"]
        group["diff_px"] = abs(a["head_top_px"] - b["head_top_px"])
        group["pass"] = group["diff_px"] <= args.max_diff
    report = {"version": "HEAD-TOP-MEASURE v1.0.0", "url": args.url,
              "max_diff": args.max_diff, "viewports": groups}
    output = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(output, encoding="utf-8")
    print(output)
    return 0 if all(g["pass"] for g in groups) else 1


if __name__ == "__main__":
    raise SystemExit(main())

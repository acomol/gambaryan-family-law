"""Снимок и замер элемента на живом адресе — один инструмент вместо разовых скриптов.

  python -B scripts/shot.py ".hero__title" --widths 1440,390
  python -B scripts/shot.py "#contact" --widths 1440@2,390@3 --url https://final-dev5.gambarian-landing.pages.dev/
  python -B scripts/shot.py ".precedent-card" --click "#svc-tab-3" --full

Для каждой ширины: скриншот элемента (или всего экрана с --full) в build/shots/,
его размеры и положение, ошибки JS на странице. Запрос /api/lead всегда
перехватывается — заявки не создаются. Кэш обходится параметром nc.
"""
import argparse
import json
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "build" / "shots"
DEFAULT_URL = "https://final-dev5.gambarian-landing.pages.dev/"
HEIGHTS = {360: 640, 375: 812, 390: 844, 412: 915, 430: 932, 768: 1024, 1024: 768, 1280: 800, 1440: 900, 1920: 1080}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("selector")
    ap.add_argument("--widths", default="1440,390", help="ширина или ширина@плотность, через запятую")
    ap.add_argument("--url", default=DEFAULT_URL)
    ap.add_argument("--click", help="селектор, по которому кликнуть перед снимком")
    ap.add_argument("--full", action="store_true", help="снимать экран, а не элемент")
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    slug = "".join(c if c.isalnum() else "-" for c in args.selector).strip("-")[:40] or "page"

    with sync_playwright() as p:
        browser = p.chromium.launch()
        for spec in args.widths.split(","):
            w, _, dpr = spec.partition("@")
            w, dpr = int(w), float(dpr or 1)
            page = browser.new_page(viewport={"width": w, "height": HEIGHTS.get(w, 900)}, device_scale_factor=dpr)
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.route("**/api/lead", lambda route: route.fulfill(status=202, content_type="application/json", body='{"ok":true}'))
            sep = "&" if "?" in args.url else "?"
            page.goto("%s%snc=%d" % (args.url, sep, time.time() * 1000), wait_until="networkidle")
            page.evaluate("document.documentElement.style.scrollBehavior = 'auto'")
            if args.click:
                page.click(args.click)
                page.wait_for_timeout(500)
            el = page.query_selector(args.selector)
            if not el:
                print("%s: элемент %s не найден" % (spec, args.selector))
                page.close()
                continue
            el.scroll_into_view_if_needed()
            page.wait_for_timeout(600)
            box = el.bounding_box()
            path = OUT / ("%s-%s.png" % (slug, spec.replace("@", "x").replace(".", "_")))
            (page if args.full else el).screenshot(path=str(path))
            print(json.dumps({"viewport": spec, "box": {k: round(v) for k, v in box.items()}, "shot": str(path.relative_to(ROOT)),
                              "js_errors": errors}, ensure_ascii=False))
            page.close()
        browser.close()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""ADDRESS-LINKS-GATE v1.0.0 | 2026-09-07

Проверяет три адресные ссылки, JSON-LD и подвал на 390 и 1440px.
Запуск: python scripts/verify-address-links.py <base_url>
Вывод: JSON Lines для каждого viewport и summary; exit 0/1.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import Error, sync_playwright


VERSION = "1.0.0"
MAP_URL = (
    "https://www.google.com/maps/search/?api=1&query="
    "%D7%A7%D7%A8%D7%9C%D7%99%D7%91%D7%9A+10%2C+"
    "%D7%AA%D7%9C+%D7%90%D7%91%D7%99%D7%91"
)
ARIA_LABEL = "Открыть адрес в Google Maps: Тель-Авив, Карлибах, 10"
VIEWPORTS = ((390, 844), (1440, 900))

DOM_CHECK = r"""({url, label}) => {
  const failures = [];
  const check = (ok, name) => { if (!ok) failures.push(name); };
  const text = e => (e?.textContent || '').replace(/\u00a0/g, ' ').trim();
  const links = [...document.querySelectorAll('a.map-link')];
  check(links.length === 3, 'map-links-count');
  links.forEach((link, i) => {
    const address = link.querySelector('.map-link__address');
    check(link.getAttribute('href') === url, `map-${i}-exact-url`);
    check(link.target === '_blank', `map-${i}-target`);
    check(link.relList.contains('noopener'), `map-${i}-noopener`);
    check(link.dataset.action === 'map_click', `map-${i}-action`);
    check(link.getAttribute('aria-label') === label, `map-${i}-label`);
    check(text(address) === 'Карлибах, 10', `map-${i}-address`);
    check(!!address && getComputedStyle(address).textDecorationLine.includes('underline'),
          `map-${i}-underline`);
  });
  check(document.querySelectorAll('a a').length === 0, 'nested-links');
  check(document.querySelector('.facts-bar')?.children[2]?.tagName === 'A', 'facts-address-row');
  check(document.querySelector('#contact .contact-list')?.children[2]?.tagName === 'A', 'contact-address-row');
  check(document.querySelectorAll('.site-footer__cols > div').length === 1, 'footer-columns');
  const footer = document.querySelector('footer');
  check(!!footer && footer.querySelectorAll('a[href^="tel:"], a[href*="wa.me"]').length === 0,
        'footer-phone-whatsapp');
  check(!!footer && !text(footer).includes('Связь'), 'footer-contact-label');
  check(!!footer && text(footer.querySelector('.site-footer__label')) === 'Офис', 'footer-office');
  const legal = document.querySelector('[data-copy-id="8.9"]');
  check(document.querySelectorAll('[data-copy-id="8.9"]').length === 1, 'legal-copy-id');
  const rangeFor = phrase => {
    if (!legal) return null;
    const walker = document.createTreeWalker(legal, NodeFilter.SHOW_TEXT);
    const nodes = []; let node; let combined = '';
    while ((node = walker.nextNode())) {
      nodes.push({node, start: combined.length});
      combined += node.textContent.replace(/\u00a0/g, ' ');
    }
    const start = combined.indexOf(phrase);
    if (start < 0) return null;
    const end = start + phrase.length;
    const first = nodes.find(n => n.start + n.node.length > start);
    const last = nodes.find(n => n.start + n.node.length >= end);
    const range = document.createRange();
    range.setStart(first.node, start - first.start);
    range.setEnd(last.node, end - last.start);
    return range;
  };
  const copyright = rangeFor('©');
  const sentence = rangeFor('дела.');
  const license = rangeFor('Лицензия № 30178');
  check(!!copyright && !!sentence &&
        copyright.getBoundingClientRect().top > sentence.getBoundingClientRect().top + 1,
        'copyright-new-line');
  const rects = license ? [...license.getClientRects()].filter(r => r.width > 0) : [];
  check(rects.length > 0 && rects.every(r => Math.abs(r.top - rects[0].top) <= 1),
        'license-single-line');
  try {
    const data = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
    check(data.address.streetAddress === 'Карлибах, 10', 'json-ld-address');
    check(data.employee[0].jobTitle === 'Адвокат Израиля, лицензия № 30178', 'json-ld-job-title');
  } catch (error) { failures.push(`json-ld: ${error.message}`); }
  check(document.documentElement.scrollWidth <= window.innerWidth, 'horizontal-overflow');
  return failures;
}"""


def launch_options() -> dict[str, str]:
    # Standard Playwright handles its normal cache. Some cloud images carry
    # a different Chromium revision under PLAYWRIGHT_BROWSERS_PATH.
    root = os.environ.get("PLAYWRIGHT_BROWSERS_PATH")
    if root and root != "0":
        for pattern in (
            "chromium-*/chrome-linux/chrome",
            "chromium-*/chrome-linux64/chrome",
            "chromium-*/chrome-win/chrome.exe",
            "chromium-*/chrome-win64/chrome.exe",
        ):
            candidates = sorted(Path(root).glob(pattern))
            if candidates:
                return {"executable_path": str(candidates[-1])}
    return {}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base_url")
    args = parser.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    results = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(**launch_options())
            try:
                for width, height in VIEWPORTS:
                    page = browser.new_page(viewport={"width": width, "height": height})
                    failures = []
                    popups = []
                    try:
                        page.goto(args.base_url, wait_until="networkidle")
                        page.evaluate("document.fonts.ready")
                        failures.extend(page.evaluate(DOM_CHECK, {"url": MAP_URL, "label": ARIA_LABEL}))
                        links = page.locator("a.map-link")
                        for index in range(links.count()):
                            link = links.nth(index)
                            link.evaluate("e => e.scrollIntoView({block: 'center', behavior: 'instant'})")
                            with page.expect_popup() as opened:
                                link.click()
                            popup = opened.value
                            try:
                                popup.wait_for_url(re.compile(r"https://www\.google\.com/maps"), wait_until="commit")
                                popups.append(popup.url)
                            finally:
                                popup.close()
                    except (Error, OSError) as error:
                        failures.append(str(error))
                    finally:
                        page.close()
                    result = {"type": "viewport", "width": width, "height": height,
                              "status": "FAIL" if failures else "PASS",
                              "failures": failures, "popups": popups}
                    results.append(result)
                    print(json.dumps(result, ensure_ascii=False), flush=True)
            finally:
                browser.close()
    except (Error, OSError) as error:
        print(json.dumps({"type": "error", "error": str(error)}, ensure_ascii=False))
    passed = sum(result["status"] == "PASS" for result in results)
    success = passed == len(VIEWPORTS)
    print(json.dumps({"type": "summary", "gate": f"ADDRESS-LINKS-GATE v{VERSION}",
                      "status": "PASS" if success else "FAIL", "passed": passed,
                      "total": len(VIEWPORTS)}, ensure_ascii=False))
    return 0 if success else 1


if __name__ == "__main__":
    raise SystemExit(main())

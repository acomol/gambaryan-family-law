#!/usr/bin/env python3
"""BUSINESS-HOURS-GATE v1.0.1 | 2026-09-07

Проверяет closed/open на 390 и 1440px; /api/lead всегда замокан.
Запуск: python scripts/verify-business-hours.py <base_url>
"""

from __future__ import annotations

import argparse
import json
import sys

from playwright.sync_api import Error, sync_playwright


VIEWPORTS = ((390, 844), (1440, 900))
SNAPSHOT = """() => [...document.querySelectorAll(
  '[data-business-closed], [data-business-variant]')].map(e => e.outerHTML)"""
CLOSED_CHECK = """() => {
  const failures = [];
  const check = (ok, name) => { if (!ok) failures.push(name); };
  const phones = [...document.querySelectorAll('a[href^="tel:"]')];
  check(phones.filter(e => !e.closest('[hidden]')).length === 0, 'tel-dom');
  check(phones.filter(e => e.getClientRects().length > 0).length === 0, 'tel-visible');
  const bar = document.querySelector('.mobile-bar');
  check(bar.dataset.businessState === 'closed', 'state-closed');
  const whatsapp = bar.querySelector('[data-business-action="whatsapp"]');
  const targets = [...document.querySelectorAll('[data-business-closed="whatsapp"]')];
  check(targets.length === 3, 'target-count');
  targets.forEach((e, i) => {
    ['href', 'target', 'rel'].forEach(attr =>
      check(e.getAttribute(attr) === whatsapp.getAttribute(attr), `${i}-${attr}`));
    check(e.dataset.action === 'whatsapp_click', `${i}-action`);
    check(e.getAttribute('aria-label') === 'Написать в WhatsApp', `${i}-aria`);
    check(e.textContent.trim() === 'Написать в WhatsApp', `${i}-label`);
    check(e.querySelector('svg')?.innerHTML === whatsapp.querySelector('svg').innerHTML,
          `${i}-icon`);
    check(!e.hidden, `${i}-not-hidden`);
  });
  const rows = [...document.querySelectorAll('.contact-list__row')]
    .filter(e => !e.closest('[hidden]') && e.getClientRects().length > 0);
  const whatsappRows = rows.filter(e => e.getAttribute('href') === whatsapp.getAttribute('href'));
  const formRows = rows.filter(e => e.getAttribute('href') === '#contact');
  check(whatsappRows.length === 1, 'contact-whatsapp-count');
  check(formRows.length === 1, 'contact-form-count');
  [...whatsappRows, ...formRows].forEach(e =>
    check(e.querySelectorAll('svg').length === 1, 'contact-icon'));
  check(formRows[0]?.querySelector('.contact-list__label')?.textContent === 'ЗАЯВКА', 'contact-form-label');
  check(formRows[0]?.querySelector('.contact-list__value')?.textContent === 'Записаться на консультацию', 'contact-form-value');
  const closed = document.querySelector('.lead-form__error-contact [data-business-variant="closed"]');
  check(!closed.hidden && closed.getClientRects().length > 0, 'closed-error-visible');
  check(!!closed.querySelector('a[href^="https://wa.me/"]'), 'closed-error-whatsapp');
  check(closed.querySelectorAll('a svg').length === 1, 'closed-error-icon-count');
  check(closed.querySelector('a svg')?.innerHTML === whatsapp.querySelector('svg').innerHTML,
        'closed-error-icon');
  check(document.querySelector('.lead-form__error-contact [data-business-variant="open"]').hidden, 'open-error-hidden');
  check(document.querySelector('.hero__phone').dataset.heroBusinessState === 'closed', 'hero-state');
  check(bar.querySelector('[data-business-action="phone"]').hidden, 'bar-phone-hidden');
  check(document.querySelectorAll('a a').length === 0, 'nested-links');
  check(document.documentElement.scrollWidth <= window.innerWidth, 'overflow');
  return failures;
}"""


def set_state(page, state: str) -> None:
    page.evaluate("""state => {
      if (document.querySelector('.mobile-bar').dataset.businessState !== state)
        document.querySelector('[data-business-demo]').click();
    }""", state)
    page.wait_for_function("state => document.querySelector('.mobile-bar').dataset.businessState === state", arg=state)
    page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base_url")
    args = parser.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    results = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            try:
                for width, height in VIEWPORTS:
                    page = browser.new_page(viewport={"width": width, "height": height})
                    failures = []
                    mocked_requests = []

                    def delivery_error(route):
                        mocked_requests.append(route.request.method)
                        route.fulfill(status=503, content_type="application/json",
                                      body='{"ok":false,"error":"delivery_failed"}')

                    # Install before navigation; no real lead can leave this page.
                    page.route("**/api/lead", delivery_error)
                    try:
                        page.goto(args.base_url, wait_until="networkidle")
                        page.wait_for_function("['open', 'closed'].includes(document.querySelector('.mobile-bar')?.dataset.businessState)")
                        # Force a full cycle regardless of the local business clock.
                        set_state(page, "open")
                        original = page.evaluate(SNAPSHOT)
                        set_state(page, "closed")
                        if width == 390:
                            page.locator('.nav-burger').click()
                            if not page.locator('#nav-drawer').is_visible():
                                failures.append('menu-not-open')
                            if page.locator('a[href^="tel:"]:visible').count():
                                failures.append('menu-tel-visible')
                            page.locator('.nav-burger').click()
                        page.locator('#lead-name').fill('Тест проверки')
                        page.locator('#lead-phone').fill('+972500000000')
                        page.locator('.lead-form').evaluate('form => form.requestSubmit()')
                        page.locator('.lead-form__error-contact').wait_for(state='visible')
                        if mocked_requests != ['POST']:
                            failures.append('mocked-delivery-count')
                        failures.extend(page.evaluate(CLOSED_CHECK))
                        set_state(page, "open")
                        if page.evaluate(SNAPSHOT) != original:
                            failures.append('open-markup-restore')
                        if page.locator('.hero__call').get_attribute('href') != 'tel:+972545490623':
                            failures.append('hero-phone-restore')
                        if not page.locator('.contact-list__row[data-business-closed]').is_visible():
                            failures.append('contact-phone-visible')
                        if not page.locator('.lead-form__error-contact [data-business-variant="open"]').is_visible():
                            failures.append('open-error-visible')
                        set_state(page, "closed")
                        failures.extend(page.evaluate(CLOSED_CHECK))
                        form_link = page.locator('.contact-list__row[href="#contact"]:visible')
                        if form_link.count() == 1:
                            form_link.click()
                            if page.evaluate('document.activeElement.id') != 'lead-name':
                                failures.append('contact-form-focus')
                        else:
                            failures.append('contact-form-focus-link-missing')
                    except (Error, OSError, AssertionError) as error:
                        failures.append(str(error))
                    finally:
                        page.close()
                    result = {"type": "viewport", "width": width, "height": height,
                              "states": ["open", "closed", "open", "closed"],
                              "status": "FAIL" if failures else "PASS", "failures": failures}
                    results.append(result)
                    print(json.dumps(result, ensure_ascii=False), flush=True)
            finally:
                browser.close()
    except (Error, OSError) as error:
        print(json.dumps({"type": "error", "error": str(error)}, ensure_ascii=False))
    passed = sum(result["status"] == "PASS" for result in results)
    success = passed == len(VIEWPORTS)
    print(json.dumps({"type": "summary", "gate": "BUSINESS-HOURS-GATE v1.0.1",
                      "status": "PASS" if success else "FAIL", "passed": passed,
                      "total": len(VIEWPORTS)}, ensure_ascii=False))
    return 0 if success else 1


if __name__ == "__main__":
    raise SystemExit(main())

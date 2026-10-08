#!/usr/bin/env python3
"""SECTION-GAPS-MEASURE v1.0.0 | 2026-09-07

Measure visible content boxes, not just CSS padding. Internal card/form padding
therefore remains visible in the result. --allow exempts spacing, never overlap.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright


MARKER = "SECTION-GAPS-MEASURE v1.0.0 | 2026-09-07"
MEASURE = r"""() => {
  const visible = el => {
    if (!el.getClientRects().length) return false;
    for (let p = el; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0)
        return false;
    }
    return true;
  };
  const box = el => {
    const r = el.getBoundingClientRect();
    return {top: r.top + scrollY, bottom: r.bottom + scrollY, height: r.height};
  };
  const content = root => [...root.querySelectorAll('*')].filter(el => {
    if (!visible(el) || el.closest('script, style, noscript, [aria-hidden="true"]')) return false;
    return el.matches('img, button, input, textarea, select') ||
      [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
  }).map(box).filter(r => r.height > 0);
  const sections = [...document.querySelectorAll('body > header, main > section, body > footer')]
    .filter(visible).map(el => {
      const bounds = box(el), boxes = content(el);
      if (!boxes.length) throw new Error('No visible content: ' + el.className);
      const name = el.matches('header') ? 'header' : el.matches('footer') ? 'footer' :
        el.classList.contains('hero') ? 'hero' : el.id || el.classList[0];
      const first = Math.min(...boxes.map(r => r.top));
      const last = Math.max(...boxes.map(r => r.bottom));
      const container = el.querySelector('.section-pad, .precedent__container, .facts__container, .site-footer__inner');
      const style = getComputedStyle(container || el);
      const row = {name, ...bounds, first, last, top_gap: first - bounds.top,
        bottom_gap: bounds.bottom - last, padding_top: parseFloat(style.paddingTop),
        padding_bottom: parseFloat(style.paddingBottom)};
      if (name === 'hero') {
        const body = el.querySelector('.hero__body');
        if (body) {
          const bodyBoxes = content(body), r = box(body);
          row.body_content_bottom_gap = r.bottom - Math.max(...bodyBoxes.map(b => b.bottom));
          const note = body.querySelector('.hero__note');
          if (note && visible(note)) row.note_to_section_bottom = bounds.bottom - box(note).bottom;
        }
      }
      const pairs = [['.services__head', '.svc-tabs'], ['.svc-tabs', '.svc-card'],
        ['.rule', '.attorneys-grid'], ['.attorneys-grid', '.attorneys__note']];
      row.internal = {};
      for (const [a, b] of pairs) {
        const left = el.querySelector(a), right = el.querySelector(b);
        if (left && right && visible(left) && visible(right))
          row.internal[a + ' -> ' + b] = box(right).top - box(left).bottom;
      }
      return row;
    });
  for (let i = 1; i < sections.length; i++)
    sections[i].gap_from_previous = sections[i].first - sections[i - 1].last;
  const precedent = sections.find(s => s.name === 'precedent');
  const services = sections.find(s => s.name === 'services');
  const card = document.querySelector('.precedent-card');
  const photo = document.querySelector('.precedent-photo');
  if (!precedent || !services || !card) throw new Error('Required sections missing');
  precedent.card_from_services = box(card).top - services.bottom;
  precedent.card_margin_top = parseFloat(getComputedStyle(card).marginTop);
  precedent.card_to_section_bottom = precedent.bottom - box(card).bottom;
  precedent.photo_from_services = photo && visible(photo) ? box(photo).top - services.bottom : null;
  precedent.photo_from_services_content = photo && visible(photo) ? box(photo).top - services.last : null;
  return {sections, page_height: document.documentElement.scrollHeight,
    horizontal_overflow: document.documentElement.scrollWidth > innerWidth};
}"""


def viewports(value):
    try:
        result = [tuple(map(int, item.split('x'))) for item in value.split(',')]
        if any(len(size) != 2 or min(size) <= 0 for size in result):
            raise ValueError
        return result
    except ValueError as exc:
        raise argparse.ArgumentTypeError('Use WIDTHxHEIGHT,WIDTHxHEIGHT') from exc


def violations(measurement, expected, allowed, tolerance):
    errors = []
    for row in measurement['sections']:
        if expected is not None and row['name'] not in allowed:
            for side in ('top_gap', 'bottom_gap'):
                if abs(row[side] - expected) > tolerance:
                    errors.append(f"{row['name']}.{side}={row[side]:.2f}, expected {expected}")
        if row['name'] == 'precedent' and row['photo_from_services'] is not None:
            if row['photo_from_services'] < 0:
                errors.append(f"precedent portrait overlaps services: {row['photo_from_services']:.2f}px")
    if measurement['horizontal_overflow']:
        errors.append('horizontal overflow')
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('base_url')
    parser.add_argument('--viewports', type=viewports, default=viewports('1440x900,1440x1200,390x844,390x740'))
    parser.add_argument('--json', type=Path)
    parser.add_argument('--baseline', type=Path)
    parser.add_argument('--expect-desktop', type=float)
    parser.add_argument('--expect-mobile', type=float)
    parser.add_argument('--tolerance', type=float, default=4)
    parser.add_argument('--allow', default='hero,facts,footer')
    parser.add_argument('--annotate', type=Path)
    args = parser.parse_args()
    baseline = json.loads(args.baseline.read_text(encoding='utf-8')) if args.baseline else None
    report = {'marker': MARKER, 'base_url': args.base_url, 'viewports': {}}
    allowed = set(args.allow.split(',')) | {'header'}
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        report['browser'] = browser.version
        for width, height in args.viewports:
            key = f'{width}x{height}'
            page = browser.new_page(viewport={'width': width, 'height': height}, reduced_motion='reduce')
            response = page.goto(args.base_url, wait_until='networkidle')
            if response is None or not response.ok:
                raise RuntimeError(f'{args.base_url}: HTTP load failed')
            page.evaluate("""async () => {
              document.querySelectorAll('img').forEach(img => img.loading = 'eager');
              await document.fonts.ready;
              await Promise.all([...document.images].map(img => img.decode()));
              for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight)
                { scrollTo(0, y); await new Promise(resolve => requestAnimationFrame(resolve)); }
              scrollTo(0, 0);
            }""")
            page.wait_for_timeout(300)
            result = page.evaluate(MEASURE)
            expected = args.expect_mobile if width <= 960 else args.expect_desktop
            result['errors'] = violations(result, expected, allowed, args.tolerance)
            report['viewports'][key] = result
            before = baseline['viewports'][key] if baseline else None
            old = {r['name']: r for r in before['sections']} if before else {}
            print(f'\n### {key}\n\n| Section | Height | Top empty | Bottom empty | Inside / previous |\n|---|---:|---:|---:|---|')
            for row in result['sections']:
                def value(field):
                    after = f"{row[field]:.2f}"
                    return f"{old[row['name']][field]:.2f} → {after}" if before else after
                detail = dict(row['internal'])
                if 'gap_from_previous' in row:
                    detail['previous content'] = row['gap_from_previous']
                if row['name'] == 'precedent':
                    detail.update({k: row[k] for k in ('card_margin_top', 'photo_from_services', 'photo_from_services_content')})
                print(f"| {row['name']} | {value('height')} | {value('top_gap')} | {value('bottom_gap')} | {json.dumps(detail)} |")
            print(f"Page height: {result['page_height']}" + (f"; removed: {before['page_height'] - result['page_height']}px" if before else ''))
            for error in result['errors']:
                print(f'FAIL {key}: {error}')
            if args.annotate:
                args.annotate.mkdir(parents=True, exist_ok=True)
                page.evaluate("""rows => {
                  for (const row of rows) for (const [top, size, color] of
                    [[row.top, row.top_gap, 'red'], [row.last, row.bottom_gap, 'blue']]) {
                    if (size <= 0) continue;
                    const mark = document.createElement('div');
                    mark.style.cssText = `position:absolute;right:0;top:${top}px;height:${size}px;width:12px;background:${color};opacity:.65;z-index:99999;pointer-events:none`;
                    document.body.append(mark);
                  }
                }""", result['sections'])
                page.screenshot(path=str(args.annotate / f'gaps-{key}.png'), full_page=True)
            page.close()
        browser.close()
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return int(any(row['errors'] for row in report['viewports'].values()))


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    raise SystemExit(main())

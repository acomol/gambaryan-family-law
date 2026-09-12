import type { Page } from '@playwright/test';
import { test, expect, gotoReady, settle, scrollSection, selectService, setBusinessState } from './helpers/page';

// Ported from scripts/qa-browser-matrix.py, with the final-dev4 criteria from
// ACCEPTANCE-MACHINE-FINAL-DEV4.md. Other variants remain in the Python runner.

test('Кубики: единая иерархия, разделители и отсутствие обрезанного текста', async ({ page }) => {
  await gotoReady(page);
  const cards = await page.locator('.fact-card').evaluateAll((elements) => elements.map((element) => {
    const card = element as HTMLElement;
    const children = [...card.children] as HTMLElement[];
    const [title, notch, sub] = children;
    if (children.length !== 3 || !title.matches('.fact-card__title') ||
        !notch.matches('.notch') || !sub.matches('.fact-card__sub')) return { invalidStructure: card.outerHTML };
    const box = card.getBoundingClientRect();
    const t = title.getBoundingClientRect(), n = notch.getBoundingClientRect(), s = sub.getBoundingClientRect();
    const bounds = [...card.querySelectorAll('*')].map((child) => child.getBoundingClientRect());
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(walker.currentNode);
      bounds.push(...range.getClientRects());
    }
    const rendered = bounds.filter((r) => r.width > 0 && r.height > 0);
    return {
      invalidStructure: '', id: card.dataset.ownerCopyId,
      ordered: t.bottom <= n.top && n.bottom <= s.top && n.height >= 1 && n.width > 0,
      titleSize: parseFloat(getComputedStyle(title).fontSize), subSize: parseFloat(getComputedStyle(sub).fontSize),
      wrapping: getComputedStyle(title).whiteSpace !== 'nowrap',
      cardOverflowX: card.scrollWidth - card.clientWidth, cardOverflowY: card.scrollHeight - card.clientHeight,
      titleOverflowX: title.scrollWidth - title.clientWidth,
      contentOutside: rendered.filter((r) => r.left < box.left || r.right > box.right).length,
      clampedParagraphs: [...card.querySelectorAll('p')].filter((p) => p.scrollHeight > p.clientHeight).length,
    };
  }));
  expect(cards).toHaveLength(3);
  for (const card of cards) {
    expect(card.invalidStructure, 'Порядок title → notch → sub').toBe('');
    expect(card.ordered, card.id).toBe(true);
    expect(card.titleSize!).toBeGreaterThan(card.subSize!);
    expect(card.wrapping).toBe(true);
    expect(card.cardOverflowX, card.id).toBeLessThanOrEqual(0);
    expect(card.cardOverflowY, card.id).toBeLessThanOrEqual(0);
    expect(card.titleOverflowX, card.id).toBeLessThanOrEqual(0);
    expect(card.contentOutside, card.id).toBe(0);
    expect(card.clampedParagraphs, card.id).toBe(0);
  }
  expect(new Set(cards.map((card) => card.titleSize)).size).toBe(1);
  expect(new Set(cards.map((card) => card.subSize)).size).toBe(1);
  await expect(page.locator('.fact-card__toggle, .fact-card__chevron')).toHaveCount(0);
});

test('Шрифты: Onest загружен локально и используется Chromium без системной подмены', async ({ page }) => {
  const fontRequests: string[] = [];
  page.on('request', (request) => { if (request.resourceType() === 'font') fontRequests.push(request.url()); });
  await gotoReady(page);
  const origin = new URL(page.url()).origin;
  expect(fontRequests.filter((url) => new URL(url).origin !== origin), 'Внешние запросы шрифтов').toEqual([]);
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('DOM.enable');
    await session.send('CSS.enable');
    const { root } = await session.send('DOM.getDocument', { depth: -1, pierce: true });
    for (const selector of ['.hero__title', '.svc-card:not([hidden]) .svc-title', '.hero__lede', '.hero .btn']) {
      const sample = await page.locator(selector).first().evaluate((element) => {
        const style = getComputedStyle(element);
        const family = style.fontFamily.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
        return { family, loaded: document.fonts.check(
          `${style.fontStyle} ${style.fontWeight} ${style.fontSize} "${family}"`, element.textContent?.trim() || 'Адвокат'),
        };
      });
      expect(sample, selector).toEqual({ family: 'Onest', loaded: true });
      const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector });
      expect(nodeId, selector).toBeGreaterThan(0);
      const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId });
      const used = fonts.filter((font) => font.glyphCount > 0);
      expect(used.length, `Реально отрисованные глифы: ${selector}`).toBeGreaterThan(0);
      for (const font of used) {
        expect(font.isCustomFont, `${selector}: ${font.familyName}`).toBe(true);
        expect(font.familyName.toLowerCase(), selector).toContain('onest');
      }
    }
  } finally { await session.detach(); }
});

test('Hero и мобильная форма: размеры, композиция 861px и запас под действиями', async ({ page }) => {
  await gotoReady(page);
  const metrics = await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>('.hero')!;
    const photo = document.querySelector<HTMLImageElement>('.hero-photo')!;
    const media = document.querySelector<HTMLElement>('.hero-media')!;
    const form = document.querySelector<HTMLElement>('.lead-form')!;
    const actions = [...document.querySelectorAll<HTMLElement>(
      '.hero a[href="#contact"], .hero a[href^="tel:"], .hero a[data-action="whatsapp_click"]')]
      .filter((element) => {
        const r = element.getBoundingClientRect(), s = getComputedStyle(element);
        return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
      });
    const f = form.getBoundingClientRect();
    return {
      width: innerWidth, height: innerHeight, clientWidth: document.documentElement.clientWidth,
      hero: hero.getBoundingClientRect().toJSON(), photo: photo.getBoundingClientRect().toJSON(),
      photoLoaded: photo.complete && photo.naturalWidth > 0, actions: actions.map((a) => a.getBoundingClientRect().bottom),
      heroCount: document.querySelectorAll('.hero').length, mediaCount: document.querySelectorAll('.hero-media').length,
      transform: getComputedStyle(media).transform, formLeft: f.left, formRight: innerWidth - f.right,
    };
  });
  expect(metrics.clientWidth, 'Ширина документа равна заданному viewport').toBe(page.viewportSize()!.width);
  expect(metrics.hero.width).toBeGreaterThan(0);
  expect(metrics.hero.height).toBeGreaterThan(0);
  expect(metrics.photo.width).toBeGreaterThan(0);
  expect(metrics.photo.height).toBeGreaterThan(0);
  expect(metrics.photoLoaded).toBe(true);
  expect(metrics.actions.length).toBeGreaterThan(0);
  if (metrics.width <= 860) {
    expect(metrics.formLeft).toBeGreaterThanOrEqual(-0.5);
    expect(metrics.formRight).toBeGreaterThanOrEqual(-0.5);
    expect(Math.abs(metrics.formLeft - metrics.formRight)).toBeLessThanOrEqual(1);
  }
  if (metrics.width === 861) {
    expect([metrics.heroCount, metrics.mediaCount]).toEqual([1, 1]);
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(metrics.transform);
  }
  // The full matrix includes 360×640; extra Hero-only heights have their own invariant.
  if (metrics.width === 360 && metrics.height <= 668) {
    expect(Math.max(...metrics.actions)).toBeLessThanOrEqual(metrics.height - 8);
  }
});

test('Услуги: стрелки 44px, крайние остановки и видимая активная вкладка', async ({ page }) => {
  await gotoReady(page);
  const width = page.viewportSize()!.width;
  await expect(page.locator('.svc-tab')).toHaveCount(8);
  await expect(page.locator('.svc-dot')).toHaveCount(8);
  for (let index = 0; index < 8; index += 1) {
    await selectService(page, index);
    const metrics = await page.evaluate(() => {
      const frame = document.querySelector<HTMLElement>('.svc-frame')!;
      const tablist = document.querySelector<HTMLElement>('.svc-tabs')!;
      const active = document.querySelector<HTMLElement>('.svc-tab[aria-selected="true"]')!;
      const title = document.querySelector('.svc-card:not([hidden]) .svc-title')!;
      const range = document.createRange(); range.selectNodeContents(title);
      const titleRects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
      return {
        frame: frame.getBoundingClientRect().toJSON(), headerTop: frame.getBoundingClientRect().top + parseFloat(getComputedStyle(frame).paddingTop),
        titleRight: Math.max(...titleRects.map((r) => r.right)),
        arrows: [...document.querySelectorAll<HTMLButtonElement>('.svc-arrow')].map((arrow) => ({
          direction: arrow.dataset.dir, disabled: arrow.disabled, rect: arrow.getBoundingClientRect().toJSON(),
        })),
        tabsRows: new Set([...tablist.querySelectorAll('.svc-tab')].map((tab) => Math.round(tab.getBoundingClientRect().top))).size,
        tabsScrollable: tablist.scrollWidth > tablist.clientWidth, overflowX: getComputedStyle(tablist).overflowX,
        mask: getComputedStyle(tablist).maskImage, active: active.getBoundingClientRect().toJSON(),
        tablist: tablist.getBoundingClientRect().toJSON(), height: document.querySelector('#services')!.getBoundingClientRect().height,
        panelHeights: [...document.querySelectorAll('.svc-card')].map((panel) => panel.getBoundingClientRect().height),
      };
    });
    expect(metrics.panelHeights).toHaveLength(8);
    expect(Math.min(...metrics.panelHeights), 'Все панели сохраняют ненулевую высоту, включая hidden').toBeGreaterThan(0);
    expect(Math.max(...metrics.panelHeights) - Math.min(...metrics.panelHeights)).toBeLessThanOrEqual(1);
    expect(metrics.arrows).toHaveLength(2);
    for (const arrow of metrics.arrows) {
      expect(arrow.rect.width).toBeGreaterThanOrEqual(44);
      expect(arrow.rect.height).toBeGreaterThanOrEqual(44);
      expect(arrow.disabled).toBe(arrow.direction === 'prev' ? index === 0 : index === 7);
      if (width >= 861) {
        expect(Math.abs(arrow.rect.top + arrow.rect.height / 2 - metrics.frame.top - metrics.frame.height / 2)).toBeLessThanOrEqual(2);
        if (arrow.direction === 'prev') expect(arrow.rect.right).toBeLessThanOrEqual(metrics.frame.left);
        else expect(arrow.rect.left).toBeGreaterThanOrEqual(metrics.frame.right);
      } else {
        expect(Math.abs(arrow.rect.top - metrics.headerTop)).toBeLessThanOrEqual(2);
        expect(arrow.rect.left).toBeGreaterThanOrEqual(metrics.titleRight - 1);
        expect(arrow.rect.right).toBeLessThanOrEqual(metrics.frame.right + 1);
      }
    }
    if (width <= 860) {
      expect(metrics.tabsRows).toBe(1);
      expect(metrics.tabsScrollable).toBe(true);
      expect(['auto', 'scroll']).toContain(metrics.overflowX);
      expect(metrics.mask).not.toBe('none');
      expect(metrics.active.left).toBeGreaterThanOrEqual(metrics.tablist.left - 1);
      expect(metrics.active.right).toBeLessThanOrEqual(metrics.tablist.right + 1);
    }
    if (width === 390) expect(metrics.height).toBeLessThanOrEqual(1220);
  }
});

test('Услуги: свайп, порог, вертикальный жест и остановка по краям', async ({ page }) => {
  test.skip(page.viewportSize()!.width > 860, 'Свайп проверяется в мобильной раскладке');
  await gotoReady(page);
  await scrollSection(page, '#services');
  await expect(page.locator('.svc-stage')).toHaveCSS('touch-action', 'pan-y');
  const fixedRects = () => page.locator('.svc-media, .svc-card__cta').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return [rect.left + scrollX, rect.top + scrollY, rect.width, rect.height];
  }));
  const swipe = async (dx: number, dy = 0) => {
    const before = await fixedRects();
    expect(before).toHaveLength(2);
    await page.locator('.svc-stage').evaluate((stage, delta) => {
      const r = stage.getBoundingClientRect();
      const options = { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: r.left + r.width / 2, clientY: r.top + 20 };
      stage.dispatchEvent(new PointerEvent('pointerdown', options));
      stage.dispatchEvent(new PointerEvent('pointerup', { ...options, clientX: options.clientX + delta.dx, clientY: options.clientY + delta.dy }));
    }, { dx, dy });
    await settle(page);
    const after = await fixedRects();
    expect(after).toHaveLength(2);
    for (let index = 0; index < before.length; index += 1) {
      for (let dimension = 0; dimension < 4; dimension += 1) {
        expect(Math.abs(after[index][dimension] - before[index][dimension]),
          `Свайп ${dx}/${dy}: неподвижность «Ведёт» и CTA, элемент ${index}, координата ${dimension}`).toBeLessThanOrEqual(1);
      }
    }
    return page.locator('.svc-tab').evaluateAll((tabs) => tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true'));
  };
  await selectService(page, 0);
  const results = [await swipe(-120), await swipe(120), await swipe(120), await swipe(0, 100), await swipe(-30)];
  await selectService(page, 7);
  results.push(await swipe(-120));
  expect(results).toEqual([1, 0, 0, 0, 0, 7]);
});

test('Action Bar: breakpoint, высота и равные колонки рабочего и закрытого режима', async ({ page }) => {
  await gotoReady(page);
  for (const state of ['open', 'closed'] as const) {
    await setBusinessState(page, state);
    const bar = await page.locator('.mobile-bar').evaluate((element) => {
      const root = element as HTMLElement, style = getComputedStyle(root);
      const items = [...root.querySelectorAll<HTMLElement>('.mobile-bar__item')].filter((item) => getComputedStyle(item).display !== 'none');
      return { display: style.display, position: style.position, height: root.getBoundingClientRect().height,
        overflow: root.scrollWidth - root.clientWidth, widths: items.map((item) => item.getBoundingClientRect().width) };
    });
    if (page.viewportSize()!.width > 960) { expect(bar.display).toBe('none'); continue; }
    expect(bar.display).toBe('grid');
    expect(bar.position).toBe(page.viewportSize()!.height <= 400 ? 'static' : 'fixed');
    expect(Math.abs(bar.height - 60)).toBeLessThanOrEqual(0.5);
    expect(bar.overflow).toBeLessThanOrEqual(0);
    expect(bar.widths).toHaveLength(state === 'open' ? 3 : 2);
    expect(Math.max(...bar.widths) - Math.min(...bar.widths)).toBeLessThanOrEqual(0.5);
  }
});

async function scrollAndSync(page: Page, top: number) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
  await settle(page);
  await page.evaluate(() => document.dispatchEvent(new Event('scrollend')));
  await settle(page);
}

async function expectBarVisibility(page: Page, visible: boolean) {
  await expect.poll(() => page.locator('.mobile-bar').evaluate((bar) => {
    const demo = document.querySelector<HTMLElement>('[data-business-demo]')!;
    const style = getComputedStyle(bar);
    return { hidden: bar.classList.contains('is-hidden'), visible: style.visibility === 'visible' && style.opacity === '1', demoHidden: demo.hidden };
  })).toEqual({ hidden: !visible, visible, demoHidden: !visible });
  if (visible) {
    const overlap = await page.evaluate(() => {
      const a = document.querySelector('.mobile-bar')!.getBoundingClientRect();
      const b = document.querySelector('[data-business-demo]')!.getBoundingClientRect();
      return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
        Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    });
    expect(overlap, 'Переключатель не перекрывает Action Bar').toBe(0);
  }
}

test('Action Bar: первый спуск, возврат, меню, фокус, форма и сброс наверху', async ({ page }) => {
  const viewport = page.viewportSize()!;
  test.skip(viewport.width > 960 || viewport.height <= 400, 'Зонная видимость для фиксированной панели');
  await gotoReady(page);
  await expect(page.locator('body')).toHaveClass(/page--final-dev3/);
  const heroPhone = await page.locator('.hero__phone').evaluate((element) => {
    const rect = element.getBoundingClientRect(); return { top: rect.top + scrollY, bottom: rect.bottom + scrollY };
  });
  // Derive positions from the actual Hero, so updated section padding does not
  // turn the old hard-coded 320/900px samples into false failures.
  const beforeHero = [2, ...[0.25, 0.5, 0.75].map((fraction) => Math.floor(heroPhone.top * fraction))];
  const passedHero = Math.ceil(heroPhone.bottom + 2);
  const returnedToHero = Math.max(2, Math.floor(heroPhone.top - 20));
  await scrollAndSync(page, 0);
  await expectBarVisibility(page, false);
  for (const y of beforeHero) { await scrollAndSync(page, y); await expectBarVisibility(page, false); }
  await scrollAndSync(page, passedHero);
  await expectBarVisibility(page, true);
  await scrollAndSync(page, returnedToHero);
  await expectBarVisibility(page, true);
  expect(await page.locator('.hero__phone').evaluate((element) => {
    const r = element.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight;
  })).toBe(true);
  // Observe the same drawer state mutation as the production menu handler;
  // this also covers 861–960, where the burger itself is not displayed.
  await page.locator('#nav-drawer').evaluate((element) => { (element as HTMLElement).hidden = false; });
  await expectBarVisibility(page, false);
  await page.locator('#nav-drawer').evaluate((element) => { (element as HTMLElement).hidden = true; });
  await expectBarVisibility(page, true);
  await page.locator('#lead-name').evaluate((element) => (element as HTMLElement).focus({ preventScroll: true }));
  await expectBarVisibility(page, false);
  await page.locator('#lead-name').evaluate((element) => (element as HTMLElement).blur());
  await expectBarVisibility(page, true);
  await scrollSection(page, '#contact');
  await expectBarVisibility(page, false);
  await scrollAndSync(page, 0);
  await expectBarVisibility(page, false);
  for (const y of beforeHero) { await scrollAndSync(page, y); await expectBarVisibility(page, false); }
});

test('Рабочее время: точный контракт Hero и восстановление контактов после ошибки доставки', async ({ page }) => {
  await page.route('**/api/lead', (route) => route.fulfill({ status: 503, json: { ok: false } }));
  await gotoReady(page);
  const hero = page.locator('.hero--final-dev1 .hero__call--expanded');
  await expect(hero).toHaveCount(1);
  await expect(page.locator('.hero--final-dev1 .hero__phone > a')).toHaveCount(1);
  await expect(hero).toHaveAttribute('href', 'tel:+972545490623');
  await expect(hero).not.toHaveAttribute('target');
  await expect(hero).not.toHaveAttribute('rel');
  await expect(hero).toHaveAttribute('data-action', 'phone_click');
  await expect(hero).toHaveAttribute('aria-label', 'Позвонить: 054-549-0623');
  expect(await hero.textContent()).toContain('054-549-0623');
  const initialHero = await hero.evaluate((element) => element.outerHTML);
  const whatsapp = page.locator('.mobile-bar [data-business-action="whatsapp"]');
  const iconMarkup = () => whatsapp.locator('svg').evaluate((element) => element.innerHTML);
  expect(await hero.locator('svg').evaluate((element) => element.innerHTML)).not.toBe(await iconMarkup());
  await page.locator('#lead-name').fill('Тест приёмки');
  await page.locator('#lead-phone').fill('+972500000000');
  await page.locator('.lead-form__submit').click();
  await expect(page.locator('.lead-form__error-contact')).toBeVisible();
  if (page.viewportSize()!.width <= 860) await page.locator('.nav-burger').click();
  const restoredSelector = '[data-business-closed], [data-business-variant], .lead-form__error-contact';
  const before = await page.locator(restoredSelector).evaluateAll((elements) => elements.map((element) => element.outerHTML));
  await setBusinessState(page, 'closed');
  for (const attribute of ['href', 'target', 'rel']) {
    expect(await hero.getAttribute(attribute), attribute).toBe(await whatsapp.getAttribute(attribute));
  }
  await expect(hero).toHaveAttribute('data-action', 'whatsapp_click');
  await expect(hero).toHaveAttribute('aria-label', 'Написать в WhatsApp');
  expect((await hero.innerText()).replace(/\s+/g, ' ').trim()).toBe('Написать в WhatsApp');
  expect(await hero.textContent()).not.toMatch(/054-549-0623|Позвон/);
  expect(await hero.locator('svg').evaluate((element) => element.innerHTML)).toBe(await iconMarkup());
  expect(await page.locator('a[href^="tel:"]').evaluateAll((links) => links.filter((link) => !link.closest('[hidden]')).length)).toBe(0);
  expect(await page.locator('.lead-form__error-contact').innerText()).not.toContain('позвоните');
  expect(await page.locator('.lead-form__error-contact [data-business-variant="closed"] a[href*="wa.me"]').count()).toBeGreaterThan(0);
  await setBusinessState(page, 'open');
  expect(await hero.evaluate((element) => element.outerHTML)).toBe(initialHero);
  expect(await page.locator(restoredSelector).evaluateAll((elements) => elements.map((element) => element.outerHTML))).toEqual(before);
});

test('Загрузка: маркеры final-dev4, отсутствие ошибок страницы, консоли и запросов', async ({ page }) => {
  const errors: string[] = [];
  const navigationStatuses: number[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => errors.push(`requestfailed: ${request.url()} ${request.failure()?.errorText}`));
  page.on('console', (message) => {
    if (!['warning', 'error'].includes(message.type())) return;
    const text = message.text();
    if (message.type() === 'warning' && text.includes('was preloaded using link preload but not used within a few seconds') && text.includes('hero-duo-air-')) return;
    errors.push(`${message.type()}: ${text}`);
  });
  page.on('response', (response) => {
    if (response.request().isNavigationRequest() && response.frame() === page.mainFrame()) {
      navigationStatuses.push(response.status());
    }
  });
  await gotoReady(page);
  expect(navigationStatuses, 'HTTP HTML').toEqual([200]);
  await expect(page.locator('body')).toHaveClass(/page--final-dev3/);
  await expect(page.locator('.hero--final-dev1')).toHaveCount(1);
  const html = await page.content();
  expect(html).toContain('ACTION-BAR-SPEC v2.4.0');
  expect(html).toContain('FINAL-DEV3-DESIGN v2.0.2 | 2026-08-13');
  const cssURL = await page.locator('link[rel="stylesheet"][href]').evaluateAll((links) =>
    (links as HTMLLinkElement[]).map((link) => link.href).find((url) => new URL(url).pathname.endsWith('/client-preview.css')));
  expect(cssURL, 'Стили клиентского Preview подключены').toBeTruthy();
  const css = await page.request.get(cssURL!);
  expect(css.ok()).toBe(true);
  expect(await css.text()).toContain('CLIENT-PREVIEW-MOBILE v1.1.0');
  for (const selector of ['.facts', '#services', '#attorney', '#contact', '.site-footer']) await scrollSection(page, selector);
  expect(errors).toEqual([]);
});

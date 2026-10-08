import { test, expect, gotoReady, setBusinessState, selectService, settle, scrollSection, waitForImages } from './helpers/page';
import {
  assertAttorneyFrames, assertDemoDoesNotCoverActions, assertDnaLineBreak, assertHeroButtonInFirstViewport,
  assertHeroContourGap, assertImagesInViewport, assertNoHorizontalOverflow, assertSectionSpacing,
  firstTextBelowHeader, sectionSelectors, serviceGeometry, visibleTelephoneCount,
} from './helpers/invariants';

test.beforeEach(async ({ page }) => {
  await gotoReady(page);
});

test('1. Нет горизонтального переполнения @hero', async ({ page }, testInfo) => {
  await assertNoHorizontalOverflow(page);
  if (testInfo.project.metadata.heroOnly) return;
  for (const selector of sectionSelectors) {
    await scrollSection(page, selector);
    await assertNoHorizontalOverflow(page);
  }
  for (let index = 0; index < 8; index++) {
    await selectService(page, index);
    await assertNoHorizontalOverflow(page);
  }
});

test('2. Кнопка первого экрана видна без прокрутки на коротком телефоне @hero', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.metadata.heroOnly, 'Требование относится к 360×600 и 390×740');
  await assertHeroButtonInFirstViewport(page);
});

test('3. Отступы Hero: адрес на 8 px выше на десктопе; остальные по --section-pad @hero', async ({ page }, testInfo) => {
  await assertSectionSpacing(page, Boolean(testInfo.project.metadata.heroOnly));
});

test('Hero: адрес в одну строку, зона нажатия 44 px и новая вкладка карты @hero', async ({ page, context }) => {
  const address = page.locator('.hero-address');
  await expect(address).toHaveText('Тель-Авив, Карлибах, 10');
  await expect(address).toHaveAttribute('data-action', 'map_click');
  await expect(address).toHaveAttribute('aria-label', 'Открыть адрес в Google Maps: Тель-Авив, Карлибах, 10');
  await expect(address).toHaveAttribute('target', '_blank');
  await expect(address).toHaveAttribute('rel', 'noopener');
  await expect(address.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  const geometry = await address.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const zone = getComputedStyle(element, '::before');
    const title = document.querySelector('.hero__title')!.getBoundingClientRect();
    const header = document.querySelector('.site-header')!.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(element.querySelector('.hero-address__text')!);
    const lines = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    return {
      lineSpread: Math.max(...lines.map((r) => r.top)) - Math.min(...lines.map((r) => r.top)),
      hitHeight: parseFloat(zone.height), hitTop: box.top + parseFloat(zone.top),
      hitBottom: box.top + parseFloat(zone.top) + parseFloat(zone.height), headerBottom: header.bottom, titleTop: title.top,
      centered: Math.abs((box.left + box.right) / 2 - document.documentElement.clientWidth / 2),
    };
  });
  expect(geometry.lineSpread).toBeLessThanOrEqual(1);
  expect(geometry.hitHeight).toBeGreaterThanOrEqual(44);
  expect(geometry.hitTop).toBeGreaterThanOrEqual(geometry.headerBottom);
  expect(geometry.hitBottom).toBeLessThanOrEqual(geometry.titleTop);
  if (page.viewportSize()!.width <= 860) expect(geometry.centered).toBeLessThanOrEqual(1);
  // Context route intercepts the popup's first request: Google is never contacted.
  await context.route('https://www.google.com/maps/search/**', (route) => route.fulfill({
    status: 200, contentType: 'text/html', body: '<title>Map target intercepted</title>',
  }));
  const popupPromise = page.waitForEvent('popup');
  await address.click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  const url = new URL(popup.url());
  expect(url.origin + url.pathname).toBe('https://www.google.com/maps/search/');
  expect(url.searchParams.get('api')).toBe('1');
  expect(url.searchParams.get('query')).toBe('קרליבך 10, תל אביב');
  await popup.close();
});

test('4. Все восемь услуг сохраняют высоту, позиции «Ведёт» и CTA, карточка центрирована', async ({ page }) => {
  await expect(page.locator('.svc-tab')).toHaveCount(8);
  await expect(page.locator('.svc-media')).toHaveCount(1);
  await expect(page.locator('.svc-card__cta')).toHaveCount(1);
  const measurements: Awaited<ReturnType<typeof serviceGeometry>>[] = [];
  for (let index = 0; index < 8; index++) {
    await selectService(page, index);
    await expect(page.locator('.svc-card:not([hidden])')).toBeVisible();
    const geometry = await serviceGeometry(page);
    measurements.push(geometry);
    for (const axis of ['centerX', 'centerY', 'textCenterY'] as const) {
      expect(Math.abs(geometry[axis]), `Тема ${index + 1}: ${axis}`).toBeLessThanOrEqual(2);
    }
  }
  const heights = measurements.map((item) => item.section.height);
  expect(Math.max(...heights) - Math.min(...heights), 'Разброс высоты #services').toBeLessThanOrEqual(1);
  for (const [index, geometry] of measurements.entries()) {
    for (const part of ['media', 'cta'] as const) {
      for (const field of ['x', 'y', 'width', 'height'] as const) {
        expect(Math.abs(geometry[part][field] - measurements[0][part][field]), `Тема ${index + 1}: ${part}.${field}`).toBeLessThanOrEqual(1);
      }
    }
  }
});

test('5. Фотографии адвокатов имеют одинаковые рамки, desktop-карточки равны по высоте', async ({ page }) => {
  await scrollSection(page, '#attorney');
  await waitForImages(page, '#attorney');
  await assertAttorneyFrames(page);
});

test('6. Каждая строка нижнего абзаца Hero отстоит от контура фигуры минимум на 24 px', async ({ page }) => {
  test.skip(page.viewportSize()!.width < 861, 'Фикстура контура относится к desktop-фото');
  await assertHeroContourGap(page);
});

test('7. Каждый пункт меню ставит верх секции на 20 px под шапкой, текст не спрятан', async ({ page }) => {
  // scroll-padding-top = высота шапки + 20 px: после перехода верх секции должен
  // стоять ровно на 20 px ниже низа закреплённой шапки. Первый текст секции
  // стоит ещё ниже — на сколько именно, решает компоновка секции, это не проверяем.
  const mobileMenu = await page.locator('.nav-burger').isVisible();
  const menuSelector = mobileMenu ? '#nav-drawer' : '.nav-links';
  const targets = await page.locator(`${menuSelector} a[href^="#"]`).evaluateAll((links) => links.map((link) => link.getAttribute('href')!));
  expect(targets).toEqual(['#services', '#precedent', '#attorney', '#contact']);
  for (const target of targets) {
    if (mobileMenu) {
      await page.locator('.nav-burger').click();
      await expect(page.locator('#nav-drawer')).toBeVisible();
    }
    await page.locator(`${menuSelector} a[href="${target}"]`).click();
    if (mobileMenu) await expect(page.locator('.nav-burger')).toHaveAttribute('aria-expanded', 'false');
    await settle(page);
    const gap = await firstTextBelowHeader(page, target);
    const { sectionTop, atPageEnd } = await page.locator(target).evaluate((section) => ({
      sectionTop: section.getBoundingClientRect().top - document.querySelector('.site-header')!.getBoundingClientRect().bottom,
      // Последняя секция на высоком окне не может встать под шапку: страница кончается раньше.
      atPageEnd: window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1,
    }));
    expect(sectionTop, `${target}: верх секции под шапкой на ${sectionTop.toFixed(2)} px, ожидается 20`).toBeGreaterThanOrEqual(18);
    if (!atPageEnd) {
      expect(sectionTop, `${target}: верх секции под шапкой на ${sectionTop.toFixed(2)} px, ожидается 20`).toBeLessThanOrEqual(22);
    }
    expect(gap, `${target}: первый текст ближе 20 px к шапке (${gap.toFixed(2)} px)`).toBeGreaterThanOrEqual(19);
  }
});

test('8. В теме «Отцовство» фраза «тест ДНК» целиком начинается с новой строки', async ({ page }) => {
  await selectService(page, 4);
  await assertDnaLineBreak(page);
});

test('9. В нерабочее время нет видимых телефонных ссылок, в рабочее они возвращаются', async ({ page }) => {
  await expect.poll(() => visibleTelephoneCount(page)).toBeGreaterThan(0);
  await setBusinessState(page, 'closed');
  await expect.poll(() => visibleTelephoneCount(page)).toBe(0);
  const mobileMenu = await page.locator('.nav-burger').isVisible();
  if (mobileMenu) {
    await page.locator('.nav-burger').click();
    await expect(page.locator('#nav-drawer')).toBeVisible();
    expect(await visibleTelephoneCount(page), 'Телефон не появляется в открытом меню').toBe(0);
    await page.locator('.nav-burger').click();
  }
  for (const selector of ['#contact', '.site-footer']) {
    await scrollSection(page, selector);
    expect(await visibleTelephoneCount(page), `Нерабочее время: ${selector}`).toBe(0);
  }
  await setBusinessState(page, 'open');
  await expect.poll(() => visibleTelephoneCount(page)).toBeGreaterThan(0);
});

test('10. Переключатель показа не перекрывает кнопки и ссылки подготовки и консультации', async ({ page }) => {
  for (const state of ['open', 'closed'] as const) {
    await setBusinessState(page, state);
    for (const section of ['.precedent-card', '#contact']) {
      await scrollSection(page, section);
      await assertDemoDoesNotCoverActions(page);
      // Секции выше окна: проверяем и положение каждого действия, а не только верх секции.
      const actions = page.locator(`${section} a[href], ${section} button`);
      for (const action of await actions.all()) {
        if (!await action.isVisible()) continue;
        await action.scrollIntoViewIfNeeded();
        await settle(page);
        await assertDemoDoesNotCoverActions(page);
      }
    }
  }
});

test('11. Изображения в кадре загружены, alt контентных изображений непустой @hero', async ({ page }, testInfo) => {
  if (testInfo.project.metadata.heroOnly) {
    await waitForImages(page, '.hero');
    await assertImagesInViewport(page, '.hero');
    return;
  }
  for (const selector of sectionSelectors) {
    await scrollSection(page, selector);
    await waitForImages(page);
    await assertImagesInViewport(page);
    // Проверяем и нижние изображения длинной секции, которые не попали в первый кадр.
    for (const image of await page.locator(`${selector} img`).all()) {
      if (!await image.isVisible()) continue;
      await image.scrollIntoViewIfNeeded();
      await settle(page);
      await waitForImages(page);
      await assertImagesInViewport(page);
    }
  }
});

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

test('3. Видимые отступы первого экрана и padding секций равны --section-pad @hero', async ({ page }, testInfo) => {
  await assertSectionSpacing(page, Boolean(testInfo.project.metadata.heroOnly));
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

test('7. Каждый пункт меню ставит первый текст секции в пределах 20 px под шапкой', async ({ page }) => {
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
    expect(gap, `${target}: первый текст не перекрыт шапкой`).toBeGreaterThanOrEqual(0);
    expect(gap, `${target}: зазор под шапкой ${gap.toFixed(2)} px`).toBeLessThanOrEqual(20);
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

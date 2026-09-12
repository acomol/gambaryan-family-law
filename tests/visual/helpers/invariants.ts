import { expect, type Page } from '@playwright/test';
import contour from '../fixtures/hero-figure-contour.json';

export const sectionSelectors = [
  '.hero', '.facts', '#services', '.precedent-card', '#attorney', '#contact', '.site-footer',
] as const;

export async function assertNoHorizontalOverflow(page: Page) {
  const size = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(size.scrollWidth, JSON.stringify(size)).toBeLessThanOrEqual(size.clientWidth);
}

export async function assertHeroButtonInFirstViewport(page: Page) {
  const buttons = page.locator('.hero__actions a');
  expect(await buttons.count(), 'В первом экране должна быть CTA').toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY), 'Проверка CTA без прокрутки').toBe(0);
  for (const button of await buttons.all()) {
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    const viewport = page.viewportSize()!;
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    const uncovered = await button.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      // Проверяем также перекрытие фиксированными элементами, а не только bbox.
      return [[0.1, 0.1], [0.9, 0.1], [0.5, 0.5], [0.1, 0.9], [0.9, 0.9]].every(([x, y]) => {
        const hit = document.elementFromPoint(rect.left + x * rect.width, rect.top + y * rect.height);
        return !!hit && (hit === element || element.contains(hit));
      });
    });
    expect(uncovered, 'CTA первого экрана не перекрыта').toBe(true);
  }
}

export async function assertSectionSpacing(page: Page, heroOnly: boolean) {
  const measurements = await page.evaluate((onlyHero) => {
    const hero = document.querySelector<HTMLElement>('.hero')!;
    const tokenAt = (element: Element) => {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;visibility:hidden;height:var(--section-pad);width:0;padding:0;border:0;min-height:0;';
      element.append(probe);
      const value = parseFloat(getComputedStyle(probe).height);
      probe.remove();
      return value;
    };
    const first = hero.querySelector(innerWidth > 860 ? '.hero-row .eyebrow' : '.hero__title')!;
    const note = hero.querySelector('.hero__note')!;
    const header = document.querySelector('.site-header')!.getBoundingClientRect();
    const token = tokenAt(hero);
    const result = [
      { name: 'Hero: верхний видимый отступ', value: first.getBoundingClientRect().top - header.bottom, token },
      { name: 'Hero: нижний видимый отступ', value: hero.getBoundingClientRect().bottom - note.getBoundingClientRect().bottom, token },
    ];
    if (!onlyHero) {
      for (const selector of ['#services > .container', '#attorney > .container', '#contact > .container', '.site-footer__inner']) {
        const element = document.querySelector(selector)!;
        const style = getComputedStyle(element);
        result.push(
          { name: `${selector}: padding-block-start`, value: parseFloat(style.paddingBlockStart), token: tokenAt(element) },
          { name: `${selector}: padding-block-end`, value: parseFloat(style.paddingBlockEnd), token: tokenAt(element) },
        );
      }
    }
    return result;
  }, heroOnly);
  for (const item of measurements) {
    expect(item.token, item.name).toBeGreaterThan(0);
    expect(Math.abs(item.value - item.token), JSON.stringify(item)).toBeLessThanOrEqual(2);
  }
}

export async function serviceGeometry(page: Page) {
  return page.evaluate(() => {
    const box = (selector: string) => {
      const rect = document.querySelector(selector)!.getBoundingClientRect();
      return { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height };
    };
    const panel = document.querySelector('.svc-card:not([hidden])')!;
    const title = panel.querySelector('.svc-title')!.getBoundingClientRect();
    const lead = panel.querySelector('.svc-lead')!.getBoundingClientRect();
    const stage = box('.svc-stage');
    const card = box('.svc-card:not([hidden])');
    return {
      section: box('#services'), media: box('.svc-media'), cta: box('.svc-card__cta'),
      centerX: card.x + card.width / 2 - stage.x - stage.width / 2,
      centerY: card.y + card.height / 2 - stage.y - stage.height / 2,
      textCenterY: (Math.min(title.top, lead.top) + Math.max(title.bottom, lead.bottom)) / 2 + scrollY - stage.y - stage.height / 2,
    };
  });
}

export async function assertAttorneyFrames(page: Page) {
  const frames = await page.locator('.attorney-photo').evaluateAll((images) => images.map((image) => {
    const photo = image.getBoundingClientRect();
    const card = image.closest('.attorney-card')!.getBoundingClientRect();
    const style = getComputedStyle(image);
    return { width: photo.width, height: photo.height, cardHeight: card.height, fit: style.objectFit, border: style.border, radius: style.borderRadius };
  }));
  expect(frames).toHaveLength(2);
  expect(Math.abs(frames[0].width - frames[1].width), 'Ширина рамок фотографий').toBeLessThanOrEqual(1);
  expect(Math.abs(frames[0].height - frames[1].height), 'Высота рамок фотографий').toBeLessThanOrEqual(1);
  expect(frames[0].border).toBe(frames[1].border);
  expect(frames[0].radius).toBe(frames[1].radius);
  for (const frame of frames) {
    expect(frame.width).toBeGreaterThan(0);
    expect(Math.abs(frame.height - frame.width * 5 / 4), 'Рамка 4:5').toBeLessThanOrEqual(1);
    expect(frame.fit).toBe('cover');
  }
  if (page.viewportSize()!.width >= 861) {
    expect(Math.abs(frames[0].cardHeight - frames[1].cardHeight), 'Высота карточек на десктопе').toBeLessThanOrEqual(1);
  }
}

export async function assertHeroContourGap(page: Page) {
  const measurement = await page.evaluate(() => {
    const image = document.querySelector<HTMLImageElement>('.hero-photo')!;
    const style = getComputedStyle(image);
    const imageBox = image.getBoundingClientRect();
    const note = document.querySelector('.hero__note')!;
    const range = document.createRange();
    range.selectNodeContents(note);
    const lines: { top: number; bottom: number; right: number }[] = [];
    for (const rect of range.getClientRects()) {
      if (rect.width <= 0 || rect.height <= 0) continue;
      const line = lines.find((item) => Math.abs(item.top - rect.top) < 1);
      if (line) {
        line.bottom = Math.max(line.bottom, rect.bottom);
        line.right = Math.max(line.right, rect.right);
      } else lines.push({ top: rect.top, bottom: rect.bottom, right: rect.right });
    }
    return {
      image: {
        left: imageBox.left, top: imageBox.top, width: imageBox.width, height: imageBox.height,
        naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, source: image.currentSrc,
        fit: style.objectFit, position: style.objectPosition,
        transform: style.transform, border: [style.borderLeftWidth, style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth],
        padding: [style.paddingLeft, style.paddingTop, style.paddingRight, style.paddingBottom],
      }, lines,
    };
  });
  const photo = measurement.image;
  expect(photo.fit, 'Фикстура рассчитана для object-fit: cover').toBe('cover');
  expect(photo.transform, 'Desktop contour mapping требует нетрансформированного фото').toBe('none');
  expect(photo.source, 'Фикстура подходит только к hero-duo-air').toMatch(/\/hero-duo-air-\d+w\./);
  expect(photo.naturalWidth).toBeGreaterThan(0);
  expect(photo.naturalHeight).toBeGreaterThan(0);
  expect(measurement.lines.length, 'У абзаца должны быть видимые строки').toBeGreaterThan(0);
  expect(contour.pointsYx.length).toBeGreaterThan(1);
  const [sourceWidth, sourceHeight] = contour.size;
  expect(Math.abs(photo.naturalWidth / photo.naturalHeight - sourceWidth / sourceHeight), 'Пропорции source соответствуют фикстуре').toBeLessThan(0.003);
  const border = photo.border.map(parseFloat);
  const padding = photo.padding.map(parseFloat);
  const width = photo.width - border[0] - border[2] - padding[0] - padding[2];
  const height = photo.height - border[1] - border[3] - padding[1] - padding[3];
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const tokens = photo.position.split(/\s+/);
  expect(tokens, 'Computed object-position: две координаты').toHaveLength(2);
  const positionOffset = (value: string, freeSpace: number, axis: 'x' | 'y') => {
    if (value.endsWith('%')) return freeSpace * parseFloat(value) / 100;
    if (value.endsWith('px')) return parseFloat(value);
    if (value === 'center') return freeSpace / 2;
    if (value === (axis === 'x' ? 'left' : 'top')) return 0;
    if (value === (axis === 'x' ? 'right' : 'bottom')) return freeSpace;
    throw new Error(`Неподдерживаемый object-position: ${photo.position}`);
  };
  const offsetX = photo.left + border[0] + padding[0] + positionOffset(tokens[0], width - sourceWidth * scale, 'x');
  const offsetY = photo.top + border[1] + padding[1] + positionOffset(tokens[1], height - sourceHeight * scale, 'y');
  const points = contour.pointsYx;
  for (let i = 1; i < points.length; i++) expect(points[i][0]).toBeGreaterThan(points[i - 1][0]);
  const at = (y: number) => {
    for (let i = 1; i < points.length; i++) {
      const [ay, ax] = points[i - 1];
      const [by, bx] = points[i];
      if (y <= by) return ax + (bx - ax) * (y - ay) / (by - ay);
    }
    return points[points.length - 1][1];
  };
  for (const [index, line] of measurement.lines.entries()) {
    const low = (line.top - offsetY) / scale;
    const high = (line.bottom - offsetY) / scale;
    // За пределами размеченного контура нельзя объявлять строку безопасной.
    expect(low, `Строка ${index + 1}: фикстура покрывает верх строки`).toBeGreaterThanOrEqual(points[0][0]);
    expect(high, `Строка ${index + 1}: фикстура покрывает низ строки`).toBeLessThanOrEqual(points[points.length - 1][0]);
    const boundary = Math.min(at(low), at(high), ...points.filter(([y]) => y >= low && y <= high).map(([, x]) => x));
    const safeBoundary = offsetX + (boundary - contour.sourcePixelUncertainty) * scale;
    const gap = safeBoundary - line.right;
    expect(gap, `Строка ${index + 1}: зазор ${gap.toFixed(2)} CSS px, с погрешностью контура`).toBeGreaterThanOrEqual(24);
  }
}

export async function firstTextBelowHeader(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const tops: number[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent?.trim() || !node.parentElement) continue;
      const style = getComputedStyle(node.parentElement);
      if (style.visibility !== 'visible' || Number(style.opacity) === 0 || node.parentElement.closest('[hidden],[aria-hidden="true"]')) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) if (rect.width > 0 && rect.height > 0) tops.push(rect.top);
    }
    if (!tops.length) throw new Error('У секции нет видимого текста');
    return Math.min(...tops) - document.querySelector('.site-header')!.getBoundingClientRect().bottom;
  });
}

export async function assertDnaLineBreak(page: Page) {
  const geometry = await page.locator('.svc-card:not([hidden]) .svc-title').evaluate((title) => {
    const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    const text = nodes.map((node) => node.data).join('');
    const phrase = 'тест ДНК';
    const start = text.indexOf(phrase);
    if (start < 0) throw new Error('В заголовке отсутствует «тест ДНК»');
    const charRects = (from: number, to: number) => {
      const rects: { left: number; top: number; bottom: number }[] = [];
      let offset = 0;
      for (const node of nodes) {
        for (let i = Math.max(0, from - offset); i < Math.min(node.length, to - offset); i++) {
          if (/\s/u.test(node.data[i])) continue;
          const range = document.createRange();
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          for (const rect of range.getClientRects()) {
            if (rect.width && rect.height) rects.push({ left: rect.left, top: rect.top, bottom: rect.bottom });
          }
        }
        offset += node.length;
      }
      return rects;
    };
    return { phrase: charRects(start, start + phrase.length), before: charRects(0, start) };
  });
  expect(geometry.phrase).toHaveLength(7);
  expect(geometry.before.length).toBeGreaterThan(0);
  const top = geometry.phrase[0].top;
  for (const rect of geometry.phrase) expect(Math.abs(rect.top - top), '«тест ДНК» целиком на одной строке').toBeLessThanOrEqual(1);
  const previousBottom = Math.max(...geometry.before.map((rect) => rect.bottom));
  expect(top, '«тест ДНК» начинается с новой строки').toBeGreaterThanOrEqual(previousBottom - 1);
}

export async function visibleTelephoneCount(page: Page) {
  return page.locator('a[href^="tel:"]').evaluateAll((links) => links.filter((link) => {
    const style = getComputedStyle(link);
    const rect = link.getBoundingClientRect();
    return !link.closest('[hidden],[inert]') && style.visibility === 'visible' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
  }).length);
}

export async function assertDemoDoesNotCoverActions(page: Page) {
  const overlaps = await page.evaluate(() => {
    const toggle = document.querySelector<HTMLElement>('[data-business-demo]')!;
    const toggleRect = toggle.getBoundingClientRect();
    const toggleStyle = getComputedStyle(toggle);
    // На мобильном переключатель штатно скрыт, когда видна форма (Action Bar).
    // Скрытый элемент имеет нулевую площадь перекрытия; отсутствие узла — ошибка.
    if (toggle.hidden || toggleRect.width === 0 || toggleRect.height === 0 || toggleStyle.visibility !== 'visible' || toggleStyle.display === 'none' || Number(toggleStyle.opacity) === 0) return [];
    return [...document.querySelectorAll<HTMLElement>('a[href],button,[role="button"],input[type="submit"]')].flatMap((element) => {
      if (element === toggle || toggle.contains(element)) return [];
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (element.closest('[hidden],[inert]') || style.visibility !== 'visible' || Number(style.opacity) === 0 || !rect.width || !rect.height) return [];
      // Учитываем только реальную площадь в кадре.
      const left = Math.max(rect.left, toggleRect.left, 0);
      const top = Math.max(rect.top, toggleRect.top, 0);
      const right = Math.min(rect.right, toggleRect.right, innerWidth);
      const bottom = Math.min(rect.bottom, toggleRect.bottom, innerHeight);
      const area = Math.max(0, right - left) * Math.max(0, bottom - top);
      if (!area) return [];
      return [{ selector: element.id || element.className, text: element.textContent?.trim(), area, percentage: area / (rect.width * rect.height) * 100 }];
    });
  });
  expect(overlaps, `Переключатель перекрывает действия: ${JSON.stringify(overlaps)}`).toEqual([]);
}

export async function assertImagesInViewport(page: Page, rootSelector = 'body') {
  const failures = await page.locator(rootSelector).evaluate((root) => [...root.querySelectorAll('img')].flatMap((image) => {
    const rect = image.getBoundingClientRect();
    const style = getComputedStyle(image);
    if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth || style.visibility !== 'visible' || style.display === 'none' || Number(style.opacity) === 0 || image.closest('[hidden]')) return [];
    const errors: string[] = [];
    if (!image.complete || image.naturalWidth <= 0) errors.push('не загружено');
    // Единственное декоративное изображение в source: повторный портрет в подготовке.
    // Пустой alt любого нового изображения не освобождает его от этой проверки.
    const decorative = image.matches('.precedent-photo');
    if (decorative ? image.getAttribute('alt') !== '' : !image.getAttribute('alt')?.trim()) errors.push(decorative ? 'у декоративного фото ожидается alt=""' : 'пустой или отсутствующий alt');
    return errors.map((error) => ({ image: image.currentSrc || image.src, error }));
  }));
  expect(failures, JSON.stringify(failures)).toEqual([]);
}

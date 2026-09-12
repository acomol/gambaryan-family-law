import { test as base, expect, type Page } from '@playwright/test';

// Context-level guard applies before navigation, also to popups. A form test may
// override /api/lead with page.route; no unmocked write can reach a live Preview.
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route('**/*', async (route) => {
      const request = route.request();
      if (new URL(request.url()).pathname.replace(/\/$/, '') === '/api/lead') {
        await route.fulfill({ status: 503, json: { ok: false, error: 'visual_test_guard' } });
      } else if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
        await route.abort('blockedbyclient');
      } else {
        await route.continue();
      }
    });
    await use(context);
  },
});
export { expect };

export async function settle(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

export async function waitForImages(page: Page, rootSelector?: string) {
  await expect.poll(() => page.evaluate((selector) => {
    const roots = selector ? [...document.querySelectorAll(selector)] : [document];
    return roots.flatMap((root) => [...root.querySelectorAll<HTMLImageElement>('img')])
      .filter((img) => {
        const rect = img.getBoundingClientRect();
        const style = getComputedStyle(img);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' &&
          style.display !== 'none' && (Boolean(selector) ||
            (rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth));
      }).filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src);
  }, rootSelector), { message: 'Все изображения в снимаемой области загружены', timeout: 15_000 }).toEqual([]);
  await page.evaluate(async (selector) => {
    const roots = selector ? [...document.querySelectorAll(selector)] : [document];
    await Promise.all(roots.flatMap((root) => [...root.querySelectorAll<HTMLImageElement>('img')])
      .filter((img) => img.complete && img.naturalWidth > 0).map((img) => img.decode()));
  }, rootSelector);
}

export async function setBusinessState(page: Page, state: 'open' | 'closed') {
  const toggle = page.locator('[data-business-demo]');
  await expect(toggle).toHaveCount(1);
  // Hidden at the top on mobile: invoke the real click handler without scrolling.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (await toggle.getAttribute('data-demo-mode') === 'manual' &&
        await page.locator('.mobile-bar').getAttribute('data-business-state') === state) break;
    await toggle.evaluate((element) => (element as HTMLElement).click());
  }
  await expect(toggle).toHaveAttribute('data-demo-mode', 'manual');
  await expect(page.locator('.mobile-bar')).toHaveAttribute('data-business-state', state);
  await settle(page);
}

export async function gotoReady(page: Page) {
  const response = await page.goto('./', { waitUntil: 'load' });
  expect(response?.ok(), 'HTML final-dev4 доступен').toBeTruthy();
  await expect(page.locator('body')).toHaveClass(/page--final-dev4/);
  await page.addStyleTag({ content: `
    *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
    html { scroll-behavior: auto !important; }
  ` });
  // Load lazy images without first arming the Action Bar by scrolling the page.
  await page.locator('img').evaluateAll((images) => images.forEach((img) => { (img as HTMLImageElement).loading = 'eager'; }));
  await page.evaluate(() => document.fonts.ready);
  await setBusinessState(page, 'open');
  await page.evaluate(() => scrollTo(0, 0));
  await settle(page);
  await waitForImages(page);
}

export async function scrollSection(page: Page, selector: string) {
  await page.locator(selector).first().evaluate((element) => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await settle(page);
  await waitForImages(page, selector);
}

export async function selectService(page: Page, index: number) {
  const tab = page.locator('.svc-tab').nth(index);
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.svc-card:not([hidden])')).toHaveCount(1);
  await settle(page);
}

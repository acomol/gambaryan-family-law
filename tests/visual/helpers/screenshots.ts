import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Page, TestInfo } from '@playwright/test';
import { expect, settle, waitForImages } from './page';
import { sizeName } from './matrix';

export const reviewRoot = resolve(__dirname, '../../../build/visual-review');
export type Capture = {
  section: string; state: string; selector?: string; fullPage?: boolean;
  group: 'sections' | 'services' | 'forms';
};
export type CaptureRecord = Capture & { filename: string; size: string; platform: string };

export async function capture(page: Page, testInfo: TestInfo, options: Capture) {
  const size = sizeName(page.viewportSize()!);
  const filename = `${options.section}--${options.state}--${size}.png`;
  const folder = resolve(reviewRoot, 'captures', size);
  await mkdir(folder, { recursive: true });
  if (options.selector) await page.locator(options.selector).scrollIntoViewIfNeeded();
  await settle(page);
  await waitForImages(page, options.fullPage ? 'body' : options.selector);
  const screenshotOptions = { animations: 'disabled' as const, caret: 'hide' as const, scale: 'css' as const };
  const target = options.selector ? page.locator(options.selector) : page;
  const actual = options.selector
    ? await page.locator(options.selector).screenshot(screenshotOptions)
    : await page.screenshot({ ...screenshotOptions, fullPage: options.fullPage || false });
  // Write before comparison: a failing diff must not remove the review material.
  await writeFile(resolve(folder, filename), actual);
  const record: CaptureRecord = { ...options, filename, size, platform: process.platform };
  await writeFile(resolve(folder, `${filename}.json`), JSON.stringify(record));
  await testInfo.attach(filename, { body: actual, contentType: 'image/png' });
  if (testInfo.project.ignoreSnapshots) {
    testInfo.annotations.push({ type: 'comparison-skipped', description: 'Режим review: свежий снимок без сравнения' });
    return;
  }
  const updating = ['all', 'changed', 'missing'].includes(testInfo.config.updateSnapshots);
  const baseline = testInfo.snapshotPath(filename, { kind: 'screenshot' });
  if (process.env.CI && process.platform === 'linux' && !existsSync(baseline) && !updating) {
    testInfo.skip(true, `Нет Linux-эталона: ${filename}; свежий снимок сохранён, инварианты и контактные листы выполняются`);
  }
  if (options.selector) {
    await expect(target).toHaveScreenshot(filename, screenshotOptions);
  } else {
    await expect(page).toHaveScreenshot(filename, { ...screenshotOptions, fullPage: options.fullPage || false });
  }
}

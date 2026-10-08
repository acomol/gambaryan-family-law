import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import { viewports, heroViewports, sizeName } from './helpers/matrix';

const root = resolve(__dirname, '../..');
const port = Number(process.env.VISUAL_PORT || 4174);
const baseURL = process.env.BASE_URL || `http://127.0.0.1:${port}/`;

export default defineConfig({
  testDir: __dirname,
  tsconfig: './tsconfig.json',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.002, threshold: 0.2 },
  },
  updateSnapshots: 'none',
  snapshotPathTemplate: '{testDir}/snapshots/{testFilePath}/{arg}-{platform}{ext}',
  outputDir: resolve(root, 'build/visual-results'),
  reporter: [
    ['list'],
    ['html', { outputFolder: resolve(root, 'build/visual-report'), open: 'never' }],
    ['json', { outputFile: resolve(root, 'build/visual-results.json') }],
  ],
  use: {
    browserName: 'chromium', baseURL: `${baseURL.replace(/\/$/, '')}/`,
    deviceScaleFactor: 1, reducedMotion: 'reduce', locale: 'ru-RU',
    timezoneId: 'Asia/Jerusalem', colorScheme: 'light', serviceWorkers: 'block',
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
  },
  webServer: process.env.BASE_URL ? undefined : {
    command: 'node --experimental-strip-types tests/visual/helpers/server.ts',
    cwd: root, url: `http://127.0.0.1:${port}/`, reuseExistingServer: false, timeout: 20_000,
  },
  projects: [
    { name: 'prepare-review', testMatch: '**/review/prepare.setup.ts', teardown: 'contact-sheets' },
    ...viewports.map((viewport) => ({
      name: sizeName(viewport), use: { viewport },
      testMatch: /(?:sections|states|invariants|python-matrix)\.spec\.ts$/,
      dependencies: ['prepare-review'], metadata: { heroOnly: false },
    })),
    ...heroViewports.map((viewport) => ({
      name: sizeName(viewport), use: { viewport },
      testMatch: /(?:sections|states|invariants)\.spec\.ts$/, grep: /@hero/,
      dependencies: ['prepare-review'], metadata: { heroOnly: true },
    })),
    { name: 'contact-sheets', testMatch: '**/review/contact-sheet.spec.ts' },
  ],
});

// render-previews.mjs — рендерит письма офиса (новая заявка / SLA / эскалация,
// EmailTemplates.gs) с ВЫМЫШЛЕННЫМИ данными в HTML-файлы (apps-script/preview/out/)
// и скриншотит их Playwright'ом (docs/email-previews/) — задача 0.4.0 Task B,
// "Previews for the owner".
//
// Playwright не входит в node_modules этого репозитория (standalone Apps
// Script проект без npm-зависимостей вовсе) — грузится через createRequire
// из package.json соседнего репо, где @playwright/test уже установлен
// (задача: "the main checkout has no node_modules").
//
// Запуск: node apps-script/preview/render-previews.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGasContext } from '../test/helpers/load-gas.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'out');
const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'docs', 'email-previews');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// EmailTemplates.gs — ЧИСТАЯ ЛОГИКА, тот же приём загрузки, что и в
// test/email-templates.test.mjs: рендерим ТЕМ ЖЕ кодом, что уходит в реальные
// письма (Notifications.gs), не отдельной копией разметки.
const ctx = loadGasContext(['Utils.gs', 'EmailTemplates.gs']);

// Ссылка на «Заявки» в превью — заведомо нерабочая (id не существует), чтобы
// не намекать на реальную таблицу клиента; сами превью — только про внешний вид.
const FICTIONAL_SHEET_URL = 'https://docs.google.com/spreadsheets/d/FICTIONAL-PREVIEW-ID/edit#gid=0&range=A5:N5';

const templates = [
  {
    key: 'new-lead',
    label: 'Новая заявка',
    render: function () {
      // build-round: длинное составное имя/email — EMAIL-CRITIQUE.md "Mobile
      // wrapping" рекомендовал добавить это в фикстуры превью (не было сделано
      // в design-only задаче, эта — код-раунд, .mjs трогаем).
      return ctx.renderNewLeadEmail_({
        leadNo: 'G-0052',
        receivedAtLabel: '23.09.2026 17:52',
        name: 'Александра Никифорова-Штейнберг',
        phone: '+972502223344',
        email: 'a.nikiforova-steinberg@example.com',
        source: 'Google Ads',
        sheetUrl: FICTIONAL_SHEET_URL
      });
    }
  },
  {
    key: 'sla-first-attempt',
    label: 'SLA — нет первой попытки',
    render: function () {
      return ctx.renderSlaFirstAttemptEmail_({
        leadNo: 'G-0035',
        name: 'Игорь Левин',
        phone: '+972521112233',
        sheetUrl: FICTIONAL_SHEET_URL
      });
    }
  },
  {
    key: 'sla-escalation',
    label: 'Эскалация',
    render: function () {
      return ctx.renderSlaEscalationEmail_({
        leadNo: 'G-0036',
        name: 'Анна Штейн',
        phone: '+972541239876',
        sheetUrl: FICTIONAL_SHEET_URL
      });
    }
  }
];

const rendered = templates.map(function (t) {
  const email = t.render();
  const htmlPath = path.join(OUT_DIR, t.key + '.html');
  const textPath = path.join(OUT_DIR, t.key + '.txt');
  fs.writeFileSync(htmlPath, email.html, 'utf8');
  fs.writeFileSync(textPath, email.text, 'utf8');
  console.log('rendered: ' + htmlPath + ' (subject: "' + email.subject + '")');
  return { key: t.key, label: t.label, htmlPath: htmlPath, subject: email.subject };
});

const require = createRequire('I:/GIT/gamb-lead-pipeline/package.json');
const { chromium } = require('@playwright/test');

const VIEWPORTS = [
  { width: 390, height: 1000, label: '390' },
  { width: 1024, height: 1000, label: '1024' }
];
const SCHEMES = ['light', 'dark'];

const browser = await chromium.launch();
try {
  for (const t of rendered) {
    const fileUrl = 'file://' + t.htmlPath.replace(/\\/g, '/');
    for (const viewport of VIEWPORTS) {
      for (const scheme of SCHEMES) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          colorScheme: scheme
        });
        const page = await context.newPage();
        await page.goto(fileUrl);
        await page.waitForLoadState('networkidle');
        const outPath = path.join(SCREENSHOT_DIR, t.key + '-' + viewport.label + '-' + scheme + '.png');
        await page.screenshot({ path: outPath, fullPage: true });
        await context.close();
        console.log('screenshot: ' + outPath);
      }
    }
  }
} finally {
  await browser.close();
}

console.log('');
console.log('Готово: HTML в ' + OUT_DIR + ', PNG (' + rendered.length * VIEWPORTS.length * SCHEMES.length + ' шт.) в ' + SCREENSHOT_DIR);

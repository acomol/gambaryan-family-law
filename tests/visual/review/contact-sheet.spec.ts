import { readdir, readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test, expect } from '@playwright/test';
import { allViewports, heroViewports, sizeName } from '../helpers/matrix';
import { reviewRoot, type CaptureRecord } from '../helpers/screenshots';

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!));
const groups = ['sections', 'services', 'forms'] as const;
const labels = { sections: 'Секции и состояния страницы', services: 'Вкладки услуг', forms: 'Состояния формы' };
const sectionOrder = ['hero', 'facts', 'services', 'preparation', 'attorneys', 'contact', 'footer', 'full-page'];
const closedOrder = ['hero', 'header', 'contact', 'footer'];
const serviceOrder = ['divorce', 'alimony', 'property', 'children', 'paternity', 'mediation', 'prenuptial', 'protection'];
const formOrder = ['form-empty', 'form-success', 'form-failure'];
const sectionLabels: Record<string, string> = {
  hero: 'Первый экран', facts: 'Кубики', services: 'Услуги', preparation: 'Подготовка',
  attorneys: 'Адвокаты', contact: 'Консультация', footer: 'Подвал', 'full-page': 'Полная страница', header: 'Шапка', menu: 'Меню',
};
const stateLabels: Record<string, string> = {
  open: 'Рабочее время', closed: 'Нерабочее время', divorce: 'Развод', alimony: 'Алименты',
  property: 'Раздел имущества', children: 'Дети', paternity: 'Отцовство', mediation: 'Медиация',
  prenuptial: 'Брачный договор', protection: 'Защита при угрозах',
  'form-empty': 'Ошибки пустой формы', 'form-success': 'Успех', 'form-failure': 'Сбой доставки',
};
function order(record: CaptureRecord) {
  if (record.group === 'services') return serviceOrder.indexOf(record.state);
  if (record.group === 'forms') return formOrder.indexOf(record.state);
  if (record.section === 'menu') return 20;
  return record.state === 'closed' ? 10 + closedOrder.indexOf(record.section) : sectionOrder.indexOf(record.section);
}

for (const viewport of allViewports) {
  const size = sizeName(viewport);
  const heroOnly = heroViewports.some((item) => sizeName(item) === size);
  for (const group of heroOnly ? ['sections'] as const : groups) {
    test(`${labels[group]} — контактный лист ${size}`, async ({ page }, testInfo) => {
      const folder = resolve(reviewRoot, 'captures', size);
      const entries = await readdir(folder).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return [];
        throw error;
      });
      const records = (await Promise.all(entries.filter((file) => file.endsWith('.png.json'))
        .map(async (file) => JSON.parse(await readFile(resolve(folder, file), 'utf8')) as CaptureRecord)))
        .filter((record) => record.group === group).sort((a, b) => order(a) - order(b));
      const expected = heroOnly ? 2 : group === 'services' ? 8 : group === 'forms' ? 3 : 12 + Number(viewport.width <= 860);
      const figures = await Promise.all(records.map(async (record) => {
        const data = (await readFile(resolve(folder, record.filename))).toString('base64');
        const label = `${sectionLabels[record.section]} — ${record.section === 'menu' ? 'Открыто' : stateLabels[record.state]} — ${size}`;
        return `<figure><figcaption>${escape(label)}</figcaption><img alt="${escape(record.filename)}" src="data:image/png;base64,${data}"></figure>`;
      }));
      await page.setViewportSize({ width: Math.min(viewport.width, 960) + 32, height: 900 });
      await page.setContent(`<!doctype html><html lang="ru"><meta charset="utf-8"><title>${escape(labels[group])} ${size}</title>
        <style>*{box-sizing:border-box}body{margin:0;padding:16px;background:#ddd;color:#111;font:16px Arial,sans-serif}h1{font-size:20px}figure{margin:0 0 20px}figcaption{padding:10px 0;font-weight:bold}img{display:block;width:100%;height:auto;background:white}</style>
        <h1>${escape(labels[group])} — ${size} — ${process.platform}</h1>
        <p>Свежие снимки: ${records.length}/${expected}. ${records.length === expected ? '' : 'НЕПОЛНЫЙ ПРОГОН: см. ошибки в отчёте.'}</p>${figures.join('')}</html>`);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((img) => img.decode()));
        // Stay below Chromium's tall-image limit without losing any section.
        if (document.documentElement.scrollHeight > 28_000) {
          const factor = 26_000 / document.documentElement.scrollHeight;
          document.querySelectorAll('img').forEach((img) => { img.style.width = `${factor * 100}%`; });
        }
      });
      await mkdir(reviewRoot, { recursive: true });
      const path = resolve(reviewRoot, `${group}--${size}--${process.platform}.png`);
      await page.screenshot({ path, fullPage: true, animations: 'disabled', caret: 'hide' });
      await testInfo.attach(`Контактный лист ${size} ${group}`, { path, contentType: 'image/png' });
      expect(records.length, 'Контактный лист содержит всю матрицу; при частичном запуске используйте полный test:visual:review').toBe(expected);
    });
  }
}

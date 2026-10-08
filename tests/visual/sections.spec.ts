import { test, gotoReady } from './helpers/page';
import { capture } from './helpers/screenshots';

const sections = [
  { name: 'Первый экран', section: 'hero', selector: '.hero' },
  { name: 'Кубики с фактами', section: 'facts', selector: '.facts' },
  { name: 'Услуги', section: 'services', selector: '#services' },
  { name: 'Подготовка к разговору', section: 'preparation', selector: '.precedent-card' },
  { name: 'Адвокаты', section: 'attorneys', selector: '#attorney' },
  { name: 'Консультация', section: 'contact', selector: '#contact' },
  { name: 'Подвал', section: 'footer', selector: '.site-footer' },
] as const;

test.beforeEach(async ({ page }) => {
  await gotoReady(page);
});

test.describe('Секции в рабочее время', { tag: '@capture' }, () => {
  for (const section of sections) {
    test(section.name, { tag: section.section === 'hero' ? '@hero' : [] }, async ({ page }, testInfo) => {
      await capture(page, testInfo, {
        section: section.section,
        state: 'open',
        selector: section.selector,
        group: 'sections',
      });
    });
  }

  test('Полная страница', async ({ page }, testInfo) => {
    await capture(page, testInfo, {
      section: 'full-page',
      state: 'open',
      fullPage: true,
      group: 'sections',
    });
  });
});

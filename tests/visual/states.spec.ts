import type { Page, Request } from '@playwright/test';
import { test, expect, gotoReady, selectService, setBusinessState } from './helpers/page';
import { capture } from './helpers/screenshots';

const closedSections = [
  { name: 'Первый экран', section: 'hero', selector: '.hero' },
  { name: 'Шапка', section: 'header', selector: '.site-header' },
  { name: 'Консультация', section: 'contact', selector: '#contact' },
  { name: 'Подвал', section: 'footer', selector: '.site-footer' },
] as const;

const services = [
  { name: 'Развод', state: 'divorce' },
  { name: 'Алименты', state: 'alimony' },
  { name: 'Раздел имущества', state: 'property' },
  { name: 'Дети', state: 'children' },
  { name: 'Отцовство', state: 'paternity' },
  { name: 'Медиация', state: 'mediation' },
  { name: 'Брачный договор', state: 'prenuptial' },
  { name: 'Защита при угрозах', state: 'protection' },
] as const;

// Page routes take priority over the context safety route. Every matched request
// is fulfilled locally, including an unexpected method: no fallback to the API.
async function mockLead(page: Page, status: 200 | 503): Promise<Request[]> {
  const requests: Request[] = [];
  await page.route(url => url.pathname === '/api/lead', async route => {
    requests.push(route.request());
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(status === 200
        ? { ok: true }
        : { ok: false, error: 'temporarily_unavailable' }),
    });
  });
  return requests;
}

async function fillLead(page: Page): Promise<void> {
  await page.locator('#lead-name').fill('Визуальный тест');
  await page.locator('#lead-phone').fill('+972 50 000 0000');
}

function expectMockedLead(requests: Request[]): void {
  expect(requests, 'Форма должна отправить ровно один запрос в локальный мок').toHaveLength(1);
  expect(requests[0].method()).toBe('POST');
  expect(requests[0].postDataJSON()).toMatchObject({
    name: 'Визуальный тест',
    phone: '+972 50 000 0000',
  });
}

test.beforeEach(async ({ page }) => {
  await gotoReady(page);
});

test.describe('Состояния страницы', { tag: '@capture' }, () => {
  for (const section of closedSections) {
    test(`Нерабочее время: ${section.name}`, { tag: section.section === 'hero' ? '@hero' : [] }, async ({ page }, testInfo) => {
      await setBusinessState(page, 'closed');
      await capture(page, testInfo, {
        section: section.section,
        state: 'closed',
        selector: section.selector,
        group: 'sections',
      });
    });
  }

  services.forEach((service, index) => {
    test(`Услуга: ${service.name}`, async ({ page }, testInfo) => {
      await expect(page.locator('.svc-tab')).toHaveCount(8);
      const tab = page.locator('.svc-tab').nth(index);
      await expect(tab).toHaveText(service.name);
      await selectService(page, index);
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      const panelId = await tab.getAttribute('aria-controls');
      expect(panelId, 'Выбранная вкладка должна указывать на свою панель').toBeTruthy();
      await expect(page.locator(`[id="${panelId}"]`)).toBeVisible();
      await capture(page, testInfo, {
        section: 'services',
        state: service.state,
        selector: '#services',
        group: 'services',
      });
    });
  });

  test('Мобильное меню открыто', async ({ page }, testInfo) => {
    test.skip((page.viewportSize()?.width ?? Infinity) > 860, 'Меню снимается только при ширине ≤ 860 px');
    await page.locator('.nav-burger').click();
    await expect(page.locator('.nav-burger')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.nav-drawer')).toBeVisible();
    await capture(page, testInfo, {
      section: 'menu',
      state: 'open',
      group: 'sections',
    });
  });

  test('Форма: пустая отправка показывает ошибки полей', async ({ page }, testInfo) => {
    const requests = await mockLead(page, 503);
    await page.locator('.lead-form__submit').click();
    await expect(page.locator('#lead-name')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#lead-phone')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#lead-name-error')).toHaveText('Введите имя.');
    await expect(page.locator('#lead-phone-error')).toHaveText('Введите номер телефона.');
    await expect(page.locator('.lead-form__error-title')).toHaveText('Проверьте выделенные поля');
    await expect(page.locator('.lead-form__error')).toBeVisible();
    await expect(page.locator('.lead-form__error-contact')).toBeHidden();
    await expect(page.locator('.form-success')).toBeHidden();
    expect(requests, 'Невалидная форма не должна обращаться к API').toHaveLength(0);
    await capture(page, testInfo, {
      section: 'contact',
      state: 'form-empty',
      selector: '#contact',
      group: 'forms',
    });
  });

  test('Форма: успешная отправка с локальным ответом 200', async ({ page }, testInfo) => {
    const requests = await mockLead(page, 200);
    await fillLead(page);
    await page.locator('.lead-form__submit').click();
    await expect(page.locator('.form-success')).toBeVisible();
    await expect(page.locator('.form-success__title')).toHaveText('Заявка получена');
    await expect(page.locator('.lead-form')).toBeHidden();
    expectMockedLead(requests);
    await capture(page, testInfo, {
      section: 'contact',
      state: 'form-success',
      selector: '#contact',
      group: 'forms',
    });
  });

  test('Форма: сбой доставки с локальным ответом 503', async ({ page }, testInfo) => {
    const requests = await mockLead(page, 503);
    await fillLead(page);
    await page.locator('.lead-form__submit').click();
    await expect(page.locator('.lead-form__error')).toBeVisible();
    await expect(page.locator('.lead-form__error-title')).toHaveText('Сервис отправки временно недоступен');
    await expect(page.locator('.lead-form__error-text')).toHaveText('Введённые данные сохранены. Повторите отправку позже.');
    await expect(page.locator('.lead-form__error-contact')).toBeVisible();
    await expect(page.locator('.lead-form__submit')).toHaveText('Повторить отправку');
    await expect(page.locator('.lead-form__submit')).toBeEnabled();
    await expect(page.locator('.lead-form')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('.form-success')).toBeHidden();
    await expect(page.locator('#lead-name')).toHaveValue('Визуальный тест');
    await expect(page.locator('#lead-phone')).toHaveValue('+972 50 000 0000');
    expectMockedLead(requests);
    await capture(page, testInfo, {
      section: 'contact',
      state: 'form-failure',
      selector: '#contact',
      group: 'forms',
    });
  });
});

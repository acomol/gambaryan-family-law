// EmailTemplates.gs — ЧИСТАЯ ЛОГИКА (никаких SpreadsheetApp/MailApp), поэтому
// грузится тем же приёмом, что и BusinessCalendar.gs/SendLog.gs: конкретный
// список файлов, без структурных фейков. Единственная зависимость —
// buildContactLinks_ (Utils.gs), тоже чистая функция.
import { test, assert } from './helpers/harness.mjs';
import { loadGasContext } from './helpers/load-gas.mjs';

const ctx = loadGasContext(['Utils.gs', 'EmailTemplates.gs']);

function baseNewLeadData(overrides) {
  return Object.assign({
    leadNo: 'G-0012',
    receivedAtLabel: '23.09.2026 14:05',
    name: 'Иван Иванов',
    phone: '+972501234567',
    email: 'ivan@example.com',
    source: 'Google Ads',
    sheetUrl: 'https://docs.google.com/spreadsheets/d/abc123/edit#gid=456&range=A5:N5'
  }, overrides || {});
}

// --- escapeHtml_ -------------------------------------------------------------

test('escapeHtml_: экранирует &, <, >, ", \' — базовые сущности HTML', () => {
  assert.equal(ctx.escapeHtml_('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
});

test('escapeHtml_: null/undefined -> пустая строка, не бросает', () => {
  assert.equal(ctx.escapeHtml_(null), '');
  assert.equal(ctx.escapeHtml_(undefined), '');
});

// --- HTML-escaping всех полей письма (задача 0.4.0 Task B, финиш-критерий) ---

test('renderNewLeadEmail_: имя вида "<script>alert(1)</script>" рендерится ТЕКСТОМ, не выполняемой разметкой', () => {
  const data = baseNewLeadData({ name: '<script>alert(1)</script>' });
  const email = ctx.renderNewLeadEmail_(data);
  assert.ok(email.html.indexOf('<script>alert(1)</script>') === -1, 'сырой тег не должен попасть в HTML буквально');
  assert.ok(email.html.indexOf('&lt;script&gt;alert(1)&lt;/script&gt;') !== -1, 'должен быть экранированный вариант');
  // plain-text альтернатива не обязана HTML-экранировать (это не HTML), но
  // должна нести исходный текст без потери/усечения
  assert.ok(email.text.indexOf('<script>alert(1)</script>') !== -1);
});

test('renderNewLeadEmail_: значение "=1+1" (похожее на формулу) рендерится как обычный текст, не спецсимвол', () => {
  const data = baseNewLeadData({ name: '=1+1' });
  const email = ctx.renderNewLeadEmail_(data);
  assert.ok(email.html.indexOf('=1+1') !== -1, '"=1+1" должно остаться видимым текстом в HTML (экранирование не трогает "=", "1", "+")');
  assert.ok(email.subject.indexOf('=1+1') !== -1, 'subject тоже несёт значение как есть — MailApp сам не исполняет "="');
});

test('renderNewLeadEmail_: кавычки в телефоне не ломают HTML-атрибуты (экранируются в href)', () => {
  const data = baseNewLeadData({ phone: '+972501234567" onmouseover="alert(1)' });
  const email = ctx.renderNewLeadEmail_(data);
  assert.ok(email.html.indexOf('onmouseover="alert(1)"') === -1, 'инъекция в атрибут не должна собраться в рабочий HTML-атрибут');
});

test('renderShortLeadEmail_ (SLA/эскалация): поля тоже экранируются', () => {
  const email = ctx.renderSlaFirstAttemptEmail_({
    leadNo: 'G-0020', name: '<b>Клиент</b>', phone: '+972501112233',
    sheetUrl: 'https://docs.google.com/spreadsheets/d/x/edit#gid=1&range=A2:N2'
  });
  assert.ok(email.html.indexOf('<b>Клиент</b>') === -1);
  assert.ok(email.html.indexOf('&lt;b&gt;Клиент&lt;/b&gt;') !== -1);
});

// --- содержание письма «новая заявка» (задача 0.4.0 Task B) -----------------

test('renderNewLeadEmail_: subject = "Новая заявка <№> — <Имя>", без телефона/email в теме', () => {
  const email = ctx.renderNewLeadEmail_(baseNewLeadData());
  assert.equal(email.subject, 'Новая заявка G-0012 — Иван Иванов');
  assert.ok(email.subject.indexOf('+972') === -1, 'телефон не должен попадать в тему письма');
  assert.ok(email.subject.indexOf('ivan@example.com') === -1, 'email не должен попадать в тему письма');
});

test('renderNewLeadEmail_: HTML содержит № с временем получения, кнопки «Позвонить»/WhatsApp/«Открыть заявку», mailto и футер', () => {
  const email = ctx.renderNewLeadEmail_(baseNewLeadData());
  assert.ok(email.html.indexOf('Новая заявка G-0012') !== -1);
  assert.ok(email.html.indexOf('23.09.2026 14:05') !== -1);
  assert.ok(email.html.indexOf('href="tel:+972501234567"') !== -1, 'кнопка «Позвонить» — tel:');
  assert.ok(email.html.indexOf('href="https://wa.me/972501234567"') !== -1, 'кнопка WhatsApp — wa.me с цифрами');
  assert.ok(email.html.indexOf('Написать в WhatsApp') !== -1);
  assert.ok(email.html.indexOf('href="mailto:ivan@example.com"') !== -1);
  assert.ok(email.html.indexOf('Google Ads') !== -1, '«Откуда»');
  assert.ok(email.html.indexOf('href="https://docs.google.com/spreadsheets/d/abc123/edit#gid=456&amp;range=A5:N5"') !== -1, 'кнопка «Открыть заявку» ведёт на строку по gid+range');
  assert.ok(email.html.indexOf('Открыть заявку') !== -1);
  assert.ok(email.html.indexOf('Автоматическое уведомление о новой заявке · Гамбарян и партнёры') !== -1);
});

test('renderNewLeadEmail_: НЕ содержит UTM/click-id/комментариев — задача 0.4.0 требует "No UTM/technical fields, no comments"', () => {
  const email = ctx.renderNewLeadEmail_(baseNewLeadData());
  ['utm_source', 'utm_medium', 'gclid', 'gbraid', 'wbraid', 'landing_path', 'referrer_host', 'Комментарий']
    .forEach((field) => {
      assert.ok(email.html.indexOf(field) === -1, 'письмо не должно содержать "' + field + '"');
      assert.ok(email.text.indexOf(field) === -1);
    });
});

test('renderNewLeadEmail_: пустой email -> строка Email не рендерится вовсе (нечего показывать)', () => {
  const email = ctx.renderNewLeadEmail_(baseNewLeadData({ email: '' }));
  assert.ok(email.html.indexOf('mailto:') === -1);
});

test('renderNewLeadEmail_: кнопки минимум 44px высотой (line-height:44px + min-height:44px)', () => {
  const email = ctx.renderNewLeadEmail_(baseNewLeadData());
  const buttonStyles = email.html.match(/style="[^"]*min-height:44px[^"]*"/g) || [];
  assert.ok(buttonStyles.length >= 3, 'минимум 3 кнопки (Позвонить, WhatsApp, Открыть заявку) должны иметь min-height:44px');
});

test('renderNewLeadEmail_: max-width 620px, html email-safe (table-based, inline styles, есть <style> для dark mode)', () => {
  const email = ctx.renderNewLeadEmail_(baseNewLeadData());
  assert.ok(email.html.indexOf('max-width:620px') !== -1);
  assert.ok(email.html.indexOf('<table') !== -1);
  assert.ok(email.html.indexOf('prefers-color-scheme: dark') !== -1, 'должна быть поддержка тёмной темы');
  assert.ok(email.html.indexOf("name=\"color-scheme\" content=\"light dark\"") !== -1);
});

test('renderNewLeadEmail_: plain-text альтернатива присутствует и несёт те же данные', () => {
  const email = ctx.renderNewLeadEmail_(baseNewLeadData());
  assert.ok(email.text.indexOf('G-0012') !== -1);
  assert.ok(email.text.indexOf('Иван Иванов') !== -1);
  assert.ok(email.text.indexOf('https://docs.google.com/spreadsheets/d/abc123/edit#gid=456&range=A5:N5') !== -1);
  assert.ok(email.text.indexOf('<') === -1, 'plain-text не должен содержать HTML-тегов');
});

// --- SLA / эскалация: короткий шаблон (задача 0.4.0 Task B) -----------------

test('renderSlaFirstAttemptEmail_: короткий — № + имя + телефон + «Открыть заявку» + срочность, subject без личных данных', () => {
  const email = ctx.renderSlaFirstAttemptEmail_({
    leadNo: 'G-0020', name: 'Пётр Петров', phone: '+972501112233',
    sheetUrl: 'https://docs.google.com/spreadsheets/d/x/edit#gid=1&range=A2:N2'
  });
  assert.equal(email.subject, 'SLA: нет первой попытки — G-0020');
  assert.ok(email.subject.indexOf('Петров') === -1, 'subject не должен нести имя (только у new_lead письма, по задаче)');
  assert.ok(email.html.indexOf('Пётр Петров') !== -1);
  assert.ok(email.html.indexOf('30 рабочих минут без первой попытки') !== -1);
  assert.ok(email.html.indexOf('Открыть заявку') !== -1);
});

test('renderSlaEscalationEmail_: короткий — subject содержит "Эскалация", тело — срочность про 2 часа', () => {
  const email = ctx.renderSlaEscalationEmail_({
    leadNo: 'G-0021', name: 'Мария', phone: '+972502223344',
    sheetUrl: 'https://docs.google.com/spreadsheets/d/x/edit#gid=1&range=A3:N3'
  });
  assert.match(email.subject, /Эскалация/);
  assert.ok(email.html.indexOf('2 рабочих часа') !== -1);
});

// =============================================================================
// Build-round email v2 (docs/crm-dashboard/EMAIL-CRITIQUE.md top-5 + owner
// correction b — «Позвонить»/WhatsApp равной ширины и высоты)
// =============================================================================

test('email v2: «Позвонить»/«Написать в WhatsApp» — блочные, равной ширины (100%), стек с гарантированным зазором (owner correction b)', () => {
  const email = ctx.renderNewLeadEmail_(baseNewLeadData());
  const buttonBlocks = email.html.match(/<a href="tel:[^"]*" style="[^"]*"/) || [];
  assert.ok(buttonBlocks.length > 0, 'кнопка «Позвонить» должна быть найдена');
  assert.ok(email.html.indexOf('display:block;width:100%') !== -1,
    'кнопки должны быть блочными на всю ширину — единственный способ гарантировать равную ширину независимо от длины текста');
  // обе кнопки должны использовать ОДНУ И ТУ ЖЕ базовую разметку (высота/ширина/центрирование)
  const telButtonMatch = email.html.match(/<a href="tel:[^"]*" style="([^"]*)"/);
  const waButtonMatch = email.html.match(/<a href="https:\/\/wa\.me\/[^"]*" class="btn-secondary" style="([^"]*)"/);
  assert.ok(telButtonMatch && waButtonMatch, 'обе кнопки должны присутствовать');
  ['display:block', 'width:100%', 'min-height:44px', 'line-height:44px', 'text-align:center'].forEach((token) => {
    assert.ok(telButtonMatch[1].indexOf(token) !== -1, '«Позвонить» должна иметь ' + token);
    assert.ok(waButtonMatch[1].indexOf(token) !== -1, '«Написать в WhatsApp» должна иметь ' + token);
  });
  assert.ok(waButtonMatch[1].indexOf('margin-top:8px') !== -1, 'вертикальный зазор — явный margin, не побочный line-height (recommendation №5)');
});

test('email v2: то же для короткого SLA/эскалации шаблона — равная ширина кнопок применена ко ВСЕМ трём письмам, не только new-lead', () => {
  const email = ctx.renderSlaFirstAttemptEmail_({ leadNo: 'G-0030', name: 'Тест', phone: '+972501234567', sheetUrl: 'https://x/edit#gid=0&range=A2:N2' });
  assert.ok(email.html.indexOf('display:block;width:100%') !== -1);
  assert.ok(email.html.indexOf('class="btn-secondary"') !== -1);
});

test('email v2 recommendation №1: WhatsApp-кнопка — видимая граница + кремовая заливка (WCAG 1.4.11, было 1.24:1 белое-на-белом)', () => {
  const email = ctx.renderNewLeadEmail_(baseNewLeadData());
  const waButtonMatch = email.html.match(/<a href="https:\/\/wa\.me\/[^"]*" class="btn-secondary" style="([^"]*)"/);
  assert.ok(waButtonMatch, 'кнопка WhatsApp должна иметь класс btn-secondary для тёмного оверрайда');
  assert.ok(waButtonMatch[1].indexOf('border:1px solid #6b7280') !== -1, 'граница — ink3 (#6b7280), не невидимый #d1d5db');
  assert.ok(waButtonMatch[1].indexOf('background:#f6f1e8') !== -1, 'заливка — кремовая (--bg-cream), не белая-на-белой карточке');
  assert.ok(email.html.indexOf('.btn-secondary{background:#1c232c') !== -1, 'тёмный оверрайд кнопки должен присутствовать в <style>');
});

test('email v2 recommendation №2: футер — ink2 (#4b5158, 7.14:1 PASS) на кремовом фоне, не ink3 (#6b7280, 4.3:1 FAIL AA)', () => {
  const email = ctx.renderNewLeadEmail_(baseNewLeadData());
  const footerSpan = email.html.match(/<span class="email-text-muted" style="([^"]*)">Автоматическое/);
  assert.ok(footerSpan, 'футер должен быть найден');
  assert.ok(footerSpan[1].indexOf('color:#4b5158') !== -1, 'футер на кремовом фоне должен использовать ink2, не ink3 (WCAG AA)');
});

test('email v2 recommendation №3: «Открыть заявку» — outline (transparent + wine border/text), не filled — не конкурирует с «Позвонить»', () => {
  const email = ctx.renderNewLeadEmail_(baseNewLeadData());
  const ctaMatch = email.html.match(/<a href="https:\/\/docs\.google\.com[^"]*" class="btn-outline" style="([^"]*)">/);
  assert.ok(ctaMatch, '«Открыть заявку» должна иметь класс btn-outline');
  assert.ok(ctaMatch[1].indexOf('background:transparent') !== -1);
  assert.ok(ctaMatch[1].indexOf('border:1px solid #8a1f1f') !== -1);
  assert.ok(ctaMatch[1].indexOf('color:#8a1f1f') !== -1);
  assert.ok(email.html.indexOf('.btn-outline{border-color:#c9736f') !== -1, 'тёмный оверрайд outline-кнопки должен присутствовать');
});

test('email v2 recommendation №4: эскалация несёт wine-бейдж «ЭСКАЛАЦИЯ» — рутинный SLA-реминдер его НЕ несёт', () => {
  const escalation = ctx.renderSlaEscalationEmail_({ leadNo: 'G-0040', name: 'Т', phone: '+972501234567', sheetUrl: 'https://x/edit#gid=0&range=A2:N2' });
  assert.ok(escalation.html.indexOf('Эскалация</span>') !== -1, 'бейдж «Эскалация» должен присутствовать');
  assert.ok(escalation.html.indexOf('background:#8a1f1f;color:#fff') !== -1, 'бейдж — существующий цвет wine, не новый');

  const reminder = ctx.renderSlaFirstAttemptEmail_({ leadNo: 'G-0041', name: 'Т', phone: '+972501234567', sheetUrl: 'https://x/edit#gid=0&range=A2:N2' });
  assert.ok(reminder.html.indexOf('border-radius:999px') === -1, 'рутинное SLA-напоминание НЕ должно нести бейдж — иначе оно неотличимо от эскалации');
});

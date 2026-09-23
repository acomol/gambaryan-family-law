// GAS-only код (Code.gs) — интеграционные проверки через структурные фейки.
import { test, assert } from './helpers/harness.mjs';
import { loadGasContext } from './helpers/load-gas.mjs';
import {
  makeFakeSheet, makeFakeSpreadsheet, makeFakeSpreadsheetApp,
  makeFakePropertiesService, makeFakeMailApp, makeFakeSession, makeFakeLockService
} from './helpers/gas-fakes.mjs';

function buildConfig(overrides) {
  return Object.assign({
    tz: 'Asia/Jerusalem',
    calendar: { tz: 'Asia/Jerusalem', businessDays: [0, 1, 2, 3, 4], businessStart: '09:00', businessEnd: '18:00', holidays: [], shortDays: {} },
    thresholds: { slaFirstAttemptMinutes: 30, slaEscalationMinutes: 120 },
    digestTime: '08:30',
    officeRecipients: ['office@x.com'],
    escalationRecipients: ['owner@x.com'],
    systemAlertRecipients: ['alex@adfix.co.il'],
    ownerSummaryRecipient: 'owner@x.com',
    defaultDutyOfficer: 'office@x.com',
    staffList: ['office@x.com'],
    observerStaleMinutes: 30,
    weekendDuty: { enabled: false, email: '' }
  }, overrides || {});
}

function buildRow(headers, obj) {
  return headers.map((h) => (obj[h] !== undefined ? obj[h] : ''));
}

// --- review находка №2: меню «CRM» убрано — getUi() недоступен в standalone --

test('onOpen() удалён — не пытается вызывать getUi() из standalone-проекта (review находка №2)', () => {
  const ctx = loadGasContext();
  assert.equal(typeof ctx.onOpen, 'undefined',
    'design §5.1 сознательно делает скрипт standalone; по официальной документации ' +
    '(developers.google.com/apps-script/guides/menus: "Only bound scripts can create menus") ' +
    'меню/getUi() здесь никогда не заработают ни через простой, ни через installable-триггер');
});

test('menuSendTestNotification_/menuArchiveClosed_ работают БЕЗ SpreadsheetApp.getUi() (review находка №2)', () => {
  const props = makeFakePropertiesService({});
  const mail = makeFakeMailApp();
  const spreadsheetApp = makeFakeSpreadsheetApp({});
  // Мимикрируем реальное поведение standalone-проекта: getUi() бросает
  // ("A script can only interact with the UI ... only if the script is bound
  // to the spreadsheet" — SpreadsheetApp.getUi() reference).
  spreadsheetApp.getUi = () => { throw new Error('getUi(): script is not bound to a Sheets file'); };
  const ctx = loadGasContext(undefined, {
    SpreadsheetApp: spreadsheetApp,
    PropertiesService: props,
    MailApp: mail,
    Session: makeFakeSession('alex@adfix.co.il')
  });

  const journal = makeFakeSheet('Журнал');
  const settings = makeFakeSheet('Настройки', { data: ctx.buildDefaultSettingsRows_() });
  const ss = makeFakeSpreadsheet({ 'Журнал': journal, 'Настройки': settings });
  spreadsheetApp.openById = () => ss;

  const result = ctx.menuSendTestNotification_();
  assert.equal(result.sent, true);
  assert.equal(mail._sent.length, 1);

  const message = ctx.menuArchiveClosed_();
  assert.match(message, /бессрочно/);
});

// --- review находка №10: "Заявки" читается один раз за tick(), не по разу
// на каждый шаг ---------------------------------------------------------------

test('tick(): читает "Заявки" (getDataRange) один раз за цикл, а не по разу на sync/corrections/sla/digest (review находка №10)', () => {
  const props = makeFakePropertiesService({});
  const mail = makeFakeMailApp();
  const lock = makeFakeLockService();
  const spreadsheetApp = makeFakeSpreadsheetApp({});
  const ctx = loadGasContext(undefined, {
    SpreadsheetApp: spreadsheetApp,
    PropertiesService: props,
    MailApp: mail,
    Session: makeFakeSession('alex@adfix.co.il'),
    LockService: lock
  });

  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  const requests = makeFakeSheet('Заявки', { data: [reqHeaders] }); // без заявок и исправлений в этом сценарии
  const intakeHeaders = Array.from(ctx.INTAKE_HEADERS_);
  const intake = makeFakeSheet('Входящие', { data: [intakeHeaders] });
  const journal = makeFakeSheet('Журнал');
  // businessDays на все 7 дней + digest_time='00:00' -> maybeSendDigest_
  // ГАРАНТИРОВАННО пройдёт свои гейты независимо от реального времени запуска
  // теста (иначе демонстрация была бы недетерминированной из-за `now = new Date()`
  // внутри tick(), которую тест не контролирует).
  const settings = makeFakeSheet('Настройки', {
    data: ctx.buildDefaultSettingsRows_({ business_days: '0,1,2,3,4,5,6', digest_time: '00:00' })
  });
  const ss = makeFakeSpreadsheet({ 'Заявки': requests, 'Входящие': intake, 'Журнал': journal, 'Настройки': settings });
  spreadsheetApp.openById = () => ss;

  ctx.tick();

  assert.equal(requests._getDataRangeCallCount, 1,
    'sync/corrections/sla/digest раньше каждый сам читал "Заявки" целиком — до 4 полных чтений за один tick()');
});

// --- review находка №12: «Связаться» — настоящая ссылка (RichTextValue) -----

test('syncIntakeToRequests_: новая заявка получает RichTextValue в "Связаться" с реальной WhatsApp-ссылкой, без "tel:" в тексте (review находка №12)', () => {
  const spreadsheetApp = makeFakeSpreadsheetApp({});
  const ctx = loadGasContext(undefined, { SpreadsheetApp: spreadsheetApp, PropertiesService: makeFakePropertiesService({}) });

  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  const requests = makeFakeSheet('Заявки', { data: [reqHeaders] });
  const intakeHeaders = Array.from(ctx.INTAKE_HEADERS_);
  const intake = makeFakeSheet('Входящие', {
    data: [intakeHeaders, buildRow(intakeHeaders, {
      submission_id: 'S1', submitted_at: '2026-01-05T10:00:00Z', name: 'Ivan', phone: '+972501234567', email: 'a@x.com'
    })]
  });
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Входящие': intake, 'Заявки': requests, 'Журнал': journal });
  spreadsheetApp.openById = () => ss;
  const reqHeaderMap = ctx.colByHeader_(reqHeaders);
  const config = buildConfig();

  ctx.syncIntakeToRequests_(ss, config, new Date('2026-01-05T10:05:00Z'), requests, [reqHeaders], reqHeaderMap);

  const contactCol = reqHeaderMap['Связаться'] + 1;
  const rtv = requests._richText['2:' + contactCol];
  assert.ok(rtv, 'ячейка "Связаться" должна содержать RichTextValue, не обычный текст');
  assert.equal(rtv._links.length, 1);
  assert.equal(rtv._links[0].url, 'https://wa.me/972501234567');
  assert.ok(requests._data[1][contactCol - 1].indexOf('tel:') === -1,
    'старый формат "tel:... https://wa.me/..." как plain-текст больше не пишется');
});

// --- review находка №13 / design §12 строка 7: дежурный на выходные/ночь ----

test('syncIntakeToRequests_: вне рабочего времени, дежурный ВКЛЮЧЁН -> уведомление уходит дежурному, не офису (review находка №13)', () => {
  const spreadsheetApp = makeFakeSpreadsheetApp({});
  const mail = makeFakeMailApp();
  const ctx = loadGasContext(undefined, { SpreadsheetApp: spreadsheetApp, MailApp: mail, PropertiesService: makeFakePropertiesService({}) });

  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  const requests = makeFakeSheet('Заявки', { data: [reqHeaders] });
  const intakeHeaders = Array.from(ctx.INTAKE_HEADERS_);
  const intake = makeFakeSheet('Входящие', {
    data: [intakeHeaders, buildRow(intakeHeaders, { submission_id: 'S1', submitted_at: '2026-01-05T21:00:00Z', name: 'Ivan', phone: '+972501234567' })]
  });
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Входящие': intake, 'Заявки': requests, 'Журнал': journal });
  spreadsheetApp.openById = () => ss;
  const reqHeaderMap = ctx.colByHeader_(reqHeaders);
  const config = buildConfig({ weekendDuty: { enabled: true, email: 'duty@x.com' } });
  const offHoursNow = new Date('2026-01-05T21:00:00Z'); // 23:00 Asia/Jerusalem — вне 09:00-18:00

  ctx.syncIntakeToRequests_(ss, config, offHoursNow, requests, [reqHeaders], reqHeaderMap);

  assert.equal(mail._sent.length, 1, 'дежурный включён — уведомление должно уйти немедленно, не ждать дайджеста');
  assert.equal(mail._sent[0].to, 'duty@x.com');
});

test('syncIntakeToRequests_: вне рабочего времени, дежурный ВЫКЛЮЧЕН (default) -> письма нет вовсе (design §12.1 не нарушен)', () => {
  const spreadsheetApp = makeFakeSpreadsheetApp({});
  const mail = makeFakeMailApp();
  const ctx = loadGasContext(undefined, { SpreadsheetApp: spreadsheetApp, MailApp: mail, PropertiesService: makeFakePropertiesService({}) });

  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  const requests = makeFakeSheet('Заявки', { data: [reqHeaders] });
  const intakeHeaders = Array.from(ctx.INTAKE_HEADERS_);
  const intake = makeFakeSheet('Входящие', {
    data: [intakeHeaders, buildRow(intakeHeaders, { submission_id: 'S1', submitted_at: '2026-01-05T21:00:00Z', name: 'Ivan', phone: '+972501234567' })]
  });
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Входящие': intake, 'Заявки': requests, 'Журнал': journal });
  spreadsheetApp.openById = () => ss;
  const reqHeaderMap = ctx.colByHeader_(reqHeaders);
  const config = buildConfig(); // weekendDuty.enabled=false по умолчанию
  const offHoursNow = new Date('2026-01-05T21:00:00Z');

  ctx.syncIntakeToRequests_(ss, config, offHoursNow, requests, [reqHeaders], reqHeaderMap);

  assert.equal(mail._sent.length, 0, 'вне рабочего времени без дежурного — попадёт в дайджест, не отдельным письмом');
});

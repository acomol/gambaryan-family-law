// Независимое ревью Codex (ветка claude/gambarian-mini-crm @ 1071f53,
// CHANGES_REQUESTED, все 8 находок воспроизведены). Каждый блок ниже —
// findings item1..item8, red на 1071f53 (см. README "Как воспроизвести
// RED -> GREEN" — GAS_SRC_DIR на копию исходного 1071f53), green здесь.
import { test, assert, toHost } from './helpers/harness.mjs';
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

function newHarness(overrides) {
  const props = makeFakePropertiesService({});
  const mail = makeFakeMailApp(overrides && overrides.mailOpts);
  const lock = makeFakeLockService(overrides && overrides.lockOpts);
  const spreadsheetApp = makeFakeSpreadsheetApp({});
  const ctx = loadGasContext(undefined, {
    SpreadsheetApp: spreadsheetApp,
    PropertiesService: props,
    MailApp: mail,
    Session: makeFakeSession('alex@adfix.co.il'),
    LockService: lock
  });
  return { ctx, props, mail, lock, spreadsheetApp };
}

function emptyServiceSheet(ctx, opts) {
  return makeFakeSheet('Служебное', Object.assign({ data: [Array.from(ctx.SERVICE_SHEET_HEADERS_)] }, opts || {}));
}
function emptyRequestsSheet(ctx, opts) {
  return makeFakeSheet('Заявки', Object.assign({ data: [Array.from(ctx.REQUESTS_HEADERS_)] }, opts || {}));
}

// =============================================================================
// item1 [P1] Code.gs:127,:319 — formula re-injection
// =============================================================================

test('item1: новая заявка с Имя/Телефон/Откуда вида "=1+1" НЕ становится формулой на «Заявки»/«Служебное» (Codex review item1)', () => {
  const { ctx } = newHarness();
  const requests = emptyRequestsSheet(ctx);
  const service = emptyServiceSheet(ctx);
  const reqHeaderMap = ctx.colByHeader_(Array.from(ctx.REQUESTS_HEADERS_));
  const serviceHeaderMap = ctx.colByHeader_(Array.from(ctx.SERVICE_SHEET_HEADERS_));
  const intakeHeaders = Array.from(ctx.INTAKE_HEADERS_);
  const intake = makeFakeSheet('Входящие', {
    data: [intakeHeaders, buildRow(intakeHeaders, {
      submission_id: 'S1', submitted_at: '2026-01-05T10:00:00Z',
      name: '=1+1', phone: '=2+2', email: 'a@x.com', utm_source: '=cmd|calc'
    })]
  });
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Входящие': intake, 'Заявки': requests, 'Служебное': service, 'Журнал': journal });
  const config = buildConfig();

  ctx.syncIntakeToRequests_(ss, config, new Date('2026-01-05T10:05:00Z'), requests, [Array.from(ctx.REQUESTS_HEADERS_)], reqHeaderMap,
    service, [Array.from(ctx.SERVICE_SHEET_HEADERS_)], serviceHeaderMap);

  const nameCol = reqHeaderMap['Имя'] + 1;
  const phoneCol = reqHeaderMap['Телефон'] + 1;
  assert.deepEqual(requests.getRange(2, nameCol).getFormulas(), [['']], 'Имя не должно стать формулой');
  assert.deepEqual(requests.getRange(2, phoneCol).getFormulas(), [['']], 'Телефон не должен стать формулой');
  assert.equal(requests._data[1][nameCol - 1], '=1+1', 'значение остаётся видимым текстом, не пропадает');
  assert.equal(requests._data[1][phoneCol - 1], '=2+2');

  const sourceCol = serviceHeaderMap['Откуда'] + 1;
  const subCol = serviceHeaderMap['submission_id'] + 1;
  assert.deepEqual(service.getRange(2, sourceCol).getFormulas(), [['']], '«Откуда» (из utm_source) не должно стать формулой');
  assert.deepEqual(service.getRange(2, subCol).getFormulas(), [['']]);
});

test('item1: исправление контактов вида "=5+5" НЕ становится формулой при батч-записи (Codex review item1)', () => {
  const { ctx } = newHarness();
  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  const svcHeaders = Array.from(ctx.SERVICE_SHEET_HEADERS_);
  const requests = makeFakeSheet('Заявки', { data: [reqHeaders, buildRow(reqHeaders, { '№': 'G-0001', 'Имя': 'Old', 'Телефон': '111' })] });
  const service = makeFakeSheet('Служебное', { data: [svcHeaders, buildRow(svcHeaders, { '№': 'G-0001', 'submission_id': 'A', 'все submission_id': 'A' })] });
  const intakeHeaders = ['submission_id', 'corrects_submission_id', 'submitted_at', 'name', 'phone', 'email'];
  const intake = makeFakeSheet('Входящие', {
    data: [
      intakeHeaders,
      buildRow(intakeHeaders, { submission_id: 'A', submitted_at: '2026-01-01T10:00:00Z', name: 'Old', phone: '111' }),
      buildRow(intakeHeaders, { submission_id: 'B', corrects_submission_id: 'A', submitted_at: '2026-01-02T10:00:00Z', name: '=5+5', phone: '+972500000000', email: 'new@x.com' })
    ]
  });
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Входящие': intake, 'Заявки': requests, 'Служебное': service, 'Журнал': journal });
  const reqHeaderMap = ctx.colByHeader_(reqHeaders);
  const serviceHeaderMap = ctx.colByHeader_(svcHeaders);

  ctx.resolvePendingCorrections_(ss, buildConfig(), new Date('2026-01-02T12:00:00Z'), requests, reqHeaderMap, service, serviceHeaderMap);

  const nameCol = reqHeaderMap['Имя'] + 1;
  assert.equal(requests._data[1][nameCol - 1], '=5+5', 'значение из исправления применилось');
  assert.deepEqual(requests.getRange(2, nameCol).getFormulas(), [['']], 'исправленное имя не должно стать формулой');
});

// =============================================================================
// item2 [P1] Config.gs:85 — явно пустые получатели не должны падать на дефолт
// =============================================================================

test('item2: явно очищенный office_recipients остаётся ПУСТЫМ, а не дефолтом (Codex review item2)', () => {
  const ctx = loadGasContext(['Utils.gs', 'Config.gs']);
  const rows = [
    ['Параметр', 'Значение', 'Комментарий'],
    ['office_recipients', '', 'владелец явно очистил']
  ];
  const raw = ctx.parseSettingsRows_(rows);
  assert.equal(raw.office_recipients, '', 'пустая строка должна ОСТАТЬСЯ пустой, не подмениться дефолтом');
  const settings = ctx.normalizeSettings_(raw, { holidays: [], shortDays: {} });
  assert.deepEqual(toHost(settings.officeRecipients), [], 'пустой список получателей = не отправлять');
});

test('item2: получатели пусты -> письмо о новой заявке НЕ уходит, системный получатель алертится ОДИН раз (Codex review item2)', () => {
  const { ctx, mail } = newHarness();
  const requests = emptyRequestsSheet(ctx);
  const service = emptyServiceSheet(ctx);
  const reqHeaderMap = ctx.colByHeader_(Array.from(ctx.REQUESTS_HEADERS_));
  const serviceHeaderMap = ctx.colByHeader_(Array.from(ctx.SERVICE_SHEET_HEADERS_));
  const intakeHeaders = Array.from(ctx.INTAKE_HEADERS_);
  const intake = makeFakeSheet('Входящие', {
    data: [intakeHeaders, buildRow(intakeHeaders, { submission_id: 'S1', submitted_at: '2026-01-05T10:00:00Z', name: 'Ivan Secret', phone: '+972501234567' })]
  });
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Входящие': intake, 'Заявки': requests, 'Служебное': service, 'Журнал': journal });
  const config = buildConfig({ officeRecipients: [] }); // владелец явно очистил

  ctx.syncIntakeToRequests_(ss, config, new Date('2026-01-05T10:05:00Z'), requests, [Array.from(ctx.REQUESTS_HEADERS_)], reqHeaderMap,
    service, [Array.from(ctx.SERVICE_SHEET_HEADERS_)], serviceHeaderMap);

  assert.equal(mail._sent.length, 1, 'ровно одно письмо — алерт системному получателю, не письмо с PII офису');
  assert.equal(mail._sent[0].to, 'alex@adfix.co.il');
  assert.ok(mail._sent[0].body.indexOf('Ivan Secret') === -1, 'алерт не должен нести имя лида');
  assert.ok(mail._sent[0].subject.indexOf('получатели') !== -1 || mail._sent[0].subject.indexOf('CRM') !== -1);
});

// =============================================================================
// item3 [P1] Code.gs:309 — исправление не должно расползаться по двум строкам
// =============================================================================

test('item3: реордер «Заявки» между чтением и записью correction -> НИ ОДНА строка не портится (пре-запись отменяется), не "reproduced G-0001/G-0002" (Codex review item3)', () => {
  const { ctx } = newHarness();
  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  const svcHeaders = Array.from(ctx.SERVICE_SHEET_HEADERS_);
  const requests = makeFakeSheet('Заявки', {
    data: [
      reqHeaders,
      buildRow(reqHeaders, { '№': 'G-0001', 'Имя': 'Old', 'Телефон': '111' }),
      buildRow(reqHeaders, { '№': 'G-0002', 'Имя': 'Other', 'Телефон': '999' })
    ]
  });
  const service = makeFakeSheet('Служебное', {
    data: [svcHeaders, buildRow(svcHeaders, { '№': 'G-0001', 'submission_id': 'A', 'все submission_id': 'A' })]
  });
  const intakeHeaders = ['submission_id', 'corrects_submission_id', 'submitted_at', 'name', 'phone', 'email'];
  const intake = makeFakeSheet('Входящие', {
    data: [
      intakeHeaders,
      buildRow(intakeHeaders, { submission_id: 'A', submitted_at: '2026-01-01T10:00:00Z', name: 'Old', phone: '111' }),
      buildRow(intakeHeaders, { submission_id: 'B', corrects_submission_id: 'A', submitted_at: '2026-01-02T10:00:00Z', name: 'New', phone: '222', email: 'new@x.com' })
    ]
  });
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Входящие': intake, 'Заявки': requests, 'Служебное': service, 'Журнал': journal });
  const reqHeaderMap = ctx.colByHeader_(reqHeaders);
  const serviceHeaderMap = ctx.colByHeader_(svcHeaders);

  // Реордер СРАЗУ после того, как код находит строку «Заявки» по № (design §1
  // уже нашёл leadNo='G-0001' -> rowIndex=2) — симулирует сортировку офисом
  // РОВНО в момент между поиском строки и её чтением/записью.
  let swapped = false;
  const originalFind = ctx.findRequestRowIndexByLeadNo_;
  ctx.findRequestRowIndexByLeadNo_ = function (reqSheet, headerMap, leadNo) {
    var result = originalFind(reqSheet, headerMap, leadNo);
    if (!swapped) {
      swapped = true;
      var tmp = requests._data[1];
      requests._data[1] = requests._data[2];
      requests._data[2] = tmp;
    }
    return result;
  };

  ctx.resolvePendingCorrections_(ss, buildConfig(), new Date('2026-01-02T12:00:00Z'), requests, reqHeaderMap, service, serviceHeaderMap);

  const rowG1 = requests._data.find((r) => r[reqHeaderMap['№']] === 'G-0001');
  const rowG2 = requests._data.find((r) => r[reqHeaderMap['№']] === 'G-0002');
  assert.equal(rowG2[reqHeaderMap['Имя']], 'Other', 'G-0002 не должна быть тронута чужим исправлением');
  assert.equal(rowG2[reqHeaderMap['Телефон']], '999', 'телефон G-0002 не должен быть перезаписан');
  assert.equal(rowG1[reqHeaderMap['Имя']], 'Old', 'G-0001 тоже НЕ обновлена в этом тике (обнаружили гонку, отступили) — не наполовину применённое исправление');
});

// =============================================================================
// item4 [P1] Code.gs:127 — атомарность создания заявки (Служебное/Заявки)
// =============================================================================

test('item4: orphan «Служебное» (создание прервано ДО appendRow «Заявки») докручивается тем же №, вторая заявка НЕ создаётся (Codex review item4)', () => {
  const { ctx } = newHarness();
  const svcHeaders = Array.from(ctx.SERVICE_SHEET_HEADERS_);
  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  // Служебное УЖЕ содержит G-0001/S1 (создание "началось" в прошлом тике) —
  // «Заявки» ПУСТА (скрипт упал между двумя appendRow).
  const service = makeFakeSheet('Служебное', { data: [svcHeaders, buildRow(svcHeaders, { '№': 'G-0001', 'submission_id': 'S1', 'все submission_id': 'S1', 'Откуда': 'Google Ads' })] });
  const requests = emptyRequestsSheet(ctx);
  const reqHeaderMap = ctx.colByHeader_(reqHeaders);
  const serviceHeaderMap = ctx.colByHeader_(svcHeaders);
  const intakeHeaders = Array.from(ctx.INTAKE_HEADERS_);
  const intake = makeFakeSheet('Входящие', {
    data: [intakeHeaders, buildRow(intakeHeaders, { submission_id: 'S1', submitted_at: '2026-01-05T10:00:00Z', name: 'Ivan', phone: '+972501234567', email: 'a@x.com' })]
  });
  const ss = makeFakeSpreadsheet({ 'Входящие': intake, 'Заявки': requests, 'Служебное': service });
  const config = buildConfig();

  ctx.completeOrphanedLeads_(ss, requests, [Array.from(reqHeaders)], reqHeaderMap, [Array.from(svcHeaders), service._data[1]], serviceHeaderMap, config, new Date('2026-01-05T10:10:00Z'));

  assert.equal(requests._data.length, 2, 'должна появиться РОВНО одна строка «Заявки» (докрученная), не 0 и не 2');
  assert.equal(requests._data[1][reqHeaderMap['№']], 'G-0001', 'докрученная строка использует ТОТ ЖЕ №, что уже в «Служебное»');
  assert.equal(requests._data[1][reqHeaderMap['Имя']], 'Ivan');
});

test('item4: orphan-№ не отдаётся genuinely новой заявке того же тика (объединение номеров «Заявки»+«Служебное»)', () => {
  const { ctx, mail } = newHarness();
  const svcHeaders = Array.from(ctx.SERVICE_SHEET_HEADERS_);
  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  // «Служебное» уже "заняло" G-0001 для S1 (orphan, «Заявки» ещё нет).
  const service = makeFakeSheet('Служебное', { data: [svcHeaders, buildRow(svcHeaders, { '№': 'G-0001', 'submission_id': 'S1', 'все submission_id': 'S1' })] });
  const requests = emptyRequestsSheet(ctx);
  const reqHeaderMap = ctx.colByHeader_(reqHeaders);
  const serviceHeaderMap = ctx.colByHeader_(svcHeaders);
  const intakeHeaders = Array.from(ctx.INTAKE_HEADERS_);
  // Новая заявка S2 ДОЛЖНА получить № G-0002, а не переиспользовать G-0001.
  const intake = makeFakeSheet('Входящие', {
    data: [intakeHeaders, buildRow(intakeHeaders, { submission_id: 'S2', submitted_at: '2026-01-05T11:00:00Z', name: 'Petr', phone: '+972502223344' })]
  });
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Входящие': intake, 'Заявки': requests, 'Служебное': service, 'Журнал': journal });
  const config = buildConfig();

  ctx.syncIntakeToRequests_(ss, config, new Date('2026-01-05T11:05:00Z'), requests, [Array.from(reqHeaders)], reqHeaderMap,
    service, [Array.from(svcHeaders), service._data[1]], serviceHeaderMap);

  assert.equal(requests._data.length, 2, 'создалась ровно одна новая строка «Заявки» для S2');
  assert.equal(requests._data[1][reqHeaderMap['№']], 'G-0002', 'новый № НЕ должен коллизировать с уже занятым orphan-№ G-0001');
});

// =============================================================================
// item5 [P1] Code.gs:135,:159 — независимый ретрай упавших уведомлений
// =============================================================================

test('item5: письмо о новой заявке, упавшее при первой попытке (FAILED в «Журнале»), повторяется независимым шагом (Codex review item5)', () => {
  const { ctx, mail } = newHarness();
  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  const svcHeaders = Array.from(ctx.SERVICE_SHEET_HEADERS_);
  const requests = makeFakeSheet('Заявки', {
    data: [reqHeaders, buildRow(reqHeaders, { '№': 'G-0001', 'Получена': '2026-01-05T10:00:00.000Z', 'Имя': 'Ivan', 'Телефон': '+972501234567', 'Email': 'a@x.com' })]
  });
  const service = makeFakeSheet('Служебное', {
    data: [svcHeaders, buildRow(svcHeaders, { '№': 'G-0001', 'submission_id': 'S1', 'все submission_id': 'S1', 'Откуда': 'Google Ads' })]
  });
  const journal = makeFakeSheet('Журнал', { data: [Array.from(ctx.JOURNAL_HEADERS_)] });
  // Первая попытка отправки провалилась (FAILED) — это то, что раньше терялось навсегда.
  journal.appendRow(['2026-01-05T10:05:00.000Z', 'G-0001', 'new_lead', 'quota exceeded', 'email', 'failed', '', 'G-0001:new_lead:1']);
  const reqHeaderMap = ctx.colByHeader_(reqHeaders);
  const serviceHeaderMap = ctx.colByHeader_(svcHeaders);
  const ss = makeFakeSpreadsheet({ 'Заявки': requests, 'Служебное': service, 'Журнал': journal });
  const config = buildConfig();

  ctx.retryPendingNotifications_(ss, config, new Date('2026-01-05T10:25:00.000Z'), reqHeaderMap, serviceHeaderMap);

  assert.equal(mail._sent.length, 1, 'ретрай должен успешно отправить письмо, которое раньше было бы потеряно навсегда');
  const sentRows = journal._data.filter((r) => r[7] === 'G-0001:new_lead:1' && r[5] === 'sent');
  assert.equal(sentRows.length, 1, 'журнал должен получить sent-запись по тому же ключу');
});

test('item5: ретрай ограничен по числу попыток на ключ (не бесконечный, не жрёт квоту вечно)', () => {
  const { ctx, mail, props } = newHarness();
  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  const svcHeaders = Array.from(ctx.SERVICE_SHEET_HEADERS_);
  const requests = makeFakeSheet('Заявки', {
    data: [reqHeaders, buildRow(reqHeaders, { '№': 'G-0001', 'Получена': '2026-01-05T10:00:00.000Z', 'Имя': 'Ivan', 'Телефон': '+972501234567' })]
  });
  const service = makeFakeSheet('Служебное', { data: [svcHeaders, buildRow(svcHeaders, { '№': 'G-0001', 'submission_id': 'S1', 'все submission_id': 'S1' })] });
  const journal = makeFakeSheet('Журнал', { data: [Array.from(ctx.JOURNAL_HEADERS_)] });
  journal.appendRow(['2026-01-05T10:05:00.000Z', 'G-0001', 'new_lead', 'boom', 'email', 'failed', '', 'G-0001:new_lead:1']);
  props._store.notificationRetryAttempts = JSON.stringify({ 'G-0001:new_lead:1': 5 }); // уже на пределе
  const reqHeaderMap = ctx.colByHeader_(reqHeaders);
  const serviceHeaderMap = ctx.colByHeader_(svcHeaders);
  const ss = makeFakeSpreadsheet({ 'Заявки': requests, 'Служебное': service, 'Журнал': journal });

  ctx.retryPendingNotifications_(ss, buildConfig(), new Date('2026-01-06T10:25:00.000Z'), reqHeaderMap, serviceHeaderMap);

  assert.equal(mail._sent.length, 0, 'достигнут лимит попыток — новой отправки быть не должно');
});

test('item5: ретрай не идёт, если суточная квота MailApp исчерпана (MailApp.getRemainingDailyQuota() === 0)', () => {
  const { ctx, mail } = newHarness({ mailOpts: { remainingDailyQuota: 0 } });
  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  const svcHeaders = Array.from(ctx.SERVICE_SHEET_HEADERS_);
  const requests = makeFakeSheet('Заявки', {
    data: [reqHeaders, buildRow(reqHeaders, { '№': 'G-0001', 'Получена': '2026-01-05T10:00:00.000Z', 'Имя': 'Ivan', 'Телефон': '+972501234567' })]
  });
  const service = makeFakeSheet('Служебное', { data: [svcHeaders, buildRow(svcHeaders, { '№': 'G-0001', 'submission_id': 'S1', 'все submission_id': 'S1' })] });
  const journal = makeFakeSheet('Журнал', { data: [Array.from(ctx.JOURNAL_HEADERS_)] });
  journal.appendRow(['2026-01-05T10:05:00.000Z', 'G-0001', 'new_lead', 'boom', 'email', 'failed', '', 'G-0001:new_lead:1']);
  const reqHeaderMap = ctx.colByHeader_(reqHeaders);
  const serviceHeaderMap = ctx.colByHeader_(svcHeaders);
  const ss = makeFakeSpreadsheet({ 'Заявки': requests, 'Служебное': service, 'Журнал': journal });

  ctx.retryPendingNotifications_(ss, buildConfig(), new Date('2026-01-05T10:25:00.000Z'), reqHeaderMap, serviceHeaderMap);

  assert.equal(mail._sent.length, 0, 'квота исчерпана — ретрай не должен тратить остаток на зависшее письмо');
});

// =============================================================================
// item6 [P1] Code.gs:51,:61 — runStepSafely_ должен возвращать результат,
// деградация должна алертиться (не проглатываться молча)
// =============================================================================

test('item6: runStepSafely_ возвращает {ok:false, error} при исключении, {ok:true} при успехе (Codex review item6)', () => {
  const { ctx } = newHarness();
  const journal = makeFakeSheet('Журнал');
  const spreadsheetApp = makeFakeSpreadsheetApp({});
  const ss = makeFakeSpreadsheet({ 'Журнал': journal });
  spreadsheetApp.openById = () => ss;
  // runStepSafely_ сам открывает SPREADSHEET_ID_ на ошибке — переиспользуем ctx с уже настроенным SpreadsheetApp
  const ctx2 = loadGasContext(undefined, { SpreadsheetApp: spreadsheetApp });

  const okResult = ctx2.runStepSafely_('ok_step', function () {});
  assert.deepEqual(toHost(okResult), { ok: true }, 'успешный шаг должен явно вернуть {ok:true}');

  const failResult = ctx2.runStepSafely_('bad_step', function () { throw new Error('boom'); });
  assert.equal(failResult.ok, false, 'провалившийся шаг должен явно вернуть {ok:false}, не проглатываться молча');
  assert.match(failResult.error, /boom/);
  assert.ok(journal._data.some((r) => r[2] === 'tick_step_error'), 'ошибка шага по-прежнему журналируется');
});

test('item6: деградация цикла алертит системного получателя ОДИН раз на инцидент, не каждый тик (Codex review item6)', () => {
  const { ctx, mail } = newHarness();
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Журнал': journal });
  const config = buildConfig();

  ctx.reportCycleHealth_(ss, config, new Date('2026-01-05T10:00:00Z'), { sla: { ok: false, error: 'x' }, digest: { ok: true } });
  assert.equal(mail._sent.length, 1, 'первая деградация — алерт уходит');

  ctx.reportCycleHealth_(ss, config, new Date('2026-01-05T10:05:00Z'), { sla: { ok: false, error: 'x' }, digest: { ok: true } });
  assert.equal(mail._sent.length, 1, 'деградация продолжается — повторного алерта в ЭТОМ тике быть не должно');

  ctx.reportCycleHealth_(ss, config, new Date('2026-01-05T10:10:00Z'), { sla: { ok: true }, digest: { ok: true } });
  assert.equal(mail._sent.length, 1, 'цикл снова полностью успешен — тревога снята молча');

  ctx.reportCycleHealth_(ss, config, new Date('2026-01-05T10:15:00Z'), { sla: { ok: false, error: 'y' } });
  assert.equal(mail._sent.length, 2, 'новая деградация — новый инцидент, новый алерт');
});

// =============================================================================
// item7 [P2] Code.gs:535 — таймаут блокировки onEdit не должен терять правку
// =============================================================================

test('item7: таймаут блокировки onEdit — правка встаёт в очередь, журналируется, реконсилируется следующим tick() (Codex review item7)', () => {
  const props = makeFakePropertiesService({});
  const spreadsheetApp = makeFakeSpreadsheetApp({});
  const lock = makeFakeLockService({ tryLock: false });
  const ctx = loadGasContext(undefined, { SpreadsheetApp: spreadsheetApp, PropertiesService: props, LockService: lock, Session: makeFakeSession('alex@adfix.co.il') });

  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  const svcHeaders = Array.from(ctx.SERVICE_SHEET_HEADERS_);
  const requests = makeFakeSheet('Заявки', { data: [reqHeaders, buildRow(reqHeaders, { '№': 'G-0001', 'Статус': 'В работе' })] });
  const service = makeFakeSheet('Служебное', { data: [svcHeaders, buildRow(svcHeaders, { '№': 'G-0001', 'submission_id': 'S1', 'все submission_id': 'S1' })] });
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Заявки': requests, 'Служебное': service, 'Журнал': journal });
  spreadsheetApp.openById = () => ss;

  var fakeRange = requests.getRange(2, 1, 1, reqHeaders.length);
  fakeRange.getSheet = function () { return requests; };
  fakeRange.getRow = function () { return 2; };
  fakeRange.getNumRows = function () { return 1; };
  ctx.handleEdit_({ range: fakeRange });

  assert.ok(journal._data.some((r) => r[2] === 'onedit_lock_timeout'), 'таймаут блокировки должен журналироваться (раньше — тихая потеря)');
  const pending = JSON.parse(props._store.pendingEditRows || '[]');
  assert.deepEqual(pending, [2], 'правка должна встать в очередь на реконсиляцию');

  // «Служебное» ещё НЕ получило штамп — блокировка не далась, правка потеряна БЫ БЫЛА без очереди.
  const svcRowBefore = service._data[1];
  assert.equal(svcRowBefore[ctx.colByHeader_(svcHeaders)['Контакт состоялся']], '');

  // Следующий tick() реконсилирует очередь.
  const reqHeaderMap = ctx.colByHeader_(reqHeaders);
  const serviceHeaderMap = ctx.colByHeader_(svcHeaders);
  ctx.reconcilePendingEdits_(requests, reqHeaderMap, journal, service, serviceHeaderMap, new Date('2026-01-05T10:10:00Z'));

  const svcRowAfter = service._data[1];
  assert.ok(svcRowAfter[serviceHeaderMap['Контакт состоялся']], '«Контакт состоялся» должен появиться после реконсиляции — правка не потеряна');
  assert.deepEqual(JSON.parse(props._store.pendingEditRows || '[]'), [], 'очередь должна очиститься после реконсиляции (одна попытка, не бесконечный повтор)');
});

// =============================================================================
// item8 [P2] Code.gs:34,:49 — SLA/дайджест должны видеть состояние ПОСЛЕ sync
// =============================================================================

test('item8: свежая установка — новая заявка в этом же тике должна попасть в дайджест «Новых: N», не «Новых: 0» (Codex review item8)', () => {
  const props = makeFakePropertiesService({});
  const mail = makeFakeMailApp();
  const lock = makeFakeLockService();
  const spreadsheetApp = makeFakeSpreadsheetApp({});
  const ctx = loadGasContext(undefined, {
    SpreadsheetApp: spreadsheetApp, PropertiesService: props, MailApp: mail, LockService: lock, Session: makeFakeSession('alex@adfix.co.il')
  });

  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  const svcHeaders = Array.from(ctx.SERVICE_SHEET_HEADERS_);
  const requests = makeFakeSheet('Заявки', { data: [reqHeaders] }); // пусто — "свежая установка"
  const service = makeFakeSheet('Служебное', { data: [svcHeaders] });
  const intakeHeaders = Array.from(ctx.INTAKE_HEADERS_);
  const intake = makeFakeSheet('Входящие', {
    data: [intakeHeaders, buildRow(intakeHeaders, { submission_id: 'S1', submitted_at: '2026-01-05T07:00:00Z', name: 'Ivan', phone: '+972501234567' })]
  });
  const journal = makeFakeSheet('Журнал');
  // business_days — вся неделя, digest_time — 00:00, чтобы дайджест ГАРАНТИРОВАННО отправился в этом тике.
  const settings = makeFakeSheet('Настройки', { data: ctx.buildDefaultSettingsRows_({ business_days: '0,1,2,3,4,5,6', digest_time: '00:00' }) });
  const ss = makeFakeSpreadsheet({ 'Заявки': requests, 'Служебное': service, 'Входящие': intake, 'Журнал': journal, 'Настройки': settings });
  spreadsheetApp.openById = () => ss;

  ctx.tick();

  const digestMail = mail._sent.find((m) => m.subject && m.subject.indexOf('дайджест') !== -1);
  assert.ok(digestMail, 'дайджест должен был уйти в этом тике (business_days=все дни, digest_time=00:00)');
  assert.ok(digestMail.body.indexOf('Новых: 1') !== -1,
    'дайджест должен видеть заявку, синхронизированную В ЭТОМ ЖЕ тике (fix item8) — не «Новых: 0» из снимка ДО sync');
});

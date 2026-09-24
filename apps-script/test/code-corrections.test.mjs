// GAS-only код (Code.gs) — тестируется через структурные фейки листов и
// PropertiesService/MailApp (test/helpers/gas-fakes.mjs).
//
// Задача 0.4.0: цепочка исправлений («все submission_id») и submission_id
// корня переехали на «Служебное»; «Заявки» связана с ним только по №
// (design §1/§3.2). Все тесты ниже строят ОБА листа и передают их в
// resolvePendingCorrections_.
import { test, assert } from './helpers/harness.mjs';
import { loadGasContext } from './helpers/load-gas.mjs';
import {
  makeFakeSheet, makeFakeSpreadsheet, makeFakeSpreadsheetApp,
  makeFakePropertiesService, makeFakeMailApp, makeFakeSession
} from './helpers/gas-fakes.mjs';

const noopSpreadsheetApp = makeFakeSpreadsheetApp({});

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

function newHarness() {
  const props = makeFakePropertiesService({});
  const mail = makeFakeMailApp();
  const overrides = {
    PropertiesService: props,
    MailApp: mail,
    Session: makeFakeSession('alex@adfix.co.il'),
    SpreadsheetApp: noopSpreadsheetApp // нужен только newRichTextValue() для writeContactCell_ (review находка №12)
  };
  const ctx = loadGasContext(undefined, overrides);
  return { ctx, props, mail };
}

/** Строит «Заявки» + «Служебное» с N заявок, связанных по №. */
function buildRequestsAndService(ctx, leads) {
  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  const svcHeaders = Array.from(ctx.SERVICE_SHEET_HEADERS_);
  const requests = makeFakeSheet('Заявки', {
    data: [reqHeaders].concat(leads.map((l) => buildRow(reqHeaders, {
      '№': l.no, 'Имя': l.name || '', 'Телефон': l.phone || '', 'Email': l.email || ''
    })))
  });
  const service = makeFakeSheet('Служебное', {
    data: [svcHeaders].concat(leads.map((l) => buildRow(svcHeaders, {
      '№': l.no, 'submission_id': l.submissionId, 'все submission_id': l.chain || l.submissionId
    })))
  });
  return { requests, service, reqHeaderMap: ctx.colByHeader_(reqHeaders), serviceHeaderMap: ctx.colByHeader_(svcHeaders) };
}

// --- design §1 инвариант / review находка №6 (CRITICAL, версия 0.3.0): re-find
// по № непосредственно перед записью, а не по индексу, вычисленному раньше ---

test('resolvePendingCorrections_: исправление попадает в правильную строку «Заявки» по №, найденную ЗАНОВО (design §1 инвариант)', () => {
  const { ctx } = newHarness();
  const { requests, service, reqHeaderMap, serviceHeaderMap } = buildRequestsAndService(ctx, [
    { no: 'G-0001', submissionId: 'A', name: 'Old', phone: '111' },
    { no: 'G-0002', submissionId: 'Z', name: 'Other', phone: '999' }
  ]);
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

  // Симулируем гонку (design §1: "LockService защищает только код скрипта, не
  // действия людей"): сотрудник переставляет местами физические строки G-0001
  // и G-0002 в «Заявки» РОВНО в момент, когда код впервые находит строку
  // «Служебное» для корня A — это МОДЕЛИРУЕТ "нашли строку -> позиция
  // изменилась -> нужно найти заново непосредственно перед записью". Хук — на
  // findServiceRowIndexBySubmissionId_ (первый вызов внутри
  // resolvePendingCorrections_, ДО реордера «Заявки»); применение исправления
  // (applyCorrectionToRow_) идёт вторым вызовом и должно найти актуальную
  // позицию «Заявки» через findRequestRowIndexByLeadNo_ по №, не по кэшу.
  let swapped = false;
  const originalFindServiceRow = ctx.findServiceRowIndexBySubmissionId_;
  ctx.findServiceRowIndexBySubmissionId_ = function (svc, headerMap, submissionId) {
    var result = originalFindServiceRow(svc, headerMap, submissionId);
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
  assert.equal(rowG1[reqHeaderMap['Имя']], 'New', 'исправление должно попасть в строку G-0001, где бы она теперь ни была физически');
  assert.equal(rowG2[reqHeaderMap['Имя']], 'Other', 'соседняя строка G-0002 не должна быть задета чужим исправлением');

  const svcRow = service._data.find((r) => r[serviceHeaderMap['№']] === 'G-0001');
  assert.equal(svcRow[serviceHeaderMap['все submission_id']], 'A,B', '«Служебное» получает обновлённую цепочку, «Заявки» её больше не хранит вовсе');
});

// --- задача 0.4.0 (расширяет предыдущий тест на onEdit): офис переставил
// строки «Заявки» — правки по-прежнему попадают в правильную строку «Служебное»
// по № (finish-критерий "stamps/flags/corrections land in the right row
// after the office reorders «Заявки»") -------------------------------------

test('handleEditRow_: штамп «Контакт состоялся» на «Служебное» попадает в правильную строку по № после перестановки «Заявки» офисом', () => {
  const { ctx } = newHarness();
  const { requests, service, reqHeaderMap, serviceHeaderMap } = buildRequestsAndService(ctx, [
    { no: 'G-0001', submissionId: 'A' },
    { no: 'G-0002', submissionId: 'B' }
  ]);
  const journal = makeFakeSheet('Журнал');

  // Офис переставляет физические строки местами (сортировка/вставка) —
  // ДО правки: G-0002 теперь физически в строке 2, G-0001 — в строке 3.
  const tmp = requests._data[1];
  requests._data[1] = requests._data[2];
  requests._data[2] = tmp;
  // Ставим статус «В работе» строке, где ТЕПЕРЬ лежит G-0002 (физическая строка 2)
  requests._data[1][reqHeaderMap['Статус']] = 'В работе';

  const now = new Date('2026-01-10T10:00:00Z');
  ctx.handleEditRow_(requests, reqHeaderMap, 2, journal, service, serviceHeaderMap, now);

  const svcForG2 = service._data.find((r) => r[serviceHeaderMap['№']] === 'G-0002');
  const svcForG1 = service._data.find((r) => r[serviceHeaderMap['№']] === 'G-0001');
  assert.ok(svcForG2[serviceHeaderMap['Контакт состоялся']], '«Контакт состоялся» должен появиться у G-0002 — той заявки, что реально правили');
  assert.ok(!svcForG1[serviceHeaderMap['Контакт состоялся']], 'G-0001 не должна быть задета — физическая позиция строки её не определяет');
});

// --- review находка №8: цикл исправлений — журналируется и алертится через 24ч

test('resolvePendingCorrections_: цикл исправлений логируется в Журнал при первом обнаружении, не задваивается на повторных тиках (review находка №8)', () => {
  const { ctx } = newHarness();
  const { requests, service, reqHeaderMap, serviceHeaderMap } = buildRequestsAndService(ctx, []);
  const intakeHeaders = ['submission_id', 'corrects_submission_id', 'submitted_at', 'name'];
  const intake = makeFakeSheet('Входящие', {
    data: [
      intakeHeaders,
      buildRow(intakeHeaders, { submission_id: 'A', corrects_submission_id: 'B', submitted_at: '2026-01-01T10:00:00Z', name: 'A' }),
      buildRow(intakeHeaders, { submission_id: 'B', corrects_submission_id: 'A', submitted_at: '2026-01-02T10:00:00Z', name: 'B' })
    ]
  });
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Входящие': intake, 'Заявки': requests, 'Служебное': service, 'Журнал': journal });
  const config = buildConfig();

  ctx.resolvePendingCorrections_(ss, config, new Date('2026-01-02T12:00:00Z'), requests, reqHeaderMap, service, serviceHeaderMap);
  const cycleRowsAfterFirstTick = journal._data.filter((r) => r[2] === 'correction_cycle_detected');
  // A<->B — взаимный цикл: и A, и B независимо обходят граф от себя и оба
  // упираются в цикл (симметрично waiting_for_original, который тоже трекает
  // per-leafId) — поэтому две строки, по одной на каждый submission_id цикла,
  // не одна на весь цикл.
  assert.equal(cycleRowsAfterFirstTick.length, 2, 'обе стороны цикла (A и B) журналируются по разу при первом обнаружении');

  // Повторный тик в течение того же часа — НЕ должен задваивать журнал ("один
  // раз при первом обнаружении" — review находка №8).
  ctx.resolvePendingCorrections_(ss, config, new Date('2026-01-02T13:00:00Z'), requests, reqHeaderMap, service, serviceHeaderMap);
  const cycleRowsAfterSecondTick = journal._data.filter((r) => r[2] === 'correction_cycle_detected');
  assert.equal(cycleRowsAfterSecondTick.length, 2, 'повторный тик по тому же неразрешённому циклу не должен писать новые строки');
});

test('resolvePendingCorrections_: цикл исправлений старше 24ч алертит системным получателям (review находка №8)', () => {
  const { ctx, mail } = newHarness();
  const { requests, service, reqHeaderMap, serviceHeaderMap } = buildRequestsAndService(ctx, []);
  const intakeHeaders = ['submission_id', 'corrects_submission_id', 'submitted_at', 'name'];
  const intake = makeFakeSheet('Входящие', {
    data: [
      intakeHeaders,
      buildRow(intakeHeaders, { submission_id: 'A', corrects_submission_id: 'B', submitted_at: '2026-01-01T10:00:00Z', name: 'A' }),
      buildRow(intakeHeaders, { submission_id: 'B', corrects_submission_id: 'A', submitted_at: '2026-01-02T10:00:00Z', name: 'B' })
    ]
  });
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Входящие': intake, 'Заявки': requests, 'Служебное': service, 'Журнал': journal });
  const config = buildConfig();

  // Тик 1: первое обнаружение — тревога ещё не должна уйти
  ctx.resolvePendingCorrections_(ss, config, new Date('2026-01-02T12:00:00Z'), requests, reqHeaderMap, service, serviceHeaderMap);
  assert.equal(mail._sent.length, 0, 'сразу после обнаружения тревоги ещё быть не должно');

  // Тик 2: 25 часов спустя — цикл всё ещё не решён -> алерт системным получателям.
  // A<->B трекается per-leafId (как и waiting_for_original) — обе стороны цикла
  // независимо переходят порог 24ч в этом тике, поэтому два письма, не одно.
  ctx.resolvePendingCorrections_(ss, config, new Date('2026-01-03T13:00:00Z'), requests, reqHeaderMap, service, serviceHeaderMap);
  assert.equal(mail._sent.length, 2, 'цикл держится дольше 24ч — должен уйти алерт по каждой стороне цикла');
  mail._sent.forEach((msg) => assert.deepEqual(msg.to.split(','), config.systemAlertRecipients));
});

test('resolvePendingCorrections_: цикл, разрешившийся новыми данными, снимается с трекинга (не алертит повторно после починки)', () => {
  const { ctx, mail } = newHarness();
  const { requests, service, reqHeaderMap, serviceHeaderMap } = buildRequestsAndService(ctx, []);
  const intakeHeaders = ['submission_id', 'corrects_submission_id', 'submitted_at', 'name'];
  const cyclicData = [
    intakeHeaders,
    buildRow(intakeHeaders, { submission_id: 'A', corrects_submission_id: 'B', submitted_at: '2026-01-01T10:00:00Z', name: 'A' }),
    buildRow(intakeHeaders, { submission_id: 'B', corrects_submission_id: 'A', submitted_at: '2026-01-02T10:00:00Z', name: 'B' })
  ];
  const intake = makeFakeSheet('Входящие', { data: cyclicData });
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Входящие': intake, 'Заявки': requests, 'Служебное': service, 'Журнал': journal });
  const config = buildConfig();

  ctx.resolvePendingCorrections_(ss, config, new Date('2026-01-02T12:00:00Z'), requests, reqHeaderMap, service, serviceHeaderMap);
  // Цикл разрывается: B больше не ссылается на A
  intake._data[2][intakeHeaders.indexOf('corrects_submission_id')] = '';
  ctx.resolvePendingCorrections_(ss, config, new Date('2026-01-03T13:00:00Z'), requests, reqHeaderMap, service, serviceHeaderMap);

  assert.equal(mail._sent.length, 0, 'цикл починился до истечения 24ч — алерта по нему быть не должно');
});

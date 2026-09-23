// GAS-only код (Code.gs) — тестируется через структурные фейки листов и
// PropertiesService/MailApp (test/helpers/gas-fakes.mjs).
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

// --- review находка №6 (CRITICAL): re-find по submission_id непосредственно
// перед записью, а не по индексу, вычисленному раньше -----------------------

test('resolvePendingCorrections_: исправление попадает в строку A, даже если строки переставились МЕЖДУ поиском корня и записью (design §1 инвариант)', () => {
  const { ctx } = newHarness();
  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  const requests = makeFakeSheet('Заявки', {
    data: [
      reqHeaders,
      buildRow(reqHeaders, { 'submission_id': 'A', 'все submission_id': 'A', 'Имя': 'Old', 'Телефон': '111' }),
      buildRow(reqHeaders, { 'submission_id': 'Z', 'все submission_id': 'Z', 'Имя': 'Other', 'Телефон': '999' })
    ]
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
  const ss = makeFakeSpreadsheet({ 'Входящие': intake, 'Заявки': requests, 'Журнал': journal });

  // Симулируем гонку (design §1: "LockService защищает только код скрипта, не
  // действия людей"): сотрудник переставляет местами физические строки A и Z
  // РОВНО в момент, когда код впервые вычисляет позицию строки A для записи —
  // это МОДЕЛИРУЕТ "нашли строку -> позиция изменилась -> нужно найти заново
  // непосредственно перед записью" (design §1 инвариант). Хук — на самой
  // функции поиска строки (findRequestRowIndexBySubmissionId_), а не на счётчике
  // getDataRange: старый код вызывает её РОВНО один раз и использует результат
  // для записи напрямую; новый код вызывает её дважды — второй раз (внутри
  // applyCorrectionToRow_) уже ПОСЛЕ гонки, и должен получить актуальную позицию.
  let swapped = false;
  const originalFindRowIndex = ctx.findRequestRowIndexBySubmissionId_;
  ctx.findRequestRowIndexBySubmissionId_ = function (reqSheet, headerMap, submissionId) {
    var result = originalFindRowIndex(reqSheet, headerMap, submissionId);
    if (!swapped) {
      swapped = true;
      var tmp = requests._data[1];
      requests._data[1] = requests._data[2];
      requests._data[2] = tmp;
    }
    return result;
  };

  const reqHeaderMap = ctx.colByHeader_(reqHeaders);
  ctx.resolvePendingCorrections_(ss, buildConfig(), new Date('2026-01-02T12:00:00Z'), requests, reqHeaderMap);

  const rowA = requests._data.find((r) => r[reqHeaderMap['submission_id']] === 'A');
  const rowZ = requests._data.find((r) => r[reqHeaderMap['submission_id']] === 'Z');
  assert.equal(rowA[reqHeaderMap['Имя']], 'New', 'исправление должно попасть в строку A, где бы она теперь ни была');
  assert.equal(rowZ[reqHeaderMap['Имя']], 'Other', 'соседняя строка Z не должна быть задета чужим исправлением');
});

// --- review находка №8: цикл исправлений — журналируется и алертится через 24ч

test('resolvePendingCorrections_: цикл исправлений логируется в Журнал при первом обнаружении, не задваивается на повторных тиках (review находка №8)', () => {
  const { ctx } = newHarness();
  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  const requests = makeFakeSheet('Заявки', { data: [reqHeaders] });
  const intakeHeaders = ['submission_id', 'corrects_submission_id', 'submitted_at', 'name'];
  const intake = makeFakeSheet('Входящие', {
    data: [
      intakeHeaders,
      buildRow(intakeHeaders, { submission_id: 'A', corrects_submission_id: 'B', submitted_at: '2026-01-01T10:00:00Z', name: 'A' }),
      buildRow(intakeHeaders, { submission_id: 'B', corrects_submission_id: 'A', submitted_at: '2026-01-02T10:00:00Z', name: 'B' })
    ]
  });
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Входящие': intake, 'Заявки': requests, 'Журнал': journal });
  const reqHeaderMap = ctx.colByHeader_(reqHeaders);
  const config = buildConfig();

  ctx.resolvePendingCorrections_(ss, config, new Date('2026-01-02T12:00:00Z'), requests, reqHeaderMap);
  const cycleRowsAfterFirstTick = journal._data.filter((r) => r[2] === 'correction_cycle_detected');
  // A<->B — взаимный цикл: и A, и B независимо обходят граф от себя и оба
  // упираются в цикл (симметрично waiting_for_original, который тоже трекает
  // per-leafId) — поэтому две строки, по одной на каждый submission_id цикла,
  // не одна на весь цикл.
  assert.equal(cycleRowsAfterFirstTick.length, 2, 'обе стороны цикла (A и B) журналируются по разу при первом обнаружении');

  // Повторный тик в течение того же часа — НЕ должен задваивать журнал ("один
  // раз при первом обнаружении" — review находка №8).
  ctx.resolvePendingCorrections_(ss, config, new Date('2026-01-02T13:00:00Z'), requests, reqHeaderMap);
  const cycleRowsAfterSecondTick = journal._data.filter((r) => r[2] === 'correction_cycle_detected');
  assert.equal(cycleRowsAfterSecondTick.length, 2, 'повторный тик по тому же неразрешённому циклу не должен писать новые строки');
});

test('resolvePendingCorrections_: цикл исправлений старше 24ч алертит системным получателям (review находка №8)', () => {
  const { ctx, mail } = newHarness();
  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  const requests = makeFakeSheet('Заявки', { data: [reqHeaders] });
  const intakeHeaders = ['submission_id', 'corrects_submission_id', 'submitted_at', 'name'];
  const intake = makeFakeSheet('Входящие', {
    data: [
      intakeHeaders,
      buildRow(intakeHeaders, { submission_id: 'A', corrects_submission_id: 'B', submitted_at: '2026-01-01T10:00:00Z', name: 'A' }),
      buildRow(intakeHeaders, { submission_id: 'B', corrects_submission_id: 'A', submitted_at: '2026-01-02T10:00:00Z', name: 'B' })
    ]
  });
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Входящие': intake, 'Заявки': requests, 'Журнал': journal });
  const reqHeaderMap = ctx.colByHeader_(reqHeaders);
  const config = buildConfig();

  // Тик 1: первое обнаружение — тревога ещё не должна уйти
  ctx.resolvePendingCorrections_(ss, config, new Date('2026-01-02T12:00:00Z'), requests, reqHeaderMap);
  assert.equal(mail._sent.length, 0, 'сразу после обнаружения тревоги ещё быть не должно');

  // Тик 2: 25 часов спустя — цикл всё ещё не решён -> алерт системным получателям.
  // A<->B трекается per-leafId (как и waiting_for_original) — обе стороны цикла
  // независимо переходят порог 24ч в этом тике, поэтому два письма, не одно.
  ctx.resolvePendingCorrections_(ss, config, new Date('2026-01-03T13:00:00Z'), requests, reqHeaderMap);
  assert.equal(mail._sent.length, 2, 'цикл держится дольше 24ч — должен уйти алерт по каждой стороне цикла');
  mail._sent.forEach((msg) => assert.deepEqual(msg.to.split(','), config.systemAlertRecipients));
});

test('resolvePendingCorrections_: цикл, разрешившийся новыми данными, снимается с трекинга (не алертит повторно после починки)', () => {
  const { ctx, mail } = newHarness();
  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  const requests = makeFakeSheet('Заявки', { data: [reqHeaders] });
  const intakeHeaders = ['submission_id', 'corrects_submission_id', 'submitted_at', 'name'];
  const cyclicData = [
    intakeHeaders,
    buildRow(intakeHeaders, { submission_id: 'A', corrects_submission_id: 'B', submitted_at: '2026-01-01T10:00:00Z', name: 'A' }),
    buildRow(intakeHeaders, { submission_id: 'B', corrects_submission_id: 'A', submitted_at: '2026-01-02T10:00:00Z', name: 'B' })
  ];
  const intake = makeFakeSheet('Входящие', { data: cyclicData });
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Входящие': intake, 'Заявки': requests, 'Журнал': journal });
  const reqHeaderMap = ctx.colByHeader_(reqHeaders);
  const config = buildConfig();

  ctx.resolvePendingCorrections_(ss, config, new Date('2026-01-02T12:00:00Z'), requests, reqHeaderMap);
  // Цикл разрывается: B больше не ссылается на A
  intake._data[2][intakeHeaders.indexOf('corrects_submission_id')] = '';
  ctx.resolvePendingCorrections_(ss, config, new Date('2026-01-03T13:00:00Z'), requests, reqHeaderMap);

  assert.equal(mail._sent.length, 0, 'цикл починился до истечения 24ч — алерта по нему быть не должно');
});

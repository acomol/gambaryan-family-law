// Раунд P1-фиксов "a-sync-notify" (2026-09-23): A1 formula injection, A2
// correction-write scoping, A3 orphan-completion notification, A4 retry
// budget/quota, A5 alert-flag-latch, A6 subject CR/LF, A7 exact key match.
// Каждый тест ниже был RED на базовом коммите 3354d4d и GREEN после фикса —
// см. PR/отчёт задачи для команды прогона (README "Как воспроизвести
// RED -> GREEN": GAS_SRC_DIR на копию 3354d4d).
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

function newHarness(overrides) {
  const props = makeFakePropertiesService((overrides && overrides.props) || {});
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

function buildRequestsAndService(ctx, leads) {
  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  const svcHeaders = Array.from(ctx.SERVICE_SHEET_HEADERS_);
  const requests = makeFakeSheet('Заявки', {
    data: [reqHeaders].concat(leads.map((l) => buildRow(reqHeaders, Object.assign({
      '№': l.no, 'Имя': l.name || '', 'Телефон': l.phone || '', 'Email': l.email || ''
    }, l.extra || {}))))
  });
  const service = makeFakeSheet('Служебное', {
    data: [svcHeaders].concat(leads.map((l) => buildRow(svcHeaders, {
      '№': l.no, 'submission_id': l.submissionId, 'все submission_id': l.chain || l.submissionId
    })))
  });
  return { requests, service, reqHeaderMap: ctx.colByHeader_(reqHeaders), serviceHeaderMap: ctx.colByHeader_(svcHeaders) };
}

// =============================================================================
// A1 — formula/CSV injection: sheetSafeValue_ (unit) + Журнал (choke point,
// не покрыт старыми item1-тестами, которые проверяют только «Заявки»/«Служебное»)
// =============================================================================

test('sheetSafeValue_: строки с ведущими =, +, -, @, tab, CR получают апостроф; безопасные строки и не-строки — без изменений (P1 A1)', () => {
  const { ctx } = newHarness();
  ['=1+1', '+972500000000', '-5', '@mention', '\ttab', '\rcr'].forEach((v) => {
    assert.equal(ctx.sheetSafeValue_(v), "'" + v, 'опасное значение "' + v + '" должно получить апостроф');
  });
  ['обычное имя', 'a@x.com', '', 'G-0001'].forEach((v) => {
    assert.equal(ctx.sheetSafeValue_(v), v, 'безопасная строка "' + v + '" не должна меняться');
  });
  const now = new Date();
  assert.equal(ctx.sheetSafeValue_(now), now, 'не-строка (Date) должна проходить без изменений');
  assert.equal(ctx.sheetSafeValue_(undefined), undefined);
  assert.equal(ctx.sheetSafeValue_(null), null);
});

test('appendJournalRow_: submission_id вида "=1+1" в «Журнале» НЕ становится формулой (P1 A1, «Журнал» — choke point, не покрыт item1)', () => {
  const { ctx } = newHarness();
  const journal = makeFakeSheet('Журнал', { data: [Array.from(ctx.JOURNAL_HEADERS_)] });
  // leafId (submission_id из «Входящих») — внешняя строка, попадает в
  // «Заявка №» через trackPendingCorrection_/trackPendingCycle_/tick_step_error.
  ctx.appendJournalRow_(journal, new Date('2026-01-01T10:00:00Z'), '=1+1', 'correction_cycle_detected', 'sent', 'internal', '=cmd|calc', '=evil:key');

  const headerMap = ctx.colByHeader_(Array.from(ctx.JOURNAL_HEADERS_));
  const leadNoCol = headerMap['Заявка №'] + 1;
  const detailsCol = headerMap['Детали'] + 1;
  const keyCol = headerMap['Ключ'] + 1;
  assert.deepEqual(journal.getRange(2, leadNoCol).getFormulas(), [['']], '«Заявка №» не должна стать формулой');
  assert.deepEqual(journal.getRange(2, detailsCol).getFormulas(), [['']], '«Детали» не должны стать формулой');
  assert.deepEqual(journal.getRange(2, keyCol).getFormulas(), [['']], '«Ключ» не должен стать формулой');
  assert.equal(journal._data[1][leadNoCol - 1], "'=1+1", 'значение остаётся видимым текстом, не пропадает');
});

// =============================================================================
// A2 — correction write scoping: только контактные поля, № никогда не пишем,
// проверка "после" не тавтологична
// =============================================================================

test('resolvePendingCorrections_: конкурентная правка офиса (Статус/Комментарий) той же заявки НЕ должна откатываться исправлением контактов (Codex P1-2, P1 A2)', () => {
  const { ctx } = newHarness();
  const { requests, service, reqHeaderMap, serviceHeaderMap } = buildRequestsAndService(ctx, [
    { no: 'G-0001', submissionId: 'A', name: 'Old', phone: '111' }
  ]);
  requests._data[1][reqHeaderMap['Статус']] = 'Не дозвонились';
  requests._data[1][reqHeaderMap['Комментарий']] = 'исходный комментарий офиса';

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

  // Гонка: РОВНО в момент, когда код первый раз читает/пишет что-либо в этой
  // физической строке (независимо от того, читает ли он № отдельно (новая
  // реализация) или всю строку разом (старая)), офис МЕНЯЕТ Статус/Комментарий
  // на этой же строке (тот же №, без сортировки). Хук на requests.getRange
  // ловит и getValues(), и getValue() ПЕРВОЙ ссылки на эту строку — мутация
  // применяется ПОСЛЕ вычисления возвращаемого снимка (т.е. код в этом вызове
  // ещё видит СТАРОЕ значение), но ДО любых последующих операций.
  const targetRow = 2; // «Заявки»: заголовок + 1 лид
  let raced = false;
  const originalGetRange = requests.getRange;
  requests.getRange = function (row, col, numRows, numCols) {
    var range = originalGetRange(row, col, numRows, numCols);
    if (row === targetRow) {
      var origGetValues = range.getValues;
      var origGetValue = range.getValue;
      range.getValues = function () {
        var result = origGetValues();
        if (!raced) {
          raced = true;
          requests._data[targetRow - 1][reqHeaderMap['Статус']] = 'Консультация назначена';
          requests._data[targetRow - 1][reqHeaderMap['Комментарий']] = 'офис только что записал это, пока шёл tick';
        }
        return result;
      };
      range.getValue = function () {
        var result = origGetValue();
        if (!raced) {
          raced = true;
          requests._data[targetRow - 1][reqHeaderMap['Статус']] = 'Консультация назначена';
          requests._data[targetRow - 1][reqHeaderMap['Комментарий']] = 'офис только что записал это, пока шёл tick';
        }
        return result;
      };
    }
    return range;
  };

  ctx.resolvePendingCorrections_(ss, buildConfig(), new Date('2026-01-02T12:00:00Z'), requests, reqHeaderMap, service, serviceHeaderMap);

  const row = requests._data.find((r) => r[reqHeaderMap['№']] === 'G-0001');
  assert.equal(row[reqHeaderMap['Статус']], 'Консультация назначена', 'конкурентная правка офиса (Статус) не должна теряться из-за applyCorrectionToRow_ (P1 A2)');
  assert.equal(row[reqHeaderMap['Комментарий']], 'офис только что записал это, пока шёл tick', 'Комментарий офиса не должен откатываться');
  assert.match(String(row[reqHeaderMap['Имя']]).replace(/^'/, ''), /New/, 'контакты всё равно должны обновиться исправлением, несмотря на гонку');
});

test('applyCorrectionToRow_: если № строки меняется МЕЖДУ проверкой до и после записи контактных полей — исправление НЕ помечается применённым (проверка "после" не тавтологична, P1 A2)', () => {
  const { ctx } = newHarness();
  const { requests, service, reqHeaderMap, serviceHeaderMap } = buildRequestsAndService(ctx, [
    { no: 'G-0001', submissionId: 'A', name: 'Old', phone: '111' }
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

  // Гонка: сортировка офиса подменяет физическую строку G-0001 на ДРУГОГО
  // лида РОВНО в момент первого обращения кода к этой строке (после того как
  // сам код успел убедиться, что № верный). Старая реализация читала №
  // из значения, которое САМА ЖЕ только что записала (тавтология — см.
  // комментарий у applyCorrectionToRow_) и потому НИКОГДА не ловила это;
  // новая — читает № заново, независимо от собственных записей.
  const targetRow = 2;
  let raced = false;
  const originalGetRange = requests.getRange;
  requests.getRange = function (row, col, numRows, numCols) {
    var range = originalGetRange(row, col, numRows, numCols);
    if (row === targetRow) {
      var origGetValues = range.getValues;
      var origGetValue = range.getValue;
      function fireRaceOnce(result) {
        if (!raced) {
          raced = true;
          requests._data[targetRow - 1][reqHeaderMap['№']] = 'G-9999'; // "чужой" лид занял физическую строку
        }
        return result;
      }
      range.getValues = function () { return fireRaceOnce(origGetValues()); };
      range.getValue = function () { return fireRaceOnce(origGetValue()); };
    }
    return range;
  };

  ctx.resolvePendingCorrections_(ss, buildConfig(), new Date('2026-01-02T12:00:00Z'), requests, reqHeaderMap, service, serviceHeaderMap);

  const svcRow = service._data.find((r) => r[serviceHeaderMap['№']] === 'G-0001');
  assert.equal(svcRow[serviceHeaderMap['все submission_id']], 'A', 'исправление НЕ должно быть помечено применённым — строка уехала во время записи (P1 A2), следующий тик обязан повторить попытку');
});

// =============================================================================
// A3 — orphan-completed lead: обязательство уведомить не теряется вместе со
// сбойным тиком
// =============================================================================

test('completeOrphanedLeads_: докрутка orphan-заявки в рабочие часы должна отправить офису то же немедленное письмо, что и обычное создание (Codex P1-3, P1 A3)', () => {
  const { ctx, mail } = newHarness();
  const svcHeaders = Array.from(ctx.SERVICE_SHEET_HEADERS_);
  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  // «Служебное» уже создано (создание НАЧАЛОСЬ в прошлом тике), «Заявки» —
  // нет (скрипт упал МЕЖДУ появлением «Служебное» и решением/отправкой
  // уведомления — до того, как notifyNewLead_ вообще был вызван).
  const service = makeFakeSheet('Служебное', {
    data: [svcHeaders, buildRow(svcHeaders, { '№': 'G-0001', 'submission_id': 'S1', 'все submission_id': 'S1', 'Откуда': 'Google Ads' })]
  });
  const requests = makeFakeSheet('Заявки', { data: [reqHeaders] });
  const reqHeaderMap = ctx.colByHeader_(reqHeaders);
  const serviceHeaderMap = ctx.colByHeader_(svcHeaders);
  const intakeHeaders = Array.from(ctx.INTAKE_HEADERS_);
  const intake = makeFakeSheet('Входящие', {
    data: [intakeHeaders, buildRow(intakeHeaders, { submission_id: 'S1', submitted_at: '2026-01-05T10:00:00Z', name: 'Ivan', phone: '+972501234567', email: 'a@x.com' })]
  });
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Входящие': intake, 'Заявки': requests, 'Служебное': service, 'Журнал': journal });
  const config = buildConfig();

  // 2026-01-05 — понедельник, 10:10 UTC = 12:10 Israel (зима, UTC+2) — рабочие часы.
  ctx.completeOrphanedLeads_(ss, requests, [Array.from(reqHeaders)], reqHeaderMap, [Array.from(svcHeaders), service._data[1]], serviceHeaderMap, config, new Date('2026-01-05T10:10:00Z'));

  assert.equal(mail._sent.length, 1, 'докрутка orphan-заявки в рабочие часы обязана отправить немедленное письмо офису (P1 A3) — раньше completeOrphanedLeads_ вообще не вызывала notifyNewLead_');
  assert.deepEqual(mail._sent[0].to.split(','), config.officeRecipients);
  assert.match(mail._sent[0].subject, /G-0001/);
});

test('completeOrphanedLeads_: докрутка orphan-заявки — повторный вызов идемпотентен (не шлёт письмо дважды благодаря SendLog, P1 A3)', () => {
  const { ctx, mail } = newHarness();
  const svcHeaders = Array.from(ctx.SERVICE_SHEET_HEADERS_);
  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  const service = makeFakeSheet('Служебное', {
    data: [svcHeaders, buildRow(svcHeaders, { '№': 'G-0001', 'submission_id': 'S1', 'все submission_id': 'S1' })]
  });
  const requests = makeFakeSheet('Заявки', { data: [reqHeaders] });
  const reqHeaderMap = ctx.colByHeader_(reqHeaders);
  const serviceHeaderMap = ctx.colByHeader_(svcHeaders);
  const intakeHeaders = Array.from(ctx.INTAKE_HEADERS_);
  const intake = makeFakeSheet('Входящие', {
    data: [intakeHeaders, buildRow(intakeHeaders, { submission_id: 'S1', submitted_at: '2026-01-05T10:00:00Z', name: 'Ivan', phone: '+972501234567' })]
  });
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Входящие': intake, 'Заявки': requests, 'Служебное': service, 'Журнал': journal });
  const config = buildConfig();
  const now = new Date('2026-01-05T10:10:00Z');

  ctx.completeOrphanedLeads_(ss, requests, [Array.from(reqHeaders)], reqHeaderMap, [Array.from(svcHeaders), service._data[1]], serviceHeaderMap, config, now);
  // «Заявки» теперь на месте — orphans.length === 0 при повторном вызове с
  // ТЕМ ЖЕ снимком «Заявки» не воспроизвести; вызываем sendNotificationOnce_
  // напрямую по тому же ключу, чтобы проверить именно идемпотентность письма.
  ctx.notifyNewLead_(journal, requests, 'G-0001', 2, config.officeRecipients, { name: 'Ivan', phone: '+972501234567' }, config.systemAlertRecipients);

  assert.equal(mail._sent.length, 1, 'SendLog должен пропустить повторную отправку того же ключа new_lead:1 (идемпотентность)');
});

// =============================================================================
// A4 — retry budget: считаем только реальные попытки, квота — по получателям,
// backoff вместо вечного молчания
// =============================================================================

test('retryPendingNotifications_: тик, в котором decideSendAction_ решила подождать (skip), НЕ должен тратить бюджет попыток (Codex P1-4, P1 A4)', () => {
  // sendNotificationOnce_ использует РЕАЛЬНЫЙ new Date() для своих ЖУРНАЛЬНЫХ
  // отметок (не параметр `now` вызывающего кода) — поэтому "16 минут спустя"
  // нельзя сымитировать поддельной датой на входе retryPendingNotifications_:
  // decideSendAction_ внутри всё равно сравнит РЕАЛЬНОЕ "сейчас" с РЕАЛЬНЫМ
  // updated_at предыдущей попытки. Честный способ получить настоящий 'skip' —
  // сделать первую попытку по-настоящему (она провалится и запишет UNKNOWN с
  // реальным timestamp), а затем сразу же (реальный elapsed ~0мс < 15 минут
  // retryAfterMs) вызвать ретрай ещё 3 раза — decideSendAction_ по-настоящему
  // решит "skip" для них.
  const { ctx, mail } = newHarness({ mailOpts: { shouldThrow: true } }); // 'MailApp: forced failure' -> classifySendError_ -> unknown
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
  const config = buildConfig();

  // Тик 1: предыдущее состояние FAILED -> decideSendAction_ всегда 'send' —
  // это настоящая (первая) попытка; она тоже проваливается (shouldThrow),
  // теперь состояние UNKNOWN с РЕАЛЬНЫМ updated_at.
  ctx.retryPendingNotifications_(ss, config, new Date('2026-01-05T10:10:00.000Z'), reqHeaderMap, serviceHeaderMap);
  var attemptsAfterFirst = JSON.parse(ctx.PropertiesService.getScriptProperties().getProperty('notificationRetryAttempts'));
  assert.equal(attemptsAfterFirst['G-0001:new_lead:1'].count, 1, 'первая (реальная) попытка должна засчитаться');

  // Тики 2-4: сразу же (реальный elapsed ~0мс) — decideSendAction_ решит
  // 'skip' для UNKNOWN моложе retryAfterMs. Старый код всё равно тратил
  // бюджет попыток на каждый такой тик.
  ctx.retryPendingNotifications_(ss, config, new Date('2026-01-05T10:15:00.000Z'), reqHeaderMap, serviceHeaderMap);
  ctx.retryPendingNotifications_(ss, config, new Date('2026-01-05T10:19:00.000Z'), reqHeaderMap, serviceHeaderMap);
  ctx.retryPendingNotifications_(ss, config, new Date('2026-01-05T10:23:00.000Z'), reqHeaderMap, serviceHeaderMap);

  var attemptsAfterSkips = JSON.parse(ctx.PropertiesService.getScriptProperties().getProperty('notificationRetryAttempts'));
  assert.equal(attemptsAfterSkips['G-0001:new_lead:1'].count, 1, '3 skip-тика НЕ должны были прибавить к счётчику реальных попыток (P1 A4) — бюджет всё ещё 1 из 5');
});

test('retryPendingNotifications_: после исчерпания реальных попыток ретрай уходит на backoff, а НЕ прекращается навсегда (P1 A4)', () => {
  const { ctx, mail } = newHarness();
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
  const config = buildConfig();
  // Бюджет уже исчерпан (5 реальных попыток), backoff истёк 1 минуту назад —
  // лид ЕЩЁ ОТКРЫТ (не "Клиент — договор"/"Отказ"), уведомление не должно
  // молчать навсегда.
  const attempts = { 'G-0001:new_lead:1': { count: 5, backoffUntil: new Date('2026-01-06T09:59:00.000Z').getTime() } };
  ctx.PropertiesService.getScriptProperties().setProperty('notificationRetryAttempts', JSON.stringify(attempts));

  ctx.retryPendingNotifications_(ss, config, new Date('2026-01-06T10:00:00.000Z'), reqHeaderMap, serviceHeaderMap);

  assert.equal(mail._sent.length, 1, 'backoff-окно истекло — новый цикл реальных попыток должен начаться, а не молчать навсегда (P1 A4)');
});

test('retryPendingNotifications_: квота MailApp сравнивается с ПОЛНЫМ числом получателей, не просто "> 0" (P1 A4, MailApp docs: quotas are per-recipient)', () => {
  // 2 получателя офиса, остаток квоты — 1: реальной отправки быть не должно
  // (иначе MailApp упадёт/отправит не всем).
  const { ctx, mail } = newHarness({ mailOpts: { remainingDailyQuota: 1 } });
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
  const config = buildConfig({ officeRecipients: ['a@x.com', 'b@x.com'] });

  ctx.retryPendingNotifications_(ss, config, new Date('2026-01-05T10:25:00.000Z'), reqHeaderMap, serviceHeaderMap);

  assert.equal(mail._sent.length, 0, 'квоты (1) не хватает на всех получателей (2) — ретрай не должен пытаться отправить (P1 A4)');
});

// =============================================================================
// A5 — системные алерты: флаг "уже алертили" взводится только после успешной
// отправки, иначе сбой MailApp гасит будущие попытки навсегда
// =============================================================================

test('reportCycleHealth_: сбой самой отправки алерта о деградации tick() не должен "тушить" будущие попытки (review gas-runtime #2, P1 A5)', () => {
  const { ctx, mail, props } = newHarness({ mailOpts: { shouldThrow: true } });
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Журнал': journal });
  const config = buildConfig();
  const stepResults = { sync: { ok: false, error: 'boom' } };

  ctx.reportCycleHealth_(ss, config, new Date('2026-01-01T10:00:00Z'), stepResults);
  assert.equal(mail._sent.length, 0, 'MailApp упал — писем 0');
  assert.notEqual(props._store.tickDegraded, 'true', 'флаг НЕ должен взводиться, пока алерт реально не ушёл (P1 A5)');

  // "Чинится" MailApp — на следующем тике (та же деградация) алерт наконец уходит.
  mail.sendEmail = function (msg) { mail._sent.push(msg); };
  ctx.reportCycleHealth_(ss, config, new Date('2026-01-01T10:05:00Z'), stepResults);
  assert.equal(mail._sent.length, 1, 'после починки MailApp вторая попытка должна реально отправить алерт (P1 A5)');
  assert.equal(props._store.tickDegraded, 'true', 'флаг взводится только теперь, после подтверждённой отправки');
});

test('trackPendingCorrection_: MailApp падает на 24ч-алерте — "alerted" НЕ взводится, следующий тик пробует снова (review email-pii #2, P1 A5)', () => {
  // classifySendError_ распознаёт "invalid email"/"recipient" в тексте ошибки
  // как FAILED — decideSendAction_ для FAILED всегда 'send' (без ожидания
  // retryAfterMs), поэтому вторая попытка ниже не зависит от того, сколько
  // РЕАЛЬНОГО wall-clock времени прошло между двумя вызовами теста (в отличие
  // от unknown/pending, где decideSendAction_ сравнивает СВОЙ внутренний
  // new Date() с updated_at предыдущей записи — оба реальные, а не поддельный
  // `now`, который получает эта функция).
  const { ctx, mail } = newHarness({ mailOpts: { shouldThrow: 'Invalid recipient address' } });
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Журнал': journal });
  const config = buildConfig();
  const now = new Date('2026-01-03T13:00:00Z');
  const pending = { B: { firstSeenAt: new Date(now.getTime() - 25 * 3600000).toISOString(), missingId: 'A', alerted: false } };

  ctx.trackPendingCorrection_(pending, 'B', 'A', now, ss, config);
  assert.equal(mail._sent.length, 0, 'MailApp упал — писем 0');
  assert.equal(pending.B.alerted, false, 'флаг НЕ должен взводиться, пока алерт реально не ушёл (P1 A5)');

  // "Чинится" MailApp — вторая попытка (FAILED всегда ретраится).
  mail.sendEmail = function (msg) { mail._sent.push(msg); };
  const now2 = new Date(now.getTime() + 5 * 60000);
  ctx.trackPendingCorrection_(pending, 'B', 'A', now2, ss, config);
  assert.equal(mail._sent.length, 1, 'после починки MailApp вторая попытка должна реально уйти (P1 A5)');
  assert.equal(pending.B.alerted, true, 'флаг взводится только теперь, после подтверждённой отправки');
});

// =============================================================================
// A6 — subject: CR/LF/control-символы вырезаются из Имени/№ (header injection)
// =============================================================================

test('renderNewLeadEmail_: CR/LF в Имени/№ не попадают в subject письма (P1 A6, email header injection)', () => {
  const { ctx } = newHarness();
  const email = ctx.renderNewLeadEmail_({
    leadNo: 'G-0001\r\nBcc: attacker@evil.com',
    name: 'Иван\nComplaints-To: attacker@evil.com',
    phone: '+972501234567',
    email: 'a@x.com',
    source: 'Google Ads',
    sheetUrl: 'https://example.com'
  });
  assert.ok(!/[\r\n]/.test(email.subject), 'subject не должен содержать CR/LF: "' + JSON.stringify(email.subject) + '"');
  assert.match(email.subject, /G-0001/);
  assert.match(email.subject, /Иван/);
});

test('renderSlaFirstAttemptEmail_/renderSlaEscalationEmail_: CR/LF в № не попадают в subject (P1 A6)', () => {
  const { ctx } = newHarness();
  const dirtyLeadNo = 'G-0002\r\nX-Injected: 1';
  const first = ctx.renderSlaFirstAttemptEmail_({ leadNo: dirtyLeadNo, name: 'Ivan', phone: '111', sheetUrl: 'https://x' });
  const escalation = ctx.renderSlaEscalationEmail_({ leadNo: dirtyLeadNo, name: 'Ivan', phone: '111', sheetUrl: 'https://x' });
  assert.ok(!/[\r\n]/.test(first.subject), 'SLA subject не должен содержать CR/LF');
  assert.ok(!/[\r\n]/.test(escalation.subject), 'эскалация subject не должна содержать CR/LF');
});

// =============================================================================
// A7 — retryPendingNotifications_: точное совпадение ключа, не substring
// =============================================================================

test('retryPendingNotifications_: запись "empty_recipients:...:new_lead:..." не должна приниматься за реальный new_lead-ретрай (review sync-loss #5, P1 A7)', () => {
  const { ctx, mail } = newHarness();
  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  const svcHeaders = Array.from(ctx.SERVICE_SHEET_HEADERS_);
  const requests = makeFakeSheet('Заявки', {
    data: [reqHeaders, buildRow(reqHeaders, { '№': 'G-0002', 'Имя': 'Petr', 'Телефон': '+972500000000' })]
  });
  const service = makeFakeSheet('Служебное', { data: [svcHeaders] });
  const journalHeaders = Array.from(ctx.JOURNAL_HEADERS_);
  // Строка ниже не может появиться в реальности с таким «Заявка №»
  // (sendNotificationOnce_ всегда пишет '' для события 'empty_recipients') —
  // собрана вручную, чтобы изолированно проверить именно классификацию
  // ключа, а не весь путь sendNotificationOnce_. Она моделирует наихудший
  // случай: ключ, содержащий подстроку ":new_lead:", но НЕ являющийся
  // реальным new_lead-ключом (ровно то, что реально пишет sendNotificationOnce_
  // как 'empty_recipients:' + <исходный new_lead-ключ>).
  const journal = makeFakeSheet('Журнал', {
    data: [journalHeaders, buildRow(journalHeaders, {
      'Время': new Date('2026-01-05T09:00:00Z'), 'Заявка №': 'G-0002', 'Событие': 'empty_recipients',
      'Статус отправки': 'failed', 'Ключ': 'empty_recipients:G-0002:new_lead:1'
    })]
  });
  const ss = makeFakeSpreadsheet({ 'Заявки': requests, 'Служебное': service, 'Журнал': journal });
  const reqHeaderMap = ctx.colByHeader_(reqHeaders);
  const serviceHeaderMap = ctx.colByHeader_(svcHeaders);

  ctx.retryPendingNotifications_(ss, buildConfig(), new Date('2026-01-05T10:00:00Z'), reqHeaderMap, serviceHeaderMap);

  assert.equal(mail._sent.length, 0, 'подстрочное совпадение ключа не должно вызывать отправку письма — это не new_lead-ключ (P1 A7)');
});

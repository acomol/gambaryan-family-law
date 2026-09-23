/**
 * Code.gs — точки входа: tick(), onEdit-обработчик, установка/снятие триггеров,
 * doGet (health), меню «CRM». Design: docs/MINI-CRM-DESIGN.md §5.1-§5.7.
 *
 * GAS-only, оркестрирует чистые функции из BusinessCalendar/Sla/CorrectionChain/
 * SendLog/Digest/Source/Numbering/SyncPlan. НЕ запускалось вживую — см. README
 * "Проверить перед боем" и раздел отчёта "не проверено".
 */

// ---------------------------------------------------------------------------
// tick() — раз в 5 минут, design §5.3
// ---------------------------------------------------------------------------

function tick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10 * 1000)) {
    Logger.log('tick: не удалось получить блокировку за 10с — пропуск цикла');
    return;
  }
  try {
    var config = loadConfig_();
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID_);
    var now = new Date();

    runStepSafely_('sync', function () { syncIntakeToRequests_(ss, config, now); });
    runStepSafely_('corrections', function () { resolvePendingCorrections_(ss, config, now); });
    runStepSafely_('sla', function () { processSla_(ss, config, now); });
    runStepSafely_('digest', function () { maybeSendDigest_(ss, config, now); });
    runStepSafely_('weekly_summary', function () { maybeSendWeeklySummary_(ss, config, now); });
    writeHeartbeat_(now);
  } catch (err) {
    Logger.log('tick: ошибка верхнего уровня: %s', err);
    notifySystemAlert_('tick_error', String(err));
  } finally {
    lock.releaseLock();
  }
}

/** Ошибка одного шага/одной заявки не должна останавливать остальные (§5.3 п.7). */
function runStepSafely_(name, fn) {
  try {
    fn();
  } catch (err) {
    Logger.log('tick/%s: ошибка: %s', name, err);
    try {
      var journal = SpreadsheetApp.openById(SPREADSHEET_ID_).getSheetByName(SHEET_JOURNAL_);
      appendJournalRow_(journal, new Date(), '', 'tick_step_error', 'failed', 'internal', name + ': ' + err, 'error:' + name);
    } catch (loggingErr) {
      Logger.log('tick/%s: не удалось записать ошибку в журнал: %s', name, loggingErr);
    }
  }
}

// ---------------------------------------------------------------------------
// Синхронизация «Входящие» -> «Заявки» (§5.3 п.2, SyncPlan.gs)
// ---------------------------------------------------------------------------

function syncIntakeToRequests_(ss, config, now) {
  var intake = ss.getSheetByName(SHEET_INTAKE_);
  var requests = ss.getSheetByName(SHEET_REQUESTS_);
  var intakeValues = intake.getDataRange().getValues();
  if (intakeValues.length < 2) return;
  var intakeHeaderMap = colByHeader_(intakeValues[0]);
  var incoming = intakeValues.slice(1).map(function (row) {
    return rowToRecord_(row, intakeHeaderMap);
  }).filter(function (r) { return r.submission_id && !r.corrects_submission_id; }); // корневые заявки — исправления §5.4 отдельно

  var reqValues = requests.getDataRange().getValues();
  var reqHeaderMap = colByHeader_(reqValues[0]);
  var existingBySubmissionId = {};
  reqValues.slice(1).forEach(function (row) {
    var id = getCell_(row, reqHeaderMap, 'submission_id');
    if (id) existingBySubmissionId[id] = true;
  });

  var plan = computeSyncPlan_(incoming, existingBySubmissionId, []);
  if (!plan.toCreate.length) return;

  var journal = ss.getSheetByName(SHEET_JOURNAL_);
  var existingNumbers = reqValues.slice(1).map(function (row) { return getCell_(row, reqHeaderMap, '№'); });

  plan.toCreate.forEach(function (rec) {
    var leadNo = nextLeadNumber_(existingNumbers);
    existingNumbers.push(leadNo);
    var row = buildNewRequestRow_(reqHeaderMap, rec, leadNo, config, now);
    requests.appendRow(row);
    var newRowIndex = requests.getLastRow();

    var notification = decideNewLeadNotification_(now, config.calendar);
    if (notification === 'immediate' && plan.toNotify.indexOf(rec.submission_id) !== -1) {
      notifyNewLead_(journal, leadNo, newRowIndex, config.officeRecipients);
    }
    // вне рабочего времени — не шлём по одной (§12.1): попадёт в дайджест сам
    // фактом присутствия в «Заявки» без «Первой попытки».
  });
}

function rowToRecord_(row, headerMap) {
  var rec = {};
  Object.keys(headerMap).forEach(function (header) {
    rec[header] = row[headerMap[header]];
  });
  return rec;
}

function buildNewRequestRow_(reqHeaderMap, rec, leadNo, config, now) {
  var row = new Array(REQUESTS_HEADERS_.length).fill('');
  var links = buildContactLinks_(rec.phone);
  setCell_(row, reqHeaderMap, '№', leadNo);
  // 'Статус' сознательно не пишем (§3.1: "скрипт статус не пишет", пусто = «Новая»)
  setCell_(row, reqHeaderMap, 'Получена', now);
  setCell_(row, reqHeaderMap, 'Имя', rec.name || '');
  setCell_(row, reqHeaderMap, 'Телефон', rec.phone || '');
  setCell_(row, reqHeaderMap, 'Связаться', links.telHref ? (links.telHref + '  ' + links.waHref) : '');
  setCell_(row, reqHeaderMap, 'Email', rec.email || '');
  setCell_(row, reqHeaderMap, 'Ответственный', config.defaultDutyOfficer || '');
  setCell_(row, reqHeaderMap, 'Откуда', detectSource_(rec));
  setCell_(row, reqHeaderMap, 'submission_id', rec.submission_id);
  setCell_(row, reqHeaderMap, 'все submission_id', rec.submission_id);
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'gclid', 'gbraid', 'wbraid', 'landing_path', 'referrer_host', 'form_id'].forEach(function (f) {
    setCell_(row, reqHeaderMap, f, rec[f] || '');
  });
  return row;
}

// ---------------------------------------------------------------------------
// Исправления контактов (§5.4, CorrectionChain.gs)
// ---------------------------------------------------------------------------

function resolvePendingCorrections_(ss, config, now) {
  var intake = ss.getSheetByName(SHEET_INTAKE_);
  var requests = ss.getSheetByName(SHEET_REQUESTS_);
  var intakeValues = intake.getDataRange().getValues();
  if (intakeValues.length < 2) return;
  var intakeHeaderMap = colByHeader_(intakeValues[0]);

  var recordsById = {};
  intakeValues.slice(1).forEach(function (row) {
    var rec = rowToRecord_(row, intakeHeaderMap);
    if (rec.submission_id) recordsById[rec.submission_id] = rec;
  });

  var corrections = Object.keys(recordsById).filter(function (id) {
    return recordsById[id].corrects_submission_id;
  });
  if (!corrections.length) return;

  var reqValues = requests.getDataRange().getValues();
  var reqHeaderMap = colByHeader_(reqValues[0]);
  var pending = readPendingCorrections_();

  corrections.forEach(function (leafId) {
    var alreadyAppliedRow = findRequestRowBySubmissionOrChain_(requests, reqHeaderMap, leafId);
    if (alreadyAppliedRow) return; // уже применено в предыдущем тике (idempotent)

    var plan = buildCorrectionPlan_(leafId, recordsById, []);
    if (plan.status === 'cycle') {
      Logger.log('resolvePendingCorrections_: цикл исправлений: %s', plan.ids.join(' -> '));
      return;
    }
    if (plan.status === 'waiting_for_original') {
      trackPendingCorrection_(pending, leafId, plan.missingId, now, ss, config);
      return;
    }
    clearPendingCorrection_(pending, leafId);

    var rowIndex = findRequestRowIndexBySubmissionId_(requests, reqHeaderMap, plan.rootId);
    if (rowIndex === -1) return; // корень ещё не синхронизирован в «Заявки» — следующий тик подтянет
    applyCorrectionToRow_(requests, reqHeaderMap, rowIndex, plan);
  });

  writePendingCorrections_(pending);
}

function findRequestRowIndexBySubmissionId_(requests, headerMap, submissionId) {
  var values = requests.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (getCell_(values[i], headerMap, 'submission_id') === submissionId) return i + 1; // 1-based row
  }
  return -1;
}

/** true если leafId уже присутствует в "все submission_id" какой-либо строки. */
function findRequestRowBySubmissionOrChain_(requests, headerMap, leafId) {
  var values = requests.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var chain = String(getCell_(values[i], headerMap, 'все submission_id') || '');
    if (chain.split(',').indexOf(leafId) !== -1) return i + 1;
  }
  return null;
}

function applyCorrectionToRow_(requests, headerMap, rowIndex, plan) {
  // перечитываем строку заново перед записью (§1: "перед каждой записью заново
  // находит строку по submission_id") — rowIndex уже свежий (найден в этом же тике).
  var links = buildContactLinks_(plan.finalContacts.phone);
  var updates = {
    'Имя': plan.finalContacts.name || '',
    'Телефон': plan.finalContacts.phone || '',
    'Email': plan.finalContacts.email || '',
    'Связаться': links.telHref ? (links.telHref + '  ' + links.waHref) : '',
    'все submission_id': plan.orderedIds.join(',')
  };
  Object.keys(updates).forEach(function (header) {
    var col = headerMap[header] + 1;
    requests.getRange(rowIndex, col).setValue(updates[header]);
  });
}

function readPendingCorrections_() {
  var raw = PropertiesService.getScriptProperties().getProperty('pendingCorrections');
  return raw ? JSON.parse(raw) : {};
}
function writePendingCorrections_(pending) {
  PropertiesService.getScriptProperties().setProperty('pendingCorrections', JSON.stringify(pending));
}
function trackPendingCorrection_(pending, leafId, missingId, now, ss, config) {
  var entry = pending[leafId];
  if (!entry) {
    entry = { firstSeenAt: now.toISOString(), missingId: missingId, alerted: false };
    pending[leafId] = entry;
  }
  var ageMs = now.getTime() - new Date(entry.firstSeenAt).getTime();
  if (!entry.alerted && ageMs >= 24 * 3600 * 1000) {
    var journal = ss.getSheetByName(SHEET_JOURNAL_);
    sendNotificationOnce_(journal, 'correction_wait:' + leafId, leafId, 'correction_waiting_24h', 'email',
      config.systemAlertRecipients, 'CRM: исправление ждёт оригинал >24ч',
      'submission_id ' + leafId + ' ждёт корень ' + missingId + ' дольше 24 часов.');
    entry.alerted = true;
  }
}
function clearPendingCorrection_(pending, leafId) {
  delete pending[leafId];
}

// ---------------------------------------------------------------------------
// SLA (§5.5, Sla.gs)
// ---------------------------------------------------------------------------

function processSla_(ss, config, now) {
  var requests = ss.getSheetByName(SHEET_REQUESTS_);
  var values = requests.getDataRange().getValues();
  if (values.length < 2) return;
  var headerMap = colByHeader_(values[0]);
  var journal = ss.getSheetByName(SHEET_JOURNAL_);

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var status = getCell_(row, headerMap, 'Статус');
    if (CLOSED_STATUSES_.indexOf(status) !== -1) continue; // закрытые — вне SLA

    var receivedAt = getCell_(row, headerMap, 'Получена');
    var firstAttemptAt = getCell_(row, headerMap, 'Первая попытка');
    if (!receivedAt) continue;

    var state = evaluateSlaState_(
      { receivedAt: new Date(receivedAt), firstAttemptAt: firstAttemptAt ? new Date(firstAttemptAt) : null },
      now, config.calendar, config.thresholds
    );
    if (state.firstAttemptDue === null) continue; // первая попытка уже была

    var leadNo = getCell_(row, headerMap, '№');
    var rowNumber = i + 1;
    if (state.escalationDue) {
      notifySlaEscalation_(journal, leadNo, rowNumber, config.escalationRecipients);
    } else if (state.firstAttemptDue) {
      var responsible = getCell_(row, headerMap, 'Ответственный') || config.defaultDutyOfficer;
      notifySlaFirstAttempt_(journal, leadNo, rowNumber, [responsible]);
    }
  }
}

// ---------------------------------------------------------------------------
// Дайджест и недельная сводка (§5.6)
// ---------------------------------------------------------------------------

function maybeSendDigest_(ss, config, now) {
  var todayKey = digestDayKey_(now, config.tz);
  var dow = dowOfDate_.apply(null, todayKey.split('-').map(Number));
  if (config.calendar.businessDays.indexOf(dow) === -1) return; // не рабочий день
  if ((config.calendar.holidays || []).indexOf(todayKey) !== -1) return;

  var digestMoment = zonedTimeToUtc_.apply(null,
    todayKey.split('-').map(Number).concat(config.digestTime.split(':').map(Number)).concat([0, config.tz]));
  if (now < digestMoment) return;

  var props = PropertiesService.getScriptProperties();
  var lastSentKey = props.getProperty('lastDigestDayKey');
  if (!shouldSendDigestToday_(lastSentKey, todayKey)) return;

  var stats = computeDigestStats_(ss, config, now);
  var digest = composeDigest_(stats);
  var journal = ss.getSheetByName(SHEET_JOURNAL_);
  var result = notifyDigest_(journal, todayKey, config.officeRecipients, digest);
  if (result.sent) props.setProperty('lastDigestDayKey', todayKey);
}

function computeDigestStats_(ss, config, now) {
  var requests = ss.getSheetByName(SHEET_REQUESTS_);
  var values = requests.getDataRange().getValues();
  if (values.length < 2) return {};
  var headerMap = colByHeader_(values[0]);
  var todayKey = digestDayKey_(now, config.tz);
  var stats = { newCount: 0, waitingFirstCallCount: 0, consultationsTodayCount: 0, overdueCount: 0 };

  values.slice(1).forEach(function (row) {
    var status = getCell_(row, headerMap, 'Статус');
    if (CLOSED_STATUSES_.indexOf(status) !== -1) return;
    if (!status) stats.newCount++;
    var firstAttempt = getCell_(row, headerMap, 'Первая попытка');
    if (!firstAttempt) stats.waitingFirstCallCount++;
    var consultation = getCell_(row, headerMap, 'Консультация');
    if (consultation && dateKeyInTz_(new Date(consultation), config.tz) === todayKey) stats.consultationsTodayCount++;
    var nextStep = getCell_(row, headerMap, 'Следующий шаг');
    if (nextStep && new Date(nextStep) < now) stats.overdueCount++;
  });
  return stats;
}

function maybeSendWeeklySummary_(ss, config, now) {
  var todayKey = digestDayKey_(now, config.tz);
  var dow = dowOfDate_.apply(null, todayKey.split('-').map(Number));
  if (dow !== 0) return; // воскресенье, design §5.6
  var props = PropertiesService.getScriptProperties();
  var lastWeekKey = props.getProperty('lastWeeklySummaryKey');
  if (lastWeekKey === todayKey) return;

  var body = 'Недельная сводка CRM lp.gambarian.com за ' + todayKey + '.\nСм. лист «Сводка» в таблице.';
  var journal = ss.getSheetByName(SHEET_JOURNAL_);
  var result = notifyWeeklySummary_(journal, todayKey, config.ownerSummaryRecipient, body);
  if (result.sent) props.setProperty('lastWeeklySummaryKey', todayKey);
}

function writeHeartbeat_(now) {
  PropertiesService.getScriptProperties().setProperty('heartbeatAt', now.toISOString());
}

// ---------------------------------------------------------------------------
// onEdit — устанавливаемый триггер (§5.2)
// ---------------------------------------------------------------------------

/**
 * Регистрируется через installTriggers() как ScriptApp.newTrigger('handleEdit_')
 * .forSpreadsheet(SPREADSHEET_ID_).onEdit().create() — НЕ простой bound-триггер
 * (design §5.1, находка Codex №1: у bound-скрипта редакторы таблицы = редакторы
 * кода, у installable-триггера identity владельца триггера отделена от таблицы).
 */
function handleEdit_(e) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    var sheet = e.range.getSheet();
    if (sheet.getName() !== SHEET_REQUESTS_) return;
    if (e.range.getRow() === 1) return; // заголовок

    var headerMap = colByHeader_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
    var journal = SpreadsheetApp.openById(SPREADSHEET_ID_).getSheetByName(SHEET_JOURNAL_);
    var now = new Date();

    // вставка в несколько строк/ячеек — обрабатываем диапазоном (§5.2)
    for (var r = e.range.getRow(); r < e.range.getRow() + e.range.getNumRows(); r++) {
      runStepSafely_('onEdit_row_' + r, function () {
        handleEditRow_(sheet, headerMap, r, journal, now);
      });
    }
  } finally {
    lock.releaseLock();
  }
}

function handleEditRow_(sheet, headerMap, rowIndex, journal, now) {
  var row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  var leadNo = getCell_(row, headerMap, '№');
  if (!leadNo) return; // не заявка (например, пустая строка)

  var status = getCell_(row, headerMap, 'Статус');
  var telephone = getCell_(row, headerMap, 'Телефон');
  var firstAttempt = getCell_(row, headerMap, 'Первая попытка');
  var contactMade = getCell_(row, headerMap, 'Контакт состоялся');

  // "Контакт состоялся" — время, когда статус впервые стал «В работе» и дальше (§3.1)
  var contactStatuses = ['В работе', 'Консультация назначена', 'Консультация проведена', 'Клиент — договор'];
  if (contactStatuses.indexOf(status) !== -1 && !contactMade) {
    sheet.getRange(rowIndex, headerMap['Контакт состоялся'] + 1).setValue(now);
  }
  // "Первая попытка" закрывает SLA — если статус сдвинулся с «Новой», но штамп ещё
  // не проставлен (office не использовал чекбокс отдельно), проставляем по факту первой правки.
  if (status && !firstAttempt) {
    sheet.getRange(rowIndex, headerMap['Первая попытка'] + 1).setValue(now);
  }
  if (status === 'Клиент — договор') {
    var contractCell = sheet.getRange(rowIndex, headerMap['Договор'] + 1);
    if (!contractCell.getValue()) contractCell.setValue(now);
  }

  var statusChangedCell = sheet.getRange(rowIndex, headerMap['Статус изменён'] + 1);
  statusChangedCell.setValue(now);
  appendJournalRow_(journal, now, leadNo, 'status_changed', 'sent', 'internal', 'status=' + (status || '(пусто)'), 'status_change:' + leadNo + ':' + now.getTime());

  if (telephone) {
    var links = buildContactLinks_(telephone);
    sheet.getRange(rowIndex, headerMap['Связаться'] + 1).setValue(links.telHref ? (links.telHref + '  ' + links.waHref) : '');
  }
}

// ---------------------------------------------------------------------------
// Установка/снятие триггеров (§5.2)
// ---------------------------------------------------------------------------

function installTriggers() {
  removeTriggers();
  ScriptApp.newTrigger('tick').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('handleEdit_').forSpreadsheet(SPREADSHEET_ID_).onEdit().create();
  Logger.log('installTriggers: установлено 2 триггера (tick каждые 5 мин, onEdit)');
}

function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'tick' || t.getHandlerFunction() === 'handleEdit_') {
      ScriptApp.deleteTrigger(t);
    }
  });
}

// ---------------------------------------------------------------------------
// doGet — health endpoint для внешнего наблюдателя (§5.7), без PII
// ---------------------------------------------------------------------------

function doGet(e) {
  var token = PropertiesService.getScriptProperties().getProperty('healthEndpointToken');
  var providedToken = e && e.parameter ? e.parameter.token : null;
  if (!token || providedToken !== token) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'unauthorized' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID_);
  var intakeCount = Math.max(ss.getSheetByName(SHEET_INTAKE_).getLastRow() - 1, 0);
  var requestsCount = Math.max(ss.getSheetByName(SHEET_REQUESTS_).getLastRow() - 1, 0);
  var heartbeatAt = PropertiesService.getScriptProperties().getProperty('heartbeatAt');
  var payload = {
    intake_count: intakeCount,
    requests_count: requestsCount,
    heartbeat_at: heartbeatAt || null,
    heartbeat_age_seconds: heartbeatAt ? Math.round((Date.now() - new Date(heartbeatAt).getTime()) / 1000) : null
  };
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// Меню «CRM» (§5.2)
// ---------------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi().createMenu('CRM')
    .addItem('Проверить сейчас', 'tick')
    .addItem('Тест уведомления', 'menuSendTestNotification_')
    .addSeparator()
    .addItem('Архивировать закрытые…', 'menuArchiveClosed_')
    .addToUi();
}

function menuSendTestNotification_() {
  var config = loadConfig_();
  var journal = SpreadsheetApp.openById(SPREADSHEET_ID_).getSheetByName(SHEET_JOURNAL_);
  var result = sendNotificationOnce_(journal, 'test:' + Date.now(), 'TEST', 'manual_test', 'email',
    config.systemAlertRecipients, 'CRM: тестовое уведомление', 'Ручной тест из меню «CRM».');
  SpreadsheetApp.getUi().alert(result.sent ? 'Отправлено' : 'Не отправлено: ' + result.reason);
}

/**
 * Разрушающее действие — только из меню (§5.2). Design §5: "хранение закрытых —
 * бессрочно" (§12.5) — эта функция НЕ удаляет данные, только позволяет владельцу
 * вручную скрыть/сгруппировать закрытые строки в будущем; на 2026-09-23 оставлена
 * заглушкой, т.к. авто-архивация закрытых прямо запрещена решением владельца.
 */
function menuArchiveClosed_() {
  SpreadsheetApp.getUi().alert(
    'Закрытые заявки хранятся бессрочно (решение владельца, design §12.5). ' +
    'Автоматической архивации нет — используйте фильтр по статусу вручную.'
  );
}

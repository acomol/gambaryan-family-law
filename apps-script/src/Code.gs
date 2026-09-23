/**
 * Code.gs — точки входа: tick(), onEdit-обработчик, установка/снятие триггеров,
 * doGet (health), административные функции ADFIX (без меню «CRM» — review
 * находка №2, см. комментарий над menuSendTestNotification_). Design:
 * docs/MINI-CRM-DESIGN.md §5.1-§5.7.
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

    // Review находка №10: раньше каждый шаг сам делал getDataRange().getValues()
    // «Заявки» — до 4 полных чтений за один tick(). Снимок читается ОДИН раз и
    // передаётся шагам. Исключение — поиск строки для записи исправления/штампа
    // (findRequestRowIndexByLeadNo_/findServiceRow*_, CorrectionChain-путь): те
    // продолжают читать лист заново непосредственно перед записью (design §1
    // инвариант, review находка №6) — снимок для них не годится по построению.
    var requests = ss.getSheetByName(SHEET_REQUESTS_);
    var reqValues = requests.getDataRange().getValues();
    var reqHeaderMap = colByHeader_(reqValues[0] || []);

    // Задача 0.4.0: «Служебное» — второй лист, снимок читается тем же приёмом.
    var service = ss.getSheetByName(SHEET_SERVICE_);
    var serviceValues = service.getDataRange().getValues();
    var serviceHeaderMap = colByHeader_(serviceValues[0] || []);

    runStepSafely_('sync', function () {
      syncIntakeToRequests_(ss, config, now, requests, reqValues, reqHeaderMap, service, serviceValues, serviceHeaderMap);
    });
    runStepSafely_('corrections', function () {
      resolvePendingCorrections_(ss, config, now, requests, reqHeaderMap, service, serviceHeaderMap);
    });
    runStepSafely_('sla', function () { processSla_(ss, config, now, reqValues, reqHeaderMap); });
    runStepSafely_('digest', function () { maybeSendDigest_(ss, config, now, reqValues, reqHeaderMap); });
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

/**
 * Review находка №10: «Входящие» — append-only, поэтому не сканируем его
 * целиком заново каждый tick навсегда — берём только строки после watermark
 * (последнее обработанное количество строк, PropertiesService). Анти-дубль
 * при этом НЕ полагается только на watermark: existingBySubmissionId строится
 * по ПОЛНОМУ serviceValues (снимок «Служебное» на этот tick) — "re-validated by
 * submission_id" — так что даже сбитый watermark может максимум пропустить
 * новую заявку до починки, но никогда не создаст дубль.
 *
 * Задача 0.4.0: submission_id/«Откуда»/технические поля больше НЕ пишутся на
 * «Заявки» вовсе — вся служебная часть новой строки уходит в «Служебное»,
 * связанное с «Заявками» по № (design §3.2).
 * @param {Sheet} requests уже открытый лист «Заявки» (для appendRow/getRange)
 * @param {Array} reqValues снимок «Заявки» на начало этого tick (design item10)
 * @param {Object} reqHeaderMap
 * @param {Sheet} service уже открытый лист «Служебное»
 * @param {Array} serviceValues снимок «Служебное» на начало этого tick
 * @param {Object} serviceHeaderMap
 */
function syncIntakeToRequests_(ss, config, now, requests, reqValues, reqHeaderMap, service, serviceValues, serviceHeaderMap) {
  var intake = ss.getSheetByName(SHEET_INTAKE_);
  var intakeValues = intake.getDataRange().getValues();
  if (intakeValues.length < 2) return;
  var intakeHeaderMap = colByHeader_(intakeValues[0]);
  var dataRowCount = intakeValues.length - 1;
  var watermark = Math.min(readIntakeWatermark_(), dataRowCount);

  var incoming = intakeValues.slice(1 + watermark).map(function (row) {
    return rowToRecord_(row, intakeHeaderMap);
  }).filter(function (r) { return r.submission_id && !r.corrects_submission_id; }); // корневые заявки — исправления §5.4 отдельно

  var existingBySubmissionId = {};
  serviceValues.slice(1).forEach(function (row) {
    var id = getCell_(row, serviceHeaderMap, 'submission_id');
    if (id) existingBySubmissionId[id] = true;
  });

  var plan = computeSyncPlan_(incoming, existingBySubmissionId, []);

  if (plan.toCreate.length) {
    var journal = ss.getSheetByName(SHEET_JOURNAL_);
    var existingNumbers = reqValues.slice(1).map(function (row) { return getCell_(row, reqHeaderMap, '№'); });

    plan.toCreate.forEach(function (rec) {
      var leadNo = nextLeadNumber_(existingNumbers);
      existingNumbers.push(leadNo);

      var row = buildNewRequestRow_(reqHeaderMap, rec, leadNo, config, now);
      requests.appendRow(row);
      var newRowIndex = requests.getLastRow();
      writeContactCell_(requests, newRowIndex, reqHeaderMap, rec.phone); // review находка №12 — настоящая ссылка

      var serviceRow = buildNewServiceRow_(serviceHeaderMap, rec, leadNo);
      service.appendRow(serviceRow);

      var notification = decideNewLeadNotification_(now, config.calendar, config.weekendDuty);
      if (plan.toNotify.indexOf(rec.submission_id) !== -1) {
        // Task B: данные для брендированного письма — только то, что задача
        // разрешает в письме (никаких UTM/технических полей).
        var leadData = {
          name: rec.name || '',
          phone: rec.phone || '',
          email: rec.email || '',
          source: detectSource_(rec),
          receivedAtLabel: Utilities.formatDate(now, config.tz, 'dd.MM.yyyy HH:mm')
        };
        if (notification === 'immediate') {
          notifyNewLead_(journal, requests, leadNo, newRowIndex, config.officeRecipients, leadData);
        } else if (notification === 'immediate_duty') {
          // review находка №13 / design §12 строка 7: дежурный на выходные/ночь,
          // выключен по умолчанию — включается настройкой «Настроек»
          notifyNewLead_(journal, requests, leadNo, newRowIndex, [config.weekendDuty.email], leadData);
        }
        // 'digest' — вне рабочего времени и дежурный выключен: не шлём по одной
        // (§12.1), попадёт в дайджест сам фактом присутствия в «Заявки» без
        // «Первой попытки».
      }
    });
  }

  writeIntakeWatermark_(dataRowCount); // append-only — следующий tick начнёт отсюда
}

function rowToRecord_(row, headerMap) {
  var rec = {};
  Object.keys(headerMap).forEach(function (header) {
    rec[header] = row[headerMap[header]];
  });
  return rec;
}

/** «Заявки»: только поля офиса (задача 0.4.0 — никакой техники на этом листе). */
function buildNewRequestRow_(reqHeaderMap, rec, leadNo, config, now) {
  var row = new Array(REQUESTS_HEADERS_.length).fill('');
  setCell_(row, reqHeaderMap, '№', leadNo);
  // 'Статус' сознательно не пишем (§3.1: "скрипт статус не пишет", пусто = «Новая»)
  setCell_(row, reqHeaderMap, 'Получена', now);
  setCell_(row, reqHeaderMap, 'Имя', rec.name || '');
  setCell_(row, reqHeaderMap, 'Телефон', rec.phone || '');
  // 'Связаться' — не строка, а RichTextValue (review находка №12); пишется
  // ПОСЛЕ appendRow через writeContactCell_ (appendRow не умеет rich text).
  setCell_(row, reqHeaderMap, 'Email', rec.email || '');
  setCell_(row, reqHeaderMap, 'Ответственный', config.defaultDutyOfficer || '');
  return row;
}

/**
 * «Служебное»: № (ключ связи с «Заявками»), submission_id корня, цепочка
 * исправлений (изначально — сам корень) и «Откуда» (design §3.2). Остальные
 * поля («Контакт состоялся», «Статус изменён», «Договор», contact_version,
 * флаги уведомлений) заполняются позже — onEdit/SLA/notifications шагами.
 */
function buildNewServiceRow_(serviceHeaderMap, rec, leadNo) {
  var row = new Array(SERVICE_SHEET_HEADERS_.length).fill('');
  setCell_(row, serviceHeaderMap, '№', leadNo);
  setCell_(row, serviceHeaderMap, 'submission_id', rec.submission_id);
  setCell_(row, serviceHeaderMap, 'все submission_id', rec.submission_id);
  setCell_(row, serviceHeaderMap, 'Откуда', detectSource_(rec));
  return row;
}

// ---------------------------------------------------------------------------
// Исправления контактов (§5.4, CorrectionChain.gs)
// ---------------------------------------------------------------------------

/**
 * Задача 0.4.0: цепочка исправлений («все submission_id») и связь по
 * submission_id теперь живут на «Служебное», а не на «Заявки» — там больше
 * нет технических колонок. Контактные поля (Имя/Телефон/Email/«Связаться») —
 * по-прежнему на «Заявки», найденной по № через строку «Служебное».
 * @param {Sheet} requests уже открытый лист «Заявки»
 * @param {Object} reqHeaderMap карта заголовков «Заявки» (общая для tick — design item10)
 * @param {Sheet} service уже открытый лист «Служебное»
 * @param {Object} serviceHeaderMap карта заголовков «Служебное»
 *   САМИ строки при этом ищутся заново непосредственно перед каждой записью
 *   (findServiceRow*_/findRequestRowIndexByLeadNo_ читают лист напрямую, а не
 *   снимок значений — design §1, review находка №6).
 */
function resolvePendingCorrections_(ss, config, now, requests, reqHeaderMap, service, serviceHeaderMap) {
  var intake = ss.getSheetByName(SHEET_INTAKE_);
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

  var pending = readPendingCorrections_();
  var pendingCycles = readPendingCycles_(); // review находка №8

  corrections.forEach(function (leafId) {
    var alreadyAppliedRow = findServiceRowBySubmissionOrChain_(service, serviceHeaderMap, leafId);
    if (alreadyAppliedRow !== -1) return; // уже применено в предыдущем тике (idempotent)

    var plan = buildCorrectionPlan_(leafId, recordsById, []);
    if (plan.status === 'cycle') {
      Logger.log('resolvePendingCorrections_: цикл исправлений: %s', plan.ids.join(' -> '));
      // review находка №8: раньше цикл только логировался (Logger.log — теряется
      // между запусками) и никогда не алертился. Журналируем один раз при первом
      // обнаружении и алертим системным получателям через 24ч, как
      // waiting_for_original (trackPendingCorrection_ ниже).
      trackPendingCycle_(pendingCycles, leafId, plan.ids, now, ss, config);
      return;
    }
    clearPendingCycle_(pendingCycles, leafId); // цикл разрешился (новые данные разорвали его)
    if (plan.status === 'waiting_for_original') {
      trackPendingCorrection_(pending, leafId, plan.missingId, now, ss, config);
      return;
    }
    clearPendingCorrection_(pending, leafId);

    var serviceRowIndex = findServiceRowIndexBySubmissionId_(service, serviceHeaderMap, plan.rootId);
    if (serviceRowIndex === -1) return; // корень ещё не синхронизирован в «Служебное» — следующий тик подтянет
    applyCorrectionToRow_(requests, reqHeaderMap, service, serviceHeaderMap, plan);
  });

  writePendingCorrections_(pending);
  writePendingCycles_(pendingCycles);
}

/** Находит строку «Служебное» по корневому submission_id (колонка 'submission_id'). */
function findServiceRowIndexBySubmissionId_(service, headerMap, submissionId) {
  var values = service.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (getCell_(values[i], headerMap, 'submission_id') === submissionId) return i + 1; // 1-based row
  }
  return -1;
}

/** true если leafId уже присутствует в "все submission_id" какой-либо строки «Служебное». */
function findServiceRowBySubmissionOrChain_(service, headerMap, leafId) {
  var values = service.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var chain = String(getCell_(values[i], headerMap, 'все submission_id') || '');
    if (chain.split(',').indexOf(leafId) !== -1) return i + 1;
  }
  return -1;
}

/** Находит строку «Заявки» по № (design §1: связь между листами — только по №). */
function findRequestRowIndexByLeadNo_(requests, headerMap, leadNo) {
  var values = requests.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (getCell_(values[i], headerMap, '№') === leadNo) return i + 1; // 1-based row
  }
  return -1;
}

/**
 * Review находка №6 (CRITICAL, версия 0.3.0) + design §1 (версия 0.4.0): раньше
 * принимался готовый rowIndex, вычисленный ДО этого вызова — между тем моментом
 * и записью строка могла "уехать" (сотрудник отсортировал/переставил —
 * LockService защищает только код скрипта, не действия людей). Инвариант
 * "перед каждой записью заново находит строку по №" требует свежего поиска
 * НЕПОСРЕДСТВЕННО перед записью на ОБОИХ листах: «Служебное» — по корневому
 * submission_id, «Заявки» — по № (единственная связь между листами).
 */
function applyCorrectionToRow_(requests, reqHeaderMap, service, serviceHeaderMap, plan) {
  var serviceRowIndex = findServiceRowIndexBySubmissionId_(service, serviceHeaderMap, plan.rootId);
  if (serviceRowIndex === -1) return; // строка исчезла между поиском корня и записью — следующий тик подтянет
  var leadNo = service.getRange(serviceRowIndex, serviceHeaderMap['№'] + 1).getValue();

  var rowIndex = findRequestRowIndexByLeadNo_(requests, reqHeaderMap, leadNo);
  if (rowIndex === -1) return; // строка «Заявки» исчезла между поиском и записью — следующий тик подтянет

  var updates = {
    'Имя': plan.finalContacts.name || '',
    'Телефон': plan.finalContacts.phone || '',
    'Email': plan.finalContacts.email || ''
  };
  Object.keys(updates).forEach(function (header) {
    var col = reqHeaderMap[header] + 1;
    requests.getRange(rowIndex, col).setValue(updates[header]);
  });
  writeContactCell_(requests, rowIndex, reqHeaderMap, plan.finalContacts.phone); // review находка №12

  service.getRange(serviceRowIndex, serviceHeaderMap['все submission_id'] + 1).setValue(plan.orderedIds.join(','));
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

// review находка №8: цикл исправлений — журналируется один раз при обнаружении,
// алертится системным получателям через 24ч, симметрично waiting_for_original.
function readPendingCycles_() {
  var raw = PropertiesService.getScriptProperties().getProperty('pendingCorrectionCycles');
  return raw ? JSON.parse(raw) : {};
}
function writePendingCycles_(pendingCycles) {
  PropertiesService.getScriptProperties().setProperty('pendingCorrectionCycles', JSON.stringify(pendingCycles));
}
function trackPendingCycle_(pendingCycles, leafId, cycleIds, now, ss, config) {
  var entry = pendingCycles[leafId];
  if (!entry) {
    entry = { firstSeenAt: now.toISOString(), cycleIds: cycleIds, logged: false, alerted: false };
    pendingCycles[leafId] = entry;
  }
  if (!entry.logged) {
    var journal = ss.getSheetByName(SHEET_JOURNAL_);
    appendJournalRow_(journal, now, leafId, 'correction_cycle_detected', 'sent', 'internal',
      'Цикл исправлений: ' + cycleIds.join(' -> '), 'correction_cycle:' + leafId);
    entry.logged = true;
  }
  var ageMs = now.getTime() - new Date(entry.firstSeenAt).getTime();
  if (!entry.alerted && ageMs >= 24 * 3600 * 1000) {
    var journal2 = ss.getSheetByName(SHEET_JOURNAL_);
    sendNotificationOnce_(journal2, 'correction_cycle_alert:' + leafId, leafId, 'correction_cycle_24h', 'email',
      config.systemAlertRecipients, 'CRM: цикл исправлений >24ч без решения',
      'submission_id ' + leafId + ' — цикл исправлений (' + cycleIds.join(' -> ') + ') держится дольше 24 часов.');
    entry.alerted = true;
  }
}
function clearPendingCycle_(pendingCycles, leafId) {
  delete pendingCycles[leafId];
}

// review находка №10: intake — append-only; watermark хранит, сколько строк
// данных уже обработано, чтобы syncIntakeToRequests_ не пересканировал лист
// целиком каждый tick навсегда. Анти-дубль всё равно re-validated по
// submission_id (existingBySubmissionId в syncIntakeToRequests_), watermark —
// только оптимизация, не единственная защита от дублей.
function readIntakeWatermark_() {
  var raw = PropertiesService.getScriptProperties().getProperty('intakeProcessedRows');
  var n = raw ? parseInt(raw, 10) : 0;
  return isNaN(n) || n < 0 ? 0 : n;
}
function writeIntakeWatermark_(n) {
  PropertiesService.getScriptProperties().setProperty('intakeProcessedRows', String(Math.max(0, n)));
}

// review находка №12: «Связаться» — RichTextValue с настоящей кликабельной
// ссылкой (WhatsApp), а не текст "tel:... https://wa.me/...". tel: не делаем
// ссылкой — см. Utils.gs buildContactCellPlan_ и README "Не проверено".
function buildContactRichText_(phone) {
  var plan = buildContactCellPlan_(phone);
  if (!plan.text) return null;
  var builder = SpreadsheetApp.newRichTextValue().setText(plan.text);
  plan.links.forEach(function (l) { builder.setLinkUrl(l.start, l.end, l.url); });
  return builder.build();
}
function writeContactCell_(sheet, rowIndex, headerMap, phone) {
  var cell = sheet.getRange(rowIndex, headerMap['Связаться'] + 1);
  var richText = buildContactRichText_(phone);
  if (richText) {
    cell.setRichTextValue(richText);
  } else {
    cell.setValue('');
  }
}

// ---------------------------------------------------------------------------
// SLA (§5.5, Sla.gs)
// ---------------------------------------------------------------------------

function processSla_(ss, config, now, values, headerMap) {
  if (!values || values.length < 2) return;
  var journal = ss.getSheetByName(SHEET_JOURNAL_);
  var requests = ss.getSheetByName(SHEET_REQUESTS_); // Task B: ссылка «Открыть заявку» в письме

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
    // review находка №11а: сентинел "первая попытка уже была" — это поле
    // businessMinutesElapsed, равное null (см. Sla.gs evaluateSlaState_).
    // Старая версия проверяла другое поле (firstAttemptDue) на такое же
    // значение — то поле у evaluateSlaState_ всегда boolean, такого значения
    // не бывает никогда, и старая проверка была мёртвым кодом.
    if (state.businessMinutesElapsed === null) continue; // первая попытка уже была

    var leadNo = getCell_(row, headerMap, '№');
    var rowNumber = i + 1;
    var leadData = { name: getCell_(row, headerMap, 'Имя') || '', phone: getCell_(row, headerMap, 'Телефон') || '' };
    if (state.escalationDue) {
      notifySlaEscalation_(journal, requests, leadNo, rowNumber, config.escalationRecipients, leadData);
    } else if (state.firstAttemptDue) {
      var responsible = getCell_(row, headerMap, 'Ответственный') || config.defaultDutyOfficer;
      notifySlaFirstAttempt_(journal, requests, leadNo, rowNumber, [responsible], leadData);
    }
  }
}

// ---------------------------------------------------------------------------
// Дайджест и недельная сводка (§5.6)
// ---------------------------------------------------------------------------

function maybeSendDigest_(ss, config, now, values, headerMap) {
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

  var stats = computeDigestStats_(values, headerMap, config, now);
  var digest = composeDigest_(stats);
  var journal = ss.getSheetByName(SHEET_JOURNAL_);
  var result = notifyDigest_(journal, todayKey, config.officeRecipients, digest);
  if (result.sent) props.setProperty('lastDigestDayKey', todayKey);
}

function computeDigestStats_(values, headerMap, config, now) {
  if (!values || values.length < 2) return {};
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
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID_);
    var journal = ss.getSheetByName(SHEET_JOURNAL_);
    // Задача 0.4.0: «Контакт состоялся»/«Статус изменён»/«Договор» переехали на
    // «Служебное» — onEdit находит нужную строку там по № (design §1, §3.2).
    var service = ss.getSheetByName(SHEET_SERVICE_);
    var serviceHeaderMap = colByHeader_(service.getRange(1, 1, 1, service.getLastColumn()).getValues()[0]);
    var now = new Date();

    // вставка в несколько строк/ячеек — обрабатываем диапазоном (§5.2)
    for (var r = e.range.getRow(); r < e.range.getRow() + e.range.getNumRows(); r++) {
      runStepSafely_('onEdit_row_' + r, function () {
        handleEditRow_(sheet, headerMap, r, journal, service, serviceHeaderMap, now);
      });
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * Задача 0.4.0: правки самой строки «Заявки» (Первая попытка, «Связаться») —
 * на месте; штампы, которые раньше жили на «Заявки» («Контакт состоялся»,
 * «Статус изменён», «Договор»), теперь пишутся в «Служебное», найденную ЗАНОВО
 * по № (design §1 инвариант — Заявки могли быть отсортированы/перестроены
 * между чтением rowIndex и этим вызовом, а Служебное вообще не связано по
 * физической позиции строки).
 */
function handleEditRow_(sheet, headerMap, rowIndex, journal, service, serviceHeaderMap, now) {
  var row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  var leadNo = getCell_(row, headerMap, '№');
  if (!leadNo) return; // не заявка (например, пустая строка)

  var status = getCell_(row, headerMap, 'Статус');
  var telephone = getCell_(row, headerMap, 'Телефон');
  var firstAttempt = getCell_(row, headerMap, 'Первая попытка');

  var serviceRowIndex = findServiceRowIndexByLeadNo_(service, serviceHeaderMap, leadNo);
  if (serviceRowIndex !== -1) {
    var contactMade = service.getRange(serviceRowIndex, serviceHeaderMap['Контакт состоялся'] + 1).getValue();
    // "Контакт состоялся" — время, когда статус впервые стал «В работе» и дальше (§3.1)
    var contactStatuses = ['В работе', 'Консультация назначена', 'Консультация проведена', 'Клиент — договор'];
    if (contactStatuses.indexOf(status) !== -1 && !contactMade) {
      service.getRange(serviceRowIndex, serviceHeaderMap['Контакт состоялся'] + 1).setValue(now);
    }
    if (status === 'Клиент — договор') {
      var contractCell = service.getRange(serviceRowIndex, serviceHeaderMap['Договор'] + 1);
      if (!contractCell.getValue()) contractCell.setValue(now);
    }
    service.getRange(serviceRowIndex, serviceHeaderMap['Статус изменён'] + 1).setValue(now);
  }

  // "Первая попытка" закрывает SLA — если статус сдвинулся с «Новой», но штамп ещё
  // не проставлен (office не использовал чекбокс отдельно), проставляем по факту первой правки.
  if (status && !firstAttempt) {
    sheet.getRange(rowIndex, headerMap['Первая попытка'] + 1).setValue(now);
  }

  appendJournalRow_(journal, now, leadNo, 'status_changed', 'sent', 'internal', 'status=' + (status || '(пусто)'), 'status_change:' + leadNo + ':' + now.getTime());

  if (telephone) {
    writeContactCell_(sheet, rowIndex, headerMap, telephone); // review находка №12
  }
}

/** Находит строку «Служебное» по № (design §1/§3.2 — единственная связь между листами). */
function findServiceRowIndexByLeadNo_(service, headerMap, leadNo) {
  var values = service.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (getCell_(values[i], headerMap, '№') === leadNo) return i + 1; // 1-based row
  }
  return -1;
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
  // review находка №11б: сравнение токена — timingSafeEqual_ (Utils.gs), в
  // постоянное время. Прямое строковое сравнение с коротким замыканием по
  // первому несовпавшему символу теоретически утекает через тайминг ответа.
  // Ответ по-прежнему только счётчики, без PII (не меняем).
  if (!token || !timingSafeEqual_(providedToken, token)) {
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
// Административные действия ADFIX (review находка №2 — меню «CRM» УБРАНО)
// ---------------------------------------------------------------------------

/**
 * Review находка №2: меню «CRM» и onOpen() удалены, а не переведены на
 * installable-триггер. Причина — официальная документация Google однозначна:
 * getUi()/меню требуют ПРИВЯЗАННОГО скрипта, а design §5.1 сознательно ставит
 * скрипт СТАНДАЛОН-проектом (находка Codex №1 в design.md), и это не зависит
 * от типа триггера (simple vs installable):
 *
 *   "Only bound scripts can create menus. To display the menu when the user
 *    opens a file, write the menu code within an onOpen function."
 *    — Custom menus, https://developers.google.com/apps-script/guides/menus
 *
 *   "A script can only interact with the UI for the current instance of an
 *    open spreadsheet, and only if the script is bound to the spreadsheet."
 *    — SpreadsheetApp.getUi(),
 *    https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app#getui()
 *
 *   "The script must be bound to a Google Sheets, Slides, Docs, or Forms file,
 *    or else be an add-on that extends one of those applications."
 *    — Understanding triggers (Restrictions on simple triggers),
 *    https://developers.google.com/apps-script/guides/triggers
 *
 * Отдельно: простой onOpen(e) в standalone-проекте вообще не запускается сам
 * (та же страница triggers) — installTriggers() его и не устанавливал. Ставить
 * installable onOpen ради getUi() тоже бессмысленно — второй и третий источник
 * выше говорят, что дело не в типе триггера, а в bound/standalone статусе
 * самого проекта. Поэтому: административные действия ADFIX запускает вручную
 * из редактора Apps Script (Run -> имя функции), результат смотрит в логе
 * выполнения (View -> Executions/Logs), не во всплывающем диалоге —
 * см. README «Установка» шаг 8.
 */
function menuSendTestNotification_() {
  var config = loadConfig_();
  var journal = SpreadsheetApp.openById(SPREADSHEET_ID_).getSheetByName(SHEET_JOURNAL_);
  var result = sendNotificationOnce_(journal, 'test:' + Date.now(), 'TEST', 'manual_test', 'email',
    config.systemAlertRecipients, 'CRM: тестовое уведомление', 'Ручной тест из редактора Apps Script.');
  Logger.log('menuSendTestNotification_: %s', result.sent ? 'отправлено' : ('не отправлено: ' + result.reason));
  return result;
}

/**
 * Разрушающее действие — раньше "только из меню" (§5.2), меню больше нет
 * (review находка №2) — запускается вручную из редактора Apps Script. Design §5:
 * "хранение закрытых — бессрочно" (§12.5) — эта функция НЕ удаляет данные,
 * только сообщает об этом; авто-архивация закрытых прямо запрещена решением
 * владельца.
 */
function menuArchiveClosed_() {
  var message = 'Закрытые заявки хранятся бессрочно (решение владельца, design §12.5). ' +
    'Автоматической архивации нет — используйте фильтр по статусу вручную.';
  Logger.log('menuArchiveClosed_: %s', message);
  return message;
}

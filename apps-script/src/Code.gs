/**
 * Code.gs — точки входа: tick(), onEdit-обработчик, установка/снятие триггеров,
 * doGet (health), административные функции ADFIX (без меню «CRM» — review
 * находка №2, см. комментарий над menuSendTestNotification_). Design:
 * docs/MINI-CRM-DESIGN.md §5.1-§5.7.
 *
 * GAS-only, оркестрирует чистые функции из BusinessCalendar/Sla/CorrectionChain/
 * SendLog/Digest/Source/Numbering/SyncPlan. НЕ запускалось вживую — см. README
 * "Проверить перед боем" и раздел отчёта "не проверено".
 *
 * Независимое ревью Codex (ветка claude/gambarian-mini-crm @ 1071f53,
 * CHANGES_REQUESTED, все 8 находок воспроизведены) закрыто в этом файле:
 * item1 formula re-injection, item3 batched correction write + verify-after,
 * item4 atomic lead creation (Служебное перед Заявки + докрутка orphan-строк),
 * item5 независимый ретрай упавших писем, item6 per-step результаты + алерт
 * на деградацию, item7 очередь потерянных onEdit-правок, item8 свежий снимок
 * «Заявки» для SLA/дайджеста после sync/corrections.
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

    var requests = ss.getSheetByName(SHEET_REQUESTS_);
    var reqValues = requests.getDataRange().getValues();
    var reqHeaderMap = colByHeader_(reqValues[0] || []);

    var service = ss.getSheetByName(SHEET_SERVICE_);
    var serviceValues = service.getDataRange().getValues();
    var serviceHeaderMap = colByHeader_(serviceValues[0] || []);

    // design fix item6: каждый шаг возвращает {ok:true|false} — heartbeat
    // (design §5.7) обновляется всегда (доказывает, что скрипт вообще
    // выполнился), а "последний ПОЛНОСТЬЮ успешный цикл" — отдельное
    // состояние, и на переходе ok -> degraded уходит алерт (см. reportCycleHealth_).
    var stepResults = {};

    // design fix item4: сначала докручиваем прерванные создания (Служебное
    // уже есть, «Заявки» нет — например скрипт упал между двумя appendRow в
    // прошлом тике), потом обычная синхронизация новых заявок.
    stepResults.complete_orphans = runStepSafely_('complete_orphans', function () {
      completeOrphanedLeads_(ss, requests, reqValues, reqHeaderMap, serviceValues, serviceHeaderMap, config, now);
    });

    stepResults.sync = runStepSafely_('sync', function () {
      syncIntakeToRequests_(ss, config, now, requests, reqValues, reqHeaderMap, service, serviceValues, serviceHeaderMap);
    });
    stepResults.corrections = runStepSafely_('corrections', function () {
      resolvePendingCorrections_(ss, config, now, requests, reqHeaderMap, service, serviceHeaderMap);
    });

    // design fix item8: sync/corrections МЕНЯЮТ «Заявки» (новые строки,
    // докрученные orphan-заявки, исправленные контакты) — SLA и дайджест
    // должны видеть АКТУАЛЬНОЕ состояние, не снимок ДО этих шагов (иначе
    // свежая установка ровно в 08:30 отправит дайджест «Новых: 0», хотя
    // заявки только что появились в этом же тике).
    reqValues = requests.getDataRange().getValues();
    reqHeaderMap = colByHeader_(reqValues[0] || []);

    stepResults.sla = runStepSafely_('sla', function () { processSla_(ss, config, now, reqValues, reqHeaderMap); });
    stepResults.digest = runStepSafely_('digest', function () { maybeSendDigest_(ss, config, now, reqValues, reqHeaderMap); });
    stepResults.weekly_summary = runStepSafely_('weekly_summary', function () { maybeSendWeeklySummary_(ss, config, now); });

    // design fix item5: письма, которые не удалось отправить (pending/unknown/
    // failed в «Журнале»), больше не теряются навсегда — независимый ретрай.
    stepResults.retry_notifications = runStepSafely_('retry_notifications', function () {
      retryPendingNotifications_(ss, config, now, reqHeaderMap, serviceHeaderMap);
    });

    // design fix item7: правки, потерянные из-за таймаута блокировки onEdit,
    // докручиваются здесь.
    stepResults.reconcile_edits = runStepSafely_('reconcile_edits', function () {
      reconcilePendingEdits_(requests, reqHeaderMap, ss.getSheetByName(SHEET_JOURNAL_), service, serviceHeaderMap, now);
    });

    // build-round (owner-approved): независимый наблюдатель за резервным
    // бэкап/ретрай-воркером (pipeline-health v1, PipelineHealth.gs) — раз в
    // час, собственный шаг, падение здесь не должно ронять синхронизацию.
    stepResults.pipeline_health = runStepSafely_('pipeline_health', function () {
      checkPipelineHealth_(ss, config, now);
    });

    writeHeartbeat_(now);
    reportCycleHealth_(ss, config, now, stepResults);
  } catch (err) {
    Logger.log('tick: ошибка верхнего уровня: %s', err);
    notifySystemAlert_('tick_error', String(err));
  } finally {
    lock.releaseLock();
  }
}

/**
 * Ошибка одного шага/одной заявки не должна останавливать остальные (§5.3 п.7).
 * design fix item6: раньше ничего не возвращала (ошибка "проглатывалась"
 * молча, вызывающий код не мог узнать об этом) — теперь возвращает
 * {ok:true} | {ok:false, error}, что использует reportCycleHealth_.
 * @return {{ok:boolean, error:(string|undefined)}}
 */
function runStepSafely_(name, fn) {
  try {
    fn();
    return { ok: true };
  } catch (err) {
    Logger.log('tick/%s: ошибка: %s', name, err);
    try {
      var journal = SpreadsheetApp.openById(SPREADSHEET_ID_).getSheetByName(SHEET_JOURNAL_);
      appendJournalRow_(journal, new Date(), '', 'tick_step_error', 'failed', 'internal', name + ': ' + err, 'error:' + name);
    } catch (loggingErr) {
      Logger.log('tick/%s: не удалось записать ошибку в журнал: %s', name, loggingErr);
    }
    return { ok: false, error: String(err) };
  }
}

/**
 * design fix item6 (Codex review): heartbeat раньше был ЕДИНСТВЕННЫМ сигналом
 * здоровья tick() и обновлялся всегда, даже если каждый шаг падал —
 * независимый наблюдатель (design §5.7) не видел деградации вовсе. Теперь:
 * "последний полностью успешный цикл" — отдельное свойство; на переходе
 * ok -> degraded уходит алерт системному получателю ОДИН раз на инцидент (не
 * на каждый тик, пока деградация продолжается), на переходе обратно в ok флаг
 * тихо снимается (следующая деградация — новый инцидент, новый алерт).
 * @param {Object<string,{ok:boolean}>} stepResults
 */
function reportCycleHealth_(ss, config, now, stepResults) {
  var allOk = Object.keys(stepResults).every(function (name) { return stepResults[name].ok; });
  var props = PropertiesService.getScriptProperties();
  if (allOk) {
    props.setProperty('lastFullCycleAt', now.toISOString());
    props.setProperty('tickDegraded', 'false');
    return;
  }
  var wasDegraded = props.getProperty('tickDegraded') === 'true';
  props.setProperty('tickDegraded', 'true');
  if (wasDegraded) return; // уже алертили этот инцидент

  var failedSteps = Object.keys(stepResults).filter(function (name) { return !stepResults[name].ok; });
  var journal = ss.getSheetByName(SHEET_JOURNAL_);
  sendNotificationOnce_(journal, 'tick_degraded:' + now.getTime(), '', 'tick_degraded', 'email',
    config.systemAlertRecipients, 'CRM: часть шагов tick() не выполнилась',
    'Провалились шаги: ' + failedSteps.join(', ') + '. Подробности — «Журнал» (tick_step_error).');
}

// ---------------------------------------------------------------------------
// design fix item1: защита от formula re-injection при записи внешних строк
// ---------------------------------------------------------------------------

/**
 * Codex review item1 (CRITICAL): строки из «Входящих» (Имя/Телефон/Email/
 * Откуда/submission_id — заполняются посетителем формы или query-параметрами
 * лендинга, включая utm_source) пишутся через Range.setValue()/setValues().
 * Официальная семантика Class Range: значение, начинающееся с "=", парсится
 * как формула НЕЗАВИСИМО от источника записи (API/UI). Значение вида "=1+1",
 * "+CMD(...)" превращается в исполняемую формулу на «Заявки»/«Служебное».
 * Стандартная защита (formula/CSV injection) — формат ячейки "обычный текст"
 * ("@"), выставленный ДО setValue()/setValues(): движок не парсит содержимое
 * ячейки с этим форматом как формулу. Формат ставится на ЦЕЛЕВЫЕ ячейки
 * НЕПОСРЕДСТВЕННО перед каждой записью — не полагаемся на разовую настройку
 * колонки при setupCrm() (которая могла не запуститься на этой копии/версии).
 * @param {Sheet} sheet
 * @param {number} rowIndex 1-based
 * @param {Object<string,number>} headerMap
 * @param {string[]} headers какие заголовки защитить в этой строке
 */
function protectExternalTextColumns_(sheet, rowIndex, headerMap, headers) {
  headers.forEach(function (header) {
    var col = headerMap[header];
    if (col === undefined) return;
    sheet.getRange(rowIndex, col + 1).setNumberFormat('@');
  });
}

/** design item1: одна ячейка — формат "обычный текст" ДО значения, одним вызовом. */
function setPlainTextValue_(range, value) {
  range.setNumberFormat('@');
  range.setValue(value);
  return range;
}

// ---------------------------------------------------------------------------
// Синхронизация «Входящие» -> «Заявки»/«Служебное» (§5.3 п.2, SyncPlan.gs)
// ---------------------------------------------------------------------------

/**
 * design fix item4 (Codex review, CHANGES_REQUESTED): раньше «Заявки» и
 * «Служебное» дописывались ДВУМЯ отдельными appendRow — падение скрипта между
 * ними (квота/таймаут/сбой сети) оставляло либо orphan-строку «Заявки» без
 * «Служебное» (следующий тик считает submission_id новым и создаёт ВТОРУЮ
 * заявку под другим №), либо orphan-строку «Служебное» без «Заявки» (заявка
 * навсегда не видна офису). Теперь: «Служебное» пишется ПЕРВЫМ — само его
 * присутствие БЕЗ строки «Заявки» и есть маркер "создание не завершено" (без
 * отдельной колонки состояния), докручивается completeOrphanedLeads_ в
 * начале следующего тика тем же №. № для новых заявок берётся из ОБЪЕДИНЕНИЯ
 * номеров «Заявки» и «Служебное» — иначе orphan-заявка (номер уже "занят" в
 * «Служебное», но не виден в «Заявки») и genuinely новая заявка того же тика
 * могут получить ОДИН И ТОТ ЖЕ №.
 *
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
    // design item4: № берём из ОБЪЕДИНЕНИЯ «Заявки» + «Служебное» — orphan-
    // заявка (есть в «Служебное», ещё нет в «Заявки») не должна отдать свой №
    // genuinely новой заявке этого же тика.
    var existingNumbers = reqValues.slice(1).map(function (row) { return getCell_(row, reqHeaderMap, '№'); });
    serviceValues.slice(1).forEach(function (row) {
      var no = getCell_(row, serviceHeaderMap, '№');
      if (no && existingNumbers.indexOf(no) === -1) existingNumbers.push(no);
    });

    plan.toCreate.forEach(function (rec) {
      var leadNo = nextLeadNumber_(existingNumbers);
      existingNumbers.push(leadNo);

      // design item4: «Служебное» ПЕРВЫМ (см. комментарий выше функции).
      var serviceRow = buildNewServiceRow_(serviceHeaderMap, rec, leadNo);
      appendServiceRowSafely_(service, serviceHeaderMap, serviceRow); // item1 защита

      var row = buildNewRequestRow_(reqHeaderMap, rec, leadNo, config, now);
      var newRowIndex = appendRequestRowSafely_(requests, reqHeaderMap, row); // item1 защита
      writeContactCell_(requests, newRowIndex, reqHeaderMap, rec.phone); // review находка №12 — настоящая ссылка

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
          notifyNewLead_(journal, requests, leadNo, newRowIndex, config.officeRecipients, leadData, config.systemAlertRecipients);
        } else if (notification === 'immediate_duty') {
          // review находка №13 / design §12 строка 7: дежурный на выходные/ночь,
          // выключен по умолчанию — включается настройкой «Настроек»
          notifyNewLead_(journal, requests, leadNo, newRowIndex, [config.weekendDuty.email], leadData, config.systemAlertRecipients);
        }
        // 'digest' — вне рабочего времени и дежурный выключен: не шлём по одной
        // (§12.1), попадёт в дайджест сам фактом присутствия в «Заявки» без
        // «Первой попытки».
      }
    });
  }

  writeIntakeWatermark_(dataRowCount); // append-only — следующий tick начнёт отсюда
}

/**
 * design fix item4: докручивает заявки, для которых «Служебное» уже создано
 * (значит, создание НАЧАЛОСЬ), а «Заявки» — ещё нет (скрипт упал между двумя
 * appendRow). Использует тот же №, что уже зарезервирован в «Служебное» — не
 * создаёт вторую заявку. Идемпотентно: если «Заявки» уже на месте, ничего не
 * делает.
 */
function completeOrphanedLeads_(ss, requests, reqValues, reqHeaderMap, serviceValues, serviceHeaderMap, config, now) {
  var existingLeadNumbers = {};
  reqValues.slice(1).forEach(function (row) {
    var no = getCell_(row, reqHeaderMap, '№');
    if (no) existingLeadNumbers[no] = true;
  });

  var orphans = serviceValues.slice(1).filter(function (row) {
    var no = getCell_(row, serviceHeaderMap, '№');
    return no && !existingLeadNumbers[no];
  });
  if (!orphans.length) return;

  var intake = ss.getSheetByName(SHEET_INTAKE_);
  var intakeValues = intake.getDataRange().getValues();
  if (intakeValues.length < 2) return;
  var intakeHeaderMap = colByHeader_(intakeValues[0]);
  var recordsById = {};
  intakeValues.slice(1).forEach(function (row) {
    var rec = rowToRecord_(row, intakeHeaderMap);
    if (rec.submission_id) recordsById[rec.submission_id] = rec;
  });

  orphans.forEach(function (svcRow) {
    var leadNo = getCell_(svcRow, serviceHeaderMap, '№');
    var submissionId = getCell_(svcRow, serviceHeaderMap, 'submission_id');
    var rec = recordsById[submissionId];
    if (!rec) return; // запись «Входящих» не найдена — не должно происходить, но не падаем; следующий тик подтянет

    var row = buildNewRequestRow_(reqHeaderMap, rec, leadNo, config, now);
    var newRowIndex = appendRequestRowSafely_(requests, reqHeaderMap, row); // item1 защита
    writeContactCell_(requests, newRowIndex, reqHeaderMap, rec.phone);
  });
}

/**
 * appendRow не позволяет отформатировать ячейки ДО записи (пишет всю строку
 * разом) — резервируем позицию будущей строки, форматируем в ней Имя/
 * Телефон/Email обычным текстом (design item1), и ТОЛЬКО ПОТОМ дописываем
 * строку. appendRow на предварительно отформатированную позицию сохраняет
 * формат ячейки (формат — свойство ячейки листа, не строки appendRow).
 * @return {number} 1-based индекс дописанной строки
 */
function appendRequestRowSafely_(requests, reqHeaderMap, row) {
  var futureRowIndex = requests.getLastRow() + 1;
  protectExternalTextColumns_(requests, futureRowIndex, reqHeaderMap, ['Имя', 'Телефон', 'Email']);
  requests.appendRow(row);
  return requests.getLastRow();
}

/** Симметрично appendRequestRowSafely_, но для «Служебное» (submission_id/все submission_id/Откуда). */
function appendServiceRowSafely_(service, serviceHeaderMap, row) {
  var futureRowIndex = service.getLastRow() + 1;
  protectExternalTextColumns_(service, futureRowIndex, serviceHeaderMap, ['submission_id', 'все submission_id', 'Откуда']);
  service.appendRow(row);
  return service.getLastRow();
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

/** Находит строку «Служебное» по № (design §1/§3.2 — единственная связь между листами). */
function findServiceRowIndexByLeadNo_(service, headerMap, leadNo) {
  var values = service.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (getCell_(values[i], headerMap, '№') === leadNo) return i + 1; // 1-based row
  }
  return -1;
}

/**
 * design fix item3 (Codex review, "reproduced G-0001/G-0002"): раньше Имя/
 * Телефон/Email писались ОТДЕЛЬНЫМИ setValue() при заранее вычисленном
 * rowIndex — сортировка «Заявки» МЕЖДУ этими вызовами приводила к тому, что
 * часть контактных полей попадала в СТАРУЮ физическую строку, а часть — в
 * НОВУЮ (после сортировки там оказывается уже ДРУГАЯ заявка) — контакты
 * "расползались" по двум клиентам. Теперь: строка находится ЗАНОВО по № (design
 * §1), читается и правится В ПАМЯТИ и пишется ОДНИМ setValues() на весь office-
 * диапазон строки — Имя/Телефон/Email физически не могут попасть в РАЗНЫЕ
 * строки одним вызовом API. До и после записи № сверяется: если он не
 * совпадает с ожидаемым (строка успела уехать в узком окне между чтением и
 * записью), запись НЕ производится (проверка до) либо ОТКАТЫВАЕТСЯ к
 * прочитанным значениям (проверка после) — исправление не помечается
 * применённым и будет повторено следующим тиком, чужая заявка не портится.
 */
function applyCorrectionToRow_(requests, reqHeaderMap, service, serviceHeaderMap, plan) {
  var serviceRowIndex = findServiceRowIndexBySubmissionId_(service, serviceHeaderMap, plan.rootId);
  if (serviceRowIndex === -1) return; // строка исчезла между поиском корня и записью — следующий тик подтянет
  var leadNo = service.getRange(serviceRowIndex, serviceHeaderMap['№'] + 1).getValue();

  var rowIndex = findRequestRowIndexByLeadNo_(requests, reqHeaderMap, leadNo);
  if (rowIndex === -1) return; // строка «Заявки» исчезла между поиском и записью — следующий тик подтянет

  var lastCol = OFFICE_HEADERS_.length;
  var rowRange = requests.getRange(rowIndex, 1, 1, lastCol);
  var originalValues = rowRange.getValues()[0];

  // design item3, проверка ДО записи: строка могла уехать между поиском по №
  // и этим чтением — если № в прочитанной строке уже не совпадает, это не
  // наша строка, писать в неё нельзя.
  if (getCell_(originalValues, reqHeaderMap, '№') !== leadNo) {
    Logger.log('applyCorrectionToRow_: строка %s больше не принадлежит %s (уехала до записи) — пропуск, следующий тик найдёт заново', rowIndex, leadNo);
    return;
  }

  var updatedValues = originalValues.slice();
  setCell_(updatedValues, reqHeaderMap, 'Имя', plan.finalContacts.name || '');
  setCell_(updatedValues, reqHeaderMap, 'Телефон', plan.finalContacts.phone || '');
  setCell_(updatedValues, reqHeaderMap, 'Email', plan.finalContacts.email || '');

  protectExternalTextColumns_(requests, rowIndex, reqHeaderMap, ['Имя', 'Телефон', 'Email']); // item1
  rowRange.setValues([updatedValues]); // design item3 — ОДИН вызов на всю строку

  // design item3, проверка ПОСЛЕ записи: узкое окно между getValues() и
  // setValues() этой же строки — если № успел смениться, откатываем запись
  // (не оставляем чужую заявку испорченной) и не помечаем исправление
  // применённым (Служебное «все submission_id» ниже не трогаем).
  var noAfterWrite = requests.getRange(rowIndex, reqHeaderMap['№'] + 1).getValue();
  if (noAfterWrite !== leadNo) {
    Logger.log('applyCorrectionToRow_: № в строке %s изменился на %s (ожидали %s) между чтением и записью — откатываю запись', rowIndex, noAfterWrite, leadNo);
    rowRange.setValues([originalValues]); // компенсирующий откат к исходным значениям чужой строки
    return;
  }

  writeContactCell_(requests, rowIndex, reqHeaderMap, plan.finalContacts.phone); // review находка №12

  setPlainTextValue_(service.getRange(serviceRowIndex, serviceHeaderMap['все submission_id'] + 1), plan.orderedIds.join(',')); // item1
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
// ссылкой — см. Utils.gs buildContactCellPlan_ и README "Не проверено". Rich
// text не подвержен formula re-injection (item1) — движок не парсит содержимое
// RichTextValue как формулу, это чистый форматированный текст.
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
      notifySlaEscalation_(journal, requests, leadNo, rowNumber, config.escalationRecipients, leadData, config.systemAlertRecipients);
    } else if (state.firstAttemptDue) {
      var responsible = getCell_(row, headerMap, 'Ответственный') || config.defaultDutyOfficer;
      notifySlaFirstAttempt_(journal, requests, leadNo, rowNumber, [responsible], leadData, config.systemAlertRecipients);
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
  var result = notifyDigest_(journal, todayKey, config.officeRecipients, digest, config.systemAlertRecipients);
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
// design fix item5: независимый ретрай упавших/зависших уведомлений
// ---------------------------------------------------------------------------

/**
 * Codex review item5: раньше письмо о новой заявке отправлялось ТОЛЬКО в
 * момент создания строки (внутри syncIntakeToRequests_) — если сама отправка
 * не удалась (сеть/квота/невалидный адрес), его больше никто не пытался
 * повторить: watermark уже продвинут, а следующий тик видит эту заявку как
 * "уже существующую" (есть в «Служебное»), а не как toCreate — код, который
 * вызывал notifyNewLead_, больше никогда не выполнится для неё. Теперь —
 * независимый шаг: сканирует «Журнал» на предмет последних записей события
 * new_lead в состоянии НЕ sent, повторяет отправку по ТОЙ ЖЕ политике
 * decideSendAction_ (SendLog.gs — используется автоматически внутри
 * sendNotificationOnce_), с ограничением числа попыток на ключ (иначе
 * зависшая заявка может съесть много писем/квоты) и проверкой суточной квоты
 * MailApp.getRemainingDailyQuota() (иначе ретраи одного зависшего письма
 * тратят квоту, нужную для остальных).
 */
var NOTIFICATION_RETRY_MAX_ATTEMPTS_ = 5;

function retryPendingNotifications_(ss, config, now, reqHeaderMap, serviceHeaderMap) {
  var journal = ss.getSheetByName(SHEET_JOURNAL_);
  var lastRow = journal.getLastRow();
  if (lastRow < 2) return;
  var rows = journal.getRange(2, 1, lastRow - 1, JOURNAL_HEADERS_.length).getValues();

  // Последнее состояние по каждому ключу события new_lead (самая свежая запись,
  // журнал append-only — идём с конца, чтобы не тратить лишний проход).
  var latestByKey = {};
  for (var i = rows.length - 1; i >= 0; i--) {
    var row = rows[i];
    var key = row[7];
    if (!key || key.indexOf(':new_lead:') === -1) continue;
    if (latestByKey[key]) continue; // уже нашли более свежую запись этого ключа
    latestByKey[key] = { leadNo: row[1], state: row[5] };
  }

  var attempts = readNotificationRetryAttempts_();
  var requests = ss.getSheetByName(SHEET_REQUESTS_);
  var service = ss.getSheetByName(SHEET_SERVICE_);
  var quotaOk = typeof MailApp.getRemainingDailyQuota !== 'function' || MailApp.getRemainingDailyQuota() > 0;

  Object.keys(latestByKey).forEach(function (key) {
    var entry = latestByKey[key];
    if (entry.state === SEND_STATES_.SENT) { delete attempts[key]; return; }

    var count = attempts[key] || 0;
    if (count >= NOTIFICATION_RETRY_MAX_ATTEMPTS_ || !quotaOk) return; // item5: ограничение попыток / квота

    var leadRow = findRequestRowIndexByLeadNo_(requests, reqHeaderMap, entry.leadNo);
    if (leadRow === -1) return; // строка исчезла — не на чем ретраить

    var rowValues = requests.getRange(leadRow, 1, 1, OFFICE_HEADERS_.length).getValues()[0];
    var serviceRowIndex = findServiceRowIndexByLeadNo_(service, serviceHeaderMap, entry.leadNo);
    var source = '';
    if (serviceRowIndex !== -1) {
      var svcValues = service.getRange(serviceRowIndex, 1, 1, SERVICE_SHEET_HEADERS_.length).getValues()[0];
      source = getCell_(svcValues, serviceHeaderMap, 'Откуда') || '';
    }
    var receivedAtRaw = getCell_(rowValues, reqHeaderMap, 'Получена');

    var leadData = {
      name: getCell_(rowValues, reqHeaderMap, 'Имя') || '',
      phone: getCell_(rowValues, reqHeaderMap, 'Телефон') || '',
      email: getCell_(rowValues, reqHeaderMap, 'Email') || '',
      source: source,
      receivedAtLabel: receivedAtRaw ? Utilities.formatDate(new Date(receivedAtRaw), config.tz, 'dd.MM.yyyy HH:mm') : ''
    };

    attempts[key] = count + 1;
    notifyNewLead_(journal, requests, entry.leadNo, leadRow, config.officeRecipients, leadData, config.systemAlertRecipients);
  });

  writeNotificationRetryAttempts_(attempts);
}

function readNotificationRetryAttempts_() {
  var raw = PropertiesService.getScriptProperties().getProperty('notificationRetryAttempts');
  return raw ? JSON.parse(raw) : {};
}
function writeNotificationRetryAttempts_(attempts) {
  PropertiesService.getScriptProperties().setProperty('notificationRetryAttempts', JSON.stringify(attempts));
}

// ---------------------------------------------------------------------------
// onEdit — устанавливаемый триггер (§5.2)
// ---------------------------------------------------------------------------

/**
 * Регистрируется через installTriggers() как ScriptApp.newTrigger('handleEdit_')
 * .forSpreadsheet(SPREADSHEET_ID_).onEdit().create() — НЕ простой bound-триггер
 * (design §5.1, находка Codex №1: у bound-скрипта редакторы таблицы = редакторы
 * кода, у installable-триггера identity владельца триггера отделена от таблицы).
 *
 * design fix item7 (Codex review): раньше `if (!lock.tryLock(5000)) return;` —
 * если блокировка занята (параллельный tick() или другая правка) дольше 5с,
 * правка терялась НАВСЕГДА: ни штампов («Первая попытка»), ни записи в
 * «Служебное», ни строки в «Журнале». Теперь: таймаут ставит правку в очередь
 * (Script Properties) на реконсиляцию следующим tick() (см.
 * reconcilePendingEdits_) и журналирует сам факт таймаута.
 */
function handleEdit_(e) {
  var lock = LockService.getScriptLock();
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID_); // нужен и для лога таймаута, и для основного пути
  if (!lock.tryLock(5000)) {
    queuePendingEdit_(e);
    try {
      var journalOnTimeout = ss.getSheetByName(SHEET_JOURNAL_);
      appendJournalRow_(journalOnTimeout, new Date(), '', 'onedit_lock_timeout', 'failed', 'internal',
        'handleEdit_: не удалось получить блокировку за 5с — правка поставлена в очередь на следующий tick()',
        'onedit_lock_timeout:' + Date.now());
    } catch (loggingErr) {
      Logger.log('handleEdit_: не удалось записать таймаут в журнал: %s', loggingErr);
    }
    return;
  }
  try {
    var sheet = e.range.getSheet();
    if (sheet.getName() !== SHEET_REQUESTS_) return;
    if (e.range.getRow() === 1) return; // заголовок

    var headerMap = colByHeader_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
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

/** design item7: правка, потерянная из-за таймаута блокировки — ставится в очередь по номерам строк «Заявки». */
function queuePendingEdit_(e) {
  if (!e || !e.range) return;
  var sheetName = e.range.getSheet().getName();
  if (sheetName !== SHEET_REQUESTS_) return; // не наш лист — нечего реконсилировать
  var pending = readPendingEdits_();
  var startRow = e.range.getRow();
  var numRows = e.range.getNumRows();
  for (var r = startRow; r < startRow + numRows; r++) {
    if (r === 1) continue; // заголовок
    if (pending.indexOf(r) === -1) pending.push(r);
  }
  writePendingEdits_(pending);
}
function readPendingEdits_() {
  var raw = PropertiesService.getScriptProperties().getProperty('pendingEditRows');
  return raw ? JSON.parse(raw) : [];
}
function writePendingEdits_(rows) {
  PropertiesService.getScriptProperties().setProperty('pendingEditRows', JSON.stringify(rows));
}

/**
 * design fix item7: реконсиляция правок, потерянных из-за таймаута блокировки
 * onEdit — по одной попытке на очередь (не бесконечный повтор одной и той же
 * правки, если она снова не проходит: строка могла быть удалена/лист
 * перестроен). Строка, которой уже нет (удалена/за пределами листа),
 * пропускается молча.
 */
function reconcilePendingEdits_(requests, reqHeaderMap, journal, service, serviceHeaderMap, now) {
  var pending = readPendingEdits_();
  if (!pending.length) return;
  var maxRow = requests.getLastRow();
  pending.forEach(function (r) {
    if (r < 2 || r > maxRow) return;
    runStepSafely_('reconcile_edit_row_' + r, function () {
      handleEditRow_(requests, reqHeaderMap, r, journal, service, serviceHeaderMap, now);
    });
  });
  writePendingEdits_([]);
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

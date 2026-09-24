/**
 * Notifications.gs — MailApp через журнал отправок (Журнал sheet).
 * Design: docs/MINI-CRM-DESIGN.md §5.6, §6.
 *
 * GAS-only. НЕ содержит имён/телефонов — только № заявки + ссылка + срочность
 * (design §5.6, приватность §8).
 */

/**
 * Ищет последнюю запись в «Журнале» с данным ключом (снизу вверх — самая
 * свежая попытка отправки этого ключа).
 * @return {{state:string, updated_at:Date, message_id:string}|null}
 */
function findLatestJournalStateForKey_(journalSheet, key) {
  var lastRow = journalSheet.getLastRow();
  if (lastRow < 2) return null;
  var values = journalSheet.getRange(2, 1, lastRow - 1, JOURNAL_HEADERS_.length).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    var row = values[i];
    if (row[7] === key) { // колонка 'Ключ'
      return { state: row[5], updated_at: row[0], message_id: row[6] };
    }
  }
  return null;
}

/**
 * P1 A1: leadNo/details/key здесь нередко несут внешние данные (submission_id
 * из «Входящих» — trackPendingCorrection_/trackPendingCycle_ пишут сюда
 * leafId и цепочки id как есть) — sheetSafeValue_() (Utils.gs) защищает от
 * formula re-injection на «Журнал» так же, как на «Заявки»/«Служебное».
 */
function appendJournalRow_(journalSheet, time, leadNo, event, state, channel, details, key) {
  journalSheet.appendRow([time, leadNo, event, details || '', channel, state, '', key].map(sheetSafeValue_));
}

/**
 * Отправляет письмо один раз на ключ, с журналированием (§5.6). Пропускает,
 * если по decideSendAction_ отправлять не нужно (уже sent/pending, либо unknown
 * моложе окна ретрая).
 * @param {string} [htmlBody] задача 0.4.0 (Task B): брендированный HTML —
 *   MailApp.sendEmail({htmlBody}) добавляет HTML-версию, body остаётся
 *   plain-text альтернативой (обязательна для клиентов без HTML — сама задача
 *   требует "plain-text alternative body"). Не передан — письмо остаётся
 *   чистым plain-text, как раньше (дайджест/сводка/системные тревоги).
 * @param {string[]} [systemAlertRecipients] design fix item2 (Codex review):
 *   если recipients пуст (например, владелец явно очистил office_recipients
 *   в «Настройках» — см. Config.gs parseSettingsRows_), письмо не уходит
 *   ВООБЩЕ никому и офис молча перестаёт узнавать о заявках. Алертим системного
 *   получателя ОДИН раз на ключ события (не на каждый тик — reuse того же
 *   send-log механизма под отдельным ключом 'empty_recipients:<key>').
 */
function sendNotificationOnce_(journalSheet, key, leadNo, event, channel, recipients, subject, body, htmlBody, systemAlertRecipients) {
  var now = new Date();
  var existing = findLatestJournalStateForKey_(journalSheet, key);
  var action = decideSendAction_(existing, now);
  if (action === 'skip') return { sent: false, reason: 'skip' };
  if (!recipients || !recipients.length) {
    Logger.log('sendNotificationOnce_: нет получателей для события "%s" (ключ %s)', event, key);
    if (systemAlertRecipients && systemAlertRecipients.length) {
      sendNotificationOnce_(journalSheet, 'empty_recipients:' + key, '', 'empty_recipients', 'email',
        systemAlertRecipients, 'CRM: получатели события пусты — ' + event,
        'Список получателей для события "' + event + '" (ключ ' + key + ') пуст — письмо НЕ отправлено. ' +
        'Проверьте «Настройки» (значение могло быть очищено намеренно).');
    }
    return { sent: false, reason: 'no_recipients' };
  }

  appendJournalRow_(journalSheet, now, leadNo, event, SEND_STATES_.PENDING, channel, '', key);
  try {
    var message = { to: recipients.join(','), subject: subject, body: body };
    if (htmlBody) message.htmlBody = htmlBody;
    MailApp.sendEmail(message);
    appendJournalRow_(journalSheet, new Date(), leadNo, event, SEND_STATES_.SENT, channel, '', key);
    return { sent: true };
  } catch (err) {
    // Не проверено вживую, какие тексты ошибок реально возвращает MailApp при
    // квотах/невалидных адресах — классификация ниже эвристическая (README).
    var state = classifySendError_(err);
    appendJournalRow_(journalSheet, new Date(), leadNo, event, state, channel, String(err), key);
    return { sent: false, reason: state, error: String(err) };
  }
}

function classifySendError_(err) {
  var msg = String(err && err.message ? err.message : err).toLowerCase();
  if (msg.indexOf('invalid email') !== -1 || msg.indexOf('recipient') !== -1) {
    return SEND_STATES_.FAILED;
  }
  return SEND_STATES_.UNKNOWN;
}

/**
 * Ссылка на строку заявки в «Заявки» по её № (используется в письмах и «Сегодня»).
 * Задача 0.4.0 (Task B): gid листа читается ЖИВЫМ вызовом sheet.getSheetId() в
 * момент отправки — не захардкожен как 0, диапазон — вся строка office-полей
 * (A..<последняя колонка OFFICE_HEADERS_>), не одна ячейка A.
 * @param {Sheet} requestsSheet лист «Заявки» (для getSheetId())
 * @param {number} rowNumber 1-based номер строки
 */
function buildRequestRowLink_(requestsSheet, rowNumber) {
  var lastColLetter = columnLetter_(OFFICE_HEADERS_.length);
  var range = 'A' + rowNumber + ':' + lastColLetter + rowNumber;
  return 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID_ + '/edit#gid=' + requestsSheet.getSheetId() + '&range=' + range;
}

/**
 * Задача 0.4.0 (Task B): полноценное брендированное письмо (EmailTemplates.gs)
 * вместо трёх строк текста — № и время получения (Израиль), Имя, Телефон
 * (кнопки «Позвонить»/WhatsApp), Email, Откуда, кнопка «Открыть заявку».
 * @param {Sheet} requestsSheet лист «Заявки» — для ссылки на строку
 * @param {{name, phone, email, source, receivedAtLabel}} leadData
 * @param {string[]} [systemAlertRecipients] design fix item2 — алерт на пустых получателей
 */
function notifyNewLead_(journalSheet, requestsSheet, leadNo, rowNumber, recipients, leadData, systemAlertRecipients) {
  if (!NEW_LEAD_EMAIL_ENABLED_) return { sent: false, reason: 'skip' }; // письмо шлёт Albato (Config.gs)
  leadData = leadData || {};
  var email = renderNewLeadEmail_({
    leadNo: leadNo,
    receivedAtLabel: leadData.receivedAtLabel,
    name: leadData.name,
    phone: leadData.phone,
    email: leadData.email,
    source: leadData.source,
    sheetUrl: buildRequestRowLink_(requestsSheet, rowNumber)
  });
  return sendNotificationOnce_(journalSheet, makeSendKey_(leadNo, 'new_lead', '1'), leadNo, 'new_lead', 'email',
    recipients, email.subject, email.text, email.html, systemAlertRecipients);
}

/** @param {Sheet} requestsSheet лист «Заявки» @param {{name, phone}} leadData */
function notifySlaFirstAttempt_(journalSheet, requestsSheet, leadNo, rowNumber, recipients, leadData, systemAlertRecipients) {
  leadData = leadData || {};
  var email = renderSlaFirstAttemptEmail_({
    leadNo: leadNo,
    name: leadData.name,
    phone: leadData.phone,
    sheetUrl: buildRequestRowLink_(requestsSheet, rowNumber)
  });
  return sendNotificationOnce_(journalSheet, makeSendKey_(leadNo, 'sla_first_attempt', '1'), leadNo, 'sla_first_attempt', 'email',
    recipients, email.subject, email.text, email.html, systemAlertRecipients);
}

/** @param {Sheet} requestsSheet лист «Заявки» @param {{name, phone}} leadData */
function notifySlaEscalation_(journalSheet, requestsSheet, leadNo, rowNumber, recipients, leadData, systemAlertRecipients) {
  leadData = leadData || {};
  var email = renderSlaEscalationEmail_({
    leadNo: leadNo,
    name: leadData.name,
    phone: leadData.phone,
    sheetUrl: buildRequestRowLink_(requestsSheet, rowNumber)
  });
  return sendNotificationOnce_(journalSheet, makeSendKey_(leadNo, 'sla_escalation', '1'), leadNo, 'sla_escalation', 'email',
    recipients, email.subject, email.text, email.html, systemAlertRecipients);
}

function notifyDigest_(journalSheet, dayKey, recipients, digest, systemAlertRecipients) {
  return sendNotificationOnce_(journalSheet, 'digest:' + dayKey, 'DIGEST', 'digest', 'email',
    recipients, digest.subject, digest.body, undefined, systemAlertRecipients);
}

function notifyWeeklySummary_(journalSheet, weekKey, recipient, body) {
  return sendNotificationOnce_(journalSheet, 'summary:' + weekKey, 'SUMMARY', 'summary', 'email',
    [recipient], 'CRM: недельная сводка', body);
}

function notifySystemAlert_(event, details) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID_);
    var journal = ss.getSheetByName(SHEET_JOURNAL_);
    var config = loadConfig_();
    var key = 'system_alert:' + event + ':' + Utilities.formatDate(new Date(), config.tz, 'yyyy-MM-dd');
    sendNotificationOnce_(journal, key, 'SYSTEM', event, 'email', config.systemAlertRecipients,
      'CRM: системная тревога — ' + event, details);
  } catch (err) {
    Logger.log('notifySystemAlert_: не удалось отправить тревогу: %s', err);
  }
}

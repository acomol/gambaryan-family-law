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

function appendJournalRow_(journalSheet, time, leadNo, event, state, channel, details, key) {
  journalSheet.appendRow([time, leadNo, event, details || '', channel, state, '', key]);
}

/**
 * Отправляет письмо один раз на ключ, с журналированием (§5.6). Пропускает,
 * если по decideSendAction_ отправлять не нужно (уже sent/pending, либо unknown
 * моложе окна ретрая).
 */
function sendNotificationOnce_(journalSheet, key, leadNo, event, channel, recipients, subject, body) {
  var now = new Date();
  var existing = findLatestJournalStateForKey_(journalSheet, key);
  var action = decideSendAction_(existing, now);
  if (action === 'skip') return { sent: false, reason: 'skip' };
  if (!recipients || !recipients.length) {
    Logger.log('sendNotificationOnce_: нет получателей для события "%s" (ключ %s)', event, key);
    return { sent: false, reason: 'no_recipients' };
  }

  appendJournalRow_(journalSheet, now, leadNo, event, SEND_STATES_.PENDING, channel, '', key);
  try {
    MailApp.sendEmail({ to: recipients.join(','), subject: subject, body: body });
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

/** Ссылка на строку заявки в «Заявки» по её № (используется в письмах и «Сегодня»). */
function buildRequestRowLink_(rowNumber) {
  return 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID_ + '/edit#gid=0&range=A' + rowNumber;
}

function notifyNewLead_(journalSheet, leadNo, rowNumber, recipients) {
  return sendNotificationOnce_(journalSheet, makeSendKey_(leadNo, 'new_lead', '1'), leadNo, 'new_lead', 'email',
    recipients, 'Новая заявка ' + leadNo,
    'Заявка ' + leadNo + '\n' + buildRequestRowLink_(rowNumber) + '\nСрочность: новая заявка');
}

function notifySlaFirstAttempt_(journalSheet, leadNo, rowNumber, recipients) {
  return sendNotificationOnce_(journalSheet, makeSendKey_(leadNo, 'sla_first_attempt', '1'), leadNo, 'sla_first_attempt', 'email',
    recipients, 'SLA: нет первой попытки — ' + leadNo,
    'Заявка ' + leadNo + '\n' + buildRequestRowLink_(rowNumber) + '\nСрочность: 30 рабочих минут без первой попытки');
}

function notifySlaEscalation_(journalSheet, leadNo, rowNumber, recipients) {
  return sendNotificationOnce_(journalSheet, makeSendKey_(leadNo, 'sla_escalation', '1'), leadNo, 'sla_escalation', 'email',
    recipients, 'Эскалация: нет первой попытки 2ч — ' + leadNo,
    'Заявка ' + leadNo + '\n' + buildRequestRowLink_(rowNumber) + '\nСрочность: эскалация владельцу');
}

function notifyDigest_(journalSheet, dayKey, recipients, digest) {
  return sendNotificationOnce_(journalSheet, 'digest:' + dayKey, 'DIGEST', 'digest', 'email',
    recipients, digest.subject, digest.body);
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

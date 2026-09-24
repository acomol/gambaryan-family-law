/**
 * SendLog.gs — журнал отправок вместо обещания "без дублей".
 * Design: docs/MINI-CRM-DESIGN.md §5.6 ("честная гарантия: обычно одно сообщение;
 * при сбое связи возможен повтор").
 *
 * Ключ записи: "№:событие:версия", например "G-0012:consult:2026-10-01T10:00".
 * Состояния: pending -> sent | failed | unknown.
 */

var SEND_STATES_ = { PENDING: 'pending', SENT: 'sent', FAILED: 'failed', UNKNOWN: 'unknown' };

/**
 * Design review находка №7: PENDING без таймаута висит вечно, если тик умер
 * сразу после появления pending-записи (например, между appendJournalRow_ pending
 * и MailApp.sendEmail — квота/таймаут скрипта) — уведомление молчит навсегда.
 * PENDING старше этого порога считается протухшим и обрабатывается как UNKNOWN
 * (следует той же политике ретрая retryAfterMs).
 */
var PENDING_TIMEOUT_MS_ = 10 * 60000;

/**
 * @param {string} leadNo
 * @param {string} event
 * @param {string} version
 */
function makeSendKey_(leadNo, event, version) {
  return leadNo + ':' + event + ':' + version;
}

/**
 * Решает, нужно ли (пере)отправлять сообщение по ключу, учитывая текущую запись
 * журнала. 'unknown' — состояние после сбоя, для которого неизвестно, дошло ли
 * сообщение; повтор — не раньше чем через retryAfterMs после последнего обновления
 * записи (защита от повторов внутри одного и того же тика/цикла).
 *
 * @param {{state:string, updated_at:(Date|string)}|null} existingEntry
 * @param {Date} now
 * @param {number} [retryAfterMs] default 15 минут
 * @param {number} [pendingTimeoutMs] default 10 минут (находка №7)
 * @return {'send'|'skip'}
 */
function decideSendAction_(existingEntry, now, retryAfterMs, pendingTimeoutMs) {
  retryAfterMs = retryAfterMs === undefined ? 15 * 60000 : retryAfterMs;
  pendingTimeoutMs = pendingTimeoutMs === undefined ? PENDING_TIMEOUT_MS_ : pendingTimeoutMs;
  if (!existingEntry) return 'send';
  switch (existingEntry.state) {
    case SEND_STATES_.SENT:
      return 'skip';
    case SEND_STATES_.FAILED:
      return 'send';
    case SEND_STATES_.PENDING:
      var pendingElapsed = now.getTime() - new Date(existingEntry.updated_at).getTime();
      if (pendingElapsed < pendingTimeoutMs) return 'skip'; // тик мог быть ещё жив — ждём
      // старше таймаута — тик, скорее всего, умер между pending и sent/failed;
      // считаем запись "unknown" и следуем той же политике ретрая (находка №7)
      return pendingElapsed >= retryAfterMs ? 'send' : 'skip';
    case SEND_STATES_.UNKNOWN:
      var elapsed = now.getTime() - new Date(existingEntry.updated_at).getTime();
      return elapsed >= retryAfterMs ? 'send' : 'skip';
    default:
      return 'send';
  }
}

/**
 * Новая запись журнала в состоянии pending перед попыткой отправки.
 */
function makePendingEntry_(now, channel) {
  return { state: SEND_STATES_.PENDING, updated_at: now, channel: channel || 'email' };
}

/**
 * Переход состояния после попытки отправки.
 * @param {'sent'|'failed'|'unknown'} result
 * @param {Date} now
 * @param {string} [messageId]
 */
function transitionAfterSend_(result, now, messageId) {
  if ([SEND_STATES_.SENT, SEND_STATES_.FAILED, SEND_STATES_.UNKNOWN].indexOf(result) === -1) {
    throw new Error('transitionAfterSend_: неизвестный результат "' + result + '"');
  }
  return { state: result, updated_at: now, message_id: messageId || null };
}

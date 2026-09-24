/**
 * Sla.gs — сроки по рабочему календарю. Design: docs/MINI-CRM-DESIGN.md §5.5.
 * Зависит только от BusinessCalendar.gs (чистые функции).
 */

/**
 * Дедлайны по заявке от момента получения.
 * @param {Date} receivedAt
 * @param {Object} calendar
 * @param {{slaFirstAttemptMinutes:number, slaEscalationMinutes:number}} thresholds
 */
function computeSlaDeadlines_(receivedAt, calendar, thresholds) {
  return {
    firstAttemptDeadline: addBusinessMinutesFrom_(receivedAt, thresholds.slaFirstAttemptMinutes, calendar),
    escalationDeadline: addBusinessMinutesFrom_(receivedAt, thresholds.slaEscalationMinutes, calendar)
  };
}

/**
 * Какие SLA-события наступили к моменту now для заявки без "Первой попытки".
 * Design §5.5: 30 раб.мин без первой попытки -> ответственному; 2 раб.часа -> владельцу (эскалация).
 * @param {{receivedAt: Date, firstAttemptAt: (Date|null)}} lead
 * @param {Date} now
 * @return {{firstAttemptDue: boolean, escalationDue: boolean, businessMinutesElapsed: number}}
 */
function evaluateSlaState_(lead, now, calendar, thresholds) {
  if (lead.firstAttemptAt) {
    return { firstAttemptDue: false, escalationDue: false, businessMinutesElapsed: null };
  }
  var elapsed = businessMinutesBetween(lead.receivedAt, now, calendar);
  return {
    firstAttemptDue: elapsed >= thresholds.slaFirstAttemptMinutes,
    escalationDue: elapsed >= thresholds.slaEscalationMinutes,
    businessMinutesElapsed: elapsed
  };
}

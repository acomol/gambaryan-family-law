/**
 * Digest.gs — состав утреннего дайджеста и ключ дня для идемпотентности.
 * Design: docs/MINI-CRM-DESIGN.md §5.6 ("дайджест приходит каждый рабочий день,
 * даже пустой — его отсутствие = тревога").
 */

/**
 * Ключ дня для дайджеста — календарная дата в рабочем поясе.
 */
function digestDayKey_(date, tz) {
  return dateKeyInTz_(date, tz);
}

/**
 * true, если на сегодняшний ключ дня дайджест ещё не отправлен.
 * Пустое содержимое НЕ влияет на это решение — composeDigest_ всегда возвращает
 * отправляемое письмо, даже когда все счётчики равны нулю.
 */
function shouldSendDigestToday_(lastSentDayKey, todayDayKey) {
  return lastSentDayKey !== todayDayKey;
}

/**
 * Собирает содержимое дайджеста из счётчиков. Всегда возвращает непустые
 * subject/body — "пусто" видно из counts/isEmpty, а не из отсутствия письма.
 * @param {{newCount, waitingFirstCallCount, consultationsTodayCount, overdueCount}} stats
 */
function composeDigest_(stats) {
  var s = stats || {};
  var counts = {
    newCount: s.newCount || 0,
    waitingFirstCallCount: s.waitingFirstCallCount || 0,
    consultationsTodayCount: s.consultationsTodayCount || 0,
    overdueCount: s.overdueCount || 0
  };
  var total = counts.newCount + counts.waitingFirstCallCount + counts.consultationsTodayCount + counts.overdueCount;
  var lines = [
    'Новых: ' + counts.newCount,
    'Ждут первого звонка: ' + counts.waitingFirstCallCount,
    'Консультации сегодня: ' + counts.consultationsTodayCount,
    'Просрочено: ' + counts.overdueCount
  ];
  return {
    counts: counts,
    isEmpty: total === 0,
    subject: total === 0 ? 'CRM: дайджест — новых заявок нет' : 'CRM: дайджест — ' + total + ' к вниманию',
    body: lines.join('\n')
  };
}

// Маленький мок Utilities.formatDate() — единственная зависимость чистой логики
// (BusinessCalendar.gs/Code.gs) от Apps Script. Собирает только те паттерны,
// которые реально используются в src/*.gs (getLocalParts_, notifyNewLead_
// receivedAtLabel — задача 0.4.0 Task B). Намеренно маленький: если исходники
// начнут звать formatDate с другим паттерном — мок должен упасть громко, а не
// молча вернуть мусор.
const ISO_PATTERN = "yyyy-MM-dd'T'HH:mm:ss";
const RU_DATETIME_PATTERN = 'dd.MM.yyyy HH:mm';

export function formatDate(date, timeZone, pattern) {
  if (pattern === ISO_PATTERN) {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
    const hour = parts.hour === '24' ? '00' : parts.hour;
    return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}`;
  }
  if (pattern === RU_DATETIME_PATTERN) {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
    const hour = parts.hour === '24' ? '00' : parts.hour;
    return `${parts.day}.${parts.month}.${parts.year} ${hour}:${parts.minute}`;
  }
  throw new Error(
    'mock Utilities.formatDate: неподдерживаемый паттерн "' + pattern + '" ' +
    '(мок сознательно маленький — поддерживает только "' + ISO_PATTERN + '" и "' + RU_DATETIME_PATTERN + '")'
  );
}

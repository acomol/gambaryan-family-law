// Маленький мок Utilities.formatDate() — единственная зависимость чистой логики
// (BusinessCalendar.gs) от Apps Script. Собирает только тот один паттерн, который
// реально используется в src/BusinessCalendar.gs (getLocalParts_). Намеренно
// маленький: если исходники начнут звать formatDate с другим паттерном — мок
// должен упасть громко, а не молча вернуть мусор.
const SUPPORTED_PATTERN = "yyyy-MM-dd'T'HH:mm:ss";

export function formatDate(date, timeZone, pattern) {
  if (pattern !== SUPPORTED_PATTERN) {
    throw new Error(
      'mock Utilities.formatDate: неподдерживаемый паттерн "' + pattern + '" ' +
      '(мок сознательно маленький — поддерживает только "' + SUPPORTED_PATTERN + '")'
    );
  }
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

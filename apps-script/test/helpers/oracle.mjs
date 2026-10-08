// Независимый "эталон истины" для business-minutes: перебор по минутам через
// Intl напрямую (НЕ через код из src/), чтобы проверка не совпадала по
// построению с реализацией под тестом (иначе тест доказывает только "код
// согласен сам с собой").
//
// Используется только для минуто-выровненных границ (без секунд) — на них
// поминутный перебор даёт точное совпадение с реализацией на миллисекундах.

function localPartsIntl_(date, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hour = parts.hour === '24' ? 0 : parseInt(parts.hour, 10);
  return {
    dow: weekdayMap[parts.weekday],
    hour,
    minute: parseInt(parts.minute, 10),
    dateKey: `${parts.year}-${parts.month}-${parts.day}`
  };
}

/**
 * @param {Date} startDate включительно (должен быть выровнен по минуте)
 * @param {Date} endDate исключительно (должен быть выровнен по минуте)
 * @param {{tz:string, businessDays:number[], businessStart:string, businessEnd:string, holidays?:string[]}} calendar
 */
export function bruteForceBusinessMinutes(startDate, endDate, calendar) {
  const [sh, sm] = calendar.businessStart.split(':').map(Number);
  const [eh, em] = calendar.businessEnd.split(':').map(Number);
  const startMinuteOfDay = sh * 60 + sm;
  const endMinuteOfDay = eh * 60 + em;
  const holidays = new Set(calendar.holidays || []);

  let count = 0;
  for (let t = startDate.getTime(); t < endDate.getTime(); t += 60000) {
    const { dow, hour, minute, dateKey } = localPartsIntl_(new Date(t), calendar.tz);
    if (!calendar.businessDays.includes(dow)) continue;
    if (holidays.has(dateKey)) continue;
    const minuteOfDay = hour * 60 + minute;
    if (minuteOfDay >= startMinuteOfDay && minuteOfDay < endMinuteOfDay) count++;
  }
  return count;
}

/**
 * Находит переходы летнего/зимнего времени в году year для пояса tz, семплируя
 * по UTC-полудню каждого дня (переход в Израиле — ночью, вне рабочих часов,
 * поэтому полуденная выборка не пропустит день перехода).
 */
export function findDstTransitions(year, tz) {
  function offsetMinutesAt(date) {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const p = Object.fromEntries(dtf.formatToParts(date).map((x) => [x.type, x.value]));
    const hour = p.hour === '24' ? 0 : parseInt(p.hour, 10);
    const asIfUtc = Date.UTC(+p.year, +p.month - 1, +p.day, hour, +p.minute, +p.second);
    return (asIfUtc - date.getTime()) / 60000;
  }

  const transitions = [];
  const start = Date.UTC(year, 0, 1, 12, 0, 0);
  let prevOffset = offsetMinutesAt(new Date(start));
  for (let day = 1; day < 366; day++) {
    const t = start + day * 86400000;
    const d = new Date(t);
    if (d.getUTCFullYear() !== year) break;
    const off = offsetMinutesAt(d);
    if (off !== prevOffset) {
      transitions.push({ dateKeyUtcNoon: isoDateKey_(d), fromOffsetMin: prevOffset, toOffsetMin: off });
    }
    prevOffset = off;
  }
  return transitions;
}

function isoDateKey_(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * BusinessCalendar.gs — рабочий календарь вс-чт 09:00-18:00 Asia/Jerusalem,
 * праздники, сокращённые дни, переход на летнее время.
 * Design: docs/MINI-CRM-DESIGN.md §5.5.
 *
 * Единственная зависимость от Apps Script — Utilities.formatDate() (стабильный,
 * документированный API: https://developers.google.com/apps-script/reference/utilities/utilities#formatDate).
 * В Node он подменяется маленьким моком на Intl.DateTimeFormat (см. test/helpers/load-gas.mjs).
 * Всё остальное — чистая календарная арифметика на Date.UTC, не зависящая от часового пояса рантайма.
 *
 * calendar shape (см. Config.gs normalizeSettings_):
 *   { tz: 'Asia/Jerusalem', businessDays: [0,1,2,3,4], businessStart: '09:00',
 *     businessEnd: '18:00', holidays: ['2026-10-01', ...], shortDays: {'2026-04-01':'13:00'} }
 */

/**
 * Возвращает {y,mo,d,h,mi,s} — локальное время в tz для UTC-момента date.
 * @param {Date} date
 * @param {string} tz
 */
function getLocalParts_(date, tz) {
  var formatted = Utilities.formatDate(date, tz, "yyyy-MM-dd'T'HH:mm:ss");
  var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(formatted);
  if (!m) throw new Error('getLocalParts_: не удалось разобрать "' + formatted + '"');
  return {
    y: parseInt(m[1], 10),
    mo: parseInt(m[2], 10),
    d: parseInt(m[3], 10),
    h: parseInt(m[4], 10),
    mi: parseInt(m[5], 10),
    s: parseInt(m[6], 10)
  };
}

/**
 * Календарная дата 'yyyy-MM-dd' для UTC-момента date в поясе tz.
 */
function dateKeyInTz_(date, tz) {
  var p = getLocalParts_(date, tz);
  return p.y + '-' + pad2_(p.mo) + '-' + pad2_(p.d);
}

/**
 * День недели по календарной дате (0=вс..6=сб). Не зависит от часового пояса —
 * это чистая математика проленптического григорианского календаря
 * (см. MDN Date.UTC / getUTCDay): день недели даты '2026-03-27' одинаков
 * независимо от того, в каком поясе её "читают".
 */
function dowOfDate_(y, mo, d) {
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}

/**
 * Следующая календарная дата 'yyyy-MM-dd' (чистая арифметика, без часовых поясов).
 */
function nextDateKey_(key) {
  var p = key.split('-').map(Number);
  var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.getUTCFullYear() + '-' + pad2_(dt.getUTCMonth() + 1) + '-' + pad2_(dt.getUTCDate());
}

/**
 * Переводит "стенное" локальное время (y,mo,d,h,mi,s в tz) в UTC-момент (Date).
 * Приём двойного форматирования: угадываем как UTC, смотрим какое стенное время
 * получилось в tz, поправляем на разницу. Двух итераций достаточно, т.к. смещение
 * пояса не меняется внутри одной минуты (кроме самого момента перехода, который
 * не используется как открытие/закрытие рабочего дня в этом календаре — переход
 * в Израиле происходит ночью, вне рабочих часов вс-чт 09:00-18:00).
 */
function zonedTimeToUtc_(y, mo, d, h, mi, s, tz) {
  s = s || 0;
  var wantMs = Date.UTC(y, mo - 1, d, h, mi, s);
  var guessMs = wantMs;
  for (var i = 0; i < 3; i++) {
    var local = getLocalParts_(new Date(guessMs), tz);
    var gotMs = Date.UTC(local.y, local.mo - 1, local.d, local.h, local.mi, local.s);
    var diff = wantMs - gotMs;
    if (diff === 0) break;
    guessMs += diff;
  }
  return new Date(guessMs);
}

/**
 * Рабочее окно [open, close) для календарной даты dateKey, или null если это
 * выходной/праздник. Учитывает сокращённые дни (calendar.shortDays[dateKey]).
 * @return {{open: Date, close: Date}|null}
 */
function getDayWindow_(dateKey, calendar) {
  var p = dateKey.split('-').map(Number);
  var y = p[0], mo = p[1], d = p[2];
  if ((calendar.holidays || []).indexOf(dateKey) !== -1) return null;
  var dow = dowOfDate_(y, mo, d);
  if ((calendar.businessDays || []).indexOf(dow) === -1) return null;

  var endTime = calendar.businessEnd;
  if (calendar.shortDays && calendar.shortDays[dateKey]) {
    endTime = calendar.shortDays[dateKey];
  }
  var startParts = calendar.businessStart.split(':').map(Number);
  var endParts = endTime.split(':').map(Number);

  var open = zonedTimeToUtc_(y, mo, d, startParts[0], startParts[1], 0, calendar.tz);
  var close = zonedTimeToUtc_(y, mo, d, endParts[0], endParts[1], 0, calendar.tz);
  return { open: open, close: close };
}

/**
 * Сколько рабочих минут прошло между startDate и endDate (>=0).
 * Design §5.5, пример: чт 17:50 -> вс 09:20 = 30 рабочих минут.
 */
function businessMinutesBetween(startDate, endDate, calendar) {
  if (!(endDate > startDate)) return 0;
  var totalMs = 0;
  var cursorKey = dateKeyInTz_(startDate, calendar.tz);
  var lastKey = dateKeyInTz_(endDate, calendar.tz);
  var guard = 0;
  while (true) {
    guard++;
    if (guard > 3660) throw new Error('businessMinutesBetween: превышен лимit дней (guard)');
    var win = getDayWindow_(cursorKey, calendar);
    if (win) {
      var segStart = win.open < startDate ? startDate : win.open;
      var segEnd = win.close > endDate ? endDate : win.close;
      if (segEnd > segStart) totalMs += (segEnd.getTime() - segStart.getTime());
    }
    if (cursorKey === lastKey) break;
    cursorKey = nextDateKey_(cursorKey);
  }
  return Math.round(totalMs / 60000);
}

/**
 * Момент, когда с startDate истечёт minutes рабочих минут (используется для
 * расчёта дедлайнов SLA — "к какому моменту наступает 30 рабочих минут").
 */
function addBusinessMinutesFrom_(startDate, minutes, calendar) {
  var remainingMs = minutes * 60000;
  var cursorKey = dateKeyInTz_(startDate, calendar.tz);
  var isFirstDay = true;
  var guard = 0;
  while (true) {
    guard++;
    if (guard > 3660) throw new Error('addBusinessMinutesFrom_: превышен лимит дней (guard)');
    var win = getDayWindow_(cursorKey, calendar);
    if (win) {
      var afterClose = isFirstDay && startDate >= win.close;
      if (!afterClose) {
        var segStart = (isFirstDay && startDate > win.open) ? startDate : win.open;
        var available = win.close.getTime() - segStart.getTime();
        if (available >= remainingMs) {
          return new Date(segStart.getTime() + remainingMs);
        }
        remainingMs -= available;
      }
    }
    isFirstDay = false;
    cursorKey = nextDateKey_(cursorKey);
  }
}

/**
 * true, если date попадает в рабочее окно своего календарного дня.
 */
function isWithinBusinessHours_(date, calendar) {
  var win = getDayWindow_(dateKeyInTz_(date, calendar.tz), calendar);
  return !!win && date >= win.open && date < win.close;
}

/**
 * Новая заявка вне рабочего времени -> в утренний дайджест, а не отдельным письмом.
 * Design §5.5 / §12.1 ("вне рабочего времени письма о новых заявках не шлются
 * по одной — они идут в утренний дайджест"); §12 строка 7 (review находка №13):
 * дежурный на выходные/ночь — настройка «Настроек», по умолчанию ВЫКЛЮЧЕНА
 * (владелец: «пока нет»). Если включена и указан email — вне рабочего времени
 * уходит немедленное уведомление дежурному вместо ожидания дайджеста; системные
 * тревоги (notifySystemAlert_) в это решение не входят — они не проверяют
 * рабочее время нигде в коде и уходят всегда немедленно (design §12 строка 7).
 * @param {Date} receivedAt
 * @param {Object} calendar
 * @param {{enabled:boolean, email:string}} [weekendDuty] default выключено
 * @return {'immediate'|'immediate_duty'|'digest'}
 */
function decideNewLeadNotification_(receivedAt, calendar, weekendDuty) {
  if (isWithinBusinessHours_(receivedAt, calendar)) return 'immediate';
  var duty = weekendDuty || { enabled: false, email: '' };
  if (duty.enabled && duty.email) return 'immediate_duty';
  return 'digest';
}

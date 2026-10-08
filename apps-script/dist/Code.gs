// GENERATED FILE — DO NOT EDIT.
//
// Built by scripts/bundle-apps-script.mjs from apps-script/src/*.gs
// (fixed order — see FILE_ORDER in that script).
// Source commit: 8cb974633f6ff38a267ae024f2a5d6de1879caa3
// Generated: 2026-09-23
//
// To change behavior, edit the corresponding file under apps-script/src/
// and rerun: node scripts/bundle-apps-script.mjs

// ---- Utils.gs ----
/**
 * Utils.gs — небольшие чистые хелперы без зависимости от GAS-сервисов.
 * Design: docs/MINI-CRM-DESIGN.md §3 ("скрипт ищет колонки по заголовку").
 */

/**
 * Строит карту "заголовок -> индекс колонки (0-based)" из строки заголовков.
 * @param {Array} headerRow
 * @return {Object<string, number>}
 */
function colByHeader_(headerRow) {
  var map = {};
  (headerRow || []).forEach(function (h, i) {
    var key = h === undefined || h === null ? '' : String(h).trim();
    if (key) map[key] = i;
  });
  return map;
}

/**
 * Читает значение из строки данных по имени заголовка.
 * @param {Array} row
 * @param {Object<string, number>} headerMap
 * @param {string} headerName
 * @return {*}
 */
function getCell_(row, headerMap, headerName) {
  var idx = headerMap[headerName];
  return idx === undefined ? undefined : row[idx];
}

/**
 * Пишет значение в строку данных по имени заголовка (мутирует row, для тестов
 * и для сборки строк перед реальной записью в лист).
 * @param {Array} row
 * @param {Object<string, number>} headerMap
 * @param {string} headerName
 * @param {*} value
 */
function setCell_(row, headerMap, headerName, value) {
  var idx = headerMap[headerName];
  if (idx === undefined) {
    throw new Error('setCell_: неизвестный заголовок "' + headerName + '"');
  }
  row[idx] = value;
  return row;
}

function pad2_(n) {
  n = Math.floor(n);
  return (n < 10 ? '0' : '') + n;
}

/**
 * Ссылки «Позвонить» / WhatsApp по телефону. Design §3.1 ("«Позвонить» (tel:) и
 * WhatsApp; пересчитывается при каждом изменении телефона"). Чистая нормализация
 * номера — только цифры и ведущий "+" для tel:, только цифры для wa.me
 * (https://faq.whatsapp.com/general/chats/how-to-use-click-to-chat).
 */
function buildContactLinks_(phone) {
  var raw = String(phone === undefined || phone === null ? '' : phone);
  var withPlus = raw.replace(/[^\d+]/g, '');
  var digitsOnly = withPlus.replace(/^\+/, '');
  var waNumber = normalizeWhatsAppNumber_(raw);
  return {
    digitsOnly: digitsOnly,
    telHref: digitsOnly ? 'tel:' + withPlus : '',
    waHref: waNumber ? 'https://wa.me/' + waNumber : ''
  };
}

/**
 * Номер для wa.me в международном формате. Официально (WhatsApp Help Center,
 * «How to use click to chat», прочитано 2026-09-24): "Use https://wa.me/<number>
 * where the <number> is a full phone number in international format. Omit any
 * zeroes, brackets, or dashes". Раньше «0501112233» давал wa.me/0501112233 —
 * WhatsApp такой номер не открывает (живой прогон 2026-09-23).
 * Израиль: ведущий 0 -> 972; городские (972 + не 5) -> null (без кнопки).
 * @return {string|null} только цифры, 10–15 знаков, или null
 */
function normalizeWhatsAppNumber_(raw) {
  var s = String(raw === undefined || raw === null ? '' : raw).replace(/[^\d+]/g, '');
  if (s.charAt(0) === '+') s = s.slice(1);
  else if (s.indexOf('00') === 0) s = s.slice(2);
  else if (s.charAt(0) === '0') s = '972' + s.slice(1);
  else if (/^5\d{8}$/.test(s)) s = '972' + s;
  s = s.replace(/\D/g, '');
  if (!/^\d{10,15}$/.test(s)) return null;
  if (s.indexOf('972') === 0 && s.charAt(3) !== '5') return null;
  return s;
}

/**
 * P1 A1 (root-cause fix, review "formula injection"): единая защита от
 * formula/CSV injection для ЛЮБОЙ внешней строки, которая пишется в лист
 * через Range.setValue()/setValues()/Sheet.appendRow(). Официальная
 * документация Apps Script для ВСЕХ трёх точек записи прочитана 2026-09-23
 * и не содержит исключения по формату ячейки:
 *   - https://developers.google.com/apps-script/reference/spreadsheet/range
 *     (setValue(value): "If it begins with '=' it is interpreted as a
 *     formula."; setValues(values): "If a value begins with =, it's
 *     interpreted as a formula.")
 *   - https://developers.google.com/apps-script/reference/spreadsheet/sheet
 *     (appendRow(rowContents): "If a cell's content begins with =, it's
 *     interpreted as a formula.")
 * Ни один из трёх методов не упоминает setNumberFormat('@') ("обычный
 * текст") как исключение из этого поведения — прежняя защита
 * (protectExternalTextColumns_/setPlainTextValue_ в Code.gs, только формат
 * ячейки ДО значения) НЕ подтверждена этой докой и полагаться на неё как на
 * ЕДИНСТВЕННЫЙ контроль нельзя (задача этого раунда, root cause: код ни разу
 * не запускался на настоящей таблице). Официальная документация Sheets API
 * v4 (https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append
 * — ValueInputOption.USER_ENTERED: "parsed as if the user typed them into
 * the UI... following the same rules ... as entering text into a cell via
 * the Google Sheets UI") подтверждает, что Apps Script использует ТУ ЖЕ
 * "умную" разбор-логику, что ручной ввод — а в ручном вводе ведущий апостроф
 * (') — стандартный, повсеместно документированный способ форсировать
 * значение как текст (тот же приём уже используется и проверен на пути
 * Albato -> «Входящие»: functions/api/lead.js sheetSafe(), сам сославшийся
 * на OWASP formula-injection guidance для =, +, -, @, tab, CR). Эта функция —
 * ТА ЖЕ проверка/приём, применённая к записи из Apps Script в «Заявки»/
 * «Служебное»/«Журнал», чтобы оба пути записи в одну и ту же таблицу
 * защищались одинаково. Важно: если значение начинается с апострофа, оно уже
 * НЕ начинается с "=" — то есть даже без учёта UI-паритета парсинга,
 * буквальное правило докой ("if it begins with '='") больше не срабатывает
 * ни при каком толковании.
 * @param {*} value
 * @return {*} value без изменений, если это не строка или не начинается с
 *   опасного символа; иначе та же строка с ведущим апострофом.
 */
function sheetSafeValue_(value) {
  if (typeof value !== 'string') return value;
  if (/^[=+\-@\t\r]/.test(value)) return "'" + value;
  // Живой прогон 2026-09-23: «0509998877» записался числом 509998877 — таблица
  // превращает текст из одних цифр в число и теряет ведущий ноль телефона.
  // Апостроф заставляет хранить текст (в ячейке не виден).
  if (/^0[\d\s\-()]*$/.test(value) && value.length > 1) return "'" + value;
  return value;
}

/**
 * P1 A6 (review): темы писем строятся конкатенацией внешних значений
 * (Имя приходит с формы, № генерируется скриптом, но обе попадают в subject
 * как обычные строки). Официальная документация MailApp.sendEmail()
 * (https://developers.google.com/apps-script/reference/mail/mail-app#sendemailmessage,
 * прочитано 2026-09-23) описывает subject как "String — the subject of the
 * email" БЕЗ упоминания какой-либо санитизации управляющих символов; RFC
 * 5322 §2.2 запрещает "голый" CR/LF внутри значения заголовка письма (основа
 * классической атаки email header injection — лишние заголовки/строки).
 * Единая защита — вырезать CR/LF и остальные control-символы (\x00-\x1F,
 * \x7F) из всего, что попадает в subject.
 * @param {*} value
 * @return {string}
 */
function stripSubjectControlChars_(value) {
  return String(value === undefined || value === null ? '' : value).replace(/[\x00-\x1F\x7F]/g, '');
}

function pad4_(n) {
  n = Math.floor(n);
  if (n < 10) return '000' + n;
  if (n < 100) return '00' + n;
  if (n < 1000) return '0' + n;
  return String(n);
}

/**
 * Сравнение двух строк за время, не зависящее от того, на каком символе они
 * разошлись (защита doGet от timing-атаки на healthEndpointToken, review
 * находка №11). Полный constant-time недостижим в интерпретируемом JS, но
 * стандартная прикладная защита — не выходить из цикла на первом несовпадении
 * и не завершать сравнение раньше по длине.
 * @param {string} a
 * @param {string} b
 * @return {boolean}
 */
function timingSafeEqual_(a, b) {
  a = String(a === undefined || a === null ? '' : a);
  b = String(b === undefined || b === null ? '' : b);
  var maxLen = Math.max(a.length, b.length);
  var result = a.length === b.length ? 0 : 1;
  for (var i = 0; i < maxLen; i++) {
    var ca = i < a.length ? a.charCodeAt(i) : 0;
    var cb = i < b.length ? b.charCodeAt(i) : 0;
    result |= ca ^ cb;
  }
  return result === 0;
}

/**
 * Design §3.1 / review находка №12: колонка «Связаться» должна нести НАСТОЯЩУЮ
 * кликабельную ссылку (SpreadsheetApp.newRichTextValue().setLinkUrl(...)), а не
 * текст "tel:... https://wa.me/...". Официальная документация
 * RichTextValueBuilder.setLinkUrl() не описывает, какие URL-схемы поддерживает
 * (https://developers.google.com/apps-script/reference/spreadsheet/rich-text-value-builder),
 * а независимые источники (справка/форум Google Docs, пересказанные через
 * поиск 2026-09-23) сообщают, что штатный HYPERLINK() в Google Sheets кликабелен
 * только для http/https/mailto — "the extension only allows normal http and
 * mailto hyperlinks" — устойчивой поддержки tel: не подтверждено. Поэтому: тел.
 * номер остаётся ВИДИМЫМ ТЕКСТОМ (не ссылкой), а ссылкой делаем только WhatsApp,
 * ровно как просит review находка №12 в ветке "если tel: не подтверждён".
 * [likely, не проверено вживую на реальной таблице] — см. README "Не проверено".
 * @param {string} phone
 * @return {{text:string, links:Array<{start:number,end:number,url:string}>}}
 */
function buildContactCellPlan_(phone) {
  var links = buildContactLinks_(phone);
  if (!links.digitsOnly) return { text: '', links: [] };
  var phoneLabel = 'Позвонить: ' + String(phone === undefined || phone === null ? '' : phone);
  var waLabel = 'WhatsApp';
  var text = phoneLabel + '  ' + waLabel;
  var waStart = phoneLabel.length + 2;
  var waEnd = waStart + waLabel.length;
  return { text: text, links: [{ start: waStart, end: waEnd, url: links.waHref }] };
}

// ---- BusinessCalendar.gs ----
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

// ---- Sla.gs ----
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

// ---- CorrectionChain.gs ----
/**
 * CorrectionChain.gs — разрешение цепочек исправлений контактов.
 * Design: docs/MINI-CRM-DESIGN.md §5.4.
 *
 * Запись (record) — плоский объект из «Входящих»:
 *   { submission_id, corrects_submission_id (может отсутствовать = корень),
 *     submitted_at (ISO-строка или Date), name, phone, email }
 */

/**
 * Идёт от recordId к корню по corrects_submission_id.
 * @return {{status:'ok', rootId:string, chain:string[]}
 *         | {status:'missing', missingId:string, chainSoFar:string[]}
 *         | {status:'cycle', ids:string[]}}
 */
function findChainRoot_(recordId, recordsById, maxHops) {
  maxHops = maxHops || 1000;
  var visited = {};
  var order = [];
  var currentId = recordId;
  var hops = 0;
  while (true) {
    if (visited[currentId]) {
      return { status: 'cycle', ids: order };
    }
    visited[currentId] = true;
    order.push(currentId);
    hops++;
    if (hops > maxHops) return { status: 'cycle', ids: order };
    var rec = recordsById[currentId];
    if (!rec) return { status: 'missing', missingId: currentId, chainSoFar: order.slice(0, -1) };
    if (!rec.corrects_submission_id) return { status: 'ok', rootId: currentId, chain: order };
    currentId = rec.corrects_submission_id;
  }
}

/**
 * Строит план применения цепочки исправлений для листового submission_id.
 *
 * - Если корень ещё не пришёл -> {status:'waiting_for_original'} (не создавать заявку, §5.4).
 * - Если обнаружен цикл -> {status:'cycle'} (ошибка одной заявки не должна останавливать остальные).
 * - Иначе -> вся цепочка (корень..лист), применяется в порядке submitted_at (не в порядке
 *   обнаружения/доставки — "реверсивный порядок доставки" не должен ломать итог),
 *   с учётом уже применённых id (idempotent повторный tick).
 *
 * @param {string} leafId
 * @param {Object<string,Object>} recordsById
 * @param {string[]} [alreadyApplied]
 */
function buildCorrectionPlan_(leafId, recordsById, alreadyApplied) {
  var found = findChainRoot_(leafId, recordsById);
  if (found.status === 'cycle') {
    return { status: 'cycle', ids: found.ids };
  }
  if (found.status === 'missing') {
    return { status: 'waiting_for_original', missingId: found.missingId, chainSoFar: found.chainSoFar };
  }

  var records = found.chain.map(function (id) { return recordsById[id]; });
  records.sort(function (a, b) {
    return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
  });

  var appliedSet = {};
  (alreadyApplied || []).forEach(function (id) { appliedSet[id] = true; });
  var toApplyIds = records
    .filter(function (r) { return !appliedSet[r.submission_id]; })
    .map(function (r) { return r.submission_id; });

  var last = records[records.length - 1];
  return {
    status: 'ok',
    rootId: found.rootId,
    orderedIds: records.map(function (r) { return r.submission_id; }),
    toApplyIds: toApplyIds,
    finalContacts: { name: last.name, phone: last.phone, email: last.email, submission_id: last.submission_id }
  };
}

// ---- SendLog.gs ----
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

// ---- Digest.gs ----
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

// ---- Source.gs ----
/**
 * Source.gs — определение колонки «Откуда».
 * Design: docs/MINI-CRM-DESIGN.md §3.1 — "«Google Ads» (есть gclid/gbraid/wbraid),
 * иначе utm_source, иначе «Прямой»".
 */
function detectSource_(fields) {
  fields = fields || {};
  if (fields.gclid || fields.gbraid || fields.wbraid) return 'Google Ads';
  if (fields.utm_source) return String(fields.utm_source);
  return 'Прямой';
}

// ---- Numbering.gs ----
/**
 * Numbering.gs — №-нумерация заявок по порядку прихода.
 * Design: docs/MINI-CRM-DESIGN.md §3.1 — "G-0001… по порядку прихода".
 */
function formatLeadNumber_(n) {
  return 'G-' + pad4_(n);
}

/**
 * Следующий номер по уже существующим (ищет максимум, а не count — устойчиво
 * к архивации/удалению строк из середины).
 * @param {string[]} existingNumbers
 */
function nextLeadNumber_(existingNumbers) {
  var max = 0;
  (existingNumbers || []).forEach(function (numStr) {
    var m = /^G-(\d+)$/.exec(numStr || '');
    if (m) {
      var n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  });
  return formatLeadNumber_(max + 1);
}

// ---- SyncPlan.gs ----
/**
 * SyncPlan.gs — план синхронизации «Входящие» -> «Заявки» на каждый tick().
 * Design: docs/MINI-CRM-DESIGN.md §5.3, §9 ("повтор submission_id -> одна строка,
 * одно сообщение").
 *
 * Чистая функция: не читает и не пишет листы — принимает и возвращает данные.
 *
 * @param {Array<{submission_id:string}>} incomingRecords строки из «Входящих» за этот тик
 *   (могут содержать дубликаты одного submission_id — повтор Albato/повторный тик)
 * @param {Object<string, boolean>} existingBySubmissionId submission_id, уже
 *   заведённые в «Заявках» ранее
 * @param {string[]} [alreadyNotifiedIds] submission_id, по которым уведомление уже отправлено
 * @return {{toCreate: Array, toNotify: string[]}}
 */
function computeSyncPlan_(incomingRecords, existingBySubmissionId, alreadyNotifiedIds) {
  var seenThisBatch = {};
  var notifiedSet = {};
  (alreadyNotifiedIds || []).forEach(function (id) { notifiedSet[id] = true; });

  var toCreate = [];
  var toNotify = [];

  (incomingRecords || []).forEach(function (rec) {
    var id = rec && rec.submission_id;
    if (!id) return; // без submission_id обработать нельзя — пропускаем (не наша ошибка тут)
    if ((existingBySubmissionId && existingBySubmissionId[id]) || seenThisBatch[id]) {
      return; // строка уже есть или уже обработана в этом же батче — не создаём вторую
    }
    seenThisBatch[id] = true;
    toCreate.push(rec);
    if (!notifiedSet[id]) {
      toNotify.push(id);
      notifiedSet[id] = true;
    }
  });

  return { toCreate: toCreate, toNotify: toNotify };
}

// ---- EmailTemplates.gs ----
/**
 * EmailTemplates.gs — брендированные HTML-письма офиса (новая заявка, SLA,
 * эскалация). Design: задача 0.4.0 (Task B, владелец 2026-09-23).
 *
 * ЧИСТАЯ ЛОГИКА: рендер строится из плоского объекта данных, без обращения к
 * SpreadsheetApp/MailApp — тестируется в Node так же, как BusinessCalendar.gs/
 * SendLog.gs. Единственная внешняя зависимость — buildContactLinks_ (Utils.gs,
 * тоже чистая функция), уже используемая для «Связаться» в Sheets.
 *
 * Стиль — токены лендинга lp.gambarian.com (site/styles.css :root), НЕ шаблон
 * Assuta (синий/зелёный) — от него взята только СТРУКТУРА: шапка, белая
 * карточка, подписанные строки, кнопки действий. Тёмная, сдержанная,
 * юридическая подача: тёмная шапка с wordmark, золотой акцент, вино — основная
 * кнопка действия.
 *
 * Каждое поле пропускается через escapeHtml_ ПЕРЕД вставкой в HTML — имя вида
 * "<script>" или "=1+1" должно попасть в письмо как обычный текст, а не как
 * разметка/код (см. test/email-templates.test.mjs).
 */

var EMAIL_BRAND_ = {
  bgOuterLight: '#f6f1e8',
  bgHeader: '#0a0b0d',
  bgCardLight: '#ffffff',
  bgCardDark: '#151b22',
  bgOuterDark: '#101214',
  divider: '#e5e0d8',
  dividerDark: 'rgba(255,255,255,0.08)',
  gold: '#f0ae1f',
  goldLight: '#f5c451',
  wine: '#8a1f1f',
  wineHover: '#a02626',
  ink: '#14191f',
  inkOnDark: '#f2ede2',
  ink2: '#4b5158',
  ink3: '#6b7280',
  ink3Dark: '#9ca3af',
  border: '#d1d5db',
  // build-round email v2 (docs/crm-dashboard/EMAIL-CRITIQUE.md, top-5, owner "да"):
  // тёмные оверрайды secondary/outline кнопок — существующие оттенки бренда,
  // не новая палитра (см. email-v2.html, уже одобренный владельцем мокап).
  secondaryBgDark: '#1c232c',
  outlineBorderDark: '#c9736f',
  outlineTextDark: '#e7b0ad',
  fontStack: "'Onest', Helvetica, Arial, sans-serif"
};

/**
 * HTML-экранирование одного значения. Design задачи: "<script>"/"=1+1" должны
 * отрендериться как текст. Порядок замен важен — амперсанд первым.
 * @param {*} value
 * @return {string}
 */
function escapeHtml_(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Кнопка-ссылка ≥44px высотой (line-height трюк — надёжен в Gmail web/mobile).
 * @param {{bg, color, border, className}} [opts] className — для тёмных
 *   CSS-оверрайдов (см. renderEmailShellHtml_ .btn-outline и
 *   emailContactButtonsHtml_ .btn-secondary).
 */
function emailButtonHtml_(label, href, opts) {
  opts = opts || {};
  var bg = opts.bg || EMAIL_BRAND_.gold;
  var color = opts.color || EMAIL_BRAND_.ink;
  var border = opts.border ? ('border:1px solid ' + opts.border + ';') : '';
  var classAttr = opts.className ? (' class="' + opts.className + '"') : '';
  var style = 'display:inline-block;min-height:44px;line-height:44px;padding:0 22px;' +
    'background:' + bg + ';color:' + color + ';' + border +
    'font-family:' + EMAIL_BRAND_.fontStack + ';font-weight:700;font-size:13px;' +
    'border-radius:8px;text-decoration:none;white-space:nowrap;';
  return '<a href="' + escapeHtml_(href) + '"' + classAttr + ' style="' + style + '">' + escapeHtml_(label) + '</a>';
}

/**
 * Build-round owner correction (b): «Позвонить»/«Написать в WhatsApp» — РАВНОЙ
 * ширины и высоты, выровнены на 390px (мокап-стек с двумя разноширинными
 * inline-кнопками этому не удовлетворял: "Позвонить" короче "Написать в
 * WhatsApp"). Обе кнопки — блочные, шириной 100% контейнера, одна под другой —
 * это ОДНА разметка, работающая одинаково на 390 и 1024 без медиа-запроса на
 * переключение layout (email-клиенты поддерживают @media выборочно, а
 * "стек, обе на всю ширину" — один из двух вариантов, явно допущенных в задаче).
 * Заодно закрывает EMAIL-CRITIQUE.md рекомендацию №1 (контраст WhatsApp-кнопки,
 * WCAG 1.4.11 1.24:1 → ≥3:1: кремовая заливка + видимая граница вместо белого
 * на белом) и №5 (гарантированный вертикальный зазор — margin-top, не побочный
 * line-height).
 */
function emailContactButtonsHtml_(telHref, waHref) {
  var base = 'display:block;width:100%;box-sizing:border-box;min-height:44px;line-height:44px;text-align:center;' +
    'font-family:' + EMAIL_BRAND_.fontStack + ';font-weight:700;font-size:13px;border-radius:8px;text-decoration:none;';
  var callStyle = base + 'background:' + EMAIL_BRAND_.gold + ';color:' + EMAIL_BRAND_.ink + ';';
  var waStyle = base + 'background:' + EMAIL_BRAND_.bgOuterLight + ';color:' + EMAIL_BRAND_.ink +
    ';border:1px solid ' + EMAIL_BRAND_.ink3 + ';margin-top:8px;';
  return '<div style="margin-top:10px;">' +
    '<a href="' + escapeHtml_(telHref) + '" style="' + callStyle + '">Позвонить</a>' +
    '<a href="' + escapeHtml_(waHref) + '" class="btn-secondary" style="' + waStyle + '">Написать в WhatsApp</a>' +
    '</div>';
}

/** Одна подписанная строка карточки: слева серая метка, справа значение (HTML уже готов). */
function emailLabelledRowHtml_(label, valueHtml, opts) {
  opts = opts || {};
  var borderTop = opts.noBorderTop ? '' : ('border-top:1px solid ' + EMAIL_BRAND_.divider + ';');
  return '' +
    '<tr><td class="email-row" style="padding:14px 0;' + borderTop + '">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td class="email-text-muted" width="92" valign="top" style="font-family:' + EMAIL_BRAND_.fontStack + ';font-size:12px;color:' + EMAIL_BRAND_.ink3 + ';padding-top:2px;">' + escapeHtml_(label) + '</td>' +
    '<td class="email-text" style="font-family:' + EMAIL_BRAND_.fontStack + ';font-size:15px;color:' + EMAIL_BRAND_.ink + ';font-weight:600;">' + valueHtml + '</td>' +
    '</tr></table></td></tr>';
}

/**
 * Общая обёртка письма: шапка с wordmark лендинга + белая карточка + футер.
 * Design §"dark mode": @media (prefers-color-scheme: dark) переопределяет фон
 * карточки/страницы и цвет текста через классы email-bg/email-card/email-text*
 * (Gmail web и мобильный Gmail поддерживают <style> в <head>, включая media
 * queries — inline-стили остаются рабочим fallback для клиентов без поддержки).
 * @param {{previewText:string, titleHtml:string, rowsHtml:string, ctaHtml:string, footerText:string}} parts
 */
function renderEmailShellHtml_(parts) {
  var b = EMAIL_BRAND_;
  return '' +
    '<!DOCTYPE html>' +
    '<html lang="ru">' +
    '<head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<meta name="color-scheme" content="light dark">' +
    '<meta name="supported-color-schemes" content="light dark">' +
    '<title>' + escapeHtml_(parts.previewText || '') + '</title>' +
    '<style>' +
    'body,table,td{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}' +
    'img{border:0;outline:none;text-decoration:none;}' +
    'a{text-decoration:none;}' +
    '@media (prefers-color-scheme: dark) {' +
    '.email-bg{background:' + b.bgOuterDark + ' !important;}' +
    '.email-card{background:' + b.bgCardDark + ' !important;}' +
    '.email-text{color:' + b.inkOnDark + ' !important;}' +
    '.email-text-muted{color:' + b.ink3Dark + ' !important;}' +
    '.email-row{border-color:' + b.dividerDark + ' !important;}' +
    // EMAIL-CRITIQUE.md recommendation №1/№3: secondary (WhatsApp) и outline
    // («Открыть заявку») кнопки не переопределялись под тёмный режим вовсе —
    // secondary оставался плоским белым пятном на тёмной карточке, outline
    // держал винный бордер, малозаметный на почти чёрном фоне.
    '.btn-secondary{background:' + b.secondaryBgDark + ' !important;border-color:' + b.ink3Dark + ' !important;color:' + b.inkOnDark + ' !important;}' +
    '.btn-outline{border-color:' + b.outlineBorderDark + ' !important;color:' + b.outlineTextDark + ' !important;}' +
    '}' +
    '</style>' +
    '</head>' +
    '<body class="email-bg" style="margin:0;padding:0;background:' + b.bgOuterLight + ';">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">' + escapeHtml_(parts.previewText || '') + '</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-bg" style="background:' + b.bgOuterLight + ';">' +
    '<tr><td align="center" style="padding:32px 16px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;">' +
    '<tr><td style="background:' + b.bgHeader + ';padding:24px 32px;border-radius:12px 12px 0 0;" align="center">' +
    '<div style="font-family:' + b.fontStack + ';font-weight:800;font-size:16px;letter-spacing:0.06em;color:#ffffff;text-transform:uppercase;">' +
    'Гамбарян <span style="color:' + b.gold + ';">&amp;</span> Партнёры' +
    '</div>' +
    '<div style="margin-top:10px;font-family:' + b.fontStack + ';font-size:10px;font-weight:600;letter-spacing:0.32em;color:' + b.gold + ';text-transform:uppercase;">Адвокаты</div>' +
    '</td></tr>' +
    '<tr><td class="email-card" style="background:' + b.bgCardLight + ';padding:32px;border-radius:0 0 12px 12px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
    '<tr><td class="email-text" style="font-family:' + b.fontStack + ';font-size:20px;font-weight:700;color:' + b.ink + ';padding-bottom:20px;">' + parts.titleHtml + '</td></tr>' +
    parts.rowsHtml +
    '<tr><td style="padding-top:26px;" align="center">' + parts.ctaHtml + '</td></tr>' +
    '</table>' +
    '</td></tr>' +
    '</table>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;">' +
    '<tr><td align="center" style="padding:18px 32px;">' +
    // EMAIL-CRITIQUE.md recommendation №2: ink3 (#6b7280) на кремовом фоне
    // страницы (#f6f1e8) — WCAG AA FAIL, 4.3:1 < 4.5:1 (вычислено). ink2
    // (#4b5158) на том же фоне — 7.14:1, PASS с запасом. Только light — dark
    // override (.email-text-muted -> ink3Dark) уже проходил, не тронут.
    '<span class="email-text-muted" style="font-family:' + b.fontStack + ';font-size:12px;color:' + b.ink2 + ';">' + escapeHtml_(parts.footerText || '') + '</span>' +
    '</td></tr>' +
    '</table>' +
    '</td></tr>' +
    '</table>' +
    '</body></html>';
}

/**
 * design 0.4.0: № и время получения (Израиль), Имя, Телефон (кнопки
 * «Позвонить»/WhatsApp), Email (mailto), Откуда, кнопка «Открыть заявку»,
 * футер «Автоматическое уведомление о новой заявке · Гамбарян и партнёры».
 * Ни UTM, ни комментариев — только то, что перечислено в задаче.
 * @param {{leadNo, receivedAtLabel, name, phone, email, source, sheetUrl}} data
 * @return {{subject:string, html:string, text:string}}
 */
function renderNewLeadEmail_(data) {
  data = data || {};
  var leadNo = data.leadNo || '';
  var name = data.name || '';
  var phone = data.phone || '';
  var email = data.email || '';
  var source = data.source || '';
  var sheetUrl = data.sheetUrl || '';
  var receivedAtLabel = data.receivedAtLabel || '';
  var links = buildContactLinks_(phone);

  var phoneValueHtml = escapeHtml_(phone);
  if (links.digitsOnly) {
    phoneValueHtml += emailContactButtonsHtml_(links.telHref, links.waHref);
  }

  var rows = emailLabelledRowHtml_('Имя', escapeHtml_(name), { noBorderTop: true });
  rows += emailLabelledRowHtml_('Телефон', phoneValueHtml);
  if (email) {
    rows += emailLabelledRowHtml_('Email', '<a href="mailto:' + escapeHtml_(email) + '" class="email-text" style="color:' + EMAIL_BRAND_.ink + ';font-weight:600;">' + escapeHtml_(email) + '</a>');
  }
  rows += emailLabelledRowHtml_('Откуда', escapeHtml_(source || '—'));

  // EMAIL-CRITIQUE.md recommendation №3: «Открыть заявку» — outline, не filled.
  // «Позвонить» стартует SLA (design §5.5) и остаётся единственной loud-кнопкой;
  // «Открыть заявку» — административный шаг, не должен конкурировать взглядом.
  var cta = emailButtonHtml_('Открыть заявку', sheetUrl, { bg: 'transparent', color: EMAIL_BRAND_.wine, border: EMAIL_BRAND_.wine, className: 'btn-outline' });
  var titleHtml = 'Новая заявка ' + escapeHtml_(leadNo) +
    '<div style="margin-top:4px;font-size:13px;font-weight:400;color:' + EMAIL_BRAND_.ink3 + ';">Получена ' + escapeHtml_(receivedAtLabel) + ' (Израиль)</div>';
  var footerText = 'Автоматическое уведомление о новой заявке · Гамбарян и партнёры';

  var html = renderEmailShellHtml_({
    previewText: 'Новая заявка ' + leadNo + ' — ' + name,
    titleHtml: titleHtml,
    rowsHtml: rows,
    ctaHtml: cta,
    footerText: footerText
  });

  var textLines = [
    'Новая заявка ' + leadNo,
    'Получена ' + receivedAtLabel + ' (Израиль)',
    '',
    'Имя: ' + name,
    'Телефон: ' + phone + (links.digitsOnly ? ' (' + links.telHref + ', ' + links.waHref + ')' : ''),
  ];
  if (email) textLines.push('Email: ' + email);
  textLines.push('Откуда: ' + (source || '—'));
  textLines.push('');
  textLines.push('Открыть заявку: ' + sheetUrl);
  textLines.push('');
  textLines.push(footerText);

  return {
    // P1 A6 (review): № и Имя — внешние строки (Имя приходит с формы) в
    // subject письма; MailApp.sendEmail() не документирует санитизацию
    // control-символов в subject (см. stripSubjectControlChars_ в Utils.gs
    // для точной цитаты и URL) — CR/LF внутри значения заголовка письма это
    // классическая email header injection (RFC 5322 §2.2).
    subject: 'Новая заявка ' + stripSubjectControlChars_(leadNo) + ' — ' + stripSubjectControlChars_(name),
    html: html,
    text: textLines.join('\n')
  };
}

/**
 * Общий "короткий" шаблон SLA/эскалации: № + Имя + Телефон + «Открыть заявку»
 * + срочность (design задача 0.4.0 — "same style, short").
 * @param {{leadNo, name, phone, sheetUrl, waitingLabel, titleText, footerText, subjectPrefix}} data
 */
function renderShortLeadEmail_(data) {
  data = data || {};
  var leadNo = data.leadNo || '';
  var name = data.name || '';
  var phone = data.phone || '';
  var sheetUrl = data.sheetUrl || '';
  var waitingLabel = data.waitingLabel || '';
  var links = buildContactLinks_(phone);

  var phoneValueHtml = escapeHtml_(phone);
  if (links.digitsOnly) {
    phoneValueHtml += emailContactButtonsHtml_(links.telHref, links.waHref);
  }

  var rows = emailLabelledRowHtml_('Имя', escapeHtml_(name), { noBorderTop: true });
  rows += emailLabelledRowHtml_('Телефон', phoneValueHtml);

  var cta = emailButtonHtml_('Открыть заявку', sheetUrl, { bg: 'transparent', color: EMAIL_BRAND_.wine, border: EMAIL_BRAND_.wine, className: 'btn-outline' });
  // EMAIL-CRITIQUE.md recommendation №4: эскалация визуально неотличима от
  // рутинного SLA-напоминания — бейдж только здесь (renderSlaEscalationEmail_
  // передаёт data.badgeHtml), существующий цвет (wine), не новый.
  var badgeHtml = data.badgeHtml ? (data.badgeHtml + '<div style="height:8px;"></div>') : '';
  var titleHtml = badgeHtml + escapeHtml_(data.titleText || '') + ' ' + escapeHtml_(leadNo) +
    '<div style="margin-top:4px;font-size:13px;font-weight:400;color:' + EMAIL_BRAND_.ink3 + ';">' + escapeHtml_(waitingLabel) + '</div>';

  var html = renderEmailShellHtml_({
    previewText: (data.titleText || '') + ' ' + leadNo,
    titleHtml: titleHtml,
    rowsHtml: rows,
    ctaHtml: cta,
    footerText: data.footerText || ''
  });

  var textLines = [
    (data.titleText || '') + ' ' + leadNo,
    waitingLabel,
    '',
    'Имя: ' + name,
    'Телефон: ' + phone + (links.digitsOnly ? ' (' + links.telHref + ', ' + links.waHref + ')' : ''),
    '',
    'Открыть заявку: ' + sheetUrl,
    '',
    data.footerText || ''
  ];

  return {
    // P1 A6 — см. комментарий в renderNewLeadEmail_.
    subject: (data.subjectPrefix || (data.titleText || '')) + ' — ' + stripSubjectControlChars_(leadNo),
    html: html,
    text: textLines.join('\n')
  };
}

/** @param {{leadNo, name, phone, sheetUrl}} data */
function renderSlaFirstAttemptEmail_(data) {
  data = data || {};
  return renderShortLeadEmail_({
    leadNo: data.leadNo,
    name: data.name,
    phone: data.phone,
    sheetUrl: data.sheetUrl,
    titleText: 'SLA: нет первой попытки',
    subjectPrefix: 'SLA: нет первой попытки',
    waitingLabel: '30 рабочих минут без первой попытки',
    footerText: 'Автоматическое напоминание CRM · Гамбарян и партнёры'
  });
}

/** @param {{leadNo, name, phone, sheetUrl}} data */
function renderSlaEscalationEmail_(data) {
  data = data || {};
  return renderShortLeadEmail_({
    leadNo: data.leadNo,
    name: data.name,
    phone: data.phone,
    sheetUrl: data.sheetUrl,
    titleText: 'Эскалация: нет первой попытки 2ч',
    subjectPrefix: 'Эскалация: нет первой попытки 2ч',
    waitingLabel: 'Эскалация владельцу — 2 рабочих часа без первой попытки',
    footerText: 'Автоматическая эскалация CRM · Гамбарян и партнёры',
    badgeHtml: '<span style="background:' + EMAIL_BRAND_.wine + ';color:#fff;font-size:11px;font-weight:700;' +
      'letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:999px;">Эскалация</span>'
  });
}

// ---- Config.gs ----
/**
 * Config.gs — настройки читаются из листа «Настройки» (ключ/значение), а не
 * захардкожены в коде. Design: docs/MINI-CRM-DESIGN.md §5.3, §12.2/§12.3.
 *
 * Только spreadsheet id — константа (Config §задачи): всё остальное живёт
 * в «Настройках» и редактируется без правки кода. Значения recipients/duty
 * ниже — ПРЕДЛОЖЕННЫЕ владельцем дефолты из §12.2 ("ждёт подтверждения") —
 * setupCrm() пишет их один раз при первом создании листа, дальше их можно
 * менять прямо в таблице.
 */

var SPREADSHEET_ID_ = '1_jhfr7ucoKkbrwWlUQoS9wyw7uHYhe_oOutKpTlcoV4';
var SETTINGS_SHEET_NAME_ = 'Настройки';

// v1 (владелец 2026-09-23: «запустить сейчас», «не усложняй»): лист «Сводка» и
// воскресная сводка владельцу отложены до v2 — в день запуска данных нет,
// графики пустые. Код сохранён: включить = true и повторно запустить setupCrm().
var SUMMARY_SHEET_ENABLED_ = false;

// v1 (2026-09-23): письмо о новой заявке шлёт Albato (шаг Gmail в сценарии
// GAMB_ADV, как у Assuta) — сразу и круглосуточно. CRM его НЕ шлёт, иначе
// офис получит два письма на заявку. SLA-напоминания, эскалации, дайджест —
// остаются за CRM. Включить обратно = true.
var NEW_LEAD_EMAIL_ENABLED_ = false;

var DEFAULT_SETTINGS_ = {
  tz: 'Asia/Jerusalem',
  business_days: '0,1,2,3,4', // 0=вс..6=сб (design §5.5: вс-чт)
  business_start: '09:00',
  business_end: '18:00',
  sla_first_attempt_minutes: '30',
  sla_escalation_minutes: '120',
  digest_time: '08:30',
  // build-round 2026-09-23: подтверждено владельцем в чате — 5 адресов
  // (было 2 ПРЕДЛОЖЕННЫХ в design §12.2; сначала подтверждены 4, затем
  // владелец добавил nat.shurygin@gmail.com — человек, который ведёт лиды
  // напрямую — финальный подтверждённый список).
  office_recipients: 'cityr.ta@gmail.com,justicetelaviv@gmail.com,gambarian@gmail.com,alex@adfix.co.il,nat.shurygin@gmail.com',
  escalation_recipients: 'gambarian@gmail.com,alex@adfix.co.il',
  system_alert_recipients: 'alex@adfix.co.il',
  owner_summary_recipient: 'gambarian@gmail.com',
  // build-round 2026-09-23: подтверждено владельцем — nat.shurygin@gmail.com
  // ведёт лиды напрямую (было ПРЕДЛОЖЕНО cityr.ta@gmail.com, design §12.2).
  default_duty_officer: 'nat.shurygin@gmail.com',
  staff_list: 'cityr.ta@gmail.com,justicetelaviv@gmail.com,nat.shurygin@gmail.com',
  observer_stale_minutes: '30',
  // review находка №5: ОДНО место хранения — строка «Настроек», не Script
  // Property (README раньше противоречил коду). Пустой дефолт — заполняется
  // вручную при подключении Albato; пока пусто, protectIntakeSheet_ работает
  // в режиме предупреждения (см. Sheets.gs), а не жёстко блокирует Albato.
  albato_editor_email: '',
  // review находка №13 / design §12 строка 7: дежурный на выходные/ночь —
  // настройка «Настроек», по умолчанию ВЫКЛЮЧЕНА (владелец: «пока нет»).
  weekend_duty_enabled: 'false',
  weekend_duty_email: '',
  // build-round (owner-approved addition, pipeline-health v1 contract):
  // здоровье бэкап/ретрай-воркера (Cloudflare, gambarian-lead-cron) — сугубо
  // техническая настройка, офис её не видит (design: «Настройки» и так не
  // видит офис — см. docs/MINI-CRM-DESIGN.md §2).
  pipeline_health_url: 'https://gambarian-lead-cron.alex-799.workers.dev/health'
};

// Ключи, по которым владелец ещё не подтвердил значение (design §12.2) —
// комментарий во втором листе «Настроек» явно про это напоминает.
// build-round 2026-09-23: office_recipients и default_duty_officer подтверждены
// владельцем в чате — остаётся только escalation_recipients.
var SETTINGS_PENDING_CONFIRMATION_ = ['escalation_recipients'];

var SETTINGS_COMMENTS_ = {
  business_days: '0=вс … 6=сб; design §5.5 — вс-чт',
  escalation_recipients: 'ЖДЁТ ПОДТВЕРЖДЕНИЯ владельца — design §12.2',
  default_duty_officer: 'подтверждено владельцем 2026-09-23',
  office_recipients: 'подтверждено владельцем 2026-09-23',
  owner_summary_recipient: 'воскресная сводка (design §5.6)',
  system_alert_recipients: 'heartbeat / независимый наблюдатель (design §5.7)',
  albato_editor_email: 'email аккаунта Albato для доступа к «Входящие» — заполнить при подключении Albato (design §5.1, review №5); пока пусто — защита «Входящие» в режиме предупреждения',
  weekend_duty_enabled: 'true/false — дежурный на выходные/ночь (design §12 строка 7). По умолчанию false',
  weekend_duty_email: 'email дежурного вне рабочего времени, используется только если weekend_duty_enabled=true',
  pipeline_health_url: 'GET .../health (pipeline-health v1) — проверяется раз в час из tick(), алерт system_alert_recipients при деградации'
};

/**
 * Строки для записи в «Настройки» при первом setupCrm() (заголовок + по строке
 * на параметр). Не перезаписывает существующие значения — вызывающий код должен
 * писать только отсутствующие ключи (см. Sheets.gs ensureSettingsSheet_).
 */
function buildDefaultSettingsRows_(overrides) {
  var merged = {};
  Object.keys(DEFAULT_SETTINGS_).forEach(function (k) { merged[k] = DEFAULT_SETTINGS_[k]; });
  Object.keys(overrides || {}).forEach(function (k) { merged[k] = overrides[k]; });

  var rows = [['Параметр', 'Значение', 'Комментарий']];
  Object.keys(merged).forEach(function (key) {
    rows.push([key, merged[key], SETTINGS_COMMENTS_[key] || '']);
  });
  return rows;
}

function splitList_(s) {
  return String(s === undefined || s === null ? '' : s)
    .split(',')
    .map(function (x) { return x.trim(); })
    .filter(Boolean);
}

/**
 * Разбирает строки листа «Настройки» (включая заголовок) в плоский объект
 * "ключ -> сырое строковое значение", подставляя дефолты для отсутствующих ключей.
 *
 * design fix item2 (Codex review, CHANGES_REQUESTED): раньше явно ОЧИЩЕННОЕ
 * значение (пустая строка в ячейке) не отличалось от "строки для ключа нет
 * вовсе" — обе ветки проваливались через `String(value) !== ''` и оставляли
 * ДЕФОЛТ активным. Итог: владелец очищает office_recipients, чтобы никому не
 * слать письма с ФИО/телефоном лида, а скрипт продолжает слать их дефолтным
 * адресам — PII продолжает уходить получателям, которых владелец явно убрал.
 * Теперь: строка для ключа ЕСТЬ в листе -> её значение используется КАК ЕСТЬ,
 * даже пустое (пустой список получателей = «не отправлять», splitList_('')
 * уже возвращает [] — см. Utils/Config splitList_). Дефолт из
 * DEFAULT_SETTINGS_ применяется ТОЛЬКО когда строки для ключа нет вовсе
 * (миграция схемы — buildDefaultSettingsRows_ дописывает новые ключи одной
 * строкой, ensureSettingsSheet_ в Sheets.gs).
 */
/**
 * Живой прогон 2026-09-23: таблица сама превращает «09:00» во время (Date на
 * 30.12.1899), а числа — в Number. Приводим обратно к строке настройки:
 * время → «HH:mm» в часовом поясе скрипта (Asia/Jerusalem, appsscript.json),
 * ведущий апостроф (им пишется текст) снимаем.
 */
function settingsCellToString_(value) {
  if (value === undefined || value === null) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm');
  }
  var s = String(value);
  return s.charAt(0) === "'" ? s.slice(1) : s;
}

function parseSettingsRows_(rows) {
  var raw = {};
  Object.keys(DEFAULT_SETTINGS_).forEach(function (k) { raw[k] = DEFAULT_SETTINGS_[k]; });
  (rows || []).slice(1).forEach(function (row) {
    var key = row[0];
    if (!key) return;
    key = String(key).trim();
    if (!key) return;
    raw[key] = settingsCellToString_(row[1]);
  });
  return raw;
}

/**
 * Приводит сырые строковые настройки к типизированному calendar/thresholds/recipients.
 * holidays и shortDays сюда не входят намеренно — они читаются из отдельных
 * табличек листа «Настройки» построчно (Sheets.gs readHolidaysAndShortDays_),
 * т.к. это списки переменной длины, а не пары ключ/значение.
 */
function normalizeSettings_(raw, holidaysAndShortDays) {
  var hs = holidaysAndShortDays || { holidays: [], shortDays: {} };
  return {
    tz: raw.tz,
    calendar: {
      tz: raw.tz,
      businessDays: String(raw.business_days).split(',').map(function (s) { return parseInt(s, 10); }),
      businessStart: raw.business_start,
      businessEnd: raw.business_end,
      holidays: hs.holidays,
      shortDays: hs.shortDays
    },
    thresholds: {
      slaFirstAttemptMinutes: parseInt(raw.sla_first_attempt_minutes, 10),
      slaEscalationMinutes: parseInt(raw.sla_escalation_minutes, 10)
    },
    digestTime: raw.digest_time,
    officeRecipients: splitList_(raw.office_recipients),
    escalationRecipients: splitList_(raw.escalation_recipients),
    systemAlertRecipients: splitList_(raw.system_alert_recipients),
    ownerSummaryRecipient: raw.owner_summary_recipient,
    defaultDutyOfficer: raw.default_duty_officer,
    staffList: splitList_(raw.staff_list),
    observerStaleMinutes: parseInt(raw.observer_stale_minutes, 10),
    albatoEditorEmail: raw.albato_editor_email || '',
    weekendDuty: {
      enabled: String(raw.weekend_duty_enabled).trim().toLowerCase() === 'true',
      email: raw.weekend_duty_email || ''
    },
    pipelineHealthUrl: raw.pipeline_health_url || ''
  };
}

// ---- PipelineHealth.gs ----
/**
 * PipelineHealth.gs — независимый наблюдатель за резервным
 * бэкап/ретрай-воркером (Cloudflare, gambarian-lead-cron). Build-round
 * addition (owner-approved), контракт "pipeline-health v1":
 *
 *   GET <pipeline_health_url> -> 200 JSON:
 *   {schema, generated_at,
 *    backup:{last_ok_at, last_run_at, integrity_ok},
 *    sweep:{last_ok_at, last_run_at},
 *    stuck_leads, albato_configured}
 *   D1 недоступна -> 503 {schema:1, error:"d1_unavailable"}
 *   backup — раз в час, sweep — раз в 5 минут (со стороны воркера).
 *   После фикса на сервере отсутствующая health-таблица -> 200 с null в
 *   backup/sweep полях — null читается как деградация (см. ниже), не как
 *   "здоровый ответ".
 *
 * evaluatePipelineHealth_ — ЧИСТАЯ функция (тестируется без фейков, как
 * BusinessCalendar.gs/SendLog.gs). checkPipelineHealth_ — GAS-only обвязка:
 * fetch раз в час (throttle через Script Properties), алерт на переходе
 * ok->degraded (once per incident, с ретраем на КАЖДОМ часовом тике, пока
 * письмо реально не доставлено — C2), recovery-письмо ТОЛЬКО после
 * доверенного здорового 200 (C1), каждый переход журналируется.
 * Собственный шаг tick() (runStepSafely_) — падение здесь не должно ронять
 * остальной цикл (design item6, тот же принцип).
 *
 * build-round fix (owner: «CRM — самое главное», c-health team, 2026-09-23):
 * C1 false recovery, C2 lost alert, C3 malformed contract read as healthy,
 * C4 empty system_alert_recipients, C5 one update email per reason change —
 * см. комментарии по месту.
 */

var PIPELINE_HEALTH_CHECK_INTERVAL_MS_ = 60 * 60 * 1000; // раз в час
var PIPELINE_HEALTH_BACKUP_MAX_AGE_MS_ = 2 * 60 * 60 * 1000; // 2ч
var PIPELINE_HEALTH_SWEEP_MAX_AGE_MS_ = 30 * 60 * 1000; // 30 минут
var PIPELINE_HEALTH_MAX_CONSECUTIVE_FETCH_FAILURES_ = 2; // "2 проверки подряд" — один сбой не алертит

/**
 * C3 (review health #1): строгая проверка контракта pipeline-health v1.
 * Официально задокументированные причины, по которым поле, которое КАЖЕТСЯ
 * валидным по JS-сравнению, на деле не является тем, что контракт обещает:
 *  - JSON.parse() бросает SyntaxError на невалидном JSON — уже обрабатывается
 *    ДО вызова этой функции (см. checkPipelineHealth_), сюда попадает либо
 *    null (тело не распарсилось), либо распарсенный объект.
 *    https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse#exceptions
 *  - new Date(x).getTime() для НЕВАЛИДНОЙ строки возвращает NaN, а не бросает
 *    и не null — поэтому "NaN < now - MAX_AGE" всегда false, и такая дата
 *    молча читалась как "ещё не устарела" (найдено ревью health #1).
 *    https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date
 *  - "3" > 0 и "false" === false в JS дают ложные результаты для полей,
 *    которые контракт обещает как number/boolean, а не string —
 *    stuck_leads:"abc" > 0 === false (читалось как 0 заявок), а
 *    albato_configured:"false" === false тоже false (читалось как настроен).
 * Возвращает строку причины (контракт нарушен) или null (контракт соблюдён).
 * Null в backup/sweep timestamps — ВАЛИДНЫЙ по контракту случай (см. шапку
 * файла, "после фикса на сервере") — не нарушение контракта, а деградация,
 * которую дальше обрабатывает основной цикл reasons в evaluatePipelineHealth_.
 * @param {*} healthJson распарсенный JSON (может быть null/не-объектом)
 * @return {string|null}
 */
function validatePipelineHealthContract_(healthJson) {
  function isValidIsoOrNull(v) {
    if (v === null || v === undefined) return true; // контракт: ISO|null
    if (typeof v !== 'string') return false;
    return !isNaN(new Date(v).getTime());
  }

  if (!healthJson || typeof healthJson !== 'object') {
    return 'ответ /health не по контракту (тело — не JSON-объект)';
  }
  if (healthJson.schema !== 1) {
    return 'ответ /health не по контракту (schema !== 1)';
  }
  if (!isValidIsoOrNull(healthJson.generated_at)) {
    return 'ответ /health не по контракту (generated_at — не ISO-дата)';
  }
  var backup = healthJson.backup;
  var sweep = healthJson.sweep;
  if (!backup || typeof backup !== 'object') {
    return 'ответ /health не по контракту (backup отсутствует/не объект)';
  }
  if (!sweep || typeof sweep !== 'object') {
    return 'ответ /health не по контракту (sweep отсутствует/не объект)';
  }
  if (!isValidIsoOrNull(backup.last_ok_at)) {
    return 'ответ /health не по контракту (backup.last_ok_at — не ISO-дата)';
  }
  if (!isValidIsoOrNull(backup.last_run_at)) {
    return 'ответ /health не по контракту (backup.last_run_at — не ISO-дата)';
  }
  if (backup.integrity_ok !== null && backup.integrity_ok !== undefined && typeof backup.integrity_ok !== 'boolean') {
    return 'ответ /health не по контракту (backup.integrity_ok — не boolean)';
  }
  if (!isValidIsoOrNull(sweep.last_ok_at)) {
    return 'ответ /health не по контракту (sweep.last_ok_at — не ISO-дата)';
  }
  if (!isValidIsoOrNull(sweep.last_run_at)) {
    return 'ответ /health не по контракту (sweep.last_run_at — не ISO-дата)';
  }
  if (typeof healthJson.stuck_leads !== 'number' || !isFinite(healthJson.stuck_leads) || Math.floor(healthJson.stuck_leads) !== healthJson.stuck_leads) {
    return 'ответ /health не по контракту (stuck_leads — не целое число)';
  }
  if (typeof healthJson.albato_configured !== 'boolean') {
    return 'ответ /health не по контракту (albato_configured — не boolean)';
  }
  return null;
}

/**
 * Оценивает состояние pipeline-health по УЖЕ распарсенному ответу (или его
 * отсутствию — сеть/парсинг подвели). Чистая функция, без сети/сайд-эффектов.
 *
 * C1 (false recovery, Codex P1-5): три состояния, не два. httpStatus !== 200
 * (сеть недоступна, timeout, 503 d1_unavailable) НИКОГДА не означает "ok" —
 * до накопления PIPELINE_HEALTH_MAX_CONSECUTIVE_FETCH_FAILURES_ подряд это
 * 'unknown' (недостаточно данных, чтобы решить хоть что-то — ни алертить, ни
 * снимать активный инцидент), после накопления — 'degraded'. Единственный
 * путь к 'ok' — доверенный ответ 200 с контрактно-валидным телом и всеми
 * полями в норме.
 * reasonCodes (C5, review health #5): в отличие от reasons (человекочитаемые
 * строки для письма — могут содержать переменные детали: конкретную дату,
 * счётчик подряд идущих сбоев), reasonCodes — стабильный набор категорий
 * деградации, не меняющийся, пока не изменилась ИМЕННО категория проблемы.
 * checkPipelineHealth_ дедуплицирует письма-обновления по reasonCodes, а не
 * по reasons — иначе, например, растущий "недоступен уже N проверок подряд"
 * слал бы новое письмо КАЖДЫЙ час одной и той же продолжающейся недоступности.
 * @param {Object|null} healthJson распарсенный JSON ответа (null — fetch/JSON.parse не удались)
 * @param {number} httpStatus код ответа (0, если запрос не удался вовсе)
 * @param {Date} now
 * @param {number} consecutiveFetchFailures сколько ПОДРЯД попыток fetch (включая эту) не дали 200
 * @return {{status:('ok'|'degraded'|'unknown'), reasons:string[], reasonCodes:string[], fetchFailed:boolean}}
 */
function evaluatePipelineHealth_(healthJson, httpStatus, now, consecutiveFetchFailures) {
  var networkFailed = httpStatus !== 200;
  if (networkFailed) {
    // "недоступен 2 проверки подряд — один блип не алертит": решение зависит
    // от НАКОПЛЕННОГО числа подряд идущих неудач, которое считает вызывающий
    // код (Script Properties переживают между тиками, эта функция — нет).
    // Один блип — 'unknown', НЕ 'ok': вызывающий код не должен трактовать
    // недостающую информацию как признак восстановления (C1).
    var degradedByFetch = consecutiveFetchFailures >= PIPELINE_HEALTH_MAX_CONSECUTIVE_FETCH_FAILURES_;
    return {
      status: degradedByFetch ? 'degraded' : 'unknown',
      reasons: degradedByFetch
        ? ['/health недоступен уже ' + consecutiveFetchFailures + ' проверки подряд (код ответа: ' + httpStatus + ')']
        : [],
      reasonCodes: degradedByFetch ? ['fetch_unreachable'] : [],
      fetchFailed: true
    };
  }

  // httpStatus === 200 с этого момента — сервер ответил, но C3: тело могло
  // быть невалидным JSON (healthJson === null) или контрактно неверным.
  var contractError = validatePipelineHealthContract_(healthJson);
  if (contractError) {
    // Контрактная ошибка — НЕ сетевой сбой (сервер жив и ответил 200), поэтому
    // не требует накопления consecutiveFetchFailures — алертим сразу, как
    // любую другую подтверждённую деградацию.
    return { status: 'degraded', reasons: [contractError], reasonCodes: ['contract_violation'], fetchFailed: false };
  }

  var reasons = [];
  var reasonCodes = [];
  var backup = healthJson.backup || {};
  var sweep = healthJson.sweep || {};

  if (!backup.last_ok_at) {
    reasons.push('backup.last_ok_at отсутствует');
    reasonCodes.push('backup_missing');
  } else if (new Date(backup.last_ok_at).getTime() < now.getTime() - PIPELINE_HEALTH_BACKUP_MAX_AGE_MS_) {
    reasons.push('backup.last_ok_at старше 2ч (' + backup.last_ok_at + ')');
    reasonCodes.push('backup_stale');
  }
  if (backup.integrity_ok === false) {
    reasons.push('backup.integrity_ok = false');
    reasonCodes.push('backup_integrity');
  }
  if (!sweep.last_ok_at) {
    reasons.push('sweep.last_ok_at отсутствует');
    reasonCodes.push('sweep_missing');
  } else if (new Date(sweep.last_ok_at).getTime() < now.getTime() - PIPELINE_HEALTH_SWEEP_MAX_AGE_MS_) {
    reasons.push('sweep.last_ok_at старше 30 минут (' + sweep.last_ok_at + ')');
    reasonCodes.push('sweep_stale');
  }
  if ((healthJson.stuck_leads || 0) > 0) {
    reasons.push('stuck_leads = ' + healthJson.stuck_leads);
    reasonCodes.push('stuck_leads');
  }
  if (healthJson.albato_configured === false) {
    reasons.push('albato_configured = false');
    reasonCodes.push('albato_not_configured');
  }

  return { status: reasons.length === 0 ? 'ok' : 'degraded', reasons: reasons, reasonCodes: reasonCodes, fetchFailed: false };
}

/**
 * C4 (review health #3): system_alert_recipients пуст (владелец мог очистить
 * настройку) — событие не должно уходить в никуда молча. Фолбэк — тот же
 * self-identity паттерн, который уже используется в кодовой базе для
 * "владельца скрипта" (Sheets.gs: Session.getEffectiveUser().getEmail()).
 * Официально: https://developers.google.com/apps-script/reference/base/session#getEffectiveUser()
 * — при обычном запуске (не onEdit/onOpen simple trigger, не web-app "execute
 * as me" для чужого пользователя) возвращает реальный email; пустая строка
 * возможна только при отсутствии доступа к identity — в этом случае фолбэку
 * просто некуда слать, sendNotificationOnce_ логирует и не бросает.
 * @return {string[]}
 */
function resolvePipelineHealthAlertRecipients_(config) {
  if (config.systemAlertRecipients && config.systemAlertRecipients.length) {
    return config.systemAlertRecipients;
  }
  var effectiveEmail = Session.getEffectiveUser().getEmail();
  return effectiveEmail ? [effectiveEmail] : [];
}

/**
 * GAS-обвязка: throttle раз в час, fetch, оценка, алерт/recovery once-per-
 * incident (с ретраем недоставленного письма — C2), журналирование. Никогда
 * не бросает наружу за пределами throttle-проверки — вызывается через
 * runStepSafely_ из tick() (design item6 паттерн), но и сама по себе не
 * должна уронить остальной tick() при отсутствии этой защиты (защитный try
 * вокруг fetch — на случай прямого вызова из теста/другого места).
 */
function checkPipelineHealth_(ss, config, now) {
  var props = PropertiesService.getScriptProperties();
  var lastCheckAt = props.getProperty('pipelineHealthLastCheckAt');
  if (lastCheckAt && now.getTime() - new Date(lastCheckAt).getTime() < PIPELINE_HEALTH_CHECK_INTERVAL_MS_) {
    return; // design: не чаще раза в час
  }

  var url = config.pipelineHealthUrl;
  if (!url) return; // не настроено (пустая строка в «Настройках») — не пытаемся

  var httpStatus = 0;
  var healthJson = null;
  try {
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    httpStatus = response.getResponseCode();
    if (httpStatus === 200) {
      try {
        healthJson = JSON.parse(response.getContentText());
      } catch (parseErr) {
        // C3: тело НЕ распарсилось, но сервер ЖИВ и ответил 200 — это
        // нарушение контракта, а не сетевой сбой (httpStatus остаётся 200,
        // healthJson остаётся null -> validatePipelineHealthContract_ поймает).
        Logger.log('checkPipelineHealth_: JSON.parse ошибка: %s', parseErr);
        healthJson = null;
      }
    }
  } catch (err) {
    // Сетевой уровень (DNS/timeout/и т.п.) — UrlFetchApp бросает независимо
    // от muteHttpExceptions для таких ошибок (не для HTTP-кода ответа).
    Logger.log('checkPipelineHealth_: fetch ошибка: %s', err);
    httpStatus = 0;
    healthJson = null;
  }

  // Счётчик "подряд неудач" должен отражать именно НЕДОСТУПНОСТЬ сети/сервера
  // (httpStatus !== 200), а не контрактные ошибки при живом 200-ответе (C3) —
  // сервер, ответивший 200 с мусором в теле, доказанно ДОСТУПЕН.
  var fetchFailedNow = httpStatus !== 200;
  var prevConsecutiveFailures = parseInt(props.getProperty('pipelineHealthConsecutiveFailures') || '0', 10);
  var consecutiveFailures = fetchFailedNow ? prevConsecutiveFailures + 1 : 0;
  props.setProperty('pipelineHealthConsecutiveFailures', String(consecutiveFailures));
  props.setProperty('pipelineHealthLastCheckAt', now.toISOString());

  var state = evaluatePipelineHealth_(healthJson, httpStatus, now, consecutiveFailures);
  var journal = ss.getSheetByName(SHEET_JOURNAL_);
  var wasDegraded = props.getProperty('pipelineHealthDegraded') === 'true';
  var recipients = resolvePipelineHealthAlertRecipients_(config);

  if (state.status === 'unknown') {
    // C1: недостаточно данных, чтобы решить хоть что-то — НЕ трогаем
    // существующий инцидент (ни алерт, ни recovery).
    return;
  }

  if (state.status === 'degraded') {
    var reasonsSignature = state.reasonCodes.slice().sort().join(',');
    var isNewIncident = !wasDegraded;
    var degradedSince;
    if (isNewIncident) {
      degradedSince = now.toISOString();
      props.setProperty('pipelineHealthDegraded', 'true');
      props.setProperty('pipelineHealthDegradedSince', degradedSince);
      props.setProperty('pipelineHealthReasonsSignature', '');
      appendJournalRow_(journal, now, '', 'pipeline_health_degraded', 'sent', 'internal',
        state.reasons.join('; '), 'pipeline_health:degraded:' + now.getTime());
    } else {
      degradedSince = props.getProperty('pipelineHealthDegradedSince') || now.toISOString();
    }

    // C5: набор причин не изменился с последнего письма по этому инциденту —
    // ретраить нечего нового, но C2 (недоставленный алерт) всё ещё должен
    // повторяться — это делает сам sendNotificationOnce_ по СТАБИЛЬНОМУ ключу
    // ниже (SENT по этому ключу -> skip, FAILED/UNKNOWN -> retry).
    var prevSignature = props.getProperty('pipelineHealthReasonsSignature') || '';
    if (prevSignature !== reasonsSignature) {
      props.setProperty('pipelineHealthReasonsSignature', reasonsSignature);
      if (!isNewIncident) {
        appendJournalRow_(journal, now, '', 'pipeline_health_degraded_update', 'sent', 'internal',
          state.reasons.join('; '), 'pipeline_health:degraded_update:' + now.getTime());
      }
    }

    // C2 (lost alert, Codex P1-6 + review health #2): ключ привязан к
    // инциденту+набору причин, НЕ к моменту тика (now.getTime() менялся бы
    // каждый час) — sendNotificationOnce_/decideSendAction_ (SendLog.gs)
    // сами решают send/skip по журналу: SENT -> skip (не спамим), FAILED ->
    // retry (недоставленное письмо повторяется на СЛЕДУЮЩЕМ часовом тике,
    // а не считается отправленным по факту одной попытки).
    var alertKey = 'pipeline_health_alert:' + degradedSince + ':' + reasonsSignature;
    sendNotificationOnce_(journal, alertKey, '', 'pipeline_health_degraded', 'email',
      recipients, 'CRM: проблема с приёмом заявок',
      'Проверка приёма заявок (pipeline-health) обнаружила ' +
      'проблему с ' + degradedSince + ':\n\n' + state.reasons.join('\n') +
      '\n\nПроверьте резервный воркер (gambarian-lead-cron).');
    return;
  }

  // state.status === 'ok' — единственный путь сюда: доверенный здоровый 200 (C1).
  if (!wasDegraded) return; // и раньше было в порядке — тихо, без письма

  var since = props.getProperty('pipelineHealthDegradedSince') || '';
  var recoveryKey = 'pipeline_health_recovery:' + since;
  var result = sendNotificationOnce_(journal, recoveryKey, '', 'pipeline_health_recovered', 'email',
    recipients, 'CRM: приём заявок восстановлен',
    'Проверка приёма заявок (pipeline-health) снова в порядке. ' +
    'Проблема была с ' + since + '.');
  if (!result.sent) return; // C2: недоставленное recovery-письмо повторяем на следующем тике — инцидент остаётся "активным"

  appendJournalRow_(journal, now, '', 'pipeline_health_recovered', 'sent', 'internal', 'recovered',
    'pipeline_health:recovered:' + now.getTime());
  props.setProperty('pipelineHealthDegraded', 'false');
  props.setProperty('pipelineHealthReasonsSignature', '');
}

// ---- Sheets.gs ----
/**
 * Sheets.gs — setupCrm(): идемпотентно создаёт/чинит структуру таблицы.
 * Design: docs/MINI-CRM-DESIGN.md §2, §3, §4.
 *
 * GAS-only (SpreadsheetApp) — тестируется в Node через структурные фейки
 * (test/helpers/gas-fakes.mjs, test/sheets-protection.test.mjs), не живым API.
 * НЕ ЗАПУСКАЛОСЬ вживую на реальной таблице — README.md §"Проверить перед боем"
 * описывает ручную приёмку.
 */

var SHEET_INTAKE_ = 'Входящие';
var SHEET_LEGACY_INTAKE_ = '2026'; // design §2: переименовать один раз, до подключения Albato
var SHEET_REQUESTS_ = 'Заявки';
var SHEET_SERVICE_ = 'Служебное';
var SHEET_TODAY_ = 'Сегодня';
var SHEET_SUMMARY_ = 'Сводка';
var SHEET_JOURNAL_ = 'Журнал';
// SETTINGS_SHEET_NAME_ определён в Config.gs

/**
 * Владелец 2026-09-23 (задача мини-CRM версии 0.4.0): «Заявки» — только поля
 * офиса, никакой техники ни скрытой, ни свёрнутой. Ровно этот порядок.
 */
var OFFICE_HEADERS_ = [
  '№', 'Статус', 'Получена', 'Имя', 'Телефон', 'Связаться', 'Email', 'Ответственный',
  'Первая попытка', 'Попыток дозвона', 'Следующий шаг',
  'Консультация', 'Причина закрытия', 'Комментарий'
];

// «Заявки» больше не несёт служебных колонок вовсе — REQUESTS_HEADERS_ оставлен
// как имя (используется в тестах/Code.gs), но теперь это ровно OFFICE_HEADERS_.
var REQUESTS_HEADERS_ = OFFICE_HEADERS_;

/**
 * «Заявки»: колонки, которые пишет скрипт (не офис). Владелец 2026-09-23:
 * защита «с предупреждением» — офис ВИДИТ предупреждение при ручной правке, но
 * правка не блокируется (в отличие от «Служебное», которое блокируется жёстко).
 * №,Статус(NOT here — офис сам ставит статус),Получена,Имя,Телефон,Связаться,Email
 * — Статус сознательно не входит (§3.1: "скрипт статус не пишет").
 */
var SCRIPT_WRITTEN_OFFICE_COLUMNS_ = ['№', 'Получена', 'Имя', 'Телефон', 'Связаться', 'Email'];

/**
 * «Служебное» (скрыт, полностью защищён — только владелец скрипта, design §3.2):
 * одна строка на заявку, ключ связи с «Заявками» — №. Технические поля самой
 * заявки (UTM, click-id, landing_path, referrer_host, form_id…) сюда НЕ
 * копируются — они остаются во «Входящих» и берутся по submission_id при
 * необходимости (задача 0.4.0: «не копировать»).
 */
var SERVICE_SHEET_HEADERS_ = [
  '№', 'submission_id', 'все submission_id', 'Контакт состоялся', 'Статус изменён',
  'Договор', 'contact_version', 'Флаги уведомлений', 'Откуда'
];

// Реальный лист «Входящие» уже переименован и живёт — это 24 заголовка A..X в
// этом фиксированном порядке (владелец подтвердил, review находка №3; Albato
// пишет их, lf_hp в маппинг Albato не входит). setupCrm НИКОГДА не переставляет/
// переименовывает/добавляет/удаляет их — см. verifyIntakeHeaders_ ниже, которая
// только СВЕРЯЕТ и репортит расхождение в «Журнал».
var INTAKE_HEADERS_ = [
  'submitted_at', 'submission_id', 'corrects_submission_id', 'name', 'phone', 'email',
  'landing_path', 'referrer_host', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_id',
  'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid', 'fbclid', 'form_id',
  'landing_language', 'event_name', 'source_system', 'schema_version', 'schema_date'
];

var STATUS_OPTIONS_ = [
  'Не дозвонились', 'В работе', 'Консультация назначена', 'Консультация проведена',
  'Клиент — договор', 'Отказ', 'Дубль / спам'
];
var CLOSED_STATUSES_ = ['Клиент — договор', 'Отказ', 'Дубль / спам'];
var CLOSING_REASONS_ = [
  'Не дозвонились (3+)', 'Выбрал другого юриста', 'Дорого', 'Передумал', 'Не наш профиль', 'Другое'
];

var JOURNAL_HEADERS_ = ['Время', 'Заявка №', 'Событие', 'Детали', 'Канал', 'Статус отправки', 'message_id', 'Ключ'];

/**
 * Точка входа из меню/ручного запуска. Идемпотентно: повторный вызов ничего
 * не ломает и не дублирует.
 */
function setupCrm() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID_);
  renameLegacyIntakeSheet_(ss);
  var intake = ensureSheet_(ss, SHEET_INTAKE_);
  var requests = ensureSheet_(ss, SHEET_REQUESTS_);
  var service = ensureSheet_(ss, SHEET_SERVICE_);
  var today = ensureSheet_(ss, SHEET_TODAY_);
  var summary = SUMMARY_SHEET_ENABLED_ ? ensureSheet_(ss, SHEET_SUMMARY_) : null;
  var journal = ensureSheet_(ss, SHEET_JOURNAL_);
  var settings = ensureSheet_(ss, SETTINGS_SHEET_NAME_);

  // «Входящие» — реальный лист Albato: setupCrm его НЕ переставляет/не рвёт
  // (design item3/review №3). ensureHeaderRow_ пишет заголовки только если их
  // ещё вовсе нет (см. hasAny ниже) — на реальном листе они уже есть, поэтому
  // здесь только заводим их при первом создании листа "с нуля" (например, в
  // тестовой копии таблицы), а verifyIntakeHeaders_ сверяет и репортит
  // расхождение, не пытаясь его исправить.
  ensureHeaderRow_(intake, INTAKE_HEADERS_);
  ensureHeaderRow_(requests, REQUESTS_HEADERS_);
  ensureHeaderRow_(service, SERVICE_SHEET_HEADERS_);
  ensureHeaderRow_(journal, JOURNAL_HEADERS_);
  ensureSettingsSheet_(settings);

  formatRequestsSheet_(requests);
  applyRequestsValidation_(requests);
  applyRequestsConditionalFormatting_(requests);
  verifyIntakeHeaders_(intake, journal);
  formatIntakeSheet_(intake);
  protectIntakeSheet_(intake, journal);
  protectOfficeScriptColumns_(requests);
  hideAndProtectServiceSheet_(service);
  protectWholeSheet_(journal, 'Журнал — только для чтения из UI, пишет только скрипт');

  // dashboard round (docs/crm-dashboard/DESIGN.md): «Сегодня» нужен gid «Заявки»
  // для ссылки «Открыть» (§3.3) — берём ЖИВЫМ вызовом, не хардкодим placeholder
  // (тот же приём, что buildRequestRowLink_ в Notifications.gs, design item
  // "resolved at send time" — здесь "resolved at setup time").
  ensureTodayFormulas_(today, requests);
  if (summary) ensureSummaryFormulas_(summary, requests, service);
  // P1 (build-round blocker "data reaches a sheet the office sees"): «Сводка» и
  // «Сегодня» — весь лист только для чтения офисом (design docs/MINI-CRM-DESIGN.md
  // §2 «Защита: весь лист»). Раньше ни один код не защищал их вовсе — любой
  // редактор таблицы мог менять/ломать формулы; «Сегодня» к тому же формируется
  // ЦЕЛИКОМ формулами SORT/FILTER — случайная сортировка/правка офисом здесь
  // разрушает диапазон (P1 "office sheet breaks when sorted/filtered").
  protectOwnerOnlySheet_(today, 'Сегодня — только для чтения офисом, весь лист формулы (design docs/MINI-CRM-DESIGN.md §2)');
  if (summary) protectOwnerOnlySheet_(summary, 'Сводка — только владелец скрипта, весь лист формулы/графики (design docs/MINI-CRM-DESIGN.md §2)');

  Logger.log('setupCrm: готово. Входящие=%s строк, Заявки=%s строк, Служебное=%s строк',
    intake.getLastRow(), requests.getLastRow(), service.getLastRow());
}

function ensureSheet_(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

/**
 * Design §2: «2026» -> «Входящие», но только если «Входящие» ещё нет (переезд
 * один раз, до подключения Albato — после переименование сломает маппинг).
 */
function renameLegacyIntakeSheet_(ss) {
  var alreadyRenamed = !!ss.getSheetByName(SHEET_INTAKE_);
  var legacy = ss.getSheetByName(SHEET_LEGACY_INTAKE_);
  if (legacy && !alreadyRenamed) {
    legacy.setName(SHEET_INTAKE_);
  }
}

function ensureHeaderRow_(sheet, headers) {
  var existing = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  var hasAny = existing.some(function (v) { return v !== ''; });
  if (!hasAny) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  sheet.setFrozenRows(1);
}

/**
 * Пишет дефолты «Настроек» ТОЛЬКО для отсутствующих ключей (не перезаписывает
 * то, что владелец/офис уже поменял руками) — Config.gs buildDefaultSettingsRows_.
 */
function ensureSettingsSheet_(sheet) {
  var lastRow = sheet.getLastRow();
  var existingKeys = {};
  if (lastRow > 0) {
    var data = sheet.getRange(1, 1, lastRow, 1).getValues();
    data.forEach(function (r) { if (r[0]) existingKeys[String(r[0]).trim()] = true; });
  }
  // Живой прогон 2026-09-23: «09:00»/«08:30» таблица превращала во время, и
  // рабочие часы читались как «Sat Dec 30 1899 …» — письма о новых заявках
  // уходили в дайджест даже днём. Значения пишем текстом (апостроф).
  var allRows = buildDefaultSettingsRows_().map(function (row, i) {
    if (i === 0 || typeof row[1] !== 'string' || row[1] === '') return row;
    return [row[0], "'" + row[1], row[2]];
  });
  if (lastRow === 0) {
    sheet.getRange(1, 1, allRows.length, 3).setValues(allRows);
  } else {
    var missing = allRows.slice(1).filter(function (row) { return !existingKeys[row[0]]; });
    if (missing.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, missing.length, 3).setValues(missing);
    }
  }
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 3);
}

/**
 * Читает «Настройки» и возвращает normalizeSettings_() результат для рантайма.
 * Праздники/сокращённые дни — из блоков ниже основной таблицы параметров,
 * начинающихся с маркерных строк 'ПРАЗДНИКИ' / 'СОКРАЩЁННЫЕ ДНИ' в колонке A
 * (создаются вручную владельцем — setupCrm() дефолтов не пишет, список меняется
 * каждый год и не должен жить в коде, design §12.5 соседний принцип "без кода").
 */
function loadConfig_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID_);
  var sheet = ss.getSheetByName(SETTINGS_SHEET_NAME_);
  var rows = sheet.getDataRange().getValues();
  var raw = parseSettingsRows_(rows);
  var hs = readHolidaysAndShortDays_(rows);
  return normalizeSettings_(raw, hs);
}

function readHolidaysAndShortDays_(rows) {
  var holidays = [];
  var shortDays = {};
  var section = null;
  rows.forEach(function (row) {
    var a = String(row[0] || '').trim();
    if (a === 'ПРАЗДНИКИ') { section = 'holidays'; return; }
    if (a === 'СОКРАЩЁННЫЕ ДНИ') { section = 'shortDays'; return; }
    if (!section) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a)) return;
    if (section === 'holidays') holidays.push(a);
    if (section === 'shortDays') shortDays[a] = String(row[1] || '18:00').trim();
  });
  return { holidays: holidays, shortDays: shortDays };
}

function formatRequestsSheet_(sheet) {
  var headerMap = colByHeader_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  // телефон — обычный текст (урок Assuta: "+972…" ломается в число)
  var phoneCol = headerMap['Телефон'] + 1;
  sheet.getRange(2, phoneCol, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('@');
  // задача 0.4.0: технических колонок на «Заявках» больше нет вовсе — прежние
  // setFrozenColumns/hideColumns для "служебного хвоста" убраны, скрывать нечего.
}

/**
 * B6 fix (review gas-runtime #5): раньше диапазон валидации брался как снимок
 * sheet.getMaxRows() НА МОМЕНТ setupCrm() — конечный, фиксированный getRange(row,
 * col, numRows, 1). Реальный Sheets НЕ распространяет data validation на строки,
 * которые появляются ПОСЛЕ создания правила (Albato appendRow, ручная строка
 * офиса) — новая строка молча остаётся без выпадающего списка «Статус»/«Причина
 * закрытия». Открытая A1-нотация "<col>2:<col>" (колонка целиком от строки 2 до
 * конца листа, без верхней границы) — задокументированный способ адресации
 * (Sheet.getRange(a1Notation),
 * https://developers.google.com/apps-script/reference/spreadsheet/sheet#getrangea1notation)
 * и тот же механизм полного столбца, что уже используют формулы этого файла
 * (`'Заявки'!B:B` и т.п.) — такой диапазон не «замораживает» число строк, а
 * растёт вместе с листом, поэтому новые строки автоматически наследуют правило.
 */
function applyRequestsValidation_(sheet) {
  var headerMap = colByHeader_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  var statusColLetter = columnLetter_(headerMap['Статус'] + 1);
  var reasonColLetter = columnLetter_(headerMap['Причина закрытия'] + 1);
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_OPTIONS_, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(statusColLetter + '2:' + statusColLetter).setDataValidation(statusRule);

  var reasonRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CLOSING_REASONS_, true)
    .setAllowInvalid(true) // §4: обязателен для «Отказ», не для всех — не блокируем ввод жёстко
    .build();
  sheet.getRange(reasonColLetter + '2:' + reasonColLetter).setDataValidation(reasonRule);
}

/**
 * Design §4: цвета статусов + "красная рамка" для просроченного/пустого
 * обязательного поля. ВАЖНО (неточность спеки, зафиксировано явно): у
 * ConditionalFormatRuleBuilder нет метода для рамки — только фон и текст
 * (setBackground/setBold/setItalic/setStrikethrough/setFontColor). Рамка
 * заменена на жирный красный фон — см. README "Не реализовано / под вопросом".
 */
function applyRequestsConditionalFormatting_(sheet) {
  var headerMap = colByHeader_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  var lastRow = Math.max(sheet.getMaxRows(), 2);
  var fullRowRange = sheet.getRange(2, 1, lastRow - 1, OFFICE_HEADERS_.length);
  var statusCol = columnLetter_(headerMap['Статус'] + 1);
  var nextStepCol = columnLetter_(headerMap['Следующий шаг'] + 1);

  var rules = [];
  var colorByStatus = {
    'Не дозвонились': '#FFCC80',
    'В работе': '#81D4FA',
    'Консультация назначена': '#CE93D8',
    'Консультация проведена': '#64B5F6',
    'Клиент — договор': '#A5D6A7',
    'Отказ': '#E0E0E0'
  };
  Object.keys(colorByStatus).forEach(function (status) {
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$' + statusCol + '2="' + status + '"')
      .setBackground(colorByStatus[status])
      .setRanges([fullRowRange])
      .build());
  });
  // Боевая таблица 2026-09-24: ISBLANK(статус) красил жёлтым ВСЕ пустые строки
  // листа. «Новая» = есть № и нет статуса.
  var noColLetter = columnLetter_(headerMap['№'] + 1);
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($' + noColLetter + '2<>"",ISBLANK($' + statusCol + '2))')
    .setBackground('#FFF9C4')
    .setRanges([fullRowRange])
    .build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$' + statusCol + '2="Дубль / спам"')
    .setBackground('#E0E0E0')
    .setStrikethrough(true)
    .setRanges([fullRowRange])
    .build());
  // просроченный "Следующий шаг" у открытой заявки -> красный акцент (замена рамки)
  var closedList = "{" + CLOSED_STATUSES_.map(function (s) { return '"' + s + '"'; }).join(';') + "}";
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($' + nextStepCol + '2<>"",$' + nextStepCol + '2<TODAY(),COUNTIF(' + closedList + ',$' + statusCol + '2)=0)')
    .setBackground('#FFCDD2')
    .setBold(true)
    .setRanges([fullRowRange])
    .build());
  sheet.setConditionalFormatRules(rules);
}

/**
 * B1a fix (Codex P1-7): реальный новый лист Google Sheets — 26 колонок (A:Z);
 * Sheet.getRange()/hideColumns() за пределами текущего Sheet.getMaxColumns()
 * бросают исключение времени выполнения (документированного точного текста
 * нет — https://developers.google.com/apps-script/reference/spreadsheet/sheet#getrangerow,-column,-numrows,-numcolumns
 * не описывает граничное поведение явно, но оно наблюдаемо и воспроизводимо,
 * см. например https://github.com/mogsdad/SheetConverter/issues/20 —
 * "Those columns are out of bounds"). insertColumnsAfter()/getMaxColumns() —
 * задокументированный официальный способ раздвинуть грид ПЕРЕД обращением
 * (https://developers.google.com/apps-script/reference/spreadsheet/sheet#insertcolumnsafterafterposition,-howmany,
 * https://developers.google.com/apps-script/reference/spreadsheet/sheet#getmaxcolumns).
 */
function ensureMinColumns_(sheet, minColumns) {
  var current = sheet.getMaxColumns();
  if (current < minColumns) {
    sheet.insertColumnsAfter(current, minColumns - current);
  }
}

/**
 * B1d fix: merge() на диапазоне, который УЖЕ является частью существующего
 * merge (например, при повторной сборке после частично упавшего setupCrm()),
 * — поведение официально не описано (Class Range,
 * https://developers.google.com/apps-script/reference/spreadsheet/range не
 * документирует повторный merge того же диапазона). Range.isPartOfMerge() —
 * задокументированный метод именно для такой проверки
 * (https://developers.google.com/apps-script/reference/spreadsheet/range#ispartofmerge),
 * поэтому merge() вызывается только если диапазон ещё не смёржен — это делает
 * восстановление частично собранного дашборда (см. ensureTodayFormulas_/
 * ensureSummaryFormulas_) безопасным.
 */
function mergeOnce_(range) {
  if (!range.isPartOfMerge()) range.merge();
  return range;
}

function columnLetter_(colIndex1based) {
  var s = '';
  var n = colIndex1based;
  while (n > 0) {
    var rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * Design §2/§5.1: «Входящие» — весь лист защищён, редакторы только аккаунт
 * Albato и владелец скрипта. Аккаунт Albato читается из «Настроек» ключа
 * albato_editor_email (review находка №5: ровно одно место хранения — строка
 * «Настроек», её пустой дефолт заводит setupCrm через DEFAULT_SETTINGS_).
 *
 * Review находка №5, вторая часть: если albato_editor_email ещё не заполнен,
 * жёсткая защита (только владелец скрипта редактор) заблокирует ЖИВОЙ Albato
 * молча — лид потеряется. Поэтому пока ключ пуст, защита переводится в режим
 * предупреждения (Protection.setWarningOnly(true) — "every user can edit data
 * in the area, except editing prompts a warning", см.
 * https://developers.google.com/apps-script/reference/spreadsheet/protection#setwarningonlywarningonly),
 * и в «Журнал» пишется предупреждение. Как только email заполнен — защита
 * снова жёсткая (setWarningOnly(false), редактор — только владелец + Albato).
 */
function protectIntakeSheet_(sheet, journal) {
  var protection = getOrCreateSheetProtection_(sheet);
  protection.setDescription('Входящие — только Albato и владелец скрипта (design §2)');
  var albatoEmail = readSingleSetting_('albato_editor_email');
  var owner = Session.getEffectiveUser().getEmail(); // review №4: может быть '' без scope userinfo.email
  // Живой прогон №2 2026-09-23: на защите «только предупреждение» Google
  // запрещает и setDomainEdit (как removeEditor) — сначала режим, потом
  // редакторы и домен, и только для жёсткой защиты.
  if (albatoEmail) {
    protection.setWarningOnly(false);
    resetEditorsTo_(protection, [owner, albatoEmail]);
    if (protection.canDomainEdit()) protection.setDomainEdit(false);
  } else {
    protection.setWarningOnly(true);
    if (journal) {
      appendJournalRow_(journal, new Date(), '', 'setup_warning', 'sent', 'internal',
        'albato_editor_email пуст — «Входящие» защищены в режиме предупреждения (не жёстко), ' +
        'заполните строку в «Настройки» перед подключением Albato', 'setup_warning:albato_editor_email');
    }
  }
}

function protectWholeSheet_(sheet, description) {
  var protection = getOrCreateSheetProtection_(sheet);
  protection.setDescription(description);
}

/**
 * Задача 0.4.0: «Служебное» — весь лист скрыт и полностью защищён, только
 * владелец скрипта (design §3.2, аналог «Входящие», но без исключения для
 * Albato — этот лист пишет только сам скрипт). В отличие от protectWholeSheet_
 * (используется для «Журнал» и НЕ ограничивает редакторов) — здесь редакторы
 * жёстко сведены к владельцу скрипта, симметрично protectServiceColumns_ из
 * версии 0.3.0 (review находка №1: removeEditors без addEditors оставлял
 * список пустым — здесь та же защита через resetEditorsTo_).
 */
function hideAndProtectServiceSheet_(sheet) {
  sheet.hideSheet();
  var protection = getOrCreateSheetProtection_(sheet);
  protection.setDescription('Служебное — весь лист скрыт, только владелец скрипта (design §3.2)');
  resetEditorsTo_(protection, [Session.getEffectiveUser().getEmail()]);
  if (protection.canDomainEdit()) protection.setDomainEdit(false);
}

/**
 * Dashboard build-round P1 ("data reaches a sheet the office sees" / "office
 * sheet breaks when sorted/filtered"): весь лист — только владелец скрипта
 * может редактировать; ВИДЕТЬ лист (открыть вкладку) остальные редакторы
 * таблицы по-прежнему могут — Protection ограничивает РЕДАКТИРОВАНИЕ, не
 * видимость вкладки (для этого нужно скрытие, как у «Служебное» — здесь НЕ
 * скрываем: «Сводка»/«Сегодня» должны быть видимыми вкладками для владельца/
 * офиса соответственно, design docs/MINI-CRM-DESIGN.md §2). В отличие от
 * protectWholeSheet_ (используется для «Журнал» и НЕ ограничивает редакторов
 * вовсе) — здесь редакторы жёстко сведены к владельцу скрипта, тот же паттерн,
 * что hideAndProtectServiceSheet_, без hideSheet().
 */
function protectOwnerOnlySheet_(sheet, description) {
  var protection = getOrCreateSheetProtection_(sheet);
  protection.setDescription(description);
  resetEditorsTo_(protection, [Session.getEffectiveUser().getEmail()]);
  if (protection.canDomainEdit()) protection.setDomainEdit(false);
}

/**
 * Задача 0.4.0 (заменяет protectServiceColumns_ версии 0.3.0 — служебных
 * колонок на «Заявках» больше нет вовсе, они переехали на «Служебное»):
 * колонки, которые пишет скрипт (№, Получена, Имя, Телефон, Связаться, Email),
 * защищены «с предупреждением» — офис ВИДИТ предупреждение о ручной правке, но
 * правка НЕ блокируется (в отличие от жёсткой защиты «Служебное»). Остальные
 * колонки (Статус, Первая попытка, Попыток дозвона, Следующий шаг, Консультация,
 * Причина закрытия, Комментарий) — редактируются свободно, без защиты.
 *
 * Соседние по заголовку колонки группируются в один диапазон защиты (например
 * Получена..Email — 5 колонок подряд), чтобы не плодить по одной защите на
 * колонку — get-or-create по description, идемпотентно (review находка №9,
 * тот же паттерн, что и раньше).
 */
function protectOfficeScriptColumns_(sheet) {
  var headerMap = colByHeader_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  var owner = Session.getEffectiveUser().getEmail();
  var colIndexes = SCRIPT_WRITTEN_OFFICE_COLUMNS_
    .map(function (h) { return headerMap[h] + 1; })
    .sort(function (a, b) { return a - b; });
  var blocks = groupContiguousColumns_(colIndexes);
  blocks.forEach(function (block) {
    var startCol = block[0];
    var numCols = block.length;
    var description = 'Заявки: скрипт пишет колонки ' + columnLetter_(startCol) +
      (numCols > 1 ? ':' + columnLetter_(startCol + numCols - 1) : '') +
      ' — предупреждение при ручной правке (design задача 0.4.0)';
    var protection = getOrCreateRangeProtectionByDescription_(sheet, description, function () {
      return sheet.getRange(2, startCol, Math.max(sheet.getMaxRows() - 1, 1), numCols);
    });
    protection.setDescription(description);
    protection.setWarningOnly(true);
    resetEditorsTo_(protection, [owner]);
  });
}

/** Группирует отсортированные 1-based индексы колонок в блоки подряд идущих. */
function groupContiguousColumns_(sortedIndexes) {
  var blocks = [];
  var current = [];
  sortedIndexes.forEach(function (idx) {
    if (current.length && idx !== current[current.length - 1] + 1) {
      blocks.push(current);
      current = [];
    }
    current.push(idx);
  });
  if (current.length) blocks.push(current);
  return blocks;
}

function getOrCreateSheetProtection_(sheet) {
  var protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
  return protections.length ? protections[0] : sheet.protect();
}

/**
 * Review находка №9: get-or-create RANGE-защиты по description, а не
 * безусловный range.protect() при каждом вызове (иначе повторный setupCrm()
 * плодит дубли защиты того же диапазона).
 * @param {Sheet} sheet
 * @param {string} description
 * @param {function(): Range} makeRange вызывается только если защиты ещё нет
 */
function getOrCreateRangeProtectionByDescription_(sheet, description, makeRange) {
  var existing = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).filter(function (p) {
    return p.getDescription() === description;
  });
  if (existing.length) return existing[0];
  return makeRange().protect();
}

/**
 * Review находки №1/№4: снимает всех текущих редакторов и ставит РОВНО
 * переданный список, никогда не вызывая addEditors с '' (пустой email —
 * например Session.getEffectiveUser().getEmail() без scope userinfo.email,
 * см. https://developers.google.com/apps-script/reference/base/session).
 * @param {Protection} protection
 * @param {string[]} emails
 */
function resetEditorsTo_(protection, emails) {
  // Живой прогон 2026-09-23 (приватная копия таблицы): у защиты «только
  // предупреждение» Google не даёт менять редакторов — removeEditor/addEditor
  // бросают исключение, и setupCrm падал на protectOfficeScriptColumns_.
  // Список редакторов у такой защиты не действует — пропускаем.
  if (protection.isWarningOnly()) return;
  var valid = (emails || []).filter(function (e) { return !!e; });
  // Установка 2026-09-24 на боевой таблице (скрипт запускает редактор, не
  // владелец): «Вы не можете удалить себя из списка редакторов». Поэтому
  // сначала добавляем нужных (как в примере Google: текущий пользователь
  // должен остаться редактором), затем убираем остальных ПО ОДНОМУ, никогда
  // не себя; тех, кого Google убрать не даёт (владелец таблицы), пропускаем.
  if (valid.length) protection.addEditors(valid);
  var keep = {};
  valid.forEach(function (e) { keep[String(e).toLowerCase()] = true; });
  var me = Session.getEffectiveUser().getEmail();
  if (me) keep[String(me).toLowerCase()] = true;
  protection.getEditors().forEach(function (user) {
    var email = String(user.getEmail ? user.getEmail() : user).toLowerCase();
    if (!email || keep[email]) return;
    try { protection.removeEditor(user); } catch (e) { /* владелец таблицы — Google не даёт убрать */ }
  });
}

/**
 * Design §2 review находка №3: сверяет реальные заголовки «Входящие» (Albato
 * пишет их через Sheets API, порядок и состав задаёт сценарий bundle 389466,
 * НЕ этот код) с INTAKE_HEADERS_ и репортит расхождение в «Журнал» — НИКОГДА
 * не переставляет/не переименовывает/не дописывает колонки сама.
 * @return {string[]} описания расхождений (пусто — заголовки совпадают)
 */
function verifyIntakeHeaders_(sheet, journal) {
  var lastCol = sheet.getLastColumn();
  var actual = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  var diff = diffHeaderLists_(actual, INTAKE_HEADERS_);
  if (diff.length && journal) {
    appendJournalRow_(journal, new Date(), '', 'intake_headers_mismatch', 'sent', 'internal',
      diff.join('; '), 'setup_warning:intake_headers');
  }
  return diff;
}

/**
 * Чистое позиционное сравнение заголовков (A, B, C… — порядок важен, «Входящие»
 * не переставляем). Тестируется без листов/фейков.
 * @param {Array} actual
 * @param {string[]} expected
 * @return {string[]}
 */
function diffHeaderLists_(actual, expected) {
  var diffs = [];
  var len = Math.max((actual || []).length, expected.length);
  for (var i = 0; i < len; i++) {
    var a = actual && actual[i] !== undefined && actual[i] !== null ? String(actual[i]).trim() : '';
    var e = expected[i] === undefined ? '' : expected[i];
    if (a !== e) {
      diffs.push('колонка ' + columnLetter_(i + 1) + ': ожидали "' + e + '", в листе "' + a + '"');
    }
  }
  return diffs;
}

/**
 * Design item3 review: «Плейн-текст» на A:X «Входящие», идемпотентно
 * (setNumberFormat безопасно вызывать повторно с тем же форматом).
 */
function formatIntakeSheet_(sheet) {
  sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), INTAKE_HEADERS_.length).setNumberFormat('@');
}

function readSingleSetting_(key) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID_);
  var sheet = ss.getSheetByName(SETTINGS_SHEET_NAME_);
  if (!sheet) return null;
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === key) return rows[i][1] || null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Дашборд «Сегодня»/«Сводка» — docs/crm-dashboard/DESIGN.md §2-§5.
// ---------------------------------------------------------------------------

/**
 * «Сегодня»: строит ссылку «Открыть →» на строку «Заявки» для КАЖДОЙ строки
 * динамического QUERY-блока одной ARRAYFORMULA (design §3.3).
 *
 * Design §3.3 в исходном виде даёт HYPERLINK КАК ТЕКСТОВУЮ СТРОКУ, собранную
 * конкатенацией (`"=HYPERLINK(...)"`) — исправлено здесь: результат вычисленной
 * формулы (в т.ч. QUERY/ARRAYFORMULA) НИКОГДА не перепарсивается как новая
 * формула Google Sheets (парсинг ведущего "=" — только для значений, введённых
 * напрямую/через API setValue, не для ВЫВОДА других формул), поэтому строковый
 * вариант просто показал бы буквальный текст "=HYPERLINK(...)", а не кликабельную
 * ссылку. Здесь HYPERLINK() — НАСТОЯЩИЙ вложенный вызов функции внутри
 * ARRAYFORMULA, не строка.
 *
 * gid листа «Заявки» — из requestsSheetId, переданного ЖИВЫМ вызовом
 * requestsSheet.getSheetId() в момент setupCrm() (design item "resolved at
 * install time"), не хардкожен как `<GID_ЗАЯВКИ>`-плейсхолдер.
 * @param {string} anchorRange например "A5:A14" — диапазон, куда спиллится №
 *   из QUERY-блока этого раздела
 * @param {number} requestsSheetId
 */
function buildOpenLinkArrayFormula_(anchorRange, requestsSheetId) {
  var base = 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID_ + '/edit#gid=' + requestsSheetId + '&range=A';
  return '=ARRAYFORMULA(IFERROR(IF(' + anchorRange + '="","",HYPERLINK("' + base + '"&MATCH(' + anchorRange +
    ',\'' + SHEET_REQUESTS_ + '\'!A:A,0)&":N"&MATCH(' + anchorRange + ',\'' + SHEET_REQUESTS_ + '\'!A:A,0),"Открыть →")),""))';
}

/** Один информационный блок «Сегодня»: заголовок + подзаголовки + QUERY + ссылка «Открыть». design §3.2/§3.3. */
// B2 fix (Codex P1-8, "spilled arrays collide with fixed cells"): запас на блок
// поднят с 10 до 200 строк — QUERY-спилл одного блока (например «Новые», если
// накопится больше 10 необработанных заявок) раньше долетал до заголовка
// следующего блока и ломал оба (Sheets: "Array result was not expanded because
// it would overwrite data"). Позиции заголовков блоков ниже (см.
// ensureTodayFormulas_) пересчитаны с учётом этого запаса, чтобы ни один блок
// не мог задеть следующий вплоть до 200 заявок в блоке.
var TODAY_BLOCK_CAPACITY_ = 200;

function buildTodayBlock_(sheet, headerRow, headerText, subheads, queryFormula, requestsSheetId) {
  mergeOnce_(sheet.getRange(headerRow, 1, 1, 4)).setValue(headerText);
  sheet.getRange(headerRow + 1, 1, 1, 4).setValues([subheads]);
  var dataRow = headerRow + 2;
  sheet.getRange(dataRow, 1).setFormula(queryFormula);
  // B2 fix, вторая часть: якорь ссылки «Открыть» раньше был жёстко ограничен
  // TODAY_BLOCK_DATA_ROWS_=10 строками независимо от фактического размера
  // QUERY — заявки за пределами первых 10 молча оставались без ссылки. Теперь
  // якорь покрывает ВСЮ ёмкость блока; buildOpenLinkArrayFormula_ уже
  // оборачивает результат в IF(anchorRange="","",...), поэтому пустой хвост
  // диапазона безопасен.
  var anchorRange = columnLetter_(1) + dataRow + ':' + columnLetter_(1) + (dataRow + TODAY_BLOCK_CAPACITY_ - 1);
  sheet.getRange(dataRow, 4).setFormula(buildOpenLinkArrayFormula_(anchorRange, requestsSheetId));
  return dataRow;
}

/**
 * Design §3: «Сегодня» — единый приоритизированный to-do офиса (не сводка
 * метрик): три блока сверху вниз — Просрочено / Новые / Консультации сегодня,
 * каждый — SORT+FILTER (реализовано через QUERY … order by, эквивалентно и
 * устойчивее к позиционному "Col.." именованию, уже принятому в этом файле)
 * плюс ссылка «Открыть →» на строку «Заявки» (§3.3, buildOpenLinkArrayFormula_).
 * design §3.4: заливка заголовков блоков — статичная (не завязана на значение
 * ячейки, поэтому setBackground, не conditional format rule — CF ниже, в
 * ensureSummaryFormulas_, применяется там, где заливка ДЕЙСТВИТЕЛЬНО зависит
 * от значения).
 * @param {Sheet} requestsSheet лист «Заявки» — для gid ссылки «Открыть» (§3.3)
 */
// B2 fix: позиции блоков раздвинуты на TODAY_BLOCK_CAPACITY_(200) строк вместо
// прежних 10, чтобы спилл QUERY одного блока не мог задеть заголовок
// следующего (см. buildTodayBlock_/TODAY_BLOCK_CAPACITY_ выше).
var TODAY_HEADER_ROW_OVERDUE_ = 3;
var TODAY_HEADER_ROW_NEW_ = TODAY_HEADER_ROW_OVERDUE_ + 2 + TODAY_BLOCK_CAPACITY_ + 1; // 206
var TODAY_HEADER_ROW_CONSULT_ = TODAY_HEADER_ROW_NEW_ + 2 + TODAY_BLOCK_CAPACITY_ + 1; // 409

function ensureTodayFormulas_(sheet, requestsSheet) {
  var alreadyBuilt = !!sheet.getRange(1, 1).getValue();
  var requestsSheetId = requestsSheet.getSheetId();

  // B3 fix (review sheet-robustness №2): колонки «Заявки» раньше резолвились
  // по СТАТИЧЕСКОМУ OFFICE_HEADERS_.indexOf(...), а не по факту реальной
  // строки заголовков листа — переставь/вставь офис колонку вручную, и
  // Col-индексы QUERY/адреса тихо съезжали бы на чужие данные. Теперь читаем
  // заголовки ЖИВЫМ вызовом (design "resolved at install time", тот же приём,
  // что уже применён для requestsSheetId ниже).
  var reqHeaderMap = colByHeader_(requestsSheet.getRange(1, 1, 1, requestsSheet.getLastColumn()).getValues()[0]);
  var noCol = 'Col' + (reqHeaderMap['№'] + 1);
  var statusCol = 'Col' + (reqHeaderMap['Статус'] + 1);
  var receivedCol = 'Col' + (reqHeaderMap['Получена'] + 1);
  var nameCol = 'Col' + (reqHeaderMap['Имя'] + 1);
  var phoneCol = 'Col' + (reqHeaderMap['Телефон'] + 1);
  var nextStepCol = 'Col' + (reqHeaderMap['Следующий шаг'] + 1);
  var consultCol = 'Col' + (reqHeaderMap['Консультация'] + 1);
  var noColLetter = columnLetter_(reqHeaderMap['№'] + 1);
  var statusColLetter = columnLetter_(reqHeaderMap['Статус'] + 1);
  var nextStepColLetter = columnLetter_(reqHeaderMap['Следующий шаг'] + 1);
  var consultColLetter = columnLetter_(reqHeaderMap['Консультация'] + 1);
  var lastColLetter = columnLetter_(requestsSheet.getLastColumn());
  var reqRange = "'" + SHEET_REQUESTS_ + "'!A2:" + lastColLetter;
  var notClosed = statusCol + ' <> \'Клиент — договор\' and ' +
    statusCol + ' <> \'Отказ\' and ' + statusCol + ' <> \'Дубль / спам\'';

  var overdueQuery = '=IFERROR(QUERY(' + reqRange + ',"select ' + noCol + ',' + nameCol + ',' + nextStepCol +
    ' where ' + nextStepCol + ' < date \'"&TEXT(TODAY(),"yyyy-MM-dd")&"\' and ' + nextStepCol + ' is not null and ' +
    notClosed + ' order by ' + nextStepCol + ' asc limit ' + TODAY_BLOCK_CAPACITY_ + '",0),"")';
  // Установка 2026-09-24 на боевой таблице: без условия «№ не пуст» под «статус
  // пуст» попадали все ~1000 пустых строк листа, результат не помещался в блок и
  // показывал #REF! (перекрывал следующий блок). limit — та же защита для всех блоков.
  var newQuery = '=IFERROR(QUERY(' + reqRange + ',"select ' + noCol + ',' + nameCol + ',' + phoneCol +
    ' where (' + statusCol + ' = \'\' or ' + statusCol + ' is null) and ' + noCol + ' <> \'\'' +
    ' order by ' + receivedCol + ' asc limit ' + TODAY_BLOCK_CAPACITY_ + '",0),"")';
  var consultQuery = '=IFERROR(QUERY(' + reqRange + ',"select ' + noCol + ',' + nameCol + ',' + consultCol +
    ' where ' + consultCol + ' >= date \'"&TEXT(TODAY(),"yyyy-MM-dd")&"\' and ' + consultCol +
    ' < date \'"&TEXT(TODAY()+1,"yyyy-MM-dd")&"\' order by ' + consultCol + ' asc limit ' + TODAY_BLOCK_CAPACITY_ + '",0),"")';

  // Лист уже построен (повторный setupCrm) — обновляем только три формулы блоков.
  if (alreadyBuilt) {
    sheet.getRange(TODAY_HEADER_ROW_OVERDUE_ + 2, 1).setFormula(overdueQuery);
    sheet.getRange(TODAY_HEADER_ROW_NEW_ + 2, 1).setFormula(newQuery);
    sheet.getRange(TODAY_HEADER_ROW_CONSULT_ + 2, 1).setFormula(consultQuery);
    return;
  }

  // Блок 1: Просрочено
  buildTodayBlock_(sheet, TODAY_HEADER_ROW_OVERDUE_, '🔴 ПРОСРОЧЕНО — следующий шаг прошёл',
    ['№', 'Имя', 'Шаг был', 'Открыть'], overdueQuery, requestsSheetId);
  sheet.getRange(TODAY_HEADER_ROW_OVERDUE_, 1, 1, 4).setBackground('#FFCDD2'); // design §3.4 — тот же красный, что overdue в «Заявках»

  // Блок 2: Новые — ждут первой попытки
  buildTodayBlock_(sheet, TODAY_HEADER_ROW_NEW_, '🟡 НОВЫЕ — ждут первой попытки',
    ['№', 'Имя', 'Телефон', 'Открыть'], newQuery, requestsSheetId);
  sheet.getRange(TODAY_HEADER_ROW_NEW_, 1, 1, 4).setBackground('#FFF9C4'); // design §3.4 — тот же жёлтый, что «Новая» в «Заявках»

  // Блок 3: Консультации сегодня
  buildTodayBlock_(sheet, TODAY_HEADER_ROW_CONSULT_, '🟣 КОНСУЛЬТАЦИИ СЕГОДНЯ',
    ['№', 'Имя', 'Время', 'Открыть'], consultQuery, requestsSheetId);
  sheet.getRange(TODAY_HEADER_ROW_CONSULT_, 1, 1, 4).setBackground('#CE93D8'); // design §3.4 — тот же сиреневый, что «Консультация назначена»

  // design §3.3: A1 — счётчик-баннер, переиспользует те же условия, что и блоки
  // выше. B1d fix (Codex P1-7 "recover a partially built dashboard"): баннер
  // пишется ПОСЛЕДНИМ — если построение блока выше упадёт с исключением, A1
  // останется пустым и следующий вызов setupCrm() перестроит «Сегодня» с нуля
  // (см. ранний return выше), а не тихо решит, что лист уже готов.
  // B4 fix ("new-leads counter counts empty rows of a whole column"):
  // COUNTIFS(Статус:Статус,"") раньше считал ВСЕ пустые ячейки колонки на всю
  // высоту листа (типично 1000 строк) — то есть счётчик «новых» включал
  // сотни пустых строк без единой реальной заявки. Условие "№ не пусто"
  // ограничивает счёт настоящими строками (№ пишет скрипт для каждой
  // реальной заявки, design item3/SCRIPT_WRITTEN_OFFICE_COLUMNS_).
  var overdueCond = '\'' + SHEET_REQUESTS_ + '\'!' + nextStepColLetter + ':' + nextStepColLetter;
  var consultCond = '\'' + SHEET_REQUESTS_ + '\'!' + consultColLetter + ':' + consultColLetter;
  var noCond = '\'' + SHEET_REQUESTS_ + '\'!' + noColLetter + ':' + noColLetter;
  var statusCond = '\'' + SHEET_REQUESTS_ + '\'!' + statusColLetter + ':' + statusColLetter;
  mergeOnce_(sheet.getRange(1, 1, 1, 4)).setFormula(
    '="Сегодня: "&COUNTIFS(' + overdueCond + ',"<"&TODAY(),' + overdueCond + ',"<>")&' +
    '" просрочки · "&COUNTIFS(' + noCond + ',"<>",' + statusCond + ',"")&' +
    '" новых · "&COUNTIFS(' + consultCond + ',">="&TODAY(),' + consultCond + ',"<"&(TODAY()+1))&' +
    '" консультация(й)"'
  );
}

// --- Сводка (владелец) ------------------------------------------------------

var SUMMARY_CHART_DATA_ROW_DATES_ = 1;   // T1:AG1 — 14 дат
var SUMMARY_CHART_DATA_ROW_DAILY_ = 2;   // T2:AG2 — счёт по дням (14 дней)
var SUMMARY_CHART_DATA_ROW_WEEKLY_ = 3;  // T3:AA3 — счёт по неделям (8 недель)
var SUMMARY_CHART_DATA_ROW_FUNNEL_ = 5;  // T5:T8  — воронка, 4 значения (вертикально)
// B5 fix (review gas-runtime #3, "fixed undersized addRange for open-ended
// QUERY categories"): «Откуда» — открытый список источников (не фиксированный
// enum вроде статусов/причин закрытия), поэтому у него отдельная явная ёмкость
// с запасом, а не жёстко "2 категории". B2 fix (Codex P1-8, "T15 reasons vs
// T20"): интервалы между T10/REASONS/STATUSMIX пересчитаны так, чтобы спилл
// QUERY одного блока (в пределах его капасити) не долетал до начала соседнего
// — раньше REASONS (T15) и STATUSMIX (T20) стояли впритык: 6 возможных причин
// закрытия (CLOSING_REASONS_.length) спиллятся ровно в T20, где стартует
// QUERY статус-микса ("Array result was not expanded because it would
// overwrite data").
var SUMMARY_SOURCES_CAPACITY_ = 15;
var SUMMARY_CHART_DATA_ROW_SOURCES_ = 10;   // T10:U24 — QUERY источников (запас)
var SUMMARY_CHART_DATA_ROW_REASONS_ = 26;   // T26:U(26+CLOSING_REASONS_.length-1) — причины отказа
var SUMMARY_STATUSMIX_CAPACITY_ = (STATUS_OPTIONS_.length - CLOSED_STATUSES_.length) + 1; // открытые статусы + запас
var SUMMARY_CHART_DATA_ROW_STATUSMIX_ = 33; // T33:U(33+capacity-1) — срез статусов сейчас

/**
 * Пишет скрытые данные графиков (T:AH) — design §2.6. Однострочные
 * ARRAYFORMULA/QUERY, без ручного копирования.
 * B1a fix: столбцы T:AH (20-34) — за пределами 26-колоночного грида нового
 * листа, поэтому вызывающая сторона (ensureSummaryFormulas_) обязана вызвать
 * ensureMinColumns_ ДО этой функции.
 * B3 fix: колонки «Заявки»/«Служебное» резолвятся по РЕАЛЬНОЙ строке
 * заголовков этих листов (requestsSheet/serviceSheet), а не по статическому
 * OFFICE_HEADERS_/SERVICE_SHEET_HEADERS_.indexOf(...).
 */
function writeSummaryChartData_(sheet, requestsSheet, serviceSheet) {
  var t = 20; // колонка T
  var req = "'" + SHEET_REQUESTS_ + "'!";
  var svc = "'" + SHEET_SERVICE_ + "'!";
  var reqHeaderMap = colByHeader_(requestsSheet.getRange(1, 1, 1, requestsSheet.getLastColumn()).getValues()[0]);
  var svcHeaderMap = colByHeader_(serviceSheet.getRange(1, 1, 1, serviceSheet.getLastColumn()).getValues()[0]);
  var receivedColLetter = columnLetter_(reqHeaderMap['Получена'] + 1);
  var firstAttemptColLetter = columnLetter_(reqHeaderMap['Первая попытка'] + 1);
  var consultColLetter = columnLetter_(reqHeaderMap['Консультация'] + 1);
  var reasonColLetter = columnLetter_(reqHeaderMap['Причина закрытия'] + 1);
  var contractColLetter = columnLetter_(svcHeaderMap['Договор'] + 1);
  var sourceColLetter = columnLetter_(svcHeaderMap['Откуда'] + 1);
  var statusColLetter = columnLetter_(reqHeaderMap['Статус'] + 1);

  // T1: 14 дат (сегодня и 13 дней до)
  sheet.getRange(SUMMARY_CHART_DATA_ROW_DATES_, t).setFormula(
    '=ARRAYFORMULA(TODAY()-13+SEQUENCE(1,14,0,1))'
  );
  // T2: счёт заявок по каждому из этих 14 дней
  sheet.getRange(SUMMARY_CHART_DATA_ROW_DAILY_, t).setFormula(
    '=ARRAYFORMULA(MAP(' + columnLetter_(t) + SUMMARY_CHART_DATA_ROW_DATES_ + ':' + columnLetter_(t + 13) + SUMMARY_CHART_DATA_ROW_DATES_ +
    ',LAMBDA(d,COUNTIFS(' + req + receivedColLetter + ':' + receivedColLetter + ',">="&d,' + req + receivedColLetter + ':' + receivedColLetter + ',"<"&d+1))))'
  );
  // T3: счёт по неделям (8 недель, старая -> новая). B4 fix ("the weekly
  // series slides by days not weeks"): SEQUENCE(1,8,7,-1) раньше давало
  // daysAgo = 7,6,5,...,0 — соседние окна COUNTIFS сдвигались на 1 ДЕНЬ, а не
  // на 7, то есть 8 значений были почти полностью перекрывающимися 7-дневными
  // окнами вместо 8 РАЗНЫХ недель. Формула ниже — та же, что в самом design-
  // документе (docs/crm-dashboard/DESIGN.md §2.6, строка "T3 (счёт по
  // неделям...)"): SEQUENCE(1,8,0,-1) даёт w = 0,-1,-2,...,-7, и окно
  // [TODAY()-7*(1-w)-7, TODAY()-7*(1-w)) сдвигается РОВНО на 7 дней между
  // соседними значениями w — 8 непересекающихся календарных недель.
  sheet.getRange(SUMMARY_CHART_DATA_ROW_WEEKLY_, t).setFormula(
    '=ARRAYFORMULA(MAP(SEQUENCE(1,8,0,-1),LAMBDA(w,COUNTIFS(' + req + receivedColLetter + ':' + receivedColLetter +
    ',">="&(TODAY()-7*(1-w)-7),' + req + receivedColLetter + ':' + receivedColLetter + ',"<"&(TODAY()-7*(1-w))))))'
  );
  // T5:T8: воронка (Заявки/Первая попытка/Консультация/Договор), 30 дней, вертикально
  sheet.getRange(SUMMARY_CHART_DATA_ROW_FUNNEL_, t, 4, 1).setFormulas([
    ['=COUNTIFS(' + req + receivedColLetter + ':' + receivedColLetter + ',">="&(TODAY()-30))'],
    ['=COUNTIFS(' + req + receivedColLetter + ':' + receivedColLetter + ',">="&(TODAY()-30),' + req + firstAttemptColLetter + ':' + firstAttemptColLetter + ',"<>")'],
    ['=COUNTIFS(' + req + receivedColLetter + ':' + receivedColLetter + ',">="&(TODAY()-30),' + req + consultColLetter + ':' + consultColLetter + ',"<>")'],
    ['=COUNTIFS(' + svc + contractColLetter + ':' + contractColLetter + ',">="&(TODAY()-30))']
  ]);
  // T10: источники (Служебное!Откуда), сгруппированные
  sheet.getRange(SUMMARY_CHART_DATA_ROW_SOURCES_, t).setFormula(
    '=IFERROR(QUERY(' + svc + sourceColLetter + '2:' + sourceColLetter +
    ',"select Col1, count(Col1) where Col1 is not null group by Col1 order by count(Col1) desc",0),"")'
  );
  // T26: причины отказа (Заявки!Причина закрытия), по убыванию
  sheet.getRange(SUMMARY_CHART_DATA_ROW_REASONS_, t).setFormula(
    '=IFERROR(QUERY(' + req + reasonColLetter + '2:' + reasonColLetter +
    ',"select Col1, count(Col1) where Col1 is not null group by Col1 order by count(Col1) desc",0),"")'
  );
  // T33: срез статусов сейчас (только открытые — design §2.4 чарт 5 исключает закрытые)
  sheet.getRange(SUMMARY_CHART_DATA_ROW_STATUSMIX_, t).setFormula(
    '=IFERROR(QUERY(' + req + statusColLetter + '2:' + statusColLetter +
    ',"select Col1, count(Col1) where Col1 is not null and Col1 <> \'Клиент — договор\' and Col1 <> \'Отказ\' and Col1 <> \'Дубль / спам\' group by Col1",0),"")'
  );

  // design §2.6: скрыты, НЕ защищены — владелец может свериться с сырыми числами.
  sheet.hideColumns(t, 15); // T:AH = 15 колонок
}

/**
 * design §2.2/§2.3: 6 KPI-плашек, одна под другой (design §2.1 — колонка в
 * Google Sheets имеет одну ширину на весь лист, поэтому "2×3" физически не
 * умещается на телефоне; см. также ниже "Корректировка владельца" в докстринге
 * setupCrm() про 1440/desktop — эта функция реализует §2.1 "как написано":
 * реальный грид Sheets единый для всех устройств.
 */
function writeSummaryKpis_(sheet, requestsSheet, serviceSheet) {
  var req = "'" + SHEET_REQUESTS_ + "'!";
  var svc = "'" + SHEET_SERVICE_ + "'!";
  // B3 fix: те же заголовки, что и writeSummaryChartData_, резолвятся по
  // реальной строке заголовков «Заявки»/«Служебное», а не по статическому
  // массиву OFFICE_HEADERS_/SERVICE_SHEET_HEADERS_.
  var reqHeaderMap = colByHeader_(requestsSheet.getRange(1, 1, 1, requestsSheet.getLastColumn()).getValues()[0]);
  var svcHeaderMap = colByHeader_(serviceSheet.getRange(1, 1, 1, serviceSheet.getLastColumn()).getValues()[0]);
  var receivedColLetter = columnLetter_(reqHeaderMap['Получена'] + 1);
  var statusColLetter = columnLetter_(reqHeaderMap['Статус'] + 1);
  var noColLetter = columnLetter_(reqHeaderMap['№'] + 1);
  var consultColLetter = columnLetter_(reqHeaderMap['Консультация'] + 1);
  var nextStepColLetter = columnLetter_(reqHeaderMap['Следующий шаг'] + 1);
  var contractColLetter = columnLetter_(svcHeaderMap['Договор'] + 1);
  var slaMedianColLetter = columnLetter_(10); // 'J' — design §0: новый столбец «Служебное», ещё не реализован (не эта задача)

  // KPI 1: заявок за 7 дней (строки 3-6)
  sheet.getRange(3, 1).setValue('Заявок · 7 дней');
  sheet.getRange(4, 1).setFormula('=COUNTIFS(' + req + receivedColLetter + ':' + receivedColLetter + ',">="&(TODAY()-7))'); // A4 cur
  sheet.getRange(4, 2).setFormula('=COUNTIFS(' + req + receivedColLetter + ':' + receivedColLetter + ',">="&(TODAY()-14),' +
    req + receivedColLetter + ':' + receivedColLetter + ',"<"&(TODAY()-7))'); // B4 prev7
  sheet.getRange(4, 4).setFormula('=COUNTIFS(' + req + receivedColLetter + ':' + receivedColLetter + ',">="&(TODAY()-21),' +
    req + receivedColLetter + ':' + receivedColLetter + ',"<"&(TODAY()-14))'); // D4 prev14 (hidden helper — §2.5 rule 3)
  sheet.getRange(4, 3).setFormula('=IF($A$4>=$B$4,"▲+"&($A$4-$B$4),"▼"&($B$4-$A$4))'); // C4 delta text
  sheet.getRange(5, 1).setFormula('="пред. 7 дней: "&$B$4');
  sheet.getRange(6, 1).setFormula('=SPARKLINE(' + columnLetter_(27) + SUMMARY_CHART_DATA_ROW_DAILY_ + ':' + columnLetter_(33) + SUMMARY_CHART_DATA_ROW_DAILY_ +
    ',{"charttype","column";"color1","#8a1f1f";"ymin",0})'); // AA2:AG2 — последние 7 из 14 дней (design §2.3 T2:Z2 указывал на САМЫЕ СТАРЫЕ 7 из 14 — исправлено на последние 7, иначе спарклайн KPI-1 показывал бы позапрошлую неделю)

  // KPI 2: заявок за 30 дней (строки 8-11)
  sheet.getRange(8, 1).setValue('Заявок · 30 дней');
  sheet.getRange(9, 1).setFormula('=COUNTIFS(' + req + receivedColLetter + ':' + receivedColLetter + ',">="&(TODAY()-30))');
  sheet.getRange(11, 1).setFormula('=SPARKLINE(' + columnLetter_(20) + SUMMARY_CHART_DATA_ROW_WEEKLY_ + ':' + columnLetter_(27) + SUMMARY_CHART_DATA_ROW_WEEKLY_ +
    ',{"charttype","column";"color1","#8a1f1f";"ymin",0})'); // T3:AA3 — все 8 недель (design §2.3 T3:X3 = 5 колонок, не 8 — исправлено)

  // KPI 3: дошли до консультации за 30 дней (строки 13-16)
  sheet.getRange(13, 1).setValue('До консультации · 30д');
  sheet.getRange(14, 1).setFormula('=COUNTIFS(' + req + receivedColLetter + ':' + receivedColLetter + ',">="&(TODAY()-30),' +
    req + consultColLetter + ':' + consultColLetter + ',"<>")'); // A14 count
  sheet.getRange(14, 2).setFormula('=COUNTIFS(' + req + receivedColLetter + ':' + receivedColLetter + ',">="&(TODAY()-30))'); // B14 n
  sheet.getRange(15, 1).setFormula('="из "&$B$14&" ("&IF($B$14=0,"—",TEXT($A$14/$B$14,"0%"))&")"');

  // KPI 4: договоров (строки 18-21)
  sheet.getRange(18, 1).setValue('Договоров');
  sheet.getRange(19, 1).setFormula('=COUNTIF(' + req + statusColLetter + ':' + statusColLetter + ',"Клиент — договор")'); // A19 всего
  sheet.getRange(19, 2).setFormula('=COUNTIF(' + req + statusColLetter + ':' + statusColLetter + ',"Клиент — договор")/COUNTA(' +
    req + noColLetter + '2:' + noColLetter + ')'); // B19 доля от всех
  sheet.getRange(19, 3).setFormula('=COUNTIFS(' + svc + contractColLetter + ':' + contractColLetter + ',">="&(TODAY()-30))'); // C19 за 30 дней
  sheet.getRange(20, 1).setFormula('=$A$19&" всего · "&TEXT($B$19,"0%")');
  sheet.getRange(21, 1).setFormula('="+"&$C$19&" за 30 дн."');

  // KPI 5: медиана до первой попытки (строки 23-26) — design §0: требует
  // «Служебное»!J (не реализован этой задачей — отдельный код на businessMinutesBetween),
  // формула ниже честно показывает «—», пока столбец не появится.
  sheet.getRange(23, 1).setValue('Медиана до 1-й попытки');
  sheet.getRange(24, 1).setFormula('=IFERROR(MEDIAN(FILTER(' + svc + slaMedianColLetter + '2:' + slaMedianColLetter + '1000,' +
    svc + slaMedianColLetter + '2:' + slaMedianColLetter + '1000<>"")),"—")');
  sheet.getRange(25, 1).setFormula('=IF($A$24="—","—",$A$24&" мин (порог "&' +
    'IFERROR(VLOOKUP("sla_first_attempt_minutes",' + "'" + SETTINGS_SHEET_NAME_ + "'" + '!$A:$B,2,FALSE),30)&")")');

  // KPI 6: просрочено сейчас (строки 28-31). B4 fix ("KPI overdue uses
  // 'Заявки'!B instead of B:B"): notClosed раньше начинался с голого
  // statusColLetter ("B") БЕЗ префикса листа и БЕЗ ":B" — итоговая формула
  // получала аргумент COUNTIFS вида 'Заявки'!B,"<>...", что не является
  // валидной A1-нотацией диапазона (нужен полный столбец "B:B") и на реальном
  // Sheets дало бы ошибку разбора формулы. Каждое вхождение теперь — полный
  // 'Заявки'!B:B, как и остальные условия этой же COUNTIFS.
  sheet.getRange(28, 1).setValue('Просрочено сейчас');
  var notClosed = req + statusColLetter + ':' + statusColLetter + ',"<>Клиент — договор",' +
    req + statusColLetter + ':' + statusColLetter + ',"<>Отказ",' +
    req + statusColLetter + ':' + statusColLetter + ',"<>Дубль / спам"';
  sheet.getRange(29, 1).setFormula('=COUNTIFS(' + req + nextStepColLetter + ':' + nextStepColLetter + ',"<"&TODAY(),' +
    req + nextStepColLetter + ':' + nextStepColLetter + ',"<>",' + notClosed + ')');
  sheet.getRange(30, 1).setFormula('=IF($A$29=0,"Просрочек нет",$A$29&" заявок")');
}

/** design §2.5: 3 CF-правила «Сводки» — все переиспользуют уже существующие статус-цвета. */
function applySummaryConditionalFormatting_(sheet) {
  var rules = [];
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$A$29>0')
    .setBackground('#FFCDD2')
    .setBold(true)
    .setRanges([sheet.getRange(28, 1, 4, 4)])
    .build());
  // B1b fix: custom-formula условное форматирование НЕ может напрямую
  // ссылаться на другой лист — "Formulas can only reference the same sheet...
  // To reference another sheet in the formula, use the INDIRECT function."
  // (https://support.google.com/docs/answer/78413). Прямая ссылка
  // 'Настройки'!$A:$B здесь была бы синтаксически невалидна на реальном
  // Sheets — исправлено на INDIRECT("'Настройки'!A:B").
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($A$24<>"—",$A$24>IFERROR(VLOOKUP("sla_first_attempt_minutes",INDIRECT("\'' + SETTINGS_SHEET_NAME_ + '\'!A:B"),2,FALSE),30))')
    .setBackground('#FFCC80')
    .setRanges([sheet.getRange(23, 1, 4, 4)])
    .build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($A$4<$B$4,$B$4<$D$4)')
    .setFontColor('#6b7280')
    .setRanges([sheet.getRange(3, 1, 4, 4)])
    .build());
  sheet.setConditionalFormatRules(rules);
}

/** design §2.4: 5 графиков — тип/серии/цвет/диапазоны данных (T:AH, см. writeSummaryChartData_). */
function insertSummaryCharts_(sheet) {
  // B1d fix (Codex P1-7, "a rerun rebuilds missing charts... instead of
  // skipping"): insertChart() ДОБАВЛЯЕТ график, а не заменяет — если
  // предыдущий setupCrm() упал ПОСЛЕ вставки части из 5 графиков, повторный
  // вызов без этой очистки удвоил бы уже вставленные. Чистим перед пересборкой,
  // чтобы функция была безопасно вызываема повторно в любой момент.
  sheet.getCharts().forEach(function (chart) { sheet.removeChart(chart); });
  var col = function (c) { return columnLetter_(c); };
  var chart1 = sheet.newChart()
    .setChartType(Charts.ChartType.LINE)
    .addRange(sheet.getRange(SUMMARY_CHART_DATA_ROW_DATES_, 20, 1, 14))
    .addRange(sheet.getRange(SUMMARY_CHART_DATA_ROW_DAILY_, 20, 1, 14))
    .setOption('title', 'Заявки по неделям')
    .setOption('colors', ['#8a1f1f'])
    .setOption('legend', { position: 'none' })
    .setPosition(34, 1, 0, 0)
    .build();
  sheet.insertChart(chart1);

  var chart2 = sheet.newChart()
    .setChartType(Charts.ChartType.BAR)
    .addRange(sheet.getRange(SUMMARY_CHART_DATA_ROW_FUNNEL_, 20, 4, 1))
    .setOption('title', 'Воронка · 30 дней')
    .setOption('colors', ['#d9a8a8', '#c68080', '#a85552', '#8a1f1f'])
    .setPosition(51, 1, 0, 0)
    .build();
  sheet.insertChart(chart2);

  // B5 fix (review gas-runtime #3, "fixed undersized addRange for open-ended
  // QUERY categories"): раньше addRange был жёстко (2,2)/(6,2)/(5,2) строк
  // независимо от реального размера данных T10/T26/T33 — источники («Откуда»)
  // особенно открытый список, где 2 строки — заведомо мало. Диапазоны теперь
  // размером ровно в капасити блока (SUMMARY_SOURCES_CAPACITY_) или в реальный
  // размер enum (CLOSING_REASONS_.length/SUMMARY_STATUSMIX_CAPACITY_), т.е.
  // растут вместе с writeSummaryChartData_ вместо магических чисел.
  var chart3 = sheet.newChart()
    .setChartType(Charts.ChartType.BAR)
    .addRange(sheet.getRange(SUMMARY_CHART_DATA_ROW_SOURCES_, 20, SUMMARY_SOURCES_CAPACITY_, 2))
    .setOption('title', 'Источники · 30 дней')
    .setOption('colors', ['#a02626', '#c9880a'])
    .setPosition(63, 1, 0, 0)
    .build();
  sheet.insertChart(chart3);

  var chart4 = sheet.newChart()
    .setChartType(Charts.ChartType.BAR)
    .addRange(sheet.getRange(SUMMARY_CHART_DATA_ROW_REASONS_, 20, CLOSING_REASONS_.length, 2))
    .setOption('title', 'Причины отказа · за всё время')
    .setOption('colors', ['#4b5158'])
    .setPosition(71, 1, 0, 0)
    .build();
  sheet.insertChart(chart4);

  // B1c fix (Codex P1-7, "setStacked() exists on EmbeddedBarChartBuilder...
  // not on the generic EmbeddedChartBuilder"): setStacked() документирован
  // только на EmbeddedBarChartBuilder/EmbeddedColumnChartBuilder
  // (https://developers.google.com/apps-script/reference/spreadsheet/embedded-bar-chart-builder#setstacked),
  // НЕ на базовом EmbeddedChartBuilder, который возвращает newChart()
  // (https://developers.google.com/apps-script/reference/spreadsheet/embedded-chart-builder
  // — в списке методов setStacked() нет). .asBarChart() — задокументированный
  // способ получить именно EmbeddedBarChartBuilder и одновременно задать тип
  // (https://developers.google.com/apps-script/reference/spreadsheet/embedded-chart-builder#asbarchart),
  // поэтому явный .setChartType(Charts.ChartType.BAR) здесь больше не нужен.
  var chart5 = sheet.newChart()
    .asBarChart()
    .addRange(sheet.getRange(SUMMARY_CHART_DATA_ROW_STATUSMIX_, 20, SUMMARY_STATUSMIX_CAPACITY_, 2))
    .setOption('title', 'Срез статусов сейчас')
    .setOption('colors', ['#FFF9C4', '#FFCC80', '#81D4FA', '#CE93D8', '#64B5F6'])
    .setStacked()
    .setPosition(83, 1, 0, 0)
    .build();
  sheet.insertChart(chart5);
}

/**
 * Design §2: «Сводка» — 6 KPI (§2.2/§2.3), 5 графиков (§2.4), условное
 * форматирование (§2.5), скрытые данные графиков T:AH (§2.6). Задача 0.4.0:
 * «Откуда» на «Служебное», не на «Заявки».
 *
 * Корректировка владельца (build-round 2026-09-23, "да" на дашборд+письма v2):
 * на десктопе (1440) владелец хочет все 6 плашек KPI В ОДИН РЯД; на телефоне —
 * как в мокапе (одна колонка). У Google Sheets НЕТ по-настройски разного вида
 * для разных устройств — один и тот же грид (design §2.1 прямо объясняет,
 * почему: ширина колонки одна на весь лист). Поэтому решение: РЕАЛЬНЫЙ грид
 * реализован "как написано" в §2.1 (один столбец, читается на телефоне без
 * горизонтальной прокрутки — сознательный выбор design-документа), а
 * корректировка "1440 = один ряд" применена на уровне МОКАПА
 * (docs/crm-dashboard/summary-mock.html, отдельная responsive CSS для
 * скриншота 1440 — не переносится 1:1 на формулы Sheets). Если владелец имел
 * в виду буквально другой грид Sheets на десктопе — это ДРУГАЯ реализация
 * (жертвует "без горизонтальной прокрутки на телефоне", см. §2.1 аргумент) и
 * требует отдельного подтверждения.
 */
function ensureSummaryFormulas_(sheet, requestsSheet, serviceSheet) {
  if (sheet.getRange(1, 1).getValue()) return;

  // B1a fix: T:AH (столбцы 20-34) выходят за пределы 26-колоночного грида
  // нового листа — раздвигаем ДО первого обращения к этим столбцам
  // (writeSummaryChartData_/insertSummaryCharts_ ниже).
  ensureMinColumns_(sheet, 34);

  sheet.getRange(1, 8).setFormula('="Обновлено: "&TEXT(NOW(),"dd.MM.yyyy HH:mm")');

  writeSummaryChartData_(sheet, requestsSheet, serviceSheet);
  writeSummaryKpis_(sheet, requestsSheet, serviceSheet);
  applySummaryConditionalFormatting_(sheet);
  insertSummaryCharts_(sheet);

  // B1d fix (Codex P1-7, "recover a partially built dashboard: set the
  // marker only after full success"): заголовок A1 — он же маркер «уже
  // настроено» (проверяется в самом начале функции) — раньше писался ПЕРВЫМ
  // шагом. Если что-то ниже (например insertSummaryCharts_) падало с
  // исключением, следующий setupCrm() видел непустой A1 и молча пропускал
  // достройку недостающих графиков/KPI. Теперь маркер пишется ПОСЛЕДНИМ —
  // недостроенный лист остаётся с пустым A1 и будет пересобран с нуля при
  // следующем вызове.
  sheet.getRange(1, 1).setValue('Сводка — Гамбарян и партнёры');
}

// ---- Notifications.gs ----
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

// ---- Code.gs ----
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
    if (SUMMARY_SHEET_ENABLED_) {
      stepResults.weekly_summary = runStepSafely_('weekly_summary', function () { maybeSendWeeklySummary_(ss, config, now); });
    }

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
 *
 * P1 A5 (review gas-runtime #2): раньше 'tickDegraded' взводился в 'true'
 * ДО попытки отправки алерта — сбой самой отправки (MailApp упал/квота/
 * пустые systemAlertRecipients) молча "тушил" все будущие попытки алерта
 * этого инцидента навсегда, хотя реально ушло 0 писем. Флаг взводится ТОЛЬКО
 * после подтверждённой отправки (sendNotificationOnce_ вернула sent:true);
 * иначе — retry на следующем тике (ключ 'tick_degraded:'+now.getTime()
 * уникален на каждый вызов, поэтому decideSendAction_ не примет его за
 * "уже отправленный").
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
  if (wasDegraded) return; // уже алертили этот инцидент (флаг взводится только после успешной отправки — см. ниже)

  var failedSteps = Object.keys(stepResults).filter(function (name) { return !stepResults[name].ok; });
  var journal = ss.getSheetByName(SHEET_JOURNAL_);
  var result = sendNotificationOnce_(journal, 'tick_degraded:' + now.getTime(), '', 'tick_degraded', 'email',
    config.systemAlertRecipients, 'CRM: часть шагов tick() не выполнилась',
    'Провалились шаги: ' + failedSteps.join(', ') + '. Подробности — «Журнал» (tick_step_error).');
  if (result && result.sent) {
    props.setProperty('tickDegraded', 'true'); // P1 A5: только после подтверждённой отправки
  }
}

// ---------------------------------------------------------------------------
// design fix item1: защита от formula re-injection при записи внешних строк
// ---------------------------------------------------------------------------

/**
 * Codex review item1, ПЕРЕСМОТРЕНО в раунде P1 A1 (root cause: код ни разу не
 * запускался на настоящей таблице — прежний комментарий утверждал, что
 * setNumberFormat('@') ("обычный текст") ДО setValue()/setValues() защищает
 * от formula re-injection. Официальная документация Class Range/Sheet
 * (см. sheetSafeValue_ в Utils.gs — точные цитаты и URL, прочитано
 * 2026-09-23) НЕ содержит такого исключения: "if it begins with '=' it is
 * interpreted as a formula" ничем не обусловлено форматом ячейки. Реальная
 * защита — sheetSafeValue_() (ведущий апостроф, тот же приём, что и
 * функция sheetSafe() на сервере — functions/api/lead.js), применяется к
 * значению ДО записи в appendRequestRowSafely_/appendServiceRowSafely_/
 * appendJournalRow_/setPlainTextValue_. setNumberFormat('@') здесь оставлен
 * ТОЛЬКО как display-удобство (не даёт Sheets свернуть телефон/№ в число и
 * съесть ведущий 0/+) — на защиту от формул он больше НЕ считается
 * влияющим.
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

/**
 * Одна ячейка — формат "обычный текст" (display-удобство, см. комментарий
 * выше protectExternalTextColumns_) + sheetSafeValue_() (реальная защита от
 * formula re-injection, P1 A1) ДО значения, одним вызовом.
 */
function setPlainTextValue_(range, value) {
  range.setNumberFormat('@');
  range.setValue(sheetSafeValue_(value));
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
  // Боевая таблица 2026-09-24: после удаления строк «Входящих» watermark
  // (число прочитанных строк) указывал мимо, и заявка в освободившейся строке
  // пропускалась навсегда. Читаем ВСЕ строки каждый тик; дубли отсекает
  // existingBySubmissionId ниже (по submission_id), объём мал.
  var incoming = intakeValues.slice(1).map(function (row) {
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
}

/**
 * design fix item4: докручивает заявки, для которых «Служебное» уже создано
 * (значит, создание НАЧАЛОСЬ), а «Заявки» — ещё нет (скрипт упал между двумя
 * appendRow). Использует тот же №, что уже зарезервирован в «Служебное» — не
 * создаёт вторую заявку. Идемпотентно: если «Заявки» уже на месте, ничего не
 * делает.
 *
 * P1 A3 (Codex P1-3 + review sync-loss #1): докрутка САМА ПО СЕБЕ раньше
 * никогда не вызывала notifyNewLead_ — если скрипт падал МЕЖДУ появлением
 * строки «Служебное» и решением/отправкой уведомления в syncIntakeToRequests_
 * (которое выполняется ПОСЛЕ появления обеих строк), лид навсегда оставался
 * без email офису в рабочие часы: обязательство уведомить нигде не
 * сохранялось, оно жило только "в процессе выполнения" упавшего тика. Ниже —
 * ТО ЖЕ решение (decideNewLeadNotification_), что и в обычном создании;
 * sendNotificationOnce_ (SendLog.gs) идемпотентна по ключу
 * leadNo:new_lead:1 — повторный вызов для уже отправленного письма безопасно
 * пропускается (skip), поэтому звать его можно без риска дубля, даже если
 * письмо каким-то образом уже ушло до сбоя. Вне рабочего времени (и без
 * включённого дежурного) ничего дополнительно не делаем — строка «Заявки»
 * теперь на месте ДО шага digest в этом же tick() (design item8), поэтому
 * лид естественным образом попадёт в утренний дайджест.
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

  var journal = ss.getSheetByName(SHEET_JOURNAL_);

  orphans.forEach(function (svcRow) {
    var leadNo = getCell_(svcRow, serviceHeaderMap, '№');
    var submissionId = getCell_(svcRow, serviceHeaderMap, 'submission_id');
    var rec = recordsById[submissionId];
    if (!rec) return; // запись «Входящих» не найдена — не должно происходить, но не падаем; следующий тик подтянет

    var row = buildNewRequestRow_(reqHeaderMap, rec, leadNo, config, now);
    var newRowIndex = appendRequestRowSafely_(requests, reqHeaderMap, row); // item1 защита
    writeContactCell_(requests, newRowIndex, reqHeaderMap, rec.phone);

    // P1 A3: та же нотификация, что и в обычном пути создания — см.
    // комментарий у функции.
    var notification = decideNewLeadNotification_(now, config.calendar, config.weekendDuty);
    if (notification === 'immediate' || notification === 'immediate_duty') {
      var leadData = {
        name: rec.name || '',
        phone: rec.phone || '',
        email: rec.email || '',
        source: detectSource_(rec),
        receivedAtLabel: Utilities.formatDate(now, config.tz, 'dd.MM.yyyy HH:mm')
      };
      var recipients = notification === 'immediate' ? config.officeRecipients : [config.weekendDuty.email];
      notifyNewLead_(journal, requests, leadNo, newRowIndex, recipients, leadData, config.systemAlertRecipients);
    }
    // 'digest' — строка «Заявки» уже на месте до шага digest этого же tick()
    // (design item8) — попадёт в утренний дайджест сама собой.
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
  requests.appendRow(row.map(sheetSafeValue_)); // P1 A1 — реальная защита, формат выше — только display
  return requests.getLastRow();
}

/** Симметрично appendRequestRowSafely_, но для «Служебное» (submission_id/все submission_id/Откуда). */
function appendServiceRowSafely_(service, serviceHeaderMap, row) {
  var futureRowIndex = service.getLastRow() + 1;
  protectExternalTextColumns_(service, futureRowIndex, serviceHeaderMap, ['submission_id', 'все submission_id', 'Откуда']);
  service.appendRow(row.map(sheetSafeValue_)); // P1 A1
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
 * design fix item3 (Codex review, "reproduced G-0001/G-0002") — строка ищется
 * ЗАНОВО по № (design §1), не по кэшу.
 *
 * P1 A2, ПЕРЕСМОТРЕНО (Codex P1-2 + review — root cause: код ни разу не
 * запускался на настоящей таблице): версия item3 читала ВСЮ office-строку
 * (все 14 колонок, включая Статус/Ответственный/Попыток дозвона/Комментарий)
 * ОДНИМ getValues(), патчила в памяти только 3 контактных поля и писала ВСЮ
 * строку назад ОДНИМ setValues(). Между этим чтением и записью нет блокировки
 * со стороны офиса (LockService защищает только код скрипта, design §1) —
 * если офис в этот момент правил ЛЮБОЕ другое поле ТОЙ ЖЕ строки (Статус/
 * Комментарий и т.п.), запись отменяла эту правку офиса, откатывая её к
 * устаревшему прочитанному значению. Хуже: "проверка после записи" читала №
 * из ЯЧЕЙКИ, В КОТОРУЮ ТОЛЬКО ЧТО САМА ЖЕ ЗАПИСАЛА №, — сравнение было
 * тавтологией и не могло поймать реальную гонку (сортировку офиса ровно в
 * момент записи): № всегда "совпадал", потому что его туда только что
 * положила сама эта строка кода, и исправление помечалось применённым, даже
 * если запись физически попала в СОСЕДНЮЮ заявку (см. test/fix-a.test.mjs).
 *
 * Фикс: пишем ТОЛЬКО контактные ячейки (Имя/Телефон/Email/«Связаться») — №
 * и office-поля (Статус/Ответственный/...) этой функцией не трогаем вообще,
 * поэтому конкурентная правка офиса того же лида никогда не может быть
 * отменена этим кодом. № перечитывается заново непосредственно перед первой
 * записью (не из старого снимка) и ЕЩЁ РАЗ независимо ПОСЛЕ всех записей —
 * эта повторная проверка читает ячейку, которую мы НИКОГДА не писали, поэтому
 * это настоящая (не тавтологичная) проверка: несовпадение значит, что строка
 * уехала во время записи. В этом случае — не компенсирующий откат (мы больше
 * не знаем, что именно там теперь), а отказ от отметки "применено": «Служебное»
 * «все submission_id» не трогаем, следующий тик найдёт корректную строку
 * заново и повторит попытку.
 */
function applyCorrectionToRow_(requests, reqHeaderMap, service, serviceHeaderMap, plan) {
  var serviceRowIndex = findServiceRowIndexBySubmissionId_(service, serviceHeaderMap, plan.rootId);
  if (serviceRowIndex === -1) return; // строка исчезла между поиском корня и записью — следующий тик подтянет
  var leadNo = service.getRange(serviceRowIndex, serviceHeaderMap['№'] + 1).getValue();

  var rowIndex = findRequestRowIndexByLeadNo_(requests, reqHeaderMap, leadNo);
  if (rowIndex === -1) return; // строка «Заявки» исчезла между поиском и записью — следующий тик подтянет

  // P1 A2, проверка ДО записи: № перечитывается ЗАНОВО (не из снимка) —
  // строка могла уехать между findRequestRowIndexByLeadNo_ и этим моментом.
  var noBeforeWrite = requests.getRange(rowIndex, reqHeaderMap['№'] + 1).getValue();
  if (noBeforeWrite !== leadNo) {
    Logger.log('applyCorrectionToRow_: строка %s больше не принадлежит %s (уехала до записи) — пропуск, следующий тик найдёт заново', rowIndex, leadNo);
    return;
  }

  // P1 A2: пишем ТОЛЬКО контактные поля — никогда №, никогда office-поля
  // (Статус/Ответственный/Первая попытка/...), которые могла в этот же
  // момент менять офис. setPlainTextValue_ уже прогоняет значение через
  // sheetSafeValue_ (P1 A1).
  protectExternalTextColumns_(requests, rowIndex, reqHeaderMap, ['Имя', 'Телефон', 'Email']); // item1 (display)
  setPlainTextValue_(requests.getRange(rowIndex, reqHeaderMap['Имя'] + 1), plan.finalContacts.name || '');
  setPlainTextValue_(requests.getRange(rowIndex, reqHeaderMap['Телефон'] + 1), plan.finalContacts.phone || '');
  setPlainTextValue_(requests.getRange(rowIndex, reqHeaderMap['Email'] + 1), plan.finalContacts.email || '');
  writeContactCell_(requests, rowIndex, reqHeaderMap, plan.finalContacts.phone); // review находка №12

  // P1 A2, проверка ПОСЛЕ записи: № мы НИКОГДА не писали выше — это
  // независимое (не тавтологичное) чтение. Несовпадение = строка уехала во
  // время записи контактных полей; не помечаем исправление применённым, не
  // пытаемся откатывать (не знаем, что именно там теперь) — следующий тик
  // найдёт правильную строку заново по № и повторит попытку.
  var noAfterWrite = requests.getRange(rowIndex, reqHeaderMap['№'] + 1).getValue();
  if (noAfterWrite !== leadNo) {
    Logger.log('applyCorrectionToRow_: № в строке %s изменился на %s (ожидали %s) во время записи контактных полей — исправление НЕ помечено применённым, следующий тик подтянет', rowIndex, noAfterWrite, leadNo);
    return;
  }

  setPlainTextValue_(service.getRange(serviceRowIndex, serviceHeaderMap['все submission_id'] + 1), plan.orderedIds.join(',')); // item1
}

function readPendingCorrections_() {
  var raw = PropertiesService.getScriptProperties().getProperty('pendingCorrections');
  return raw ? JSON.parse(raw) : {};
}
function writePendingCorrections_(pending) {
  PropertiesService.getScriptProperties().setProperty('pendingCorrections', JSON.stringify(pending));
}
/**
 * P1 A5 (review email-pii #2): 'alerted' раньше взводился в 'true' СРАЗУ
 * после вызова sendNotificationOnce_, независимо от того, реально ли ушло
 * письмо (MailApp мог упасть/квота/пустые получатели) — сбой навсегда гасил
 * будущие попытки алерта по этому же исправлению (ключ 'correction_wait:'+
 * leafId стабилен, поэтому SendLog сам обеспечивает ретрай при следующем
 * вызове — но флаг entry.alerted этой функции блокировал даже саму ПОПЫТКУ).
 * Взводим только после подтверждённой отправки.
 */
function trackPendingCorrection_(pending, leafId, missingId, now, ss, config) {
  var entry = pending[leafId];
  if (!entry) {
    entry = { firstSeenAt: now.toISOString(), missingId: missingId, alerted: false };
    pending[leafId] = entry;
  }
  var ageMs = now.getTime() - new Date(entry.firstSeenAt).getTime();
  if (!entry.alerted && ageMs >= 24 * 3600 * 1000) {
    var journal = ss.getSheetByName(SHEET_JOURNAL_);
    var result = sendNotificationOnce_(journal, 'correction_wait:' + leafId, leafId, 'correction_waiting_24h', 'email',
      config.systemAlertRecipients, 'CRM: исправление ждёт оригинал >24ч',
      'submission_id ' + leafId + ' ждёт корень ' + missingId + ' дольше 24 часов.');
    if (result && result.sent) entry.alerted = true; // P1 A5: только после подтверждённой отправки
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
 *
 * P1 A7 (review sync-loss #5): фильтр ключей ниже раньше был подстрочным
 * (key.indexOf(':new_lead:') !== -1) — это ЛОЖНО совпадает с ключом системного
 * алерта "пустые получатели" (sendNotificationOnce_ в Notifications.gs шлёт
 * его под ключом 'empty_recipients:' + <исходный ключ>, т.е. буквально
 * "empty_recipients:G-0012:new_lead:1" — подстрока ":new_lead:" в нём есть,
 * хотя это НЕ ключ уведомления о новой заявке). Теперь — точное совпадение
 * структуры ключа (makeSendKey_: leadNo:event:version, ровно 3 части).
 *
 * P1 A4 (Codex P1-4 + review email-pii #1): раньше attempts[key] считал
 * ТИКИ, а не реальные попытки отправки — тик, в котором decideSendAction_
 * сама решила подождать (retryAfterMs ещё не прошёл, sendNotificationOnce_
 * вернула reason:'skip'), всё равно тратил бюджет попытки, хотя ни одного
 * вызова MailApp не было. После исчерпания счётчик НИКОГДА не сбрасывался
 * (кроме перехода в SENT) — уведомление, для которого 5 тиков подряд
 * совпали с окном ожидания, замолкало НАВСЕГДА, хотя реальная отправка не
 * была предпринята ни разу. Фикс: (1) считаем только тики, где реально был
 * вызван MailApp.sendEmail (result.reason ни 'skip', ни 'no_recipients');
 * (2) после исчерпания бюджета — не прекращаем ретраи навсегда, а
 * откладываем на backoff-окно и сбрасываем счётчик (лид ещё открыт —
 * уведомление не должно умолкнуть насовсем из-за временного сбоя сети/почты).
 * Квота (developers.google.com/apps-script/reference/mail/mail-app:
 * "Quotas are based on the number of email recipients", прочитано
 * 2026-09-23) сравнивается с ПОЛНЫМ числом получателей — раньше проверка
 * "> 0" пропускала бы отправку на N получателей, когда остаётся < N.
 */
var NOTIFICATION_RETRY_MAX_ATTEMPTS_ = 5;
var NOTIFICATION_RETRY_BACKOFF_MS_ = 6 * 3600000; // 6 часов

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
    if (!key) continue;
    var keyParts = key.split(':'); // P1 A7: точное совпадение, не substring
    if (keyParts.length !== 3 || keyParts[1] !== 'new_lead') continue;
    if (latestByKey[key]) continue; // уже нашли более свежую запись этого ключа
    latestByKey[key] = { leadNo: row[1], state: row[5] };
  }

  var attempts = readNotificationRetryAttempts_();
  var requests = ss.getSheetByName(SHEET_REQUESTS_);
  var service = ss.getSheetByName(SHEET_SERVICE_);
  var recipientCount = (config.officeRecipients || []).length || 1;
  var quotaOk = typeof MailApp.getRemainingDailyQuota !== 'function' || MailApp.getRemainingDailyQuota() >= recipientCount; // P1 A4

  Object.keys(latestByKey).forEach(function (key) {
    var entry = latestByKey[key];
    if (entry.state === SEND_STATES_.SENT) { delete attempts[key]; return; }
    if (!quotaOk) return; // квоты не хватит даже на одну реальную попытку в этот тик

    var record = attempts[key] || { count: 0, backoffUntil: null };
    if (record.count >= NOTIFICATION_RETRY_MAX_ATTEMPTS_) {
      if (record.backoffUntil && now.getTime() < record.backoffUntil) return; // ждём окно backoff
      record = { count: 0, backoffUntil: null }; // P1 A4: окно прошло — новый цикл попыток, лид ещё открыт
    }

    var leadRow = findRequestRowIndexByLeadNo_(requests, reqHeaderMap, entry.leadNo);
    if (leadRow === -1) { attempts[key] = record; return; } // строка исчезла — не на чем ретраить

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

    var result = notifyNewLead_(journal, requests, entry.leadNo, leadRow, config.officeRecipients, leadData, config.systemAlertRecipients);
    // P1 A4: считаем попытку только если реально вызывался MailApp (не
    // 'skip'/'no_recipients' — decideSendAction_/sendNotificationOnce_ сама
    // решила не пытаться в этот тик).
    if (result && result.reason !== 'skip' && result.reason !== 'no_recipients') {
      record.count += 1;
      if (record.count >= NOTIFICATION_RETRY_MAX_ATTEMPTS_) {
        record.backoffUntil = now.getTime() + NOTIFICATION_RETRY_BACKOFF_MS_;
      }
    }
    attempts[key] = record;
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

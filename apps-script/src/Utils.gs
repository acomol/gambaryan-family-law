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

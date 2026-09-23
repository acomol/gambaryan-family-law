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
  return {
    digitsOnly: digitsOnly,
    telHref: digitsOnly ? 'tel:' + withPlus : '',
    waHref: digitsOnly ? 'https://wa.me/' + digitsOnly : ''
  };
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

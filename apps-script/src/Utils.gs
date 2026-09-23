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

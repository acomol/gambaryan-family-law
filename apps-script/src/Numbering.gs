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

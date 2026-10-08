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

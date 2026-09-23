/* Google Apps Script — read-only submission_id endpoint for Sheet↔KV reconciliation.
 * Deploy as a Web app and keep its URL in cron-worker secret SHEET_COUNT_URL.
 * Returns IDs for the requested Jerusalem day: {"day":"YYYY-MM-DD","submission_ids":[...]}.
 *
 * Ported from clients/luxemed/New Lending/cron-worker/apps-script.gs
 * (digitalhook-os-, feature/luxemed-new-lending@613cdd30). The reference
 * sheet's headers ('Время' / 'submission_id') are Assuta's own Albato→Sheets
 * scenario layout, not verified against Gambaryan's actual sheet — confirm
 * SHEET_NAME/TIME_COLUMN/ID_COLUMN header names against the real Albato
 * scenario before wiring SHEET_COUNT_URL (see docs/LEAD-PIPELINE.md).
 */
var RECONCILE_TIME_ZONE = 'Asia/Jerusalem';
var SHEET_NAME = 'Заявки';
var TIME_COLUMN_HEADER = 'Время';
var ID_COLUMN_HEADER = 'submission_id';

function dayForCell_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, RECONCILE_TIME_ZONE, 'yyyy-MM-dd');
  }
  var text = String(value || '').trim();
  var locale = text.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (locale) return locale[3] + '-' + locale[2] + '-' + locale[1];
  var parsed = new Date(text);
  if (!isNaN(parsed.getTime())) return Utilities.formatDate(parsed, RECONCILE_TIME_ZONE, 'yyyy-MM-dd');
  var iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : '';
}

function doGet(e) {
  var requested = e && e.parameter && String(e.parameter.day || '');
  var day = /^\d{4}-\d{2}-\d{2}$/.test(requested)
    ? requested
    : Utilities.formatDate(new Date(), RECONCILE_TIME_ZONE, 'yyyy-MM-dd');
  var ids = [];
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (sheet && sheet.getLastRow() > 1 && sheet.getLastColumn() > 0) {
    var values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
    var headers = values[0].map(function (value) { return String(value || '').trim(); });
    var timeColumn = headers.indexOf(TIME_COLUMN_HEADER);
    var idColumn = headers.indexOf(ID_COLUMN_HEADER);
    if (timeColumn >= 0 && idColumn >= 0) {
      for (var row = 1; row < values.length; row++) {
        var id = String(values[row][idColumn] || '').trim();
        if (id && dayForCell_(values[row][timeColumn]) === day) ids.push(id);
      }
    }
  }
  return ContentService
    .createTextOutput(JSON.stringify({ day: day, submission_ids: ids }))
    .setMimeType(ContentService.MimeType.JSON);
}

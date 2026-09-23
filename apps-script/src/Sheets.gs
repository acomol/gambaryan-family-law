/**
 * Sheets.gs — setupCrm(): идемпотентно создаёт/чинит структуру таблицы.
 * Design: docs/MINI-CRM-DESIGN.md §2, §3, §4.
 *
 * GAS-only (SpreadsheetApp) — не тестируется в Node. НЕ ЗАПУСКАЛОСЬ вживую на
 * реальной таблице — README.md §"Проверить перед боем" описывает ручную приёмку.
 */

var SHEET_INTAKE_ = 'Входящие';
var SHEET_LEGACY_INTAKE_ = '2026'; // design §2: переименовать один раз, до подключения Albato
var SHEET_REQUESTS_ = 'Заявки';
var SHEET_TODAY_ = 'Сегодня';
var SHEET_SUMMARY_ = 'Сводка';
var SHEET_JOURNAL_ = 'Журнал';
// SETTINGS_SHEET_NAME_ определён в Config.gs

var OFFICE_HEADERS_ = [
  '№', 'Статус', 'Получена', 'Имя', 'Телефон', 'Связаться', 'Email', 'Ответственный',
  'Первая попытка', 'Контакт состоялся', 'Попыток дозвона', 'Следующий шаг',
  'Консультация', 'Причина закрытия', 'Комментарий', 'Откуда'
];

var SERVICE_HEADERS_ = [
  'submission_id', 'все submission_id', 'Статус изменён', 'Договор', 'contact_version',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'gbraid', 'wbraid', 'landing_path', 'referrer_host', 'form_id'
];

var REQUESTS_HEADERS_ = OFFICE_HEADERS_.concat(SERVICE_HEADERS_);

// Точный список полей Albato (24, §7) не проверен — реконструирован из того, что
// упомянуто в design.md; сверить с реальным маппингом сценария bundle 389466
// перед подключением Albato (README §"Приёмочный тест Albato").
var INTAKE_HEADERS_ = [
  'submission_id', 'corrects_submission_id', 'submitted_at', 'name', 'phone', 'email',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'gbraid', 'wbraid', 'landing_path', 'referrer_host', 'form_id', 'lf_hp'
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
  var today = ensureSheet_(ss, SHEET_TODAY_);
  var summary = ensureSheet_(ss, SHEET_SUMMARY_);
  var journal = ensureSheet_(ss, SHEET_JOURNAL_);
  var settings = ensureSheet_(ss, SETTINGS_SHEET_NAME_);

  ensureHeaderRow_(intake, INTAKE_HEADERS_);
  ensureHeaderRow_(requests, REQUESTS_HEADERS_);
  ensureHeaderRow_(journal, JOURNAL_HEADERS_);
  ensureSettingsSheet_(settings);

  formatRequestsSheet_(requests);
  applyRequestsValidation_(requests);
  applyRequestsConditionalFormatting_(requests);
  protectIntakeSheet_(intake);
  protectServiceColumns_(requests);
  protectWholeSheet_(journal, 'Журнал — только для чтения из UI, пишет только скрипт');

  ensureTodayFormulas_(today);
  ensureSummaryFormulas_(summary);

  Logger.log('setupCrm: готово. Входящие=%s строк, Заявки=%s строк',
    intake.getLastRow(), requests.getLastRow());
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
  var allRows = buildDefaultSettingsRows_();
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
  sheet.setFrozenColumns(OFFICE_HEADERS_.length);
  var firstServiceCol = OFFICE_HEADERS_.length + 1;
  sheet.hideColumns(firstServiceCol, SERVICE_HEADERS_.length);
}

function applyRequestsValidation_(sheet) {
  var headerMap = colByHeader_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
  var maxRows = Math.max(sheet.getMaxRows() - 1, 1);
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_OPTIONS_, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, headerMap['Статус'] + 1, maxRows, 1).setDataValidation(statusRule);

  var reasonRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CLOSING_REASONS_, true)
    .setAllowInvalid(true) // §4: обязателен для «Отказ», не для всех — не блокируем ввод жёстко
    .build();
  sheet.getRange(2, headerMap['Причина закрытия'] + 1, maxRows, 1).setDataValidation(reasonRule);
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
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=ISBLANK($' + statusCol + '2)')
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
 * albato_editor_email (не в DEFAULT_SETTINGS_ — заполняется вручную при
 * подключении Albato, т.к. неизвестен на момент кода).
 */
function protectIntakeSheet_(sheet) {
  var protection = getOrCreateSheetProtection_(sheet);
  protection.setDescription('Входящие — только Albato и владелец скрипта (design §2)');
  var albatoEmail = readSingleSetting_('albato_editor_email');
  var editors = [Session.getEffectiveUser().getEmail()];
  if (albatoEmail) editors.push(albatoEmail);
  protection.removeEditors(protection.getEditors());
  protection.addEditors(editors);
  if (protection.canDomainEdit()) protection.setDomainEdit(false);
}

function protectWholeSheet_(sheet, description) {
  var protection = getOrCreateSheetProtection_(sheet);
  protection.setDescription(description);
}

/**
 * Design §3.2: служебные колонки в «Заявки» — только владелец скрипта.
 * Защищаем диапазон служебных колонок отдельно от офисных.
 */
function protectServiceColumns_(sheet) {
  var range = sheet.getRange(1, OFFICE_HEADERS_.length + 1, sheet.getMaxRows(), SERVICE_HEADERS_.length);
  var existing = range.protect();
  existing.setDescription('Служебные колонки «Заявки» — только владелец скрипта (design §3.2)');
  existing.removeEditors(existing.getEditors());
}

function getOrCreateSheetProtection_(sheet) {
  var protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
  return protections.length ? protections[0] : sheet.protect();
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

/**
 * Design §2: «Сегодня» — формулы, ссылка «открыть» на строку в «Заявки» по №.
 * QUERY тянет открытые заявки по условиям; HYPERLINK строится по № через MATCH.
 */
function ensureTodayFormulas_(sheet) {
  if (sheet.getRange('A1').getValue()) return; // уже настроено — не перезаписываем
  var reqRange = "'" + SHEET_REQUESTS_ + "'!A2:P";
  sheet.getRange('A1').setValue('Новые (без первой попытки)');
  sheet.getRange('A2').setFormula(
    '=IFERROR(QUERY(' + reqRange + ',"select Col1,Col4,Col5 where Col2 = \'\' or Col2 is null",0),"—")'
  );
  sheet.getRange('D1').setValue('Просроченный «Следующий шаг»');
  sheet.getRange('D2').setFormula(
    '=IFERROR(QUERY(' + reqRange + ',"select Col1,Col4,Col12 where Col12 < date \'"&TEXT(TODAY(),"yyyy-MM-dd")&"\' and Col12 is not null",0),"—")'
  );
  sheet.getRange('G1').setValue('Консультации сегодня');
  sheet.getRange('G2').setFormula(
    '=IFERROR(QUERY(' + reqRange + ',"select Col1,Col4,Col13 where Col13 >= date \'"&TEXT(TODAY(),"yyyy-MM-dd")&"\' and Col13 < date \'"&TEXT(TODAY()+1,"yyyy-MM-dd")&"\'",0),"—")'
  );
}

/**
 * Design §2: «Сводка» — воронка, доля договоров, время до первого контакта,
 * источники, месяцы.
 */
function ensureSummaryFormulas_(sheet) {
  if (sheet.getRange('A1').getValue()) return;
  var req = "'" + SHEET_REQUESTS_ + "'!";
  sheet.getRange('A1').setValue('Воронка по статусам');
  sheet.getRange('A2').setFormula(
    '=IFERROR(QUERY(' + req + 'B2:B,"select B, count(B) where B is not null group by B",0),"—")'
  );
  sheet.getRange('D1').setValue('Доля «Клиент — договор»');
  sheet.getRange('D2').setFormula(
    '=IFERROR(COUNTIF(' + req + 'B:B,"Клиент — договор")/COUNTA(' + req + 'A2:A),"—")'
  );
  sheet.getRange('F1').setValue('Источники (месяц)');
  sheet.getRange('F2').setFormula(
    '=IFERROR(QUERY(' + req + 'P2:P,"select P, count(P) where P is not null group by P",0),"—")'
  );
}

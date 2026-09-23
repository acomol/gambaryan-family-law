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
  var summary = ensureSheet_(ss, SHEET_SUMMARY_);
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

  ensureTodayFormulas_(today);
  ensureSummaryFormulas_(summary);

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
  // задача 0.4.0: технических колонок на «Заявках» больше нет вовсе — прежние
  // setFrozenColumns/hideColumns для "служебного хвоста" убраны, скрывать нечего.
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
  resetEditorsTo_(protection, [owner, albatoEmail]);
  if (protection.canDomainEdit()) protection.setDomainEdit(false);

  if (albatoEmail) {
    protection.setWarningOnly(false);
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
  protection.removeEditors(protection.getEditors());
  var valid = (emails || []).filter(function (e) { return !!e; });
  if (valid.length) protection.addEditors(valid);
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

/**
 * Design §2: «Сегодня» — формулы, ссылка «открыть» на строку в «Заявки» по №.
 * QUERY тянет открытые заявки по условиям. Колонки задачи — по позиции в
 * OFFICE_HEADERS_ (Col1, Col2… — заголовок диапазона A2:<last> не начинается
 * с A листа целиком, поэтому используем "ColN", не буквы листа — задокументировано
 * поведение QUERY для диапазонов, см. Google Docs справку по функции QUERY:
 * "If your data range does not begin in column A, use Col1, Col2, etc.").
 */
function ensureTodayFormulas_(sheet) {
  if (sheet.getRange(1, 1).getValue()) return; // уже настроено — не перезаписываем
  var lastColLetter = columnLetter_(OFFICE_HEADERS_.length);
  var reqRange = "'" + SHEET_REQUESTS_ + "'!A2:" + lastColLetter;
  var noCol = 'Col' + (OFFICE_HEADERS_.indexOf('№') + 1);
  var nameCol = 'Col' + (OFFICE_HEADERS_.indexOf('Имя') + 1);
  var phoneCol = 'Col' + (OFFICE_HEADERS_.indexOf('Телефон') + 1);
  var statusCol = 'Col' + (OFFICE_HEADERS_.indexOf('Статус') + 1);
  var nextStepCol = 'Col' + (OFFICE_HEADERS_.indexOf('Следующий шаг') + 1);
  var consultationCol = 'Col' + (OFFICE_HEADERS_.indexOf('Консультация') + 1);

  sheet.getRange(1, 1).setValue('Новые (без первой попытки)');
  sheet.getRange(2, 1).setFormula(
    '=IFERROR(QUERY(' + reqRange + ',"select ' + noCol + ',' + nameCol + ',' + phoneCol +
    ' where ' + statusCol + ' = \'\' or ' + statusCol + ' is null",0),"—")'
  );
  sheet.getRange(1, 4).setValue('Просроченный «Следующий шаг»');
  sheet.getRange(2, 4).setFormula(
    '=IFERROR(QUERY(' + reqRange + ',"select ' + noCol + ',' + nameCol + ',' + nextStepCol +
    ' where ' + nextStepCol + ' < date \'"&TEXT(TODAY(),"yyyy-MM-dd")&"\' and ' + nextStepCol + ' is not null",0),"—")'
  );
  sheet.getRange(1, 7).setValue('Консультации сегодня');
  sheet.getRange(2, 7).setFormula(
    '=IFERROR(QUERY(' + reqRange + ',"select ' + noCol + ',' + nameCol + ',' + consultationCol +
    ' where ' + consultationCol + ' >= date \'"&TEXT(TODAY(),"yyyy-MM-dd")&"\' and ' +
    consultationCol + ' < date \'"&TEXT(TODAY()+1,"yyyy-MM-dd")&"\'",0),"—")'
  );
}

/**
 * Design §2: «Сводка» — воронка, доля договоров, время до первого контакта,
 * источники, месяцы. Задача 0.4.0: «Откуда» теперь на «Служебное», не на
 * «Заявки» — сводка ссылается на новый лист.
 */
function ensureSummaryFormulas_(sheet) {
  if (sheet.getRange(1, 1).getValue()) return;
  var req = "'" + SHEET_REQUESTS_ + "'!";
  var statusColLetter = columnLetter_(OFFICE_HEADERS_.indexOf('Статус') + 1);
  var noColLetter = columnLetter_(OFFICE_HEADERS_.indexOf('№') + 1);

  sheet.getRange(1, 1).setValue('Воронка по статусам');
  sheet.getRange(2, 1).setFormula(
    '=IFERROR(QUERY(' + req + statusColLetter + '2:' + statusColLetter +
    ',"select Col1, count(Col1) where Col1 is not null group by Col1",0),"—")'
  );
  sheet.getRange(1, 4).setValue('Доля «Клиент — договор»');
  sheet.getRange(2, 4).setFormula(
    '=IFERROR(COUNTIF(' + req + statusColLetter + ':' + statusColLetter +
    ',"Клиент — договор")/COUNTA(' + req + noColLetter + '2:' + noColLetter + '),"—")'
  );

  var svc = "'" + SHEET_SERVICE_ + "'!";
  var sourceColLetter = columnLetter_(SERVICE_SHEET_HEADERS_.indexOf('Откуда') + 1);
  sheet.getRange(1, 6).setValue('Источники (месяц)');
  sheet.getRange(2, 6).setFormula(
    '=IFERROR(QUERY(' + svc + sourceColLetter + '2:' + sourceColLetter +
    ',"select Col1, count(Col1) where Col1 is not null group by Col1",0),"—")'
  );
}

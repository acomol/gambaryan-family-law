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
  if (sheet.getRange(1, 1).getValue()) return; // уже настроено — не перезаписываем
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

  // Блок 1: Просрочено
  var overdueQuery = '=IFERROR(QUERY(' + reqRange + ',"select ' + noCol + ',' + nameCol + ',' + nextStepCol +
    ' where ' + nextStepCol + ' < date \'"&TEXT(TODAY(),"yyyy-MM-dd")&"\' and ' + nextStepCol + ' is not null and ' +
    notClosed + ' order by ' + nextStepCol + ' asc",0),"")';
  buildTodayBlock_(sheet, TODAY_HEADER_ROW_OVERDUE_, '🔴 ПРОСРОЧЕНО — следующий шаг прошёл',
    ['№', 'Имя', 'Шаг был', 'Открыть'], overdueQuery, requestsSheetId);
  sheet.getRange(TODAY_HEADER_ROW_OVERDUE_, 1, 1, 4).setBackground('#FFCDD2'); // design §3.4 — тот же красный, что overdue в «Заявках»

  // Блок 2: Новые — ждут первой попытки
  var newQuery = '=IFERROR(QUERY(' + reqRange + ',"select ' + noCol + ',' + nameCol + ',' + phoneCol +
    ' where ' + statusCol + ' = \'\' or ' + statusCol + ' is null order by ' + receivedCol + ' asc",0),"")';
  buildTodayBlock_(sheet, TODAY_HEADER_ROW_NEW_, '🟡 НОВЫЕ — ждут первой попытки',
    ['№', 'Имя', 'Телефон', 'Открыть'], newQuery, requestsSheetId);
  sheet.getRange(TODAY_HEADER_ROW_NEW_, 1, 1, 4).setBackground('#FFF9C4'); // design §3.4 — тот же жёлтый, что «Новая» в «Заявках»

  // Блок 3: Консультации сегодня
  var consultQuery = '=IFERROR(QUERY(' + reqRange + ',"select ' + noCol + ',' + nameCol + ',' + consultCol +
    ' where ' + consultCol + ' >= date \'"&TEXT(TODAY(),"yyyy-MM-dd")&"\' and ' + consultCol +
    ' < date \'"&TEXT(TODAY()+1,"yyyy-MM-dd")&"\' order by ' + consultCol + ' asc",0),"")';
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

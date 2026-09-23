// Структурные фейки GAS-сервисов для тестирования GAS-only кода (Sheets.gs,
// Code.gs, Notifications.gs) в Node — без обращения к настоящему Google API.
// Покрывают только то подмножество методов SpreadsheetApp/Session/PropertiesService/
// LockService/ScriptApp/ContentService/MailApp, которое реально вызывают src/*.gs
// (см. grep в отчёте задачи). Задача этих фейков — не эмулировать Google Sheets
// целиком, а дать детерминированную, интроспектируемую замену ровно тех операций,
// которые проверяемый код выполняет.

function makeFakeProtection(initialEmails, type) {
  var emails = (initialEmails || []).slice();
  var description = '';
  var domainEdit = true;
  var warningOnly = false;
  function userObj(email) { return { getEmail: function () { return email; } }; }
  var protection = {
    _type: type || 'SHEET',
    getEditors: function () { return emails.map(userObj); },
    removeEditors: function (list) {
      var toRemove = (list || []).map(function (e) { return typeof e === 'string' ? e : e.getEmail(); });
      emails = emails.filter(function (e) { return toRemove.indexOf(e) === -1; });
      return protection;
    },
    addEditors: function (list) {
      (list || []).forEach(function (e) {
        var email = typeof e === 'string' ? e : e.getEmail();
        // Реальный Protection.addEditors бросает на невалидный email — пустая
        // строка (например Session.getEffectiveUser().getEmail() без scope
        // userinfo.email) сюда попадать не должна (review находка №4). Фейк
        // сознательно бросает, а не молча игнорирует — иначе баг "забыли
        // проверить на пустую строку" не проявляется ни в одном тесте.
        if (!email) throw new Error('Protection.addEditors: invalid email address ""');
        if (emails.indexOf(email) === -1) emails.push(email);
      });
      return protection;
    },
    setDescription: function (d) { description = d; return protection; },
    getDescription: function () { return description; },
    canDomainEdit: function () { return domainEdit; },
    setDomainEdit: function (v) { domainEdit = v; return protection; },
    setWarningOnly: function (v) { warningOnly = v; return protection; },
    isWarningOnly: function () { return warningOnly; },
    _emails: function () { return emails.slice(); }
  };
  return protection;
}

function makeFakeRange(sheet, row, col, numRows, numCols) {
  numRows = numRows || 1;
  numCols = numCols || 1;
  var range = {
    getValues: function () {
      var out = [];
      for (var r = 0; r < numRows; r++) {
        var dataRow = sheet._data[row - 1 + r] || [];
        var line = [];
        for (var c = 0; c < numCols; c++) {
          var v = dataRow[col - 1 + c];
          line.push(v === undefined ? '' : v);
        }
        out.push(line);
      }
      return out;
    },
    getValue: function () { return range.getValues()[0][0]; },
    // Симуляция formula re-injection (задача fix item1, Codex review): реальный
    // Google Sheets парсит ведущий "="/"+"/"-"/"@"/TAB/CR как формулу при
    // setValue()/setValues() НЕЗАВИСИМО от источника записи (Class Range docs),
    // ЕСЛИ ячейка не отформатирована как обычный текст ("@"). Фейк воспроизводит
    // ровно эту семантику: если формат ячейки НЕ "@" и значение похоже на
    // формулу — запись попадает в sheet._formulas (getFormulas() её увидит);
    // формат "@", выставленный ДО setValue/setValues, держит значение текстом.
    setValues: function (values) {
      for (var r = 0; r < values.length; r++) {
        var idx = row - 1 + r;
        while (sheet._data.length <= idx) sheet._data.push([]);
        for (var c = 0; c < values[r].length; c++) {
          var v = values[r][c];
          var cellRow = row + r;
          var cellCol = col + c;
          var fmt = (sheet._numberFormats && sheet._numberFormats[cellRow + ':' + cellCol]) || null;
          var isPlainText = fmt === '@';
          var isFormulaLike = typeof v === 'string' && /^[=+\-@\t\r]/.test(v);
          sheet._formulas = sheet._formulas || {};
          if (isFormulaLike && !isPlainText) {
            sheet._formulas[cellRow + ':' + cellCol] = v;
          } else {
            delete sheet._formulas[cellRow + ':' + cellCol];
          }
          sheet._data[idx][col - 1 + c] = v;
        }
      }
      return range;
    },
    setValue: function (v) { return range.setValues([[v]]); },
    setFormula: function (f) { return range.setValue(f); },
    getFormula: function () { return (sheet._formulas && sheet._formulas[row + ':' + col]) || ''; },
    getFormulas: function () {
      var out = [];
      for (var r = 0; r < numRows; r++) {
        var line = [];
        for (var c = 0; c < numCols; c++) {
          line.push((sheet._formulas && sheet._formulas[(row + r) + ':' + (col + c)]) || '');
        }
        out.push(line);
      }
      return out;
    },
    setNumberFormat: function (fmt) {
      sheet._numberFormats = sheet._numberFormats || {};
      for (var r = 0; r < numRows; r++) {
        for (var c = 0; c < numCols; c++) {
          sheet._numberFormats[(row + r) + ':' + (col + c)] = fmt;
        }
      }
      return range;
    },
    setDataValidation: function () { return range; },
    // дашборд «Сегодня»/«Сводка»: несколько отдельных формул одним вызовом
    // (funnel T5:T8) — по одной строке-массиву на ячейку диапазона, как
    // setValues, но каждая помечается формулой (в отличие от одиночной
    // ARRAYFORMULA-ячейки, которая просто setFormula() на якорь и спиллится).
    setFormulas: function (formulas) { return range.setValues(formulas); },
    setBackground: function (color) {
      sheet._backgrounds = sheet._backgrounds || {};
      for (var r = 0; r < numRows; r++) {
        for (var c = 0; c < numCols; c++) {
          sheet._backgrounds[(row + r) + ':' + (col + c)] = color;
        }
      }
      return range;
    },
    getBackground: function () { return (sheet._backgrounds && sheet._backgrounds[row + ':' + col]) || '#ffffff'; },
    // merge — дашборд заголовки блоков «Сегодня»/«Сводка» (A:D в одну ячейку);
    // фейк не эмулирует реальное объединение ячеек листа, только отмечает
    // диапазон как «объединённый» для тестов, которые это проверяют.
    merge: function () {
      sheet._merges = sheet._merges || [];
      sheet._merges.push({ row: row, col: col, numRows: numRows, numCols: numCols });
      return range;
    },
    setRichTextValue: function (rtv) {
      sheet._richText = sheet._richText || {};
      sheet._richText[row + ':' + col] = rtv;
      range.setValue(rtv && rtv.getText ? rtv.getText() : '');
      return range;
    },
    getRichTextValue: function () {
      return (sheet._richText && sheet._richText[row + ':' + col]) || null;
    },
    protect: function () {
      var p = makeFakeProtection([], 'RANGE');
      p._rangeInfo = { row: row, col: col, numRows: numRows, numCols: numCols };
      sheet._protections.push(p);
      return p;
    },
    getRow: function () { return row; },
    getColumn: function () { return col; },
    getNumRows: function () { return numRows; },
    getNumColumns: function () { return numCols; }
  };
  return range;
}

export function makeFakeSheet(name, opts) {
  opts = opts || {};
  var sheet = {
    _name: name,
    _data: (opts.data || []).map(function (r) { return r.slice(); }),
    _protections: [],
    _maxRows: opts.maxRows || 1000,
    _getDataRangeCallCount: 0,
    getName: function () { return sheet._name; },
    setName: function (n) { sheet._name = n; },
    getSheetId: function () { return opts.sheetId === undefined ? 0 : opts.sheetId; },
    getRange: function (row, col, numRows, numCols) { return makeFakeRange(sheet, row, col, numRows, numCols); },
    getDataRange: function () {
      sheet._getDataRangeCallCount++;
      var rows = Math.max(sheet._data.length, 1);
      var cols = Math.max(sheet.getLastColumn(), 1);
      return makeFakeRange(sheet, 1, 1, rows, cols);
    },
    getLastRow: function () { return sheet._data.length; },
    getLastColumn: function () {
      return sheet._data.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    },
    getMaxRows: function () { return Math.max(sheet._maxRows, sheet._data.length); },
    // design fix item1: appendRow — тоже точка записи внешних строк (новая
    // заявка/докрутка orphan), поэтому подчиняется той же симуляции formula
    // re-injection, что и Range.setValues() выше: ячейка, заранее (ДО
    // appendRow) отформатированная как "@" (см. protectExternalTextColumns_ в
    // Code.gs), не становится "формулой" в фейке, даже если значение начинается
    // с "="/"+"/"-"/"@"/TAB/CR.
    appendRow: function (row) {
      var newRowIndex = sheet._data.length + 1; // 1-based позиция ПОСЛЕ вставки
      var newRow = row.slice();
      sheet._formulas = sheet._formulas || {};
      for (var c = 0; c < newRow.length; c++) {
        var v = newRow[c];
        var cellCol = c + 1;
        var fmt = (sheet._numberFormats && sheet._numberFormats[newRowIndex + ':' + cellCol]) || null;
        var isPlainText = fmt === '@';
        var isFormulaLike = typeof v === 'string' && /^[=+\-@\t\r]/.test(v);
        if (isFormulaLike && !isPlainText) {
          sheet._formulas[newRowIndex + ':' + cellCol] = v;
        } else {
          delete sheet._formulas[newRowIndex + ':' + cellCol];
        }
      }
      sheet._data.push(newRow);
    },
    setFrozenRows: function () {},
    setFrozenColumns: function () {},
    hideColumns: function (start, count) {
      sheet._hiddenColumns = sheet._hiddenColumns || [];
      sheet._hiddenColumns.push({ start: start, count: count || 1 });
    },
    autoResizeColumns: function () {},
    setColumnWidth: function (col, width) {
      sheet._columnWidths = sheet._columnWidths || {};
      sheet._columnWidths[col] = width;
      return sheet;
    },
    getProtections: function (type) {
      return sheet._protections.filter(function (p) { return !type || p._type === type; });
    },
    protect: function () {
      var p = makeFakeProtection([], 'SHEET');
      sheet._protections.push(p);
      return p;
    },
    // дашборд-тесты (Сводка/Сегодня) проверяют условное форматирование через
    // фейк — раньше это был no-op и ничего нельзя было проверить.
    setConditionalFormatRules: function (rules) { sheet._conditionalFormatRules = (rules || []).slice(); return sheet; },
    getConditionalFormatRules: function () { return (sheet._conditionalFormatRules || []).slice(); },
    hideSheet: function () { sheet._hidden = true; return sheet; },
    showSheet: function () { sheet._hidden = false; return sheet; },
    isSheetHidden: function () { return !!sheet._hidden; },
    // дашборд-тесты (5 графиков «Сводки») — минимальная симуляция
    // EmbeddedChartBuilder: тип/диапазоны/опции записываются, insertChart
    // складывает построенный чарт в sheet._charts для проверки.
    newChart: function () {
      var built = { chartType: null, ranges: [], options: {}, position: null, numHeaders: 0, stacked: false };
      var builder = {
        setChartType: function (t) { built.chartType = t; return builder; },
        addRange: function (r) { built.ranges.push(r); return builder; },
        setPosition: function (row, col, offsetX, offsetY) { built.position = { row: row, col: col, offsetX: offsetX, offsetY: offsetY }; return builder; },
        setOption: function (k, v) { built.options[k] = v; return builder; },
        setNumHeaders: function (n) { built.numHeaders = n; return builder; },
        setStacked: function () { built.stacked = true; return builder; },
        setTitle: function (t) { built.title = t; return builder; },
        setXAxisTitle: function (t) { built.xAxisTitle = t; return builder; },
        setYAxisTitle: function (t) { built.yAxisTitle = t; return builder; },
        setLegendPosition: function (p) { built.legendPosition = p; return builder; },
        build: function () { return { _built: built }; }
      };
      return builder;
    },
    insertChart: function (chart) {
      sheet._charts = sheet._charts || [];
      sheet._charts.push(chart._built);
    },
    removeChart: function (chart) {
      sheet._charts = (sheet._charts || []).filter(function (c) { return c !== (chart && chart._built); });
    },
    getCharts: function () { return (sheet._charts || []).slice(); }
  };
  return sheet;
}

export function makeFakeSpreadsheet(sheetsByName) {
  var sheets = {};
  Object.keys(sheetsByName || {}).forEach(function (n) { sheets[n] = sheetsByName[n]; });
  return {
    getSheetByName: function (n) { return sheets[n] || null; },
    insertSheet: function (n) { var s = makeFakeSheet(n); sheets[n] = s; return s; },
    _sheets: sheets
  };
}

export function makeFakeSpreadsheetApp(spreadsheetsById) {
  function fakeValidationBuilder() {
    var built = {};
    var api = {
      requireValueInList: function (list, showDropdown) { built.list = list; built.showDropdown = showDropdown; return api; },
      setAllowInvalid: function (v) { built.allowInvalid = v; return api; },
      build: function () { return built; }
    };
    return api;
  }
  function fakeCFRuleBuilder() {
    var built = {};
    var api = {
      whenFormulaSatisfied: function (f) { built.formula = f; return api; },
      setBackground: function (c) { built.background = c; return api; },
      setBold: function (v) { built.bold = v === undefined ? true : v; return api; },
      setItalic: function () { return api; },
      setStrikethrough: function (v) { built.strikethrough = v === undefined ? true : v; return api; },
      setFontColor: function (c) { built.fontColor = c; return api; },
      setRanges: function (r) { built.ranges = r; return api; },
      build: function () { return built; }
    };
    return api;
  }
  return {
    openById: function (id) { return spreadsheetsById[id]; },
    newDataValidation: fakeValidationBuilder,
    newConditionalFormatRule: fakeCFRuleBuilder,
    newRichTextValue: function () {
      var text = '';
      var links = [];
      var builder = {
        setText: function (t) { text = t; return builder; },
        setLinkUrl: function (a, b, c) {
          if (arguments.length === 1) {
            links.push({ start: 0, end: text.length, url: a });
          } else {
            links.push({ start: a, end: b, url: c });
          }
          return builder;
        },
        build: function () {
          var builtText = text;
          var builtLinks = links.slice();
          return { getText: function () { return builtText; }, _links: builtLinks };
        }
      };
      return builder;
    },
    ProtectionType: { SHEET: 'SHEET', RANGE: 'RANGE' }
  };
}

export function makeFakeSession(email) {
  return { getEffectiveUser: function () { return { getEmail: function () { return email; } }; } };
}

export function makeFakePropertiesService(initialProps) {
  var store = Object.assign({}, initialProps || {});
  var scriptProps = {
    getProperty: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setProperty: function (k, v) { store[k] = String(v); }
  };
  return { getScriptProperties: function () { return scriptProps; }, _store: store };
}

// design fix item7: opts.tryLock === false симулирует таймаут блокировки
// (например, handleEdit_ на 5с) — по умолчанию блокировка всегда удаётся.
export function makeFakeLockService(opts) {
  opts = opts || {};
  return {
    getScriptLock: function () {
      return {
        tryLock: function () { return opts.tryLock === undefined ? true : opts.tryLock; },
        releaseLock: function () {}
      };
    }
  };
}

export function makeFakeMailApp(opts) {
  opts = opts || {};
  var sent = [];
  return {
    sendEmail: function (msg) {
      if (opts.shouldThrow) throw new Error(typeof opts.shouldThrow === 'string' ? opts.shouldThrow : 'MailApp: forced failure');
      sent.push(msg);
    },
    // design fix item5: MailApp.getRemainingDailyQuota() — реальный метод
    // (https://developers.google.com/apps-script/reference/mail/mail-app),
    // используется, чтобы ретраи уведомлений не жгли всю суточную квоту.
    getRemainingDailyQuota: function () { return opts.remainingDailyQuota === undefined ? 1000 : opts.remainingDailyQuota; },
    _sent: sent
  };
}

/**
 * pipeline-health v1 — UrlFetchApp.fetch(url, params) фейк. opts.responses —
 * очередь {code, body} (или {shouldThrow} для симуляции сетевой ошибки/таймаута),
 * по одной на КАЖДЫЙ вызов fetch(); когда очередь короче числа вызовов,
 * последний элемент переиспользуется (удобно для "все последующие проверки
 * успешны/неуспешны одинаково"). muteHttpExceptions в params — как в реальном
 * UrlFetchApp, здесь просто игнорируется (фейк никогда не бросает на
 * неуспешном коде ответа сам по себе, только когда явно указан shouldThrow).
 */
export function makeFakeUrlFetchApp(opts) {
  opts = opts || {};
  var responses = opts.responses || [{ code: 200, body: '{}' }];
  var calls = [];
  return {
    fetch: function (url, params) {
      calls.push({ url: url, params: params });
      var idx = Math.min(calls.length - 1, responses.length - 1);
      var resp = responses[idx];
      if (resp.shouldThrow) throw new Error(typeof resp.shouldThrow === 'string' ? resp.shouldThrow : 'UrlFetchApp: forced failure');
      return {
        getResponseCode: function () { return resp.code; },
        getContentText: function () { return resp.body; }
      };
    },
    _calls: calls
  };
}

export function makeFakeScriptApp() {
  var triggers = [];
  function triggerBuilder(handler) {
    var t = { handler: handler, type: null };
    var api = {
      timeBased: function () { t.type = 'time'; return api; },
      everyMinutes: function (n) { t.everyMinutes = n; return api; },
      forSpreadsheet: function (id) { t.spreadsheetId = id; return api; },
      onEdit: function () { t.type = 'onEdit'; return api; },
      onOpen: function () { t.type = 'onOpen'; return api; },
      create: function () {
        var handle = { getHandlerFunction: function () { return handler; }, _t: t };
        triggers.push(handle);
        return handle;
      }
    };
    return api;
  }
  return {
    newTrigger: function (handler) { return triggerBuilder(handler); },
    getProjectTriggers: function () { return triggers.slice(); },
    deleteTrigger: function (t) {
      var i = triggers.indexOf(t);
      if (i !== -1) triggers.splice(i, 1);
    },
    _triggers: triggers
  };
}

export function makeFakeContentService() {
  return {
    createTextOutput: function (text) {
      var mime = null;
      var out = {
        setMimeType: function (m) { mime = m; return out; },
        getContent: function () { return text; },
        _mimeType: function () { return mime; }
      };
      return out;
    },
    MimeType: { JSON: 'JSON' }
  };
}

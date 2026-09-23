// Дашборд «Сводка»/«Сегодня» — docs/crm-dashboard/DESIGN.md. Тестируется через
// структурные фейки (test/helpers/gas-fakes.mjs), диапазоны/формулы/условное
// форматирование проверяются, а не визуальный рендер (Sheets формулы не
// выполняются в Node — см. README "не выполнялось вживую").
import { test, assert, toHost } from './helpers/harness.mjs';
import { loadGasContext } from './helpers/load-gas.mjs';
import { makeFakeSheet, makeFakeSpreadsheetApp, makeFakeSession } from './helpers/gas-fakes.mjs';

function newCtx() {
  return loadGasContext(undefined, {
    SpreadsheetApp: makeFakeSpreadsheetApp({}),
    Session: makeFakeSession('alex@adfix.co.il')
  });
}

// B3 fix: writeSummaryChartData_/writeSummaryKpis_/ensureTodayFormulas_ теперь
// резолвят колонки «Заявки»/«Служебное» по РЕАЛЬНОЙ строке заголовков этих
// листов, а не по статическому OFFICE_HEADERS_/SERVICE_SHEET_HEADERS_ —
// тестам нужны фейки с настоящей header-строкой (по умолчанию — «как есть»,
// без реордера; тест B3 в fix-b.test.mjs проверяет реордер отдельно).
function makeRequestsSheetWithHeaders(ctx, headers, opts) {
  return makeFakeSheet('Заявки', Object.assign({ data: [(headers || ctx.OFFICE_HEADERS_).slice()] }, opts || {}));
}
function makeServiceSheetWithHeaders(ctx, headers, opts) {
  return makeFakeSheet('Служебное', Object.assign({ data: [(headers || ctx.SERVICE_SHEET_HEADERS_).slice()] }, opts || {}));
}

// =============================================================================
// «Сегодня» — design §3
// =============================================================================

test('ensureTodayFormulas_: строка-счётчик (A1) считает просрочки/новых/консультации теми же условиями, что и блоки', () => {
  const ctx = newCtx();
  const today = makeFakeSheet('Сегодня');
  const requests = makeRequestsSheetWithHeaders(ctx, undefined, { sheetId: 456 });
  ctx.ensureTodayFormulas_(today, requests);

  const banner = today.getRange(1, 1).getFormula();
  assert.ok(banner.indexOf('COUNTIFS') !== -1, 'A1 должна быть формулой со счётчиками');
  assert.ok(banner.indexOf('просрочки') !== -1 && banner.indexOf('новых') !== -1 && banner.indexOf('консультация') !== -1,
    'баннер должен упоминать все три категории');
  // B4 fix ("new-leads counter counts empty rows of a whole column"): счёт
  // «новых» обязан включать условие "№ не пусто" (реальная строка), иначе
  // COUNTIFS(Статус:Статус,"") считает и пустые строки ниже данных.
  assert.ok(/COUNTIFS\([^)]*№?[^,]*,"<>"/.test(banner) || banner.indexOf(',"<>",') !== -1,
    'счётчик «новых» ограничен реальными строками (№ <> ""), не всей пустой колонкой');
});

test('ensureTodayFormulas_: 3 блока (Просрочено/Новые/Консультации) — заголовки, статичная заливка (design §3.4), правильные условия QUERY, без коллизий (B2)', () => {
  const ctx = newCtx();
  const today = makeFakeSheet('Сегодня');
  const requests = makeRequestsSheetWithHeaders(ctx, undefined, { sheetId: 0 });
  ctx.ensureTodayFormulas_(today, requests);

  const OVERDUE = ctx.TODAY_HEADER_ROW_OVERDUE_;
  const NEW = ctx.TODAY_HEADER_ROW_NEW_;
  const CONSULT = ctx.TODAY_HEADER_ROW_CONSULT_;

  assert.match(today._data[OVERDUE - 1][0], /ПРОСРОЧЕНО/);
  assert.equal(today.getRange(OVERDUE, 1).getBackground(), '#FFCDD2', 'design §3.4: тот же красный, что overdue в «Заявках»');
  assert.match(today._data[NEW - 1][0], /НОВЫЕ/);
  assert.equal(today.getRange(NEW, 1).getBackground(), '#FFF9C4', 'design §3.4: тот же жёлтый, что «Новая»');
  assert.match(today._data[CONSULT - 1][0], /КОНСУЛЬТАЦИИ/);
  assert.equal(today.getRange(CONSULT, 1).getBackground(), '#CE93D8', 'design §3.4: тот же сиреневый, что «Консультация назначена»');

  // B2 fix: блоки должны быть разнесены минимум на ёмкость блока — заголовок
  // следующего блока не может физически попасть в спилл-зону предыдущего.
  assert.ok(NEW - OVERDUE >= ctx.TODAY_BLOCK_CAPACITY_, 'блок «Новые» не может начинаться внутри спилл-зоны «Просрочено»');
  assert.ok(CONSULT - NEW >= ctx.TODAY_BLOCK_CAPACITY_, 'блок «Консультации» не может начинаться внутри спилл-зоны «Новые»');

  const overdueQuery = today.getRange(OVERDUE + 2, 1).getFormula();
  assert.ok(overdueQuery.indexOf('QUERY') !== -1);
  assert.ok(overdueQuery.indexOf('Col11') !== -1, 'условие по «Следующий шаг» (Col11 в A2:N)');
  assert.ok(overdueQuery.indexOf('Клиент — договор') !== -1 && overdueQuery.indexOf('Дубль / спам') !== -1,
    'закрытые заявки исключены из «просрочено» (не только «Следующий шаг» в прошлом)');

  const newQuery = today.getRange(NEW + 2, 1).getFormula();
  assert.ok(newQuery.indexOf('Col2') !== -1, 'блок «Новые» фильтрует по пустому статусу (Col2)');

  const consultQuery = today.getRange(CONSULT + 2, 1).getFormula();
  assert.ok(consultQuery.indexOf('Col12') !== -1, 'блок «Консультации» — по колонке Консультация (Col12)');
});

test('ensureTodayFormulas_: ссылка «Открыть» — НАСТОЯЩИЙ вложенный HYPERLINK() внутри ARRAYFORMULA, покрывает всю ёмкость блока, не только 10 строк (B2/§3.3)', () => {
  const ctx = newCtx();
  const today = makeFakeSheet('Сегодня');
  const requests = makeRequestsSheetWithHeaders(ctx, undefined, { sheetId: 789 });
  ctx.ensureTodayFormulas_(today, requests);

  const dataRow = ctx.TODAY_HEADER_ROW_OVERDUE_ + 2;
  const openFormula = today.getRange(dataRow, 4).getFormula();
  assert.ok(openFormula.indexOf('ARRAYFORMULA') !== -1);
  assert.ok(openFormula.indexOf('HYPERLINK(') !== -1, 'HYPERLINK должен быть НАСТОЯЩИМ вызовом функции');
  assert.ok(openFormula.indexOf('"=HYPERLINK') === -1,
    'HYPERLINK НЕ должен быть текстовой строкой внутри формулы (design §3.3 баг — вычисленная строка "=HYPERLINK(...)" не становится ссылкой, Sheets не перепарсивает результат формулы)');
  assert.ok(openFormula.indexOf('gid=789') !== -1, 'gid должен быть живым sheetId «Заявки», не плейсхолдером <GID_ЗАЯВКИ>');
  assert.ok(openFormula.indexOf('<GID') === -1, 'не должно остаться плейсхолдера из дизайн-документа');
  assert.ok(openFormula.indexOf('MATCH(') !== -1, 'номер строки «Заявки» ищется через MATCH, не хардкожен');
  // B2 fix, вторая часть: якорь ссылки должен покрывать всю ёмкость блока
  // (TODAY_BLOCK_CAPACITY_), а не быть обрезан на 10 строках.
  const lastDataRow = dataRow + ctx.TODAY_BLOCK_CAPACITY_ - 1;
  assert.ok(openFormula.indexOf('A' + dataRow + ':A' + lastDataRow) !== -1,
    'якорь «Открыть» должен покрывать все ' + ctx.TODAY_BLOCK_CAPACITY_ + ' строк ёмкости блока, не только первые 10');
});

test('ensureTodayFormulas_: идемпотентна — повторный вызов не перезаписывает уже настроенный лист', () => {
  const ctx = newCtx();
  const today = makeFakeSheet('Сегодня');
  const requests = makeRequestsSheetWithHeaders(ctx, undefined, { sheetId: 0 });
  ctx.ensureTodayFormulas_(today, requests);
  const before = JSON.stringify(today._data);
  ctx.ensureTodayFormulas_(today, requests);
  assert.equal(JSON.stringify(today._data), before);
});

// =============================================================================
// «Сводка» — design §2
// =============================================================================

test('ensureSummaryFormulas_: заголовок + "Обновлено" + 6 KPI-плашек со своими метками (design §2.1/§2.2)', () => {
  const ctx = newCtx();
  const summary = makeFakeSheet('Сводка');
  const requests = makeRequestsSheetWithHeaders(ctx);
  const service = makeServiceSheetWithHeaders(ctx);
  ctx.ensureSummaryFormulas_(summary, requests, service);

  assert.match(summary._data[0][0], /Сводка/);
  assert.ok(summary.getRange(1, 8).getFormula().indexOf('NOW()') !== -1);

  const labels = [summary._data[2][0], summary._data[7][0], summary._data[12][0], summary._data[17][0], summary._data[22][0], summary._data[27][0]];
  assert.match(labels[0], /7 дней/);
  assert.match(labels[1], /30 дней/);
  assert.match(labels[2], /консультации/);
  assert.match(labels[3], /Договор/);
  assert.match(labels[4], /1-й попытки/);
  assert.match(labels[5], /Просрочено/);
});

test('ensureSummaryFormulas_: KPI-1 — 7 дней, дельта к предыдущим 7 дням, порог тренда (prev14) для CF (design §2.2/§2.5)', () => {
  const ctx = newCtx();
  const summary = makeFakeSheet('Сводка');
  const requests = makeRequestsSheetWithHeaders(ctx);
  const service = makeServiceSheetWithHeaders(ctx);
  ctx.ensureSummaryFormulas_(summary, requests, service);

  const cur = summary.getRange(4, 1).getFormula();
  assert.ok(cur.indexOf('COUNTIFS') !== -1 && cur.indexOf('TODAY()-7') !== -1);
  const prev = summary.getRange(4, 2).getFormula();
  assert.ok(prev.indexOf('TODAY()-14') !== -1 && prev.indexOf('TODAY()-7') !== -1);
  const prev14 = summary.getRange(4, 4).getFormula();
  assert.ok(prev14.indexOf('TODAY()-21') !== -1, 'design §2.5 rule 3 требует prev14 для проверки "падение 2 недели подряд"');
  const delta = summary.getRange(4, 3).getFormula();
  assert.ok(delta.indexOf('▲+') !== -1 && delta.indexOf('▼') !== -1, 'дельта — "▲+N" или "▼N", не "▼-N"');
});

test('ensureSummaryFormulas_: KPI-3/KPI-4 всегда печатают знаменатель n рядом с долей (design §4 "малые числа")', () => {
  const ctx = newCtx();
  const summary = makeFakeSheet('Сводка');
  const requests = makeRequestsSheetWithHeaders(ctx);
  const service = makeServiceSheetWithHeaders(ctx);
  ctx.ensureSummaryFormulas_(summary, requests, service);

  const kpi3sub = summary.getRange(15, 1).getFormula();
  assert.ok(kpi3sub.indexOf('$B$14') !== -1, 'KPI-3: доля печатается только рядом со знаменателем n (B14)');
  assert.ok(kpi3sub.indexOf('IF($B$14=0') !== -1, 'n=0 -> "—", не деление на ноль');

  const kpi4total = summary.getRange(19, 1).getFormula();
  assert.ok(kpi4total.indexOf('Клиент — договор') !== -1);
  const kpi4sub = summary.getRange(20, 1).getFormula();
  assert.ok(kpi4sub.indexOf('$A$19') !== -1 && kpi4sub.indexOf('$B$19') !== -1);
});

test('ensureSummaryFormulas_: KPI-5 (медиана до 1-й попытки) честно показывает "—" — «Служебное»!J ещё не реализован (design §0, вне объёма)', () => {
  const ctx = newCtx();
  const summary = makeFakeSheet('Сводка');
  const requests = makeRequestsSheetWithHeaders(ctx);
  const service = makeServiceSheetWithHeaders(ctx);
  ctx.ensureSummaryFormulas_(summary, requests, service);
  const median = summary.getRange(24, 1).getFormula();
  assert.ok(median.indexOf('MEDIAN') !== -1 && median.indexOf('FILTER') !== -1);
  assert.ok(median.indexOf('—') !== -1, 'IFERROR ветка — "—"');
  const sub = summary.getRange(25, 1).getFormula();
  assert.ok(sub.indexOf('VLOOKUP') !== -1 && sub.indexOf('sla_first_attempt_minutes') !== -1,
    'порог SLA читается динамически из «Настройки», не захардкожен числом');
});

test('ensureSummaryFormulas_: KPI-6 (просрочено сейчас) — валидный COUNTIFS с полным «Заявки»!B:B, не голым «Заявки»!B (B4 fix)', () => {
  const ctx = newCtx();
  const summary = makeFakeSheet('Сводка');
  const requests = makeRequestsSheetWithHeaders(ctx);
  const service = makeServiceSheetWithHeaders(ctx);
  ctx.ensureSummaryFormulas_(summary, requests, service);
  const count = summary.getRange(29, 1).getFormula();
  assert.ok(count.indexOf('Col11') === -1); // это НЕ Today (QUERY), а прямой COUNTIFS на столбец K
  assert.ok(count.indexOf('TODAY()') !== -1);
  // B4 fix: КАЖДОЕ вхождение статусной колонки в этой формуле обязано быть
  // ПОЛНЫМ диапазоном 'Заявки'!<col>:<col> — раньше первое вхождение было
  // голым 'Заявки'!B (без ":B"), что на реальном Sheets — невалидная A1-
  // нотация внутри COUNTIFS (ошибка разбора формулы).
  assert.ok(count.indexOf("'Заявки'!B,") === -1, 'не должно остаться голого \'Заявки\'!B без диапазона (B4 regression)');
  const statusRangeCount = (count.match(/'Заявки'!B:B/g) || []).length;
  assert.ok(statusRangeCount >= 3, 'все три условия по статусу (<>Клиент-договор/<>Отказ/<>Дубль-спам) используют полный B:B');
  const sub = summary.getRange(30, 1).getFormula();
  assert.ok(sub.indexOf('Просрочек нет') !== -1, '0 -> "Просрочек нет", не голый "0"');
});

test('ensureSummaryFormulas_: скрытые данные графиков T:AH записаны и колонки скрыты (design §2.6), недельная серия — 8 РАЗНЫХ недель (B4 fix), НЕ защищены отдельно', () => {
  const ctx = newCtx();
  const summary = makeFakeSheet('Сводка');
  const requests = makeRequestsSheetWithHeaders(ctx);
  const service = makeServiceSheetWithHeaders(ctx);
  ctx.ensureSummaryFormulas_(summary, requests, service);

  const datesFormula = summary.getRange(1, 20).getFormula(); // T1
  assert.ok(datesFormula.indexOf('SEQUENCE') !== -1 && datesFormula.indexOf('TODAY()-13') !== -1);
  const dailyFormula = summary.getRange(2, 20).getFormula(); // T2
  assert.ok(dailyFormula.indexOf('MAP') !== -1 || dailyFormula.indexOf('LAMBDA') !== -1);

  // B4 fix ("the weekly series slides by days not weeks"): соседние окна
  // COUNTIFS должны сдвигаться на 7 дней (TODAY()-7*(1-w)), а не на 1 день
  // (TODAY()-daysAgo, daysAgo=7..0).
  const weeklyFormula = summary.getRange(3, 20).getFormula(); // T3
  assert.ok(weeklyFormula.indexOf('SEQUENCE(1,8,0,-1)') !== -1,
    'недельная серия — 8 непересекающихся недель (шаг 7 дней), не 8 окон со сдвигом в 1 день');
  assert.ok(weeklyFormula.indexOf('7*(1-w)') !== -1, 'ширина окна и его сдвиг завязаны на кратные 7 дням значения');
  assert.ok(!/daysAgo-6/.test(weeklyFormula), 'старая формула со сдвигом в 1 день (daysAgo) должна быть заменена');

  const funnelFormulas = summary.getRange(5, 20, 4, 1).getFormulas();
  assert.equal(funnelFormulas.length, 4, 'воронка — 4 значения (Заявки/Первая попытка/Консультация/Договор)');

  assert.ok(summary._hiddenColumns && summary._hiddenColumns.some((h) => h.start === 20 && h.count === 15),
    'T:AH = 15 колонок должны быть скрыты (design §2.6)');
});

test('ensureSummaryFormulas_: источники/причины/статус-микс не сталкиваются друг с другом даже на полной ёмкости (B2/B5 fix, "T15 reasons vs T20")', () => {
  const ctx = newCtx();
  const summary = makeFakeSheet('Сводка');
  const requests = makeRequestsSheetWithHeaders(ctx);
  const service = makeServiceSheetWithHeaders(ctx);
  ctx.ensureSummaryFormulas_(summary, requests, service);

  const sourcesRow = ctx.SUMMARY_CHART_DATA_ROW_SOURCES_;
  const reasonsRow = ctx.SUMMARY_CHART_DATA_ROW_REASONS_;
  const statusmixRow = ctx.SUMMARY_CHART_DATA_ROW_STATUSMIX_;

  // B5 fix: источники — открытый список, капасити с запасом (не "2 категории").
  assert.ok(ctx.SUMMARY_SOURCES_CAPACITY_ >= 10, 'источники ("Откуда") — открытый список, капасити должно быть с запасом');
  // B2 fix: между блоками достаточно места для их максимальной ёмкости —
  // ни один спилл (в пределах капасити блока) не долетает до начала следующего.
  assert.ok(reasonsRow - sourcesRow >= ctx.SUMMARY_SOURCES_CAPACITY_,
    'причины отказа (T' + reasonsRow + ') не должны стоять внутри спилл-зоны источников (запас ' + ctx.SUMMARY_SOURCES_CAPACITY_ + ' строк)');
  assert.ok(statusmixRow - reasonsRow >= ctx.CLOSING_REASONS_.length,
    'статус-микс (T' + statusmixRow + ') не должен стоять внутри спилл-зоны причин отказа (' + ctx.CLOSING_REASONS_.length + ' возможных причин)');

  const sourcesFormula = summary.getRange(sourcesRow, 20).getFormula();
  assert.ok(sourcesFormula.indexOf('QUERY') !== -1);
  const reasonsFormula = summary.getRange(reasonsRow, 20).getFormula();
  assert.ok(reasonsFormula.indexOf('QUERY') !== -1);
  const statusmixFormula = summary.getRange(statusmixRow, 20).getFormula();
  assert.ok(statusmixFormula.indexOf('QUERY') !== -1);
});

test('ensureSummaryFormulas_: 5 графиков созданы с правильным типом, чарт 5 — через asBarChart()/setStacked() (B1c fix), диапазоны источников/причин размером с капасити блока (B5 fix)', () => {
  const ctx = newCtx();
  const summary = makeFakeSheet('Сводка');
  const requests = makeRequestsSheetWithHeaders(ctx);
  const service = makeServiceSheetWithHeaders(ctx);
  ctx.ensureSummaryFormulas_(summary, requests, service);

  const charts = summary.getCharts();
  assert.equal(charts.length, 5, 'design §2.4 — ровно 5 графиков: недели/воронка/источники/причины/статус-микс');
  assert.equal(charts[0].chartType, 'LINE', 'чарт 1 — линия «Заявки по неделям»');
  assert.equal(charts[1].chartType, 'BAR');
  assert.equal(charts[2].chartType, 'BAR');
  assert.equal(charts[3].chartType, 'BAR');
  assert.equal(charts[4].chartType, 'BAR');
  assert.equal(charts[4].stacked, true, 'чарт 5 (статус-микс) — stacked bar (design §2.4), собран через .asBarChart() (B1c)');
  assert.deepEqual(toHost(charts[2].options.colors), ['#a02626', '#c9880a'], 'чарт 3 (источники) — цвета §1, провалидированные validate_palette.js');

  // B5 fix: диапазон чарта источников — капасити блока (не "жёстко 2 строки").
  const sourcesRange = charts[2].ranges[0];
  assert.equal(sourcesRange.getNumRows(), ctx.SUMMARY_SOURCES_CAPACITY_, 'диапазон чарта источников должен покрывать всю капасити блока');
});

test('ensureSummaryFormulas_: 3 правила условного форматирования (design §2.5) — просрочки/медиана/тренд, медиана — через INDIRECT (B1b fix)', () => {
  const ctx = newCtx();
  const summary = makeFakeSheet('Сводка');
  const requests = makeRequestsSheetWithHeaders(ctx);
  const service = makeServiceSheetWithHeaders(ctx);
  ctx.ensureSummaryFormulas_(summary, requests, service);

  const rules = summary.getConditionalFormatRules();
  assert.equal(rules.length, 3, 'design §2.5 — ровно 3 правила');
  assert.ok(rules[0].formula.indexOf('$A$29>0') !== -1);
  assert.equal(rules[0].background, '#FFCDD2');
  assert.ok(rules[1].formula.indexOf('sla_first_attempt_minutes') !== -1);
  assert.equal(rules[1].background, '#FFCC80');
  // B1b fix ("conditional-format custom formulas cannot reference another
  // sheet directly"): прямая ссылка 'Настройки'!$A:$B в custom-formula CF
  // невалидна на реальном Sheets — должна быть обёрнута в INDIRECT
  // (support.google.com/docs/answer/78413).
  assert.ok(rules[1].formula.indexOf("INDIRECT(\"'Настройки'!A:B\")") !== -1,
    'кросс-листовая ссылка в custom-formula CF обязана идти через INDIRECT("\'Настройки\'!A:B")');
  assert.ok(rules[1].formula.indexOf("'Настройки'!$A:$B") === -1,
    'прямой (не через INDIRECT) кросс-листовой ссылки в CF-формуле быть не должно');
  assert.ok(rules[2].formula.indexOf('$A$4<$B$4') !== -1 && rules[2].formula.indexOf('$B$4<$D$4') !== -1,
    'design §2.5: падение 2 недели подряд — cur<prev7 И prev7<prev14');
  assert.equal(rules[2].fontColor, '#6b7280', 'design §2.5: серый, не красный — падение заявок не «ошибка»');
});

test('ensureSummaryFormulas_: идемпотентна — повторный вызов не перезаписывает и не плодит вторые графики/правила', () => {
  const ctx = newCtx();
  const summary = makeFakeSheet('Сводка');
  const requests = makeRequestsSheetWithHeaders(ctx);
  const service = makeServiceSheetWithHeaders(ctx);
  ctx.ensureSummaryFormulas_(summary, requests, service);
  ctx.ensureSummaryFormulas_(summary, requests, service);
  assert.equal(summary.getCharts().length, 5, 'повторный setupCrm() не должен удваивать графики');
});

// =============================================================================
// P1 (build-round): «Сводка»/«Сегодня» — office не должен ломать формулы
// сортировкой/правкой; данные не должны утекать в лист, который видит офис
// =============================================================================

test('setupCrm(): «Сегодня» и «Сводка» защищены целиком — только владелец скрипта (P1 "office sheet breaks when sorted/filtered")', () => {
  const ctx = newCtx();
  const requests = makeRequestsSheetWithHeaders(ctx);
  const service = makeServiceSheetWithHeaders(ctx);
  const today = makeFakeSheet('Сегодня');
  const summary = makeFakeSheet('Сводка');
  const journal = makeFakeSheet('Журнал');
  const intake = makeFakeSheet('Входящие');
  const settings = makeFakeSheet('Настройки');
  const ss = {
    getSheetByName: function (n) {
      return { 'Заявки': requests, 'Служебное': service, 'Сегодня': today, 'Сводка': summary, 'Журнал': journal, 'Входящие': intake, 'Настройки': settings }[n] || null;
    },
    insertSheet: function () { return makeFakeSheet('x'); }
  };
  ctx.SpreadsheetApp.openById = function () { return ss; };

  ctx.setupCrm();

  const todayProt = today.getProtections('SHEET')[0];
  assert.ok(todayProt, '«Сегодня» должна получить защиту всего листа');
  assert.deepEqual(todayProt._emails(), ['alex@adfix.co.il'], 'только владелец скрипта — офис не может отредактировать/отсортировать');
  assert.equal(todayProt.isWarningOnly(), false, 'жёсткая защита (не warning-only) — иначе офис может сломать формулы');

  const summaryProt = summary.getProtections('SHEET')[0];
  assert.ok(summaryProt, '«Сводка» должна получить защиту всего листа');
  assert.deepEqual(summaryProt._emails(), ['alex@adfix.co.il']);
  assert.equal(summaryProt.isWarningOnly(), false);
});

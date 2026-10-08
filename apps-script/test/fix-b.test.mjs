// Team b-dashboard — регрессионные тесты для P1 из ревью «Сводка»/«Сегодня»
// (docs/crm-dashboard/DESIGN.md), которые НЕ покрывались permissive-фейками
// раньше (root cause: код ни разу не запускался на реальной таблице). Каждый
// тест здесь проверяет ИМЕННО тот аспект реального рантайма Google Sheets,
// который был источником бага — со ссылкой на официальную доку в комментарии.
//
// Как проверить RED -> GREEN (без сохранения снимков в репо — по образцу
// README "Как воспроизвести RED -> GREEN" для остальных тестов этого стенда):
//   git show 3354d4d:apps-script/src/Sheets.gs > /tmp/old-sheets/Sheets.gs
//   (скопировать туда же остальные src/*.gs без изменений)
//   GAS_SRC_DIR=/tmp/old-sheets node apps-script/test/run.mjs
// — тесты этого файла и обновлённые тесты dashboard.test.mjs падают на старом
// src (RED); без GAS_SRC_DIR (текущий src/) — зелёные (GREEN).
import { test, assert, toHost } from './helpers/harness.mjs';
import { loadGasContext } from './helpers/load-gas.mjs';
import { makeFakeSheet, makeFakeSpreadsheetApp, makeFakeSession } from './helpers/gas-fakes.mjs';

function newCtx() {
  return loadGasContext(undefined, {
    SpreadsheetApp: makeFakeSpreadsheetApp({}),
    Session: makeFakeSession('alex@adfix.co.il')
  });
}
function makeRequestsSheetWithHeaders(ctx, headers, opts) {
  return makeFakeSheet('Заявки', Object.assign({ data: [(headers || ctx.OFFICE_HEADERS_).slice()] }, opts || {}));
}
function makeServiceSheetWithHeaders(ctx, headers, opts) {
  return makeFakeSheet('Служебное', Object.assign({ data: [(headers || ctx.SERVICE_SHEET_HEADERS_).slice()] }, opts || {}));
}

// =============================================================================
// B1a — грид нового листа 26 колонок (A:Z); getRange()/hideColumns() за
// пределами бросают исключение на реальном Sheets.
// https://developers.google.com/apps-script/reference/spreadsheet/sheet#getmaxcolumns
// https://developers.google.com/apps-script/reference/spreadsheet/sheet#insertcolumnsafterafterposition,-howmany
// Точный текст рантайм-исключения не задокументирован официально, но
// наблюдаем и воспроизводим: https://github.com/mogsdad/SheetConverter/issues/20
// ("Those columns are out of bounds").
// =============================================================================

test('B1a: новый лист (фейк) — 26 колонок по умолчанию, getRange()/hideColumns() за пределами Z бросают (реальная граница грида)', () => {
  const sheet = makeFakeSheet('Сводка');
  assert.equal(sheet.getMaxColumns(), 26, 'новый лист Google Sheets — 26 колонок (A:Z)');
  assert.throws(() => sheet.getRange(1, 20, 1, 14), /out of bounds/i,
    'getRange(row,20,1,14) = столбцы T..AG (до 33) — за пределами 26-колоночного грида');
  assert.throws(() => sheet.hideColumns(20, 15), /out of bounds/i,
    'hideColumns(20,15) = T:AH (до столбца 34) — за пределами 26-колоночного грида');
});

test('B1a fix: ensureMinColumns_ раздвигает грид ДО обращения к T:AH — writeSummaryChartData_/insertSummaryCharts_ (столбцы 20-34) больше не падают', () => {
  const ctx = newCtx();
  const sheet = makeFakeSheet('Сводка');
  assert.equal(sheet.getMaxColumns(), 26);
  ctx.ensureMinColumns_(sheet, 34);
  assert.equal(sheet.getMaxColumns(), 34, 'insertColumnsAfter должен раздвинуть грид минимум до 34 (столбец AH)');
  assert.doesNotThrow(() => sheet.hideColumns(20, 15), 'после ensureMinColumns_ hideColumns(20,15) обязан пройти без исключения');
  assert.doesNotThrow(() => sheet.getRange(1, 20, 1, 14));
  // идемпотентность: повторный вызов с тем же/меньшим значением не откатывает назад
  ctx.ensureMinColumns_(sheet, 34);
  assert.equal(sheet.getMaxColumns(), 34, 'повторный ensureMinColumns_ с тем же значением не должен расширять грид ещё раз');
});

test('B1a integration: ensureSummaryFormulas_ на новом (26-колоночном) листе больше не бросает "out of bounds"', () => {
  const ctx = newCtx();
  const summary = makeFakeSheet('Сводка');
  const requests = makeRequestsSheetWithHeaders(ctx);
  const service = makeServiceSheetWithHeaders(ctx);
  assert.equal(summary.getMaxColumns(), 26, 'предусловие: лист «Сводка» стартует с обычных 26 колонок, как в реальности');
  assert.doesNotThrow(() => ctx.ensureSummaryFormulas_(summary, requests, service));
  assert.equal(summary.getMaxColumns(), 34);
});

// =============================================================================
// B1c — setStacked() существует ТОЛЬКО на EmbeddedBarChartBuilder/
// EmbeddedColumnChartBuilder (через .asBarChart()/.asColumnChart()), НЕ на
// базовом EmbeddedChartBuilder (newChart()/.setChartType()).
// https://developers.google.com/apps-script/reference/spreadsheet/embedded-chart-builder
// (список методов — setStacked() в нём нет)
// https://developers.google.com/apps-script/reference/spreadsheet/embedded-bar-chart-builder#setstacked
// https://developers.google.com/apps-script/reference/spreadsheet/embedded-chart-builder#asbarchart
// =============================================================================

test('B1c: generic EmbeddedChartBuilder (.setChartType()) НЕ имеет setStacked(); специализированный (.asBarChart()) — имеет', () => {
  const sheet = makeFakeSheet('Сводка');
  const generic = sheet.newChart().setChartType('BAR');
  assert.equal(typeof generic.setStacked, 'undefined',
    'newChart().setChartType(BAR) — это generic EmbeddedChartBuilder, setStacked() там не документирован');

  const barBuilder = sheet.newChart().asBarChart();
  assert.equal(typeof barBuilder.setStacked, 'function',
    'newChart().asBarChart() обязан возвращать EmbeddedBarChartBuilder с setStacked()');
  const built = barBuilder.addRange(sheet.getRange(1, 1, 2, 2)).setStacked().build();
  assert.equal(built._built.chartType, 'BAR');
  assert.equal(built._built.stacked, true);
});

test('B1c integration: insertSummaryCharts_ строит stacked-чарт статус-микса через .asBarChart(), не падает на .setStacked()', () => {
  const ctx = newCtx();
  const summary = makeFakeSheet('Сводка');
  const requests = makeRequestsSheetWithHeaders(ctx);
  const service = makeServiceSheetWithHeaders(ctx);
  ctx.ensureSummaryFormulas_(summary, requests, service);
  const charts = summary.getCharts();
  assert.equal(charts[4].stacked, true);
  assert.equal(charts[4].chartType, 'BAR');
});

// =============================================================================
// B1d — идемпотентное восстановление после частично упавшей сборки: маркер
// «готово» пишется только после ПОЛНОГО успеха; insertChart() ДОБАВЛЯЕТ, а не
// заменяет (https://developers.google.com/apps-script/reference/spreadsheet/sheet#insertchartchart),
// поэтому повторная сборка обязана сначала снять уже вставленные графики
// (Sheet.removeChart — https://developers.google.com/apps-script/reference/spreadsheet/sheet#removechartchart).
// =============================================================================

test('B1d: insertSummaryCharts_ падает на 3-м графике -> маркер A1 НЕ выставлен -> повторный ensureSummaryFormulas_ пересобирает РОВНО 5 графиков (не 2+5=7)', () => {
  const ctx = newCtx();
  const summary = makeFakeSheet('Сводка');
  const requests = makeRequestsSheetWithHeaders(ctx);
  const service = makeServiceSheetWithHeaders(ctx);

  const realNewChart = summary.newChart;
  let callCount = 0;
  summary.newChart = function () {
    callCount++;
    if (callCount === 3) throw new Error('симулированный сбой на графике №3 (например, временная ошибка платформы)');
    return realNewChart.call(summary);
  };

  assert.throws(() => ctx.ensureSummaryFormulas_(summary, requests, service), /симулированный сбой/);
  assert.equal(summary.getRange(1, 1).getValue(), '',
    'A1 (маркер «дашборд готов») должен остаться пустым — сборка не завершилась (B1d)');
  assert.equal(summary.getCharts().length, 2, 'первые 2 графика (LINE + первый BAR) успели вставиться до сбоя на третьем');

  summary.newChart = realNewChart; // «починили» источник сбоя к следующему тику
  ctx.ensureSummaryFormulas_(summary, requests, service);
  assert.equal(summary.getCharts().length, 5,
    'повторный вызов обязан ПЕРЕСОБРАТЬ ровно 5 графиков (removeChart существующих + insertChart всех 5), не доклеить поверх старых двух');
  assert.ok(summary.getRange(1, 1).getValue(), 'A1 теперь установлен — сборка завершилась полностью');
});

test('B1d: mergeOnce_ не бросает при повторном merge() уже смёрженного диапазона (Range.isPartOfMerge)', () => {
  const ctx = newCtx();
  const sheet = makeFakeSheet('Сегодня');
  const range = sheet.getRange(1, 1, 1, 4);
  assert.doesNotThrow(() => ctx.mergeOnce_(range));
  assert.equal(range.isPartOfMerge(), true);
  assert.doesNotThrow(() => ctx.mergeOnce_(sheet.getRange(1, 1, 1, 4)), 'повторный вызов на том же диапазоне не должен звать merge() второй раз');
  assert.equal((sheet._merges || []).length, 1, 'merge() реально был вызван только один раз');
});

test('B1d integration: ensureTodayFormulas_ переживает симулированный сбой на 2-м блоке ("Новые") — A1 не выставлен, повтор достраивает лист', () => {
  const ctx = newCtx();
  const today = makeFakeSheet('Сегодня');
  const requests = makeRequestsSheetWithHeaders(ctx, undefined, { sheetId: 1 });

  const realGetRange = today.getRange;
  today.getRange = function (a, b, c, d) {
    if (a === ctx.TODAY_HEADER_ROW_NEW_ && b === 1) throw new Error('симулированный сбой при построении блока «Новые»');
    return realGetRange.call(today, a, b, c, d);
  };
  assert.throws(() => ctx.ensureTodayFormulas_(today, requests), /симулированный сбой/);
  assert.equal(today.getRange(1, 1).getFormula(), '', 'банер-маркер A1 не должен быть выставлен после сбоя');

  today.getRange = realGetRange;
  assert.doesNotThrow(() => ctx.ensureTodayFormulas_(today, requests));
  assert.ok(today.getRange(1, 1).getFormula(), 'после починки повторный вызов обязан завершить сборку и выставить баннер');
});

// =============================================================================
// B3 — колонки «Заявки»/«Служебное» резолвятся по РЕАЛЬНОЙ строке заголовков
// листа (MATCH/colByHeader_), а не по статическому индексу
// OFFICE_HEADERS_/SERVICE_SHEET_HEADERS_.
// =============================================================================

test('B3: офис переставил «Телефон»/«Email» на «Заявки» вручную — ensureTodayFormulas_ резолвит блок «Новые» по РЕАЛЬНОЙ позиции, не по статическому индексу', () => {
  const ctx = newCtx();
  const reordered = ctx.OFFICE_HEADERS_.slice();
  const phoneIdx = reordered.indexOf('Телефон');
  const emailIdx = reordered.indexOf('Email');
  const tmp = reordered[phoneIdx];
  reordered[phoneIdx] = reordered[emailIdx];
  reordered[emailIdx] = tmp;
  assert.equal(reordered.indexOf('Телефон'), emailIdx, 'предусловие теста: «Телефон» реально переехал на позицию бывшего «Email»');

  const today = makeFakeSheet('Сегодня');
  const requests = makeRequestsSheetWithHeaders(ctx, reordered, { sheetId: 1 });
  ctx.ensureTodayFormulas_(today, requests);

  const newQueryRow = ctx.TODAY_HEADER_ROW_NEW_ + 2;
  const newQuery = today.getRange(newQueryRow, 1).getFormula();
  const noColExpected = 'Col' + (reordered.indexOf('№') + 1);
  const nameColExpected = 'Col' + (reordered.indexOf('Имя') + 1);
  const phoneColExpected = 'Col' + (reordered.indexOf('Телефон') + 1); // теперь = старый индекс Email + 1
  assert.ok(newQuery.indexOf('select ' + noColExpected + ',' + nameColExpected + ',' + phoneColExpected) !== -1,
    'select-список блока «Новые» обязан ссылаться на РЕАЛЬНУЮ (переставленную) колонку «Телефон» = ' + phoneColExpected +
    ', а не на позицию из статического OFFICE_HEADERS_ (была бы Col' + (ctx.OFFICE_HEADERS_.indexOf('Телефон') + 1) + ')');
});

test('B3: офис переставил «Договор»/«Откуда» на «Служебное» — writeSummaryChartData_ (воронка/источники) резолвит по РЕАЛЬНОЙ позиции', () => {
  const ctx = newCtx();
  const reordered = ctx.SERVICE_SHEET_HEADERS_.slice();
  const contractIdx = reordered.indexOf('Договор');
  const sourceIdx = reordered.indexOf('Откуда');
  const tmp = reordered[contractIdx];
  reordered[contractIdx] = reordered[sourceIdx];
  reordered[sourceIdx] = tmp;

  const summary = makeFakeSheet('Сводка');
  const requests = makeRequestsSheetWithHeaders(ctx);
  const service = makeServiceSheetWithHeaders(ctx, reordered);
  ctx.ensureSummaryFormulas_(summary, requests, service);

  const contractColExpected = ctx.columnLetter_(reordered.indexOf('Договор') + 1);
  const sourceColExpected = ctx.columnLetter_(reordered.indexOf('Откуда') + 1);
  const funnelFormulas = summary.getRange(ctx.SUMMARY_CHART_DATA_ROW_FUNNEL_, 20, 4, 1).getFormulas();
  const contractFormula = funnelFormulas[3][0]; // 4-е значение воронки — «Договор»
  assert.ok(contractFormula.indexOf("'Служебное'!" + contractColExpected + ':' + contractColExpected) !== -1,
    'воронка (шаг «Договор») обязана ссылаться на РЕАЛЬНУЮ (переставленную) колонку «Служебное»!' + contractColExpected);

  const sourcesFormula = summary.getRange(ctx.SUMMARY_CHART_DATA_ROW_SOURCES_, 20).getFormula();
  assert.ok(sourcesFormula.indexOf("'Служебное'!" + sourceColExpected + '2:' + sourceColExpected) !== -1,
    'QUERY источников обязан ссылаться на РЕАЛЬНУЮ (переставленную) колонку «Служебное»!' + sourceColExpected);
});

// =============================================================================
// B6 — data validation на «Статус»/«Причина закрытия» распространяется на
// колонку целиком через открытую A1-нотацию "<col>2:<col>"
// (https://developers.google.com/apps-script/reference/spreadsheet/sheet#getrangea1notation),
// а не на числовой снимок sheet.getMaxRows() на момент setupCrm(): новые
// строки, добавленные Albato/офисом ПОСЛЕ setup, обязаны унаследовать правило.
// =============================================================================

test('B6: строка, добавленная ПОСЛЕ setup (за пределами исходного maxRows-снимка), всё равно получает выпадающий список «Статус»/«Причина закрытия»', () => {
  const ctx = newCtx();
  const requests = makeRequestsSheetWithHeaders(ctx, undefined, { maxRows: 5 });
  ctx.applyRequestsValidation_(requests);

  const statusCol = ctx.OFFICE_HEADERS_.indexOf('Статус') + 1;
  const reasonCol = ctx.OFFICE_HEADERS_.indexOf('Причина закрытия') + 1;

  // Строка внутри исходного снимка (2..5) — правило обязано быть уже сейчас.
  assert.ok(requests.getRange(3, statusCol).getDataValidation(), 'строка в пределах исходного maxRows=5 должна иметь правило «Статус»');

  // Albato/офис добавляют строки ПОСЛЕ setup — растим лист за пределы 5.
  for (let i = 0; i < 10; i++) requests.appendRow(new Array(ctx.OFFICE_HEADERS_.length).fill(''));
  assert.ok(requests.getMaxRows() > 5, 'предусловие: лист реально вырос за пределы исходного снимка (было 5)');

  const newRow = requests.getMaxRows();
  const statusRule = requests.getRange(newRow, statusCol).getDataValidation();
  assert.ok(statusRule, 'НОВАЯ строка (' + newRow + ', за пределами снимка на момент setup) обязана унаследовать правило «Статус» — B6 fix');
  assert.deepEqual(toHost(statusRule.list), toHost(ctx.STATUS_OPTIONS_), 'это то же самое правило (список статусов), не другое/пустое');

  const reasonRule = requests.getRange(newRow, reasonCol).getDataValidation();
  assert.ok(reasonRule, 'та же логика для «Причина закрытия»');
  assert.deepEqual(toHost(reasonRule.list), toHost(ctx.CLOSING_REASONS_));
});

test('B6: заголовочная строка (row 1) НЕ затронута валидацией «Статус» (диапазон начинается с row 2)', () => {
  const ctx = newCtx();
  const requests = makeRequestsSheetWithHeaders(ctx);
  ctx.applyRequestsValidation_(requests);
  const statusCol = ctx.OFFICE_HEADERS_.indexOf('Статус') + 1;
  assert.equal(requests.getRange(1, statusCol).getDataValidation(), null, 'заголовок «Статус» не должен получить dropdown-правило');
});

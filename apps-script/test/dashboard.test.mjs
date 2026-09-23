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

// =============================================================================
// «Сегодня» — design §3
// =============================================================================

test('ensureTodayFormulas_: строка-счётчик (A1) считает просрочки/новых/консультации теми же условиями, что и блоки', () => {
  const ctx = newCtx();
  const today = makeFakeSheet('Сегодня');
  const requests = makeFakeSheet('Заявки', { sheetId: 456 });
  ctx.ensureTodayFormulas_(today, requests);

  const banner = today.getRange(1, 1).getFormula();
  assert.ok(banner.indexOf('COUNTIFS') !== -1, 'A1 должна быть формулой со счётчиками');
  assert.ok(banner.indexOf('просрочки') !== -1 && banner.indexOf('новых') !== -1 && banner.indexOf('консультация') !== -1,
    'баннер должен упоминать все три категории');
});

test('ensureTodayFormulas_: 3 блока (Просрочено/Новые/Консультации) — заголовки, статичная заливка (design §3.4), правильные условия QUERY', () => {
  const ctx = newCtx();
  const today = makeFakeSheet('Сегодня');
  const requests = makeFakeSheet('Заявки', { sheetId: 0 });
  ctx.ensureTodayFormulas_(today, requests);

  assert.match(today._data[2][0], /ПРОСРОЧЕНО/);
  assert.equal(today.getRange(3, 1).getBackground(), '#FFCDD2', 'design §3.4: тот же красный, что overdue в «Заявках»');
  assert.match(today._data[15][0], /НОВЫЕ/);
  assert.equal(today.getRange(16, 1).getBackground(), '#FFF9C4', 'design §3.4: тот же жёлтый, что «Новая»');
  assert.match(today._data[28][0], /КОНСУЛЬТАЦИИ/);
  assert.equal(today.getRange(29, 1).getBackground(), '#CE93D8', 'design §3.4: тот же сиреневый, что «Консультация назначена»');

  const overdueQuery = today.getRange(5, 1).getFormula();
  assert.ok(overdueQuery.indexOf('QUERY') !== -1);
  assert.ok(overdueQuery.indexOf('Col11') !== -1, 'условие по «Следующий шаг» (Col11 в A2:N)');
  assert.ok(overdueQuery.indexOf('Клиент — договор') !== -1 && overdueQuery.indexOf('Дубль / спам') !== -1,
    'закрытые заявки исключены из «просрочено» (не только «Следующий шаг» в прошлом)');

  const newQuery = today.getRange(18, 1).getFormula();
  assert.ok(newQuery.indexOf('Col2') !== -1, 'блок «Новые» фильтрует по пустому статусу (Col2)');

  const consultQuery = today.getRange(31, 1).getFormula();
  assert.ok(consultQuery.indexOf('Col12') !== -1, 'блок «Консультации» — по колонке Консультация (Col12)');
});

test('ensureTodayFormulas_: ссылка «Открыть» — НАСТОЯЩИЙ вложенный HYPERLINK() внутри ARRAYFORMULA, не строка-текст (fix дизайн-бага §3.3)', () => {
  const ctx = newCtx();
  const today = makeFakeSheet('Сегодня');
  const requests = makeFakeSheet('Заявки', { sheetId: 789 });
  ctx.ensureTodayFormulas_(today, requests);

  const openFormula = today.getRange(5, 4).getFormula();
  assert.ok(openFormula.indexOf('ARRAYFORMULA') !== -1);
  assert.ok(openFormula.indexOf('HYPERLINK(') !== -1, 'HYPERLINK должен быть НАСТОЯЩИМ вызовом функции');
  assert.ok(openFormula.indexOf('"=HYPERLINK') === -1,
    'HYPERLINK НЕ должен быть текстовой строкой внутри формулы (design §3.3 баг — вычисленная строка "=HYPERLINK(...)" не становится ссылкой, Sheets не перепарсивает результат формулы)');
  assert.ok(openFormula.indexOf('gid=789') !== -1, 'gid должен быть живым sheetId «Заявки», не плейсхолдером <GID_ЗАЯВКИ>');
  assert.ok(openFormula.indexOf('<GID') === -1, 'не должно остаться плейсхолдера из дизайн-документа');
  assert.ok(openFormula.indexOf('MATCH(') !== -1, 'номер строки «Заявки» ищется через MATCH, не хардкожен');
});

test('ensureTodayFormulas_: идемпотентна — повторный вызов не перезаписывает уже настроенный лист', () => {
  const ctx = newCtx();
  const today = makeFakeSheet('Сегодня');
  const requests = makeFakeSheet('Заявки', { sheetId: 0 });
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
  ctx.ensureSummaryFormulas_(summary);

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
  ctx.ensureSummaryFormulas_(summary);

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
  ctx.ensureSummaryFormulas_(summary);

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
  ctx.ensureSummaryFormulas_(summary);
  const median = summary.getRange(24, 1).getFormula();
  assert.ok(median.indexOf('MEDIAN') !== -1 && median.indexOf('FILTER') !== -1);
  assert.ok(median.indexOf('—') !== -1, 'IFERROR ветка — "—"');
  const sub = summary.getRange(25, 1).getFormula();
  assert.ok(sub.indexOf('VLOOKUP') !== -1 && sub.indexOf('sla_first_attempt_minutes') !== -1,
    'порог SLA читается динамически из «Настройки», не захардкожен числом');
});

test('ensureSummaryFormulas_: KPI-6 (просрочено сейчас) — та же логика, что applyRequestsConditionalFormatting_, положительный текст при 0', () => {
  const ctx = newCtx();
  const summary = makeFakeSheet('Сводка');
  ctx.ensureSummaryFormulas_(summary);
  const count = summary.getRange(29, 1).getFormula();
  assert.ok(count.indexOf('Col11') === -1); // это НЕ Today (QUERY), а прямой COUNTIFS на столбец K
  assert.ok(count.indexOf('TODAY()') !== -1);
  const sub = summary.getRange(30, 1).getFormula();
  assert.ok(sub.indexOf('Просрочек нет') !== -1, '0 -> "Просрочек нет", не голый "0"');
});

test('ensureSummaryFormulas_: скрытые данные графиков T:AH записаны и колонки скрыты (design §2.6), НЕ защищены отдельно', () => {
  const ctx = newCtx();
  const summary = makeFakeSheet('Сводка');
  ctx.ensureSummaryFormulas_(summary);

  const datesFormula = summary.getRange(1, 20).getFormula(); // T1
  assert.ok(datesFormula.indexOf('SEQUENCE') !== -1 && datesFormula.indexOf('TODAY()-13') !== -1);
  const dailyFormula = summary.getRange(2, 20).getFormula(); // T2
  assert.ok(dailyFormula.indexOf('MAP') !== -1 || dailyFormula.indexOf('LAMBDA') !== -1);
  const funnelFormulas = summary.getRange(5, 20, 4, 1).getFormulas();
  assert.equal(funnelFormulas.length, 4, 'воронка — 4 значения (Заявки/Первая попытка/Консультация/Договор)');

  assert.ok(summary._hiddenColumns && summary._hiddenColumns.some((h) => h.start === 20 && h.count === 15),
    'T:AH = 15 колонок должны быть скрыты (design §2.6)');
});

test('ensureSummaryFormulas_: 5 графиков созданы с правильным типом (design §2.4)', () => {
  const ctx = newCtx();
  const summary = makeFakeSheet('Сводка');
  ctx.ensureSummaryFormulas_(summary);

  const charts = summary.getCharts();
  assert.equal(charts.length, 5, 'design §2.4 — ровно 5 графиков: недели/воронка/источники/причины/статус-микс');
  assert.equal(charts[0].chartType, 'LINE', 'чарт 1 — линия «Заявки по неделям»');
  assert.equal(charts[1].chartType, 'BAR');
  assert.equal(charts[2].chartType, 'BAR');
  assert.equal(charts[3].chartType, 'BAR');
  assert.equal(charts[4].chartType, 'BAR');
  assert.equal(charts[4].stacked, true, 'чарт 5 (статус-микс) — stacked bar (design §2.4)');
  assert.deepEqual(toHost(charts[2].options.colors), ['#a02626', '#c9880a'], 'чарт 3 (источники) — цвета §1, провалидированные validate_palette.js');
});

test('ensureSummaryFormulas_: 3 правила условного форматирования (design §2.5) — просрочки/медиана/тренд', () => {
  const ctx = newCtx();
  const summary = makeFakeSheet('Сводка');
  ctx.ensureSummaryFormulas_(summary);

  const rules = summary.getConditionalFormatRules();
  assert.equal(rules.length, 3, 'design §2.5 — ровно 3 правила');
  assert.ok(rules[0].formula.indexOf('$A$29>0') !== -1);
  assert.equal(rules[0].background, '#FFCDD2');
  assert.ok(rules[1].formula.indexOf('sla_first_attempt_minutes') !== -1);
  assert.equal(rules[1].background, '#FFCC80');
  assert.ok(rules[2].formula.indexOf('$A$4<$B$4') !== -1 && rules[2].formula.indexOf('$B$4<$D$4') !== -1,
    'design §2.5: падение 2 недели подряд — cur<prev7 И prev7<prev14');
  assert.equal(rules[2].fontColor, '#6b7280', 'design §2.5: серый, не красный — падение заявок не «ошибка»');
});

test('ensureSummaryFormulas_: идемпотентна — повторный вызов не перезаписывает и не плодит вторые графики/правила', () => {
  const ctx = newCtx();
  const summary = makeFakeSheet('Сводка');
  ctx.ensureSummaryFormulas_(summary);
  ctx.ensureSummaryFormulas_(summary);
  assert.equal(summary.getCharts().length, 5, 'повторный setupCrm() не должен удваивать графики');
});

// =============================================================================
// P1 (build-round): «Сводка»/«Сегодня» — office не должен ломать формулы
// сортировкой/правкой; данные не должны утекать в лист, который видит офис
// =============================================================================

test('setupCrm(): «Сегодня» и «Сводка» защищены целиком — только владелец скрипта (P1 "office sheet breaks when sorted/filtered")', () => {
  const ctx = newCtx();
  const requests = makeFakeSheet('Заявки');
  const service = makeFakeSheet('Служебное');
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

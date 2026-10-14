import { test, assert, toHost } from './helpers/harness.mjs';
import { fixture, runMigrationScenarios, evaluateBanner, now } from '../../simulation/run.mjs';
import { makeFakeSheet } from './helpers/gas-fakes.mjs';

const scenarios = runMigrationScenarios();
for (const [id, result] of Object.entries(scenarios)) {
  test(id + ': схема статусов на копии', () => assert.equal(result.pass, true, result.error));
}

test('Миграция: все старые статусы/причины, новые причины сохранены, даты не меняются', () => {
  const f = fixture(false);
  const records = [
    ['Не дозвонились', 'Не дозвонились (3+)', 'Перезвонить', 'Не вышел на связь'],
    ['В работе', 'Выбрал другого юриста', 'Перезвонить', 'Отказ клиента'],
    ['Консультация назначена', 'Дорого', 'Консультация назначена', 'Отказ клиента'],
    ['Консультация проведена', 'Передумал', 'Ждём решения', 'Отказ клиента'],
    ['Клиент — договор', 'Другое', 'Клиент', 'Отказ клиента'],
    ['Отказ', 'Не наш профиль', 'Закрыто', 'Не наш профиль'],
    ['Отказ', '', 'Закрыто', 'Отказ клиента'],
    ['Дубль / спам', '', 'Закрыто', 'Спам или тест'],
    ['', '', 'Новая', ''],
    ...['Отказ клиента', 'Не наш профиль', 'Не вышел на связь', 'Дубль', 'Спам или тест'].map(reason => ['Дубль / спам', reason, 'Закрыто', reason])
  ];
  f.requests._data = [Array.from(f.ctx.REQUESTS_HEADERS_), ...records.map(([status, reason], i) =>
    Array.from(f.ctx.REQUESTS_HEADERS_, h => ({ '№': 'G-' + i, 'Имя': 'Lead', 'Статус': status,
      'Причина закрытия': reason, 'Получена': now, 'Первая попытка': now })[h] || ''))];
  f.service._data = [Array.from(f.ctx.SERVICE_SHEET_HEADERS_), ...records.map(([status], i) =>
    Array.from(f.ctx.SERVICE_SHEET_HEADERS_, h => ({ '№': 'G-' + i, 'Предыдущий статус': status || '(пусто)',
      'Контакт состоялся': now, 'Договор': now, 'Статус изменён': now })[h] || ''))];
  f.ctx.setupCrm();
  const svc = f.ctx.colByHeader_(f.service._data[0]);
  records.forEach(([, , status, reason], i) => {
    assert.equal(f.read(i + 2)['Статус'], status);
    assert.equal(f.read(i + 2)['Причина закрытия'], reason);
    assert.equal(f.service._data[i + 1][svc['Предыдущий статус']], status);
    for (const stamp of ['Контакт состоялся', 'Договор', 'Статус изменён']) assert.equal(f.service._data[i + 1][svc[stamp]], now);
    assert.equal(f.read(i + 2)['Первая попытка'], now);
    assert.equal(f.read(i + 2)['Получена'], now);
  });
  const state = JSON.stringify([f.requests._data, f.service._data, f.journal._data]);
  f.ctx.setupCrm();
  assert.equal(JSON.stringify([f.requests._data, f.service._data, f.journal._data]), state);
  assert.equal(f.journal._data.filter(r => r[2] === 'status_migrated').length, 1);
  assert.equal(f.statusEvents(), 0);
});

test('Миграция проходит поверх старого строгого списка статусов (живая таблица 14.10)', () => {
  const f = fixture(false);
  const strict = list => ({ list, showDropdown: true, allowInvalid: false });
  f.requests.getRange('B2:B').setDataValidation(strict(['Не дозвонились', 'В работе', 'Консультация назначена',
    'Консультация проведена', 'Клиент — договор', 'Отказ', 'Дубль / спам']));
  f.requests.getRange('M2:M').setDataValidation(strict(['Не дозвонились (3+)', 'Выбрал другого юриста',
    'Дорого', 'Передумал', 'Не наш профиль', 'Другое']));
  f.requests._data[1][1] = 'Дубль / спам';
  f.ctx.setupCrm();
  assert.equal(f.read(2)['Статус'], 'Закрыто');
  assert.equal(f.read(2)['Причина закрытия'], 'Спам или тест');
});

test('Миграция предыдущего статуса сохраняет реальную несохранённую смену', () => {
  const f = fixture(false);
  const map = f.ctx.colByHeader_(f.service._data[0]);
  f.service.getRange(4, map['Предыдущий статус'] + 1).setValue('В работе');
  f.ctx.setupCrm();
  assert.equal(f.service.getRange(4, map['Предыдущий статус'] + 1).getValue(), 'Перезвонить');
  f.edit(4, 'Статус', [['Закрыто']]);
  assert.equal(f.statusEvents(), 1);
  f.edit(4, 'Статус', [['Закрыто']]);
  assert.equal(f.statusEvents(), 1);
});

test('Штампы: первая попытка/контакт/договор независимы и не перезаписываются', () => {
  const f = fixture(); f.edit(15, 'Имя', [['Manual']]);
  const svc = f.ctx.colByHeader_(f.service._data[0]);
  const index = f.ctx.findServiceRowIndexByLeadNo_(f.service, svc, 'G-0014');
  const timestamps = {};
  ['Перезвонить', 'Консультация назначена', 'Ждём решения', 'Клиент', 'Новая', 'Перезвонить'].forEach((status, i) => {
    const date = new Date(now.getTime() + (i + 1) * 60000);
    f.requests.getRange(15, 2).setValue(status);
    f.ctx.handleEditRow_(f.requests, f.map, 15, f.journal, f.service, svc, date, true);
    if (i === 0) timestamps.first = date;
    if (i === 1) timestamps.contact = date;
    if (i === 3) timestamps.contract = date;
    assert.equal(f.read(15)['Первая попытка'], timestamps.first);
    assert.equal(f.service.getRange(index, svc['Контакт состоялся'] + 1).getValue(), timestamps.contact || '');
    assert.equal(f.service.getRange(index, svc['Договор'] + 1).getValue(), timestamps.contract || '');
  });
  assert.equal(f.statusEvents(), 6);
});

test('Списки статусов и причин точны; новые закрытые исключены из дайджеста', () => {
  const f = fixture();
  assert.deepEqual(toHost(f.requests.getRange(2, 2).getDataValidation().list),
    ['Новая', 'Перезвонить', 'Консультация назначена', 'Ждём решения', 'Клиент', 'Закрыто']);
  assert.deepEqual(toHost(f.requests.getRange(2, 13).getDataValidation().list),
    ['Отказ клиента', 'Не наш профиль', 'Не вышел на связь', 'Дубль', 'Спам или тест']);
  assert.equal(f.requests.getRange(2, 13).getDataValidation().allowInvalid, true);
  assert.deepEqual(toHost(f.ctx.CLOSED_STATUSES_), ['Клиент', 'Закрыто']);
  for (const status of ['Клиент', 'Закрыто']) {
    f.requests.getRange(9, 2).setValue(status);
    assert.equal(f.stats().waitingFirstCallCount, 0);
    assert.equal(f.stats().attentionCount, 0);
  }
});

test('Счётчики: пустой статус совместим с Новой; заготовки без контактов исключены', () => {
  const f = fixture();
  f.requests.getRange(9, 2).setValue('Новая');
  const explicit = f.stats();
  assert.equal(explicit.newCount, 1);
  f.ctx.ensureTodayFormulas_(f.today, f.requests);
  const banner = f.today.getRange(1, 1).getFormula();
  assert.match(evaluateBanner(banner, f.requests), /1 новых/);
  f.requests.getRange(9, 2).setValue('');
  assert.deepEqual(f.stats(), explicit);
  assert.match(evaluateBanner(banner, f.requests), /1 новых/);
  f.requests.getRange(9, 4, 1, 2).setValues([[' ', ' ']]);
  assert.equal(f.stats().newCount, 0);
  assert.match(evaluateBanner(banner, f.requests), /0 новых/);
});

test('SLA Перезвонить: без первой попытки тревога остаётся, после попытки прекращается, контакт пуст', () => {
  const f = fixture(); f.edit(15, 'Имя', [['Manual']]);
  f.requests.getRange(15, 3).setValue(new Date('2026-10-11T06:00:00Z'));
  f.requests.getRange(15, 2).setValue('Перезвонить'); // импорт статуса без onEdit и без штампа
  f.ctx.processSla_(f.ss, f.config, now, f.requests.getDataRange().getValues(), f.map);
  const alerts = () => f.journal._data.filter(r => r[1] === 'G-0014' && r[2].startsWith('sla_')).length;
  assert.equal(alerts(), 2); // pending + sent одного письма
  const svc = f.ctx.colByHeader_(f.service._data[0]);
  const index = f.ctx.findServiceRowIndexByLeadNo_(f.service, svc, 'G-0014');
  f.ctx.handleEditRow_(f.requests, f.map, 15, f.journal, f.service, svc, now, true);
  assert.equal(f.read(15)['Первая попытка'], now);
  assert.equal(f.service.getRange(index, svc['Контакт состоялся'] + 1).getValue(), '');
  f.ctx.processSla_(f.ss, f.config, now, f.requests.getDataRange().getValues(), f.map);
  assert.equal(alerts(), 2);
});

test('Форматирование: просрочка приоритетнее палитры; причина отдельная; диаграмма имеет стабильные серии', () => {
  const f = fixture();
  const rules = f.requests.getConditionalFormatRules();
  assert.equal(rules.length, 14);
  assert.match(rules[0].formula, /Закрыто.*LEN\(TRIM/);
  assert.equal(rules[0].ranges[0].getColumn(), 13);
  assert.match(rules[1].formula, /TODAY\(\).*Клиент.*Закрыто/);
  assert.equal(rules[1].background, '#FFCDD2');
  assert.equal(rules[1].bold, true);
  assert.ok(rules.every(r => r.fontColor === '#000000'));
  const summary = makeFakeSheet('Сводка');
  f.ctx.ensureSummaryFormulas_(summary, f.requests, f.service);
  const chart = summary.getCharts()[4];
  assert.deepEqual(toHost(chart.options.colors), ['#FFEB3B', '#FF9800', '#AB47BC', '#26C6DA']);
  assert.equal(chart.ranges[0].getNumColumns(), 5);
  const statuses = ['Новая', 'Перезвонить', 'Консультация назначена', 'Ждём решения'];
  statuses.forEach((status, i) => {
    assert.equal(summary.getRange(33 + i, 20).getValue(), status);
    for (let j = 0; j < 4; j++) {
      const formula = summary.getRange(33 + i, 21 + j).getFormula();
      if (i === j) {
        assert.ok(formula.includes('="' + status + '"'));
        assert.ok(formula.includes("LEN(TRIM('Заявки'!D2:D))"));
      } else assert.equal(formula, '=0');
    }
  });
  const colors = toHost(chart.options.colors);
  summary.getCharts()[4].options.colors = ['old'];
  f.ctx.ensureSummaryFormulas_(summary, f.requests, f.service);
  assert.deepEqual(toHost(summary.getCharts()[4].options.colors), colors);
  assert.equal(summary.getCharts().length, 5);
});

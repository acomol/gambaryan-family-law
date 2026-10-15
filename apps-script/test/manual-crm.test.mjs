import { test, assert, toHost } from './helpers/harness.mjs';
import { fixture, runScenarios, todayRead, now } from '../../simulation/run.mjs';
import { makeFakeSheet } from './helpers/gas-fakes.mjs';

const result = toHost(runScenarios());
test('S1: live snapshot — 0 новых, 1 ждёт, 1 уникальная к вниманию', () => {
  assert.deepEqual(result.S1.stats, { newCount: 0, waitingFirstCallCount: 1, consultationsTodayCount: 0, overdueCount: 0, attentionCount: 1 });
  assert.match(result.S1.subject, /1 к вниманию/);
});
test('S2: заготовка G-0009 — номер сохранён, дата/дежурный/служебное заполнены', () => {
  assert.equal(result.S2.row['№'], 'G-0009');
  assert.equal(result.S2.row['Получена'], now.toISOString());
  assert.equal(result.S2.row['Ответственный'], fixture().config.defaultDutyOfficer);
  assert.ok(result.S2.service[0].includes('WhatsApp, вручную'));
  assert.equal(result.S2.events, 0);
});
test('S3: только телефон — G-0014, дата, дежурный и существующий формат Связаться', () => {
  assert.equal(result.S3.row['№'], 'G-0014');
  assert.equal(result.S3.row['Получена'], now.toISOString());
  assert.equal(result.S3.serviceRows, 9);
  const f = fixture(); f.edit(15, 'Телефон', [['0501111111']]);
  const rich = f.requests.getRange(15, 6).getRichTextValue();
  assert.ok(rich.getText().includes('Позвонить: 0501111111'));
  assert.ok(rich._links.some(link => link.url.startsWith('https://wa.me/')));
});
test('S4: массовая вставка — 3 номера/даты/дежурных/служебные строки', () => {
  assert.deepEqual(result.S4.rows.map(r => r['№']), ['G-0014', 'G-0015', 'G-0016']);
  assert.ok(result.S4.rows.every(r => r['Получена'] === now.toISOString() && r['Ответственный'] && r['Связаться']));
  assert.equal(result.S4.serviceRows, 11);
});
test('S5: статус — 1 событие, повтор 0, массовая правка 3', () => {
  assert.deepEqual(result.S5, { first: 1, repeat: 0, bulk: 3 });
});
test('Массовая смена статуса включает старую ручную G-0008 без submission_id', () => {
  const f = fixture(); f.edit(10, 'Имя', [['Мария']]);
  f.edit(8, 'Статус', [['Закрыто'], ['Закрыто'], ['Закрыто']]);
  assert.equal(f.statusEvents(), 3);
});
test('S6: шесть протянутых номеров не становятся заявками', () => {
  assert.deepEqual(result.S6.stats, result.S1.stats);
  assert.equal(result.S6.events, 0);
  assert.equal(result.S6.serviceRows, 8); // G-0008 получает снимок статуса при миграции.
});
test('S7: ручная и сайт — разные номера', () => {
  assert.deepEqual(result.S7, { manual: 'G-0014', site: 'G-0015' });
});
test('S8: одинаковый телефон сохраняет 3 отдельные заявки', () => {
  assert.equal(result.S8.samePhoneRows, 3);
  assert.equal(result.S8.row['№'], 'G-0014');
});
test('S9: удалённые контакты убирают строку из отбора, статус не журналируется', () => {
  assert.equal(result.S9.stats.attentionCount, 0);
  assert.equal(result.S9.events, 0);
});
test('S10: комментарий — 0 событий статуса', () => assert.equal(result.S10.events, 0));
test('S11: submission_id без контактов сохранён, но исключён из счётчиков', () => {
  assert.equal(result.S11.appended, 1);
  assert.deepEqual(result.S11.stats, result.S1.stats);
});
test('S12: Сегодня — G-0008 в строке 208, верхний баннер сообщает 1 ждущего', () => {
  assert.deepEqual(result.S12.blocks.new.ids, ['G-0008']);
  assert.equal(result.S12.blocks.new.dataRow, 208);
  assert.equal(result.S12.bannerValue, 'Сегодня: 0 просрочки · 0 новых · 1 ждут звонка · 0 консультация(й)');
});
test('Пересекающиеся категории дают 1 заявку к вниманию, без номера тоже', () => {
  const f = fixture();
  f.requests.getRange(9, 2).setValue('');
  f.requests.getRange(9, 11).setValue(new Date(now.getTime() - 3600000));
  f.requests.getRange(9, 12).setValue(now);
  const stats = f.stats();
  assert.deepEqual(stats, { newCount: 1, waitingFirstCallCount: 1, consultationsTodayCount: 1, overdueCount: 1, attentionCount: 1 });
  f.requests.getRange(9, 1).setValue('');
  assert.equal(f.stats().attentionCount, 1);
});
test('Выделение номера перечитывает листы после старого снимка tick', () => {
  const f = fixture();
  const reqValues = f.requests.getDataRange().getValues();
  const svcValues = f.service.getDataRange().getValues();
  f.edit(15, 'Имя', [['Manual']]);
  f.intake.appendRow(Array.from(f.ctx.INTAKE_HEADERS_, h => ({ submission_id: 'race', name: 'Site' })[h] || ''));
  f.ctx.syncIntakeToRequests_(f.ss, f.config, now, f.requests, reqValues, f.map, f.service, svcValues, f.ctx.colByHeader_(svcValues[0]));
  assert.equal(f.read(15)['№'], 'G-0014');
  assert.equal(f.read(16)['№'], 'G-0015');
  const reverse = fixture(); reverse.sync({ submission_id: 'site-first', name: 'Site' }); reverse.edit(16, 'Имя', [['Manual']]);
  assert.equal(reverse.read(15)['№'], 'G-0014');
  assert.equal(reverse.read(16)['№'], 'G-0015');
});
test('Снимок статуса мигрируется без событий смены; повтор setup не затирает прежний статус', () => {
  const f = fixture();
  assert.equal(f.statusEvents(), 0);
  const map = f.ctx.colByHeader_(f.service._data[0]);
  assert.equal(f.service._data[3][map['Предыдущий статус']], 'Закрыто');
  f.requests.getRange(4, 2).setValue('Перезвонить');
  f.ctx.ensurePreviousStatuses_(f.requests, f.service);
  assert.equal(f.service._data[3][map['Предыдущий статус']], 'Закрыто');
  f.ctx.handleEditRow_(f.requests, f.map, 4, f.journal, f.service, map, now, true);
  const stamp = f.service._data[3][map['Статус изменён']];
  f.ctx.handleEditRow_(f.requests, f.map, 4, f.journal, f.service, map, new Date(now.getTime() + 60000), true);
  assert.equal(f.statusEvents(), 1);
  assert.equal(f.service._data[3][map['Статус изменён']], stamp);
});
test('Ручное создание повторяется без новых строк и без перезаписи даты/ответственного', () => {
  const f = fixture(); f.edit(10, 'Имя', [['Мария']]);
  f.requests.getRange(10, 8).setValue('assigned@example.test');
  f.edit(10, 'Имя', [['Мария 2']]);
  assert.equal(f.service.getLastRow(), 10);
  assert.equal(f.read(10)['Ответственный'], 'assigned@example.test');
  assert.equal(f.read(10)['Получена'].toISOString(), now.toISOString());
});

test('Сайт: Получена берётся из submitted_at, с сохранением миллисекунд и даты по Израилю', () => {
  const f = fixture();
  const submitted = '2026-10-01T22:25:35.392Z';
  f.sync({ submission_id: 'delayed', name: 'Site', submitted_at: submitted });
  const received = f.read(15)['Получена'];
  assert.equal(received.toISOString(), submitted);
  assert.equal(f.ctx.Utilities.formatDate(received, f.config.tz, 'dd.MM.yyyy HH:mm'), '02.10.2026 01:25');
});

test('Сайт: пустой или неразбираемый submitted_at использует время тика', () => {
  for (const submitted of ['', undefined, null, 'not-a-date']) {
    const f = fixture();
    f.sync({ submission_id: 'fallback', name: 'Site', submitted_at: submitted });
    assert.equal(f.read(15)['Получена'].toISOString(), now.toISOString());
  }
});

test('Ручная заявка: строковая дата без времени становится Date в полночь Израиля', () => {
  for (const [input, expected] of [
    ['14/10/2026', '2026-10-13T21:00:00.000Z'],
    ['14.10.2026', '2026-10-13T21:00:00.000Z'],
    ['2026-10-14', '2026-10-13T21:00:00.000Z'],
    ['14/01/2026', '2026-01-13T22:00:00.000Z']
  ]) {
    const f = fixture();
    f.requests.getRange(10, f.map['Получена'] + 1).setNumberFormat('dd/MM/yyyy').setValue(input);
    f.edit(10, 'Имя', [['Manual']]);
    assert.equal(f.read(10)['Получена'].toISOString(), expected, input);
    assert.equal(f.requests._numberFormats['10:3'], 'dd/MM/yyyy');
    f.edit(10, 'Имя', [['Manual edited']]);
    assert.equal(f.read(10)['Получена'].toISOString(), expected, 'Повторная правка: ' + input);
  }
});

test('Ручная заявка: строковая дата со временем читается по Израилю', () => {
  for (const [input, expected] of [
    ['14/10/2026 13:45', '2026-10-14T10:45:00.000Z'],
    ['14.01.2026 09:05:30', '2026-01-14T07:05:30.000Z'],
    ['2026-10-14T13:45:30', '2026-10-14T10:45:30.000Z']
  ]) {
    const f = fixture();
    f.requests.getRange(10, f.map['Получена'] + 1).setValue(input);
    f.edit(10, 'Имя', [['Manual']]);
    assert.equal(f.read(10)['Получена'].toISOString(), expected, input);
  }
});

test('Ручная заявка: существующий Date сохраняется, пустая дата получает now', () => {
  for (const input of [new Date('2026-10-01T22:25:35.392Z'), '']) {
    const f = fixture();
    f.requests.getRange(10, f.map['Получена'] + 1).setValue(input);
    f.edit(10, 'Имя', [['Manual']]);
    assert.equal(f.read(10)['Получена'].toISOString(), input ? input.toISOString() : now.toISOString());
    if (input) assert.strictEqual(f.read(10)['Получена'], input);
  }
});

test('Ручная заявка: невозможные даты и неизвестный текст не нормализуются в другую дату', () => {
  for (const input of ['31/02/2026', '2026-13-14', '14.10.2026 25:00', 'unknown']) {
    const f = fixture();
    f.requests.getRange(10, f.map['Получена'] + 1).setValue(input);
    f.edit(10, 'Имя', [['Manual']]);
    assert.equal(f.read(10)['Получена'], input);
  }
});
test('Пробельные контакты и очищенная заявка исключены также из SLA и health', () => {
  const f = fixture();
  f.requests.getRange(15, 1, 1, 5).setValues([['G-0099', '', new Date('2026-10-11T07:00:00Z'), '  ', '  ']]);
  assert.deepEqual(f.stats(), result.S1.stats);
  f.ctx.processSla_(f.ss, f.config, now, f.requests.getDataRange().getValues(), f.map);
  assert.equal(f.journal._data.filter(r => r[1] === 'G-0099').length, 0);
});
test('Повтор setup обновляет баннер; все счётчики Сводки используют общий отбор', () => {
  const f = fixture(); todayRead(f); f.today.getRange(1, 1).setFormula('="old"');
  assert.equal(todayRead(f).bannerValue, result.S12.bannerValue);
  const summary = makeFakeSheet('Сводка');
  f.ctx.ensureSummaryFormulas_(summary, f.requests, f.service);
  summary.getRange(4, 1).setFormula('=99');
  f.ctx.ensureSummaryFormulas_(summary, f.requests, f.service);
  for (const [r, c] of [[4,1], [4,2], [4,4], [9,1], [14,1], [14,2], [19,1], [19,2], [19,3], [29,1], [2,20], [3,20], [5,20], [6,20], [7,20], [8,20], [10,20], [26,20], [33,21]]) {
    const formula = summary.getRange(r, c).getFormula();
    assert.ok(formula.includes("LEN(TRIM('Заявки'!D2:D))") && formula.includes("LEN(TRIM('Заявки'!E2:E))"), 'unfiltered counter ' + r + ':' + c);
  }
});

// GAS-only код (Sheets.gs) — тестируется через структурные фейки
// (test/helpers/gas-fakes.mjs), а не пропуском (см. бриф задачи).
import { test, assert, toHost } from './helpers/harness.mjs';
import { loadGasContext } from './helpers/load-gas.mjs';
import { makeFakeSheet, makeFakeSpreadsheet, makeFakeSpreadsheetApp, makeFakeSession } from './helpers/gas-fakes.mjs';

function buildCtx(ownerEmail, settingsRows) {
  const requests = makeFakeSheet('Заявки');
  const settings = makeFakeSheet('Настройки', { data: settingsRows || [['Параметр', 'Значение', 'Комментарий']] });
  const intake = makeFakeSheet('Входящие');
  const ss = makeFakeSpreadsheet({ 'Заявки': requests, 'Настройки': settings, 'Входящие': intake });
  const overrides = {
    SpreadsheetApp: makeFakeSpreadsheetApp({ 'fake-spreadsheet-id': ss }),
    Session: makeFakeSession(ownerEmail)
  };
  const ctx = loadGasContext(undefined, overrides);
  // SPREADSHEET_ID_ реальный, а фейковый SpreadsheetApp знает только свой id —
  // подменяем то, что читают readSingleSetting_/protectIntakeSheet_ и т.п.
  overrides.SpreadsheetApp.openById = () => ss;
  return { ctx, requests, settings, intake, ss };
}

// --- review находка №1 (CRITICAL) + №9 (idempotent) -------------------------

test('protectServiceColumns_: владелец скрипта ОСТАЁТСЯ редактором служебных колонок (review находка №1)', () => {
  const { ctx, requests } = buildCtx('alex@adfix.co.il');
  ctx.protectServiceColumns_(requests);

  const rangeProt = requests._protections.filter((p) => p._type === 'RANGE');
  assert.equal(rangeProt.length, 1, 'должна появиться ровно одна RANGE-защита служебных колонок');
  assert.deepEqual(rangeProt[0]._emails(), ['alex@adfix.co.il'],
    'владелец скрипта должен остаться редактором — раньше removeEditors(getEditors()) без addEditors оставлял список пустым');
});

test('protectServiceColumns_: повторный вызов НЕ плодит вторую защиту диапазона (review находка №9, идемпотентность)', () => {
  const { ctx, requests } = buildCtx('alex@adfix.co.il');
  ctx.protectServiceColumns_(requests);
  ctx.protectServiceColumns_(requests);
  ctx.protectServiceColumns_(requests);

  const rangeProt = requests._protections.filter((p) => p._type === 'RANGE');
  assert.equal(rangeProt.length, 1, 'get-or-create по description должен переиспользовать существующую защиту, не плодить дубли');
  assert.deepEqual(rangeProt[0]._emails(), ['alex@adfix.co.il']);
});

test('protectServiceColumns_: пустой email владельца (нет scope userinfo.email) не приводит к addEditors("") (review находка №4)', () => {
  const { ctx, requests } = buildCtx(''); // Session.getEffectiveUser().getEmail() === ''
  ctx.protectServiceColumns_(requests);
  const rangeProt = requests._protections.filter((p) => p._type === 'RANGE');
  assert.deepEqual(rangeProt[0]._emails(), [], 'пустая строка не должна попадать в addEditors');
});

test('protectIntakeSheet_: пустой email владельца не приводит к addEditors("") — не бросает и не падает (review находка №4)', () => {
  const { ctx, intake } = buildCtx('', [
    ['Параметр', 'Значение', 'Комментарий'],
    ['albato_editor_email', 'albato@example.com', '']
  ]);
  const journal = makeFakeSheet('Журнал');
  // Раньше protectIntakeSheet_ клала [Session...getEmail()] (может быть '')
  // прямо в editors и звала addEditors — с пустым email это бросает (см.
  // review находка №4 и комментарий в gas-fakes.mjs addEditors).
  ctx.protectIntakeSheet_(intake, journal);
  const prot = intake._protections.filter((p) => p._type === 'SHEET')[0];
  assert.deepEqual(prot._emails(), ['albato@example.com'], 'пустой email владельца просто пропускается, Albato остаётся редактором');
});

// --- review находка №5: albato_editor_email — warning-only, если пуст -------

test('protectIntakeSheet_: albato_editor_email пуст -> защита в режиме предупреждения + запись в Журнал (review находка №5)', () => {
  const { ctx, intake } = buildCtx('alex@adfix.co.il'); // Настройки без albato_editor_email вовсе
  const journal = makeFakeSheet('Журнал');
  ctx.protectIntakeSheet_(intake, journal);

  const prot = intake._protections.filter((p) => p._type === 'SHEET')[0];
  assert.ok(prot, 'защита листа должна быть создана');
  assert.equal(prot.isWarningOnly(), true, 'без albato_editor_email защита должна быть warning-only — иначе Albato молча теряет доступ и лид');
  assert.deepEqual(prot._emails(), ['alex@adfix.co.il']);
  assert.equal(journal._data.length, 1, 'предупреждение должно быть записано в Журнал');
  assert.match(String(journal._data[0][3]), /albato_editor_email/);
});

test('protectIntakeSheet_: albato_editor_email заполнен -> жёсткая защита (не warning-only), оба редактора', () => {
  const { ctx, intake } = buildCtx('alex@adfix.co.il', [
    ['Параметр', 'Значение', 'Комментарий'],
    ['albato_editor_email', 'albato@example.com', '']
  ]);
  const journal = makeFakeSheet('Журнал');
  ctx.protectIntakeSheet_(intake, journal);

  const prot = intake._protections.filter((p) => p._type === 'SHEET')[0];
  assert.equal(prot.isWarningOnly(), false);
  assert.deepEqual(prot._emails().sort(), ['albato@example.com', 'alex@adfix.co.il'].sort());
  assert.equal(journal._data.length, 0, 'предупреждения быть не должно — Albato сконфигурирован');
});

// --- review находка №3: реальные 24 заголовка «Входящие», adopt-as-is -------

test('INTAKE_HEADERS_: ровно 24 реальных заголовка Albato в порядке A..X (review находка №3)', () => {
  const { ctx } = buildCtx('alex@adfix.co.il');
  const expected = [
    'submitted_at', 'submission_id', 'corrects_submission_id', 'name', 'phone', 'email',
    'landing_path', 'referrer_host', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_id',
    'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid', 'fbclid', 'form_id',
    'landing_language', 'event_name', 'source_system', 'schema_version', 'schema_date'
  ];
  assert.equal(ctx.INTAKE_HEADERS_.length, 24);
  assert.deepEqual(Array.from(ctx.INTAKE_HEADERS_), expected);
});

test('diffHeaderLists_: совпадающие заголовки -> пусто', () => {
  const { ctx } = buildCtx('alex@adfix.co.il');
  const headers = ['a', 'b', 'c'];
  assert.deepEqual(toHost(ctx.diffHeaderLists_(headers, headers)), []);
});

test('diffHeaderLists_: расхождение по позиции -> человекочитаемое описание с буквой колонки', () => {
  const { ctx } = buildCtx('alex@adfix.co.il');
  const diff = ctx.diffHeaderLists_(['a', 'X', 'c'], ['a', 'b', 'c']);
  assert.equal(diff.length, 1);
  assert.match(diff[0], /колонка B/);
  assert.match(diff[0], /ожидали "b"/);
  assert.match(diff[0], /в листе "X"/);
});

test('verifyIntakeHeaders_: реальный лист «Входящие» с правильными заголовками -> нет расхождений, ничего не пишет в Журнал', () => {
  const { ctx } = buildCtx('alex@adfix.co.il');
  const intake = makeFakeSheet('Входящие', { data: [Array.from(ctx.INTAKE_HEADERS_)] });
  const journal = makeFakeSheet('Журнал');
  const diff = ctx.verifyIntakeHeaders_(intake, journal);
  assert.deepEqual(toHost(diff), []);
  assert.equal(journal._data.length, 0);
});

test('verifyIntakeHeaders_: расхождение (например, invented-список из старой версии кода) -> репортит в Журнал, НЕ трогает сам лист', () => {
  const { ctx } = buildCtx('alex@adfix.co.il');
  const oldInventedHeaders = [
    'submission_id', 'corrects_submission_id', 'submitted_at', 'name', 'phone', 'email',
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'gclid', 'gbraid', 'wbraid', 'landing_path', 'referrer_host', 'form_id', 'lf_hp'
  ];
  const intake = makeFakeSheet('Входящие', { data: [oldInventedHeaders.slice()] });
  const journal = makeFakeSheet('Журнал');
  const diff = ctx.verifyIntakeHeaders_(intake, journal);
  assert.ok(diff.length > 0, 'реальный (24 поля) и старый изобретённый (18 полей) список должны разойтись');
  assert.equal(journal._data.length, 1);
  assert.equal(journal._data[0][2], 'intake_headers_mismatch');
  // лист НЕ переписан — заголовки как были
  assert.deepEqual(intake._data[0], oldInventedHeaders);
});

test('formatIntakeSheet_: ставит Plain text ("@") на A:X, идемпотентно', () => {
  const { ctx } = buildCtx('alex@adfix.co.il');
  const intake = makeFakeSheet('Входящие', { data: [Array.from(ctx.INTAKE_HEADERS_)], maxRows: 50 });
  ctx.formatIntakeSheet_(intake);
  ctx.formatIntakeSheet_(intake); // второй вызов не должен ничего сломать
  assert.equal(intake._numberFormats['2:1'], '@');
  assert.equal(intake._numberFormats['2:24'], '@'); // колонка X = 24-я
});

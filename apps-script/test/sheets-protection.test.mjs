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

function requestsSheetWithHeaders(ctx) {
  return makeFakeSheet('Заявки', { data: [Array.from(ctx.OFFICE_HEADERS_)] });
}

// --- задача 0.4.0: «Заявки» — ровно 14 полей офиса, никакой техники ---------

test('OFFICE_HEADERS_/REQUESTS_HEADERS_: ровно эти 14 колонок «Заявки», в этом порядке (задача 0.4.0)', () => {
  const { ctx } = buildCtx('alex@adfix.co.il');
  const expected = [
    '№', 'Статус', 'Получена', 'Имя', 'Телефон', 'Связаться', 'Email', 'Ответственный',
    'Первая попытка', 'Попыток дозвона', 'Следующий шаг',
    'Консультация', 'Причина закрытия', 'Комментарий'
  ];
  assert.deepEqual(Array.from(ctx.OFFICE_HEADERS_), expected);
  assert.deepEqual(Array.from(ctx.REQUESTS_HEADERS_), expected);
  assert.equal(ctx.OFFICE_HEADERS_.length, 14);
});

test('OFFICE_HEADERS_: не содержит НИ ОДНОГО технического поля — вся техника переехала на «Служебное» (задача 0.4.0)', () => {
  const { ctx } = buildCtx('alex@adfix.co.il');
  const technicalFields = [
    'submission_id', 'все submission_id', 'Контакт состоялся', 'Статус изменён', 'Договор',
    'contact_version', 'Откуда', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term',
    'utm_content', 'gclid', 'gbraid', 'wbraid', 'landing_path', 'referrer_host', 'form_id'
  ];
  technicalFields.forEach((field) => {
    assert.ok(ctx.OFFICE_HEADERS_.indexOf(field) === -1,
      '«Заявки» не должна содержать техническое поле "' + field + '" (владелец 2026-09-23: "страница офиса — без технической информации")');
  });
});

test('SERVICE_SHEET_HEADERS_: «Служебное» несёт №-ключ, submission_id/цепочку, штампы и «Откуда» (design §3.2)', () => {
  const { ctx } = buildCtx('alex@adfix.co.il');
  const expected = [
    '№', 'submission_id', 'все submission_id', 'Контакт состоялся', 'Статус изменён',
    'Договор', 'contact_version', 'Флаги уведомлений', 'Откуда'
  ];
  assert.deepEqual(Array.from(ctx.SERVICE_SHEET_HEADERS_), expected);
  // технические поля самой заявки (UTM/click-id/landing_path…) НЕ копируются
  // сюда — они остаются во «Входящих» и ищутся по submission_id (задача 0.4.0)
  ['utm_source', 'utm_medium', 'gclid', 'gbraid', 'wbraid', 'landing_path', 'referrer_host', 'form_id']
    .forEach((field) => assert.ok(ctx.SERVICE_SHEET_HEADERS_.indexOf(field) === -1));
});

// --- задача 0.4.0: «Служебное» создаётся скрытым и полностью защищённым ----

test('hideAndProtectServiceSheet_: «Служебное» скрыт и полностью защищён — только владелец скрипта (design §3.2)', () => {
  const { ctx } = buildCtx('alex@adfix.co.il');
  const service = makeFakeSheet('Служебное', { data: [Array.from(ctx.SERVICE_SHEET_HEADERS_)] });
  ctx.hideAndProtectServiceSheet_(service);

  assert.equal(service.isSheetHidden(), true, '«Служебное» должно быть скрыто');
  const prot = service._protections.filter((p) => p._type === 'SHEET')[0];
  assert.ok(prot, 'должна быть защита всего листа');
  assert.deepEqual(prot._emails(), ['alex@adfix.co.il'], 'редактор — только владелец скрипта, никого больше');
  assert.equal(prot.isWarningOnly(), false, '«Служебное» — жёсткая защита, не предупреждение (в отличие от «Заявки»)');
});

test('hideAndProtectServiceSheet_: пустой email владельца не приводит к addEditors("") (review находка №4, тот же паттерн)', () => {
  const { ctx } = buildCtx('');
  const service = makeFakeSheet('Служебное', { data: [Array.from(ctx.SERVICE_SHEET_HEADERS_)] });
  ctx.hideAndProtectServiceSheet_(service);
  const prot = service._protections.filter((p) => p._type === 'SHEET')[0];
  assert.deepEqual(prot._emails(), [], 'пустая строка не должна попадать в addEditors');
});

test('hideAndProtectServiceSheet_: повторный вызов идемпотентен — не плодит вторую защиту листа', () => {
  const { ctx } = buildCtx('alex@adfix.co.il');
  const service = makeFakeSheet('Служебное', { data: [Array.from(ctx.SERVICE_SHEET_HEADERS_)] });
  ctx.hideAndProtectServiceSheet_(service);
  ctx.hideAndProtectServiceSheet_(service);
  const prot = service._protections.filter((p) => p._type === 'SHEET');
  assert.equal(prot.length, 1, 'getOrCreateSheetProtection_ должен переиспользовать существующую защиту листа');
});

// --- задача 0.4.0 (заменяет protectServiceColumns_ версии 0.3.0): «Заявки» --
// колонки, которые пишет скрипт, защищены С ПРЕДУПРЕЖДЕНИЕМ, не жёстко -------

test('protectOfficeScriptColumns_: скрипт-колонки «Заявки» защищены С ПРЕДУПРЕЖДЕНИЕМ (не блокируют правку)', () => {
  const { ctx } = buildCtx('alex@adfix.co.il');
  const requests = requestsSheetWithHeaders(ctx);
  ctx.protectOfficeScriptColumns_(requests);

  const rangeProt = requests._protections.filter((p) => p._type === 'RANGE');
  assert.ok(rangeProt.length >= 1, 'должна появиться хотя бы одна RANGE-защита скрипт-колонок');
  rangeProt.forEach((p) => {
    assert.equal(p.isWarningOnly(), true, 'скрипт-колонки «Заявки» — предупреждение, не жёсткий блок (в отличие от «Служебное»)');
    // Живой прогон 2026-09-23: у warning-only защиты Google запрещает
    // removeEditor/addEditor — редакторов не трогаем (фейк теперь бросает так же).
  });
});

test('protectOfficeScriptColumns_: «Статус» и остальные поля офиса НЕ защищены вовсе', () => {
  const { ctx } = buildCtx('alex@adfix.co.il');
  const requests = requestsSheetWithHeaders(ctx);
  ctx.protectOfficeScriptColumns_(requests);

  const headerMap = ctx.colByHeader_(Array.from(ctx.OFFICE_HEADERS_));
  const statusCol = headerMap['Статус'] + 1;
  const protectedCols = [];
  requests._protections.filter((p) => p._type === 'RANGE').forEach((p) => {
    for (let c = p._rangeInfo.col; c < p._rangeInfo.col + p._rangeInfo.numCols; c++) protectedCols.push(c);
  });
  assert.ok(protectedCols.indexOf(statusCol) === -1, '«Статус» — офис ставит его сам, скрипт его не пишет (§3.1)');
});

test('protectOfficeScriptColumns_: повторный вызов НЕ плодит вторую защиту диапазона (review находка №9, идемпотентность)', () => {
  const { ctx } = buildCtx('alex@adfix.co.il');
  const requests = requestsSheetWithHeaders(ctx);
  ctx.protectOfficeScriptColumns_(requests);
  const countAfterFirst = requests._protections.filter((p) => p._type === 'RANGE').length;
  ctx.protectOfficeScriptColumns_(requests);
  ctx.protectOfficeScriptColumns_(requests);
  const countAfterRepeat = requests._protections.filter((p) => p._type === 'RANGE').length;
  assert.equal(countAfterRepeat, countAfterFirst, 'get-or-create по description должен переиспользовать существующие защиты, не плодить дубли');
});

test('protectOfficeScriptColumns_: пустой email владельца (нет scope userinfo.email) не приводит к addEditors("") (review находка №4)', () => {
  const { ctx } = buildCtx(''); // Session.getEffectiveUser().getEmail() === ''
  const requests = requestsSheetWithHeaders(ctx);
  ctx.protectOfficeScriptColumns_(requests);
  const rangeProt = requests._protections.filter((p) => p._type === 'RANGE');
  rangeProt.forEach((p) => assert.deepEqual(p._emails(), [], 'пустая строка не должна попадать в addEditors'));
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
  assert.equal(journal._data.length, 1, 'предупреждение должно быть записано в Журнал');
  assert.match(String(journal._data[0][3]), /albato_editor_email/);
  // Живой прогон №2 2026-09-23: у warning-only защиты редакторов и домен не трогаем
  // (Google бросает на removeEditor/setDomainEdit). Повторный setupCrm не падает:
  assert.doesNotThrow(() => ctx.protectIntakeSheet_(intake, journal), 'повторный вызов на уже warning-only защите');
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

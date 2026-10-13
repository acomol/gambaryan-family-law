// Offline simulation V02. Input: owner-confirmed snapshot, 2026-10-12; status migration 2026-10-14.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { loadGasContext } from '../apps-script/test/helpers/load-gas.mjs';
import * as fake from '../apps-script/test/helpers/gas-fakes.mjs';
import { fileURLToPath } from 'node:url';

export const now = new Date('2026-10-12T07:00:00Z');
export function fixture(setup = true) {
  const app = fake.makeFakeSpreadsheetApp({});
  const props = fake.makeFakePropertiesService({});
  const mail = fake.makeFakeMailApp();
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now.getTime()])); }
    static now() { return now.getTime(); }
  }
  const ctx = loadGasContext(undefined, { SpreadsheetApp: app, PropertiesService: props,
    MailApp: mail, LockService: fake.makeFakeLockService(), Date: FixedDate,
    Session: fake.makeFakeSession('simulation@example.test'), NEW_LEAD_EMAIL_ENABLED_: false });
  const row = (headers, obj) => Array.from(headers, h => obj[h] ?? '');
  const req = [Array.from(ctx.REQUESTS_HEADERS_)];
  const records = [
    { '№': 'G-0001', 'Статус': 'Дубль / спам', 'Имя': 'Test', 'Телефон': '050000000', 'Первая попытка': now },
    {},
    { '№': 'G-0003', 'Статус': 'Дубль / спам', 'Имя': 'Test', 'Телефон': '0502333333' },
    { '№': 'G-0004', 'Статус': 'Дубль / спам', 'Телефон': '0500000002' },
    { '№': 'G-0005', 'Статус': 'Дубль / спам', 'Телефон': '+972 50 123 4567' },
    {},
    { '№': 'G-0007', 'Статус': 'Консультация проведена', 'Имя': 'Эфраим', 'Телефон': '0546817336', 'Email': 'present@example.test', 'Первая попытка': now },
    { '№': 'G-0008', 'Статус': 'В работе', 'Имя': 'Надежда', 'Телефон': '0546817336' },
    ...Array.from({ length: 5 }, (_, i) => ({ '№': ctx.formatLeadNumber_(9 + i) }))
  ];
  records.forEach(r => req.push(row(ctx.REQUESTS_HEADERS_, r)));
  // Use the OLD service schema, so upgrade/migration is exercised too.
  const serviceHeaders = Array.from(ctx.SERVICE_SHEET_HEADERS_).filter(h => h !== 'Предыдущий статус');
  const service = fake.makeFakeSheet('Служебное', { data: [serviceHeaders,
    ...Array.from({ length: 7 }, (_, i) => row(serviceHeaders, { '№': ctx.formatLeadNumber_(i + 1), submission_id: 'site-' + (i + 1), 'все submission_id': 'site-' + (i + 1) }))] });
  const requests = fake.makeFakeSheet('Заявки', { data: req, sheetId: 123 });
  const journal = fake.makeFakeSheet('Журнал', { data: [Array.from(ctx.JOURNAL_HEADERS_)] });
  const intake = fake.makeFakeSheet('Входящие', { data: [Array.from(ctx.INTAKE_HEADERS_)] });
  const today = fake.makeFakeSheet('Сегодня');
  const settings = fake.makeFakeSheet('Настройки', { data: ctx.buildDefaultSettingsRows_() });
  const ss = fake.makeFakeSpreadsheet({ 'Заявки': requests, 'Служебное': service,
    'Журнал': journal, 'Входящие': intake, 'Сегодня': today, 'Настройки': settings });
  app.openById = () => ss;
  const config = ctx.loadConfig_();
  if (ctx.ensurePreviousStatuses_) ctx.ensurePreviousStatuses_(requests, service);
  if (setup) ctx.setupCrm();
  const map = ctx.colByHeader_(requests._data[0]);
  const stats = () => JSON.parse(JSON.stringify(ctx.computeDigestStats_(requests.getDataRange().getValues(), map, config, now)));
  function edit(r, col, values) {
    const range = requests.getRange(r, map[col] + 1, values.length, values[0].length);
    const oldValue = values.length === 1 && values[0].length === 1 ? range.getValue() : undefined;
    range.setValues(values);
    range.getSheet = () => requests;
    ctx.handleEdit_({ range, oldValue });
  }
  function sync(record) {
    intake.appendRow(row(ctx.INTAKE_HEADERS_, record));
    ctx.syncIntakeToRequests_(ss, config, now, requests, requests.getDataRange().getValues(), map,
      service, service.getDataRange().getValues(), ctx.colByHeader_(service._data[0]));
  }
  const read = r => Object.fromEntries(Array.from(ctx.REQUESTS_HEADERS_, (h, i) => [h, requests.getRange(r, i + 1).getValue()]));
  const statusEvents = () => journal._data.filter(r => r[2] === 'status_changed').length;
  return { ctx, requests, service, journal, intake, today, config, ss, map, edit, sync, stats, read, statusEvents };
}

// Independent, deliberately bounded evaluator for the generated Today queries.
// It implements only WHERE clauses used here; not Google QUERY typing/rendering.
export function todayRead(f) {
  f.ctx.ensureTodayFormulas_(f.today, f.requests);
  const blocks = {};
  for (const [name, header] of [['overdue', f.ctx.TODAY_HEADER_ROW_OVERDUE_], ['new', f.ctx.TODAY_HEADER_ROW_NEW_], ['consult', f.ctx.TODAY_HEADER_ROW_CONSULT_]]) {
    const formula = f.today.getRange(header + 2, 1).getFormula();
    const query = formula.split('"select ')[1].split(' order by ')[0];
    const where = query.split(' where ')[1];
    const filtered = formula.includes('FILTER(');
    const ids = f.requests._data.slice(1).filter(row => {
      if (filtered && ![row[f.map['Имя']], row[f.map['Телефон']]].some(v => String(v ?? '').trim())) return false;
      if (name === 'overdue' || name === 'consult') return false; // Snapshot has NO dates in these columns.
      let expression = where.replace(/Col(\d+) is (not )?null/g, (_, n, not) => JSON.stringify(not ? !!row[n - 1] : !row[n - 1]));
      expression = expression.replace(/Col(\d+) (<>|=) '([^']*)'/g, (_, n, op, value) => JSON.stringify(op === '=' ? String(row[n - 1] ?? '') === value : String(row[n - 1] ?? '') !== value));
      expression = expression.replace(/\band\b/g, '&&').replace(/\bor\b/g, '||');
      if (!/^[truefals() &|]+$/.test(expression)) throw new Error('Unsupported query: ' + expression);
      return Function('return ' + expression)();
    }).map(r => r[0]);
    blocks[name] = { dataRow: header + 2, ids, formula };
  }
  const banner = f.today.getRange(1, 1).getFormula();
  return { blocks, banner, bannerValue: evaluateBanner(banner, f.requests), topRows: f.today.getRange(1, 1, 10, 4).getValues() };
}

// Only the COUNTIFS/SUMPRODUCT banner expressions generated by these two versions.
function splitArgs(text) {
  let depth = 0, quoted = false, start = 0;
  const args = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') quoted = !quoted;
    if (quoted) continue;
    if (text[i] === '(') depth++;
    if (text[i] === ')') depth--;
    if (text[i] === ',' && depth === 0) { args.push(text.slice(start, i)); start = i + 1; }
  }
  args.push(text.slice(start));
  return args;
}
export function evaluateBanner(formula, sheet) {
  const day = Math.floor(now.getTime() / 86400000) + 25569;
  const column = letters => [...letters].reduce((n, l) => n * 26 + l.charCodeAt(0) - 64, 0) - 1;
  const scalar = (expression, row = []) => {
    const expr = expression.split(/("[^"]*")/).map(part => part.startsWith('"') ? part :
      part.replace(/'Заявки'!([A-Z]+)(?:2)?:\1/g, (_, col) => 'cell(' + column(col) + ')')
        .replace(/TODAY\(\)/g, String(day)).replace(/\bTRIM\(/g, 'trim(').replace(/\bLEN\(/g, 'len(')
        .replace(/<>/g, '!==').replace(/(?<![<>=!])=(?!=)/g, '===').replace(/&/g, '+')).join('');
    return Function('cell', 'trim', 'len', 'return ' + expr)(
      i => { const v = row[i] ?? ''; return v instanceof Date ? v.getTime() / 86400000 + 25569 : v; },
      v => String(v).trim(), v => String(v).length);
  };
  let expression = formula.slice(1);
  while (/\b(SUMPRODUCT|COUNTIFS)\(/.test(expression)) {
    const match = /\b(SUMPRODUCT|COUNTIFS)\(/.exec(expression);
    let end = match.index + match[0].length, depth = 1, quoted = false;
    for (; depth && end < expression.length; end++) {
      if (expression[end] === '"') quoted = !quoted;
      if (!quoted && expression[end] === '(') depth++;
      if (!quoted && expression[end] === ')') depth--;
    }
    const args = splitArgs(expression.slice(match.index + match[0].length, end - 1));
    let count = 0;
    if (match[1] === 'SUMPRODUCT') {
      count = sheet._data.slice(1).reduce((n, row) => n + args.reduce((p, arg) => p * Number(scalar(arg, row)), 1), 0);
    } else {
      count = sheet._data.filter(row => {
        for (let i = 0; i < args.length; i += 2) {
          const value = scalar(args[i], row), criterion = String(scalar(args[i + 1]));
          const [, op, right] = /^(<>|>=|<=|<|>|=)?(.*)$/.exec(criterion);
          const target = right && Number.isFinite(Number(right)) ? Number(right) : right;
          const ok = op === '<>' ? value !== target : op === '>=' ? value >= target : op === '<' ? value < target : value === target;
          if (!ok) return false;
        }
        return true;
      }).length;
    }
    expression = expression.slice(0, match.index) + count + expression.slice(end);
  }
  return scalar(expression);
}

export function runScenarios() {
  const output = {};
  let f = fixture();
  output.S1 = { stats: f.stats(), subject: f.ctx.composeDigest_(f.stats()).subject };
  f = fixture(); f.edit(10, 'Имя', [['Мария']]); output.S2 = { row: f.read(10), service: f.service._data.filter(r => r[0] === 'G-0009'), events: f.statusEvents() };
  f = fixture(); f.edit(15, 'Телефон', [['0501111111']]); output.S3 = { row: f.read(15), serviceRows: f.service.getLastRow() - 1 };
  f = fixture(); f.edit(15, 'Имя', [['A', '0501111111'], ['B', '0502222222'], ['C', '0503333333']]); output.S4 = { rows: [15, 16, 17].map(f.read), serviceRows: f.service.getLastRow() - 1 };
  f = fixture(); f.edit(4, 'Статус', [['Перезвонить']]); const first = f.statusEvents(); f.edit(4, 'Статус', [['Перезвонить']]); const repeat = f.statusEvents() - first;
  f.edit(4, 'Статус', [['Консультация назначена'], ['Консультация назначена'], ['Консультация назначена']]); output.S5 = { first, repeat, bulk: f.statusEvents() - first - repeat };
  f = fixture(); f.edit(15, '№', Array.from({ length: 6 }, (_, i) => [f.ctx.formatLeadNumber_(14 + i)])); output.S6 = { stats: f.stats(), serviceRows: f.service.getLastRow() - 1, events: f.statusEvents() };
  f = fixture(); f.edit(15, 'Имя', [['Manual']]); f.sync({ submission_id: 'new-site', name: 'Site', phone: '0504444444' }); output.S7 = { manual: f.read(15)['№'], site: f.requests._data.find(r => r[f.map['Имя']] === 'Site')[0] };
  f = fixture(); f.edit(15, 'Телефон', [['0546817336']]); output.S8 = { row: f.read(15), samePhoneRows: f.requests._data.filter(r => r[f.map['Телефон']] === '0546817336').length };
  f = fixture(); f.edit(9, 'Имя', [['', '']]); output.S9 = { stats: f.stats(), row: f.read(9), events: f.statusEvents() };
  f = fixture(); f.edit(8, 'Комментарий', [['Note']]); output.S10 = { events: f.statusEvents(), row: f.read(8) };
  f = fixture(); f.sync({ submission_id: 'empty-site' }); output.S11 = { appended: f.requests.getLastRow() - 14, stats: f.stats() };
  f = fixture(); output.S12 = todayRead(f);
  return output;
}

const palette = [
  ['Новая', '#FFEB3B', '#FFF9C4'], ['Перезвонить', '#FF9800', '#FFE0B2'],
  ['Консультация назначена', '#AB47BC', '#E1BEE7'], ['Ждём решения', '#26C6DA', '#B2EBF2'],
  ['Клиент', '#43A047', '#C8E6C9'], ['Закрыто', '#9E9E9E', '#EEEEEE']
];
const plain = value => JSON.parse(JSON.stringify(value));
const migrationEvents = f => f.journal._data.filter(r => r[2] === 'status_migrated');
const serviceRead = (f, id) => {
  const map = f.ctx.colByHeader_(f.service._data[0]);
  const row = f.service._data.find(r => r[map['№']] === id) || [];
  return Object.fromEntries(Object.keys(map).map(h => [h, row[map[h]] || '']));
};
const rulesRead = f => f.requests.getConditionalFormatRules().map(r => ({
  formula: r.formula, background: r.background, bold: !!r.bold,
  strikethrough: !!r.strikethrough, fontColor: r.fontColor,
  ranges: r.ranges.map(range => ({ column: range.getColumn(), columns: range.getNumColumns() }))
}));

export function runMigrationScenarios() {
  const output = {};
  let f = fixture(false); f.ctx.setupCrm();
  const state = () => plain({ requests: f.requests._data, service: f.service._data, journal: f.journal._data });
  const first = state(); f.ctx.setupCrm();
  output.M1 = { rows: f.requests._data.slice(1).map((r, i) => ({ row: i + 2, id: r[0], status: r[1], reason: r[12] })),
    previous: f.service._data.slice(1).map(r => ({ id: r[0], status: r.at(-1) })),
    unchanged: JSON.stringify(first) === JSON.stringify(state()), events: migrationEvents(f).length,
    keys: migrationEvents(f).map(r => r[7]), statusEvents: f.statusEvents() };
  f = fixture(); f.sync({ submission_id: 'm2-site', name: 'Site', phone: '0504444444' });
  output.M2 = { status: f.read(15)['Статус'], received: f.read(15)['Получена'] };
  f = fixture(); f.edit(15, 'Имя', [['Manual']]);
  output.M3 = { status: f.read(15)['Статус'], events: f.statusEvents() };
  f = fixture(); f.edit(15, 'Имя', [['Manual']]);
  const steps = [];
  for (const status of ['Новая', 'Перезвонить', 'Консультация назначена', 'Ждём решения', 'Клиент']) {
    f.edit(15, 'Статус', [[status]]);
    const svc = serviceRead(f, 'G-0014');
    steps.push({ status, first: !!f.read(15)['Первая попытка'], contact: !!svc['Контакт состоялся'], contract: !!svc['Договор'], events: f.statusEvents() });
  }
  output.M4 = { steps };
  f = fixture(); f.ctx.setupCrm();
  output.M5 = { stats: f.stats(), subject: f.ctx.composeDigest_(f.stats()).subject, today: todayRead(f).bannerValue, ids: todayRead(f).blocks.new.ids };
  f = fixture(); f.ctx.setupCrm();
  const rules = rulesRead(f);
  const reasonRule = rules.find(r => r.ranges.some(range => range.column === f.map['Причина закрытия'] + 1 && range.columns === 1));
  output.M6 = { rule: reasonRule || null, withoutReason: reasonRule ? evaluateRowRule(reasonRule.formula, ['Закрыто', '']) : false,
    withReason: reasonRule ? evaluateRowRule(reasonRule.formula, ['Закрыто', 'Дубль']) : false };
  output.M7 = { palette: palette.map(([status]) => {
    const matches = rules.filter(r => r.formula === '=$B2="' + status + '"');
    return { status, cell: matches.find(r => r.ranges.some(range => range.column === 2 && range.columns === 1))?.background || null,
      row: matches.find(r => r.ranges.some(range => range.columns === 14))?.background || null,
      strike: matches.some(r => r.strikethrough) };
  }), rules };
  f = fixture();
  f.requests._data = [f.requests._data[0], ...['Перезвонить', 'Клиент', 'Закрыто'].map((status, i) =>
    Array.from(f.ctx.REQUESTS_HEADERS_, h => ({ '№': 'G-00' + (91 + i), 'Имя': 'SLA', 'Статус': status,
      'Получена': new Date('2026-10-11T06:00:00Z') })[h] || ''))];
  f.ctx.processSla_(f.ss, f.config, now, f.requests.getDataRange().getValues(), f.map);
  output.M8 = { alerted: [...new Set(f.journal._data.slice(1).filter(r => r[2].startsWith('sla_')).map(r => r[1]))],
    contact: !!serviceRead(f, 'G-0008')['Контакт состоялся'] };
  const checks = {
    M1: () => { assert.deepEqual(output.M1.rows.map(r => [r.status, r.reason]), [
      ['Закрыто', 'Спам или тест'], ['', ''], ['Закрыто', 'Спам или тест'], ['Закрыто', 'Спам или тест'],
      ['Закрыто', 'Спам или тест'], ['', ''], ['Ждём решения', ''], ['Перезвонить', ''], ...Array.from({ length: 5 }, () => ['', ''])]);
      assert.equal(output.M1.unchanged, true); assert.equal(output.M1.events, 1); assert.equal(output.M1.statusEvents, 0);
      assert.ok(output.M1.keys[0]); assert.equal(output.M1.previous.find(r => r.id === 'G-0001').status, 'Закрыто'); },
    M2: () => { assert.equal(output.M2.status, 'Новая'); assert.equal(new Date(output.M2.received).toISOString(), now.toISOString()); },
    M3: () => { assert.equal(output.M3.status, 'Новая'); assert.equal(output.M3.events, 0); },
    M4: () => assert.deepEqual(output.M4.steps.map(s => [s.first, s.contact, s.contract, s.events]), [
      [false, false, false, 0], [true, false, false, 1], [true, true, false, 2], [true, true, false, 3], [true, true, true, 4]]),
    M5: () => { assert.deepEqual(output.M5.stats, { newCount: 0, waitingFirstCallCount: 1, consultationsTodayCount: 0, overdueCount: 0, attentionCount: 1 });
      assert.equal(output.M5.today, 'Сегодня: 0 просрочки · 0 новых · 1 ждут звонка · 0 консультация(й)'); assert.deepEqual(output.M5.ids, ['G-0008']); },
    M6: () => { assert.equal(output.M6.rule.background, '#FFCDD2'); assert.equal(output.M6.withoutReason, true); assert.equal(output.M6.withReason, false); },
    M7: () => { assert.deepEqual(output.M7.palette.map(r => [r.status, r.cell, r.row]), palette); assert.equal(output.M7.palette.at(-1).strike, true); },
    M8: () => { assert.deepEqual(output.M8.alerted, ['G-0091']); assert.equal(output.M8.contact, false); }
  };
  for (const [id, check] of Object.entries(checks)) {
    try { check(); output[id].pass = true; } catch (error) { output[id].pass = false; output[id].error = error.message; }
  }
  return plain(output);
}

// Независимый вычислитель только формулы предупреждения о причине; не эмуляция Sheets.
function evaluateRowRule(formula, [status, reason]) {
  const expression = formula.replace(/^=/, '').replace(/\$B2/g, JSON.stringify(status)).replace(/\$M2/g, JSON.stringify(reason))
    .replace(/(?<![<>=!])=(?!=)/g, '===');
  return Function('AND', 'LEN', 'TRIM', 'return ' + expression)((...args) => args.every(Boolean), v => v.length, v => v.trim());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const label = process.argv[2] || 'after';
  if (label === 'before') {
    fs.mkdirSync('simulation/baseline-src', { recursive: true });
    for (const file of fs.readdirSync('apps-script/src')) {
      if (file.endsWith('.gs')) fs.writeFileSync('simulation/baseline-src/' + file, execFileSync('git', ['show', 'HEAD:apps-script/src/' + file]));
    }
    process.env.GAS_SRC_DIR = 'simulation/baseline-src';
  }
  const results = { ...runScenarios(), ...runMigrationScenarios() };
  fs.writeFileSync('simulation/' + label + '.json', JSON.stringify(results, null, 2) + '\n');
  for (const [id, result] of Object.entries(results)) console.log(id + ': ' + (id.startsWith('M') ? (result.pass ? 'PASS' : 'FAIL') + ' ' : '') + JSON.stringify(result));
  if (label === 'before') {
    for (const file of fs.readdirSync('simulation/baseline-src')) fs.unlinkSync('simulation/baseline-src/' + file);
    fs.rmdirSync('simulation/baseline-src');
  }
  if (label !== 'before' && Object.entries(results).some(([id, r]) => id.startsWith('M') && !r.pass)) process.exitCode = 1;
}

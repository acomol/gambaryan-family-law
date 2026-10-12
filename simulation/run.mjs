// Offline simulation V01. Input: owner-confirmed snapshot, 2026-10-12.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { loadGasContext } from '../apps-script/test/helpers/load-gas.mjs';
import * as fake from '../apps-script/test/helpers/gas-fakes.mjs';
import { fileURLToPath } from 'node:url';

export const now = new Date('2026-10-12T07:00:00Z');
export function fixture() {
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
  f = fixture(); f.edit(4, 'Статус', [['В работе']]); const first = f.statusEvents(); f.edit(4, 'Статус', [['В работе']]); const repeat = f.statusEvents() - first;
  f.edit(4, 'Статус', [['Отказ'], ['Отказ'], ['Отказ']]); output.S5 = { first, repeat, bulk: f.statusEvents() - first - repeat };
  f = fixture(); f.edit(15, '№', Array.from({ length: 6 }, (_, i) => [f.ctx.formatLeadNumber_(14 + i)])); output.S6 = { stats: f.stats(), serviceRows: f.service.getLastRow() - 1, events: f.statusEvents() };
  f = fixture(); f.edit(15, 'Имя', [['Manual']]); f.sync({ submission_id: 'new-site', name: 'Site', phone: '0504444444' }); output.S7 = { manual: f.read(15)['№'], site: f.requests._data.find(r => r[f.map['Имя']] === 'Site')[0] };
  f = fixture(); f.edit(15, 'Телефон', [['0546817336']]); output.S8 = { row: f.read(15), samePhoneRows: f.requests._data.filter(r => r[f.map['Телефон']] === '0546817336').length };
  f = fixture(); f.edit(9, 'Имя', [['', '']]); output.S9 = { stats: f.stats(), row: f.read(9), events: f.statusEvents() };
  f = fixture(); f.edit(8, 'Комментарий', [['Note']]); output.S10 = { events: f.statusEvents(), row: f.read(8) };
  f = fixture(); f.sync({ submission_id: 'empty-site' }); output.S11 = { appended: f.requests.getLastRow() - 14, stats: f.stats() };
  f = fixture(); output.S12 = todayRead(f);
  return output;
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
  const results = runScenarios();
  fs.writeFileSync('simulation/' + label + '.json', JSON.stringify(results, null, 2) + '\n');
  for (const [id, result] of Object.entries(results)) console.log(id + ': ' + JSON.stringify(result));
  if (label === 'before') {
    for (const file of fs.readdirSync('simulation/baseline-src')) fs.unlinkSync('simulation/baseline-src/' + file);
    fs.rmdirSync('simulation/baseline-src');
  }
}

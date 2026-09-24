import { test, assert } from './helpers/harness.mjs';
import { loadGasContext } from './helpers/load-gas.mjs';
import { baseCalendar, findDateOnOrAfter } from './helpers/fixtures.mjs';

const ctx = loadGasContext(['Utils.gs', 'BusinessCalendar.gs', 'Sla.gs']);
const thresholds = { slaFirstAttemptMinutes: 30, slaEscalationMinutes: 120 };

test('SLA: 30 раб.мин без первой попытки -> firstAttemptDue, эскалация ещё не наступила', () => {
  const cal = baseCalendar();
  const thu = findDateOnOrAfter(2026, 5, 1, 4);
  const receivedAt = ctx.zonedTimeToUtc_(thu.y, thu.mo, thu.d, 10, 0, 0, cal.tz);
  const now = ctx.zonedTimeToUtc_(thu.y, thu.mo, thu.d, 10, 31, 0, cal.tz);

  const state = ctx.evaluateSlaState_({ receivedAt, firstAttemptAt: null }, now, cal, thresholds);
  assert.equal(state.firstAttemptDue, true);
  assert.equal(state.escalationDue, false);
  assert.equal(state.businessMinutesElapsed, 31);
});

test('SLA: 2 рабочих часа без первой попытки -> эскалация владельцу', () => {
  const cal = baseCalendar();
  const thu = findDateOnOrAfter(2026, 5, 1, 4);
  const receivedAt = ctx.zonedTimeToUtc_(thu.y, thu.mo, thu.d, 9, 0, 0, cal.tz);
  const now = ctx.zonedTimeToUtc_(thu.y, thu.mo, thu.d, 11, 1, 0, cal.tz); // 121 раб.мин

  const state = ctx.evaluateSlaState_({ receivedAt, firstAttemptAt: null }, now, cal, thresholds);
  assert.equal(state.escalationDue, true);
});

test('SLA: если «Первая попытка» уже проставлена — тревоги не наступают', () => {
  const cal = baseCalendar();
  const thu = findDateOnOrAfter(2026, 5, 1, 4);
  const receivedAt = ctx.zonedTimeToUtc_(thu.y, thu.mo, thu.d, 9, 0, 0, cal.tz);
  const firstAttemptAt = ctx.zonedTimeToUtc_(thu.y, thu.mo, thu.d, 9, 5, 0, cal.tz);
  const now = ctx.zonedTimeToUtc_(thu.y, thu.mo, thu.d, 15, 0, 0, cal.tz);

  const state = ctx.evaluateSlaState_({ receivedAt, firstAttemptAt }, now, cal, thresholds);
  assert.equal(state.firstAttemptDue, false);
  assert.equal(state.escalationDue, false);
});

test('computeSlaDeadlines_ возвращает оба дедлайна согласованно с addBusinessMinutesFrom_', () => {
  const cal = baseCalendar();
  const thu = findDateOnOrAfter(2026, 6, 1, 4);
  const receivedAt = ctx.zonedTimeToUtc_(thu.y, thu.mo, thu.d, 17, 50, 0, cal.tz);
  const deadlines = ctx.computeSlaDeadlines_(receivedAt, cal, thresholds);
  assert.equal(deadlines.firstAttemptDeadline.getTime(), ctx.addBusinessMinutesFrom_(receivedAt, 30, cal).getTime());
  assert.equal(deadlines.escalationDeadline.getTime(), ctx.addBusinessMinutesFrom_(receivedAt, 120, cal).getTime());
});

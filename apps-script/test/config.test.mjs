import { test, assert, toHost } from './helpers/harness.mjs';
import { loadGasContext } from './helpers/load-gas.mjs';

const ctx = loadGasContext(['Utils.gs', 'Config.gs']);

test('buildDefaultSettingsRows_ -> parseSettingsRows_ round-trip даёт исходные значения по умолчанию', () => {
  const rows = ctx.buildDefaultSettingsRows_();
  assert.equal(rows[0][0], 'Параметр');
  const raw = ctx.parseSettingsRows_(rows);
  assert.equal(raw.sla_first_attempt_minutes, '30');
  assert.equal(raw.sla_escalation_minutes, '120');
  assert.equal(raw.digest_time, '08:30');
});

test('normalizeSettings_ типизирует пороги и списки получателей', () => {
  const rows = ctx.buildDefaultSettingsRows_();
  const raw = ctx.parseSettingsRows_(rows);
  const settings = ctx.normalizeSettings_(raw, { holidays: ['2026-10-01'], shortDays: {} });
  assert.equal(settings.thresholds.slaFirstAttemptMinutes, 30);
  assert.equal(settings.thresholds.slaEscalationMinutes, 120);
  assert.deepEqual(toHost(settings.calendar.businessDays), [0, 1, 2, 3, 4]);
  assert.deepEqual(toHost(settings.officeRecipients), ['cityr.ta@gmail.com', 'justicetelaviv@gmail.com']);
  assert.deepEqual(toHost(settings.calendar.holidays), ['2026-10-01']);
});

test('parseSettingsRows_ подставляет дефолт для отсутствующего в листе ключа (миграция схемы)', () => {
  const rows = [['Параметр', 'Значение', 'Комментарий'], ['sla_first_attempt_minutes', '45', '']];
  const raw = ctx.parseSettingsRows_(rows);
  assert.equal(raw.sla_first_attempt_minutes, '45', 'явно заданное значение не перезаписывается дефолтом');
  assert.equal(raw.sla_escalation_minutes, '120', 'отсутствующий ключ берётся из дефолта, а не падает');
});

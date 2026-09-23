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

// --- review находка №5: albato_editor_email — ровно одно место хранения
// (строка «Настроек» с пустым дефолтом, не Script Property) ------------------

test('buildDefaultSettingsRows_ заводит пустую строку albato_editor_email (одно место хранения — design review №5)', () => {
  const rows = ctx.buildDefaultSettingsRows_();
  const row = rows.find((r) => r[0] === 'albato_editor_email');
  assert.ok(row, 'строка albato_editor_email должна создаваться setupCrm() по умолчанию');
  assert.equal(row[1], '', 'дефолт пуст — заполняется вручную при подключении Albato');
});

test('normalizeSettings_ отдаёт albatoEditorEmail для рантайма', () => {
  const rows = ctx.buildDefaultSettingsRows_();
  const raw = ctx.parseSettingsRows_(rows);
  const settings = ctx.normalizeSettings_(raw, { holidays: [], shortDays: {} });
  assert.equal(settings.albatoEditorEmail, '');
});

// --- review находка №13 / design §12 строка 7: дежурный на выходные/ночь —
// настройка «Настроек», по умолчанию ВЫКЛЮЧЕНА -------------------------------

test('buildDefaultSettingsRows_ заводит weekend_duty_enabled=false и пустой weekend_duty_email по умолчанию', () => {
  const rows = ctx.buildDefaultSettingsRows_();
  const enabledRow = rows.find((r) => r[0] === 'weekend_duty_enabled');
  const emailRow = rows.find((r) => r[0] === 'weekend_duty_email');
  assert.ok(enabledRow, 'weekend_duty_enabled должен быть в дефолтах');
  assert.equal(enabledRow[1], 'false', 'дежурный на выходные/ночь выключен по умолчанию (владелец: «пока нет»)');
  assert.ok(emailRow);
  assert.equal(emailRow[1], '');
});

test('normalizeSettings_ типизирует weekendDuty.enabled в boolean (не строку "false")', () => {
  const rows = ctx.buildDefaultSettingsRows_();
  const raw = ctx.parseSettingsRows_(rows);
  const settings = ctx.normalizeSettings_(raw, { holidays: [], shortDays: {} });
  assert.equal(settings.weekendDuty.enabled, false);
  assert.equal(settings.weekendDuty.email, '');

  const rawEnabled = ctx.parseSettingsRows_([
    ['Параметр', 'Значение', 'Комментарий'],
    ['weekend_duty_enabled', 'true', ''],
    ['weekend_duty_email', 'duty@x.com', '']
  ]);
  const settingsEnabled = ctx.normalizeSettings_(rawEnabled, { holidays: [], shortDays: {} });
  assert.equal(settingsEnabled.weekendDuty.enabled, true);
  assert.equal(settingsEnabled.weekendDuty.email, 'duty@x.com');
});

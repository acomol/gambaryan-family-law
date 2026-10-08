import { test, assert } from './helpers/harness.mjs';
import { loadGasContext } from './helpers/load-gas.mjs';

const ctx = loadGasContext(['SendLog.gs']);

test('makeSendKey_: формат "№:событие:версия"', () => {
  assert.equal(ctx.makeSendKey_('G-0012', 'consult', '2026-10-01T10:00'), 'G-0012:consult:2026-10-01T10:00');
});

test('decideSendAction_: новой записи (нет журнала) — отправлять', () => {
  assert.equal(ctx.decideSendAction_(null, new Date()), 'send');
});

test('decideSendAction_: state=sent — не повторять', () => {
  const entry = { state: 'sent', updated_at: new Date() };
  assert.equal(ctx.decideSendAction_(entry, new Date()), 'skip');
});

test('decideSendAction_: state=failed — повторить сразу', () => {
  const entry = { state: 'failed', updated_at: new Date(Date.now() - 1000) };
  assert.equal(ctx.decideSendAction_(entry, new Date()), 'send');
});

test('decideSendAction_: retry после unknown — не раньше окна ретрая, потом да', () => {
  const now = new Date('2026-01-01T12:00:00Z');
  const tooRecent = { state: 'unknown', updated_at: new Date('2026-01-01T11:55:00Z') }; // 5 мин назад
  assert.equal(ctx.decideSendAction_(tooRecent, now, 15 * 60000), 'skip', 'моложе 15 минут — ждём');

  const oldEnough = { state: 'unknown', updated_at: new Date('2026-01-01T11:44:00Z') }; // 16 мин назад
  assert.equal(ctx.decideSendAction_(oldEnough, now, 15 * 60000), 'send', 'старше 15 минут — повторить');
});

test('decideSendAction_: state=pending — не дублировать в рамках того же цикла', () => {
  const entry = { state: 'pending', updated_at: new Date() };
  assert.equal(ctx.decideSendAction_(entry, new Date()), 'skip');
});

// --- review находка №7: PENDING без таймаута висит вечно, если тик умер сразу
// после появления pending-записи — уведомление молчит навсегда. -------------

test('decideSendAction_: PENDING моложе 10 минут — ждём, тик мог быть ещё жив', () => {
  const now = new Date('2026-01-01T12:00:00Z');
  const entry = { state: 'pending', updated_at: new Date('2026-01-01T11:55:00Z') }; // 5 мин
  assert.equal(ctx.decideSendAction_(entry, now), 'skip');
});

test('decideSendAction_: PENDING старше 10 минут, но моложе окна ретрая — всё ещё ждём', () => {
  const now = new Date('2026-01-01T12:00:00Z');
  const entry = { state: 'pending', updated_at: new Date('2026-01-01T11:48:00Z') }; // 12 мин
  assert.equal(ctx.decideSendAction_(entry, now), 'skip');
});

test('decideSendAction_: PENDING старше окна ретрая (тик умер после pending) — считается unknown и повторяется (design item 7)', () => {
  const now = new Date('2026-01-01T12:00:00Z');
  const entry = { state: 'pending', updated_at: new Date('2026-01-01T11:44:00Z') }; // 16 мин
  assert.equal(ctx.decideSendAction_(entry, now), 'send', 'PENDING старше 10 мин должен вести себя как unknown и следовать retry policy');
});

test('decideSendAction_: пороги PENDING-таймаута и retry настраиваются явными аргументами', () => {
  const now = new Date('2026-01-01T12:00:00Z');
  const entry = { state: 'pending', updated_at: new Date('2026-01-01T11:59:00Z') }; // 1 мин
  // pendingTimeoutMs=0 -> сразу считаем unknown; retryAfterMs=0 -> сразу повторяем
  assert.equal(ctx.decideSendAction_(entry, now, 0, 0), 'send');
});

test('transitionAfterSend_: строит запись состояния с message_id', () => {
  const now = new Date();
  const entry = ctx.transitionAfterSend_('sent', now, 'msg-1');
  assert.equal(entry.state, 'sent');
  assert.equal(entry.message_id, 'msg-1');
  assert.equal(entry.updated_at, now);
});

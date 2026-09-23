import { test, assert, toHost } from './helpers/harness.mjs';
import { loadGasContext } from './helpers/load-gas.mjs';

const ctx = loadGasContext(['SyncPlan.gs']);

test('дубль submission_id внутри одного батча -> одна строка, одно уведомление', () => {
  const incoming = [
    { submission_id: 'S1', name: 'A' },
    { submission_id: 'S1', name: 'A' } // повтор Albato / повторный тик
  ];
  const plan = ctx.computeSyncPlan_(incoming, {}, []);
  assert.equal(plan.toCreate.length, 1);
  assert.deepEqual(toHost(plan.toNotify), ['S1']);
});

test('submission_id, уже существующий в «Заявках», не создаёт вторую строку и не уведомляет повторно', () => {
  const incoming = [{ submission_id: 'S1', name: 'A' }];
  const plan = ctx.computeSyncPlan_(incoming, { S1: true }, []);
  assert.equal(plan.toCreate.length, 0);
  assert.equal(plan.toNotify.length, 0);
});

test('уже уведомлённый id не уведомляется второй раз, даже если строка создаётся заново', () => {
  const incoming = [{ submission_id: 'S1', name: 'A' }];
  const plan = ctx.computeSyncPlan_(incoming, {}, ['S1']);
  assert.equal(plan.toCreate.length, 1); // строка ещё не существует — создаём
  assert.equal(plan.toNotify.length, 0); // но уведомление уже было
});

test('несколько разных submission_id обрабатываются независимо', () => {
  const incoming = [{ submission_id: 'S1' }, { submission_id: 'S2' }, { submission_id: 'S1' }];
  const plan = ctx.computeSyncPlan_(incoming, { S2: true }, []);
  assert.equal(plan.toCreate.length, 1); // только S1 (S2 уже есть, второй S1 — дубль)
  assert.deepEqual(toHost(plan.toNotify), ['S1']);
});

test('запись без submission_id пропускается, не ломая остальные', () => {
  const incoming = [{ name: 'no id' }, { submission_id: 'S1' }];
  const plan = ctx.computeSyncPlan_(incoming, {}, []);
  assert.equal(plan.toCreate.length, 1);
  assert.equal(plan.toCreate[0].submission_id, 'S1');
});

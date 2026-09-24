import { test, assert, toHost } from './helpers/harness.mjs';
import { loadGasContext } from './helpers/load-gas.mjs';

const ctx = loadGasContext(['CorrectionChain.gs']);

function rec(id, correctsId, submittedAt, contacts) {
  return Object.assign({ submission_id: id, corrects_submission_id: correctsId || undefined, submitted_at: submittedAt }, contacts);
}

test('цепочка A -> B -> C: применяется в порядке submitted_at, финальные контакты — от C', () => {
  const A = rec('A', null, '2026-01-01T10:00:00Z', { name: 'Old', phone: '111', email: 'a@x.com' });
  const B = rec('B', 'A', '2026-01-02T10:00:00Z', { name: 'Mid', phone: '222', email: 'b@x.com' });
  const C = rec('C', 'B', '2026-01-03T10:00:00Z', { name: 'New', phone: '333', email: 'c@x.com' });
  const recordsById = { A, B, C };

  const plan = ctx.buildCorrectionPlan_('C', recordsById, []);
  assert.equal(plan.status, 'ok');
  assert.equal(plan.rootId, 'A');
  assert.deepEqual(toHost(plan.orderedIds), ['A', 'B', 'C']);
  assert.equal(plan.finalContacts.name, 'New');
  assert.equal(plan.finalContacts.phone, '333');
});

test('реверсивный порядок доставки (C и B пришли раньше A): пока корня нет — waiting_for_original, не создаёт заявку', () => {
  const B = rec('B', 'A', '2026-01-02T10:00:00Z', { name: 'Mid' });
  const C = rec('C', 'B', '2026-01-03T10:00:00Z', { name: 'New' });
  let recordsById = { B, C }; // A ещё не пришла

  let plan = ctx.buildCorrectionPlan_('C', recordsById, []);
  assert.equal(plan.status, 'waiting_for_original');
  assert.equal(plan.missingId, 'A');

  // A наконец пришла — теперь цепочка достраивается целиком, порядок по submitted_at
  const A = rec('A', null, '2026-01-01T10:00:00Z', { name: 'Old' });
  recordsById = { A, B, C };
  plan = ctx.buildCorrectionPlan_('C', recordsById, []);
  assert.equal(plan.status, 'ok');
  assert.deepEqual(toHost(plan.orderedIds), ['A', 'B', 'C']);
  assert.equal(plan.finalContacts.name, 'New');
});

test('цикл A<->B обнаруживается и не применяется', () => {
  const A = rec('A', 'B', '2026-01-01T10:00:00Z', { name: 'A' });
  const B = rec('B', 'A', '2026-01-02T10:00:00Z', { name: 'B' });
  const plan = ctx.buildCorrectionPlan_('A', { A, B }, []);
  assert.equal(plan.status, 'cycle');
});

test('повторный tick не переприменяет уже применённые id (alreadyApplied)', () => {
  const A = rec('A', null, '2026-01-01T10:00:00Z', { name: 'Old' });
  const B = rec('B', 'A', '2026-01-02T10:00:00Z', { name: 'New' });
  const plan = ctx.buildCorrectionPlan_('B', { A, B }, ['A', 'B']);
  assert.equal(plan.status, 'ok');
  assert.deepEqual(toHost(plan.toApplyIds), []); // всё уже применено
});

import { test, assert } from './helpers/harness.mjs';
import { loadGasContext } from './helpers/load-gas.mjs';

const ctx = loadGasContext(['Utils.gs', 'BusinessCalendar.gs', 'Digest.gs']);

test('пустой дайджест (все счётчики 0) всё равно собирается как отправляемое письмо', () => {
  const digest = ctx.composeDigest_({});
  assert.equal(digest.isEmpty, true);
  assert.ok(digest.subject.length > 0, 'subject не должен быть пустым даже при isEmpty');
  assert.ok(digest.body.length > 0, 'body не должен быть пустым даже при isEmpty');
  assert.equal(digest.counts.newCount, 0);
});

test('shouldSendDigestToday_ не зависит от содержимого — только от ключа дня', () => {
  assert.equal(ctx.shouldSendDigestToday_(null, '2026-01-05'), true, 'ещё не отправляли сегодня');
  assert.equal(ctx.shouldSendDigestToday_('2026-01-05', '2026-01-05'), false, 'уже отправляли сегодня — не дублировать');
  assert.equal(ctx.shouldSendDigestToday_('2026-01-04', '2026-01-05'), true, 'новый день — отправить снова');
});

test('непустой дайджест считает по категориям корректно', () => {
  const digest = ctx.composeDigest_({ newCount: 2, waitingFirstCallCount: 1, consultationsTodayCount: 0, overdueCount: 3 });
  assert.equal(digest.isEmpty, false);
  assert.match(digest.subject, /6 к вниманию/);
  assert.match(digest.body, /Новых: 2/);
  assert.match(digest.body, /Просрочено: 3/);
});

import { test, assert, toHost } from './helpers/harness.mjs';
import { loadGasContext } from './helpers/load-gas.mjs';

const ctx = loadGasContext(['Utils.gs']);

// --- review находка №11 (doGet: сравнение токена в постоянное время) -------

test('timingSafeEqual_: одинаковые строки -> true', () => {
  assert.equal(ctx.timingSafeEqual_('secret-token', 'secret-token'), true);
});

test('timingSafeEqual_: разные строки одинаковой длины -> false', () => {
  assert.equal(ctx.timingSafeEqual_('secret-token', 'secret-tokeX'), false);
});

test('timingSafeEqual_: разная длина -> false, не бросает исключение', () => {
  assert.equal(ctx.timingSafeEqual_('short', 'much-longer-token'), false);
  assert.equal(ctx.timingSafeEqual_('much-longer-token', 'short'), false);
});

test('timingSafeEqual_: null/undefined/пусто трактуются как пустая строка, не падают', () => {
  assert.equal(ctx.timingSafeEqual_(null, ''), true);
  assert.equal(ctx.timingSafeEqual_(undefined, ''), true);
  assert.equal(ctx.timingSafeEqual_(null, 'x'), false);
});

// --- review находка №12 («Связаться»: настоящая ссылка, tel: не подтверждён) -

test('buildContactCellPlan_: WhatsApp — единственная ссылка, номер остаётся видимым текстом (tel: не используется как ссылка)', () => {
  const plan = ctx.buildContactCellPlan_('+972 50-123-4567');
  assert.ok(plan.text.indexOf('+972 50-123-4567') !== -1, 'номер должен остаться видимым текстом в ячейке');
  assert.equal(plan.links.length, 1, 'ровно одна ссылка в ячейке — WhatsApp');
  const link = plan.links[0];
  assert.equal(link.url, 'https://wa.me/972501234567');
  assert.equal(plan.text.slice(link.start, link.end), 'WhatsApp', 'диапазон ссылки должен точно покрывать слово WhatsApp в тексте');
});

test('buildContactCellPlan_: пустой телефон -> пустой план (ничего не пишем в ячейку)', () => {
  const plan = ctx.buildContactCellPlan_('');
  assert.equal(plan.text, '');
  assert.deepEqual(toHost(plan.links), []);
});

test('buildContactCellPlan_: план не содержит "tel:" — устойчивая поддержка tel: в Google Sheets не подтверждена (item 12)', () => {
  const plan = ctx.buildContactCellPlan_('+972501234567');
  assert.ok(plan.text.indexOf('tel:') === -1, 'tel: не должен фигурировать ни в тексте, ни как отдельная ссылка');
  assert.ok(!plan.links.some((l) => l.url.indexOf('tel:') === 0), 'ни одна ссылка не должна использовать схему tel:');
});

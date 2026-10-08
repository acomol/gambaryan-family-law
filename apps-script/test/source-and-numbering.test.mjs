import { test, assert } from './helpers/harness.mjs';
import { loadGasContext } from './helpers/load-gas.mjs';

const ctx = loadGasContext(['Utils.gs', 'Source.gs', 'Numbering.gs']);

test('detectSource_: gclid -> "Google Ads" даже при наличии utm_source', () => {
  assert.equal(ctx.detectSource_({ gclid: 'abc', utm_source: 'facebook' }), 'Google Ads');
});

test('detectSource_: gbraid/wbraid тоже считаются Google Ads', () => {
  assert.equal(ctx.detectSource_({ gbraid: 'x' }), 'Google Ads');
  assert.equal(ctx.detectSource_({ wbraid: 'x' }), 'Google Ads');
});

test('detectSource_: без click-id -> utm_source как есть', () => {
  assert.equal(ctx.detectSource_({ utm_source: 'facebook' }), 'facebook');
});

test('detectSource_: без click-id и без utm_source -> «Прямой»', () => {
  assert.equal(ctx.detectSource_({}), 'Прямой');
  assert.equal(ctx.detectSource_(), 'Прямой');
});

test('nextLeadNumber_: первая заявка -> G-0001', () => {
  assert.equal(ctx.nextLeadNumber_([]), 'G-0001');
});

test('nextLeadNumber_: по максимуму, а не по count (устойчиво к архивации/пробелам)', () => {
  assert.equal(ctx.nextLeadNumber_(['G-0001', 'G-0003', 'G-0002']), 'G-0004');
});

test('nextLeadNumber_: игнорирует мусорные значения', () => {
  assert.equal(ctx.nextLeadNumber_(['G-0005', '', 'не номер', null]), 'G-0006');
});

test('buildContactLinks_: строит tel:/wa.me из телефона в формате +972…', () => {
  const links = ctx.buildContactLinks_('+972 50-123-4567');
  assert.equal(links.telHref, 'tel:+972501234567');
  assert.equal(links.waHref, 'https://wa.me/972501234567');
});

test('buildContactLinks_: пустой телефон -> пустые ссылки', () => {
  const links = ctx.buildContactLinks_('');
  assert.equal(links.telHref, '');
  assert.equal(links.waHref, '');
});

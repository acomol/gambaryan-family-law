// wa.me — международный формат (WhatsApp Help Center, «How to use click to chat»).
import { test, assert } from './helpers/harness.mjs';
import { loadGasContext } from './helpers/load-gas.mjs';

const ctx = loadGasContext(['Utils.gs']);

test('WhatsApp: номер для wa.me в международном формате (таблица владельца 2026-09-24)', () => {
  const cases = [
    ['050-123-4567', '972501234567'],
    ['+972 50 123 4567', '972501234567'],
    ['00972501234567', '972501234567'],
    ['501234567', '972501234567'],
    ['+7 916 123-45-67', '79161234567'],
    ['03-123-4567', null],
    ['12345', null],
    ['', null]
  ];
  cases.forEach(([raw, expected]) => assert.equal(ctx.normalizeWhatsAppNumber_(raw), expected, raw));
});

test('WhatsApp: ссылка из телефона 0501112233 = wa.me/972501112233 (живой прогон давал wa.me/0501112233)', () => {
  assert.equal(ctx.buildContactLinks_('0501112233').waHref, 'https://wa.me/972501112233');
  assert.equal(ctx.buildContactLinks_('03-123-4567').waHref, '', 'городской — без кнопки WhatsApp');
  assert.equal(ctx.buildContactLinks_('0501112233').telHref, 'tel:0501112233', 'звонок — как введено');
});

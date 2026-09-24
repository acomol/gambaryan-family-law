import { test, assert } from './helpers/harness.mjs';
import { loadGasContext } from './helpers/load-gas.mjs';
import { bruteForceBusinessMinutes, findDstTransitions } from './helpers/oracle.mjs';
import { baseCalendar, findDateOnOrAfter, dateKey } from './helpers/fixtures.mjs';

const ctx = loadGasContext(['Utils.gs', 'BusinessCalendar.gs']);

test('чт 17:50 -> вс 09:20 = 30 рабочих минут (design §5.5 пример)', () => {
  const cal = baseCalendar();
  const thu = findDateOnOrAfter(2026, 1, 1, 4); // 4 = четверг
  const sun = findDateOnOrAfter(thu.y, thu.mo, thu.d + 1, 0); // ближайшее воскресенье после четверга

  const start = ctx.zonedTimeToUtc_(thu.y, thu.mo, thu.d, 17, 50, 0, cal.tz);
  const end = ctx.zonedTimeToUtc_(sun.y, sun.mo, sun.d, 9, 20, 0, cal.tz);

  const got = ctx.businessMinutesBetween(start, end, cal);
  assert.equal(got, 30, 'businessMinutesBetween должен вернуть ровно 30');

  const oracle = bruteForceBusinessMinutes(start, end, cal);
  assert.equal(oracle, 30, 'независимый перебор по минутам (Intl) тоже должен дать 30');
});

test('addBusinessMinutesFrom_: чт 17:50 + 30 раб.мин = вс 09:20', () => {
  const cal = baseCalendar();
  const thu = findDateOnOrAfter(2026, 2, 1, 4);
  const sun = findDateOnOrAfter(thu.y, thu.mo, thu.d + 1, 0);

  const start = ctx.zonedTimeToUtc_(thu.y, thu.mo, thu.d, 17, 50, 0, cal.tz);
  const deadline = ctx.addBusinessMinutesFrom_(start, 30, cal);
  const expected = ctx.zonedTimeToUtc_(sun.y, sun.mo, sun.d, 9, 20, 0, cal.tz);

  assert.equal(deadline.getTime(), expected.getTime());
});

test('праздник посреди рабочей недели пропускается как выходной', () => {
  const thu = findDateOnOrAfter(2026, 3, 1, 4);
  const sun = findDateOnOrAfter(thu.y, thu.mo, thu.d + 1, 0); // ближайшее воскресенье после чт
  // Граница диапазона — ровно открытие понедельника (тоже рабочий день, вс-чт
  // включает пн): окно понедельника даёт 0 минут, т.к. segEnd==segStart==09:00,
  // поэтому разница между calNoHoliday/calWithHoliday объясняется только вс.
  const mon = { y: sun.y, mo: sun.mo, d: sun.d + 1 };

  const calNoHoliday = baseCalendar();
  const calWithHoliday = baseCalendar({ holidays: [dateKey(sun)] });

  const start = ctx.zonedTimeToUtc_(thu.y, thu.mo, thu.d, 9, 0, 0, calNoHoliday.tz);
  const end = ctx.zonedTimeToUtc_(mon.y, mon.mo, mon.d, 9, 0, 0, calNoHoliday.tz);

  const without = ctx.businessMinutesBetween(start, end, calNoHoliday);
  const withHoliday = ctx.businessMinutesBetween(start, end, calWithHoliday);

  // Без праздника вс даёт полный рабочий день (540 мин) сверх чт; с праздником —
  // ровно на 540 минут меньше (весь день вс выпал, как выходной).
  assert.equal(without - withHoliday, 540, 'праздничный день должен вычесть ровно свои 540 рабочих минут');

  const oracleWithout = bruteForceBusinessMinutes(start, end, calNoHoliday);
  const oracleWith = bruteForceBusinessMinutes(start, end, calWithHoliday);
  assert.equal(oracleWithout, without);
  assert.equal(oracleWith, withHoliday);
});

test('переход на летнее/зимнее время (Asia/Jerusalem, реальные данные ICU): рабочие дни вокруг перехода считаются верно', () => {
  const cal = baseCalendar();
  const transitions = findDstTransitions(2026, cal.tz);
  assert.ok(transitions.length >= 1, 'в 2026 году должен быть хотя бы один переход DST (по данным ICU рантайма)');

  const t = transitions[0];
  const [ty, tmo, td] = t.dateKeyUtcNoon.split('-').map(Number);

  // Берём диапазон "от начала дня за 2 дня до перехода" до "конца дня через 2 дня после" —
  // достаточно широкий, чтобы захватить сам переход, где бы внутри диапазона он ни оказался.
  const rangeStartDay = new Date(Date.UTC(ty, tmo - 1, td - 2));
  const rangeEndDay = new Date(Date.UTC(ty, tmo - 1, td + 2));

  const startKey = { y: rangeStartDay.getUTCFullYear(), mo: rangeStartDay.getUTCMonth() + 1, d: rangeStartDay.getUTCDate() };
  const endKey = { y: rangeEndDay.getUTCFullYear(), mo: rangeEndDay.getUTCMonth() + 1, d: rangeEndDay.getUTCDate() };

  const start = ctx.zonedTimeToUtc_(startKey.y, startKey.mo, startKey.d, 9, 0, 0, cal.tz);
  const end = ctx.zonedTimeToUtc_(endKey.y, endKey.mo, endKey.d, 18, 0, 0, cal.tz);

  // Ожидаемое число рабочих дней в диапазоне — считаем независимо, по чистому
  // календарю (без часовых поясов вообще).
  let businessDaysCount = 0;
  for (let d = new Date(Date.UTC(startKey.y, startKey.mo - 1, startKey.d)); d.getTime() <= Date.UTC(endKey.y, endKey.mo - 1, endKey.d); d.setUTCDate(d.getUTCDate() + 1)) {
    if (cal.businessDays.includes(d.getUTCDay())) businessDaysCount++;
  }

  const got = ctx.businessMinutesBetween(start, end, cal);
  const expected = businessDaysCount * 540; // 09:00-18:00 = 540 минут "по стенным часам", независимо от смены пояса
  assert.equal(got, expected,
    'businessMinutesBetween должен давать 540 мин на рабочий день по МЕСТНОМУ времени ' +
    'даже когда UTC-длительность дня из-за перехода отличается (переход ' + t.dateKeyUtcNoon +
    ', смещение ' + t.fromOffsetMin + '->' + t.toOffsetMin + ' мин)');

  const oracle = bruteForceBusinessMinutes(start, end, cal);
  assert.equal(oracle, expected, 'независимый перебор по минутам (Intl) должен совпасть с реализацией');
});

test('ночная заявка -> в дайджест, не отдельным письмом; дневная -> сразу (design §12.1)', () => {
  const cal = baseCalendar();
  const thu = findDateOnOrAfter(2026, 4, 1, 4);

  const night = ctx.zonedTimeToUtc_(thu.y, thu.mo, thu.d, 23, 0, 0, cal.tz);
  assert.equal(ctx.decideNewLeadNotification_(night, cal), 'digest');

  const day = ctx.zonedTimeToUtc_(thu.y, thu.mo, thu.d, 12, 0, 0, cal.tz);
  assert.equal(ctx.decideNewLeadNotification_(day, cal), 'immediate');

  // Пятница/суббота — тоже "ночь" в смысле уведомлений, даже днём
  const fri = { y: thu.y, mo: thu.mo, d: thu.d + 1 };
  const fridayNoon = ctx.zonedTimeToUtc_(fri.y, fri.mo, fri.d, 12, 0, 0, cal.tz);
  assert.equal(ctx.decideNewLeadNotification_(fridayNoon, cal), 'digest');
});

// --- review находка №13 / design §12 строка 7: дежурный на выходные/ночь —
// настройка «Настроек», по умолчанию ВЫКЛЮЧЕНА. ------------------------------

test('decideNewLeadNotification_: вне рабочего времени, дежурный ВЫКЛЮЧЕН (default) -> digest (текущее поведение не меняется)', () => {
  const cal = baseCalendar();
  const thu = findDateOnOrAfter(2026, 4, 1, 4);
  const night = ctx.zonedTimeToUtc_(thu.y, thu.mo, thu.d, 23, 0, 0, cal.tz);
  assert.equal(ctx.decideNewLeadNotification_(night, cal, { enabled: false, email: '' }), 'digest');
  assert.equal(ctx.decideNewLeadNotification_(night, cal), 'digest', 'без 3-го аргумента (старые вызовы) поведение как раньше');
});

test('decideNewLeadNotification_: вне рабочего времени, дежурный ВКЛЮЧЁН и email указан -> immediate_duty (design item 13)', () => {
  const cal = baseCalendar();
  const thu = findDateOnOrAfter(2026, 4, 1, 4);
  const night = ctx.zonedTimeToUtc_(thu.y, thu.mo, thu.d, 23, 0, 0, cal.tz);
  assert.equal(ctx.decideNewLeadNotification_(night, cal, { enabled: true, email: 'duty@x.com' }), 'immediate_duty');
});

test('decideNewLeadNotification_: дежурный включён, но email не указан -> всё равно digest (не шлём в никуда)', () => {
  const cal = baseCalendar();
  const thu = findDateOnOrAfter(2026, 4, 1, 4);
  const night = ctx.zonedTimeToUtc_(thu.y, thu.mo, thu.d, 23, 0, 0, cal.tz);
  assert.equal(ctx.decideNewLeadNotification_(night, cal, { enabled: true, email: '' }), 'digest');
});

test('decideNewLeadNotification_: рабочее время -> immediate независимо от настройки дежурного', () => {
  const cal = baseCalendar();
  const thu = findDateOnOrAfter(2026, 4, 1, 4);
  const day = ctx.zonedTimeToUtc_(thu.y, thu.mo, thu.d, 12, 0, 0, cal.tz);
  assert.equal(ctx.decideNewLeadNotification_(day, cal, { enabled: true, email: 'duty@x.com' }), 'immediate');
});

// Общие тестовые фикстуры: базовый календарь и мелкие календарные хелперы,
// не зависящие от src/ (используются, чтобы СТРОИТЬ входные данные тестов —
// сама проверка идёт через ctx.* функции из src/ и/или независимый oracle.mjs).

export const TZ = 'Asia/Jerusalem';

export function baseCalendar(overrides) {
  return Object.assign(
    {
      tz: TZ,
      businessDays: [0, 1, 2, 3, 4], // вс-чт
      businessStart: '09:00',
      businessEnd: '18:00',
      holidays: [],
      shortDays: {}
    },
    overrides || {}
  );
}

/** Первая дата с днём недели targetDow (0=вс..6=сб) на/после {y,mo,d}. */
export function findDateOnOrAfter(y, mo, d, targetDow) {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  while (dt.getUTCDay() !== targetDow) dt.setUTCDate(dt.getUTCDate() + 1);
  return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function dateKey(parts) {
  const p2 = (n) => (n < 10 ? '0' + n : String(n));
  return `${parts.y}-${p2(parts.mo)}-${p2(parts.d)}`;
}

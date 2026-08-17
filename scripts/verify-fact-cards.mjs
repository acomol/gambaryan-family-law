/**
 * Проверка карточек-аккордеонов в секции фактов.
 * Критерии — из практик доступных аккордеонов и прогрессивного раскрытия
 * (ARIA APG, WCAG 2.5.8): настоящая кнопка, aria-expanded/aria-controls,
 * работа с клавиатуры, тап-цель 44px, видимый фокус, поведение без JS.
 *
 * Требуется playwright-core (в репозитории не установлен — ставится
 * отдельно: npm i -D playwright-core). Путь к Chromium берётся из
 * переменной CHROMIUM_PATH.
 *
 * Запуск из корня репозитория:
 *   CHROMIUM_PATH=/путь/к/chrome node scripts/verify-fact-cards.mjs
 * Код возврата 1 при любом провале — годится для CI.
 */
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = new URL('../site', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(4330, r));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

const fail = [];
const ok = (cond, msg) => { console.log((cond ? '  OK   ' : '  ПРОВАЛ ') + msg); if (!cond) fail.push(msg); };

// ---------- Мобильный ----------
console.log('\n== 390px ==');
let page = await browser.newPage({ viewport: { width: 390, height: 740 }, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:4330/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const sem = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.fact-card')];
  return cards.map(c => {
    const t = c.querySelector('.fact-card__toggle');
    const p = c.querySelector('p');
    return {
      tag: t && t.tagName, type: t && t.type,
      expanded: t && t.getAttribute('aria-expanded'),
      controls: t && t.getAttribute('aria-controls'),
      controlsResolves: !!(t && document.getElementById(t.getAttribute('aria-controls'))),
      label: t && t.getAttribute('aria-label'),
      cardHasRole: c.hasAttribute('role'),
      cardHasTabindex: c.hasAttribute('tabindex'),
      clamped: p && getComputedStyle(p).webkitLineClamp,
      textInDom: p ? p.textContent.trim().length : 0,
    };
  });
});
ok(sem.every(s => s.tag === 'BUTTON' && s.type === 'button'), 'управляющий элемент — настоящая <button type="button">');
ok(sem.every(s => s.expanded === 'false'), 'aria-expanded="false" в свёрнутом состоянии');
ok(sem.every(s => s.controls && s.controlsResolves), 'aria-controls указывает на существующий абзац');
ok(sem.every(s => s.label && s.label.length > 18), 'у кнопки есть осмысленное имя (aria-label)');
ok(sem.every(s => !s.cardHasRole && !s.cardHasTabindex), 'на карточке больше нет role="button"/tabindex');
ok(sem.every(s => s.clamped === '2'), 'абзац обрезан двумя строками');
ok(sem.every(s => s.textInDom > 80), 'полный текст остаётся в DOM (доступен скринридеру)');

const target = await page.evaluate(() => {
  const t = document.querySelector('.fact-card__toggle');
  const b = t.getBoundingClientRect();
  const before = getComputedStyle(t, '::before');
  return { w: Math.round(b.width), h: Math.round(b.height), pw: before.width, ph: before.height };
});
ok(parseFloat(target.pw) >= 44 && parseFloat(target.ph) >= 44, `тап-цель >= 44x44 (факт ${target.pw} x ${target.ph})`);

// клавиатура
await page.evaluate(() => document.querySelector('.fact-card__toggle').focus());
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
let st = await page.evaluate(() => {
  const c = document.querySelector('.fact-card');
  return { open: c.classList.contains('is-open'), exp: c.querySelector('.fact-card__toggle').getAttribute('aria-expanded'), clamp: getComputedStyle(c.querySelector('p')).webkitLineClamp };
});
ok(st.open && st.exp === 'true' && st.clamp === 'none', 'Enter раскрывает карточку, aria-expanded=true, clamp снят');

await page.keyboard.press(' ');
await page.waitForTimeout(200);
st = await page.evaluate(() => {
  const c = document.querySelector('.fact-card');
  return { open: c.classList.contains('is-open'), exp: c.querySelector('.fact-card__toggle').getAttribute('aria-expanded') };
});
ok(!st.open && st.exp === 'false', 'Space сворачивает обратно');

// клик по карточке
await page.locator('.fact-card').nth(1).click();
await page.waitForTimeout(200);
const cardClick = await page.evaluate(() => {
  const c = document.querySelectorAll('.fact-card')[1];
  return { open: c.classList.contains('is-open'), exp: c.querySelector('.fact-card__toggle').getAttribute('aria-expanded') };
});
ok(cardClick.open && cardClick.exp === 'true', 'тап по карточке раскрывает и синхронизирует aria-expanded');

// клик по самой кнопке не двоится
await page.locator('.fact-card').nth(1).locator('.fact-card__toggle').click();
await page.waitForTimeout(200);
const dbl = await page.evaluate(() => document.querySelectorAll('.fact-card')[1].classList.contains('is-open'));
ok(!dbl, 'клик по кнопке срабатывает один раз (без двойного переключения)');

// фокус-индикатор
await page.evaluate(() => document.querySelector('.fact-card__toggle').blur());
await page.keyboard.press('Tab');
await page.evaluate(() => {
  const t = document.querySelector('.fact-card__toggle');
  t.focus();
});
const fv = await page.evaluate(() => {
  const cs = getComputedStyle(document.querySelector('.fact-card__toggle'));
  return { outline: cs.outlineWidth, shadow: cs.boxShadow };
});
ok(parseFloat(fv.outline) >= 2 && fv.shadow !== 'none', 'фокус: рамка + тёмное кольцо (видно на белом)');

const heights = await page.evaluate(() => ({
  section: Math.round(document.querySelector('.facts').getBoundingClientRect().height),
  cards: [...document.querySelectorAll('.fact-card')].map(c => Math.round(c.getBoundingClientRect().height)),
}));
console.log('  высота секции:', heights.section, '| карточки:', heights.cards.join('/'));
ok(heights.section < 1200, `секция фактов компактна (${heights.section}px против 1466 исходно)`);

const overflow = await page.evaluate(() => document.documentElement.scrollWidth === window.innerWidth);
ok(overflow, 'горизонтального переполнения нет');
await page.close();

// ---------- Десктоп ----------
console.log('\n== 1280px ==');
page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:4330/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const desk = await page.evaluate(() => {
  const c = document.querySelector('.fact-card');
  const t = c.querySelector('.fact-card__toggle');
  return {
    toggleHidden: t.hasAttribute('hidden'),
    toggleDisplay: getComputedStyle(t).display,
    clamp: getComputedStyle(c.querySelector('p')).webkitLineClamp,
    cursor: getComputedStyle(c).cursor,
  };
});
ok(desk.toggleHidden && desk.toggleDisplay === 'none', 'на десктопе кнопка скрыта и вне потока фокуса');
ok(desk.clamp === 'none', 'на десктопе текст виден целиком, без обрезки');
ok(desk.cursor !== 'pointer', 'на десктопе карточка не притворяется кликабельной');
await page.close();

// ---------- Без JavaScript ----------
console.log('\n== без JS (390px) ==');
const ctx = await browser.newContext({ viewport: { width: 390, height: 740 }, javaScriptEnabled: false });
page = await ctx.newPage();
await page.goto('http://127.0.0.1:4330/', { waitUntil: 'load' });
// Playwright выполняет evaluate в изолированном контексте даже при
// javaScriptEnabled:false, поэтому «проверить отключённость» через
// evaluate нельзя. Доказательство — отсутствие следов работы app.js
// в самом DOM: кнопка создаётся скриптом, значит её нет.
const nojsState = await page.$$eval('.fact-card', cards => cards.map(c => ({
  hasToggle: !!c.querySelector('.fact-card__toggle'),
  textLen: c.querySelector('p').textContent.trim().length,
  clamped: getComputedStyle(c.querySelector('p')).webkitLineClamp,
})));
ok(nojsState.every(s => s.clamped === '2'), 'без JS обрезка работает (это чистый CSS)');
ok(nojsState.every(s => !s.hasToggle), 'без JS кнопка не рисуется — нет мёртвого элемента');
ok(nojsState.every(s => s.textLen > 80), 'без JS текст остаётся в документе (SEO и скринридеры)');
await ctx.close();

await browser.close();
server.close();
console.log(fail.length ? `\nПРОВАЛОВ: ${fail.length}` : '\nВсе проверки пройдены.');
process.exit(fail.length ? 1 : 0);

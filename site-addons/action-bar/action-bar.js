/* ==========================================================================
   Логика показа мобильной панели действий.

   Задача двойная и внутренне противоречивая: контакт должен быть под рукой,
   но полоса не должна отъедать экран при чтении. Решение — показывать её
   тогда, когда человек НЕ читает.

   Правила:
     1. Первый экран (прокрутка < 40px) — панель видна всегда. Это точка
        входа: человек только пришёл, действие должно быть на виду.
     2. Листание вниз — панель уезжает. Идёт чтение, экран нужен целиком.
     3. Листание вверх — панель возвращается. Движение вверх означает поиск:
        человек ищет навигацию, контакт или уже прочитал и решает.
     4. Виден блок формы — панель спрятана. Там те же действия своими
        кнопками, дублировать их поверх формы незачем.

   Защита от ложных кликов (иначе аналитика наберёт мусора):
     - пока панель спрятана, на ней pointer-events: none — тап во время
       ухода вниз не засчитывается;
     - первые 350 мс после появления клики гасятся: панель выезжает под
       пальцем, и попадание по ней в этот момент почти всегда случайное;
     - переключение требует накопленных 24px в одну сторону, поэтому
       микродрожание и резиновый отскок у краёв не дёргают панель.

   Разметка ничего не знает про эту логику: если файл не подключён, панель
   просто всегда видна на мобильном.
   ========================================================================== */

(function () {
  'use strict';

  var bar = document.querySelector('.mobile-bar');
  if (!bar) return;

  var TOP_ZONE = 40;        // зона «первого экрана», где панель видна всегда
  var THRESHOLD = 24;       // сколько надо пролистать, чтобы панель среагировала
  var CLICK_GUARD = 350;    // мс после появления, в течение которых клики гасятся

  var lastY = window.pageYOffset || 0;
  var acc = 0;              // накопленный ход в одну сторону
  var hidden = false;
  var shownAt = 0;          // когда панель стала видимой — для защиты от ложных тапов
  var formVisible = false;
  var ticking = false;

  function setHidden(next) {
    if (next === hidden) return;
    hidden = next;
    bar.classList.toggle('is-hidden', hidden);
    if (!hidden) shownAt = Date.now();
  }

  function update() {
    ticking = false;
    var y = window.pageYOffset || 0;
    var delta = y - lastY;
    lastY = y;

    // Форма на экране — панель не нужна независимо от направления.
    if (formVisible) { setHidden(true); acc = 0; return; }

    // Первый экран: всегда видна. Здесь же сбрасывается накопление, иначе
    // возврат наверх «донашивал» бы старый ход.
    if (y <= TOP_ZONE) { setHidden(false); acc = 0; return; }

    // Резиновый отскок в iOS даёт отрицательный y и рывки — их игнорируем.
    if (y < 0) return;

    // Накопление хода в одну сторону: смена знака обнуляет счётчик.
    if ((delta > 0) !== (acc > 0)) acc = 0;
    acc += delta;

    if (acc > THRESHOLD) { setHidden(true); acc = 0; }
    else if (acc < -THRESHOLD) { setHidden(false); acc = 0; }
  }

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }, { passive: true });

  // Клик, случившийся сразу после появления панели, почти наверняка не
  // адресован ей: полоса выехала под уже опускающийся палец.
  bar.addEventListener('click', function (e) {
    if (hidden || Date.now() - shownAt < CLICK_GUARD) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // Пока виден блок с формой, панель спрятана. Порог 0.35 — реагируем, когда
  // форма занимает заметную часть экрана, а не мелькнула краем.
  var form = document.getElementById('contact');
  if (form && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      formVisible = entries[0].isIntersecting;
      if (formVisible) setHidden(true);
      else if ((window.pageYOffset || 0) <= TOP_ZONE) setHidden(false);
    }, { threshold: 0.35 }).observe(form);
  }

  // Переход по якорю внутри панели прокручивает страницу вниз — без этого
  // панель успела бы «спрятаться от собственного клика» и мигнула.
  bar.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a) { formVisible = true; setHidden(true); }
  });

  update();
})();

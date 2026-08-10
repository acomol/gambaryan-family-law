/* ACTION-BAR-SPEC v2.0.0 | 2026-08-10
   ========================================================================
   Мобильная панель действий: зонная модель.

   Карта состояний:
   A. hero не пройден                           -> hidden
   B. hero пройден, форма не видна              -> visible
   C. форма видна минимум на FORM_VISIBLE_RATIO -> hidden
   D. меню открыто или поле в фокусе             -> hidden

   Ширина и landscape-режим управляются только CSS media queries. Направление
   прокрутки на поведение не влияет.
   ======================================================================== */

(function () {
  'use strict';

  var FORM_VISIBLE_RATIO = 0.15;
  var POINTER_FALLBACK_MS = 400;
  var INPUT_SELECTOR = 'input, textarea, select';

  var bar = document.querySelector('.mobile-bar');
  if (!bar) return;

  var heroPhone = document.querySelector('.hero__phone');
  var form = document.getElementById('contact');
  var drawer = document.getElementById('nav-drawer');
  var hasIntersectionObserver = 'IntersectionObserver' in window;

  var state = {
    pastHero: !heroPhone,
    formVisible: false,
    menuOpen: Boolean(drawer && !drawer.hidden),
    inputFocused: isInput(document.activeElement)
  };
  var hidden = null;
  var pointerTimer = null;

  function isInput(target) {
    return Boolean(target && target.matches && target.matches(INPUT_SELECTOR));
  }

  function shouldHide(current) {
    return !current.pastHero || current.formVisible || current.menuOpen || current.inputFocused;
  }

  function enablePointerEvents() {
    window.clearTimeout(pointerTimer);
    pointerTimer = null;
    if (hidden) return;
    bar.classList.add('is-interactive');
  }

  function setHidden(next) {
    if (next === hidden) return;

    hidden = next;
    window.clearTimeout(pointerTimer);
    pointerTimer = null;
    bar.classList.remove('is-interactive');
    bar.classList.toggle('is-hidden', hidden);

    if ('inert' in bar) bar.inert = hidden;

    if (!hidden) {
      pointerTimer = window.setTimeout(enablePointerEvents, POINTER_FALLBACK_MS);
    }
  }

  function updateVisibility() {
    setHidden(shouldHide(state));
  }

  bar.addEventListener('transitionend', function (event) {
    if (event.target === bar && event.propertyName === 'transform') {
      enablePointerEvents();
    }
  });

  Array.prototype.forEach.call(bar.querySelectorAll('a[data-method]'), function (link) {
    link.addEventListener('click', function () {
      (window.dataLayer = window.dataLayer || []).push({
        event: 'contact_click',
        method: link.getAttribute('data-method'),
        placement: 'action_bar'
      });
    });
  });

  if (drawer) {
    new MutationObserver(function () {
      state.menuOpen = !drawer.hidden;
      updateVisibility();
    }).observe(drawer, { attributes: true, attributeFilter: ['hidden'] });
  }

  document.addEventListener('focusin', function (event) {
    state.inputFocused = isInput(event.target);
    updateVisibility();
  });

  document.addEventListener('focusout', function (event) {
    state.inputFocused = isInput(event.relatedTarget);
    updateVisibility();
  });

  if (hasIntersectionObserver) {
    if (heroPhone) {
      new IntersectionObserver(function (entries) {
        var entry = entries[0];
        state.pastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        updateVisibility();
      }).observe(heroPhone);
    }

    if (form) {
      new IntersectionObserver(function (entries) {
        var entry = entries[0];
        state.formVisible = entry.isIntersecting && entry.intersectionRatio >= FORM_VISIBLE_RATIO;
        updateVisibility();
      }, { threshold: FORM_VISIBLE_RATIO }).observe(form);
    }
  } else {
    state.pastHero = true;
    state.formVisible = false;
  }

  updateVisibility();
})();

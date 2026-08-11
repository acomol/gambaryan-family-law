/* ACTION-BAR-SPEC v2.3.1 | 2026-08-11
   ========================================================================
   Мобильная панель действий: зонная модель.

   Карта состояний:
   A. hero не пройден                           -> hidden
   B. hero пройден, форма не видна              -> visible
   C. форма видна минимум на FORM_VISIBLE_RATIO -> hidden
   D. меню открыто или поле в фокусе             -> hidden

   Состав зоны B по времени Asia/Jerusalem:
   вс–чт 09:00–17:59 -> phone / booking / WhatsApp
   остальное время   -> booking / «Написать в WhatsApp»

   Ширина и landscape-режим управляются только CSS media queries. Направление
   прокрутки на поведение не влияет. scrollend/hashchange только сверяют
   геометрию после мгновенных якорных переходов без промежуточного пересечения.
   ======================================================================== */

(function () {
  'use strict';

  var FORM_VISIBLE_RATIO = 0.15;
  var POINTER_FALLBACK_MS = 400;
  var INPUT_SELECTOR = 'input, textarea, select';
  var BUSINESS_HOURS = {
    timeZone: 'Asia/Jerusalem',
    openWeekdays: { Sun: true, Mon: true, Tue: true, Wed: true, Thu: true },
    openMinute: 9 * 60,
    closeMinute: 18 * 60
  };
  var BUSINESS_STATES = {
    open: { phoneVisible: true, whatsappLabel: 'WhatsApp', demoLabel: 'Рабочее время' },
    closed: { phoneVisible: false, whatsappLabel: 'Написать в WhatsApp', demoLabel: 'Нерабочее время' }
  };

  var bar = document.querySelector('.mobile-bar');
  if (!bar) return;

  var heroPhone = document.querySelector('.hero__phone');
  var form = document.getElementById('contact');
  var drawer = document.getElementById('nav-drawer');
  var phoneAction = bar.querySelector('[data-business-action="phone"]');
  var bookingAction = bar.querySelector('[data-business-action="booking"]');
  var whatsappLabel = bar.querySelector('[data-business-label="whatsapp"]');
  var demoToggle = document.querySelector('[data-business-demo]');
  var demoStatus = demoToggle && demoToggle.querySelector('[data-business-demo-status]');
  var demoStateLabel = demoToggle && demoToggle.querySelector('[data-business-demo-state]');
  var hasIntersectionObserver = 'IntersectionObserver' in window;
  var businessClock = null;
  var businessTimer = null;
  var demoBusinessState = null;

  try {
    businessClock = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
      timeZone: BUSINESS_HOURS.timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    });
  } catch (error) {
    businessClock = null;
  }

  var state = {
    pastHero: !heroPhone,
    formVisible: false,
    menuOpen: Boolean(drawer && !drawer.hidden),
    inputFocused: isInput(document.activeElement)
  };
  var hidden = null;
  var pointerTimer = null;

  function getBusinessTime(date) {
    if (!businessClock || !businessClock.formatToParts) return null;

    var values = {};
    try {
      businessClock.formatToParts(date).forEach(function (part) {
        if (part.type !== 'literal') values[part.type] = part.value;
      });
    } catch (error) {
      return null;
    }
    if (!values.weekday || values.hour === undefined || values.minute === undefined) {
      return null;
    }

    return {
      weekday: values.weekday,
      minute: Number(values.hour) * 60 + Number(values.minute)
    };
  }

  function isBusinessOpen(date) {
    var current = getBusinessTime(date);
    return Boolean(
      current &&
      BUSINESS_HOURS.openWeekdays[current.weekday] &&
      current.minute >= BUSINESS_HOURS.openMinute &&
      current.minute < BUSINESS_HOURS.closeMinute
    );
  }

  function syncBusinessState() {
    var stateName = demoBusinessState || (isBusinessOpen(new Date()) ? 'open' : 'closed');
    var businessState = BUSINESS_STATES[stateName];
    var phoneHadFocus = phoneAction && document.activeElement === phoneAction;

    bar.setAttribute('data-business-state', stateName);
    if (phoneAction) phoneAction.hidden = !businessState.phoneVisible;
    if (whatsappLabel) whatsappLabel.textContent = businessState.whatsappLabel;
    if (!businessState.phoneVisible && phoneHadFocus && bookingAction) {
      bookingAction.focus();
    }
    if (demoToggle) {
      demoToggle.setAttribute('aria-checked', String(stateName === 'open'));
      demoToggle.setAttribute('data-demo-mode', demoBusinessState ? 'manual' : 'auto');
      if (demoStatus) demoStatus.textContent = demoBusinessState ? 'Демо' : 'Авто';
      if (demoStateLabel) demoStateLabel.textContent = businessState.demoLabel;
    }
  }

  function scheduleBusinessStateSync() {
    window.clearTimeout(businessTimer);
    businessTimer = window.setTimeout(function () {
      syncBusinessState();
      scheduleBusinessStateSync();
    }, 60050 - (Date.now() % 60000));
  }

  function isPastHero(rect, isIntersecting) {
    return !isIntersecting && rect.top < 0;
  }

  function syncHeroGeometry() {
    if (!hasIntersectionObserver || !heroPhone) return;
    var rect = heroPhone.getBoundingClientRect();
    var isIntersecting = rect.bottom > 0 && rect.top < window.innerHeight;
    state.pastHero = isPastHero(rect, isIntersecting);
    updateVisibility();
  }

  function scheduleHeroGeometrySync() {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(syncHeroGeometry);
    });
  }

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
    if (demoToggle) demoToggle.hidden = hidden;

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

  if (demoToggle) {
    demoToggle.addEventListener('click', function () {
      demoBusinessState = bar.getAttribute('data-business-state') === 'open' ? 'closed' : 'open';
      syncBusinessState();
    });
  }

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

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      syncBusinessState();
      scheduleBusinessStateSync();
    }
  });

  document.addEventListener('scrollend', syncHeroGeometry, { passive: true });
  window.addEventListener('hashchange', scheduleHeroGeometrySync);
  window.addEventListener('focus', syncBusinessState);
  window.addEventListener('pageshow', function () {
    scheduleHeroGeometrySync();
    syncBusinessState();
    scheduleBusinessStateSync();
  });

  if (hasIntersectionObserver) {
    if (heroPhone) {
      new IntersectionObserver(function (entries) {
        var entry = entries[0];
        state.pastHero = isPastHero(entry.boundingClientRect, entry.isIntersecting);
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

  syncBusinessState();
  scheduleBusinessStateSync();
  updateVisibility();
})();

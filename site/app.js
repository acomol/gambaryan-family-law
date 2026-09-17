/* ==========================================================================
   Гамбарян & Партнёры — интерактив короткой версии лендинга
   Реализация по docs/SPEC-LANDING-V01.md (раздел «Поведение»).
   Прогрессивное улучшение: без JS видны все 8 направлений; форма использует
   нативные validation/autofill, JS добавляет same-origin JSON-отправку.
   ========================================================================== */

(function () {
  "use strict";

  /* --- Бургер-меню ------------------------------------------------------- */

  var burger = document.querySelector(".nav-burger");
  var drawer = document.querySelector(".nav-drawer");

  function setMenu(open) {
    if (!burger || !drawer) return;
    drawer.hidden = !open;
    burger.setAttribute("aria-expanded", open ? "true" : "false");
  }

  if (burger && drawer) {
    setMenu(false);

    burger.addEventListener("click", function () {
      setMenu(drawer.hidden);
    });

    drawer.addEventListener("click", function (event) {
      if (event.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !drawer.hidden) {
        setMenu(false);
        burger.focus();
      }
    });

    // Бургер существует только до 960px — при возврате на десктоп панель закрывается,
    // иначе она осталась бы открытой поверх контента.
    window.matchMedia("(min-width: 961px)").addEventListener("change", function (mq) {
      if (mq.matches) setMenu(false);
    });
  }

  /* --- Слайдер hero ----------------------------------------------------- */

  var heroSlides = Array.prototype.slice.call(document.querySelectorAll(".hero-slide"));

  if (heroSlides.length === 2) {
    var heroActive = 0;
    var heroTimer = null;
    var secondHeroImage = heroSlides[1].querySelector("img");
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var secondHeroReady = false;

    function setHeroSlide(index) {
      heroActive = index;
      heroSlides.forEach(function (slide, i) {
        var on = i === heroActive;
        slide.classList.toggle("is-active", on);
        slide.setAttribute("aria-hidden", on ? "false" : "true");
      });
    }

    function stopHeroSlider() {
      if (heroTimer) {
        window.clearInterval(heroTimer);
        heroTimer = null;
      }
    }

    function startHeroSlider() {
      stopHeroSlider();
      if (reducedMotion.matches || document.hidden || !secondHeroReady) return;
      heroTimer = window.setInterval(function () {
        setHeroSlide((heroActive + 1) % heroSlides.length);
      }, 3500);
    }

    function markSecondHeroReady() {
      secondHeroReady = Boolean(secondHeroImage && secondHeroImage.naturalWidth > 0);
      if (secondHeroReady) startHeroSlider();
    }

    function loadSecondHeroSlide() {
      if (!secondHeroImage) return;

      var secondHeroSource = heroSlides[1].querySelector("source");
      if (secondHeroSource && secondHeroSource.dataset.srcset) {
        secondHeroSource.srcset = secondHeroSource.dataset.srcset;
      }
      if (secondHeroImage.dataset.srcset) {
        secondHeroImage.srcset = secondHeroImage.dataset.srcset;
      }
      if (secondHeroImage.dataset.src) {
        secondHeroImage.src = secondHeroImage.dataset.src;
      }

      if (secondHeroImage.complete) {
        markSecondHeroReady();
      } else {
        secondHeroImage.addEventListener("load", markSecondHeroReady, { once: true });
      }
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        stopHeroSlider();
      } else {
        startHeroSlider();
      }
    });

    reducedMotion.addEventListener("change", function () {
      if (reducedMotion.matches) {
        stopHeroSlider();
        setHeroSlide(0);
      } else {
        startHeroSlider();
      }
    });

    setHeroSlide(0);
    window.addEventListener("load", loadSecondHeroSlide, { once: true });
  }

  /* --- Направления: упор, свайп, горизонтальная строка тем --------------- */

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".svc-tab"));
  var dots = Array.prototype.slice.call(document.querySelectorAll(".svc-dot"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".svc-card"));

  if (tabs.length && tabs.length === panels.length && dots.length === panels.length) {
    var active = 0;
    var last = panels.length - 1;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var stage = document.querySelector('.svc-stage');
    // Свайп ловится по всей карточке, включая блок «Ведёт» (указание владельца
    // 2026-09-17): жест начинается где угодно, двигается только текст.
    var frame = document.querySelector('.svc-frame') || stage;
    var tablist = document.querySelector('.svc-tabs');
    var prev = document.querySelector('.svc-arrow[data-dir="prev"]');
    var next = document.querySelector('.svc-arrow[data-dir="next"]');
    var hint = document.querySelector('.svc-next-hint');
    var hintLabel = hint && hint.querySelector('.svc-next-hint__label');
    var supportsInert = 'inert' in HTMLElement.prototype;
    var transitionToken = 0;
    var finishTransition = null;
    var swipe = null;
    var dragFrame = null;
    var settlingPanel = null;
    var settleTimer = null;

    function clearDragStyles(panel) {
      panel.style.removeProperty('transform');
      panel.style.removeProperty('opacity');
      panel.style.removeProperty('will-change');
    }

    function clearSettling() {
      window.clearTimeout(settleTimer);
      settleTimer = null;
      if (settlingPanel) {
        settlingPanel.classList.remove('is-settling');
        clearDragStyles(settlingPanel);
        settlingPanel = null;
      }
    }

    function resetSwipe(settle) {
      if (!swipe) return;
      var gesture = swipe;
      swipe = null;
      window.cancelAnimationFrame(dragFrame);
      dragFrame = null;
      gesture.panel.classList.remove('is-dragging');
      if (settle && gesture.dragging && !reduceMotion.matches) {
        settlingPanel = gesture.panel;
        settlingPanel.classList.add('is-settling');
        settleTimer = window.setTimeout(clearSettling, 180);
      }
      clearDragStyles(gesture.panel);
      if (frame.hasPointerCapture(gesture.id)) frame.releasePointerCapture(gesture.id);
    }

    function transitionTo(prevIndex, nextIndex, dir) {
      if (finishTransition) finishTransition();
      resetSwipe(false);
      clearSettling();
      var outgoing = panels[prevIndex];
      var incoming = panels[nextIndex];
      var token = ++transitionToken;
      var finished = false;
      var timer = null;

      function finish() {
        if (finished || token !== transitionToken) return;
        finished = true;
        window.clearTimeout(timer);
        incoming.removeEventListener('animationend', onAnimationEnd);
        [outgoing, incoming].forEach(function (panel) {
          panel.classList.remove('is-active', 'is-enter-next', 'is-enter-prev',
            'is-leave-next', 'is-leave-prev', 'is-dragging', 'is-settling');
          clearDragStyles(panel);
        });
        outgoing.hidden = true;
        incoming.classList.add('is-active');
        if (stage) stage.dataset.motion = 'idle';
        finishTransition = null;
      }

      function onAnimationEnd(event) {
        if (event.target === incoming) finish();
      }

      finishTransition = finish;
      if (outgoing.contains(document.activeElement)) tabs[nextIndex].focus({ preventScroll: true });
      outgoing.setAttribute('aria-hidden', 'true');
      incoming.hidden = false;
      incoming.removeAttribute('aria-hidden');
      if (supportsInert) {
        outgoing.inert = true;
        incoming.inert = false;
      }
      outgoing.classList.remove('is-active');
      outgoing.classList.add('is-leave-' + dir);
      incoming.classList.add('is-enter-' + dir);
      if (stage) stage.dataset.motion = 'moving';
      incoming.addEventListener('animationend', onAnimationEnd);
      if (reduceMotion.matches || window.getComputedStyle(incoming).animationName === 'none') {
        finish();
      } else {
        timer = window.setTimeout(finish, 320);
      }
    }

    function setActive(index, moveFocus, wrap, dirHint) {
      var previous = active;
      active = wrap ? (index + panels.length) % panels.length : Math.max(0, Math.min(index, last));

      tabs.forEach(function (tab, i) {
        var on = i === active;
        tab.classList.toggle("is-active", on);
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.tabIndex = on ? 0 : -1;
      });

      dots.forEach(function (dot, i) {
        dot.setAttribute("aria-current", i === active ? "true" : "false");
      });

      if (previous !== active) {
        transitionTo(previous, active, dirHint || (active > previous ? 'next' : 'prev'));
      }

      // Кольцо: на краях стрелки не гаснут, листание продолжается.
      if (prev) prev.disabled = false;
      if (next) next.disabled = false;
      if (hintLabel) hintLabel.textContent = tabs[active + 1] ? tabs[active + 1].textContent : '';
      if (hint) hint.hidden = active === last;
      if (moveFocus) tabs[active].focus({ preventScroll: true });
      if (tablist && tablist.scrollWidth > tablist.clientWidth) {
        tablist.scrollTo({
          left: tabs[active].offsetLeft - (tablist.clientWidth - tabs[active].offsetWidth) / 2,
          behavior: reduceMotion.matches ? 'auto' : 'smooth'
        });
      }
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        setActive(i);
      });
    });

    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () {
        setActive(i);
      });
    });

    if (tablist) {
      tablist.addEventListener("keydown", function (event) {
        var handled = true;
        switch (event.key) {
          case "ArrowRight":
          case "ArrowDown":
            setActive(active + 1, true, true, 'next');
            break;
          case "ArrowLeft":
          case "ArrowUp":
            setActive(active - 1, true, true, 'prev');
            break;
          case "Home":
            setActive(0, true, false, 'prev');
            break;
          case "End":
            setActive(panels.length - 1, true, false, 'next');
            break;
          default:
            handled = false;
        }
        if (handled) event.preventDefault();
      });
    }

    if (prev) prev.addEventListener("click", function () { setActive(active - 1, false, true, 'prev'); });
    if (next) next.addEventListener("click", function () { setActive(active + 1, false, true, 'next'); });
    if (hint) hint.addEventListener("click", function () { setActive(active + 1); });

    if (stage) {
      function recordPoint(event) {
        swipe.points.push({ x: event.clientX, time: event.timeStamp });
        swipe.points = swipe.points.filter(function (point) {
          return event.timeStamp - point.time <= 80;
        });
      }

      function drawSwipe() {
        dragFrame = null;
        if (!swipe || !swipe.dragging) return;
        var dx = swipe.dx;
        swipe.panel.style.transform = 'translateX(' + dx + 'px)';
        swipe.panel.style.opacity = Math.max(0, 1 - Math.abs(dx) / swipe.width * .5);
      }

      frame.addEventListener('pointerdown', function (event) {
        if (event.pointerType === 'mouse' || !event.isPrimary || swipe) return;
        if (event.target.closest('a, button, input')) return;
        if (finishTransition) finishTransition();
        clearSettling();
        swipe = {
          id: event.pointerId, x: event.clientX, y: event.clientY,
          width: stage.getBoundingClientRect().width, panel: panels[active],
          dx: 0, horizontal: false, dragging: false, cancelled: false,
          points: [{ x: event.clientX, time: event.timeStamp }]
        };
      });
      frame.addEventListener('pointermove', function (event) {
        if (!swipe || event.pointerId !== swipe.id || swipe.cancelled) return;
        var dx = event.clientX - swipe.x;
        var dy = event.clientY - swipe.y;
        recordPoint(event);
        if (!swipe.horizontal) {
          if (Math.abs(dy) > Math.abs(dx)) {
            swipe.cancelled = true;
            return;
          }
          if (Math.abs(dx) < 10 || Math.abs(dx) < 1.5 * Math.abs(dy)) return;
          swipe.horizontal = true;
          if (!reduceMotion.matches) {
            swipe.dragging = true;
            swipe.panel.classList.add('is-dragging');
            try {
              frame.setPointerCapture(event.pointerId);
            } catch (error) {
              // Синтетический PointerEvent не регистрирует активный указатель.
            }
          }
        }
        swipe.dx = dx;
        if (swipe.dragging && dragFrame === null) dragFrame = window.requestAnimationFrame(drawSwipe);
      });
      frame.addEventListener('pointerup', function (event) {
        if (!swipe || event.pointerId !== swipe.id) return;
        var dx = event.clientX - swipe.x;
        var dy = event.clientY - swipe.y;
        recordPoint(event);
        var first = swipe.points[0];
        var elapsed = event.timeStamp - first.time;
        var speed = elapsed > 0 ? Math.abs(event.clientX - first.x) / elapsed : 0;
        var threshold = Math.min(96, Math.max(48, .25 * swipe.width));
        var change = !swipe.cancelled && (swipe.dragging
          ? Math.abs(dx) >= threshold || (Math.abs(dx) >= 24 && speed >= .5)
          : Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy));
        resetSwipe(!change);
        if (change) setActive(active + (dx < 0 ? 1 : -1), false, true, dx < 0 ? 'next' : 'prev');
      });
      function cancelSwipe(event) {
        if (swipe && event.pointerId === swipe.id) resetSwipe(true);
      }
      frame.addEventListener('pointercancel', cancelSwipe);
      // lostpointercapture жест НЕ отменяет: у touch неявный захват стоит на элементе под
      // пальцем, и при setPointerCapture на сцену событие потери всплывает от потомка
      // посреди свайпа — жест сбрасывался до pointerup, свайп пальцем не работал
      // (замер на живой странице 2026-09-16). Отпускание и отмена приходят
      // как pointerup / pointercancel.
      stage.dataset.motion = 'idle';
    }

    panels.forEach(function (panel, i) {
      panel.hidden = i !== active;
      panel.classList.toggle('is-active', i === active);
      if (supportsInert) panel.inert = i !== active;
      if (i === active) {
        panel.removeAttribute('aria-hidden');
      } else {
        panel.setAttribute('aria-hidden', 'true');
      }
    });

    setActive(0);
  }

  /* --- Форма обращения --------------------------------------------------- */

  var LEAD_CONTRACT = window.GAMBARIAN_LEAD_CONTRACT;
  var EXPECTED_LEAD_CONTRACT_VERSION = "2.3.0";
  if (!LEAD_CONTRACT || LEAD_CONTRACT.version !== EXPECTED_LEAD_CONTRACT_VERSION) {
    var unavailableForm = document.querySelector(".lead-form");
    if (unavailableForm) {
      unavailableForm.noValidate = true;
      unavailableForm.addEventListener("submit", function (event) { event.preventDefault(); });
      unavailableForm.querySelector(".lead-form__error-title").textContent = "Не удалось проверить данные";
      unavailableForm.querySelector(".lead-form__error-text").textContent =
        "Обновите страницу и заполните форму ещё раз. Если ошибка повторится, свяжитесь с нами напрямую.";
      unavailableForm.querySelector(".lead-form__error-contact").hidden = false;
      unavailableForm.querySelector(".lead-form__error").hidden = false;
    }
    return;
  }
  var LEAD_ENDPOINT = LEAD_CONTRACT.endpoint;
  var LEAD_FORM_ID = LEAD_CONTRACT.formId;
  var LEAD_ATTRIBUTION_STORAGE_KEY = LEAD_CONTRACT.attributionStorageKey;
  var LEAD_ATTRIBUTION_KEYS = LEAD_CONTRACT.attributionFields;

  function readFirstTouchAttribution() {
    try {
      var saved = window.sessionStorage.getItem(LEAD_ATTRIBUTION_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (error) {
      // Storage может быть запрещён политикой браузера — форма работает без него.
    }

    var params = new URLSearchParams(window.location.search);
    var attribution = {};
    LEAD_ATTRIBUTION_KEYS.forEach(function (key) {
      attribution[key] = (params.get(key) || "").slice(
        0,
        LEAD_CONTRACT.limits.attribution
      );
    });

    attribution.referrer_host = "";
    if (document.referrer) {
      try {
        var referrer = new URL(document.referrer);
        if (referrer.origin !== window.location.origin) {
          attribution.referrer_host = referrer.hostname.slice(
            0,
            LEAD_CONTRACT.limits.referrerHost
          );
        }
      } catch (error) {
        // Некорректный referrer не должен мешать заявке.
      }
    }

    try {
      window.sessionStorage.setItem(
        LEAD_ATTRIBUTION_STORAGE_KEY,
        JSON.stringify(attribution)
      );
    } catch (error) {
      // Storage опционален.
    }
    return attribution;
  }

  function createSubmissionId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    var bytes = new Uint8Array(16);
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      window.crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < bytes.length; i += 1) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    var hex = Array.from(bytes, function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join("-");
  }

  function pushFormEvent(eventName) {
    (window.dataLayer = window.dataLayer || []).push({
      event: eventName,
      form_id: LEAD_FORM_ID,
    });
  }

  function submitLead(data) {
    var controller = new AbortController();
    var timeoutId = window.setTimeout(function () {
      controller.abort();
    }, LEAD_CONTRACT.clientTimeoutMs);

    return fetch(LEAD_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    }).then(function (response) {
      return response.json().catch(function () {
        return {};
      }).then(function (body) {
        if (!response.ok) {
          var submissionError = new Error(body.error || "submission_failed");
          submissionError.status = response.status;
          submissionError.code = body.error || "submission_failed";
          submissionError.fieldErrors = body.field_errors && typeof body.field_errors === "object"
            ? body.field_errors
            : {};
          throw submissionError;
        }
        return body;
      });
    }).finally(function () {
      window.clearTimeout(timeoutId);
    });
  }

  var form = document.querySelector(".lead-form");
  var success = document.querySelector(".form-success");
  var again = document.querySelector(".form-success__again");
  var editContacts = document.querySelector(".form-success__edit");
  var errorBox = document.querySelector(".lead-form__error");
  var errorTitle = errorBox && errorBox.querySelector(".lead-form__error-title");
  var errorText = errorBox && errorBox.querySelector(".lead-form__error-text");
  var errorContact = errorBox && errorBox.querySelector(".lead-form__error-contact");
  var submitButton = form && form.querySelector('.lead-form__submit');
  var formFields = form && form.querySelector(".lead-form__fields");
  var confirmBox = form && form.querySelector(".lead-form__confirm");
  var confirmButton = form && form.querySelector(".lead-form__confirm-submit");
  var editButton = form && form.querySelector(".lead-form__edit");
  var emailSuggestion = form && form.querySelector(".field__email-suggestion");
  var formInputs = form ? Array.from(form.querySelectorAll("input[name]")) : [];
  var submitButtonLabel = submitButton ? submitButton.textContent : "";
  var validation = LEAD_CONTRACT.validation;
  var attribution = readFirstTouchAttribution();
  var pendingSubmissionId = "";
  var pendingFingerprint = "";
  var acceptedSubmissionId = "";
  var acceptedContacts = null;
  var editingContacts = false;
  var submitting = false;
  var errorMode = "";
  var invalidBatchScheduled = false;
  var confirmedFingerprint = "";
  var emailDomainCorrections = {
    "gmail.con": "gmail.com",
    "gmali.com": "gmail.com",
    "gmail.co": "gmail.com",
    "gamil.com": "gmail.com",
    "hotmail.con": "hotmail.com",
    "outlook.con": "outlook.com",
    "yahoo.con": "yahoo.com",
    "walla.con": "walla.co.il",
  };

  function suggestedEmailDomain() {
    var parts = form.elements.email.value.trim().toLowerCase().split("@");
    return parts.length === 2 && Object.prototype.hasOwnProperty.call(emailDomainCorrections, parts[1])
      ? emailDomainCorrections[parts[1]] : "";
  }

  function updateEmailSuggestion() {
    var domain = suggestedEmailDomain();
    emailSuggestion.hidden = !domain;
    emailSuggestion.textContent = domain ? "Возможно, вы имели в виду " + domain + "?" : "";
  }

  function normalizedPhone(phone) {
    return (phone.charAt(0) === "+" ? "+" : "") + phone.replace(/\D/g, "");
  }

  // Показ номера человеку (шаг проверки и экран успеха): израильские номера
  // группируются как +972 54-000-0000 / 054-000-0000, остальные — как ввёл
  // пользователь. Слитная строка цифр глазами не проверяется, а проверка — цель шага.
  function displayPhone(phone) {
    var digits = normalizedPhone(phone);
    var intl = /^\+972(\d{2})(\d{3})(\d{4})$/.exec(digits);
    if (intl) return "+972 " + intl[1] + "-" + intl[2] + "-" + intl[3];
    var local = /^0(\d{2})(\d{3})(\d{4})$/.exec(digits);
    if (local) return "0" + local[1] + "-" + local[2] + "-" + local[3];
    return phone.trim().replace(/\s+/g, " ");
  }

  function showFields(focusFirst) {
    confirmedFingerprint = "";
    confirmBox.hidden = true;
    formFields.hidden = false;
    submitButton.hidden = false;
    if (focusFirst) form.elements.name.focus();
  }

  function showConfirmation(data, fingerprint) {
    confirmedFingerprint = fingerprint;
    form.querySelector('[data-confirm="name"]').textContent = data.name;
    form.querySelector('[data-confirm="phone"]').textContent = displayPhone(data.phone);
    form.querySelector('[data-confirm="email"]').textContent = data.email;
    hideFormError();
    formFields.hidden = true;
    submitButton.hidden = true;
    confirmBox.hidden = false;
    confirmBox.querySelector(".lead-form__confirm-title").focus();
  }

  function showSuccess(data) {
    hideFormError();
    form.hidden = true;
    success.querySelector(".form-success__contacts").textContent =
      "Мы свяжемся с вами по телефону " + displayPhone(data.phone) + ". Ваш e-mail: " + data.email;
    success.hidden = false;
    // Фокус на результат: кнопка отправки уже скрыта.
    var title = success.querySelector(".form-success__title");
    if (title) {
      title.setAttribute("tabindex", "-1");
      title.focus();
    }
  }

  function fieldMessage(input) {
    var value = input.value.trim();
    var limits = LEAD_CONTRACT.limits;

    if (input.name === "name") {
      if (!value) return validation.fields.name.required;
      if (value.length < 2) return validation.fields.name.tooShort;
      if (value.length > limits.name) return validation.fields.name.tooLong;
    }

    if (input.name === "phone") {
      if (!value) return validation.fields.phone.required;
      var digits = value.replace(/\D/g, "");
      if (
        value.length > limits.phone ||
        digits.length < limits.phoneDigitsMin ||
        digits.length > limits.phoneDigitsMax ||
        !/^[0-9+().\-\s]+$/.test(value)
      ) {
        return validation.fields.phone.invalidFormat;
      }
    }

    if (input.name === "email") {
      if (!value) return validation.fields.email.required;
      if (value.length > limits.email) return validation.fields.email.tooLong;
      if (!LEAD_CONTRACT.isValidEmail(value)) return validation.fields.email.invalidFormat;
    }

    return "";
  }

  function setFieldError(input, message) {
    var errorId = input.getAttribute("aria-errormessage");
    var fieldError = errorId ? document.getElementById(errorId) : null;
    var field = input.closest(".field");
    if (message) {
      input.setAttribute("aria-invalid", "true");
      if (field) field.classList.add("field--invalid");
      if (fieldError) {
        if (fieldError.textContent !== message) fieldError.textContent = message;
        fieldError.hidden = false;
      }
      return;
    }

    input.removeAttribute("aria-invalid");
    if (field) field.classList.remove("field--invalid");
    if (fieldError) {
      fieldError.textContent = "";
      fieldError.hidden = true;
    }
  }

  function validateForm(fieldNames) {
    var allowed = fieldNames ? new Set(fieldNames) : null;
    var invalidInputs = [];
    formInputs.forEach(function (input) {
      if (allowed && !allowed.has(input.name)) return;
      var message = fieldMessage(input);
      setFieldError(input, message);
      if (message) invalidInputs.push(input);
    });
    return invalidInputs;
  }

  function hideFormError() {
    errorMode = "";
    if (errorBox) errorBox.hidden = true;
  }

  function showFormError(title, message, showContact) {
    if (!errorBox) return;
    if (errorTitle) errorTitle.textContent = title;
    if (errorText) errorText.textContent = message;
    if (errorContact) errorContact.hidden = !showContact;
    errorBox.hidden = false;
  }

  function showValidationErrors(invalidInputs, focusFirst) {
    if (!invalidInputs.length) return;
    errorMode = "validation";
    var labels = invalidInputs.map(function (input) {
      return validation.fieldLabels[input.name];
    }).filter(Boolean);
    var fieldsText = labels.length ? " Поля: " + labels.join(", ") + "." : "";
    showFormError(
      validation.summaryTitle,
      validation.summaryText + fieldsText,
      false
    );
    if (focusFirst !== false) invalidInputs[0].focus();
  }

  function messageForServerCode(fieldName, code) {
    var fieldMessages = validation.fields[fieldName] || {};
    var codes = validation.codes;
    if (code === codes.required) return fieldMessages.required || "Заполните поле.";
    if (code === codes.tooShort) return fieldMessages.tooShort || "Значение слишком короткое.";
    if (code === codes.tooLong) return fieldMessages.tooLong || "Значение слишком длинное.";
    return fieldMessages.invalidFormat || "Проверьте формат значения.";
  }

  function showServerValidationErrors(fieldErrors) {
    var invalidInputs = [];
    Object.keys(fieldErrors).forEach(function (fieldName) {
      var input = form.querySelector('[name="' + fieldName + '"]');
      if (!input) return;
      setFieldError(input, messageForServerCode(fieldName, fieldErrors[fieldName]));
      invalidInputs.push(input);
    });
    showValidationErrors(invalidInputs);
    return invalidInputs.length > 0;
  }

  function deliveryMessage(error) {
    if (navigator.onLine === false) {
      return [validation.offlineTitle, validation.offlineText];
    }
    if (
      error.name === "AbortError" ||
      error.status === 504 ||
      error.code === "delivery_timeout"
    ) {
      return [validation.timeoutTitle, validation.timeoutText];
    }
    if (error.status === 503) {
      return [validation.unavailableTitle, validation.unavailableText];
    }
    if (error.status === 429) {
      return [validation.rateLimitTitle, validation.rateLimitText];
    }
    if ([400, 413, 415, 422].indexOf(error.status) !== -1) {
      return [validation.invalidRequestTitle, validation.invalidRequestText];
    }
    return [validation.deliveryTitle, validation.deliveryText];
  }

  function setSubmitting(active) {
    submitting = active;
    if (!form || !submitButton) return;
    form.setAttribute("aria-busy", active ? "true" : "false");
    submitButton.disabled = active;
    submitButton.textContent = active ? "Отправляем…" : submitButtonLabel;
    confirmButton.disabled = active;
    confirmButton.textContent = active ? "Отправляем…" : "Всё верно, отправить";
    editButton.disabled = active;
  }

  if (form && success) {
    success.hidden = true;
    // Общая валидация работает и при скрытых на шаге проверки обязательных полях.
    form.noValidate = true;
    editButton.addEventListener("click", function () { showFields(true); });
    form.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !confirmBox.hidden && !submitting) {
        event.preventDefault();
        showFields(true);
      }
    });
    form.elements.email.addEventListener("input", updateEmailSuggestion);
    form.elements.email.addEventListener("change", updateEmailSuggestion);
    emailSuggestion.addEventListener("click", function () {
      var domain = suggestedEmailDomain();
      if (!domain) return;
      var input = form.elements.email;
      input.value = input.value.trim().split("@")[0] + "@" + domain;
      updateEmailSuggestion();
      setFieldError(input, fieldMessage(input));
      input.focus();
    });

    form.addEventListener("invalid", function (event) {
      if (!event.target.matches("input[name]")) return;
      event.preventDefault();
      setFieldError(event.target, fieldMessage(event.target));
      if (invalidBatchScheduled) return;
      invalidBatchScheduled = true;
      window.setTimeout(function () {
        invalidBatchScheduled = false;
        showValidationErrors(validateForm());
      }, 0);
    }, true);

    formInputs.forEach(function (input) {
      input.addEventListener("input", function () {
        if (input.getAttribute("aria-invalid") === "true") {
          setFieldError(input, fieldMessage(input));
          if (errorMode === "validation") {
            // Assertive summary не переозвучивается на каждом символе.
            // Точные inline-ошибки остаются у полей до исправления/повтора.
            hideFormError();
          }
        }
      });
      input.addEventListener("change", function () {
        if (input.getAttribute("aria-invalid") === "true") {
          setFieldError(input, fieldMessage(input));
        }
      });
      input.addEventListener("blur", function () {
        if (input.getAttribute("aria-invalid") === "true") {
          setFieldError(input, fieldMessage(input));
        }
      });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (submitting) return;
      var invalidInputs = validateForm();
      if (invalidInputs.length) {
        showFields(false);
        showValidationErrors(invalidInputs);
        return;
      }

      var data = {
        name: form.elements.name.value.trim(),
        phone: form.elements.phone.value.trim(),
        email: form.elements.email.value.trim(),
      };
      var contactFingerprint = JSON.stringify(data);
      if (editingContacts && contactFingerprint === JSON.stringify(acceptedContacts)) {
        showSuccess(acceptedContacts);
        return;
      }
      if (confirmBox.hidden || confirmedFingerprint !== contactFingerprint) {
        showConfirmation(data, contactFingerprint);
        return;
      }
      Object.assign(data, attribution, {
        landing_path: window.location.pathname,
      });
      if (editingContacts) data.corrects_submission_id = acceptedSubmissionId;

      var fingerprint = JSON.stringify(data);
      if (!pendingSubmissionId || fingerprint !== pendingFingerprint) {
        pendingSubmissionId = createSubmissionId();
        pendingFingerprint = fingerprint;
      }
      data.submission_id = pendingSubmissionId;

      hideFormError();
      setSubmitting(true);

      submitLead(data).then(
        function (response) {
          setSubmitting(false);
          acceptedSubmissionId = response.submission_id || data.submission_id;
          acceptedContacts = JSON.parse(contactFingerprint);
          editingContacts = false;
          showSuccess(acceptedContacts);
          pushFormEvent("generate_lead");
        },
        function (error) {
          setSubmitting(false);
          showFields(false);
          pushFormEvent("form_error");
          if (
            error.status === 422 &&
            Object.keys(error.fieldErrors).length &&
            showServerValidationErrors(error.fieldErrors)
          ) {
            return;
          }

          errorMode = "delivery";
          var message = deliveryMessage(error);
          showFormError(message[0], message[1], true);
          if (submitButton) submitButton.textContent = "Повторить отправку";
          // Фокус ведём на кнопку повтора, а не в блок сообщения: сообщение и так
          // объявляется role="alert" независимо от фокуса, а следующее действие
          // человека — повторить отправку. С клавиатуры это снимает лишний таб.
          if (submitButton) {
            submitButton.focus();
          } else if (errorBox) {
            errorBox.focus();
          }
        }
      );
    });
  }

  function reopenForm(reset) {
    editingContacts = !reset;
    if (reset) {
      form.reset();
      acceptedSubmissionId = "";
      acceptedContacts = null;
    }
    pendingSubmissionId = "";
    pendingFingerprint = "";
    formInputs.forEach(function (input) {
      setFieldError(input, "");
    });
    if (submitButton) submitButton.textContent = submitButtonLabel;
    hideFormError();
    success.hidden = true;
    form.hidden = false;
    updateEmailSuggestion();
    showFields(true);
  }

  if (again && editContacts && form && success) {
    again.addEventListener("click", function () { reopenForm(true); });
    editContacts.addEventListener("click", function () { reopenForm(false); });
  }

})();

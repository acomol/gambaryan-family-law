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

  /* --- Карусель направлений --------------------------------------------- */

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".svc-tab"));
  var dots = Array.prototype.slice.call(document.querySelectorAll(".svc-dot"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".svc-card"));

  if (tabs.length && tabs.length === panels.length && dots.length === panels.length) {
    var active = 0;

    function setActive(index, moveFocus) {
      active = (index + panels.length) % panels.length;

      tabs.forEach(function (tab, i) {
        var on = i === active;
        tab.classList.toggle("is-active", on);
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.tabIndex = on ? 0 : -1;
      });

      dots.forEach(function (dot, i) {
        dot.setAttribute("aria-current", i === active ? "true" : "false");
      });

      panels.forEach(function (panel, i) {
        panel.hidden = i !== active;
      });

      if (moveFocus) tabs[active].focus();
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

    var tablist = document.querySelector(".svc-tabs");
    if (tablist) {
      tablist.addEventListener("keydown", function (event) {
        var handled = true;
        switch (event.key) {
          case "ArrowRight":
          case "ArrowDown":
            setActive(active + 1, true);
            break;
          case "ArrowLeft":
          case "ArrowUp":
            setActive(active - 1, true);
            break;
          case "Home":
            setActive(0, true);
            break;
          case "End":
            setActive(panels.length - 1, true);
            break;
          default:
            handled = false;
        }
        if (handled) event.preventDefault();
      });
    }

    var prev = document.querySelector('.svc-arrow[data-dir="prev"]');
    var next = document.querySelector('.svc-arrow[data-dir="next"]');
    if (prev) prev.addEventListener("click", function () { setActive(active - 1); });
    if (next) next.addEventListener("click", function () { setActive(active + 1); });

    setActive(0);
  }

  /* --- Форма обращения --------------------------------------------------- */

  var LEAD_CONTRACT = window.GAMBARIAN_LEAD_CONTRACT;
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
  var errorBox = document.querySelector(".lead-form__error");
  var errorTitle = errorBox && errorBox.querySelector(".lead-form__error-title");
  var errorText = errorBox && errorBox.querySelector(".lead-form__error-text");
  var errorContact = errorBox && errorBox.querySelector(".lead-form__error-contact");
  var submitButton = form && form.querySelector('.lead-form__submit');
  var formInputs = form ? Array.from(form.querySelectorAll("input[name]")) : [];
  var submitButtonLabel = submitButton ? submitButton.textContent : "";
  var validation = LEAD_CONTRACT.validation;
  var attribution = readFirstTouchAttribution();
  var pendingSubmissionId = "";
  var pendingFingerprint = "";
  var submitting = false;
  var errorMode = "";
  var invalidBatchScheduled = false;

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
  }

  if (form && success) {
    success.hidden = true;

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
        showValidationErrors(invalidInputs);
        return;
      }

      var data = {
        name: form.elements.name.value.trim(),
        phone: form.elements.phone.value.trim(),
      };
      Object.assign(data, attribution, {
        landing_path: window.location.pathname,
      });

      var fingerprint = JSON.stringify(data);
      if (!pendingSubmissionId || fingerprint !== pendingFingerprint) {
        pendingSubmissionId = createSubmissionId();
        pendingFingerprint = fingerprint;
      }
      data.submission_id = pendingSubmissionId;

      hideFormError();
      setSubmitting(true);

      submitLead(data).then(
        function () {
          setSubmitting(false);
          form.hidden = true;
          success.hidden = false;
          pushFormEvent("generate_lead");
          // Фокус на заголовок результата — иначе после отправки фокус
          // остаётся на скрытой кнопке и скринридер не сообщает об успехе.
          var title = success.querySelector(".form-success__title");
          if (title) {
            title.setAttribute("tabindex", "-1");
            title.focus();
          }
        },
        function (error) {
          setSubmitting(false);
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
          if (errorBox) {
            errorBox.focus();
          }
        }
      );
    });
  }

  if (again && form && success) {
    again.addEventListener("click", function () {
      form.reset();
      pendingSubmissionId = "";
      pendingFingerprint = "";
      formInputs.forEach(function (input) {
        setFieldError(input, "");
      });
      if (submitButton) submitButton.textContent = submitButtonLabel;
      hideFormError();
      success.hidden = true;
      form.hidden = false;
      var first = form.querySelector("input");
      if (first) first.focus();
    });
  }

  /* --- Раскрывающиеся карточки фактов (только мобильный) ----------------- */
  // Прогрессивное раскрытие (progressive disclosure): на <=720px абзац
  // карточки обрезан двумя строками с многоточием, остальное — по тапу.
  //
  // Управляющий элемент — настоящая <button> с aria-expanded и
  // aria-controls на абзац. Роль кнопки на всей карточке (как было раньше)
  // ошибочна: скринридер зачитывал бы весь текст карточки как имя кнопки,
  // а вложенный интерактив внутри такой «кнопки» недоступен. Кнопка
  // создаётся скриптом — без JS раскрывать нечем, и рисовать её незачем.
  //
  // Имя кнопки собирается из подзаголовка самой карточки: новых текстов
  // на страницу не добавляется.

  var factCards = document.querySelectorAll(".fact-card");
  var factsMq = window.matchMedia("(max-width: 860px)");

  function buildToggle(card, index) {
    var text = card.querySelector("p");
    if (!text) return null;

    if (!text.id) text.id = "fact-text-" + (index + 1);

    var label = card.querySelector(".fact-card__sub");
    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "fact-card__toggle";
    toggle.setAttribute("aria-controls", text.id);
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute(
      "aria-label",
      "Показать полностью" + (label ? ": " + label.textContent.trim() : "")
    );
    toggle.innerHTML = '<span class="fact-card__chevron" aria-hidden="true"></span>';
    card.appendChild(toggle);
    return toggle;
  }

  function setExpanded(card, open) {
    var toggle = card.querySelector(".fact-card__toggle");
    card.classList.toggle("is-open", open);
    if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  if (factCards.length) {
    factCards.forEach(function (card, index) {
      var toggle = buildToggle(card, index);
      if (!toggle) return;

      // Карточка целиком остаётся тап-целью: на мобильном это удобнее,
      // чем целиться в шеврон. Клик по самой кнопке не должен сработать
      // дважды, поэтому всплытие останавливается.
      toggle.addEventListener("click", function (event) {
        event.stopPropagation();
        setExpanded(card, !card.classList.contains("is-open"));
      });

      card.addEventListener("click", function () {
        if (!factsMq.matches) return;
        setExpanded(card, !card.classList.contains("is-open"));
      });
    });

    // На десктоп текст виден целиком — раскрывать нечего, кнопка убирается
    // из потока фокуса, чтобы не быть пустой остановкой при табуляции.
    function syncMode() {
      factCards.forEach(function (card) {
        var toggle = card.querySelector(".fact-card__toggle");
        if (!toggle) return;
        if (factsMq.matches) {
          toggle.removeAttribute("hidden");
        } else {
          toggle.setAttribute("hidden", "");
          setExpanded(card, false);
        }
      });
    }
    syncMode();
    factsMq.addEventListener("change", syncMode);
  }
})();

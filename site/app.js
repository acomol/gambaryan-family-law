/* ==========================================================================
   Гамбарян & Партнёры — интерактив короткой версии лендинга
   Реализация по docs/SPEC-LANDING-V01.md (раздел «Поведение»).
   Прогрессивное улучшение: без JS видны все 8 направлений и рабочая форма.
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

  /**
   * Единственная точка интеграции отправки заявки.
   *
   * Сейчас заявка никуда не уходит — показывается состояние «Заявка получена»,
   * как в макете. Чтобы подключить приём заявок, замените тело функции:
   *
   *   Netlify Forms — добавьте в <form> атрибуты data-netlify="true" и
   *   name="lead", после чего верните fetch("/", { method: "POST",
   *   headers: { "Content-Type": "application/x-www-form-urlencoded" },
   *   body: new URLSearchParams(data) });
   *
   *   Свой бэкенд / webhook (Make, n8n, CRM) — верните
   *   fetch(ENDPOINT, { method: "POST",
   *   headers: { "Content-Type": "application/json" },
   *   body: JSON.stringify(data) });
   *
   * Функция должна вернуть Promise: reject показывает сообщение об ошибке и
   * оставляет введённые данные на месте.
   */
  function submitLead(data) {
    void data;
    return Promise.resolve();
  }

  var form = document.querySelector(".lead-form");
  var success = document.querySelector(".form-success");
  var again = document.querySelector(".form-success__again");
  var errorBox = document.querySelector(".lead-form__error");

  if (form && success) {
    success.hidden = true;

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var data = {};
      new FormData(form).forEach(function (value, key) {
        data[key] = value;
      });

      if (errorBox) errorBox.hidden = true;

      submitLead(data).then(
        function () {
          form.hidden = true;
          success.hidden = false;
          // Фокус на заголовок результата — иначе после отправки фокус
          // остаётся на скрытой кнопке и скринридер не сообщает об успехе.
          var title = success.querySelector(".form-success__title");
          if (title) {
            title.setAttribute("tabindex", "-1");
            title.focus();
          }
        },
        function () {
          if (errorBox) {
            errorBox.hidden = false;
          } else {
            window.alert(
              "Не удалось отправить заявку. Позвоните: 054-549-0623 или напишите в WhatsApp."
            );
          }
        }
      );
    });
  }

  if (again && form && success) {
    again.addEventListener("click", function () {
      form.reset();
      success.hidden = true;
      form.hidden = false;
      var first = form.querySelector("input");
      if (first) first.focus();
    });
  }
})();

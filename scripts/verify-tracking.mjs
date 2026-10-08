import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const FORM_ID = "family_law_contact";
const DESIGN = "final-dev5";
const SERVICES = ["развод", "алименты", "раздел-имущества", "дети", "отцовство", "медиация", "брачный-договор", "защита-при-угрозах"];
const SECTIONS = { hero: "#top", facts: ".facts", services: "#services", precedent: "#precedent", attorneys: "#attorney", contact: "#contact", footer: ".site-footer" };
const PASSIVE = ["section_view", "scroll_depth", "time_on_page"];
const PII = ["Трекинг Проверка", "+972 50 123 4567", "972501234567", "tracking-probe@example.com", "corrected-probe@example.com", "Bot Company", "tracking-probe@gmail.con", "tracking-probe@gmail.com"];
// Параметры из §4 TRACKING-REQUIREMENTS; все события имеют плоскую структуру.
const EVENT_KEYS = {
  generate_lead: ["form_id", "submission_id", "seconds_to_lead"],
  lead_corrected: ["submission_id", "corrects_submission_id"],
  form_error: ["form_id", "error_type", "http_status"],
  form_start: ["form_id"],
  form_confirm: ["form_id"],
  form_correct: ["form_id"],
  contact_click: ["method", "placement", "business_state"],
  form_anchor_click: ["placement", "service", "attorney"],
  nav_click: ["target", "placement"],
  service_select: ["service", "via"],
  section_view: ["section"],
  scroll_depth: ["percent"],
  time_on_page: ["seconds"],
};
const event = (name, params = {}) => ({ event: name, design_version: DESIGN, ...params });
const formEvent = (name, params = {}) => event(name, { form_id: FORM_ID, ...params });
// track() (site/app.js) явно обнуляет каждый неиспользуемый параметр словаря на КАЖДОМ
// push (undefined), чтобы GTM Data Layer Variable не унаследовала значение из более
// раннего push — GTM читает объединённую модель dataLayer, не только последний push
// (developers.google.com/tag-platform/tag-manager/datalayer; подтверждено живьём:
// Playwright сохраняет ключ со значением undefined через page.evaluate, в отличие от
// JSON.stringify). rawEvents — как реально лежит в window.dataLayer (с undefined-ключами,
// нужно для проверки утечки между событиями); events — то же самое без undefined-ключей,
// для сравнения с ожидаемым набором параметров конкретного push.
const stripUndefined = item => Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined));
const rawEvents = page => page.evaluate(() => window.dataLayer || []);
const events = async page => (await rawEvents(page)).map(stripUndefined);
const named = async (page, name) => (await events(page)).filter(item => item.event === name);
// Значение ключа, которое реально прочитает GTM DLV на месте push с индексом uptoIndex:
// последний (самый близкий назад) push, где ключ присутствует как own-свойство, включая
// явный undefined — именно он и означает «сброшено», а не «не установлено никогда».
const resolveKey = (layer, uptoIndex, key) => {
  for (let i = uptoIndex; i >= 0; i -= 1) {
    if (Object.hasOwn(layer[i], key)) return layer[i][key];
  }
  return undefined;
};

async function checkPrivacy(page) {
  const layer = await events(page);
  const digits = JSON.stringify(layer).replace(/\D/g, "");
  for (const phone of ["972501234567", "0501234567"]) {
    assert.ok(!digits.includes(phone), `PII: телефон в dataLayer: ${phone}`);
  }
  const inspect = value => {
    if (value && typeof value === "object") {
      for (const [key, nested] of Object.entries(value)) {
        assert.ok(!["name", "phone", "email", "company", "lf_hp", "source", "medium", "campaign"].includes(key.toLowerCase()), `Запрещённый параметр ${key}`);
        inspect(nested);
      }
    } else if (typeof value === "string") {
      for (const pii of PII) {
        assert.ok(!value.toLowerCase().includes(pii.toLowerCase()), `PII в dataLayer: ${pii}`);
      }
    }
  };
  inspect(layer);
  for (const item of layer) {
    assert.equal(item.design_version, DESIGN, JSON.stringify(item));
    assert.ok(Object.hasOwn(EVENT_KEYS, item.event), `Неизвестное событие ${item.event}`);
    const allowed = ["event", "design_version", ...EVENT_KEYS[item.event]];
    for (const [key, value] of Object.entries(item)) {
      assert.ok(allowed.includes(key), `Неизвестный параметр ${item.event}.${key}`);
      assert.ok(["string", "number"].includes(typeof value), `Неплоский параметр ${item.event}.${key}`);
    }
  }
}

// Проверяется прирост всех событий действия: лишнее событие тоже роняет тест.
async function action(page, run, expected, label) {
  const start = (await events(page)).length;
  await run();
  const actual = (await events(page)).slice(start).filter(item => !PASSIVE.includes(item.event));
  assert.deepEqual(actual, expected ? [expected] : [], label);
}

async function fill(page, email = PII[3]) {
  await page.locator("#lead-name").fill(PII[0]);
  await page.locator("#lead-phone").fill(PII[1]);
  await page.locator("#lead-email").fill(email);
}

async function setup(page, baseUrl) {
  await page.goto(baseUrl);
  await page.evaluate(() => document.fonts.ready);
  // Write-ahead outbox (site/app.js) persists in localStorage across
  // navigations on the same origin/context. This test intentionally leaves
  // failed-delivery entries behind (e.g. the 503/network/500 cases below) to
  // assert on the UI's error state, not to exercise the outbox's own retry —
  // clear it on every fresh setup() so a leftover entry's on-load/interval
  // flush can never send an unexpected extra /api/lead POST or generate_lead
  // into a later chapter's dataLayer snapshot (see scripts/verify-lead-form.mjs
  // for the same fix, and docs/LEAD-PIPELINE.md for the outbox contract).
  await page.evaluate(() => {
    try { localStorage.removeItem("gambarian_lead_outbox_v1"); } catch (e) {}
  });
  // Звонки, WhatsApp и карта не покидают локальную страницу.
  await page.evaluate(() => document.addEventListener("click", e => {
    const link = e.target.closest("a");
    if (link && /^(tel:|https?:)/.test(link.getAttribute("href"))) e.preventDefault();
  }, true));
}

export async function verifyTracking(page, baseUrl) {
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname));
  page.setDefaultTimeout(7000);
  const errors = [];
  const requests = [];
  let status = 202;
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/lead", async route => {
    assert.equal(route.request().method(), "POST");
    const payload = route.request().postDataJSON();
    requests.push(payload);
    if (status === "network") return route.abort("failed");
    await route.fulfill({ status, json: status === 202
      ? { ok: true, status: "accepted", submission_id: payload.submission_id }
      : { ok: false, error: "test_failure", ...(status === 422 ? { field_errors: { email: "invalid_format" } } : {}) } });
  });
  await page.clock.setFixedTime(new Date("2026-09-22T08:00:00Z"));
  const firstTouchUrl = new URL(baseUrl);
  firstTouchUrl.searchParams.set("utm_source", "qa-first-touch");
  firstTouchUrl.searchParams.set("gclid", "qa-click-id");
  await setup(page, firstTouchUrl.href);
  const width = page.viewportSize().width;
  const click = async (selector, expected, label = selector) => {
    await action(page, () => page.locator(selector).click(), expected, label);
  };
  const business = async state => {
    if (await page.locator(".mobile-bar").getAttribute("data-business-state") !== state) {
      await page.locator(".mobile-bar-demo").evaluate(button => button.click());
    }
    assert.equal(await page.locator(".mobile-bar").getAttribute("data-business-state"), state);
    await page.waitForFunction(state => document.querySelector('.hero__call').getAttribute('href').startsWith(state === 'open' ? 'tel:' : 'https://wa.me/'), state);
  };
  const contact = (method, placement, state = "open") => event("contact_click", { method, placement, business_state: state });
  const select = (index, via) => event("service_select", { service: SERVICES[index], via });

  assert.equal((await named(page, "service_select")).length, 0, "Начальная тема не выбор");
  await click("header .logo", event("nav_click", { target: "top", placement: "header" }));
  for (const target of ["services", "precedent", "attorney", "contact"]) {
    if (width > 960) {
      await click(`header nav a[href="#${target}"]`, event("nav_click", { target, placement: "header" }));
    } else {
      await page.evaluate(() => window.scrollTo(0, 0));
      await click(".nav-burger", null, "Открытие меню не отслеживается");
      await click(`.nav-drawer a[href="#${target}"]`, event("nav_click", { target, placement: "menu" }));
    }
  }
  if (width <= 960) {
    for (const state of ["open", "closed"]) {
      await business(state);
      await page.evaluate(() => window.scrollTo(0, 0));
      await click(".nav-burger", null);
      await click(".nav-drawer__call", contact(state === "open" ? "phone" : "whatsapp", "menu", state));
    }
  }
  await business("open");
  await click("#top .map-link", contact("google_maps", "hero"));
  await click('#top a[href="#contact"]', event("form_anchor_click", { placement: "hero" }));

  for (const state of ["open", "closed"]) {
    await business(state);
    const method = state === "open" ? "phone" : "whatsapp";
    await click("#top .hero__call", contact(method, "hero", state));
    await click('#contact a[data-business-closed="whatsapp"]', contact(method, "contacts", state));
    if (state === "open") {
      await click('#contact a[data-business-variant="open"]', contact("whatsapp", "contacts"));
    } else {
      await click('#contact a[data-business-variant="closed"]', event("form_anchor_click", { placement: "contacts" }));
    }
  }
  await business("open");
  await click("#contact .map-link", contact("google_maps", "contacts"));
  await click('#precedent a[href="#contact"]', event("form_anchor_click", { placement: "precedent" }));
  await click('#precedent a[href*="wa.me"]', contact("whatsapp", "precedent"));
  for (const attorney of ["alexander", "yulia"]) {
    await click(`[data-owner-copy-id="${attorney}-card-v3"] a[href="#contact"]`, event("form_anchor_click", { placement: "attorneys", attorney }));
  }

  for (const [via, selector] of [["tab", ".svc-tab"], ["dot", ".svc-dot"], ["footer", "footer [data-svc-target]"]]) {
    for (let n = 1; n <= 8; n++) {
      const index = n % 8;
      await action(page, () => page.locator(selector).nth(index).click(), select(index, via), `${via}: ${SERVICES[index]}`);
      if (via === "tab") {
        await click('.svc-card__cta', event("form_anchor_click", { placement: "services", service: SERVICES[index] }));
      }
    }
    await action(page, () => page.locator(selector).nth(0).click(), null, `${via}: повтор темы не событие`);
  }
  for (const [direction, index] of [["prev", 7], ["next", 0]]) {
    const arrow = page.locator(`.svc-arrow[data-dir="${direction}"]`);
    // На телефоне стрелки скрыты дизайном: проверяется только обработчик.
    await action(page, () => width <= 960 ? arrow.dispatchEvent("click") : arrow.click(), select(index, "arrow"));
  }
  // Реальные touch-жесты Chromium: pointer-события возникают из касания.
  if (width <= 960) {
    const cdp = await page.context().newCDPSession(page);
    try {
      await page.locator(".svc-stage").scrollIntoViewIfNeeded();
      const rect = await page.locator(".svc-stage").boundingBox();
      const x = rect.x + rect.width * 0.8;
      const y = Math.max(90, rect.y + 40);
      const swipe = async dx => {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + dx / 2, y }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + dx, y }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      };
      await action(page, () => swipe(-120), select(1, "swipe"), "Свайп пальцем");
      await action(page, () => swipe(-20), null, "Короткий жест не меняет тему");
    } finally { await cdp.detach(); }
  }
  await click('footer a[href="#precedent"]', event("nav_click", { target: "precedent", placement: "footer" }));
  await click("footer .map-link", contact("google_maps", "footer"));

  if (width <= 960) {
    for (const state of ["open", "closed"]) {
      await business(state);
      for (const method of state === "open" ? ["phone", "whatsapp", "form_anchor"] : ["whatsapp", "form_anchor"]) {
        await page.locator("#precedent").scrollIntoViewIfNeeded();
        await page.waitForFunction(() => !document.querySelector(".mobile-bar").inert);
        await click(`.mobile-bar [data-method="${method}"]`, contact(method, "action_bar", state));
      }
    }
  }
  await business("open");
  for (const [section, selector] of Object.entries(SECTIONS)) {
    await page.locator(selector).evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.waitForFunction(section => window.dataLayer.some(e => e.event === "section_view" && e.section === section), section);
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForFunction(() => window.dataLayer.filter(e => e.event === "scroll_depth").length === 4);
  for (const selector of Object.values(SECTIONS)) {
    await page.locator(selector).evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
  }
  assert.deepEqual((await named(page, "section_view")).map(e => e.section).sort(), Object.keys(SECTIONS).sort());
  assert.deepEqual((await named(page, "scroll_depth")).map(e => e.percent), [25, 50, 75, 90]);

  const review = () => page.locator(".lead-form__submit").click();
  const send = () => page.locator(".lead-form__confirm-submit").click();
  const success = () => page.locator(".form-success").waitFor({ state: "visible" });
  await action(page, review, formEvent("form_error", { error_type: "validation", http_status: 0 }), "Ошибки полей");
  assert.equal(requests.length, 0);
  await action(page, () => fill(page), formEvent("form_start"), "Первый ввод один раз");
  await page.locator("#lead-email").fill(PII[6]);
  await click(".field__email-suggestion", null, "Подсказка e-mail не отслеживается");
  assert.equal(await page.locator("#lead-email").inputValue(), PII[7]);
  await page.locator("#lead-email").fill(PII[3]);
  await action(page, review, formEvent("form_confirm"), "Проверка контактов");
  await click(".lead-form__edit", formEvent("form_correct"));
  await action(page, review, formEvent("form_confirm"));
  await send(); await success();
  const first = requests.at(-1).submission_id;
  assert.equal(requests.at(-1).utm_source, "qa-first-touch");
  assert.equal(requests.at(-1).gclid, "qa-click-id");
  let leads = await named(page, "generate_lead");
  assert.equal(leads.length, 1);
  assert.deepEqual(leads[0], formEvent("generate_lead", { submission_id: first, seconds_to_lead: leads[0].seconds_to_lead }));
  assert.ok(Number.isInteger(leads[0].seconds_to_lead) && leads[0].seconds_to_lead >= 0);
  await click(".form-success__edit", null);
  await action(page, review, null, "Без изменений: успех без POST и события");
  await success();
  assert.equal(requests.length, 1);
  await click(".form-success__edit", null);
  await page.locator("#lead-email").fill(PII[4]);
  await action(page, review, formEvent("form_confirm"));
  await send(); await success();
  assert.deepEqual(await named(page, "lead_corrected"), [event("lead_corrected", { submission_id: requests.at(-1).submission_id, corrects_submission_id: first })]);
  assert.equal((await named(page, "generate_lead")).length, 1, "Исправление контактов не создаёт лишний generate_lead");
  assert.notEqual(requests.at(-1).submission_id, first);
  const secondId = requests.at(-1).submission_id;

  // "Отправить ещё одну заявку" убрали 2026-09-24 (дублировала лиды и
  // конверсии Ads). Закрыть/"Продолжить на сайте" сворачивают карточку без
  // событий в dataLayer; вернуться можно только через "Изменить контакты" —
  // тот же reopenForm(), что и у открытой карточки, поэтому это по-прежнему
  // правка, а не новый лид.
  await click(".form-success__close", null);
  assert.equal(await page.locator(".form-success__body").isVisible(), false);
  assert.equal(await page.locator(".lead-form").isVisible(), false, "Пустая форма не должна появляться снова");
  assert.equal(await page.locator(".form-success__collapsed").isVisible(), true);
  assert.equal(await page.evaluate(() => document.activeElement.className), "form-success__collapsed", "Фокус уходит на строку-подтверждение");
  await click(".form-success__collapsed-edit", null);
  assert.equal(await page.locator("#lead-name").inputValue(), PII[0], "Свёрнутая правка не даёт пустую форму");
  await page.locator("#lead-email").fill(PII[7]);
  await action(page, review, formEvent("form_confirm"));
  await send(); await success();
  assert.deepEqual(await named(page, "lead_corrected"), [
    event("lead_corrected", { submission_id: secondId, corrects_submission_id: first }),
    event("lead_corrected", { submission_id: requests.at(-1).submission_id, corrects_submission_id: secondId }),
  ]);
  assert.equal((await named(page, "generate_lead")).length, 1, "Закрыть + «Изменить контакты» не создаёт лишний generate_lead");
  assert.notEqual(requests.at(-1).submission_id, secondId);

  // "Продолжить на сайте" — вторая, более заметная кнопка того же закрытия
  // (спека задачи: «×» в углу плюс текстовая кнопка) — тем же путём.
  await click(".form-success__continue", null);
  assert.equal(await page.locator(".form-success__body").isVisible(), false);
  assert.equal(await page.locator(".form-success__collapsed").isVisible(), true);

  await click(".form-success__collapsed-edit", null);
  await action(page, () => fill(page), null, "form_start не повторяется");
  for (const [responseStatus, errorType] of [[503, "unavailable"], ["network", "network"], [500, "server"], [422, "validation"]]) {
    status = responseStatus;
    await action(page, review, formEvent("form_confirm"));
    const before = (await events(page)).length;
    await send();
    await page.locator(".lead-form__error").waitFor({ state: "visible" });
    assert.deepEqual((await events(page)).slice(before).filter(e => !PASSIVE.includes(e.event)), [formEvent("form_error", { error_type: errorType, http_status: status === "network" ? 0 : status })]);
    if (status === 503) {
      await click('.lead-form__error a[href^="tel:"]', contact("phone", "form_error"));
      await click('.lead-form__error [data-business-variant="open"] a[href*="wa.me"]', contact("whatsapp", "form_error"));
      await business("closed");
      await click('.lead-form__error [data-business-variant="closed"] a[href*="wa.me"]', contact("whatsapp", "form_error", "closed"));
      await business("open");
    }
  }
  // Единственный generate_lead за весь блок: и "Изменить контакты" (открытая
  // карточка, свёрнутая строка), и цикл ошибок ниже — всё та же правка,
  // "Отправить ещё одну заявку" (единственный источник второго лида) убрана.
  assert.equal((await named(page, "generate_lead")).length, 1);
  await checkPrivacy(page);

  // Новая неизменённая заявка после ошибки: тот же ID и одна конверсия.
  for (const responseStatus of ["network", 503]) {
    await setup(page, baseUrl);
    const requestStart = requests.length;
    status = responseStatus;
    await fill(page);
    await review(); await send();
    await page.locator(".lead-form__error").waitFor({ state: "visible" });
    assert.equal(requests.length - requestStart, 1);
    assert.equal((await named(page, "generate_lead")).length, 0);
    const failed = requests.at(-1);
    assert.equal(failed.corrects_submission_id, undefined, "Повторяется новая заявка");
    status = 202;
    await review(); await send(); await success();
    assert.equal(requests.length - requestStart, 2, `${responseStatus} → 202: ровно два POST`);
    assert.equal(requests.at(-1).submission_id, failed.submission_id, "Повтор сохраняет submission_id");
    assert.deepEqual(requests.at(-1), failed, "Повтор отправляет неизменённую заявку");
    const retryLeads = await named(page, "generate_lead");
    assert.equal(retryLeads.length, 1, `${responseStatus} → 202: ровно один generate_lead`);
    assert.equal(retryLeads[0].submission_id, failed.submission_id);
    assert.equal((await named(page, "lead_corrected")).length, 0);
    await checkPrivacy(page);
    console.log(`${width}: PASS retry ${responseStatus} → 202; POST=2; same submission_id; generate_lead=1`);
  }

  // Отдельный просмотр: ловушка показывает успех, событий заявок нет.
  const returningUrl = new URL(baseUrl);
  returningUrl.searchParams.set("utm_source", "qa-later-touch");
  returningUrl.searchParams.set("gclid", "qa-later-click");
  await setup(page, returningUrl.href);
  status = 202;
  await fill(page);
  await page.locator('[name="lf_hp"]').evaluate((input, value) => { input.value = value; }, PII[5]);
  await review(); await send(); await success();
  assert.equal(requests.at(-1).lf_hp, PII[5]);
  assert.equal(requests.at(-1).utm_source, "qa-first-touch", "First touch сохраняется при повторном входе");
  assert.equal(requests.at(-1).gclid, "qa-click-id");
  assert.equal((await named(page, "generate_lead")).length, 0, "Ловушка не создаёт generate_lead");
  assert.equal((await named(page, "lead_corrected")).length, 0);
  await checkPrivacy(page);
  assert.deepEqual(errors, []);
  return { viewport: `${width}x${page.viewportSize().height}`, status: "PASS", sections: 7, scroll: [25, 50, 75, 90], mockedRequests: requests.length, swipe: width <= 960 ? "PASS touch" : "N/A desktop", pageErrors: errors.length };
}

async function verifyVisibleTime(page, baseUrl) {
  const start = new Date("2026-09-22T08:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await setup(page, baseUrl);
  const visibility = async state => page.evaluate(state => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
    document.dispatchEvent(new Event("visibilitychange"));
  }, state);
  await page.clock.runFor(29_000);
  assert.deepEqual(await named(page, "time_on_page"), []);
  await visibility("hidden");
  await page.clock.runFor(180_000);
  assert.deepEqual(await named(page, "time_on_page"), [], "Фон не считается");
  await visibility("visible");
  await page.clock.runFor(1_000);
  assert.deepEqual(await named(page, "time_on_page"), [event("time_on_page", { seconds: 30 })]);
  await page.clock.runFor(150_000);
  await visibility("hidden");
  await page.clock.runFor(180_000);
  await visibility("visible");
  await page.clock.runFor(10_000);
  assert.deepEqual(await named(page, "time_on_page"), [30, 60, 120, 180].map(seconds => event("time_on_page", { seconds })));
  await page.route("**/api/lead", route => route.fulfill({ status: 202, json: { ok: true, submission_id: route.request().postDataJSON().submission_id } }));
  await fill(page);
  // При остановленных часах действие не ждёт кадров анимации.
  await page.locator(".lead-form__submit").dispatchEvent("click");
  await page.locator(".lead-form__confirm-submit").dispatchEvent("click");
  await page.locator(".form-success").waitFor({ state: "visible" });
  assert.equal((await named(page, "generate_lead"))[0].seconds_to_lead, 190, "Время до заявки исключает оба периода фона");
  await checkPrivacy(page);
  return "PASS visible 30/60/120/180; hidden excluded; seconds_to_lead=190";
}

// GTM Data Layer Variable читает объединённую модель, не только последний push (см.
// комментарий у resolveKey). Живая последовательность из ревью: смена темы услуги (пишет
// service) → CTA карточки адвоката (пишет attorney) → CTA героя (ни service, ни attorney
// не актуальны). Без явного сброса Hero-событие унаследовало бы оба стухших значения.
async function verifyNoStaleParams(page, baseUrl) {
  await setup(page, baseUrl);
  const activeTab = await page.evaluate(() => {
    var tabs = document.querySelectorAll(".svc-tab");
    for (var i = 0; i < tabs.length; i += 1) {
      if (tabs[i].getAttribute("aria-selected") === "true") return i;
    }
    return 0;
  });
  const otherTab = (activeTab + 1) % 8;
  await page.locator(".svc-tab").nth(otherTab).click();
  await page.locator('[data-owner-copy-id="alexander-card-v3"] a[href="#contact"]').click();
  await page.locator('#top a[href="#contact"]').click();

  const layer = await rawEvents(page);
  let heroIndex = -1;
  for (let i = layer.length - 1; i >= 0; i -= 1) {
    if (layer[i].event === "form_anchor_click" && layer[i].placement === "hero") { heroIndex = i; break; }
  }
  assert.ok(heroIndex >= 0, "form_anchor_click(hero) не найден в dataLayer");
  assert.equal(resolveKey(layer, heroIndex, "service"), undefined,
    "form_anchor_click(hero) унаследовал service из более раннего service_select");
  assert.equal(resolveKey(layer, heroIndex, "attorney"), undefined,
    "form_anchor_click(hero) унаследовал attorney из более раннего CTA карточки адвоката");
  return "PASS no stale service/attorney on form_anchor_click(hero) after service_select + attorney CTA";
}

// Прямые ссылки на тему (#svc-*): якорь переключает вкладку и держит блок услуг
// в кадре — при загрузке и при смене hash без перезагрузки (владелец, 2026-09-23).
// Обычный #services тему не меняет. Заодно проверяются контактные номера:
// WhatsApp и звонок с этой даты разведены (docs/CONTACT-LINKS-SPEC.md v1.2.0).
const ANCHOR_SERVICES = ["svc-divorce", "svc-alimony", "svc-property", "svc-children", "svc-paternity", "svc-mediation", "svc-prenup", "svc-protection"];
const WHATSAPP_NUMBER = "972587803188";
const PHONE_NUMBER = "972545490623";

async function activeTabState(page) {
  return page.evaluate(() => {
    var tabs = Array.prototype.slice.call(document.querySelectorAll(".svc-tab"));
    var active = tabs.findIndex(function (tab) { return tab.getAttribute("aria-selected") === "true"; });
    var panels = document.querySelectorAll(".svc-card");
    var rect = document.getElementById("services").getBoundingClientRect();
    return {
      active: active,
      panelHidden: panels[active] ? panels[active].hidden : null,
      focusedIsActiveTab: document.activeElement === tabs[active],
      inView: rect.top < window.innerHeight && rect.bottom > 0,
    };
  });
}

async function waitTabInView(page, index) {
  await page.waitForFunction(function (i) {
    var tab = document.querySelectorAll(".svc-tab")[i];
    if (!tab || tab.getAttribute("aria-selected") !== "true") return false;
    var rect = document.getElementById("services").getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }, index);
}

export async function verifyAnchorTabs(page, baseUrl) {
  page.setDefaultTimeout(7000);
  const base = new URL(baseUrl);

  // Контактные номера разведены: WhatsApp — стажёр, звонок — Александр.
  await setup(page, base.href);
  const numbers = await page.evaluate(() => ({
    wa: Array.from(document.querySelectorAll('a[href*="wa.me/"]')).map(a => a.getAttribute("href")),
    tel: Array.from(document.querySelectorAll('a[href^="tel:"]')).map(a => a.getAttribute("href")),
  }));
  assert.ok(numbers.wa.length > 0, "на странице нет ни одной ссылки wa.me");
  assert.ok(numbers.tel.length > 0, "на странице нет ни одной ссылки tel:");
  numbers.wa.forEach(href => assert.equal(href, `https://wa.me/${WHATSAPP_NUMBER}`, `WhatsApp: ${href}`));
  numbers.tel.forEach(href => assert.equal(href, `tel:+${PHONE_NUMBER}`, `tel: ${href}`));

  // Каждый из 8 якорей при загрузке (со сторонним query-параметром до #) открывает свою тему.
  // qa_i меняется на каждой итерации, иначе смена URL только якорем — навигация в том же
  // документе (hashchange), а не свежая загрузка, и dataLayer предыдущей темы не обнулится.
  for (let index = 0; index < ANCHOR_SERVICES.length; index += 1) {
    const url = new URL(base);
    url.searchParams.set("utm_source", "qa-anchor");
    url.searchParams.set("utm_campaign", "svc-deep-link");
    url.searchParams.set("qa_i", String(index));
    url.hash = ANCHOR_SERVICES[index];
    await setup(page, url.href);
    await waitTabInView(page, index);
    const state = await activeTabState(page);
    assert.equal(state.active, index, `#${ANCHOR_SERVICES[index]}: должна открыться тема ${index}`);
    assert.equal(state.panelHidden, false, `#${ANCHOR_SERVICES[index]}: панель темы скрыта`);
    assert.ok(state.focusedIsActiveTab, `#${ANCHOR_SERVICES[index]}: фокус не на активной вкладке`);
    const selects = await named(page, "service_select");
    if (index === 0) {
      assert.deepEqual(selects, [], "#svc-divorce уже активна по умолчанию — событие не нужно");
    } else {
      assert.deepEqual(selects, [event("service_select", { service: SERVICES[index], via: "anchor" })],
        `#${ANCHOR_SERVICES[index]}: ровно одно service_select via=anchor`);
    }
  }

  // hashchange без перезагрузки переключает тему и не даёт лишних событий.
  await setup(page, base.href);
  assert.equal((await named(page, "service_select")).length, 0);
  await page.evaluate(hash => { window.location.hash = hash; }, ANCHOR_SERVICES[4]);
  await waitTabInView(page, 4);
  assert.deepEqual(await named(page, "service_select"), [event("service_select", { service: SERVICES[4], via: "anchor" })],
    "hashchange: ровно одно service_select via=anchor");

  await page.evaluate(hash => { window.location.hash = hash; }, ANCHOR_SERVICES[6]);
  await waitTabInView(page, 6);
  const afterSecond = await named(page, "service_select");
  assert.equal(afterSecond.length, 2, "hashchange: вторая смена якоря должна дать ровно одно новое событие");
  assert.deepEqual(afterSecond[1], event("service_select", { service: SERVICES[6], via: "anchor" }));

  // Клик по уже активной (после anchor) вкладке не должен давать второе событие —
  // это и есть «без двойного события от hash + click».
  await page.locator(".svc-tab").nth(6).click();
  await page.waitForTimeout(50);
  assert.equal((await named(page, "service_select")).length, 2,
    "клик по вкладке, уже активированной якорем, не должен дублировать событие");

  // Обычный #services поведение не меняет: первая тема, без переключения.
  // qa_i=plain — гарантирует свежую загрузку (иначе смена только якоря после
  // предыдущего блока была бы hashchange в том же документе, см. комментарий выше).
  const plainServicesUrl = new URL(base);
  plainServicesUrl.searchParams.set("qa_i", "plain");
  plainServicesUrl.hash = "services";
  await setup(page, plainServicesUrl.href);
  const defaultState = await activeTabState(page);
  assert.equal(defaultState.active, 0, "#services должен оставлять первую тему");
  assert.equal((await named(page, "service_select")).length, 0, "#services не должен переключать тему");

  return `PASS anchors #svc-* x8 + hashchange + #services default; WhatsApp=${WHATSAPP_NUMBER}; tel=${PHONE_NUMBER}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { chromium } = await import("@playwright/test");
  const baseUrl = process.argv[2] || "http://127.0.0.1:8098/build/variants/final-dev5/";
  const browser = await chromium.launch();
  try {
    for (const [width, height] of [[360, 640], [390, 844], [1440, 900]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: width <= 960, reducedMotion: "reduce", timezoneId: "Asia/Jerusalem" });
      try {
        console.log(JSON.stringify(await verifyTracking(await context.newPage(), baseUrl)));
        console.log(`${width}x${height}: ${await verifyVisibleTime(await context.newPage(), baseUrl)}`);
        console.log(`${width}x${height}: ${await verifyNoStaleParams(await context.newPage(), baseUrl)}`);
        console.log(`${width}x${height}: ${await verifyAnchorTabs(await context.newPage(), baseUrl)}`);
      } finally { await context.close(); }
    }
    console.log("Tracking: map §3 / funnel / honeypot / PII / design_version PASS");
  } finally { await browser.close(); }
}

import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const FORM_ID = "family_law_contact";
const DESIGN = "final-dev5";
const SERVICES = ["развод", "алименты", "раздел-имущества", "дети", "отцовство", "медиация", "брачный-договор", "защита-при-угрозах"];
const SECTIONS = { hero: "#top", facts: ".facts", services: "#services", precedent: "#precedent", attorneys: "#attorney", contact: "#contact", footer: ".site-footer" };
const PASSIVE = ["section_view", "scroll_depth", "time_on_page"];
const PII = ["Трекинг Проверка", "+972 50 123 4567", "972501234567", "tracking-probe@example.com", "corrected-probe@example.com", "Bot Company", "tracking-probe@gmail.con", "tracking-probe@gmail.com"];
const event = (name, params = {}) => ({ event: name, design_version: DESIGN, ...params });
const formEvent = (name, params = {}) => event(name, { form_id: FORM_ID, ...params });
const events = page => page.evaluate(() => window.dataLayer || []);
const named = async (page, name) => (await events(page)).filter(item => item.event === name);

async function checkPrivacy(page) {
  const layer = await events(page);
  const serialized = JSON.stringify(layer);
  for (const value of PII) assert.ok(!serialized.includes(value), `PII в dataLayer: ${value}`);
  for (const item of layer) {
    assert.equal(item.design_version, DESIGN, JSON.stringify(item));
    for (const key of ["name", "phone", "email", "company", "source", "medium", "campaign"]) {
      assert.equal(Object.hasOwn(item, key), false, `Запрещённый параметр ${key}`);
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
  assert.equal((await named(page, "generate_lead")).length, 1);
  assert.notEqual(requests.at(-1).submission_id, first);
  await click(".form-success__again", null);
  assert.equal(await page.locator("#lead-name").inputValue(), "");
  await action(page, () => fill(page), null, "form_start один раз за просмотр");
  await action(page, review, formEvent("form_confirm"));
  await send(); await success();
  leads = await named(page, "generate_lead");
  assert.equal(leads.length, 2);
  assert.equal(leads[1].submission_id, requests.at(-1).submission_id);
  assert.notEqual(leads[1].submission_id, first);
  assert.equal(requests.at(-1).corrects_submission_id, undefined);

  await click(".form-success__again", null);
  await fill(page);
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
  assert.equal((await named(page, "generate_lead")).length, 2);
  await checkPrivacy(page);

  // Отдельный просмотр: ловушка показывает успех, событий заявок нет.
  const returningUrl = new URL(baseUrl);
  returningUrl.searchParams.set("utm_source", "qa-later-touch");
  returningUrl.searchParams.set("gclid", "qa-later-click");
  await setup(page, returningUrl.href);
  status = 202;
  await fill(page);
  await page.locator('[name="company"]').evaluate((input, value) => { input.value = value; }, PII[5]);
  await review(); await send(); await success();
  assert.equal(requests.at(-1).company, PII[5]);
  assert.equal(requests.at(-1).utm_source, "qa-first-touch", "First touch сохраняется при повторном входе");
  assert.equal(requests.at(-1).gclid, "qa-click-id");
  assert.equal((await named(page, "generate_lead")).length, 0);
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
      } finally { await context.close(); }
    }
    console.log("Tracking: map §3 / funnel / honeypot / PII / design_version PASS");
  } finally { await browser.close(); }
}

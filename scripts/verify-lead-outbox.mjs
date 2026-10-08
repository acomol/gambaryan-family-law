import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

/* Client write-ahead outbox QA — adapted from the ADFIX "never lose a lead"
   contract (knowledge/web-dev/ADFIX-SITE-SYSTEM-PLAYBOOK.md §1.6, L2/L6/L9;
   server-side port in functions/api/lead.js — see docs/LEAD-PIPELINE.md).
   Exercises the REAL site/app.js outbox (localStorage write-ahead + retry)
   against a simulated network failure, then a recovered endpoint. The retry
   is driven by a synthetic `online` event rather than a real 60-second wait,
   so the test stays fast and deterministic (the on-`online` and interval
   paths in site/app.js call the same flushOutbox()). Written in the style of
   scripts/verify-tracking.mjs / scripts/verify-lead-form.mjs. */

const OUTBOX_KEY = "gambarian_lead_outbox_v1";

export async function verifyLeadOutbox(page, baseUrl) {
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname));
  const requests = [];
  const errors = [];
  let networkDown = true;
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/lead", async route => {
    requests.push(route.request().postDataJSON());
    if (networkDown) return route.abort("failed");
    const submissionId = route.request().postDataJSON().submission_id;
    await route.fulfill({ status: 202, json: { ok: true, status: "accepted", submission_id: submissionId } });
  });

  await page.goto(baseUrl);
  await page.evaluate(() => document.fonts.ready);

  const readOutbox = () => page.evaluate(
    key => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch (e) { return []; } },
    OUTBOX_KEY,
  );
  const leadEvents = () => page.evaluate(
    () => (window.dataLayer || []).filter(item => item.event === "generate_lead"),
  );

  await page.locator("#lead-name").fill("Outbox Проверка");
  await page.locator("#lead-phone").fill("+972 50 999 0000");
  await page.locator("#lead-email").fill("outbox-qa@example.com");
  await page.locator(".lead-form__submit").click();       // показывает подтверждение, без сети
  await page.locator(".lead-form__confirm-submit").click(); // реальная отправка — сеть недоступна
  await page.locator(".lead-form__error").waitFor({ state: "visible" });

  assert.equal(requests.length, 1, "первая попытка должна дойти до /api/lead и провалиться по сети");
  let outbox = await readOutbox();
  assert.equal(outbox.length, 1, "провалившийся лид должен остаться в write-ahead outbox");
  const submissionId = outbox[0].submission_id;
  assert.equal(outbox[0].data.submission_id, submissionId);
  assert.equal((await leadEvents()).length, 0, "generate_lead не должен сработать до подтверждённой доставки");

  // Сеть восстановлена — имитируем событие `online` вместо реального ожидания 60 с.
  networkDown = false;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForFunction(
    key => { try { return JSON.parse(localStorage.getItem(key) || "[]").length === 0; } catch (e) { return false; } },
    OUTBOX_KEY,
    { timeout: 5000 },
  );

  assert.equal(requests.length, 2, "ретрай online-события должен повторно отправить тот же лид ровно один раз");
  assert.equal(requests[1].submission_id, submissionId, "ретрай отправляет тот же submission_id (сервер дедуплицирует по нему)");
  outbox = await readOutbox();
  assert.equal(outbox.length, 0, "доставленная запись должна быть убрана из outbox");
  let leads = await leadEvents();
  assert.equal(leads.length, 1, "generate_lead должен сработать ровно один раз после доставки");
  assert.equal(leads[0].submission_id, submissionId);

  // Повторное online-событие с пустым outbox не должно ничего слать заново
  // и не должно повторно отправлять generate_lead (персистентный Set id).
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForTimeout(200);
  assert.equal(requests.length, 2, "пустой outbox не должен порождать лишние POST");
  leads = await leadEvents();
  assert.equal(leads.length, 1, "generate_lead не должен сработать повторно для того же submission_id");

  assert.deepEqual(errors, []);
  return { status: "PASS", submissionId, requests: requests.length };
}

/* ============ Review 2026-09-23 (independent Codex review of bd8dc8e) —
   findings 6 and 8. See docs/LEAD-PIPELINE.md "Review 2026-09-23" table. */

// [finding 6, P1] Every outbox/sent-ID mutation must go through
// navigator.locks (cross-tab mutual exclusion), with a documented fallback
// when Web Locks is unavailable. A real two-tab race is inherently timing-
// dependent and would make this test flaky; instead this proves the FIX
// deterministically — that the code actually routes its mutations through
// the lock at all (the bug was that it never did) — by wrapping the real
// navigator.locks.request with a call counter before site/app.js runs.
export async function verifyLeadOutboxLocking(page, baseUrl) {
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname));
  await page.addInitScript(() => {
    window.__gambLockCalls = 0;
    if (window.navigator.locks && typeof window.navigator.locks.request === "function") {
      const realRequest = window.navigator.locks.request.bind(window.navigator.locks);
      window.navigator.locks.request = function (name, ...rest) {
        if (String(name).indexOf("gambarian_lead") === 0) window.__gambLockCalls += 1;
        return realRequest(name, ...rest);
      };
    }
  });

  let networkDown = true;
  await page.route("**/api/lead", async route => {
    if (networkDown) return route.abort("failed");
    const submissionId = route.request().postDataJSON().submission_id;
    await route.fulfill({ status: 202, json: { ok: true, status: "accepted", submission_id: submissionId } });
  });

  await page.goto(baseUrl);
  await page.evaluate(() => document.fonts.ready);
  const hasWebLocks = await page.evaluate(() => !!(window.navigator.locks && window.navigator.locks.request));
  assert.ok(hasWebLocks, "тестовая среда должна поддерживать navigator.locks (headless Chromium на 127.0.0.1)");

  await page.locator("#lead-name").fill("Lock Проверка");
  await page.locator("#lead-phone").fill("+972 50 111 2222");
  await page.locator("#lead-email").fill("lock-qa@example.com");
  await page.locator(".lead-form__submit").click();
  await page.locator(".lead-form__confirm-submit").click();
  await page.locator(".lead-form__error").waitFor({ state: "visible" });

  const callsAfterEnqueue = await page.evaluate(() => window.__gambLockCalls || 0);

  networkDown = false;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForFunction(
    key => { try { return JSON.parse(localStorage.getItem(key) || "[]").length === 0; } catch (e) { return false; } },
    OUTBOX_KEY,
    { timeout: 5000 },
  );

  const callsAfterDeliver = await page.evaluate(() => window.__gambLockCalls || 0);

  assert.ok(callsAfterEnqueue > 0, "write-ahead enqueue должен брать navigator.locks перед мутацией outbox");
  assert.ok(callsAfterDeliver > callsAfterEnqueue, "dequeue + fireLeadOnce на доставке тоже должны брать navigator.locks");
  return { status: "PASS", callsAfterEnqueue, callsAfterDeliver };
}

// [finding 8, P2] A retried CORRECTION (corrects_submission_id set) must fire
// lead_corrected on delivery, not generate_lead — the outbox retry path must
// share the same event-routing logic as the manual submit path. Injects the
// outbox entry directly (rather than driving the full "edit contacts" UI
// flow) to isolate exactly the retry-delivery code path under review.
export async function verifyLeadOutboxCorrection(page, baseUrl) {
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname));
  const requests = [];
  await page.route("**/api/lead", async route => {
    requests.push(route.request().postDataJSON());
    const submissionId = route.request().postDataJSON().submission_id;
    await route.fulfill({ status: 202, json: { ok: true, status: "accepted", submission_id: submissionId } });
  });

  await page.goto(baseUrl);
  await page.evaluate(() => document.fonts.ready);

  const priorId = "b1f6b1e0-19ba-49a5-8c49-6d32f8d91bca";
  const correctionId = "c2f6b1e0-19ba-49a5-8c49-6d32f8d91bcd";
  await page.evaluate(({ key, priorId, correctionId }) => {
    const entry = {
      submission_id: correctionId,
      data: {
        name: "Outbox Исправление", phone: "+972 50 333 4444", email: "outbox-correction@example.com",
        landing_path: "/", lf_hp: "", submission_id: correctionId, corrects_submission_id: priorId,
      },
      created_at: Date.now(), attempts: 0,
    };
    localStorage.setItem(key, JSON.stringify([entry]));
  }, { key: OUTBOX_KEY, priorId, correctionId });

  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForFunction(
    key => { try { return JSON.parse(localStorage.getItem(key) || "[]").length === 0; } catch (e) { return false; } },
    OUTBOX_KEY,
    { timeout: 5000 },
  );

  const corrections = await page.evaluate(() => (window.dataLayer || []).filter(item => item.event === "lead_corrected"));
  const leads = await page.evaluate(() => (window.dataLayer || []).filter(item => item.event === "generate_lead"));

  assert.equal(requests.length, 1, "ретрай должен переслать поставленную в очередь коррекцию ровно один раз");
  assert.equal(requests[0].corrects_submission_id, priorId);
  assert.equal(corrections.length, 1, "доставленная из outbox коррекция должна слать lead_corrected");
  assert.equal(corrections[0].corrects_submission_id, priorId);
  assert.equal(leads.length, 0, "доставленная из outbox коррекция НЕ должна слать generate_lead");
  return { status: "PASS" };
}

// [round-2 finding F, P2] Two "tabs" (two pages sharing localStorage/origin)
// both retrying the SAME queued correction must fire lead_corrected only
// ONCE for that submission_id — the outbox lock (finding 6) only protects
// the storage mutation itself, not how many delivery attempts independently
// succeed and each call their own success handler.
export async function verifyLeadCorrectionDedup(context, baseUrl) {
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname));
  const priorId = "d3f6b1e0-19ba-49a5-8c49-6d32f8d91bce";
  const correctionId = "e4f6b1e0-19ba-49a5-8c49-6d32f8d91bcf";
  const entry = {
    submission_id: correctionId,
    data: {
      name: "Дубль Коррекции", phone: "+972 50 555 6666", email: "dedup-correction@example.com",
      landing_path: "/", lf_hp: "", submission_id: correctionId, corrects_submission_id: priorId,
    },
    created_at: Date.now(), attempts: 0,
  };

  const pageA = await context.newPage();
  await pageA.route("**/api/lead", async route => {
    await route.fulfill({ status: 202, json: { ok: true, status: "accepted", submission_id: correctionId } });
  });
  await pageA.goto(baseUrl);
  await pageA.evaluate(() => document.fonts.ready);
  await pageA.evaluate(({ key, entry }) => localStorage.setItem(key, JSON.stringify([entry])), { key: OUTBOX_KEY, entry });

  const pageB = await context.newPage();
  await pageB.route("**/api/lead", async route => {
    await route.fulfill({ status: 202, json: { ok: true, status: "accepted", submission_id: correctionId } });
  });
  await pageB.goto(baseUrl);
  await pageB.evaluate(() => document.fonts.ready);

  // Both tabs attempt delivery of the SAME queued correction "at once".
  await Promise.all([
    pageA.evaluate(() => window.dispatchEvent(new Event("online"))),
    pageB.evaluate(() => window.dispatchEvent(new Event("online"))),
  ]);
  await pageA.waitForFunction(
    key => { try { return JSON.parse(localStorage.getItem(key) || "[]").length === 0; } catch (e) { return false; } },
    OUTBOX_KEY,
    { timeout: 5000 },
  );

  const correctionsA = await pageA.evaluate(() => (window.dataLayer || []).filter(item => item.event === "lead_corrected"));
  const correctionsB = await pageB.evaluate(() => (window.dataLayer || []).filter(item => item.event === "lead_corrected"));
  const total = correctionsA.length + correctionsB.length;

  await pageA.close();
  await pageB.close();

  assert.equal(total, 1, `две вкладки не должны обе зафиксировать lead_corrected для одной коррекции (получено ${total})`);
  return { status: "PASS", total };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const baseUrl = process.argv[2] || "http://127.0.0.1:8098/build/variants/final-dev5/";
  try {
    console.log(JSON.stringify(await verifyLeadOutbox(await browser.newPage(), baseUrl)));
    console.log(JSON.stringify(await verifyLeadOutboxLocking(await browser.newPage(), baseUrl)));
    console.log(JSON.stringify(await verifyLeadOutboxCorrection(await browser.newPage(), baseUrl)));
    const context = await browser.newContext();
    try {
      console.log(JSON.stringify(await verifyLeadCorrectionDedup(context, baseUrl)));
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    console.log(JSON.stringify(await verifyLeadOutbox(
      page,
      process.argv[2] || "http://127.0.0.1:8098/build/variants/final-dev5/",
    )));
  } finally {
    await browser.close();
  }
}

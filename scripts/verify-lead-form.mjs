import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

// Run against a local build only. All lead requests are fulfilled in the browser.
export async function verifyLeadForm(page, baseUrl) {
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname));
  const requests = [];
  const errors = [];
  let status = 202;
  let release;
  let requestStarted;
  let hold = false;
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/lead", async route => {
    requests.push(route.request().postDataJSON());
    if (requestStarted) requestStarted();
    if (hold) await new Promise(resolve => { release = resolve; });
    await route.fulfill({ status, json: status === 202 ? { ok: true } : status === 422
      ? { ok: false, error: "invalid_lead", field_errors: { email: "invalid_format" } }
      : { ok: false, error: "temporarily_unavailable" } });
  });
  const visible = selector => page.locator(selector).waitFor({ state: "visible" });
  const focus = () => page.evaluate(() => document.activeElement.id || document.activeElement.className);
  const review = () => page.locator(".lead-form__submit").click();
  const send = () => page.locator(".lead-form__confirm-submit").click();
  const fill = async (email = "person@gmail.com") => {
    await page.locator("#lead-name").fill("Тестовый Лид");
    await page.locator("#lead-phone").fill("+972 (50) 000-0000");
    await page.locator("#lead-email").fill(email);
  };
  await page.goto(baseUrl);
  await review();
  assert.equal(requests.length, 0);
  assert.equal(await focus(), "lead-name");
  assert.equal(await page.locator("#lead-email-error").textContent(), "Введите e-mail.");
  await fill("person@example");
  await review();
  assert.equal(await focus(), "lead-email");
  assert.equal(requests.length, 0);
  for (const domain of ["gmail.con", "gmali.com", "gmail.co", "gamil.com", "hotmail.con", "outlook.con", "yahoo.con", "walla.con"]) {
    await page.locator("#lead-email").fill("person@" + domain);
    assert.equal(await page.locator(".field__email-suggestion").isVisible(), true, domain);
    await page.locator(".field__email-suggestion").click();
    assert.notEqual(await page.locator("#lead-email").inputValue(), "person@" + domain);
  }
  for (const domain of ["gmail.com", "yandex.ru", "mail.ru", "walla.co.il"]) {
    await page.locator("#lead-email").fill("person@" + domain);
    assert.equal(await page.locator(".field__email-suggestion").isVisible(), false, domain);
  }
  const layouts = [];
  for (const [width, height] of [[360, 600], [390, 844], [960, 800], [961, 800], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await fill("x".repeat(108) + "@example.com");
    await review();
    assert.equal(requests.length, 0);
    assert.equal(await page.locator(".lead-form__fields").isVisible(), false);
    assert.equal(await page.locator('[data-confirm="phone"]').textContent(), "+972500000000");
    assert.equal(await focus(), "lead-form__confirm-title");
    const overflow = await page.evaluate(() => {
      const box = document.querySelector(".lead-form__confirm");
      return document.documentElement.scrollWidth > innerWidth || box.scrollWidth > box.clientWidth + 1;
    });
    assert.equal(overflow, false, `${width}x${height} confirmation overflow`);
    await page.keyboard.press("Escape");
    assert.equal(await focus(), "lead-name");
    assert.equal(await page.locator(".lead-form__fields").isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    layouts.push(`${width}x${height}`);
  }
  await fill();
  await page.locator('[name="channel"][value="whatsapp"]').check();
  await review();
  await page.locator(".lead-form__edit").click();
  assert.equal(await focus(), "lead-name");
  await review();
  // A stale confirmation must never send modified contacts without a new review.
  await page.locator("#lead-email").evaluate(input => { input.value = "changed@example.com"; });
  await send();
  assert.equal(requests.length, 0);
  assert.equal(await page.locator('[data-confirm="email"]').textContent(), "changed@example.com");
  hold = true;
  const sending = new Promise(resolve => { requestStarted = resolve; });
  await send();
  await sending;
  assert.equal(await page.locator(".lead-form__confirm-submit").isDisabled(), true);
  await page.locator(".lead-form").evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
  assert.equal(requests.length, 1);
  assert.ok(release);
  release();
  hold = false;
  await visible(".form-success");
  assert.equal(requests[0].email, "changed@example.com");
  assert.equal(requests[0].channel, "whatsapp");
  assert.equal(await page.locator(".form-success__contacts").textContent(), "Мы свяжемся с вами по телефону +972500000000 и e-mail changed@example.com");
  await page.locator(".form-success__edit").click();
  assert.equal(await page.locator("#lead-email").inputValue(), "changed@example.com");
  assert.equal(await page.locator('[name="channel"][value="whatsapp"]').isChecked(), true);
  assert.equal(await focus(), "lead-name");
  status = 503;
  await review(); await send();
  await visible(".lead-form__error");
  assert.equal(await page.locator(".lead-form__fields").isVisible(), true);
  assert.equal(await page.locator(".lead-form__submit").textContent(), "Повторить отправку");
  const failedId = requests.at(-1).submission_id;
  await review(); await send();
  await visible(".lead-form__error");
  assert.equal(requests.at(-1).submission_id, failedId);
  await page.locator("#lead-email").fill("corrected@example.com");
  status = 422;
  await review(); await send();
  await visible("#lead-email-error");
  assert.equal(await focus(), "lead-email");
  assert.notEqual(requests.at(-1).submission_id, failedId);
  status = 202;
  await page.locator("#lead-email").fill("good@example.com");
  await page.locator('[name="channel"][value="email"]').check();
  await review(); await send();
  await visible(".form-success");
  assert.equal(requests.at(-1).channel, "email");
  await page.locator(".form-success__again").click();
  assert.equal(await page.locator("#lead-email").inputValue(), "");
  assert.equal(await page.locator("#lead-name").inputValue(), "");
  assert.equal(await page.locator('[name="channel"][value="phone"]').isChecked(), true);
  assert.deepEqual(errors, []);
  return { status: "PASS", layouts, mockedRequests: requests.length, pageErrors: errors.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  try {
    console.log(await verifyLeadForm(await browser.newPage(), process.argv[2] || "http://127.0.0.1:8098/build/variants/final-dev5/"));
  } finally {
    await browser.close();
  }
}

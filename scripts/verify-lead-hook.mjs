import assert from "node:assert/strict";
import fs from "node:fs";

const EXPECTED_VERSION = "2.4.0";
const EXPECTED_DATE = "2026-09-22";
const BASE_URL = "https://gambarian-landing.pages.dev/api/lead";

const functionSource = fs.readFileSync("functions/api/lead.js", "utf8");
const publicContractSource = fs.readFileSync("site/lead-contract.js", "utf8");
const testableFunctionSource = functionSource.replace(
  'import "../../site/lead-contract.js";',
  publicContractSource,
);
const moduleUrl =
  "data:text/javascript;base64," +
  Buffer.from(testableFunctionSource).toString("base64");
const leadModule = await import(moduleUrl);

const index = fs.readFileSync("site/index.html", "utf8");
const app = fs.readFileSync("site/app.js", "utf8");
const styles = fs.readFileSync("site/styles.css", "utf8");
const contract = fs.readFileSync("docs/LEAD-WEBHOOK-CONTRACT.md", "utf8");
const routes = JSON.parse(fs.readFileSync("site/_routes.json", "utf8"));

assert.equal(leadModule.LEAD_CONTRACT.schemaVersion, EXPECTED_VERSION);
assert.equal(leadModule.LEAD_CONTRACT.version, EXPECTED_VERSION);
assert.equal(leadModule.LEAD_CONTRACT.schemaDate, EXPECTED_DATE);
assert.ok(contract.includes("**Версия схемы:** `" + EXPECTED_VERSION + "`"));
assert.ok(contract.includes("**Дата требований:** `" + EXPECTED_DATE + "`"));
assert.match(index, /<form class="lead-form" action="\/api\/lead" method="post">/);
for (const script of ["lead-contract", "app"]) {
  assert.ok(index.includes(`<script src="${script}.js?v=${EXPECTED_VERSION}" defer></script>`));
}
assert.ok(app.includes(`var EXPECTED_LEAD_CONTRACT_VERSION = "${EXPECTED_VERSION}";`));
for (const token of ['autocomplete="name"', 'autocomplete="tel"', 'autocomplete="email"']) {
  assert.ok(index.includes(token), `Нет ${token}`);
}
assert.match(index, /<input id="lead-email" required name="email" type="email"[^>]*maxlength="120"/);
assert.ok(index.includes('placeholder="Ваше имя"'));
assert.ok(index.includes('placeholder="Ваш e-mail"'));
assert.equal(leadModule.LEAD_CONTRACT.limits.email, 120);
assert.equal(leadModule.LEAD_CONTRACT.validation.fieldLabels.email, "E-mail");
assert.ok(index.includes('class="lead-form__confirm" aria-live="polite" hidden'));
assert.ok(!index.includes('name="topic"'), "Поле topic не удалено");
for (const field of ["name", "phone", "email"]) {
  assert.ok(index.includes(`id="lead-${field}-error"`));
  assert.ok(index.includes(`aria-errormessage="lead-${field}-error"`));
}
assert.ok(app.includes("var LEAD_ENDPOINT = LEAD_CONTRACT.endpoint;"));
assert.ok(app.includes("showValidationErrors"));
assert.ok(app.includes("showServerValidationErrors"));
assert.ok(!app.includes("LEAD_CONTRACT.topicOptions"));
assert.ok(app.includes("email: form.elements.email.value.trim()"));
assert.ok(!app.includes("data.topic"));
assert.ok(styles.includes('input[aria-invalid="true"]'));
assert.ok(styles.includes(".field--invalid"));
assert.ok(!`${index}\n${app}`.includes("ALBATO_WEBHOOK_URL"));
assert.deepEqual(routes, { version: 1, include: ["/api/*"], exclude: [] });

let streamPulls = 0;
const oversizedStream = new ReadableStream({
  pull(controller) {
    streamPulls += 1;
    controller.enqueue(new Uint8Array(4096));
    if (streamPulls === 10) controller.close();
  },
});
const bounded = await leadModule.readBodyWithLimit(
  new Request(BASE_URL, {
    method: "POST",
    body: oversizedStream,
    duplex: "half",
  }),
  8192,
);
assert.equal(bounded.tooLarge, true);
assert.equal(streamPulls, 3, "Reader должен остановиться сразу после лимита");

function call(method, body, env = {}) {
  return leadModule.onRequest({
    request: new Request(BASE_URL, {
      method,
      headers:
        method === "POST"
          ? {
              Origin: "https://gambarian-landing.pages.dev",
              "Content-Type": "application/json",
            }
          : {},
      body: method === "POST" ? body : undefined,
    }),
    env,
  });
}

let response = await call("GET");
assert.equal(response.status, 405);
assert.equal(response.headers.get("Allow"), "POST");

response = await leadModule.onRequest({
  request: new Request(BASE_URL, {
    method: "POST",
    headers: {
      Origin: "https://invalid.example",
      "Content-Type": "application/json",
    },
    body: "{}",
  }),
  env: {},
});
assert.equal(response.status, 403);

response = await call("POST", "{");
assert.equal(response.status, 400);
response = await call("POST", JSON.stringify({ name: "A", phone: "12" }));
assert.equal(response.status, 422);
assert.deepEqual((await response.json()).field_errors, {
  name: "too_short",
  phone: "invalid_format",
});
response = await call("POST", JSON.stringify({ padding: "x".repeat(9000) }));
assert.equal(response.status, 413);

const validLead = leadModule.validateLead({
  name: "Тестовый Лид",
  phone: "+972 50 000 0000",
});
assert.equal(validLead.fieldErrors && Object.keys(validLead.fieldErrors).length, 0);

const submissionId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const input = {
  schema_version: "client-cannot-override",
  name: "  Тестовый Лид  ",
  phone: "+972 50 000 0000",
  topic: "международное дело",
  email: "  lead@example.com  ",
  submission_id: submissionId,
  landing_path: "/",
  utm_source: "google",
  referrer_host: "google.com",
  unknown: "drop-me",
};

response = await call("POST", JSON.stringify(input));
assert.equal(response.status, 503);

const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;
let captured;
try {
  globalThis.fetch = async (url, options) => {
    captured = { url: String(url), options };
    return new Response(null, { status: 204 });
  };
  response = await call("POST", JSON.stringify(input), {
    ALBATO_WEBHOOK_URL: "https://example.invalid/albato-test",
  });
  assert.equal(response.status, 202);
  assert.equal((await response.json()).submission_id, submissionId);

  const payload = JSON.parse(captured.options.body);
  assert.equal(payload.schema_version, EXPECTED_VERSION);
  assert.equal(payload.schema_date, EXPECTED_DATE);
  assert.equal(payload.event_name, "lead_form_submit");
  assert.equal(payload.name, "Тестовый Лид");
  assert.equal(payload.topic, undefined);
  assert.equal(payload.email, "lead@example.com");
  assert.equal(payload.utm_source, "google");
  assert.equal(payload.utm_medium, "");
  assert.equal(payload.unknown, undefined);
  assert.equal(payload.company, undefined);
  assert.equal(payload.corrects_submission_id, "");
  const keys = Object.keys(payload);
  assert.deepEqual(keys, [
    "schema_version", "schema_date", "event_name", "source_system",
    "submission_id", "corrects_submission_id", "submitted_at", "form_id",
    "landing_path", "landing_language", "name", "phone", "email", "referrer_host",
    "utm_source", "utm_medium", "utm_campaign", "utm_id", "utm_term", "utm_content",
    "gclid", "gbraid", "wbraid", "fbclid",
  ]);

  // Ловушка не вызывает upstream и не логирует заявку даже без секрета/контактов.
  const botLogs = [];
  const originalLog = console.log;
  console.error = (...args) => botLogs.push(args);
  console.log = (...args) => botLogs.push(args);
  try {
    for (const company of ["Bot Ltd", " "]) {
      for (const env of [{}, { ALBATO_WEBHOOK_URL: "https://example.invalid/albato-test" }]) {
        captured = undefined;
        response = await call("POST", JSON.stringify({ company, submission_id: submissionId }), env);
        assert.equal(response.status, 202);
        assert.deepEqual(await response.json(), { ok: true, status: "accepted", submission_id: submissionId });
        assert.equal(captured, undefined, "Ловушка не должна вызывать webhook");
      }
    }
    captured = undefined;
    response = await call("POST", JSON.stringify({ company: "Bot Ltd" }));
    assert.equal(response.status, 202);
    assert.ok(leadModule.LEAD_CONTRACT.isValidSubmissionId((await response.json()).submission_id));
    assert.equal(captured, undefined);
    assert.deepEqual(botLogs, []);
  } finally {
    console.log = originalLog;
    console.error = originalConsoleError;
  }
  response = await call("POST", JSON.stringify({ ...input, company: "" }), {
    ALBATO_WEBHOOK_URL: "https://example.invalid/albato-test",
  });
  assert.equal(response.status, 202);
  assert.deepEqual(Object.keys(JSON.parse(captured.options.body)), keys);

  // Older pages may send this removed field; any value must be ignored.
  for (const channel of ["phone", "whatsapp", "email", "sms", "", null, 123, {}]) {
    captured = undefined;
    response = await call("POST", JSON.stringify({ ...input, channel }), {
      ALBATO_WEBHOOK_URL: "https://example.invalid/albato-test",
    });
    assert.equal(response.status, 202);
    assert.equal((await response.json()).submission_id, submissionId);
    const delivered = JSON.parse(captured.options.body);
    assert.equal(Object.hasOwn(delivered, "channel"), false);
    assert.deepEqual(Object.keys(delivered), keys);
    assert.equal(Object.hasOwn(leadModule.validateLead({ ...input, channel }).lead, "channel"), false);
  }

  const correctionId = "b60b01bc-19ba-49a5-8c49-6d32f8d91bca";
  for (const corrects_submission_id of ["", submissionId]) {
    response = await call("POST", JSON.stringify({ ...input, submission_id: correctionId, corrects_submission_id }), {
      ALBATO_WEBHOOK_URL: "https://example.invalid/albato-test",
    });
    assert.equal(response.status, 202);
    assert.equal((await response.json()).submission_id, correctionId);
    const delivered = JSON.parse(captured.options.body);
    assert.equal(delivered.submission_id, correctionId);
    assert.equal(delivered.corrects_submission_id, corrects_submission_id);
  }
  for (const corrects_submission_id of ["not-a-uuid", " ", submissionId + "x", " " + submissionId,
    submissionId.replace("4372", "1372"), submissionId.replace("a567", "7567"), 123, null, {}, [submissionId]]) {
    captured = undefined;
    response = await call("POST", JSON.stringify({ ...input, corrects_submission_id }), {
      ALBATO_WEBHOOK_URL: "https://example.invalid/albato-test",
    });
    assert.equal(response.status, 422);
    assert.deepEqual((await response.json()).field_errors, { corrects_submission_id: "invalid_format" });
    assert.equal(captured, undefined, "Invalid correction ID must not reach the webhook");
  }

  const legacy = { name: input.name, phone: input.phone };
  for (const email of [undefined, "", "person@yandex.ru", "person@mail.ru", "person@walla.co.il", "x".repeat(108) + "@example.com"]) {
    response = await call("POST", JSON.stringify({ ...legacy, email }), {
      ALBATO_WEBHOOK_URL: "https://example.invalid/albato-test",
    });
    assert.equal(response.status, 202, `Valid/legacy email: ${email}`);
    const delivered = JSON.parse(captured.options.body);
    assert.equal(delivered.email, email || "");
    assert.equal(delivered.corrects_submission_id, "");
  }
  for (const [email, code] of [
    ["missing-at.example.com", "invalid_format"],
    ["person@example", "invalid_format"],
    ["person@.com", "invalid_format"],
    ["person@example..com", "invalid_format"],
    ["person@@example.com", "invalid_format"],
    ["per son@example.com", "invalid_format"],
    ["person@example.com\ninjected", "invalid_format"],
    ["x".repeat(109) + "@example.com", "too_long"],
    [123, "invalid_format"],
    [null, "invalid_format"],
  ]) {
    captured = undefined;
    response = await call("POST", JSON.stringify({ ...legacy, email }), {
      ALBATO_WEBHOOK_URL: "https://example.invalid/albato-test",
    });
    assert.equal(response.status, 422);
    assert.deepEqual((await response.json()).field_errors, { email: code });
    assert.equal(captured, undefined, "Invalid email must not reach the webhook");
  }
  console.error = function () {};
  globalThis.fetch = async () => new Response("failed", { status: 500 });
  response = await call("POST", JSON.stringify(input), {
    ALBATO_WEBHOOK_URL: "https://example.invalid/albato-test",
  });
  assert.equal(response.status, 502);
} finally {
  globalThis.fetch = originalFetch;
  console.error = originalConsoleError;
}

console.log(
  `Lead hook ${EXPECTED_VERSION} (${EXPECTED_DATE}): contract/static/runtime PASS`,
);

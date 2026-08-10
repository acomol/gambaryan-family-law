import assert from "node:assert/strict";
import fs from "node:fs";

const EXPECTED_VERSION = "1.1.0";
const EXPECTED_DATE = "2026-08-10";
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
assert.equal(leadModule.LEAD_CONTRACT.schemaDate, EXPECTED_DATE);
assert.ok(contract.includes("**Версия схемы:** `" + EXPECTED_VERSION + "`"));
assert.ok(contract.includes("**Дата требований:** `" + EXPECTED_DATE + "`"));
assert.match(index, /<form class="lead-form" action="\/api\/lead" method="post">/);
assert.ok(index.includes('<script src="lead-contract.js" defer></script>'));
for (const token of ['autocomplete="name"', 'autocomplete="tel"', 'autocomplete="email"']) {
  assert.ok(index.includes(token), `Нет ${token}`);
}
for (const field of ["name", "phone", "email"]) {
  assert.ok(index.includes(`id="lead-${field}-error"`));
  assert.ok(index.includes(`aria-errormessage="lead-${field}-error"`));
}
assert.ok(app.includes("var LEAD_ENDPOINT = LEAD_CONTRACT.endpoint;"));
assert.ok(app.includes("showValidationErrors"));
assert.ok(app.includes("showServerValidationErrors"));
assert.ok(app.includes("input.validity.typeMismatch"));
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

const submissionId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const input = {
  schema_version: "client-cannot-override",
  name: "  Тестовый Лид  ",
  phone: "+972 50 000 0000",
  email: "TEST@EXAMPLE.COM",
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
  assert.equal(payload.email, "test@example.com");
  assert.equal(payload.utm_source, "google");
  assert.equal(payload.utm_medium, "");
  assert.equal(payload.unknown, undefined);

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

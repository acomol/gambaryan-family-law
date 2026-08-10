import "../../site/lead-contract.js";

const LEAD_CONTRACT = globalThis.GAMBARIAN_LEAD_CONTRACT;

const JSON_HEADERS = Object.freeze({
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
});

function json(status, body, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: Object.assign({}, JSON_HEADERS, extraHeaders || {}),
  });
}

function cleanString(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validateLead(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      lead: null,
      fieldErrors: { name: "required", phone: "required" },
    };
  }

  var limits = LEAD_CONTRACT.limits;
  var codes = LEAD_CONTRACT.validation.codes;
  var name = cleanString(value.name, limits.name + 1);
  var phone = cleanString(value.phone, limits.phone + 1);
  var email = cleanString(value.email, limits.email + 1).toLowerCase();
  var submissionId = cleanString(value.submission_id, 64);
  var landingPath = cleanString(value.landing_path, limits.landingPath);
  var referrerHost = cleanString(
    value.referrer_host,
    limits.referrerHost,
  ).toLowerCase();
  var phoneDigits = phone.replace(/\D/g, "");
  var fieldErrors = {};

  if (!name) fieldErrors.name = codes.required;
  else if (name.length < 2) fieldErrors.name = codes.tooShort;
  else if (name.length > limits.name) fieldErrors.name = codes.tooLong;
  if (
    phone.length > limits.phone ||
    phoneDigits.length < limits.phoneDigitsMin ||
    phoneDigits.length > limits.phoneDigitsMax ||
    !/^[0-9+().\-\s]+$/.test(phone)
  ) {
    fieldErrors.phone = phone ? codes.invalidFormat : codes.required;
  }
  if (email.length > limits.email) fieldErrors.email = codes.tooLong;
  else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = codes.invalidFormat;
  }
  if (Object.keys(fieldErrors).length) {
    return { lead: null, fieldErrors: fieldErrors };
  }

  var validSubmissionId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    submissionId,
  );
  if (!landingPath.startsWith("/") || landingPath.startsWith("//")) {
    landingPath = "/";
  }
  if (referrerHost && !/^[a-z0-9.-]+$/i.test(referrerHost)) {
    referrerHost = "";
  }

  var attribution = {};
  LEAD_CONTRACT.attributionFields.forEach(function (field) {
    attribution[field] = cleanString(value[field], limits.attribution);
  });

  return {
    lead: {
      name: name,
      phone: phone,
      email: email,
      submissionId: validSubmissionId ? submissionId : crypto.randomUUID(),
      landingPath: landingPath || "/",
      referrerHost: referrerHost,
      attribution: attribution,
    },
    fieldErrors: {},
  };
}

function buildPayload(lead) {
  return Object.assign(
    {
      schema_version: LEAD_CONTRACT.schemaVersion,
      schema_date: LEAD_CONTRACT.schemaDate,
      event_name: LEAD_CONTRACT.eventName,
      source_system: LEAD_CONTRACT.sourceSystem,
      submission_id: lead.submissionId,
      submitted_at: new Date().toISOString(),
      form_id: LEAD_CONTRACT.formId,
      landing_path: lead.landingPath,
      landing_language: LEAD_CONTRACT.landingLanguage,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      referrer_host: lead.referrerHost,
    },
    lead.attribution,
  );
}

async function readBodyWithLimit(request, maxBytes) {
  if (!request.body) return { text: "", tooLarge: false };

  var reader = request.body.getReader();
  var decoder = new TextDecoder();
  var text = "";
  var bytesRead = 0;

  while (true) {
    var part = await reader.read();
    if (part.done) break;
    bytesRead += part.value.byteLength;
    if (bytesRead > maxBytes) {
      await reader.cancel();
      return { text: "", tooLarge: true };
    }
    text += decoder.decode(part.value, { stream: true });
  }

  text += decoder.decode();
  return { text: text, tooLarge: false };
}

export async function onRequest(context) {
  var request = context.request;

  if (request.method !== "POST") {
    return json(
      405,
      { ok: false, error: "method_not_allowed" },
      { Allow: "POST" },
    );
  }

  var ownOrigin = new URL(request.url).origin;
  var origin = request.headers.get("Origin");
  if (origin && origin !== ownOrigin) {
    return json(403, { ok: false, error: "forbidden" });
  }

  var contentType = request.headers.get("Content-Type") || "";
  if (contentType.split(";")[0].trim().toLowerCase() !== "application/json") {
    return json(415, { ok: false, error: "unsupported_media_type" });
  }

  var declaredLength = Number(request.headers.get("Content-Length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > LEAD_CONTRACT.limits.bodyBytes
  ) {
    return json(413, { ok: false, error: "payload_too_large" });
  }

  var input;
  try {
    var body = await readBodyWithLimit(
      request,
      LEAD_CONTRACT.limits.bodyBytes,
    );
    if (body.tooLarge) {
      return json(413, { ok: false, error: "payload_too_large" });
    }
    input = JSON.parse(body.text);
  } catch (error) {
    return json(400, { ok: false, error: "invalid_json" });
  }

  var validation = validateLead(input);
  if (!validation.lead) {
    return json(422, {
      ok: false,
      error: "invalid_lead",
      field_errors: validation.fieldErrors,
    });
  }
  var lead = validation.lead;

  var configuredUrl = context.env.ALBATO_WEBHOOK_URL;
  var webhookUrl;
  try {
    webhookUrl = new URL(configuredUrl);
    if (webhookUrl.protocol !== "https:") throw new Error("HTTPS required");
  } catch (error) {
    return json(503, { ok: false, error: "temporarily_unavailable" });
  }

  var payload = buildPayload(lead);
  var upstream;
  var controller = new AbortController();
  var timeoutId = setTimeout(function () {
    controller.abort();
  }, LEAD_CONTRACT.upstreamTimeoutMs);
  try {
    upstream = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (error && error.name === "AbortError") {
      return json(504, { ok: false, error: "delivery_timeout" });
    }
    console.error("Lead webhook network failure");
    return json(502, { ok: false, error: "delivery_failed" });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!upstream.ok) {
    console.error("Lead webhook non-2xx status", upstream.status);
    return json(502, { ok: false, error: "delivery_failed" });
  }

  return json(202, {
    ok: true,
    status: "accepted",
    submission_id: lead.submissionId,
  });
}

export { LEAD_CONTRACT, buildPayload, readBodyWithLimit, validateLead };

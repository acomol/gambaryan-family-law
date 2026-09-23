/* Cloudflare Pages Function — POST /api/lead-dead-letter
   Aggregate-only client delivery-failure visibility. The browser sends no
   phone/name/email/submission_id — only form_id, attempts and reason — so
   this endpoint never stores PII, even best-effort.

   Ported from clients/luxemed/New Lending/functions/lead-dead-letter.js
   (digitalhook-os-, feature/luxemed-new-lending@613cdd30). Called from
   site/app.js when a write-ahead outbox entry is dropped (see
   docs/LEAD-PIPELINE.md — client outbox). Binding: LEADS_KV (optional —
   without it this is a documented no-op that still answers 200). */

const COUNTER_TTL_SECONDS = 90 * 24 * 60 * 60;
const JSON_HEADERS = { "content-type": "application/json" };
const REASONS = new Set(["ttl", "outbox_limit", "max_attempts"]);

function jerusalemDay(date) {
  date = date === undefined ? new Date() : date;
  var parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  var get = function (type) { return (parts.find(function (p) { return p.type === type; }) || {}).value || ""; };
  return get("year") + "-" + get("month") + "-" + get("day");
}

export async function onRequestPost(context) {
  var request = context.request;
  var env = context.env;
  var body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), { status: 400, headers: JSON_HEADERS });
  }

  var reason = REASONS.has(body && body.reason) ? body.reason : "unknown";
  var formId = String((body && body.form_id) || "lead").replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "lead";
  var attempts = Math.min(99, Math.max(0, Number(body && body.attempts) || 0));
  var day = jerusalemDay();
  var key = "dead:" + day + ":" + reason + ":" + formId;

  if (env.LEADS_KV && typeof env.LEADS_KV.put === "function") {
    try {
      var raw = typeof env.LEADS_KV.get === "function" ? await env.LEADS_KV.get(key) : null;
      var current = raw ? JSON.parse(raw) : {};
      var next = {
        count: Math.max(0, Number(current.count) || 0) + 1,
        max_attempts: Math.max(attempts, Number(current.max_attempts) || 0),
        day: day, reason: reason, form_id: formId,
      };
      await env.LEADS_KV.put(key, JSON.stringify(next), {
        expirationTtl: COUNTER_TTL_SECONDS,
        metadata: { type: "lead_dead_letter", day: day, reason: reason, form_id: formId },
      });
    } catch (e) { /* beacon is observability-only; never affects the original lead flow */ }
  }
  return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS });
}

export async function onRequestGet() {
  return new Response("lead-dead-letter endpoint — POST only", { status: 405 });
}

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
  var email = cleanString(value.email, limits.email + 1);
  var submissionId = cleanString(value.submission_id, 64);
  var correctsSubmissionId = value.corrects_submission_id === undefined
    ? "" : value.corrects_submission_id;
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
  // Для старых запросов email необязателен; новая форма требует его в браузере.
  if (value.email !== undefined && typeof value.email !== "string") {
    fieldErrors.email = codes.invalidFormat;
  } else if (email.length > limits.email) {
    fieldErrors.email = codes.tooLong;
  } else if (email && !LEAD_CONTRACT.isValidEmail(email)) {
    fieldErrors.email = codes.invalidFormat;
  }
  if (correctsSubmissionId !== "" && !LEAD_CONTRACT.isValidSubmissionId(correctsSubmissionId)) {
    fieldErrors.corrects_submission_id = codes.invalidFormat;
  }
  if (Object.keys(fieldErrors).length) {
    return { lead: null, fieldErrors: fieldErrors };
  }

  var validSubmissionId = LEAD_CONTRACT.isValidSubmissionId(submissionId);
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
      correctsSubmissionId: correctsSubmissionId,
      landingPath: landingPath || "/",
      referrerHost: referrerHost,
      attribution: attribution,
    },
    fieldErrors: {},
  };
}

// Albato записывает payload в Google Sheets как ввод с клавиатуры: «+972…» превращается
// в формулу (#ERROR!), «=…» из поля формы выполнилось бы. Значения из формы и URL,
// начинающиеся с = + - @ / tab / CR, получают апостроф (OWASP: formula injection);
// таблица его не показывает и хранит значение текстом. Применяется ТОЛЬКО на выходе
// в Albato (sheetSafePayload): KV/D1/R2 хранят исходные значения.
function sheetSafe(value) {
  return typeof value === "string" && /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
}

var SHEET_SAFE_KEYS = ["landing_path", "name", "phone", "email", "referrer_host"]
  .concat(LEAD_CONTRACT.attributionFields);

function sheetSafePayload(fields) {
  var out = Object.assign({}, fields);
  SHEET_SAFE_KEYS.forEach(function (key) {
    if (Object.prototype.hasOwnProperty.call(out, key)) out[key] = sheetSafe(out[key]);
  });
  return out;
}

function buildPayload(lead) {
  return Object.assign(
    {
      schema_version: LEAD_CONTRACT.schemaVersion,
      schema_date: LEAD_CONTRACT.schemaDate,
      event_name: LEAD_CONTRACT.eventName,
      source_system: LEAD_CONTRACT.sourceSystem,
      submission_id: lead.submissionId,
      corrects_submission_id: lead.correctsSubmissionId,
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

/* ==========================================================================
   Durable lead pipeline — ported from the ADFIX "never lose a lead" reference
   (clients/luxemed/New Lending/functions/lead.js, digitalhook-os-,
   feature/luxemed-new-lending@613cdd30; contract:
   knowledge/web-dev/ADFIX-SITE-SYSTEM-PLAYBOOK.md §1.6-1.7). Order per §1.6 L4:
   KV(pending, no TTL) → R2 archive → D1 insert-if-missing → D1 lease
   (cross-isolate, exactly-one-forward) → Albato (timeout) → markDelivered
   (D1 + KV TTL 7d) → optional Telegram; 502 only if BOTH the KV write and the
   delivery failed. `waitUntil(sweepPendingLeads)` re-forwards stragglers.

   Bindings (Cloudflare Pages dashboard):
     • KV namespace bound as   LEADS_KV       (required to activate — durable store)
     • D1 database bound as    LEADS_DB       (optional — queryable mirror + forward lease)
     • R2 bucket bound as      LEADS_ARCHIVE  (optional — append-only Markdown audit trail)
     • env  ALBATO_WEBHOOK_URL  (existing Gambaryan secret name — unchanged)
     • env  TELEGRAM_TOKEN / TELEGRAM_CHAT_ID  (optional — enables alerts)
   Until LEADS_KV is bound, onRequest() below forwards EXACTLY as it did before
   this change (see hasDurableStorage()) — the current deploy cannot get worse. */

const LEAD_TTL_SECONDS = 7 * 24 * 60 * 60;       // delivered leads kept 7d; pending kept WITHOUT TTL
const LEAD_SWEEP_LIMIT = 10;                      // re-forwards per request-triggered sweep
const LEAD_ALERT_AFTER_MS = 15 * 60 * 1000;       // pending longer than this → undelivered alert (once)
const LEAD_FORWARD_LEASE_MS = 15 * 1000;          // > Albato timeout; expired leases may be taken over
const HP_COUNTER_TTL_SECONDS = 90 * 24 * 60 * 60; // aggregate-only honeypot visibility
const activeLeadForwards = new Map();             // same-isolate guard; D1 is the cross-isolate guard
const deliveredLeadsInProcess = new Set();        // protects this isolate if both final KV/D1 writes fail

const D1_COLUMNS = [
  "submission_id", "received_at", "status", "delivered_at", "name", "phone", "email",
  "corrects_submission_id", "form_id", "landing_path", "referrer_host",
  "utm_source", "utm_medium", "utm_campaign", "utm_id", "utm_term", "utm_content",
  "gclid", "gbraid", "wbraid", "fbclid", "payload_json",
];

function hasDurableStorage(env) {
  return !!(env && env.LEADS_KV && typeof env.LEADS_KV.put === "function");
}

function escTelegram(s) {
  return String(s == null ? "" : s).replace(/[<>&]/g, function (c) {
    return { "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c];
  });
}

/* ---- Telegram notify (no-op until TELEGRAM_TOKEN + TELEGRAM_CHAT_ID are set) ---- */
async function notifyTelegram(env, text) {
  if (!env.TELEGRAM_TOKEN || !env.TELEGRAM_CHAT_ID) return false;
  try {
    var res = await fetch("https://api.telegram.org/bot" + env.TELEGRAM_TOKEN + "/sendMessage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID, text: text, parse_mode: "HTML", disable_web_page_preview: true,
      }),
    });
    return !!(res && res.ok);
  } catch (e) { return false; }
}
function newLeadTelegramMessage(f) {
  return "🔥 <b>Новая заявка — Гамбарян</b>\n"
    + "📞 <b>" + escTelegram(f.phone) + "</b>\n"
    + "👤 " + escTelegram(f.name) + "\n"
    + (f.email ? "✉️ " + escTelegram(f.email) + "\n" : "")
    + "Источник: " + escTelegram(f.utm_source || "(direct)") + "\nID: " + escTelegram(f.submission_id);
}
function undeliveredTelegramMessage(rec) {
  var f = rec.fields || {};
  return "⚠️ <b>НЕДОСТАВКА лида в Albato</b>\n"
    + "Лид сохранён у нас, но Albato его не принял.\n"
    + "📞 " + escTelegram(f.phone) + " · 👤 " + escTelegram(f.name) + "\nID: " + escTelegram(f.submission_id) + "\n"
    + "Получен: " + escTelegram(rec.received_at) + ". Проверьте интеграцию Albato.";
}

/* ---- D1 mirror + atomic forwarding lease. KV remains the durable source of
   truth; D1 arbitrates cross-isolate forwarding so exactly one isolate POSTs
   to Albato per lead. A bound-D1 query failure leaves the KV lead pending for
   a later sweep instead of risking a duplicate Albato POST. ---- */
function leadD1Values(rec) {
  var f = rec.fields || {};
  return [
    rec.submission_id, rec.received_at, rec.status,
    rec.delivered_at || (rec.status === "forwarding" ? rec.forwarding_started_at : null) || null,
    f.name || null, f.phone || null, f.email || null,
    f.corrects_submission_id || null, f.form_id || null, f.landing_path || null, f.referrer_host || null,
    f.utm_source || null, f.utm_medium || null, f.utm_campaign || null,
    f.utm_id || null, f.utm_term || null, f.utm_content || null,
    f.gclid || null, f.gbraid || null, f.wbraid || null, f.fbclid || null,
    JSON.stringify(f),
  ];
}
function d1Changes(result) {
  return Number((result && result.meta && result.meta.changes) ?? (result && result.changes) ?? 0);
}
async function insertLeadD1IfMissing(env, rec) {
  if (!env.LEADS_DB || typeof env.LEADS_DB.prepare !== "function") return null;
  try {
    var result = await env.LEADS_DB.prepare(
      "INSERT INTO leads (" + D1_COLUMNS.join(", ") + ")"
      + " VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22)"
      + " ON CONFLICT(submission_id) DO NOTHING"
    ).bind(...leadD1Values(rec)).run();
    return d1Changes(result);
  } catch (e) { return null; }
}
async function upsertLeadD1(env, rec) {
  if (!env.LEADS_DB || typeof env.LEADS_DB.prepare !== "function") return false;
  try {
    // Protects BOTH terminal states from regressing via a stale upsert:
    // 'delivered' (as before) and now 'deleted' (review round 2, finding B
    // — a deleted lead's D1 row must never be flipped back to pending/
    // forwarding/delivered by a repair/sweep/reconcile write).
    await env.LEADS_DB.prepare(
      "INSERT INTO leads (" + D1_COLUMNS.join(", ") + ")"
      + " VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22)"
      + " ON CONFLICT(submission_id) DO UPDATE SET"
      + " status=CASE WHEN leads.status IN ('delivered','deleted') THEN leads.status ELSE excluded.status END,"
      + " delivered_at=CASE WHEN leads.status IN ('delivered','deleted') THEN leads.delivered_at ELSE excluded.delivered_at END"
    ).bind(...leadD1Values(rec)).run();
    return true;
  } catch (e) { return false; }
}
async function claimLeadD1Lease(env, submissionId, startedAt) {
  if (!env.LEADS_DB || typeof env.LEADS_DB.prepare !== "function") return null;
  var expiredBefore = new Date(new Date(startedAt).getTime() - LEAD_FORWARD_LEASE_MS).toISOString();
  try {
    var result = await env.LEADS_DB.prepare(
      "UPDATE leads SET status='forwarding', delivered_at=?1"
      + " WHERE submission_id=?2"
      + "   AND (status='pending' OR (status='forwarding' AND delivered_at<=?3))"
    ).bind(startedAt, submissionId, expiredBefore).run();
    // d1Changes>0 is the SOLE authoritative proof of ownership: this UPDATE
    // statement itself is atomic (D1/SQLite single-writer), so an affected-
    // row count above zero means OUR call, and no one else's, just won it.
    if (d1Changes(result) > 0) return "claimed";
    var found = await env.LEADS_DB.prepare(
      "SELECT status, delivered_at FROM leads WHERE submission_id=?1"
    ).bind(submissionId).all();
    var row = found && found.results && found.results[0];
    if (row && row.status === "delivered") return "delivered";
    // Review round 2, finding C (P1 pre-existing): the previous fallback
    // compared `row.delivered_at === startedAt` and returned "claimed" on a
    // match — but reaching this branch already means OUR update affected 0
    // rows, i.e. we did NOT win. Two isolates computing
    // `new Date().toISOString()` within the same millisecond can produce an
    // IDENTICAL startedAt, so the stored value (written by whichever
    // isolate actually won) can coincidentally equal our own — a false
    // positive that let both racers report "claimed". Never trust a
    // timestamp equality as an ownership token here; only d1Changes above
    // proves ownership.
    if (row && row.status === "forwarding") return "pending";
    return null;
  } catch (e) { return null; }
}

/* ---- R2 immutable archive: one Markdown file per lead. NO-OP until an R2
   bucket is bound as LEADS_ARCHIVE. Append-only audit trail (human-readable). ---- */
function leadToMarkdown(rec) {
  var f = rec.fields || {};
  var row = function (k, v) { return v ? "- **" + k + ":** " + String(v) + "\n" : ""; };
  return "# Лид " + rec.submission_id + "\n\n"
    + row("Получен", rec.received_at) + row("Статус", rec.status) + row("Доставлен", rec.delivered_at)
    + row("Имя", f.name) + row("Телефон", f.phone) + row("Email", f.email)
    + row("Форма", f.form_id) + row("Страница", f.landing_path) + row("Referrer", f.referrer_host)
    + row("Исправляет заявку", f.corrects_submission_id)
    + row("utm_source", f.utm_source) + row("utm_campaign", f.utm_campaign)
    + row("gclid", f.gclid) + row("gbraid", f.gbraid) + row("wbraid", f.wbraid) + row("fbclid", f.fbclid)
    + "\n<details><summary>Полный payload</summary>\n\n```json\n" + JSON.stringify(f, null, 2) + "\n```\n</details>\n";
}
async function archiveLeadR2(env, rec) {
  if (!env.LEADS_ARCHIVE || typeof env.LEADS_ARCHIVE.put !== "function") return;
  try {
    var d = (rec.received_at || new Date().toISOString()).slice(0, 10);
    await env.LEADS_ARCHIVE.put("leads/" + d + "/" + rec.submission_id + ".md", leadToMarkdown(rec),
      { httpMetadata: { contentType: "text/markdown; charset=utf-8" } });
  } catch (e) { /* best-effort */ }
}

/* ---- forward to Albato as JSON — same wire format as before this change
   (Gambaryan's Albato scenario is not being touched), now with the shared
   LEAD_CONTRACT.upstreamTimeoutMs hard timeout. ---- */
async function forwardToAlbato(env, fields) {
  if (!env.ALBATO_WEBHOOK_URL) return false;
  var controller = new AbortController();
  var timeoutId = setTimeout(function () { controller.abort(); }, LEAD_CONTRACT.upstreamTimeoutMs);
  try {
    var res = await fetch(env.ALBATO_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(sheetSafePayload(fields)),
      signal: controller.signal,
    });
    return !!(res && res.ok);
  } catch (e) { return false; }
  finally { clearTimeout(timeoutId); }
}

function leadKvMetadata(rec) {
  return {
    status: rec.status,
    received_at: rec.received_at,
    forwarding_started_at: rec.forwarding_started_at || "",
    albato_delivered_at: rec.albato_delivered_at || "",
  };
}
async function putLeadRecord(env, key, rec, deliveredTtl) {
  if (!env.LEADS_KV || typeof env.LEADS_KV.put !== "function") return false;
  var options = { metadata: leadKvMetadata(rec) };
  if (deliveredTtl) options.expirationTtl = LEAD_TTL_SECONDS;
  try {
    await env.LEADS_KV.put(key, JSON.stringify(rec), options);
    return true;
  } catch (e) { return false; }
}
async function putLeadRecordWithRetry(env, key, rec, deliveredTtl) {
  if (await putLeadRecord(env, key, rec, deliveredTtl)) return true;
  return putLeadRecord(env, key, rec, deliveredTtl);
}
async function readLeadRecord(env, key) {
  if (!env.LEADS_KV || typeof env.LEADS_KV.get !== "function") return null;
  try {
    var raw = await env.LEADS_KV.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function leadLeaseIsLive(rec, now) {
  now = now === undefined ? Date.now() : now;
  var started = new Date((rec && rec.forwarding_started_at) || 0).getTime();
  return !!(rec && rec.status === "forwarding" && started > 0 && (now - started) < LEAD_FORWARD_LEASE_MS);
}
function newLeaseId() {
  try { return crypto.randomUUID(); } catch (e) {
    return "lease_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
}
async function claimLeadForwarding(env, key, rec) {
  if (rec.status === "delivered" || rec.albato_delivered_at || deliveredLeadsInProcess.has(key)) return "delivered";
  if (leadLeaseIsLive(rec)) return "pending";

  var startedAt = new Date().toISOString();
  var d1Claim = await claimLeadD1Lease(env, rec.submission_id, startedAt);
  if (d1Claim === "delivered" || d1Claim === "pending") return d1Claim;
  // D1 is the atomic cross-isolate arbiter. If its bound query failed, fail
  // closed: leave the durable lead pending for a later sweep instead of
  // risking two Albato POSTs.
  if (env.LEADS_DB && typeof env.LEADS_DB.prepare === "function" && d1Claim === null) return "pending";

  var id = newLeaseId();
  rec.status = "forwarding";
  rec.forwarding_started_at = startedAt;
  rec.forwarding_lease_id = id;

  if (d1Claim === "claimed") {
    await putLeadRecord(env, key, rec);
    return "claimed";
  }
  if (!env.LEADS_KV || typeof env.LEADS_KV.put !== "function") return "claimed";
  if (!(await putLeadRecord(env, key, rec))) return "pending";
  var check = await readLeadRecord(env, key);
  if (check && check.forwarding_lease_id === id) return "claimed";
  if (check && (check.status === "delivered" || check.albato_delivered_at)) return "delivered";
  return "pending";
}
// Review round 2, finding C (P1 pre-existing); CAS condition fixed round 3,
// finding 2: a completion/release write that arrives LATE (isolate was
// delayed after a slow Albato response) must not clobber a lease that has
// since EXPIRED and been reclaimed by a newer isolate, AND must not clobber
// a TERMINAL state ('delivered'/'deleted') that a DIFFERENT actor produced
// in the meantime (e.g. an admin delete during active forwarding, or a
// newer isolate's own completed lease). Round 2's guard read
// "status != 'forwarding' OR delivered_at=?guard" — logically inverted from
// its intent, it ALLOWED the write whenever the row was in ANY non-
// forwarding state, including a terminal one set by someone else. The
// correct guard restricts the write to rows that are STILL 'forwarding'
// under precisely OUR OWN lease timestamp: "status='forwarding' AND
// delivered_at=?guard". Falls back to the plain (CASE WHEN-protected)
// upsert when there is no lease context to guard against (e.g. repairing a
// record that never went through claimLeadForwarding in THIS call, such as
// the KV-delivered-already repair paths above).
//
// Return contract: true (write applied, or a plain/insert path succeeded) |
// false (NO D1 binding configured at all — legacy KV/Albato-only mode,
// unrelated to CAS, callers may proceed as before) | "not_owner" (the row
// exists but is no longer under our active lease — a different actor
// already changed it) | "error" (review round 4, finding C: D1 IS bound
// but the guarded query itself threw — e.g. a transient D1 outage. This is
// NOT the same as "no D1 configured": we cannot confirm whether the row is
// still ours, so it must be treated exactly like "not_owner", never like
// the legacy fallback). Callers MUST treat BOTH "not_owner" and "error" as
// "do not touch anything else either — no KV write, no notification, defer
// to the next sweep" — see markLeadDelivered/releaseLeadToPending below.
async function upsertLeadD1Guarded(env, rec, expectedLeaseStart) {
  if (!env.LEADS_DB || typeof env.LEADS_DB.prepare !== "function") return false;
  if (!expectedLeaseStart) return upsertLeadD1(env, rec);
  try {
    // Placeholder numbers are kept in ASCENDING TEXTUAL order (matching the
    // .bind() argument order below) rather than semantic column order —
    // real SQLite/D1 resolves `?N` by index regardless of position, but the
    // test harness's mock D1 (node:sqlite) strips numbers and binds
    // anonymous `?` positionally, so out-of-order numbering would silently
    // bind the wrong values there.
    var cols = D1_COLUMNS.filter(function (c) { return c !== "submission_id"; });
    var setClause = cols.map(function (c, i) { return c + "=?" + (i + 1); }).join(",");
    var values = leadD1Values(rec);
    var submissionPlaceholder = "?" + (cols.length + 1);
    var guardPlaceholder = "?" + (cols.length + 2);
    var result = await env.LEADS_DB.prepare(
      "UPDATE leads SET " + setClause
      + " WHERE submission_id=" + submissionPlaceholder + " AND status='forwarding' AND delivered_at=" + guardPlaceholder
    ).bind(...values.slice(1), rec.submission_id, expectedLeaseStart).run();
    if (d1Changes(result) > 0) return true;
    var probe = await env.LEADS_DB.prepare("SELECT 1 AS found FROM leads WHERE submission_id=?1").bind(rec.submission_id).all();
    if (probe && probe.results && probe.results[0]) return "not_owner"; // exists, but not under OUR active lease (stolen, released, or already terminal) — do not touch
    return (await insertLeadD1IfMissing(env, rec)) !== null; // never existed — a plain insert is safe
  } catch (e) { return "error"; } // D1 bound but the query itself failed — CANNOT confirm ownership; never conflate with "not configured"
}

// Review round 5 (Codex-found race on 6034203): admin DELETE is not
// serialized against an in-flight writer for the SAME submission_id — that
// would need a Durable Object. Two narrow windows exist instead:
//   (1) our completion CAS (upsertLeadD1Guarded) commits `changes=1`, a
//       concurrent admin delete then flips D1 to 'deleted' and wipes
//       KV/R2, and OUR OWN completion write (KV) still lands right after —
//       resurrecting PII into KV and (via the caller's notify-gate) would
//       have alerted, had the caller not already checked our return value.
//   (2) intake's deletion-status check reads "active", a concurrent admin
//       delete then flips D1 to 'deleted' and wipes KV/R2, and intake's OWN
//       first-ever KV+R2 write for this id still lands right after.
// DECISION: make deletion EVENTUAL and BOUNDED instead of fully serialized.
// Right after the KV (and, at intake, R2) write, re-read D1's status ONE
// more time. If it now says 'deleted', undo the resurrection we JUST wrote
// (wipe KV, and R2 when a receivedAt is given) — closing the window within
// the SAME request in the common case. cron-worker's janitor
// (janitorPurgeDeletedLeads) is the second, bounded-by-cron-interval layer
// for the remaining, much narrower race between this re-check and the
// return (see docs/LEAD-PIPELINE.md "Review 2026-09-23 — round 5").
async function wipeIfDeletedAfterWrite(env, key, submissionId, receivedAt) {
  if (!env.LEADS_DB || typeof env.LEADS_DB.prepare !== "function") return false;
  var status = null;
  try {
    var found = await env.LEADS_DB.prepare("SELECT status FROM leads WHERE submission_id=?1").bind(submissionId).all();
    var row = found && found.results && found.results[0];
    status = row ? row.status : null;
  } catch (e) { return false; } // can't confirm right now — the janitor catches this on its next pass
  if (status !== "deleted") return false;
  if (env.LEADS_KV && typeof env.LEADS_KV.delete === "function") {
    try { await env.LEADS_KV.delete(key); } catch (e) { /* best-effort */ }
  }
  if (receivedAt && env.LEADS_ARCHIVE && typeof env.LEADS_ARCHIVE.delete === "function") {
    try { await env.LEADS_ARCHIVE.delete("leads/" + receivedAt.slice(0, 10) + "/" + submissionId + ".md"); } catch (e) { /* best-effort */ }
  }
  return true;
}

// Callers check the return with strict equality (=== false), not
// truthiness, because the "no D1 bound" legacy fallback is boolean `false`
// while "not_owner"/"error" are distinct truthy strings that must ALSO
// block the KV write and any notification — see the not_owner/error checks
// in markLeadDelivered/releaseLeadToPending below and every caller of them.
async function markLeadDelivered(env, key, rec) {
  var expectedLeaseStart = rec.forwarding_started_at;
  var deliveredAt = new Date().toISOString();
  rec.status = "delivered";
  rec.delivered_at = deliveredAt;
  rec.albato_delivered_at = deliveredAt;
  delete rec.forwarding_started_at;
  delete rec.forwarding_lease_id;
  var d1Result = await upsertLeadD1Guarded(env, rec, expectedLeaseStart);
  if (d1Result === "not_owner" || d1Result === "error") {
    // Review round 3, finding 2 (not_owner) + round 4, finding C (error): a
    // different actor already moved this row to a different/terminal state
    // in D1 (admin delete, or a newer isolate that reclaimed an expired
    // lease) — OR we simply could not confirm either way because the guard
    // query itself errored (treat that exactly like not_owner, never like
    // "no D1 configured"). Writing our own "delivered" belief into KV now
    // would resurrect/overwrite an unknown outcome, and recording it in
    // deliveredLeadsInProcess would make THIS isolate lie to itself about
    // owning the delivery. Leave both alone; a later sweep resolves it.
    return false;
  }
  deliveredLeadsInProcess.add(key);
  var kvOk = await putLeadRecordWithRetry(env, key, rec, true);
  if (await wipeIfDeletedAfterWrite(env, key, rec.submission_id, rec.received_at)) {
    // Round 5: a concurrent admin delete won the race between our CAS
    // commit and this KV write. Undo the resurrection and tell the caller
    // we do NOT own this delivery — it must not notify.
    deliveredLeadsInProcess.delete(key);
    return false;
  }
  return kvOk || d1Result;
}
// Returns true only when this isolate still owns the row and the release
// write (or the legacy no-D1 KV write) actually applied — review round 4,
// finding B: callers MUST check this before sending any "undelivered" alert
// or rewriting their own copy of `rec` (which still carries PII) into KV;
// see sweepPendingLeads below.
async function releaseLeadToPending(env, key, rec) {
  var expectedLeaseStart = rec.forwarding_started_at;
  rec.status = "pending";
  delete rec.forwarding_started_at;
  delete rec.forwarding_lease_id;
  var d1Result = await upsertLeadD1Guarded(env, rec, expectedLeaseStart);
  if (d1Result === "not_owner" || d1Result === "error") return false; // do not resurrect/overwrite a since-changed row in KV, and do not act as if we still own it
  var kvOk = await putLeadRecord(env, key, rec);
  if (await wipeIfDeletedAfterWrite(env, key, rec.submission_id, rec.received_at)) return false; // round 5: same race, undo the resurrection
  return kvOk || d1Result;
}

function jerusalemDay(date) {
  date = date === undefined ? new Date() : date;
  var parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  var get = function (type) { return (parts.find(function (p) { return p.type === type; }) || {}).value || ""; };
  return get("year") + "-" + get("month") + "-" + get("day");
}
/* ---- Deletion status (review 2026-09-23 round 2, finding B; TRI-STATE
   fixed round 3, finding 1): a deleted lead must never be resurrected —
   D1 `status='deleted'` is the AUTHORITATIVE marker; the KV tombstone key
   (`tomb:<id>`, long TTL) is a SECONDARY signal for when D1 can't be
   queried.

   Round 2's boolean version collapsed "confirmed deleted" and "could not
   confirm either way" into the SAME `true` result, which the intake path
   (processDurableLead) treated as "silently accept and do nothing" — with
   BOTH LEADS_KV and LEADS_DB erroring, a brand-new, never-before-seen lead
   was reported 202 accepted/dedup without ever being written anywhere,
   then genuinely lost once the client cleared its outbox. Fixed with a
   proper tri-state: 'deleted' | 'active' | 'unknown'. 'unknown' must NEVER
   be treated as 'deleted' by a caller that would otherwise skip
   persistence — see checkLeadDeletionStatus() callers below. */
function tombstoneKey(submissionId) { return "tomb:" + submissionId; }
async function checkLeadDeletionStatus(env, submissionId) {
  var d1Status = null;
  var d1Error = false;
  if (env.LEADS_DB && typeof env.LEADS_DB.prepare === "function") {
    try {
      var found = await env.LEADS_DB.prepare("SELECT status FROM leads WHERE submission_id=?1").bind(submissionId).all();
      var row = found && found.results && found.results[0];
      d1Status = row ? row.status : null;
    } catch (e) { d1Error = true; }
  }
  if (d1Status === "deleted") return "deleted";

  var kvError = false;
  var kvTombstoned = false;
  if (env.LEADS_KV && typeof env.LEADS_KV.get === "function") {
    try { kvTombstoned = (await env.LEADS_KV.get(tombstoneKey(submissionId))) != null; }
    catch (e) { kvError = true; }
  }
  if (kvTombstoned) return "deleted";

  // D1 answered (even "no row") and said not deleted → trust it. If D1
  // could not answer but KV could, and KV has no tombstone → trust KV.
  if (!d1Error || !kvError) return "active";
  return "unknown"; // BOTH signals unreadable — genuinely cannot tell
}
// Sweep contexts: the candidate already exists in some durable store, so
// skipping it for one pass (treating "unknown" the same as "deleted", i.e.
// "do not touch this cycle") never loses it — a later sweep re-checks.
// This is the conservative default; only the INTAKE path (which is the
// ONE place a brand-new record gets its first-ever persistence attempt)
// needs to distinguish 'unknown' from 'deleted' — see processDurableLead.
async function isLeadDeletedForSweep(env, submissionId) {
  return (await checkLeadDeletionStatus(env, submissionId)) !== "active";
}

async function countLeadHoneypot(env) {
  if (!env.LEADS_KV || typeof env.LEADS_KV.put !== "function") return false;
  var day = jerusalemDay();
  var key = "hp:" + day;
  try {
    var raw = typeof env.LEADS_KV.get === "function" ? await env.LEADS_KV.get(key) : null;
    var count = Math.max(0, Number(raw) || 0) + 1;
    await env.LEADS_KV.put(key, String(count), {
      expirationTtl: HP_COUNTER_TTL_SECONDS, metadata: { type: "honeypot_count", day: day },
    });
    return true;
  } catch (e) { return false; }
}

/* ---- re-forward still-pending leads, OLDEST FIRST. Uses KV list metadata to
   skip delivered leads WITHOUT a get() — keeps reads within free tier. ---- */
async function sweepPendingLeads(env, excludeKey) {
  excludeKey = excludeKey || "";
  if (env.LEADS_KV && typeof env.LEADS_KV.list === "function") {
    try {
      var listed = await env.LEADS_KV.list({ prefix: "lead:", limit: 1000 });
      var pending = listed.keys
        .filter(function (k) {
          return k.name !== excludeKey && k.metadata
            && (k.metadata.status === "pending" || k.metadata.status === "forwarding");
        })
        .sort(function (a, b) { return new Date(a.metadata.received_at || 0) - new Date(b.metadata.received_at || 0); });
      var attempts = 0;
      var now = Date.now();
      for (const k of pending) {
        if (attempts >= LEAD_SWEEP_LIMIT) break;
        if (await isLeadDeletedForSweep(env, k.name.slice("lead:".length))) continue;
        const rec = await readLeadRecord(env, k.name);
        if (!rec || rec.status === "delivered") continue;
        if (rec.albato_delivered_at) {
          await markLeadDelivered(env, k.name, rec);
          continue;
        }
        await insertLeadD1IfMissing(env, rec);
        const claim = await claimLeadForwarding(env, k.name, rec);
        if (claim !== "claimed") continue;
        attempts++;
        // Review round 6, finding 2 (Codex "send-after-delete"): the claim
        // above only proves ownership AT CLAIM TIME — a concurrent admin
        // delete can land in the gap before this POST. Re-check right
        // before sending; residual window (a POST already in flight when
        // the delete lands) is a documented limitation, see
        // docs/LEAD-PIPELINE.md §10.
        if (await wipeIfDeletedAfterWrite(env, k.name, rec.submission_id, rec.received_at)) continue;
        if (await forwardToAlbato(env, rec.fields)) {
          // Review round 4, finding B: only announce delivery if we still
          // own the row after the completion write — a not_owner/error
          // result means a different actor already changed it, and this
          // isolate's belief is stale.
          if (await markLeadDelivered(env, k.name, rec)) {
            await notifyTelegram(env, newLeadTelegramMessage(rec.fields));
          }
        } else {
          const stillOwned = await releaseLeadToPending(env, k.name, rec);
          if (stillOwned) {
            const age = now - new Date(rec.received_at || now).getTime();
            if (age > LEAD_ALERT_AFTER_MS && !rec.alerted) {
              const notified = await notifyTelegram(env, undeliveredTelegramMessage(rec));
              if (notified) {
                rec.alerted = true;
                await putLeadRecord(env, k.name, rec);
              }
            }
          }
          // stillOwned === false: a different actor changed this row while
          // our forward was in flight — do not alert, do not rewrite our
          // stale PII-carrying `rec` into KV; a later sweep resolves it.
        }
      }
    } catch (e) { /* best-effort */ }
  }

  // D1-only stragglers (review 2026-09-23, finding 3): a lead whose EVERY
  // KV write failed at intake time never gets a `lead:<id>` key at all, so
  // the KV-list loop above can never find it — it would otherwise be
  // stranded in D1 forever. Rebuild a KV-shaped record from payload_json and
  // run it through the SAME claim/forward path; claimLeadForwarding's D1
  // lease safely no-ops if another isolate (or the KV loop above, for a row
  // that DOES also have a KV copy) is already handling this id.
  if (env.LEADS_DB && typeof env.LEADS_DB.prepare === "function") {
    try {
      var expiredBefore = new Date(Date.now() - LEAD_FORWARD_LEASE_MS).toISOString();
      var found = await env.LEADS_DB.prepare(
        "SELECT submission_id, received_at, status, delivered_at, payload_json FROM leads"
        + " WHERE status='pending' OR (status='forwarding' AND delivered_at<=?1)"
        + " ORDER BY received_at ASC LIMIT ?2"
      ).bind(expiredBefore, LEAD_SWEEP_LIMIT * 2).all();
      var rows = (found && found.results) || [];
      var d1Attempts = 0;
      for (const row of rows) {
        if (d1Attempts >= LEAD_SWEEP_LIMIT) break;
        var rowKey = "lead:" + row.submission_id;
        if (rowKey === excludeKey) continue;
        if (await isLeadDeletedForSweep(env, row.submission_id)) continue;

        // Finding A (review round 2, P1 regression): KV is the delivery
        // source of truth. If Albato already accepted this lead but the
        // FINAL D1 write failed — leaving a stale D1 'forwarding'/'pending'
        // row that this loop would otherwise treat as a fresh candidate —
        // repair D1 from the KV record WITHOUT re-posting to Albato.
        var kvRecordForRow = await readLeadRecord(env, rowKey);
        if (kvRecordForRow && (kvRecordForRow.status === "delivered" || kvRecordForRow.albato_delivered_at)) {
          await upsertLeadD1(env, kvRecordForRow);
          continue;
        }

        var fields; try { fields = JSON.parse(row.payload_json || "{}"); } catch (e) { fields = {}; }
        var rec = { submission_id: row.submission_id, fields: fields, status: row.status, received_at: row.received_at };
        if (row.status === "forwarding") rec.forwarding_started_at = row.delivered_at;
        const claim = await claimLeadForwarding(env, rowKey, rec);
        if (claim !== "claimed") continue;
        d1Attempts++;
        // Review round 6, finding 2: same pre-POST re-check as the KV-loop above.
        if (await wipeIfDeletedAfterWrite(env, rowKey, rec.submission_id, rec.received_at)) continue;
        if (await forwardToAlbato(env, rec.fields)) {
          // Review round 4, finding B (consistency with the KV-loop above):
          // only alert if we still own the row after the completion write.
          if (await markLeadDelivered(env, rowKey, rec)) {
            await notifyTelegram(env, newLeadTelegramMessage(rec.fields));
          }
        } else {
          await releaseLeadToPending(env, rowKey, rec);
        }
      }
    } catch (e) { /* best-effort */ }
  }
}

// Returns a plain {status, body} RESULT rather than a Response — a Response's
// body stream can only be consumed once, but this same result is read by
// BOTH the leader (which computed it) and every concurrent follower waiting
// on the SAME promise (review 2026-09-23, finding 2). Each caller builds its
// own fresh Response from this shared, re-readable result.
async function processDurableLead(env, payload, submissionId, key) {
  var record = await readLeadRecord(env, key);
  if (record && (record.status === "delivered" || record.albato_delivered_at || deliveredLeadsInProcess.has(key))) {
    return { status: 202, body: { ok: true, status: "accepted", submission_id: submissionId, dedup: true } };
  }

  // Finding B (review round 2, P1): a resubmission of an id that was
  // already deleted via /api/admin must not resurrect it. Checked here
  // (intake), not just in the sweeps, and only when there is no live KV
  // record already (an existing non-deleted record means this id was never
  // deleted, or was deleted then legitimately reused — not possible here
  // since submission_id is a fresh UUID per lead, but the check stays
  // scoped to "no record yet" to avoid an extra D1 round-trip on every
  // already-in-flight retry).
  if (!record) {
    var deletionStatus = await checkLeadDeletionStatus(env, submissionId);
    if (deletionStatus === "deleted") {
      return { status: 202, body: { ok: true, status: "accepted", submission_id: submissionId, dedup: true } };
    }
    if (deletionStatus === "unknown") {
      // Review round 4, finding A (P1 regression from round 3's fix): round
      // 3 let "unknown" fall through to normal intake, reasoning that the
      // persisted/delivered tracking below would fail safe with a retryable
      // 502 if nothing could actually be saved. But if this id WAS
      // genuinely already deleted (D1 secretly still holds status='deleted'
      // — we just cannot read it right now because of a real D1/KV outage),
      // falling through RESURRECTS it: fresh PII gets written to KV/R2 and
      // one Albato POST fires before either signal ever resolves. Refuse
      // instead, BEFORE any write/archive/send — the client's write-ahead
      // outbox keeps the lead and retries once the outage clears, so
      // nothing is lost and nothing is resurrected.
      //
      // Guardrail: "unknown" can ONLY occur when a binding EXISTS and its
      // read failed — checkLeadDeletionStatus resolves to "active" whenever
      // NEITHER LEADS_DB nor LEADS_KV is bound at all (both error flags stay
      // false), so a deploy with no bindings configured (legacy Albato-only
      // mode, pipeline not yet activated) never reaches this branch and
      // keeps working exactly as before this change.
      return { status: 503, body: { ok: false, error: "deletion_status_unknown" } };
    }
    // "active" falls through to normal intake below.
  }

  var kvOk = !!record;
  if (!record) {
    var received_at = new Date().toISOString();
    record = { submission_id: submissionId, fields: payload, status: "pending", received_at: received_at };
    kvOk = await putLeadRecord(env, key, record);
    await archiveLeadR2(env, record);
    if (await wipeIfDeletedAfterWrite(env, key, submissionId, received_at)) {
      // Round 5 (Codex-found race): the "active" check above ran before a
      // concurrent admin delete committed — this intake write just
      // resurrected KV+R2 with fresh PII on top of a row D1 now says is
      // 'deleted'. Undo it and stop here: no D1 lease claim, no Albato
      // POST, no notification — a harmless dedup-style 202 to the client.
      return { status: 202, body: { ok: true, status: "accepted", submission_id: submissionId, dedup: true } };
    }
  }
  var d1Insert = await insertLeadD1IfMissing(env, record);
  // "Durably recorded somewhere" — kvOk covers the common case; a
  // non-null D1 insert result means D1 itself is reachable (0 or 1 changed
  // rows are both a real answer), so a KV-less-but-D1-bound deploy still
  // counts as persisted.
  var persisted = kvOk || d1Insert !== null;

  var claim = await claimLeadForwarding(env, key, record);
  if (claim === "delivered") {
    return { status: 202, body: { ok: true, status: "accepted", submission_id: submissionId, dedup: true } };
  }
  if (claim === "pending") {
    if (persisted) {
      // Someone else (another isolate via D1, or a live KV lease) is
      // confirmed to be handling delivery — durable, nothing more to do here.
      return { status: 202, body: { ok: true, status: "accepted", submission_id: submissionId, dedup: true } };
    }
    // Nothing durably recorded AND no one else can be confirmed to be
    // handling it (this only happens when KV exists but every write to it
    // is failing, with no D1 to fall back on) — a "pending" lease claim
    // here would just mean "silently tell the client accepted and lose the
    // lead". Fall through and attempt delivery directly instead: no cross-
    // isolate coordination is possible anyway once storage is this broken.
    claim = "claimed";
  }

  // Review round 6, finding 2 (Codex "send-after-delete"): the claim above
  // only proves ownership AT CLAIM TIME — a concurrent admin delete can
  // land in the gap before this POST. Re-check right before sending;
  // residual window (a POST already in flight when the delete lands) is a
  // documented limitation, see docs/LEAD-PIPELINE.md §10.
  if (await wipeIfDeletedAfterWrite(env, key, submissionId, record.received_at)) {
    return { status: 202, body: { ok: true, status: "accepted", submission_id: submissionId, dedup: true } };
  }

  var delivered = await forwardToAlbato(env, record.fields);
  // Review round 4, finding B: `delivered` only reflects whether Albato
  // itself accepted the lead (used below for the client-facing
  // not_persisted check, which must stay true even if OUR bookkeeping
  // write loses a race) — `stillOwnsCompletion` tracks whether THIS
  // isolate's own completion write actually won ownership. Only alert when
  // both are true; a not_owner/error result means a different actor
  // already changed the row, and this isolate's belief is stale.
  var stillOwnsCompletion = true;
  if (delivered) stillOwnsCompletion = await markLeadDelivered(env, key, record);
  else await releaseLeadToPending(env, key, record);
  if (delivered && stillOwnsCompletion) await notifyTelegram(env, newLeadTelegramMessage(record.fields));

  if (!persisted && !delivered) {
    return { status: 502, body: { ok: false, error: "not_persisted" } };
  }
  return { status: 202, body: { ok: true, status: "accepted", submission_id: submissionId } };
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

  var env = context.env;

  // Ловушка возвращает обычный успех без валидации, доставки и записи заявки.
  // Аггрегатный счётчик (без PII) — best-effort и только если LEADS_KV привязан.
  if (input && typeof input.lf_hp === "string" && input.lf_hp !== "") {
    if (hasDurableStorage(env)) await countLeadHoneypot(env);
    return json(202, {
      ok: true,
      status: "accepted",
      submission_id: LEAD_CONTRACT.isValidSubmissionId(input.submission_id)
        ? input.submission_id : crypto.randomUUID(),
    });
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

  var configuredUrl = env.ALBATO_WEBHOOK_URL;
  var webhookUrl;
  try {
    webhookUrl = new URL(configuredUrl);
    if (webhookUrl.protocol !== "https:") throw new Error("HTTPS required");
  } catch (error) {
    return json(503, { ok: false, error: "temporarily_unavailable" });
  }

  var payload = buildPayload(lead);

  // Graceful degradation: until LEADS_KV is bound, forward exactly as this
  // function did before the durable pipeline existed. Verified byte-for-byte
  // by scripts/verify-lead-hook.mjs, which never binds LEADS_KV.
  if (!hasDurableStorage(env)) {
    var upstream;
    var controller = new AbortController();
    var timeoutId = setTimeout(function () {
      controller.abort();
    }, LEAD_CONTRACT.upstreamTimeoutMs);
    try {
      upstream = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(sheetSafePayload(payload)),
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

  // Durable pipeline (§1.6): KV(pending) → R2 → D1 insert-if-missing → lease
  // → Albato → markDelivered/releaseToPending. Same-isolate de-dup by key;
  // D1 (when bound) is the cross-isolate arbiter for exactly-one-forward.
  var key = "lead:" + lead.submissionId;
  var leaderWork = activeLeadForwards.get(key);
  if (leaderWork) {
    // A concurrent request for the SAME lead is already in flight. Await its
    // REAL outcome (review 2026-09-23, finding 2) instead of blindly telling
    // the client "accepted" — if the leader ultimately fails (KV down, no
    // D1, Albato error), this follower must report the same failure, or the
    // client would clear its write-ahead outbox believing the lead is safe
    // when nothing was actually persisted anywhere.
    var leaderResult = await leaderWork;
    return json(leaderResult.status, Object.assign({}, leaderResult.body, { dedup: true }));
  }
  var work = processDurableLead(env, payload, lead.submissionId, key);
  activeLeadForwards.set(key, work);
  var result;
  try {
    result = await work;
  } finally {
    if (activeLeadForwards.get(key) === work) activeLeadForwards.delete(key);
  }

  if (typeof context.waitUntil === "function") {
    context.waitUntil(sweepPendingLeads(env, key));
  }
  return json(result.status, result.body);
}

export {
  LEAD_CONTRACT, buildPayload, readBodyWithLimit, validateLead,
  hasDurableStorage, sweepPendingLeads, D1_COLUMNS, claimLeadD1Lease,
  markLeadDelivered, releaseLeadToPending, checkLeadDeletionStatus,
};

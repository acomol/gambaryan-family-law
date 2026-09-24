/* gambarian-lead-cron — standalone Cloudflare Worker (Pages Functions have NO Cron).
   TWO scheduled jobs against the SAME KV + D1/R2 stores as /api/lead (review
   round 5 addition: Cloudflare Workers Free allows at most 5 cron triggers
   PER ACCOUNT — assuta-lead-cron already uses 3, leaving exactly 2 here; a
   3-cron deploy failed with error 10072):
     • every 5 min  → sweepPending(): D1 probe + lease-protected re-forward,
       oldest-first (plus the janitor step inside reconcile(), see below)
     • hourly       → hourlyRun(): ALWAYS dumps D1→R2 (owner wants an
       at-most-1h-old snapshot); at UTC hour 2 ALSO runs the once-daily
       backup extras (verify yesterday, purge expired, Sunday heartbeat);
       at UTC hour 18 ALSO runs reconcile() (four storage/delivery checks
       plus the round-5 janitor leg) — gated by event.scheduledTime, not
       wall-clock time, so a slightly-late invocation still resolves the
       SCHEDULED hour correctly. See docs/LEAD-PIPELINE.md §11.

   Also exposes GET /health (review round 5, pipeline-health v1 contract) —
   a JSON status endpoint an external reader (the mini-CRM Apps Script)
   polls hourly, since this client has no Telegram configured and would
   otherwise never see a silent backup/sweep failure. See
   docs/LEAD-PIPELINE.md §12.

   Ported from clients/luxemed/New Lending/cron-worker/src/index.js
   (digitalhook-os-, feature/luxemed-new-lending@613cdd30; contract:
   knowledge/web-dev/ADFIX-SITE-SYSTEM-PLAYBOOK.md §1.6-1.7), adapted to the
   D1 schema in db/leads-schema.sql (Gambaryan fields: name/phone/email,
   corrects_submission_id, full attribution set — no Assuta medical columns).
   Deploy: owner-only; this repository change does not deploy the Worker. */

import { renderNewLeadEmail } from "../../shared/lead-email.js";

const TTL_SECONDS = 7 * 24 * 60 * 60;
const SWEEP_LIMIT = 25;
const ALERT_AFTER_MS = 15 * 60 * 1000;
const FWD_TIMEOUT_MS = 10000;
const FORWARD_LEASE_MS = 15 * 1000;
const JSON_HEADERS = { "content-type": "application/json" };
const BACKUP_PREFIX = "backups/d1/";
const BACKUP_RETENTION_DAYS = 30;
const R2_GAP_TTL_SECONDS = 30 * 24 * 60 * 60;
const JANITOR_WINDOW_DAYS = 30; // review round 5: only chase leftovers for recently-deleted rows
const D1_COLUMNS = [
  "submission_id", "received_at", "status", "delivered_at", "name", "phone", "email",
  "corrects_submission_id", "form_id", "landing_path", "referrer_host",
  "utm_source", "utm_medium", "utm_campaign", "utm_id", "utm_term", "utm_content",
  "gclid", "gbraid", "wbraid", "fbclid", "payload_json",
];

function esc(s) { return String(s == null ? "" : s).replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c])); }
function d1Changes(result) {
  return Number((result && result.meta && result.meta.changes) ?? (result && result.changes) ?? 0);
}
function jerusalemDay(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const get = type => (parts.find(p => p.type === type) || {}).value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function jerusalemDayOffset(offset, value = new Date()) {
  const day = jerusalemDay(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return "";
  return jerusalemDay(new Date(Date.UTC(
    Number(match[1]), Number(match[2]) - 1, Number(match[3]) + offset, 12,
  )));
}
function isJerusalemSunday(value = new Date()) {
  return new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Jerusalem", weekday: "short",
  }).format(value) === "Sun";
}
function rowsFrom(result) {
  if (Array.isArray(result)) return result;
  return result && Array.isArray(result.results) ? result.results : [];
}
async function queryD1(env, sql, args = []) {
  if (!env.LEADS_DB || typeof env.LEADS_DB.prepare !== "function") {
    throw new Error("LEADS_DB не настроен");
  }
  const prepared = env.LEADS_DB.prepare(sql);
  const statement = args.length ? prepared.bind(...args) : prepared;
  return rowsFrom(await statement.all());
}
// Review round 5 addition 2 (pipeline-health v1, owner-approved): records
// into D1's cron_health table — NEVER KV, the account-wide KV free-tier
// write budget (1000/day) is shared with Assuta. `last_run_at` is set on
// EVERY call; `last_ok_at` only when `ok` is true (so a failing run leaves
// the last KNOWN-GOOD timestamp untouched for the health endpoint to
// report). Best-effort: health bookkeeping must never break the job it
// tracks — a D1 error here is swallowed, not rethrown.
async function recordCronHealth(env, job, ok, detail) {
  if (!env.LEADS_DB || typeof env.LEADS_DB.prepare !== "function") return;
  const now = new Date().toISOString();
  const detailText = detail == null ? null : String(detail);
  try {
    if (ok) {
      // Numbered placeholders kept in ASCENDING TEXTUAL order matching the
      // .bind() argument order — the test harness's mock D1 strips numbers
      // and binds anonymous `?` POSITIONALLY, so reusing ?2 for both
      // last_run_at and last_ok_at (valid on real D1/SQLite) would silently
      // shift every later positional bind by one there. `now` is bound
      // twice, once per placeholder, instead.
      await env.LEADS_DB.prepare(
        "INSERT INTO cron_health (job, last_run_at, last_ok_at, detail) VALUES (?1, ?2, ?3, ?4)"
        + " ON CONFLICT(job) DO UPDATE SET last_run_at=excluded.last_run_at, last_ok_at=excluded.last_ok_at, detail=excluded.detail",
      ).bind(job, now, now, detailText).run();
    } else {
      await env.LEADS_DB.prepare(
        "INSERT INTO cron_health (job, last_run_at, last_ok_at, detail) VALUES (?1, ?2, NULL, ?3)"
        + " ON CONFLICT(job) DO UPDATE SET last_run_at=excluded.last_run_at, detail=excluded.detail",
      ).bind(job, now, detailText).run();
    }
  } catch (e) { /* best-effort — never let health bookkeeping break the job it tracks */ }
}
async function r2Text(object) {
  if (!object) return null;
  if (typeof object.text === "function") return object.text();
  if (typeof object.arrayBuffer === "function") {
    return new TextDecoder().decode(await object.arrayBuffer());
  }
  throw new Error("R2 object body недоступен");
}
async function sha256Hex(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
async function listR2Objects(bucket, prefix) {
  if (!bucket || typeof bucket.list !== "function") throw new Error("LEADS_ARCHIVE не настроен");
  const objects = [];
  let cursor;
  do {
    const page = await bucket.list({ prefix, ...(cursor ? { cursor } : {}) });
    objects.push(...((page && page.objects) || []));
    cursor = page && page.truncated ? page.cursor : null;
  } while (cursor);
  return objects;
}
function idList(ids) {
  return `[${ids.map(esc).join(", ")}]`;
}
async function notifyIdChunks(env, prefix, ids) {
  const delivered = [];
  for (let index = 0; index < ids.length; index += 20) {
    const chunk = ids.slice(index, index + 20);
    if (await notifyTelegram(env, `${prefix}: ${idList(chunk)}`)) delivered.push(...chunk);
  }
  return delivered;
}
function backupIntegrityError(message) {
  const error = new Error(message);
  error.backupIntegrity = true;
  return error;
}

async function notifyTelegram(env, text) {
  if (!env.TELEGRAM_TOKEN || !env.TELEGRAM_CHAT_ID) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST", headers: JSON_HEADERS,
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    return !!(res && res.ok);
  } catch (e) { return false; }
}
function newLeadMsg(f) {
  return `🔥 <b>Новая заявка — Гамбарян</b>\n📞 <b>${esc(f.phone)}</b>\n👤 ${esc(f.name)}\n`
    + (f.email ? `✉️ ${esc(f.email)}\n` : "")
    + `Источник: ${esc(f.utm_source || "(direct)")}\nID: ${esc(f.submission_id)}`;
}
function undeliveredMsg(rec) {
  const f = rec.fields || {};
  return `⚠️ <b>НЕДОСТАВКА лида</b>\nЛид у нас сохранён, Albato не принял.\n`
    + `📞 ${esc(f.phone)} · 👤 ${esc(f.name)}\nID: ${esc(f.submission_id)}\nПолучен: ${esc(rec.received_at)}.`;
}

function d1Values(rec) {
  const f = rec.fields || {};
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
async function upsertD1(env, rec) {
  if (!env.LEADS_DB || typeof env.LEADS_DB.prepare !== "function") return false;
  try {
    // Protects BOTH terminal states from regressing via a stale upsert:
    // 'delivered' (as before) and 'deleted' (review round 2, finding B —
    // functions/api/admin.js soft-deletes by setting status='deleted' and
    // keeping the row; this cron worker must never flip it back).
    await env.LEADS_DB.prepare(
      `INSERT INTO leads (${D1_COLUMNS.join(",")})
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22)
       ON CONFLICT(submission_id) DO UPDATE SET
         status=CASE WHEN leads.status IN ('delivered','deleted') THEN leads.status ELSE excluded.status END,
         delivered_at=CASE WHEN leads.status IN ('delivered','deleted') THEN leads.delivered_at ELSE excluded.delivered_at END`
    ).bind(...d1Values(rec)).run();
    return true;
  } catch (e) { return false; }
}
// Insert-only: never touches an EXISTING row (ON CONFLICT DO NOTHING), unlike
// upsertD1 above. Used as the pre-claim step in claimD1Lease so a stale
// KV-sourced snapshot can never regress a row another isolate is actively
// holding (review 2026-09-23, finding 4 — see claimD1Lease comment).
async function insertD1IfMissing(env, rec) {
  if (!env.LEADS_DB || typeof env.LEADS_DB.prepare !== "function") return null;
  try {
    const result = await env.LEADS_DB.prepare(
      `INSERT INTO leads (${D1_COLUMNS.join(",")})
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22)
       ON CONFLICT(submission_id) DO NOTHING`
    ).bind(...d1Values(rec)).run();
    return d1Changes(result);
  } catch (e) { return null; }
}
// Review 2026-09-23, finding 4, P1: the previous version called upsertD1()
// (an UPSERT that overwrites status/delivered_at whenever the CURRENT row
// isn't already 'delivered') BEFORE attempting the claim. When `rec` is a
// STALE snapshot read from KV — e.g. cron's own KV list still shows
// "pending" because it was read moments before Pages Function claimed the
// D1 lease and flipped it to "forwarding" — that upsert silently regressed
// the live row back to 'pending', and the very next UPDATE below then
// matched `status='pending'` and stole the lease out from under the isolate
// that was still actively forwarding it. Two isolates then POST to Albato
// concurrently for the same lead. Fix: use insert-if-missing instead, which
// never touches a row that already exists, so a genuinely live 'forwarding'
// row keeps its true status/delivered_at and the claim UPDATE below
// correctly sees it as still held (delivered_at > expiredBefore) and backs
// off with 'pending'. A readback of delivered_at after a successful claim
// (the "owner token" check) guards against any UPDATE result miscount.
// Review round 3, finding 2 (mirrors functions/api/lead.js's
// upsertLeadD1Guarded): a completion write for a forwarding attempt this
// worker believes it still owns must not clobber a row a DIFFERENT actor
// (an admin delete via functions/api/admin.js, or a newer isolate that
// reclaimed an expired lease) has since moved to a different/terminal
// state in D1. Guarded UPDATE restricts the write to rows STILL
// 'forwarding' under precisely OUR OWN lease timestamp
// (status='forwarding' AND delivered_at=expectedLeaseStart).
//
// Return contract: true (applied, or a plain/insert path succeeded) |
// false (NO D1 binding configured at all — legacy KV/Albato-only mode,
// unrelated to CAS) | "not_owner" (the row exists but is no longer under
// our active lease) | "error" (review round 4, finding C: D1 IS bound but
// the guarded query itself threw — e.g. a transient D1 outage. This is NOT
// the same as "no D1 configured": we cannot confirm ownership, so it must
// be treated exactly like "not_owner"). Callers MUST skip their own
// subsequent KV write and delivery notification on EITHER "not_owner" OR
// "error" — see sweepPending below.
async function upsertD1Guarded(env, rec, expectedLeaseStart) {
  if (!env.LEADS_DB || typeof env.LEADS_DB.prepare !== "function") return false;
  if (!expectedLeaseStart) return upsertD1(env, rec);
  try {
    // Placeholder numbers stay in ASCENDING TEXTUAL order matching the
    // .bind() argument order — see the identical note on
    // functions/api/lead.js's upsertLeadD1Guarded (the test harness's mock
    // D1 binds anonymous `?` positionally, not by `?N` index).
    const cols = D1_COLUMNS.filter(c => c !== "submission_id");
    const setClause = cols.map((c, i) => `${c}=?${i + 1}`).join(",");
    const values = d1Values(rec);
    const submissionPlaceholder = `?${cols.length + 1}`;
    const guardPlaceholder = `?${cols.length + 2}`;
    const result = await env.LEADS_DB.prepare(
      `UPDATE leads SET ${setClause}
       WHERE submission_id=${submissionPlaceholder} AND status='forwarding' AND delivered_at=${guardPlaceholder}`
    ).bind(...values.slice(1), rec.submission_id, expectedLeaseStart).run();
    if (d1Changes(result) > 0) return true;
    const probe = await env.LEADS_DB.prepare("SELECT 1 AS found FROM leads WHERE submission_id=?1").bind(rec.submission_id).all();
    if (probe && probe.results && probe.results[0]) return "not_owner"; // exists, but not under OUR active lease (stolen, released, or already terminal) — do not touch
    return (await insertD1IfMissing(env, rec)) !== null; // never existed — a plain insert is safe
  } catch (e) { return "error"; } // D1 bound but the query itself failed — CANNOT confirm ownership; never conflate with "not configured"
}
async function claimD1Lease(env, rec, startedAt) {
  if (!env.LEADS_DB || typeof env.LEADS_DB.prepare !== "function") return "unavailable";
  await insertD1IfMissing(env, rec);
  const expiredBefore = new Date(new Date(startedAt).getTime() - FORWARD_LEASE_MS).toISOString();
  try {
    const result = await env.LEADS_DB.prepare(
      `UPDATE leads SET status='forwarding', delivered_at=?1
       WHERE submission_id=?2
         AND (status='pending' OR (status='forwarding' AND delivered_at<=?3))`
    ).bind(startedAt, rec.submission_id, expiredBefore).run();
    if (d1Changes(result) > 0) {
      // Owner-token readback: confirm OUR startedAt actually stuck before
      // trusting the affected-row count.
      const confirmed = await env.LEADS_DB.prepare(
        "SELECT delivered_at FROM leads WHERE submission_id=?1"
      ).bind(rec.submission_id).all();
      const confirmedRow = confirmed && confirmed.results && confirmed.results[0];
      if (confirmedRow && confirmedRow.delivered_at === startedAt) return "claimed";
      return "pending";
    }
    const found = await env.LEADS_DB.prepare(
      "SELECT status FROM leads WHERE submission_id=?1"
    ).bind(rec.submission_id).all();
    const row = found && found.results && found.results[0];
    return row && row.status === "delivered" ? "delivered" : "pending";
  } catch (e) { return "unavailable"; }
}

async function putRecord(env, key, rec, deliveredTtl = false) {
  const options = {
    metadata: {
      status: rec.status,
      received_at: rec.received_at,
      forwarding_started_at: rec.forwarding_started_at || "",
      albato_delivered_at: rec.albato_delivered_at || "",
      // Review round 6, finding 3c: exponential backoff — the KV-list
      // candidate filter reads this straight from metadata (no extra
      // .get() needed) to skip a lead that isn't due for retry yet.
      next_attempt_at: rec.next_attempt_at || "",
    },
  };
  if (deliveredTtl) options.expirationTtl = TTL_SECONDS;
  try {
    await env.LEADS_KV.put(key, JSON.stringify(rec), options);
    return true;
  } catch (e) { return false; }
}
async function putRecordWithRetry(env, key, rec, deliveredTtl = false) {
  if (await putRecord(env, key, rec, deliveredTtl)) return true;
  return putRecord(env, key, rec, deliveredTtl);
}
// Same sink rule as functions/api/lead.js: Albato writes to Google Sheets as typed input,
// so values starting with = + - @ tab CR get a leading apostrophe on the way OUT only.
const SHEET_SAFE_KEYS = ["landing_path", "name", "phone", "email", "referrer_host",
  "utm_source", "utm_medium", "utm_campaign", "utm_id", "utm_term", "utm_content",
  "gclid", "gbraid", "wbraid", "fbclid"];
function sheetSafePayload(fields) {
  const out = { ...fields };
  for (const key of SHEET_SAFE_KEYS) {
    if (typeof out[key] === "string" && /^[=+\-@\t\r]/.test(out[key])) out[key] = "'" + out[key];
  }
  return out;
}
async function forwardToAlbato(env, fields) {
  if (!env.ALBATO_WEBHOOK_URL) return false;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FWD_TIMEOUT_MS);
  try {
    // Branded office email (owner request), same renderer as
    // functions/api/lead.js — from the RAW fields, before
    // sheetSafePayload() below, so it never shows a sheetSafe() apostrophe.
    // Nothing is stored anywhere; a cron RETRY renders it again too.
    const email = renderNewLeadEmail(fields);
    const outgoing = { ...sheetSafePayload(fields), email_subject: email.subject, email_html: email.html };
    const res = await fetch(env.ALBATO_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(outgoing),
      signal: ctrl.signal,
    });
    return !!(res && res.ok);
  } catch (e) { return false; } finally { clearTimeout(t); }
}
async function listLeadKeys(env) {
  const all = [];
  let cursor;
  do {
    const page = await env.LEADS_KV.list({ prefix: "lead:", limit: 1000, ...(cursor ? { cursor } : {}) });
    all.push(...(page.keys || []));
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return all;
}

async function probeD1(env) {
  if (!env.LEADS_KV || typeof env.LEADS_KV.get !== "function" || typeof env.LEADS_KV.put !== "function") {
    return false;
  }

  // Review round 6, finding 4: everything below talks to KV, and a KV
  // exception here used to propagate all the way out of sweepPending
  // (which has no try/catch around this very first call) — an outage in
  // the free-tier-shared KV namespace could crash the whole sweep instead
  // of just failing the probe. Never let this function throw.
  try {
    let healthy = false;
    try {
      await queryD1(env, "SELECT 1 AS ok");
      healthy = true;
    } catch (e) { /* failure is counted below */ }

    if (healthy) {
      const failures = await env.LEADS_KV.get("ops:d1_probe_fail");
      const alerted = await env.LEADS_KV.get("ops:d1_alerted");
      if (typeof env.LEADS_KV.delete === "function") {
        if (failures != null) await env.LEADS_KV.delete("ops:d1_probe_fail");
      } else {
        if (failures != null) await env.LEADS_KV.put("ops:d1_probe_fail", "0");
      }
      if (alerted && await notifyTelegram(env, "✅ D1 восстановлен")) {
        if (typeof env.LEADS_KV.delete === "function") await env.LEADS_KV.delete("ops:d1_alerted");
        else await env.LEADS_KV.put("ops:d1_alerted", "");
      }
      return true;
    }

    const previous = Number(await env.LEADS_KV.get("ops:d1_probe_fail")) || 0;
    const failures = previous + 1;
    await env.LEADS_KV.put("ops:d1_probe_fail", String(failures));
    const lastAlert = Number(await env.LEADS_KV.get("ops:d1_alerted")) || 0;
    if (failures >= 3 && (!lastAlert || failures - lastAlert >= 12)) {
      const alerted = await notifyTelegram(env,
        "🔴 D1 недоступен ~15 мин, доставка остановлена, лиды копятся в KV");
      if (alerted) await env.LEADS_KV.put("ops:d1_alerted", String(failures));
    }
    return false;
  } catch (e) { return false; } // KV (or anything else) threw — treat as a failed probe, never propagate
}

// Deletion status (review 2026-09-23, finding 5 + round-2 finding B): a
// lead deleted via /api/admin must never be resurrected by this sweep. D1
// status='deleted' is the AUTHORITATIVE marker (admin.js soft-deletes,
// keeping the row); KV `tomb:<id>` is a SECONDARY signal for when D1 can't
// be queried. A read error on BOTH signals fails closed (treated as
// deleted, no forward) rather than risking a resurrected delivery.
function tombstoneKey(submissionId) { return `tomb:${submissionId}`; }
async function isDeleted(env, submissionId) {
  let d1Status = null;
  let d1Error = false;
  if (env.LEADS_DB && typeof env.LEADS_DB.prepare === "function") {
    try {
      const found = await env.LEADS_DB.prepare("SELECT status FROM leads WHERE submission_id=?1").bind(submissionId).all();
      const row = found && found.results && found.results[0];
      d1Status = row ? row.status : null;
    } catch (e) { d1Error = true; }
  }
  if (d1Status === "deleted") return true;

  let kvError = false;
  let kvTombstoned = false;
  if (env.LEADS_KV && typeof env.LEADS_KV.get === "function") {
    try { kvTombstoned = (await env.LEADS_KV.get(tombstoneKey(submissionId))) != null; }
    catch (e) { kvError = true; }
  }
  if (kvTombstoned) return true;
  if (d1Error && kvError) return true; // both signals unreadable — fail closed
  return false;
}

// Review round 6, findings 1 and 2 (Codex-found, mirrors
// functions/api/lead.js's wipeIfDeletedAfterWrite): re-reads the deletion
// status RIGHT NOW and, if deleted, wipes the KV key (and R2 archive
// object, when receivedAt is given). Used in TWO places per candidate:
// immediately before every Albato POST (finding 2 — the lease claim only
// proves ownership AT CLAIM TIME; a concurrent admin delete can land in the
// gap before the send) and immediately after a completion KV write
// (finding 1 — the SAME admin delete can instead land between the CAS
// commit and that write, resurrecting PII into KV and, without this check,
// triggering a PII-carrying Telegram alert for a lead that is already
// deleted). Reuses isDeleted()'s existing fail-closed semantics (both D1
// and KV unreadable → treated as deleted) — the SAME posture already used
// for the pre-claim candidate check, so this does not introduce a new risk
// model into this file. A deleted lead's D1 row is never written by this
// helper — only KV/R2 are touched, matching the admin-delete tombstone
// contract in functions/api/admin.js.
async function wipeIfDeletedAfterWrite(env, key, submissionId, receivedAt) {
  if (!(await isDeleted(env, submissionId))) return false;
  if (env.LEADS_KV && typeof env.LEADS_KV.delete === "function") {
    try { await env.LEADS_KV.delete(key); } catch (e) { /* best-effort */ }
  }
  if (receivedAt && env.LEADS_ARCHIVE && typeof env.LEADS_ARCHIVE.delete === "function") {
    try { await env.LEADS_ARCHIVE.delete(`leads/${String(receivedAt).slice(0, 10)}/${submissionId}.md`); } catch (e) { /* best-effort */ }
  }
  return true;
}

// Review round 6, finding 3c (Codex "KV write budget"): without backoff, a
// PERSISTENTLY failing Albato (down, timing out, or misconfigured) gets
// re-claimed and re-released on EVERY 5-min sweep forever — 2 KV.put per
// attempt, ~576/day for one stuck lead alone, against a 1000/day
// account-wide free-tier budget shared with Assuta. Exponential backoff
// (5min, 10min, 20min, 40min, capped at 60min) means a persistently-failing
// lead costs roughly one claim per backoff STEP, not one per 5-min sweep.
const BACKOFF_BASE_MS = 5 * 60 * 1000;
const BACKOFF_CAP_MS = 60 * 60 * 1000;
function computeNextAttemptAt(priorAttemptCount, now) {
  const stepMs = Math.min(BACKOFF_BASE_MS * (2 ** Math.max(0, priorAttemptCount)), BACKOFF_CAP_MS);
  return new Date((now || Date.now()) + stepMs).toISOString();
}
// A DEDICATED, narrow UPDATE — deliberately NOT routed through
// upsertD1/upsertD1Guarded (which are driven by the full D1_COLUMNS list
// and rewrite every column): attempt_count/next_attempt_at are
// cron-worker-only bookkeeping columns that functions/api/lead.js's own
// D1_COLUMNS never lists, so its writes correctly leave them untouched
// (SQL UPDATE only touches columns named in SET) — this stays true for
// this table's OTHER writers precisely because it is its own statement.
// Best-effort and NOT CAS-guarded: worst case on a lost race is one extra
// retry cycle, never data loss or a resurrected delivery.
async function recordFailedAttempt(env, submissionId, priorAttemptCount) {
  const attemptCount = (priorAttemptCount || 0) + 1;
  const nextAttemptAt = computeNextAttemptAt(priorAttemptCount || 0);
  if (env.LEADS_DB && typeof env.LEADS_DB.prepare === "function") {
    try {
      await env.LEADS_DB.prepare(
        "UPDATE leads SET attempt_count=?1, next_attempt_at=?2 WHERE submission_id=?3",
      ).bind(attemptCount, nextAttemptAt, submissionId).run();
    } catch (e) { /* best-effort — worst case this lead retries sooner than ideal, never lost */ }
  }
  return { attemptCount, nextAttemptAt };
}
// Review round 7, finding P1(b) (Codex gpt-6-sol on live 0aaf9e1): D1 is
// the SOLE source of truth for backoff. KV metadata's own next_attempt_at
// (round 6) could silently fail to persist — see the removed claim-write
// note in sweepPending's KV loop below — so the KV-loop candidate filter
// must no longer trust it at all; every candidate's backoff is read here,
// directly from D1, before any claim or KV write.
async function readBackoffState(env, submissionId) {
  if (!env.LEADS_DB || typeof env.LEADS_DB.prepare !== "function") return null;
  try {
    const found = await env.LEADS_DB.prepare(
      "SELECT attempt_count, next_attempt_at FROM leads WHERE submission_id=?1",
    ).bind(submissionId).all();
    const row = found && found.results && found.results[0];
    if (!row) return null;
    return { attemptCount: row.attempt_count || 0, nextAttemptAt: row.next_attempt_at || null };
  } catch (e) { return null; } // can't confirm — proceed; claimD1Lease's own CAS still protects correctness, worst case one wasted claim attempt
}

async function sweepPending(env) {
  // Review round 6, finding 4: sweep's health must reflect EVERY phase, not
  // just "we reached the end without an uncaught exception". `ok` starts
  // true and is downgraded the moment ANY phase fails; recordCronHealth
  // runs in `finally` so last_run_at ALWAYS advances even on an early
  // return or an exception this function itself doesn't otherwise handle.
  let ok = true;
  // Review round 6, finding 3b: a submission_id must be attempted AT MOST
  // ONCE per sweep run — the KV-phase and the D1-phase below both target
  // the SAME rows (a KV-visible pending/forwarding lead also matches the
  // D1-phase's WHERE clause), and without this guard a single stuck lead
  // was claimed and KV-written TWICE per invocation (finding 3, "KV write
  // budget": 4 KV.put per sweep × 288 sweeps/day ≈ 1150, over the
  // account-wide 1000/day free-tier budget shared with Assuta).
  const processedIds = new Set();
  try {
    if (!(await probeD1(env))) { ok = false; return; }

    // Review round 2, finding D (P2): a KV-phase failure (e.g. LEADS_KV.list()
    // throwing) must not prevent the independent D1-sourced retry loop below
    // from running — isolate the two phases.
    try {
      const keys = await listLeadKeys(env);
      const now = Date.now();
      const candidates = keys
        .filter(k => {
          const m = k.metadata || {};
          // Round 7, finding P1(b): the KV-metadata next_attempt_at check
          // that lived here in round 6 is REMOVED — it could never be
          // trusted (see the note below on the removed claim-write); D1 is
          // read per-candidate instead, right before any claim.
          if (m.status === "pending") return true;
          const started = new Date(m.forwarding_started_at || 0).getTime();
          return m.status === "forwarding" && started > 0 && (now - started) >= FORWARD_LEASE_MS;
        })
        .sort((a, b) => new Date((a.metadata || {}).received_at || 0) - new Date((b.metadata || {}).received_at || 0));

      let attempts = 0;
      for (const key of candidates) {
        if (attempts >= SWEEP_LIMIT) break;
        const submissionId = key.name.slice("lead:".length);
        if (processedIds.has(submissionId)) continue;
        if (await isDeleted(env, submissionId)) continue;
        const raw = await env.LEADS_KV.get(key.name);
        if (!raw) continue;
        let rec; try { rec = JSON.parse(raw); } catch (e) { continue; }
        if (!rec || rec.status === "delivered") continue;
        processedIds.add(submissionId);
        if (rec.albato_delivered_at) {
          rec.status = "delivered";
          rec.delivered_at = rec.albato_delivered_at;
          await upsertD1(env, rec);
          await putRecordWithRetry(env, key.name, rec, true);
          continue;
        }
        // Round 6, finding 3a: with no Albato URL configured at all, this
        // lead can NEVER be delivered right now — skip BEFORE any
        // claim/KV write instead of claiming-then-immediately-releasing it
        // (2 wasted KV.put) every single sweep forever.
        if (!env.ALBATO_WEBHOOK_URL) continue;

        // Review round 7, finding P1(b) (Codex gpt-6-sol on live 0aaf9e1):
        // read the backoff state from D1 — the source of truth — BEFORE
        // any claim or KV write. Repro: the round-6 KV-loop wrote
        // 'forwarding' (claim) and then, on a FAST Albato failure,
        // 'pending'+next_attempt_at (release) to the SAME key within the
        // same second — Cloudflare KV allows only 1 write/sec/key
        // (https://developers.cloudflare.com/kv/platform/limits/), so the
        // second write was silently rejected and the backoff never landed
        // in KV at all (12 sweeps -> 12 accepted + 12 rejected puts,
        // attempt_count stuck at 1 in D1). Trusting KV metadata for
        // backoff was therefore unsafe; D1 always has it (recordFailedAttempt
        // writes there directly, no KV involved).
        const backoffState = await readBackoffState(env, submissionId);
        if (backoffState && backoffState.nextAttemptAt && new Date(backoffState.nextAttemptAt).getTime() > now) continue;
        rec.attempt_count = (backoffState && backoffState.attemptCount) || 0;

        const startedAt = new Date().toISOString();
        const claim = await claimD1Lease(env, rec, startedAt);
        if (claim === "delivered") {
          rec.status = "delivered";
          rec.delivered_at = rec.delivered_at || startedAt;
          await putRecordWithRetry(env, key.name, rec, true);
          continue;
        }
        if (claim !== "claimed") continue;
        attempts++;

        // Review round 7, finding P1(b): NO separate "forwarding" KV write
        // here anymore. claimD1Lease just above is already the atomic
        // cross-isolate arbiter — a KV write here, followed by a SECOND
        // write below once the outcome is known, is exactly the
        // same-key-same-second double write that silently lost the
        // backoff write to Cloudflare's 1-write/sec/key limit (see the
        // note above readBackoffState's call). Track the in-flight state
        // in memory only; exactly ONE KV.put happens below, for the FINAL
        // outcome of this attempt.
        rec.status = "forwarding";
        rec.forwarding_started_at = startedAt;

        // Review round 6, finding 2 (Codex "send-after-delete"): the claim
        // above only proves ownership AT CLAIM TIME — re-check right before
        // sending. Residual window (a POST already in flight when the
        // delete lands) is a documented limitation, see
        // docs/LEAD-PIPELINE.md §10.
        if (await wipeIfDeletedAfterWrite(env, key.name, rec.submission_id, rec.received_at)) continue;

        if (await forwardToAlbato(env, rec.fields || {})) {
          const deliveredAt = new Date().toISOString();
          rec.status = "delivered";
          rec.delivered_at = deliveredAt;
          rec.albato_delivered_at = deliveredAt;
          delete rec.forwarding_started_at;
          const d1Result = await upsertD1Guarded(env, rec, startedAt);
          // Review round 4, finding C: an "error" (D1 bound but the guard
          // query itself threw) must be treated exactly like "not_owner" —
          // never like the legacy "no D1 configured" `false` fallback.
          if (d1Result !== "not_owner" && d1Result !== "error") {
            await putRecordWithRetry(env, key.name, rec, true);
            // Review round 6, finding 1 (Codex-found, mirrors lead.js's
            // markLeadDelivered): a concurrent admin delete could ALSO land
            // between the CAS commit just above and this KV write.
            if (!(await wipeIfDeletedAfterWrite(env, key.name, rec.submission_id, rec.received_at))) {
              await notifyTelegram(env, newLeadMsg(rec.fields || {}));
            }
          }
          continue;
        }

        rec.status = "pending";
        delete rec.forwarding_started_at;
        const d1ReleaseResult = await upsertD1Guarded(env, rec, startedAt);
        if (d1ReleaseResult === "not_owner" || d1ReleaseResult === "error") continue;
        const backoff = await recordFailedAttempt(env, rec.submission_id, rec.attempt_count || 0);
        rec.attempt_count = backoff.attemptCount;
        rec.next_attempt_at = backoff.nextAttemptAt;
        const age = now - new Date(rec.received_at || now).getTime();
        if (age > ALERT_AFTER_MS && !rec.alerted) {
          rec.alerted = await notifyTelegram(env, undeliveredMsg(rec));
        }
        await putRecord(env, key.name, rec);
      }
    } catch (e) {
      ok = false; /* best-effort — KV-phase failure must not block the D1 phase below */
    }

    // D1-only stragglers (review 2026-09-23, finding 3): a lead whose EVERY KV
    // write failed at intake time has no `lead:<id>` key at all, so the
    // KV-list loop above can never find it. Rebuild a KV-shaped record from
    // payload_json and run it through the same claim/forward path;
    // claimD1Lease's insert-if-missing + atomic UPDATE safely no-op if
    // another isolate (or the KV loop above) is already handling this id.
    if (env.LEADS_DB && typeof env.LEADS_DB.prepare === "function" && env.LEADS_KV) {
      try {
        const expiredBefore = new Date(Date.now() - FORWARD_LEASE_MS).toISOString();
        const nowIso = new Date().toISOString();
        const rows = await queryD1(env,
          "SELECT submission_id, received_at, status, delivered_at, payload_json, attempt_count FROM leads"
          + " WHERE (status='pending' OR (status='forwarding' AND delivered_at<=?1))"
          + " AND (next_attempt_at IS NULL OR next_attempt_at<=?2)"
          + " ORDER BY received_at ASC LIMIT ?3",
          [expiredBefore, nowIso, SWEEP_LIMIT * 2]);
        let d1Attempts = 0;
        for (const row of rows) {
          if (d1Attempts >= SWEEP_LIMIT) break;
          const submissionId = String(row.submission_id);
          if (processedIds.has(submissionId)) continue; // round 6, finding 3b — already handled by the KV loop above
          if (await isDeleted(env, submissionId)) continue;
          const key = `lead:${submissionId}`;

          // Finding A (review round 2, P1 regression): KV is the delivery
          // source of truth. If Albato already accepted this lead but the
          // FINAL D1 write failed — leaving a stale D1 row this loop would
          // otherwise treat as a fresh candidate — repair D1 from the KV
          // record WITHOUT re-posting to Albato.
          let kvRecordForRow = null;
          if (typeof env.LEADS_KV.get === "function") {
            try {
              const raw = await env.LEADS_KV.get(key);
              kvRecordForRow = raw ? JSON.parse(raw) : null;
            } catch (e) { kvRecordForRow = null; }
          }
          if (kvRecordForRow && (kvRecordForRow.status === "delivered" || kvRecordForRow.albato_delivered_at)) {
            processedIds.add(submissionId);
            await upsertD1(env, kvRecordForRow);
            continue;
          }
          // Round 6, finding 3a: same skip as the KV loop — nothing useful
          // to do without an Albato URL configured.
          if (!env.ALBATO_WEBHOOK_URL) continue;
          processedIds.add(submissionId);

          let fields; try { fields = JSON.parse(row.payload_json || "{}"); } catch (e) { fields = {}; }
          const rec = { submission_id: submissionId, fields, status: row.status, received_at: row.received_at };
          if (row.status === "forwarding") rec.forwarding_started_at = row.delivered_at;
          rec.attempt_count = row.attempt_count || 0;

          const startedAt = new Date().toISOString();
          const claim = await claimD1Lease(env, rec, startedAt);
          if (claim !== "claimed") continue;
          d1Attempts++;
          // Review round 7, finding P1(b): same fix as the KV loop above —
          // no standalone "forwarding" KV write here; exactly ONE KV.put
          // for this candidate, reflecting the final outcome below. This
          // loop's OWN candidate query already reads next_attempt_at
          // straight from D1 (see the WHERE clause above), so it never had
          // the backoff-source bug — only the double-write-per-run one.
          rec.status = "forwarding";
          rec.forwarding_started_at = startedAt;

          // Review round 6, finding 2: same pre-POST re-check as the KV loop.
          if (await wipeIfDeletedAfterWrite(env, key, submissionId, rec.received_at)) continue;

          if (await forwardToAlbato(env, rec.fields || {})) {
            const deliveredAt = new Date().toISOString();
            rec.status = "delivered";
            rec.delivered_at = deliveredAt;
            rec.albato_delivered_at = deliveredAt;
            delete rec.forwarding_started_at;
            const d1Result = await upsertD1Guarded(env, rec, startedAt);
            // Round 4, finding C: "error" must be skipped exactly like
            // "not_owner" (see the KV-loop above).
            if (d1Result !== "not_owner" && d1Result !== "error") {
              await putRecordWithRetry(env, key, rec, true);
              // Review round 6, finding 1: same post-write re-check as the KV loop.
              if (!(await wipeIfDeletedAfterWrite(env, key, submissionId, rec.received_at))) {
                await notifyTelegram(env, newLeadMsg(rec.fields || {}));
              }
            }
          } else {
            rec.status = "pending";
            delete rec.forwarding_started_at;
            const d1ReleaseResult = await upsertD1Guarded(env, rec, startedAt);
            if (d1ReleaseResult !== "not_owner" && d1ReleaseResult !== "error") {
              const backoff = await recordFailedAttempt(env, submissionId, rec.attempt_count || 0);
              rec.attempt_count = backoff.attemptCount;
              rec.next_attempt_at = backoff.nextAttemptAt;
              await putRecord(env, key, rec);
            }
          }
        }
      } catch (e) {
        ok = false; /* best-effort */
      }
    }
  } catch (e) {
    ok = false;
  } finally {
    await recordCronHealth(env, "sweep", ok);
  }
}

// Review round 6, small item: `now` threads through from hourlyRun's own
// hour-gating clock — without this, a test (or a scheduled invocation that
// runs slightly late across a day boundary) could compute the HOUR from one
// instant and the DAY KEY from a different one (this function's own
// `new Date()`), pointing verify/dump/purge at inconsistent days.
async function verifyPreviousDump(env, now) {
  const day = jerusalemDayOffset(-1, now || new Date());
  if (!env.LEADS_ARCHIVE || typeof env.LEADS_ARCHIVE.get !== "function") {
    await notifyTelegram(env, `⚠️ не удалось проверить бэкап: LEADS_ARCHIVE не настроен (${day})`);
    return { state: 2, day };
  }

  try {
    const manifestObject = await env.LEADS_ARCHIVE.get(`${BACKUP_PREFIX}${day}/manifest.json`);
    if (!manifestObject) {
      await notifyTelegram(env, `⚠️ дамп за ${day} отсутствует`);
      return { state: 1, day };
    }

    const manifest = JSON.parse(await r2Text(manifestObject));
    const dumpObject = await env.LEADS_ARCHIVE.get(`${BACKUP_PREFIX}${day}/leads.ndjson`);
    if (!dumpObject) throw new Error("leads.ndjson отсутствует");
    const ndjson = await r2Text(dumpObject);
    const actualSha = await sha256Hex(ndjson);
    if (actualSha !== manifest.sha256) throw backupIntegrityError("sha256 не совпадает");

    const rows = [];
    for (const line of ndjson.split(/\r?\n/)) {
      if (!line.trim()) continue;
      rows.push(JSON.parse(line));
    }
    if (!Number.isInteger(manifest.row_count) || rows.length !== manifest.row_count) {
      throw backupIntegrityError(`row_count ${rows.length} != ${manifest.row_count}`);
    }

    const liveRows = await queryD1(env, "SELECT submission_id FROM leads");
    const liveIds = new Set(liveRows.map(row => String(row.submission_id)));
    const dumpIds = new Set(rows.map(row => String(row.submission_id || "")).filter(Boolean));
    const deleted = [...dumpIds].filter(id => !liveIds.has(id)).sort();
    if (deleted.length) {
      await notifyIdChunks(env, `⚠️ Бэкап за ${day}: подтвердите admin-delete`, deleted);
    }
    return { state: 0, day, manifest, deleted };
  } catch (error) {
    const message = error && error.backupIntegrity
      ? `⚠️ не удалось проверить бэкап: целостность нарушена за ${day} (${esc(error.message)})`
      : `⚠️ не удалось проверить бэкап за ${day}: ${esc(error && error.message)}`;
    await notifyTelegram(env, message);
    return { state: 2, day };
  }
}

async function dumpD1ToR2(env, now) {
  const day = jerusalemDay(now || new Date());
  if (!env.LEADS_ARCHIVE || typeof env.LEADS_ARCHIVE.put !== "function"
      || typeof env.LEADS_ARCHIVE.get !== "function") {
    await notifyTelegram(env, `⚠️ не удалось проверить бэкап: LEADS_ARCHIVE не настроен (${day})`);
    return null;
  }

  try {
    const rows = [];
    let cursor = "";
    for (;;) {
      const page = await queryD1(env,
        "SELECT * FROM leads WHERE submission_id > ?1 ORDER BY submission_id LIMIT 500", [cursor]);
      rows.push(...page);
      if (page.length < 500) break;
      const nextCursor = String(page[page.length - 1].submission_id || "");
      if (!nextCursor || nextCursor === cursor) throw new Error("keyset cursor не продвинулся");
      cursor = nextCursor;
    }

    const ndjson = rows.length ? `${rows.map(row => JSON.stringify(row)).join("\n")}\n` : "";
    const bytes = new TextEncoder().encode(ndjson);
    const statusCounts = {};
    for (const row of rows) {
      const status = String(row.status || "");
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }
    const received = rows.map(row => row.received_at).filter(Boolean).sort();
    const manifest = {
      day,
      snapshot_at: new Date().toISOString(),
      row_count: rows.length,
      byte_length: bytes.byteLength,
      sha256: await sha256Hex(bytes),
      columns: D1_COLUMNS,
      status_counts: Object.fromEntries(Object.entries(statusCounts).sort(([a], [b]) => a.localeCompare(b))),
      min_received_at: received.length ? received[0] : null,
      max_received_at: received.length ? received[received.length - 1] : null,
      schema_version: 1,
    };
    const base = `${BACKUP_PREFIX}${day}/`;
    await env.LEADS_ARCHIVE.put(`${base}leads.ndjson`, ndjson, {
      httpMetadata: { contentType: "application/x-ndjson; charset=utf-8" },
    });
    await env.LEADS_ARCHIVE.put(`${base}manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
    });

    const readback = await r2Text(await env.LEADS_ARCHIVE.get(`${base}leads.ndjson`));
    const readbackSha = readback == null ? "" : await sha256Hex(readback);
    const integrityOk = readbackSha === manifest.sha256;
    if (!integrityOk) {
      await notifyTelegram(env, `⚠️ целостность бэкапа нарушена за ${day}: same-run sha256 не совпадает`);
    }
    return { manifest, integrity_ok: integrityOk };
  } catch (error) {
    await notifyTelegram(env, `⚠️ не удалось проверить бэкап за ${day}: ${esc(error && error.message)}`);
    return null;
  }
}

async function purgeExpiredDumps(env, now) {
  if (!env.LEADS_ARCHIVE || typeof env.LEADS_ARCHIVE.delete !== "function") {
    throw new Error("LEADS_ARCHIVE не настроен");
  }
  const cutoff = jerusalemDayOffset(-BACKUP_RETENTION_DAYS, now || new Date());
  const objects = await listR2Objects(env.LEADS_ARCHIVE, BACKUP_PREFIX);
  const expired = objects.filter(object => {
    const match = /^backups\/d1\/(\d{4}-\d{2}-\d{2})\//.exec(object.key || "");
    return match && match[1] < cutoff;
  });
  for (const object of expired) await env.LEADS_ARCHIVE.delete(object.key);
  return expired.length;
}

async function weeklyBackupHeartbeat(env, dumpResult, integrityOk, now) {
  const objects = await listR2Objects(env.LEADS_ARCHIVE, BACKUP_PREFIX);
  const manifestDays = new Set(objects.map(object => {
    const match = /^backups\/d1\/(\d{4}-\d{2}-\d{2})\/manifest\.json$/.exec(object.key || "");
    return match ? match[1] : "";
  }).filter(Boolean));
  const week = Array.from({ length: 7 }, (_, index) => jerusalemDayOffset(-index, now || new Date()));
  const count = week.filter(day => manifestDays.has(day)).length;
  const last = [...manifestDays].sort().at(-1) || "нет";
  const rows = dumpResult && dumpResult.manifest ? dumpResult.manifest.row_count : 0;
  const prefix = count === 7 && integrityOk ? "💾 Бэкап лидов OK" : "⚠️ Бэкап лидов НАРУШЕН";
  await notifyTelegram(env, `${prefix}: ${count}/7 дампов за неделю, последний ${last}, ${rows} строк`);
}

// Review round 5 addition (owner requirement): Cloudflare Workers Free
// allows a MAXIMUM of 5 cron triggers PER ACCOUNT, not per worker —
// assuta-lead-cron already uses 3, leaving exactly 2 for this worker. A
// 3-cron deploy failed with error 10072. The daily backup extras (verify
// yesterday, purge expired, Sunday heartbeat — formerly their own
// "30 2 * * *" trigger) and reconcile (formerly "0 18 * * *") are folded
// into the SAME hourly "0 * * * *" trigger and gated by the UTC hour of
// THIS firing (event.scheduledTime, not wall-clock "now" — deterministic
// even if a scheduled invocation runs slightly late).
//
// dumpD1ToR2 runs FIRST, unconditionally, every hour — the owner wants an
// at-most-1h-old snapshot, and an exception in a daily-only step must never
// skip it. Each daily-only step keeps its own try/catch (dumpD1ToR2 and
// verifyPreviousDump are already self-contained and never throw; reconcile
// wraps each of its own legs) so one failing step cannot block another.
async function hourlyRun(env, now) {
  now = now || new Date();
  const utcHour = now.getUTCHours();
  // Round 6, small item: thread `now` through so the day key these
  // functions compute internally comes from the SAME clock as the hour
  // gating above, not each function's own independent `new Date()`.
  const dumpResult = await dumpD1ToR2(env, now);
  // Review round 5 addition 2 (pipeline-health v1): "backup" is ok only
  // when the dump itself succeeded AND its same-run integrity check passed
  // — matching the coordinator's exact contract, not merely "dumpD1ToR2 was
  // called". Runs every hour, same cadence as the dump itself.
  await recordCronHealth(env, "backup", !!dumpResult && dumpResult.integrity_ok === true,
    dumpResult ? `integrity_ok=${dumpResult.integrity_ok}` : "dump_failed");

  if (utcHour === 2) {
    const previous = await verifyPreviousDump(env, now);
    try {
      await purgeExpiredDumps(env, now);
    } catch (error) {
      await notifyTelegram(env, `⚠️ не удалось удалить просроченные бэкапы: ${esc(error && error.message)}`);
    }
    if (isJerusalemSunday(now)) {
      try {
        await weeklyBackupHeartbeat(env, dumpResult,
          previous.state === 0 && !!dumpResult && dumpResult.integrity_ok === true, now);
      } catch (error) {
        await notifyTelegram(env, `⚠️ не удалось проверить недельный бэкап: ${esc(error && error.message)}`);
      }
    }
  }

  if (utcHour === 18) {
    await reconcile(env);
  }

  return dumpResult;
}

async function reconcileSheetKv(env) {
  if (!env.LEADS_KV || !env.SHEET_COUNT_URL) throw new Error("LEADS_KV или SHEET_COUNT_URL не настроен");
  const day = jerusalemDay();
  const keys = await listLeadKeys(env);
  const expected = new Set();
  for (const key of keys) {
    const metadata = key.metadata || {};
    const delivered = metadata.status === "delivered" || !!metadata.albato_delivered_at;
    if (delivered && jerusalemDay(metadata.received_at) === day) {
      expected.add(key.name.slice("lead:".length));
    }
  }

  let sheetIds;
  try {
    const url = new URL(env.SHEET_COUNT_URL);
    url.searchParams.set("day", day);
    const response = await fetch(url.toString());
    if (response.ok) {
      const body = await response.json();
      if (Array.isArray(body.submission_ids)) sheetIds = body.submission_ids.map(String).filter(Boolean);
    }
  } catch (e) { /* reported below */ }

  if (!sheetIds) {
    throw new Error(`Apps Script не вернул submission_ids за ${day}`);
  }

  const sheetCounts = new Map();
  for (const id of sheetIds) sheetCounts.set(id, (sheetCounts.get(id) || 0) + 1);
  const missing = [...expected].filter(id => !sheetCounts.has(id));
  const unexpected = [...sheetCounts.keys()].filter(id => !expected.has(id));
  const duplicates = [...sheetCounts].filter(([, count]) => count > 1).map(([id, count]) => `${id}×${count}`);
  if (!missing.length && !unexpected.length && !duplicates.length) return;

  const line = (label, ids) => ids.length ? `\n${label}: ${ids.slice(0, 20).map(esc).join(", ")}` : "";
  await notifyTelegram(env,
    `⚠️ <b>Расхождение Sheet↔KV за ${day}</b>\nKV ID: ${expected.size}\nSheet строк: ${sheetIds.length}`
    + line("Нет в Sheet", missing) + line("Нет в KV", unexpected) + line("Дубли в Sheet", duplicates));
}

async function reconcileKvToD1(env) {
  if (!env.LEADS_KV || !env.LEADS_DB) throw new Error("LEADS_KV или LEADS_DB не настроен");
  const keys = await listLeadKeys(env);
  const rows = await queryD1(env, "SELECT submission_id FROM leads");
  const existing = new Set(rows.map(row => String(row.submission_id)));
  const repaired = [];
  const failed = [];
  for (const key of keys) {
    const id = key.name.slice("lead:".length);
    if (existing.has(id)) continue;
    const raw = await env.LEADS_KV.get(key.name);
    let record;
    try { record = raw ? JSON.parse(raw) : null; } catch (e) { record = null; }
    if (record && await upsertD1(env, record)) repaired.push(id);
    else failed.push(id);
  }
  if (repaired.length) await notifyIdChunks(env, "🛠 KV→D1 починено", repaired);
  if (failed.length) await notifyIdChunks(env, "⚠️ KV→D1 не удалось", failed);
}

async function reconcileD1ToKv(env) {
  if (!env.LEADS_KV || !env.LEADS_DB) throw new Error("LEADS_KV или LEADS_DB не настроен");
  const rows = await queryD1(env,
    "SELECT submission_id FROM leads WHERE status IN ('pending','forwarding')");
  const missing = [];
  for (const row of rows) {
    const id = String(row.submission_id);
    if (!await env.LEADS_KV.get(`lead:${id}`)) missing.push(id);
  }
  if (missing.length) {
    await notifyIdChunks(env, "⚠️ D1 pending|forwarding без KV", missing);
  }
}

async function reconcileR2Presence(env) {
  if (!env.LEADS_KV || !env.LEADS_DB || !env.LEADS_ARCHIVE) {
    throw new Error("LEADS_KV, LEADS_DB или LEADS_ARCHIVE не настроен");
  }
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  // Review round 3, finding 4: admin-delete best-effort removes the R2 .md
  // file (functions/api/admin.js deleteLead), so a deleted row will
  // legitimately have no archive object. Without this filter every normal
  // delete inside the 14-day window produced a false "no MD file found"
  // alert for a row that was never supposed to keep one.
  const rows = await queryD1(env,
    "SELECT submission_id, received_at FROM leads WHERE received_at >= ?1 AND status != 'deleted'", [since]);
  const byDay = new Map();
  for (const row of rows) {
    const day = String(row.received_at || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error(`received_at некорректен для ${row.submission_id}`);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(String(row.submission_id));
  }

  const gaps = [];
  for (const [day, ids] of byDay) {
    const prefix = `leads/${day}/`;
    const objects = await listR2Objects(env.LEADS_ARCHIVE, prefix);
    const present = new Set(objects.map(object => object.key));
    for (const id of ids) {
      if (present.has(`${prefix}${id}.md`)) continue;
      const marker = `ops:r2gap:${id}`;
      if (await env.LEADS_KV.get(marker) != null) continue;
      gaps.push(id);
    }
  }
  if (!gaps.length) return;
  const alertedIds = await notifyIdChunks(env, "⚠️ R2 presence: нет MD-файлов для", gaps);
  for (const id of alertedIds) {
    await env.LEADS_KV.put(`ops:r2gap:${id}`, jerusalemDay(), { expirationTtl: R2_GAP_TTL_SECONDS });
  }
}

// Review round 5 (Codex-found race on 6034203, mirrors
// functions/api/lead.js's wipeIfDeletedAfterWrite): admin DELETE is not
// serialized against a concurrent writer for the same submission_id, so a
// narrow race can resurrect a KV/R2 copy even after lead.js's own
// request-time re-checks (e.g. the writer's KV put and lead.js's re-check
// both landed inside the SAME instant the janitor cannot subdivide further
// — vanishingly rare, but not provably zero without a Durable Object).
// DECISION (documented in docs/LEAD-PIPELINE.md): no full serialization —
// deletion is EVENTUAL and BOUNDED to one reconcile cycle instead. For
// every D1 row marked 'deleted' within JANITOR_WINDOW_DAYS, make sure the
// KV key and R2 archive object are ABSENT — an idempotent no-op wipe, safe
// to re-run every cycle. The alert reports COUNTS ONLY, never a
// submission_id or any field value: the row is a deletion tombstone by
// definition, and an ops alert must not become a second PII leak.
async function janitorPurgeDeletedLeads(env) {
  if (!env.LEADS_DB || typeof env.LEADS_DB.prepare !== "function") return;
  const since = new Date(Date.now() - JANITOR_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const rows = await queryD1(env,
    "SELECT submission_id, received_at FROM leads WHERE status='deleted' AND delivered_at >= ?1", [since]);
  let kvWiped = 0;
  let r2Wiped = 0;
  for (const row of rows) {
    const id = String(row.submission_id);
    if (env.LEADS_KV && typeof env.LEADS_KV.get === "function" && typeof env.LEADS_KV.delete === "function") {
      try {
        if ((await env.LEADS_KV.get(`lead:${id}`)) != null) {
          await env.LEADS_KV.delete(`lead:${id}`);
          kvWiped++;
        }
      } catch (e) { /* best-effort — this row is retried on the next cycle */ }
    }
    if (row.received_at && env.LEADS_ARCHIVE && typeof env.LEADS_ARCHIVE.get === "function" && typeof env.LEADS_ARCHIVE.delete === "function") {
      const r2Key = `leads/${String(row.received_at).slice(0, 10)}/${id}.md`;
      try {
        if ((await env.LEADS_ARCHIVE.get(r2Key)) != null) {
          await env.LEADS_ARCHIVE.delete(r2Key);
          r2Wiped++;
        }
      } catch (e) { /* best-effort */ }
    }
  }
  if (kvWiped > 0 || r2Wiped > 0) {
    await notifyTelegram(env, `🧹 janitor: очищено ${kvWiped} KV + ${r2Wiped} R2 копий удалённых лидов`);
  }
}

async function reconcile(env) {
  const legs = [
    ["KV↔Sheet", reconcileSheetKv],
    ["KV→D1", reconcileKvToD1],
    ["D1 pending|forwarding→KV", reconcileD1ToKv],
    ["R2 presence", reconcileR2Presence],
    ["Janitor: удалённые лиды", janitorPurgeDeletedLeads],
  ];
  for (const [name, run] of legs) {
    try {
      await run(env);
    } catch (error) {
      await notifyTelegram(env, `⚠️ не удалось проверить ${name}: ${esc(error && error.message)}`);
    }
  }
}

// Review round 5 addition 2 (pipeline-health v1, owner-approved contract):
// this client has no Telegram configured, so backup/sweep failures were
// otherwise silent. The mini-CRM Apps Script polls GET /health hourly and
// emails alex@adfix.co.il on failure — the CRM-side reader is built against
// this EXACT shape, so it must not drift without updating both sides.
const HEALTH_JSON_HEADERS = { "content-type": "application/json", "cache-control": "no-store" };
function healthJson(status, body) {
  return new Response(JSON.stringify(body), { status, headers: HEALTH_JSON_HEADERS });
}
async function stuckLeadsCount(env) {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const rows = await queryD1(env,
    "SELECT COUNT(*) AS n FROM leads WHERE status IN ('pending','forwarding') AND received_at < ?1", [cutoff]);
  return rows && rows[0] ? Number(rows[0].n) || 0 : 0;
}
async function cronHealthRow(env, job) {
  const rows = await queryD1(env, "SELECT last_run_at, last_ok_at, detail FROM cron_health WHERE job=?1", [job]);
  return (rows && rows[0]) || null;
}
// backup's `detail` is written by recordCronHealth as "integrity_ok=true" /
// "integrity_ok=false" / "dump_failed" on EVERY run (success or failure),
// so this reflects the LATEST attempt's integrity result — not just the
// last successful one, which last_ok_at already covers separately.
function parseIntegrityOk(detail) {
  if (detail === "integrity_ok=true") return true;
  if (detail === "integrity_ok=false") return false;
  return null;
}
async function buildHealthResponse(env) {
  // Review round 6, finding 4: `leads` is the PRIMARY table (existed since
  // round 1) — if querying it fails, D1 itself is genuinely unreadable, a
  // real 503. `cron_health` is a round-5 addition the owner applies as a
  // separate migration; if IT alone is missing ("no such table"), that is
  // a migration-lag DEGRADED state, not a total outage — the reader treats
  // null backup/sweep fields as degraded, so report 200 with nulls instead
  // of masking a perfectly healthy `leads` table behind a 503.
  let stuckLeads;
  try {
    stuckLeads = await stuckLeadsCount(env);
  } catch (e) {
    return healthJson(503, { schema: 1, error: "d1_unavailable" });
  }
  let backupRow = null;
  let sweepRow = null;
  try {
    backupRow = await cronHealthRow(env, "backup");
    sweepRow = await cronHealthRow(env, "sweep");
  } catch (e) {
    backupRow = null;
    sweepRow = null;
  }
  return healthJson(200, {
    schema: 1,
    generated_at: new Date().toISOString(),
    backup: {
      last_ok_at: (backupRow && backupRow.last_ok_at) || null,
      last_run_at: (backupRow && backupRow.last_run_at) || null,
      integrity_ok: parseIntegrityOk(backupRow && backupRow.detail),
    },
    sweep: {
      last_ok_at: (sweepRow && sweepRow.last_ok_at) || null,
      last_run_at: (sweepRow && sweepRow.last_run_at) || null,
    },
    stuck_leads: stuckLeads,
    albato_configured: !!env.ALBATO_WEBHOOK_URL,
  });
}

export default {
  async scheduled(event, env, ctx) {
    if (event.cron === "*/5 * * * *") ctx.waitUntil(sweepPending(env));
    // Round 5 addition: the daily backup/reconcile crons were merged into
    // this single hourly trigger (5-cron-per-account limit) — hourlyRun
    // gates its own daily-only steps by the UTC hour of event.scheduledTime.
    //
    // Round 6, finding 5 (deploy transition): the RETIRING literals
    // "30 2 * * *" and "0 18 * * *" must ALSO route here. Production is
    // currently on 6034203 with */5 disabled and ONLY "30 2 * * *" live —
    // if this code deploys before the Cloudflare-side trigger config
    // catches up to the new ["*/5 * * * *", "0 * * * *"] pair, that
    // still-configured "30 2 * * *" firing would otherwise hit the
    // "unknown cron" fallback below and silently skip the dump entirely.
    // hourlyRun resolves the correct hour from event.scheduledTime either
    // way (UTC 2:30 → hour 2, UTC 18:00 → hour 18), so this is safe for
    // however long the transition takes.
    else if (event.cron === "0 * * * *" || event.cron === "30 2 * * *" || event.cron === "0 18 * * *") {
      ctx.waitUntil(hourlyRun(env, new Date(event.scheduledTime)));
    }
    else ctx.waitUntil(notifyTelegram(env, "⚠️ незнакомый cron: " + event.cron));
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/health") {
      return new Response("not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    if (request.method !== "GET") {
      return new Response("method not allowed", {
        status: 405, headers: { "content-type": "text/plain; charset=utf-8", allow: "GET" },
      });
    }
    return buildHealthResponse(env);
  },
};

export {
  dumpD1ToR2,
  verifyPreviousDump,
  purgeExpiredDumps,
  probeD1,
  reconcile,
  sweepPending,
  claimD1Lease,
  insertD1IfMissing,
  upsertD1Guarded,
  hourlyRun,
};

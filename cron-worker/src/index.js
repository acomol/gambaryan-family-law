/* gambarian-lead-cron — standalone Cloudflare Worker (Pages Functions have NO Cron).
   Three scheduled jobs against the SAME KV + D1/R2 stores as /api/lead:
     • every 5 min  → sweepPending(): D1 probe + lease-protected re-forward, oldest-first
     • daily 18:00  → reconcile(): four independent storage/delivery checks
     • daily 02:30  → backupRun(): verify yesterday, dump D1 to R2, purge, heartbeat

   Ported from clients/luxemed/New Lending/cron-worker/src/index.js
   (digitalhook-os-, feature/luxemed-new-lending@613cdd30; contract:
   knowledge/web-dev/ADFIX-SITE-SYSTEM-PLAYBOOK.md §1.6-1.7), adapted to the
   D1 schema in db/leads-schema.sql (Gambaryan fields: name/phone/email,
   corrects_submission_id, full attribution set — no Assuta medical columns).
   Deploy: owner-only; this repository change does not deploy the Worker. */

const TTL_SECONDS = 7 * 24 * 60 * 60;
const SWEEP_LIMIT = 25;
const ALERT_AFTER_MS = 15 * 60 * 1000;
const FWD_TIMEOUT_MS = 10000;
const FORWARD_LEASE_MS = 15 * 1000;
const JSON_HEADERS = { "content-type": "application/json" };
const BACKUP_PREFIX = "backups/d1/";
const BACKUP_RETENTION_DAYS = 30;
const R2_GAP_TTL_SECONDS = 30 * 24 * 60 * 60;
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
    const res = await fetch(env.ALBATO_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(sheetSafePayload(fields)),
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

async function sweepPending(env) {
  if (!(await probeD1(env))) return;

  // Review round 2, finding D (P2): a KV-phase failure (e.g. LEADS_KV.list()
  // throwing) must not prevent the independent D1-sourced retry loop below
  // from running — isolate the two phases.
  try {
    const keys = await listLeadKeys(env);
    const candidates = keys
      .filter(k => {
        const m = k.metadata || {};
        if (m.status === "pending") return true;
        const started = new Date(m.forwarding_started_at || 0).getTime();
        return m.status === "forwarding" && started > 0 && (Date.now() - started) >= FORWARD_LEASE_MS;
      })
      .sort((a, b) => new Date((a.metadata || {}).received_at || 0) - new Date((b.metadata || {}).received_at || 0));

    let attempts = 0;
    for (const key of candidates) {
      if (attempts >= SWEEP_LIMIT) break;
      if (await isDeleted(env, key.name.slice("lead:".length))) continue;
      const raw = await env.LEADS_KV.get(key.name);
      if (!raw) continue;
      let rec; try { rec = JSON.parse(raw); } catch (e) { continue; }
      if (!rec || rec.status === "delivered") continue;
      if (rec.albato_delivered_at) {
        rec.status = "delivered";
        rec.delivered_at = rec.albato_delivered_at;
        await upsertD1(env, rec);
        await putRecordWithRetry(env, key.name, rec, true);
        continue;
      }

      const startedAt = new Date().toISOString();
      const claim = await claimD1Lease(env, rec, startedAt);
      if (claim === "delivered") {
        rec.status = "delivered";
        rec.delivered_at = rec.delivered_at || startedAt;
        await putRecordWithRetry(env, key.name, rec, true);
        continue;
      }
      if (claim !== "claimed") continue;

      rec.status = "forwarding";
      rec.forwarding_started_at = startedAt;
      await putRecord(env, key.name, rec);
      attempts++;

      if (await forwardToAlbato(env, rec.fields || {})) {
        const deliveredAt = new Date().toISOString();
        rec.status = "delivered";
        rec.delivered_at = deliveredAt;
        rec.albato_delivered_at = deliveredAt;
        delete rec.forwarding_started_at;
        await upsertD1(env, rec);
        await putRecordWithRetry(env, key.name, rec, true);
        await notifyTelegram(env, newLeadMsg(rec.fields || {}));
        continue;
      }

      rec.status = "pending";
      delete rec.forwarding_started_at;
      const age = Date.now() - new Date(rec.received_at || Date.now()).getTime();
      if (age > ALERT_AFTER_MS && !rec.alerted) {
        rec.alerted = await notifyTelegram(env, undeliveredMsg(rec));
      }
      await upsertD1(env, rec);
      await putRecord(env, key.name, rec);
    }
  } catch (e) { /* best-effort — KV-phase failure must not block the D1 phase below */ }

  // D1-only stragglers (review 2026-09-23, finding 3): a lead whose EVERY KV
  // write failed at intake time has no `lead:<id>` key at all, so the
  // KV-list loop above can never find it. Rebuild a KV-shaped record from
  // payload_json and run it through the same claim/forward path;
  // claimD1Lease's insert-if-missing + atomic UPDATE safely no-op if
  // another isolate (or the KV loop above) is already handling this id.
  if (env.LEADS_DB && typeof env.LEADS_DB.prepare === "function" && env.LEADS_KV) {
    try {
      const expiredBefore = new Date(Date.now() - FORWARD_LEASE_MS).toISOString();
      const rows = await queryD1(env,
        "SELECT submission_id, received_at, status, delivered_at, payload_json FROM leads"
        + " WHERE status='pending' OR (status='forwarding' AND delivered_at<=?1)"
        + " ORDER BY received_at ASC LIMIT ?2",
        [expiredBefore, SWEEP_LIMIT * 2]);
      let d1Attempts = 0;
      for (const row of rows) {
        if (d1Attempts >= SWEEP_LIMIT) break;
        if (await isDeleted(env, row.submission_id)) continue;
        const key = `lead:${row.submission_id}`;

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
          await upsertD1(env, kvRecordForRow);
          continue;
        }

        let fields; try { fields = JSON.parse(row.payload_json || "{}"); } catch (e) { fields = {}; }
        const rec = { submission_id: row.submission_id, fields, status: row.status, received_at: row.received_at };
        if (row.status === "forwarding") rec.forwarding_started_at = row.delivered_at;

        const startedAt = new Date().toISOString();
        const claim = await claimD1Lease(env, rec, startedAt);
        if (claim !== "claimed") continue;
        d1Attempts++;
        rec.status = "forwarding";
        rec.forwarding_started_at = startedAt;
        await putRecord(env, key, rec);

        if (await forwardToAlbato(env, rec.fields || {})) {
          const deliveredAt = new Date().toISOString();
          rec.status = "delivered";
          rec.delivered_at = deliveredAt;
          rec.albato_delivered_at = deliveredAt;
          delete rec.forwarding_started_at;
          await upsertD1(env, rec);
          await putRecordWithRetry(env, key, rec, true);
          await notifyTelegram(env, newLeadMsg(rec.fields || {}));
        } else {
          rec.status = "pending";
          delete rec.forwarding_started_at;
          await upsertD1(env, rec);
          await putRecord(env, key, rec);
        }
      }
    } catch (e) { /* best-effort */ }
  }
}

async function verifyPreviousDump(env) {
  const day = jerusalemDayOffset(-1);
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

async function dumpD1ToR2(env) {
  const day = jerusalemDay();
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

async function purgeExpiredDumps(env) {
  if (!env.LEADS_ARCHIVE || typeof env.LEADS_ARCHIVE.delete !== "function") {
    throw new Error("LEADS_ARCHIVE не настроен");
  }
  const cutoff = jerusalemDayOffset(-BACKUP_RETENTION_DAYS);
  const objects = await listR2Objects(env.LEADS_ARCHIVE, BACKUP_PREFIX);
  const expired = objects.filter(object => {
    const match = /^backups\/d1\/(\d{4}-\d{2}-\d{2})\//.exec(object.key || "");
    return match && match[1] < cutoff;
  });
  for (const object of expired) await env.LEADS_ARCHIVE.delete(object.key);
  return expired.length;
}

async function weeklyBackupHeartbeat(env, dumpResult, integrityOk) {
  const objects = await listR2Objects(env.LEADS_ARCHIVE, BACKUP_PREFIX);
  const manifestDays = new Set(objects.map(object => {
    const match = /^backups\/d1\/(\d{4}-\d{2}-\d{2})\/manifest\.json$/.exec(object.key || "");
    return match ? match[1] : "";
  }).filter(Boolean));
  const week = Array.from({ length: 7 }, (_, index) => jerusalemDayOffset(-index));
  const count = week.filter(day => manifestDays.has(day)).length;
  const last = [...manifestDays].sort().at(-1) || "нет";
  const rows = dumpResult && dumpResult.manifest ? dumpResult.manifest.row_count : 0;
  const prefix = count === 7 && integrityOk ? "💾 Бэкап лидов OK" : "⚠️ Бэкап лидов НАРУШЕН";
  await notifyTelegram(env, `${prefix}: ${count}/7 дампов за неделю, последний ${last}, ${rows} строк`);
}

async function backupRun(env) {
  const previous = await verifyPreviousDump(env);
  const dumpResult = await dumpD1ToR2(env);
  try {
    await purgeExpiredDumps(env);
  } catch (error) {
    await notifyTelegram(env, `⚠️ не удалось удалить просроченные бэкапы: ${esc(error && error.message)}`);
  }
  if (isJerusalemSunday()) {
    try {
      await weeklyBackupHeartbeat(env, dumpResult,
        previous.state === 0 && !!dumpResult && dumpResult.integrity_ok === true);
    } catch (error) {
      await notifyTelegram(env, `⚠️ не удалось проверить недельный бэкап: ${esc(error && error.message)}`);
    }
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
  const rows = await queryD1(env,
    "SELECT submission_id, received_at FROM leads WHERE received_at >= ?1", [since]);
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

async function reconcile(env) {
  const legs = [
    ["KV↔Sheet", reconcileSheetKv],
    ["KV→D1", reconcileKvToD1],
    ["D1 pending|forwarding→KV", reconcileD1ToKv],
    ["R2 presence", reconcileR2Presence],
  ];
  for (const [name, run] of legs) {
    try {
      await run(env);
    } catch (error) {
      await notifyTelegram(env, `⚠️ не удалось проверить ${name}: ${esc(error && error.message)}`);
    }
  }
}

export default {
  async scheduled(event, env, ctx) {
    if (event.cron === "0 18 * * *") ctx.waitUntil(reconcile(env));
    else if (event.cron === "30 2 * * *") ctx.waitUntil(backupRun(env));
    else if (event.cron === "*/5 * * * *") ctx.waitUntil(sweepPending(env));
    else ctx.waitUntil(notifyTelegram(env, "⚠️ незнакомый cron: " + event.cron));
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
};

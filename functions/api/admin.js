/* Cloudflare Pages Function — GET/POST /api/admin
   Lightweight lead admin over the D1 mirror (LEADS_DB): filterable table + CSV/MD export.

   🔒 SECURITY — PII (name/phone/email). Secure-by-default: serves ONLY via
   HTTP Basic Auth against env ADMIN_PASSWORD, compared in constant time. If
   ADMIN_PASSWORD is not configured → refuse (403), never open.

   Review 2026-09-23 (independent Codex review of bd8dc8e, finding 1, P1):
   the original CF-Access-header path (trusting the raw
   Cf-Access-Authenticated-User-Email request header) has been REMOVED. That
   header is only trustworthy when Cloudflare's own edge sets it after a
   verified Access policy — this Function had no way to confirm that, so a
   spoofed header alone was enough to grant full read + CSV export + delete
   access. Basic Auth is now the only supported method; see
   docs/LEAD-PIPELINE.md "Review 2026-09-23" table.

   Ported from clients/luxemed/New Lending/functions/admin.js (digitalhook-os-,
   feature/luxemed-new-lending@613cdd30; contract:
   knowledge/web-dev/ADFIX-SITE-SYSTEM-PLAYBOOK.md §1.8). Route note: this
   repo's site/_routes.json restricts Pages Functions to "/api/*"
   (verified by scripts/verify-lead-hook.mjs) — so the admin page lives at
   /api/admin instead of the reference's /admin. Change _routes.json only if
   the owner explicitly wants the bare /admin path.

   Bindings / env (Cloudflare Pages):
     • D1 database bound as  LEADS_DB                 (required — the queryable store)
     • env  ADMIN_PASSWORD            password for Basic-Auth login (set via API/dashboard)
     • env  ADMIN_USER     (optional) Basic-Auth username (default: any)
   Until LEADS_DB is bound this shows a friendly "not configured" page (no error). */

const DB_COLS = [
  "received_at", "status", "name", "phone", "email", "corrects_submission_id",
  "form_id", "landing_path", "referrer_host", "utm_source", "gclid", "gbraid",
  "wbraid", "fbclid", "submission_id", "payload_json",
];
const COLS = [
  "received_at", "status", "name", "phone", "email", "corrects_submission_id",
  "form_id", "landing_path", "referrer_host", "utm_source", "gclid", "gbraid",
  "wbraid", "fbclid", "submission_id",
];

function esc(s) { return String(s == null ? "" : s).replace(/[<>&"]/g, function (c) { return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]; }); }
// CSV-injection guard (review 2026-09-23, finding 7 + round-2 finding E,
// P2): a cell starting with =, +, -, @, tab or CR can be interpreted as a
// formula by Excel/Sheets/LibreOffice when the export is opened. Prefixing
// only the FIRST character wasn't enough: a value with an embedded \r (e.g.
// "Review\r=1+1") was written out UNQUOTED (the old quoting check only
// looked for '"', ',' or '\n'), and some lenient CSV parsers treat a bare
// \r as a row separator even outside quotes — the ",=1+1" that follows
// would start a new, unescaped, unprefixed row. Fix: neutralise a formula
// prefix on EVERY line inside the cell (split on \r\n | \r | \n), and quote
// whenever the cell contains ANY of '"', ',', '\n' or '\r' — before the
// existing quote-doubling escape.
function csvCell(s) {
  var v = String(s == null ? "" : s);
  v = v.split(/\r\n|\r|\n/).map(function (line) {
    return /^[=+\-@\t\r]/.test(line) ? "'" + line : line;
  }).join("\n");
  return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

// Constant-time string compare (review 2026-09-23, finding 1, P1): always
// walks the full max-length of both inputs instead of returning as soon as
// a length mismatch or a differing character is found, so a timing
// side-channel can't be used to guess ADMIN_USER/ADMIN_PASSWORD one
// character at a time.
function timingSafeEqual(a, b) {
  var maxLen = Math.max(a.length, b.length);
  var diff = a.length === b.length ? 0 : 1;
  for (var i = 0; i < maxLen; i++) {
    var ca = i < a.length ? a.charCodeAt(i) : 0;
    var cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

function authAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) {
    return {
      response: new Response(
        "403 — /api/admin не защищён. Задайте env ADMIN_PASSWORD.",
        { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } },
      ),
    };
  }

  var email = null;
  var m = /^Basic\s+(.+)$/i.exec(request.headers.get("Authorization") || "");
  if (m) {
    var user = "", pass = "";
    try {
      var dec = atob(m[1]);
      var i = dec.indexOf(":");
      user = dec.slice(0, i);
      pass = dec.slice(i + 1);
    } catch (e) { /* malformed header — treated as wrong credentials below */ }
    var okUser = !env.ADMIN_USER || timingSafeEqual(user, env.ADMIN_USER);
    var okPass = timingSafeEqual(pass, env.ADMIN_PASSWORD);
    if (okUser && okPass) email = "admin:" + (user || "admin");
  }

  if (!email) {
    return {
      response: new Response("Требуется вход в админку Гамбарян.", {
        status: 401,
        headers: { "www-authenticate": 'Basic realm="Gambarian Admin", charset="UTF-8"', "content-type": "text/plain; charset=utf-8" },
      }),
    };
  }

  return { email: email };
}

function htmlPage(title, inner) {
  return new Response(
    '<!doctype html><html lang="ru"><head><meta charset="utf-8">'
    + '<meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + "<title>" + esc(title) + "</title><style>"
    + "body{font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;margin:0;background:#F4F6F8;color:#1A2340}"
    + ".bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:14px 18px;background:#fff;border-bottom:1px solid #E2E6EE;position:sticky;top:0;z-index:2}"
    + ".bar input,.bar select{padding:8px 10px;border:1px solid #c9d3e0;border-radius:8px;font:inherit}"
    + ".bar button{padding:8px 14px;border:0;border-radius:8px;background:#1A2340;color:#fff;cursor:pointer}"
    + ".bar .exp{padding:8px 12px;border:1px solid #2E7D32;border-radius:8px;color:#2E7D32;text-decoration:none}"
    + ".bar .who{margin-left:auto;color:#5b6b8a;font-size:12px}"
    + ".count{padding:10px 18px;color:#5b6b8a}"
    + ".wrap{overflow:auto;max-height:calc(100dvh - 110px);padding:0 18px 40px}"
    + "table{border-collapse:collapse;width:100%;background:#fff;font-size:12.5px}"
    + "th,td{border:1px solid #E2E6EE;padding:6px 9px;text-align:left;white-space:nowrap;max-width:260px;overflow:hidden;text-overflow:ellipsis}"
    + "th{background:#1A2340;color:#fff;position:sticky;top:0}"
    + "tbody tr:nth-child(even){background:#FAFBFD}"
    + ".st{padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600}"
    + ".st-delivered{background:#E6F4DD;color:#2E7D32}.st-pending{background:#FFF3D6;color:#8a6d00}"
    + ".del{padding:5px 9px;border:1px solid #B3261E;border-radius:7px;background:#fff;color:#B3261E;cursor:pointer;font:inherit;font-size:12px}"
    + ".flash{margin:12px 18px 0;padding:10px 12px;border-radius:8px}"
    + ".flash.ok{background:#E6F4DD;color:#2E7D32}.flash.err{background:#FDE7E9;color:#B3261E}"
    + "a{color:#1A2340}"
    + "p{padding:14px 18px}"
    + "</style></head><body>" + inner + "</body></html>",
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

// Review 2026-09-23, finding 5 (P1) + round-2 finding B (P1): the previous
// version deleted D1 first, swallowed KV/R2 errors, and reported success
// regardless — a KV delete failure left a "ghost" pending/forwarding KV
// record that a later sweep would happily re-insert into D1 and re-deliver
// to Albato, resurrecting a lead the admin explicitly removed. Worse, a
// PHYSICAL DELETE FROM leads meant a plain resubmission of the same id
// could freely INSERT a brand-new live row afterwards.
//
// Fix — D1 status='deleted' is now the AUTHORITATIVE, atomic marker:
//   1. Soft-delete D1 via an UPSERT that unconditionally sets
//      status='deleted' (admin intent always wins over whatever state the
//      row was in) — the row is KEPT, never physically removed, so its
//      submission_id permanently occupies the D1 uniqueness constraint.
//      Every later `INSERT ... ON CONFLICT DO NOTHING` (intake, sweep
//      repairs) is then a no-op against it, and every upsertLeadD1's CASE
//      WHEN protects 'deleted' from regressing back to pending/forwarding/
//      delivered. functions/api/lead.js checks this status at intake
//      (isLeadDeleted) and both its sweep sources; cron-worker/src/index.js
//      checks it in its sweep too.
//   2. KV `tomb:<id>` (long TTL) stays as a SECONDARY signal for when D1
//      itself can't be queried; also delete the live KV copy.
//   3. R2 archive delete stays best-effort and outside the pass/fail
//      verdict on purpose — it is a durable audit trail ("keep archive
//      key"), not a copy that can resurrect a lead.
//   4. Report success (the `deleted=<id>` flash) ONLY when the D1 soft-
//      delete, the KV tombstone write, and the KV data delete are all
//      confirmed. A caller can safely retry: every step here is idempotent
//      once it has already succeeded.
const TOMBSTONE_TTL_SECONDS = 90 * 24 * 60 * 60;
function tombstoneKey(submissionId) { return "tomb:" + submissionId; }

async function deleteLead(env, submissionId) {
  var receivedAt = "";
  if (env.LEADS_DB && typeof env.LEADS_DB.prepare === "function") {
    try {
      var r = await env.LEADS_DB.prepare("SELECT received_at FROM leads WHERE submission_id = ?").bind(submissionId).all();
      receivedAt = (r.results && r.results[0] && r.results[0].received_at) || "";
    } catch (e) { /* best-effort — only affects the R2 archive key below */ }
  }

  var d1Ok = true;
  if (env.LEADS_DB && typeof env.LEADS_DB.prepare === "function") {
    try {
      var deletedAt = new Date().toISOString();
      await env.LEADS_DB.prepare(
        "INSERT INTO leads (submission_id, received_at, status, delivered_at, payload_json)"
        + " VALUES (?1, ?2, 'deleted', ?3, '{}')"
        + " ON CONFLICT(submission_id) DO UPDATE SET status='deleted', delivered_at=excluded.delivered_at"
      ).bind(submissionId, receivedAt || deletedAt, deletedAt).run();
    } catch (e) { d1Ok = false; }
  }

  var tombOk = true;
  if (env.LEADS_KV && typeof env.LEADS_KV.put === "function") {
    try {
      await env.LEADS_KV.put(tombstoneKey(submissionId), JSON.stringify({ deleted_at: new Date().toISOString() }), {
        expirationTtl: TOMBSTONE_TTL_SECONDS, metadata: { type: "lead_tombstone" },
      });
    } catch (e) { tombOk = false; }
  }

  var kvOk = true;
  if (env.LEADS_KV && typeof env.LEADS_KV.delete === "function") {
    try { await env.LEADS_KV.delete("lead:" + submissionId); }
    catch (e) { kvOk = false; }
  }

  if (env.LEADS_ARCHIVE && typeof env.LEADS_ARCHIVE.delete === "function" && receivedAt) {
    try { await env.LEADS_ARCHIVE.delete("leads/" + receivedAt.slice(0, 10) + "/" + submissionId + ".md"); }
    catch (e) { /* best-effort, does not affect tombOk/d1Ok/kvOk */ }
  }

  if (!tombOk || !d1Ok || !kvOk) {
    var failure = new Error("partial_delete");
    failure.partial = true;
    throw failure;
  }
}

export async function onRequestPost(context) {
  var request = context.request;
  var env = context.env;
  var auth = authAdmin(request, env);
  if (auth.response) return auth.response;
  if (!env.LEADS_DB || typeof env.LEADS_DB.prepare !== "function") {
    return htmlPage("Лиды — не настроено", "<p>D1-биндинг <code>LEADS_DB</code> ещё не привязан к Pages-проекту.</p>");
  }

  var form;
  try { form = await request.formData(); }
  catch (e) { return new Response("bad request", { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } }); }

  var action = String(form.get("action") || "");
  var submissionId = String(form.get("submission_id") || "").trim();
  var back = new URL(request.url);
  back.searchParams.delete("deleted");
  back.searchParams.delete("error");

  if (action !== "delete" || !submissionId) {
    back.searchParams.set("error", "bad_delete_request");
    return new Response(null, { status: 303, headers: { location: back.pathname + back.search } });
  }

  try {
    await deleteLead(env, submissionId);
    back.searchParams.set("deleted", submissionId);
  } catch (e) {
    // Tombstone still blocks re-delivery even on partial failure (finding
    // 5) — the distinct code tells the operator a retry may be needed for
    // the KV/D1 copy that did not confirm, without claiming success.
    back.searchParams.set("error", (e && e.partial) ? "partial_delete" : "delete_failed");
  }
  return new Response(null, { status: 303, headers: { location: back.pathname + back.search } });
}

export async function onRequestGet(context) {
  var request = context.request;
  var env = context.env;
  var auth = authAdmin(request, env);
  if (auth.response) return auth.response;
  var email = auth.email;

  // Not configured yet — inert, friendly.
  if (!env.LEADS_DB || typeof env.LEADS_DB.prepare !== "function") {
    return htmlPage("Лиды — не настроено", "<p>D1-биндинг <code>LEADS_DB</code> ещё не привязан к Pages-проекту. Привяжите D1, примените схему <code>db/leads-schema.sql</code> и обновите страницу.</p>");
  }

  var url = new URL(request.url);
  var status = url.searchParams.get("status") || "";
  var q = (url.searchParams.get("q") || "").trim();
  var fmt = url.searchParams.get("format") || "";
  var limit = Math.min(2000, Math.max(1, parseInt(url.searchParams.get("limit") || "200", 10) || 200));
  var deleted = url.searchParams.get("deleted") || "";
  var error = url.searchParams.get("error") || "";

  var sql = "SELECT " + DB_COLS.join(", ") + " FROM leads";
  var where = []; var binds = [];
  // Soft-deleted rows (status='deleted', review round 2 finding B) are kept
  // in D1 as the authoritative anti-resurrection marker, but must not
  // clutter the default admin view.
  if (status === "pending" || status === "delivered") { where.push("status = ?"); binds.push(status); }
  else { where.push("status != 'deleted'"); }
  if (q) { where.push("(phone LIKE ? OR name LIKE ? OR email LIKE ?)"); binds.push("%" + q + "%", "%" + q + "%", "%" + q + "%"); }
  if (where.length) sql += " WHERE " + where.join(" AND ");
  sql += " ORDER BY received_at DESC LIMIT " + limit; // limit is a sanitized int

  var rows = [];
  try {
    var r = await env.LEADS_DB.prepare(sql).bind(...binds).all();
    rows = r.results || [];
  } catch (e) {
    return htmlPage("Лиды — ошибка", "<p>Ошибка запроса D1: " + esc(e.message || e) + ". Проверьте, что применена схема <code>db/leads-schema.sql</code>.</p>");
  }

  if (fmt === "csv") {
    var head = COLS.join(",");
    var body = rows.map(function (row) { return COLS.map(function (c) { return csvCell(row[c]); }).join(","); }).join("\n");
    return new Response("﻿" + head + "\n" + body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="gambarian-leads.csv"' } });
  }
  if (fmt === "md") {
    var md = "# Лиды Гамбарян (" + rows.length + ")\n\n" + rows.map(function (row) {
      return "## " + esc(row.received_at) + " · " + esc(row.status) + " · " + esc(row.name || "—") + "\n"
        + "- **Телефон:** " + esc(row.phone || "—") + "\n"
        + "- **Email:** " + esc(row.email || "—") + "\n"
        + "- **Страница:** " + esc(row.landing_path || "—") + " · **Referrer:** " + esc(row.referrer_host || "—") + "\n"
        + "- **Источник:** " + esc(row.utm_source || "(direct)") + " · gclid:" + esc(row.gclid || "—") + " · gbraid:" + esc(row.gbraid || "—") + " · wbraid:" + esc(row.wbraid || "—") + "\n"
        + "- **Исправляет заявку:** " + esc(row.corrects_submission_id || "—") + "\n"
        + "- **ID:** " + esc(row.submission_id) + "\n";
    }).join("\n");
    return new Response(md, { headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": 'attachment; filename="gambarian-leads.md"' } });
  }

  // HTML table view
  var qs = function (extra) {
    var u = new URL(url);
    Object.entries(extra).forEach(function (entry) { entry[1] == null ? u.searchParams.delete(entry[0]) : u.searchParams.set(entry[0], entry[1]); });
    return esc(u.pathname + u.search);
  };
  var thead = "<th>actions</th>" + COLS.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("");
  var tbody = rows.map(function (row) {
    return "<tr>" + '<td>'
      + '<form method="post" action="' + qs({ format: null, deleted: null, error: null }) + '" onsubmit="return confirm(\'Удалить лид из админки и хранилищ ADFIX? Уже доставленную строку в Albato/Sheet это не удалит.\');">'
      + '<input type="hidden" name="action" value="delete" />'
      + '<input type="hidden" name="submission_id" value="' + esc(row.submission_id) + '" />'
      + '<button class="del" type="submit">Удалить</button>'
      + "</form></td>"
      + COLS.map(function (c) {
        var v = row[c] == null ? "" : String(row[c]);
        if (c === "phone" && v) return '<td><a href="tel:' + esc(v) + '">' + esc(v) + "</a></td>";
        if (c === "status") return '<td><span class="st st-' + esc(v) + '">' + esc(v) + "</span></td>";
        if (v.length > 40) v = v.slice(0, 40) + "…";
        return "<td>" + esc(v) + "</td>";
      }).join("")
      + "</tr>";
  }).join("");

  var body = '\n  <form method="get" class="bar">\n'
    + '    <input name="q" value="' + esc(q) + '" placeholder="поиск: телефон / имя / email" />\n'
    + '    <select name="status">\n'
    + '      <option value="">все статусы</option>\n'
    + '      <option value="pending"' + (status === "pending" ? " selected" : "") + ">pending</option>\n"
    + '      <option value="delivered"' + (status === "delivered" ? " selected" : "") + ">delivered</option>\n"
    + "    </select>\n"
    + '    <input name="limit" value="' + limit + '" size="5" title="лимит строк" />\n'
    + '    <button type="submit">Фильтр</button>\n'
    + '    <a class="exp" href="' + qs({ format: "csv" }) + '">⬇ CSV</a>\n'
    + '    <a class="exp" href="' + qs({ format: "md" }) + '">⬇ MD</a>\n'
    + '    <span class="who">' + esc(email) + "</span>\n"
    + "  </form>\n"
    + (deleted ? '  <p class="flash ok">Удалено из админки/хранилищ ADFIX: <code>' + esc(deleted) + "</code>. Если лид уже ушёл в Albato/Sheet, строку там нужно удалить отдельно.</p>\n" : "")
    + (error ? '  <p class="flash err">Не удалось выполнить действие: <code>' + esc(error) + "</code>.</p>\n" : "")
    + '  <p class="count">' + rows.length + " лид(ов)" + (status ? " · статус: " + esc(status) : "") + (q ? " · поиск: «" + esc(q) + "»" : "") + "</p>\n"
    + '  <div class="wrap"><table><thead><tr>' + thead + "</tr></thead><tbody>" + tbody + "</tbody></table></div>";
  return htmlPage("Лиды Гамбарян", body);
}

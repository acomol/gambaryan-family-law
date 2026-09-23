/* shared/lead-email.js — branded HTML "new lead" office email, rendered at
   the Albato sink ONLY (functions/api/lead.js and cron-worker/src/index.js's
   forwardToAlbato, right before sheetSafePayload is applied). Imported by
   BOTH — one renderer, one place to fix a bug.

   Ported from the mini-CRM's office-email template
   (I:/GIT/gamb-mini-crm-fix/apps-script/src/EmailTemplates.gs,
   renderNewLeadEmail_ + its helpers, branch claude/gambarian-mini-crm-fix@
   6e01162) — SAME brand tokens/layout/buttons, adapted for this pipeline:
     - no CRM lead number (this pipeline has none);
     - received time is Asia/Jerusalem dd.MM.yyyy HH:mm, from submitted_at;
     - "Открыть таблицу" (outline button) is a FIXED URL, not a per-lead
       sheet deep link;
     - WhatsApp normalization is this task's own spec (see
       normalizeWhatsAppNumber below), not the mini-CRM's buildContactLinks_
       (this contract accepts a wider range of typed phone shapes than the
       CRM's own sheet-typed numbers).

   Pure functions only — no fetch/KV/D1/R2 access, so this module is safe to
   import from EITHER the Pages Function or the standalone Worker, and to
   unit-test directly in Node (test/lead-qa.mjs, test/cron-backup-qa.mjs).

   Rendered from the RAW (pre-sheetSafe) fields — email_html/email_subject
   must never show a sheetSafe() apostrophe prefix (that escaping exists
   ONLY for Albato's own Sheets step, not for a human reading an email).
   Every value is HTML-escaped before insertion (name/email/UTM come from a
   public form). Nothing here is stored in KV/D1/R2 — the email is rendered
   at SEND time, so a cron-worker retry renders it again from whatever
   payload_json/fields it has at that moment. */

const EMAIL_BRAND = Object.freeze({
  bgOuterLight: "#f6f1e8",
  bgHeader: "#0a0b0d",
  bgCardLight: "#ffffff",
  divider: "#e5e0d8",
  gold: "#f0ae1f",
  wine: "#8a1f1f",
  ink: "#14191f",
  ink2: "#4b5158",
  ink3: "#6b7280",
  fontStack: "'Onest', Helvetica, Arial, sans-serif",
});

// Light theme only per this task's spec (Gmail does not reliably honor
// prefers-color-scheme in the app, and the office reads this on whatever
// device/theme it has — a single, tested light rendering beats an
// unverified dark-mode branch).
const SHEET_URL = "https://docs.google.com/spreadsheets/d/1_jhfr7ucoKkbrwWlUQoS9wyw7uHYhe_oOutKpTlcoV4/edit";

function escapeHtml(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Email header injection (RFC 5322 §2.2): a bare CR/LF inside a header
// value can inject extra headers/lines. Strip all control chars
// (\x00-\x1F, \x7F), same rule already applied to Sheets export cells
// elsewhere in this codebase (functions/api/admin.js csvCell), applied here
// to the email subject specifically.
function stripSubjectControlChars(value) {
  return String(value === undefined || value === null ? "" : value).replace(/[\x00-\x1F\x7F]/g, "");
}

function formatJerusalemDateTime(isoString) {
  var date = new Date(isoString || "");
  if (isNaN(date.getTime())) return "";
  var parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date);
  var get = function (type) {
    var found = parts.find(function (p) { return p.type === type; });
    return found ? found.value : "";
  };
  return get("day") + "." + get("month") + "." + get("year") + " " + get("hour") + ":" + get("minute");
}

// tel: href — digits only, keeping a leading "+" if the typed phone had
// one. Deliberately NOT the WhatsApp normalization below: tel: dialing
// tolerates (and this keeps) whatever country-code shape the person typed,
// it does not need to be forced into a specific international form.
function telHrefFromPhone(phone) {
  var raw = typeof phone === "string" ? phone : "";
  var hasLeadingPlus = raw.trim().charAt(0) === "+";
  var digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return "tel:" + (hasLeadingPlus ? "+" : "") + digits;
}

// WhatsApp click-to-chat number normalization — exact spec verified against
// the official WhatsApp Help Center ("How to use click to chat", read
// 2026-09-24): "the <number> is a full phone number in international
// format... Omit any zeroes, brackets, or dashes". Returns digits (no "+",
// no formatting) or null when normalization is not possible — the caller
// hides the WhatsApp button on null rather than guess.
function normalizeWhatsAppNumber(raw) {
  var s = typeof raw === "string" ? raw : "";
  var trimmed = s.trim();
  var hasLeadingPlus = trimmed.charAt(0) === "+";
  var digitsAll = s.replace(/\D/g, ""); // digits only, no "+", regardless of position
  var value;
  if (hasLeadingPlus) {
    value = digitsAll; // 2. leading "+" -> drop it
  } else if (digitsAll.slice(0, 2) === "00") {
    value = digitsAll.slice(2); // 3. leading "00" -> drop it
  } else if (digitsAll.charAt(0) === "0") {
    value = "972" + digitsAll.slice(1); // 4. Israeli trunk prefix "0" -> "972" + rest
  } else if (digitsAll.length === 9 && digitsAll.charAt(0) === "5") {
    value = "972" + digitsAll; // 5. 9-digit Israeli mobile typed without the leading 0
  } else {
    value = digitsAll; // 6. already looks international — keep as is
  }
  if (!/^\d{10,15}$/.test(value)) return null; // 7. valid only if 10-15 digits
  // 8. Israeli landline (972 + non-5) has no WhatsApp — hide the button.
  if (value.slice(0, 3) === "972" && value.charAt(3) !== "5") return null;
  return value;
}

function emailButtonHtml(label, href, opts) {
  opts = opts || {};
  var bg = opts.bg || EMAIL_BRAND.gold;
  var color = opts.color || EMAIL_BRAND.ink;
  var border = opts.border ? ("border:1px solid " + opts.border + ";") : "";
  var style = "display:inline-block;min-height:44px;line-height:44px;padding:0 22px;"
    + "background:" + bg + ";color:" + color + ";" + border
    + "font-family:" + EMAIL_BRAND.fontStack + ";font-weight:700;font-size:13px;"
    + "border-radius:8px;text-decoration:none;white-space:nowrap;";
  return "<a href=\"" + escapeHtml(href) + "\" style=\"" + style + "\">" + escapeHtml(label) + "</a>";
}

// Equal-size, aligned "Позвонить"/WhatsApp buttons — block-stacked, both
// full width, one under the other. Same layout for every screen width
// (no media-query breakpoint to keep track of), ported verbatim from the
// mini-CRM's emailContactButtonsHtml_.
function emailContactButtonsHtml(telHref, waHref) {
  var base = "display:block;width:100%;box-sizing:border-box;min-height:44px;line-height:44px;text-align:center;"
    + "font-family:" + EMAIL_BRAND.fontStack + ";font-weight:700;font-size:13px;border-radius:8px;text-decoration:none;";
  var callStyle = base + "background:" + EMAIL_BRAND.gold + ";color:" + EMAIL_BRAND.ink + ";";
  var html = "<div style=\"margin-top:10px;\">"
    + "<a href=\"" + escapeHtml(telHref) + "\" style=\"" + callStyle + "\">Позвонить</a>";
  if (waHref) {
    var waStyle = base + "background:" + EMAIL_BRAND.bgOuterLight + ";color:" + EMAIL_BRAND.ink
      + ";border:1px solid " + EMAIL_BRAND.ink3 + ";margin-top:8px;";
    html += "<a href=\"" + escapeHtml(waHref) + "\" style=\"" + waStyle + "\">Написать в WhatsApp</a>";
  }
  html += "</div>";
  return html;
}

function emailLabelledRowHtml(label, valueHtml, opts) {
  opts = opts || {};
  var borderTop = opts.noBorderTop ? "" : ("border-top:1px solid " + EMAIL_BRAND.divider + ";");
  return "<tr><td style=\"padding:14px 0;" + borderTop + "\">"
    + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>"
    + "<td width=\"92\" valign=\"top\" style=\"font-family:" + EMAIL_BRAND.fontStack + ";font-size:12px;color:" + EMAIL_BRAND.ink3 + ";padding-top:2px;\">" + escapeHtml(label) + "</td>"
    + "<td style=\"font-family:" + EMAIL_BRAND.fontStack + ";font-size:15px;color:" + EMAIL_BRAND.ink + ";font-weight:600;\">" + valueHtml + "</td>"
    + "</tr></table></td></tr>";
}

function renderEmailShellHtml(parts) {
  var b = EMAIL_BRAND;
  return "<!DOCTYPE html>"
    + "<html lang=\"ru\">"
    + "<head>"
    + "<meta charset=\"utf-8\">"
    + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">"
    + "<title>" + escapeHtml(parts.previewText || "") + "</title>"
    + "<style>"
    + "body,table,td{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}"
    + "img{border:0;outline:none;text-decoration:none;}"
    + "a{text-decoration:none;}"
    + "</style>"
    + "</head>"
    + "<body style=\"margin:0;padding:0;background:" + b.bgOuterLight + ";\">"
    + "<div style=\"display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;\">" + escapeHtml(parts.previewText || "") + "</div>"
    + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:" + b.bgOuterLight + ";\">"
    + "<tr><td align=\"center\" style=\"padding:32px 16px;\">"
    + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:620px;\">"
    + "<tr><td style=\"background:" + b.bgHeader + ";padding:24px 32px;border-radius:12px 12px 0 0;\" align=\"center\">"
    + "<div style=\"font-family:" + b.fontStack + ";font-weight:800;font-size:16px;letter-spacing:0.06em;color:#ffffff;text-transform:uppercase;\">"
    + "Гамбарян <span style=\"color:" + b.gold + ";\">&amp;</span> Партнёры"
    + "</div>"
    + "<div style=\"margin-top:10px;font-family:" + b.fontStack + ";font-size:10px;font-weight:600;letter-spacing:0.32em;color:" + b.gold + ";text-transform:uppercase;\">Адвокаты</div>"
    + "</td></tr>"
    + "<tr><td style=\"background:" + b.bgCardLight + ";padding:32px;border-radius:0 0 12px 12px;\">"
    + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">"
    + "<tr><td style=\"font-family:" + b.fontStack + ";font-size:20px;font-weight:700;color:" + b.ink + ";padding-bottom:20px;\">" + parts.titleHtml + "</td></tr>"
    + parts.rowsHtml
    + "<tr><td style=\"padding-top:26px;\" align=\"center\">" + parts.ctaHtml + "</td></tr>"
    + "</table>"
    + "</td></tr>"
    + "</table>"
    + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:620px;\">"
    + "<tr><td align=\"center\" style=\"padding:18px 32px;\">"
    + "<span style=\"font-family:" + b.fontStack + ";font-size:12px;color:" + b.ink2 + ";\">" + escapeHtml(parts.footerText || "") + "</span>"
    + "</td></tr>"
    + "</table>"
    + "</td></tr>"
    + "</table>"
    + "</body></html>";
}

function formatSource(fields) {
  var source = String((fields && fields.utm_source) || "").trim();
  var campaign = String((fields && fields.utm_campaign) || "").trim();
  var parts = [source, campaign].filter(Boolean);
  return parts.length ? parts.join(" / ") : "Прямой";
}

/**
 * Renders the branded "new lead" office email from the RAW (pre-sheetSafe)
 * payload fields (same shape as buildPayload()'s output / D1's
 * payload_json). Pure function, safe to call from either forwardToAlbato.
 * @param {object} fields
 * @return {{subject: string, html: string}}
 */
function renderNewLeadEmail(fields) {
  fields = fields || {};
  var name = fields.name || "";
  var phone = fields.phone || "";
  var email = fields.email || "";
  var landingPath = fields.landing_path || "";
  var receivedAtLabel = formatJerusalemDateTime(fields.submitted_at);
  var source = formatSource(fields);

  var telHref = telHrefFromPhone(phone);
  var waNumber = normalizeWhatsAppNumber(phone);
  var waHref = waNumber ? "https://wa.me/" + waNumber : null;

  var phoneValueHtml = escapeHtml(phone);
  if (telHref) {
    phoneValueHtml += emailContactButtonsHtml(telHref, waHref);
  }

  var rows = emailLabelledRowHtml("Имя", escapeHtml(name), { noBorderTop: true });
  rows += emailLabelledRowHtml("Телефон", phoneValueHtml);
  if (email) {
    rows += emailLabelledRowHtml(
      "Email",
      "<a href=\"mailto:" + escapeHtml(email) + "\" style=\"color:" + EMAIL_BRAND.ink + ";font-weight:600;text-decoration:none;\">" + escapeHtml(email) + "</a>",
    );
  }
  rows += emailLabelledRowHtml("Источник", escapeHtml(source));
  if (landingPath) {
    rows += emailLabelledRowHtml("Страница", escapeHtml(landingPath));
  }

  var cta = emailButtonHtml("Открыть таблицу", SHEET_URL, { bg: "transparent", color: EMAIL_BRAND.wine, border: EMAIL_BRAND.wine });
  var titleHtml = "Новая заявка с сайта"
    + (receivedAtLabel ? "<div style=\"margin-top:4px;font-size:13px;font-weight:400;color:" + EMAIL_BRAND.ink3 + ";\">Получена " + escapeHtml(receivedAtLabel) + " (Израиль)</div>" : "");
  var footerText = "Автоматическое уведомление о новой заявке · Гамбарян и партнёры";

  var html = renderEmailShellHtml({
    previewText: "Новая заявка — " + name,
    titleHtml: titleHtml,
    rowsHtml: rows,
    ctaHtml: cta,
    footerText: footerText,
  });

  return {
    subject: "Новая заявка с сайта — " + stripSubjectControlChars(name),
    html: html,
  };
}

export {
  renderNewLeadEmail,
  escapeHtml,
  stripSubjectControlChars,
  formatJerusalemDateTime,
  telHrefFromPhone,
  normalizeWhatsAppNumber,
};

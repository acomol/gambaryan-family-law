/* shared/lead-email.js — branded HTML "new lead" office email, rendered at
   the Albato sink ONLY (functions/api/lead.js and cron-worker/src/index.js's
   forwardToAlbato, right before sheetSafePayload is applied). Imported by
   BOTH — one renderer, one place to fix a bug.

   v1 (2026-09-24, commit 301c9fc) ported the mini-CRM's office-email
   template (I:/GIT/gamb-mini-crm-fix/apps-script/src/EmailTemplates.gs,
   renderNewLeadEmail_) as a two-column label/value table with buttons
   nested inside the phone cell.

   v2 (2026-09-24, owner request after reviewing v1 live in Gmail on his
   phone, probably dark mode) — restructure, not a spacing tweak. Target
   order: compact header -> title+time(+test badge) -> ONE contact block
   (labels ABOVE values, no two-column table) -> two wide stacked action
   buttons (own block, full card width, not nested in the phone cell) ->
   muted service block (source/page) -> a neutral (not wine) link to the
   sheet -> short footer. Public API unchanged: renderNewLeadEmail's return
   shape ({subject, html}) and the subject format ("Новая заявка с сайта —
   <name>"), plus escapeHtml/stripSubjectControlChars/
   formatJerusalemDateTime/telHrefFromPhone/normalizeWhatsAppNumber, are
   BIT-FOR-BIT IDENTICAL to v1 — only the HTML/CSS composition changed.

   No image icons anywhere (Gmail may block remote images before the first
   open) — action buttons are text-only, not even a unicode glyph, since
   that could not be verified to render correctly in real Gmail from this
   environment; text-only is the documented fallback for that case.

   Colors were chosen to survive Gmail's own dark-mode auto-inversion, not
   just to look right in light mode: dark text on the gold fill (never
   white-on-gold), and every text/background pair was computed (see
   docs/LEAD-PIPELINE.md's contrast table) both normally AND under a
   simulated `invert(1) hue-rotate(180deg)` filter — the approximation
   Gmail's own "smart" dark mode uses for HTML it does not recognize as
   dark-mode-aware. <meta name="color-scheme"> / <meta
   name="supported-color-schemes"> tell Gmail this design is light-only so
   it should not auto-invert at all; the filter simulation is the fallback
   check for when an older client ignores those tags anyway.

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

// Colors: see docs/LEAD-PIPELINE.md ("Contrast table, v2 redesign") for the
// full computed WCAG ratio table (normal + simulated Gmail dark-invert).
// `goldBtnBorder` exists because the gold fill alone (#f0ae1f on white) is
// only ~1.95:1 against the card — below the 3:1 UI-component floor — so the
// button gets a solid `ink` border, which alone clears 3:1 against both the
// fill and the card, giving the button a clearly perceivable boundary.
const EMAIL_BRAND = Object.freeze({
  bgOuterLight: "#f6f1e8",
  bgHeader: "#0a0b0d",
  bgCardLight: "#ffffff",
  divider: "#e5e0d8",
  gold: "#f0ae1f",
  goldBtnBorder: "#14191f",
  ink: "#14191f",
  muted: "#5b6169",
  badgeBg: "#fef3c7",
  badgeText: "#7a4a06",
  badgeBorder: "#92400e",
  fontStack: "'Onest', Helvetica, Arial, sans-serif",
});

// Light theme only per this task's spec (Gmail does not reliably honor
// prefers-color-scheme in the app, and the office reads this on whatever
// device/theme it has — a single, tested light rendering beats an
// unverified dark-mode branch).
const SHEET_URL = "https://docs.google.com/spreadsheets/d/1_jhfr7ucoKkbrwWlUQoS9wyw7uHYhe_oOutKpTlcoV4/edit";
const LANDING_ORIGIN = "https://lp.gambarian.com";

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

// Action button — full-width, padding-based (NOT a fixed line-height), so a
// long/zoomed label grows the box via padding instead of being clipped by a
// line-height sized for the un-zoomed text. min-height is a FLOOR, not a
// fixed height. `cls` is a stable hook for QA (Playwright zoom simulation),
// harmless if a client strips <style>/class since every real style is
// inline too.
function actionButtonHtml(label, href, opts) {
  opts = opts || {};
  var variant = opts.variant || "outline";
  var cls = opts.cls || "";
  var fill = variant === "fill"
    ? ("background:" + EMAIL_BRAND.gold + ";border:1px solid " + EMAIL_BRAND.goldBtnBorder + ";color:" + EMAIL_BRAND.ink + ";")
    : ("background:" + EMAIL_BRAND.bgCardLight + ";border:1px solid " + EMAIL_BRAND.ink + ";color:" + EMAIL_BRAND.ink + ";");
  var style = "display:block;width:100%;box-sizing:border-box;min-height:" + (opts.minHeight || 52) + "px;"
    + "padding:14px 20px;line-height:1.3;text-align:center;" + fill
    + "font-family:" + EMAIL_BRAND.fontStack + ";font-weight:700;font-size:15px;"
    + "border-radius:10px;text-decoration:none;";
  return "<a" + (cls ? " class=\"" + cls + "\"" : "") + " href=\"" + escapeHtml(href) + "\" style=\"" + style + "\">" + escapeHtml(label) + "</a>";
}

// Two stacked, equal-width, separated action buttons — a standalone block
// (NOT nested inside the phone value anymore). WhatsApp is omitted entirely
// when the number does not normalize (existing rule, unchanged).
function actionsBlockHtml(telHref, waHref) {
  var html = "<div>" + actionButtonHtml("Позвонить", telHref, { variant: "fill", minHeight: 56, cls: "abx-btn-call abx-btn-label" });
  if (waHref) {
    html += "<div style=\"margin-top:18px;\">"
      + actionButtonHtml("Написать в WhatsApp", waHref, { variant: "outline", minHeight: 56, cls: "abx-btn-wa abx-btn-label" })
      + "</div>";
  }
  html += "</div>";
  return html;
}

// One field in the contact block: label ABOVE the value, full width, no
// two-column table. `cls` on the value is a QA hook (Playwright zoom test).
function stackedFieldHtml(label, valueHtml, opts) {
  opts = opts || {};
  var marginTop = opts.first ? "0" : "16px";
  var valueSize = opts.fontSize || 16;
  var valueWeight = opts.fontWeight || 400;
  return "<div style=\"margin-top:" + marginTop + ";\">"
    + "<div style=\"font-family:" + EMAIL_BRAND.fontStack + ";font-size:12px;font-weight:600;letter-spacing:0.04em;"
    + "text-transform:uppercase;color:" + EMAIL_BRAND.muted + ";\">" + escapeHtml(label) + "</div>"
    + "<div class=\"" + (opts.cls || "") + "\" style=\"margin-top:4px;font-family:" + EMAIL_BRAND.fontStack + ";"
    + "font-size:" + valueSize + "px;font-weight:" + valueWeight + ";color:" + EMAIL_BRAND.ink + ";"
    + "word-break:break-word;overflow-wrap:break-word;line-height:1.3;\">" + valueHtml + "</div>"
    + "</div>";
}

// A divider is placed BETWEEN GROUPS (contact -> actions, service -> sheet
// link) — not after every field, unlike the v1 two-column table.
function dividerHtml() {
  return "border-top:1px solid " + EMAIL_BRAND.divider + ";margin-top:24px;padding-top:24px;";
}

function renderEmailShellHtml(parts) {
  var b = EMAIL_BRAND;
  return "<!DOCTYPE html>"
    + "<html lang=\"ru\">"
    + "<head>"
    + "<meta charset=\"utf-8\">"
    + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">"
    // Tell Gmail (and any other client that honors this) the design is
    // light-only, so it should not run its own auto-dark inversion on it.
    + "<meta name=\"color-scheme\" content=\"light\">"
    + "<meta name=\"supported-color-schemes\" content=\"light\">"
    + "<title>" + escapeHtml(parts.previewText || "") + "</title>"
    + "<style>"
    + "body,table,td{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}"
    + "img{border:0;outline:none;text-decoration:none;}"
    + "a{text-decoration:none;}"
    // Reduce side padding on mobile — the card's own inner padding (28px
    // desktop) drops to 20px, and the outer gutter (16px) drops to 12px, so
    // long names/phones get more usable width on a 320-390px screen.
    + "@media (max-width:480px){.abx-card{padding:20px !important;}.abx-outer{padding:20px 12px !important;}}"
    + "</style>"
    + "</head>"
    + "<body style=\"margin:0;padding:0;background:" + b.bgOuterLight + ";\">"
    + "<div style=\"display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;\">" + escapeHtml(parts.previewText || "") + "</div>"
    + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:" + b.bgOuterLight + ";\">"
    + "<tr><td align=\"center\" class=\"abx-outer\" style=\"padding:32px 16px;\">"
    + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:620px;\">"
    // Compact header — height cut mainly via padding (was 24px 32px).
    + "<tr><td style=\"background:" + b.bgHeader + ";padding:14px 24px;border-radius:12px 12px 0 0;\" align=\"center\">"
    + "<div style=\"font-family:" + b.fontStack + ";font-weight:800;font-size:14px;letter-spacing:0.06em;color:#ffffff;text-transform:uppercase;\">"
    + "Гамбарян <span style=\"color:" + b.gold + ";\">&amp;</span> Партнёры"
    + "</div>"
    + "<div style=\"margin-top:4px;font-family:" + b.fontStack + ";font-size:9px;font-weight:600;letter-spacing:0.28em;color:" + b.gold + ";text-transform:uppercase;\">Адвокаты</div>"
    + "</td></tr>"
    + "<tr><td class=\"abx-card\" style=\"background:" + b.bgCardLight + ";padding:28px;border-radius:0 0 12px 12px;\">"
    + parts.titleHtml
    + "<div style=\"" + dividerHtml() + "\">" + parts.contactHtml + "</div>"
    + "<div style=\"" + dividerHtml() + "\">" + parts.actionsHtml + "</div>"
    + parts.serviceHtml
    + "<div style=\"" + dividerHtml() + "\">" + parts.ctaHtml + "</div>"
    + "</td></tr>"
    + "</table>"
    + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:620px;\">"
    + "<tr><td align=\"center\" style=\"padding:16px 32px;\">"
    + "<span style=\"font-family:" + b.fontStack + ";font-size:12px;color:" + b.muted + ";\">" + escapeHtml(parts.footerText || "") + "</span>"
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

// Test-lead badge (owner request): utm_source containing "test" (e.g. the
// team's own "adfix_test" traffic) gets a clearly-marked badge next to the
// title so nobody in the office processes it as a real inquiry.
function isTestLead(fields) {
  return String((fields && fields.utm_source) || "").toLowerCase().indexOf("test") !== -1;
}
function testBadgeHtml() {
  var b = EMAIL_BRAND;
  return "<span style=\"display:inline-block;margin-left:8px;padding:4px 10px;"
    + "background:" + b.badgeBg + ";border:1px solid " + b.badgeBorder + ";border-radius:999px;"
    + "font-family:" + b.fontStack + ";font-size:11px;font-weight:700;color:" + b.badgeText + ";"
    + "white-space:normal;vertical-align:middle;\">Тестовая заявка — не обрабатывать</span>";
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

  // --- Title + time + optional test badge ---
  var titleHtml = "<div>"
    + "<span style=\"font-family:" + EMAIL_BRAND.fontStack + ";font-size:20px;font-weight:700;color:" + EMAIL_BRAND.ink + ";\">Новая заявка</span>"
    + (isTestLead(fields) ? testBadgeHtml() : "")
    + "</div>";
  if (receivedAtLabel) {
    var dtParts = receivedAtLabel.split(" ");
    var timeLine = escapeHtml(dtParts[0]) + " · " + escapeHtml(dtParts[1] || "") + " · время Израиля";
    titleHtml += "<div style=\"margin-top:6px;font-family:" + EMAIL_BRAND.fontStack + ";font-size:13px;color:" + EMAIL_BRAND.muted + ";\">" + timeLine + "</div>";
  }

  // --- ONE contact block: labels above values, name/phone/email together ---
  var contactHtml = stackedFieldHtml("Имя", escapeHtml(name), { first: true, fontSize: 20, fontWeight: 700, cls: "abx-name-value" });
  contactHtml += stackedFieldHtml("Телефон", escapeHtml(phone), { fontSize: 18, fontWeight: 700, cls: "abx-phone-value" });
  if (email) {
    contactHtml += stackedFieldHtml(
      "Email",
      "<a href=\"mailto:" + escapeHtml(email) + "\" style=\"color:" + EMAIL_BRAND.ink + ";text-decoration:underline;\">" + escapeHtml(email) + "</a>",
      { fontSize: 15, fontWeight: 400 },
    );
  }

  // --- Actions block: below the contact block, full card width ---
  var actionsHtml = telHref ? actionsBlockHtml(telHref, waHref) : "";

  // --- Muted service block: source + page (page links to the live site) ---
  var pageLabel = landingPath === "/" ? "Главная" : escapeHtml(landingPath);
  var pageHref = LANDING_ORIGIN + landingPath;
  var serviceHtml = "<div style=\"margin-top:16px;font-family:" + EMAIL_BRAND.fontStack + ";font-size:13px;line-height:1.6;color:" + EMAIL_BRAND.muted + ";\">"
    + "<div>Источник: " + escapeHtml(source) + "</div>"
    + (landingPath
      ? "<div style=\"margin-top:2px;\">Страница: <a href=\"" + escapeHtml(pageHref) + "\" style=\"color:" + EMAIL_BRAND.muted + ";text-decoration:underline;\">" + pageLabel + "</a></div>"
      : "")
    + "</div>";

  // --- Neutral (not wine) outline link to the sheet ---
  var ctaHtml = actionButtonHtml("Открыть таблицу заявок", SHEET_URL, { variant: "outline", minHeight: 46 });

  var footerText = "Автоматическое уведомление";

  var html = renderEmailShellHtml({
    previewText: "Новая заявка — " + name,
    titleHtml: titleHtml,
    contactHtml: contactHtml,
    actionsHtml: actionsHtml,
    serviceHtml: serviceHtml,
    ctaHtml: ctaHtml,
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

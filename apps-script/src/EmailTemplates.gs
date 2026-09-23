/**
 * EmailTemplates.gs — брендированные HTML-письма офиса (новая заявка, SLA,
 * эскалация). Design: задача 0.4.0 (Task B, владелец 2026-09-23).
 *
 * ЧИСТАЯ ЛОГИКА: рендер строится из плоского объекта данных, без обращения к
 * SpreadsheetApp/MailApp — тестируется в Node так же, как BusinessCalendar.gs/
 * SendLog.gs. Единственная внешняя зависимость — buildContactLinks_ (Utils.gs,
 * тоже чистая функция), уже используемая для «Связаться» в Sheets.
 *
 * Стиль — токены лендинга lp.gambarian.com (site/styles.css :root), НЕ шаблон
 * Assuta (синий/зелёный) — от него взята только СТРУКТУРА: шапка, белая
 * карточка, подписанные строки, кнопки действий. Тёмная, сдержанная,
 * юридическая подача: тёмная шапка с wordmark, золотой акцент, вино — основная
 * кнопка действия.
 *
 * Каждое поле пропускается через escapeHtml_ ПЕРЕД вставкой в HTML — имя вида
 * "<script>" или "=1+1" должно попасть в письмо как обычный текст, а не как
 * разметка/код (см. test/email-templates.test.mjs).
 */

var EMAIL_BRAND_ = {
  bgOuterLight: '#f6f1e8',
  bgHeader: '#0a0b0d',
  bgCardLight: '#ffffff',
  bgCardDark: '#151b22',
  bgOuterDark: '#101214',
  divider: '#e5e0d8',
  dividerDark: 'rgba(255,255,255,0.08)',
  gold: '#f0ae1f',
  goldLight: '#f5c451',
  wine: '#8a1f1f',
  wineHover: '#a02626',
  ink: '#14191f',
  inkOnDark: '#f2ede2',
  ink2: '#4b5158',
  ink3: '#6b7280',
  ink3Dark: '#9ca3af',
  border: '#d1d5db',
  // build-round email v2 (docs/crm-dashboard/EMAIL-CRITIQUE.md, top-5, owner "да"):
  // тёмные оверрайды secondary/outline кнопок — существующие оттенки бренда,
  // не новая палитра (см. email-v2.html, уже одобренный владельцем мокап).
  secondaryBgDark: '#1c232c',
  outlineBorderDark: '#c9736f',
  outlineTextDark: '#e7b0ad',
  fontStack: "'Onest', Helvetica, Arial, sans-serif"
};

/**
 * HTML-экранирование одного значения. Design задачи: "<script>"/"=1+1" должны
 * отрендериться как текст. Порядок замен важен — амперсанд первым.
 * @param {*} value
 * @return {string}
 */
function escapeHtml_(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Кнопка-ссылка ≥44px высотой (line-height трюк — надёжен в Gmail web/mobile).
 * @param {{bg, color, border, className}} [opts] className — для тёмных
 *   CSS-оверрайдов (см. renderEmailShellHtml_ .btn-outline и
 *   emailContactButtonsHtml_ .btn-secondary).
 */
function emailButtonHtml_(label, href, opts) {
  opts = opts || {};
  var bg = opts.bg || EMAIL_BRAND_.gold;
  var color = opts.color || EMAIL_BRAND_.ink;
  var border = opts.border ? ('border:1px solid ' + opts.border + ';') : '';
  var classAttr = opts.className ? (' class="' + opts.className + '"') : '';
  var style = 'display:inline-block;min-height:44px;line-height:44px;padding:0 22px;' +
    'background:' + bg + ';color:' + color + ';' + border +
    'font-family:' + EMAIL_BRAND_.fontStack + ';font-weight:700;font-size:13px;' +
    'border-radius:8px;text-decoration:none;white-space:nowrap;';
  return '<a href="' + escapeHtml_(href) + '"' + classAttr + ' style="' + style + '">' + escapeHtml_(label) + '</a>';
}

/**
 * Build-round owner correction (b): «Позвонить»/«Написать в WhatsApp» — РАВНОЙ
 * ширины и высоты, выровнены на 390px (мокап-стек с двумя разноширинными
 * inline-кнопками этому не удовлетворял: "Позвонить" короче "Написать в
 * WhatsApp"). Обе кнопки — блочные, шириной 100% контейнера, одна под другой —
 * это ОДНА разметка, работающая одинаково на 390 и 1024 без медиа-запроса на
 * переключение layout (email-клиенты поддерживают @media выборочно, а
 * "стек, обе на всю ширину" — один из двух вариантов, явно допущенных в задаче).
 * Заодно закрывает EMAIL-CRITIQUE.md рекомендацию №1 (контраст WhatsApp-кнопки,
 * WCAG 1.4.11 1.24:1 → ≥3:1: кремовая заливка + видимая граница вместо белого
 * на белом) и №5 (гарантированный вертикальный зазор — margin-top, не побочный
 * line-height).
 */
function emailContactButtonsHtml_(telHref, waHref) {
  var base = 'display:block;width:100%;box-sizing:border-box;min-height:44px;line-height:44px;text-align:center;' +
    'font-family:' + EMAIL_BRAND_.fontStack + ';font-weight:700;font-size:13px;border-radius:8px;text-decoration:none;';
  var callStyle = base + 'background:' + EMAIL_BRAND_.gold + ';color:' + EMAIL_BRAND_.ink + ';';
  var waStyle = base + 'background:' + EMAIL_BRAND_.bgOuterLight + ';color:' + EMAIL_BRAND_.ink +
    ';border:1px solid ' + EMAIL_BRAND_.ink3 + ';margin-top:8px;';
  return '<div style="margin-top:10px;">' +
    '<a href="' + escapeHtml_(telHref) + '" style="' + callStyle + '">Позвонить</a>' +
    '<a href="' + escapeHtml_(waHref) + '" class="btn-secondary" style="' + waStyle + '">Написать в WhatsApp</a>' +
    '</div>';
}

/** Одна подписанная строка карточки: слева серая метка, справа значение (HTML уже готов). */
function emailLabelledRowHtml_(label, valueHtml, opts) {
  opts = opts || {};
  var borderTop = opts.noBorderTop ? '' : ('border-top:1px solid ' + EMAIL_BRAND_.divider + ';');
  return '' +
    '<tr><td class="email-row" style="padding:14px 0;' + borderTop + '">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td class="email-text-muted" width="92" valign="top" style="font-family:' + EMAIL_BRAND_.fontStack + ';font-size:12px;color:' + EMAIL_BRAND_.ink3 + ';padding-top:2px;">' + escapeHtml_(label) + '</td>' +
    '<td class="email-text" style="font-family:' + EMAIL_BRAND_.fontStack + ';font-size:15px;color:' + EMAIL_BRAND_.ink + ';font-weight:600;">' + valueHtml + '</td>' +
    '</tr></table></td></tr>';
}

/**
 * Общая обёртка письма: шапка с wordmark лендинга + белая карточка + футер.
 * Design §"dark mode": @media (prefers-color-scheme: dark) переопределяет фон
 * карточки/страницы и цвет текста через классы email-bg/email-card/email-text*
 * (Gmail web и мобильный Gmail поддерживают <style> в <head>, включая media
 * queries — inline-стили остаются рабочим fallback для клиентов без поддержки).
 * @param {{previewText:string, titleHtml:string, rowsHtml:string, ctaHtml:string, footerText:string}} parts
 */
function renderEmailShellHtml_(parts) {
  var b = EMAIL_BRAND_;
  return '' +
    '<!DOCTYPE html>' +
    '<html lang="ru">' +
    '<head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<meta name="color-scheme" content="light dark">' +
    '<meta name="supported-color-schemes" content="light dark">' +
    '<title>' + escapeHtml_(parts.previewText || '') + '</title>' +
    '<style>' +
    'body,table,td{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}' +
    'img{border:0;outline:none;text-decoration:none;}' +
    'a{text-decoration:none;}' +
    '@media (prefers-color-scheme: dark) {' +
    '.email-bg{background:' + b.bgOuterDark + ' !important;}' +
    '.email-card{background:' + b.bgCardDark + ' !important;}' +
    '.email-text{color:' + b.inkOnDark + ' !important;}' +
    '.email-text-muted{color:' + b.ink3Dark + ' !important;}' +
    '.email-row{border-color:' + b.dividerDark + ' !important;}' +
    // EMAIL-CRITIQUE.md recommendation №1/№3: secondary (WhatsApp) и outline
    // («Открыть заявку») кнопки не переопределялись под тёмный режим вовсе —
    // secondary оставался плоским белым пятном на тёмной карточке, outline
    // держал винный бордер, малозаметный на почти чёрном фоне.
    '.btn-secondary{background:' + b.secondaryBgDark + ' !important;border-color:' + b.ink3Dark + ' !important;color:' + b.inkOnDark + ' !important;}' +
    '.btn-outline{border-color:' + b.outlineBorderDark + ' !important;color:' + b.outlineTextDark + ' !important;}' +
    '}' +
    '</style>' +
    '</head>' +
    '<body class="email-bg" style="margin:0;padding:0;background:' + b.bgOuterLight + ';">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">' + escapeHtml_(parts.previewText || '') + '</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-bg" style="background:' + b.bgOuterLight + ';">' +
    '<tr><td align="center" style="padding:32px 16px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;">' +
    '<tr><td style="background:' + b.bgHeader + ';padding:24px 32px;border-radius:12px 12px 0 0;" align="center">' +
    '<div style="font-family:' + b.fontStack + ';font-weight:800;font-size:16px;letter-spacing:0.06em;color:#ffffff;text-transform:uppercase;">' +
    'Гамбарян <span style="color:' + b.gold + ';">&amp;</span> Партнёры' +
    '</div>' +
    '<div style="margin-top:10px;font-family:' + b.fontStack + ';font-size:10px;font-weight:600;letter-spacing:0.32em;color:' + b.gold + ';text-transform:uppercase;">Адвокаты</div>' +
    '</td></tr>' +
    '<tr><td class="email-card" style="background:' + b.bgCardLight + ';padding:32px;border-radius:0 0 12px 12px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
    '<tr><td class="email-text" style="font-family:' + b.fontStack + ';font-size:20px;font-weight:700;color:' + b.ink + ';padding-bottom:20px;">' + parts.titleHtml + '</td></tr>' +
    parts.rowsHtml +
    '<tr><td style="padding-top:26px;" align="center">' + parts.ctaHtml + '</td></tr>' +
    '</table>' +
    '</td></tr>' +
    '</table>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;">' +
    '<tr><td align="center" style="padding:18px 32px;">' +
    // EMAIL-CRITIQUE.md recommendation №2: ink3 (#6b7280) на кремовом фоне
    // страницы (#f6f1e8) — WCAG AA FAIL, 4.3:1 < 4.5:1 (вычислено). ink2
    // (#4b5158) на том же фоне — 7.14:1, PASS с запасом. Только light — dark
    // override (.email-text-muted -> ink3Dark) уже проходил, не тронут.
    '<span class="email-text-muted" style="font-family:' + b.fontStack + ';font-size:12px;color:' + b.ink2 + ';">' + escapeHtml_(parts.footerText || '') + '</span>' +
    '</td></tr>' +
    '</table>' +
    '</td></tr>' +
    '</table>' +
    '</body></html>';
}

/**
 * design 0.4.0: № и время получения (Израиль), Имя, Телефон (кнопки
 * «Позвонить»/WhatsApp), Email (mailto), Откуда, кнопка «Открыть заявку»,
 * футер «Автоматическое уведомление о новой заявке · Гамбарян и партнёры».
 * Ни UTM, ни комментариев — только то, что перечислено в задаче.
 * @param {{leadNo, receivedAtLabel, name, phone, email, source, sheetUrl}} data
 * @return {{subject:string, html:string, text:string}}
 */
function renderNewLeadEmail_(data) {
  data = data || {};
  var leadNo = data.leadNo || '';
  var name = data.name || '';
  var phone = data.phone || '';
  var email = data.email || '';
  var source = data.source || '';
  var sheetUrl = data.sheetUrl || '';
  var receivedAtLabel = data.receivedAtLabel || '';
  var links = buildContactLinks_(phone);

  var phoneValueHtml = escapeHtml_(phone);
  if (links.digitsOnly) {
    phoneValueHtml += emailContactButtonsHtml_(links.telHref, links.waHref);
  }

  var rows = emailLabelledRowHtml_('Имя', escapeHtml_(name), { noBorderTop: true });
  rows += emailLabelledRowHtml_('Телефон', phoneValueHtml);
  if (email) {
    rows += emailLabelledRowHtml_('Email', '<a href="mailto:' + escapeHtml_(email) + '" class="email-text" style="color:' + EMAIL_BRAND_.ink + ';font-weight:600;">' + escapeHtml_(email) + '</a>');
  }
  rows += emailLabelledRowHtml_('Откуда', escapeHtml_(source || '—'));

  // EMAIL-CRITIQUE.md recommendation №3: «Открыть заявку» — outline, не filled.
  // «Позвонить» стартует SLA (design §5.5) и остаётся единственной loud-кнопкой;
  // «Открыть заявку» — административный шаг, не должен конкурировать взглядом.
  var cta = emailButtonHtml_('Открыть заявку', sheetUrl, { bg: 'transparent', color: EMAIL_BRAND_.wine, border: EMAIL_BRAND_.wine, className: 'btn-outline' });
  var titleHtml = 'Новая заявка ' + escapeHtml_(leadNo) +
    '<div style="margin-top:4px;font-size:13px;font-weight:400;color:' + EMAIL_BRAND_.ink3 + ';">Получена ' + escapeHtml_(receivedAtLabel) + ' (Израиль)</div>';
  var footerText = 'Автоматическое уведомление о новой заявке · Гамбарян и партнёры';

  var html = renderEmailShellHtml_({
    previewText: 'Новая заявка ' + leadNo + ' — ' + name,
    titleHtml: titleHtml,
    rowsHtml: rows,
    ctaHtml: cta,
    footerText: footerText
  });

  var textLines = [
    'Новая заявка ' + leadNo,
    'Получена ' + receivedAtLabel + ' (Израиль)',
    '',
    'Имя: ' + name,
    'Телефон: ' + phone + (links.digitsOnly ? ' (' + links.telHref + ', ' + links.waHref + ')' : ''),
  ];
  if (email) textLines.push('Email: ' + email);
  textLines.push('Откуда: ' + (source || '—'));
  textLines.push('');
  textLines.push('Открыть заявку: ' + sheetUrl);
  textLines.push('');
  textLines.push(footerText);

  return {
    // P1 A6 (review): № и Имя — внешние строки (Имя приходит с формы) в
    // subject письма; MailApp.sendEmail() не документирует санитизацию
    // control-символов в subject (см. stripSubjectControlChars_ в Utils.gs
    // для точной цитаты и URL) — CR/LF внутри значения заголовка письма это
    // классическая email header injection (RFC 5322 §2.2).
    subject: 'Новая заявка ' + stripSubjectControlChars_(leadNo) + ' — ' + stripSubjectControlChars_(name),
    html: html,
    text: textLines.join('\n')
  };
}

/**
 * Общий "короткий" шаблон SLA/эскалации: № + Имя + Телефон + «Открыть заявку»
 * + срочность (design задача 0.4.0 — "same style, short").
 * @param {{leadNo, name, phone, sheetUrl, waitingLabel, titleText, footerText, subjectPrefix}} data
 */
function renderShortLeadEmail_(data) {
  data = data || {};
  var leadNo = data.leadNo || '';
  var name = data.name || '';
  var phone = data.phone || '';
  var sheetUrl = data.sheetUrl || '';
  var waitingLabel = data.waitingLabel || '';
  var links = buildContactLinks_(phone);

  var phoneValueHtml = escapeHtml_(phone);
  if (links.digitsOnly) {
    phoneValueHtml += emailContactButtonsHtml_(links.telHref, links.waHref);
  }

  var rows = emailLabelledRowHtml_('Имя', escapeHtml_(name), { noBorderTop: true });
  rows += emailLabelledRowHtml_('Телефон', phoneValueHtml);

  var cta = emailButtonHtml_('Открыть заявку', sheetUrl, { bg: 'transparent', color: EMAIL_BRAND_.wine, border: EMAIL_BRAND_.wine, className: 'btn-outline' });
  // EMAIL-CRITIQUE.md recommendation №4: эскалация визуально неотличима от
  // рутинного SLA-напоминания — бейдж только здесь (renderSlaEscalationEmail_
  // передаёт data.badgeHtml), существующий цвет (wine), не новый.
  var badgeHtml = data.badgeHtml ? (data.badgeHtml + '<div style="height:8px;"></div>') : '';
  var titleHtml = badgeHtml + escapeHtml_(data.titleText || '') + ' ' + escapeHtml_(leadNo) +
    '<div style="margin-top:4px;font-size:13px;font-weight:400;color:' + EMAIL_BRAND_.ink3 + ';">' + escapeHtml_(waitingLabel) + '</div>';

  var html = renderEmailShellHtml_({
    previewText: (data.titleText || '') + ' ' + leadNo,
    titleHtml: titleHtml,
    rowsHtml: rows,
    ctaHtml: cta,
    footerText: data.footerText || ''
  });

  var textLines = [
    (data.titleText || '') + ' ' + leadNo,
    waitingLabel,
    '',
    'Имя: ' + name,
    'Телефон: ' + phone + (links.digitsOnly ? ' (' + links.telHref + ', ' + links.waHref + ')' : ''),
    '',
    'Открыть заявку: ' + sheetUrl,
    '',
    data.footerText || ''
  ];

  return {
    // P1 A6 — см. комментарий в renderNewLeadEmail_.
    subject: (data.subjectPrefix || (data.titleText || '')) + ' — ' + stripSubjectControlChars_(leadNo),
    html: html,
    text: textLines.join('\n')
  };
}

/** @param {{leadNo, name, phone, sheetUrl}} data */
function renderSlaFirstAttemptEmail_(data) {
  data = data || {};
  return renderShortLeadEmail_({
    leadNo: data.leadNo,
    name: data.name,
    phone: data.phone,
    sheetUrl: data.sheetUrl,
    titleText: 'SLA: нет первой попытки',
    subjectPrefix: 'SLA: нет первой попытки',
    waitingLabel: '30 рабочих минут без первой попытки',
    footerText: 'Автоматическое напоминание CRM · Гамбарян и партнёры'
  });
}

/** @param {{leadNo, name, phone, sheetUrl}} data */
function renderSlaEscalationEmail_(data) {
  data = data || {};
  return renderShortLeadEmail_({
    leadNo: data.leadNo,
    name: data.name,
    phone: data.phone,
    sheetUrl: data.sheetUrl,
    titleText: 'Эскалация: нет первой попытки 2ч',
    subjectPrefix: 'Эскалация: нет первой попытки 2ч',
    waitingLabel: 'Эскалация владельцу — 2 рабочих часа без первой попытки',
    footerText: 'Автоматическая эскалация CRM · Гамбарян и партнёры',
    badgeHtml: '<span style="background:' + EMAIL_BRAND_.wine + ';color:#fff;font-size:11px;font-weight:700;' +
      'letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:999px;">Эскалация</span>'
  });
}

/**
 * Config.gs — настройки читаются из листа «Настройки» (ключ/значение), а не
 * захардкожены в коде. Design: docs/MINI-CRM-DESIGN.md §5.3, §12.2/§12.3.
 *
 * Только spreadsheet id — константа (Config §задачи): всё остальное живёт
 * в «Настройках» и редактируется без правки кода. Значения recipients/duty
 * ниже — ПРЕДЛОЖЕННЫЕ владельцем дефолты из §12.2 ("ждёт подтверждения") —
 * setupCrm() пишет их один раз при первом создании листа, дальше их можно
 * менять прямо в таблице.
 */

var SPREADSHEET_ID_ = '1_jhfr7ucoKkbrwWlUQoS9wyw7uHYhe_oOutKpTlcoV4';
var SETTINGS_SHEET_NAME_ = 'Настройки';

// v1 (владелец 2026-09-23: «запустить сейчас», «не усложняй»): лист «Сводка» и
// воскресная сводка владельцу отложены до v2 — в день запуска данных нет,
// графики пустые. Код сохранён: включить = true и повторно запустить setupCrm().
var SUMMARY_SHEET_ENABLED_ = false;

var DEFAULT_SETTINGS_ = {
  tz: 'Asia/Jerusalem',
  business_days: '0,1,2,3,4', // 0=вс..6=сб (design §5.5: вс-чт)
  business_start: '09:00',
  business_end: '18:00',
  sla_first_attempt_minutes: '30',
  sla_escalation_minutes: '120',
  digest_time: '08:30',
  // build-round 2026-09-23: подтверждено владельцем в чате — 5 адресов
  // (было 2 ПРЕДЛОЖЕННЫХ в design §12.2; сначала подтверждены 4, затем
  // владелец добавил nat.shurygin@gmail.com — человек, который ведёт лиды
  // напрямую — финальный подтверждённый список).
  office_recipients: 'cityr.ta@gmail.com,justicetelaviv@gmail.com,gambarian@gmail.com,alex@adfix.co.il,nat.shurygin@gmail.com',
  escalation_recipients: 'gambarian@gmail.com,alex@adfix.co.il',
  system_alert_recipients: 'alex@adfix.co.il',
  owner_summary_recipient: 'gambarian@gmail.com',
  // build-round 2026-09-23: подтверждено владельцем — nat.shurygin@gmail.com
  // ведёт лиды напрямую (было ПРЕДЛОЖЕНО cityr.ta@gmail.com, design §12.2).
  default_duty_officer: 'nat.shurygin@gmail.com',
  staff_list: 'cityr.ta@gmail.com,justicetelaviv@gmail.com,nat.shurygin@gmail.com',
  observer_stale_minutes: '30',
  // review находка №5: ОДНО место хранения — строка «Настроек», не Script
  // Property (README раньше противоречил коду). Пустой дефолт — заполняется
  // вручную при подключении Albato; пока пусто, protectIntakeSheet_ работает
  // в режиме предупреждения (см. Sheets.gs), а не жёстко блокирует Albato.
  albato_editor_email: '',
  // review находка №13 / design §12 строка 7: дежурный на выходные/ночь —
  // настройка «Настроек», по умолчанию ВЫКЛЮЧЕНА (владелец: «пока нет»).
  weekend_duty_enabled: 'false',
  weekend_duty_email: '',
  // build-round (owner-approved addition, pipeline-health v1 contract):
  // здоровье бэкап/ретрай-воркера (Cloudflare, gambarian-lead-cron) — сугубо
  // техническая настройка, офис её не видит (design: «Настройки» и так не
  // видит офис — см. docs/MINI-CRM-DESIGN.md §2).
  pipeline_health_url: 'https://gambarian-lead-cron.alex-799.workers.dev/health'
};

// Ключи, по которым владелец ещё не подтвердил значение (design §12.2) —
// комментарий во втором листе «Настроек» явно про это напоминает.
// build-round 2026-09-23: office_recipients и default_duty_officer подтверждены
// владельцем в чате — остаётся только escalation_recipients.
var SETTINGS_PENDING_CONFIRMATION_ = ['escalation_recipients'];

var SETTINGS_COMMENTS_ = {
  business_days: '0=вс … 6=сб; design §5.5 — вс-чт',
  escalation_recipients: 'ЖДЁТ ПОДТВЕРЖДЕНИЯ владельца — design §12.2',
  default_duty_officer: 'подтверждено владельцем 2026-09-23',
  office_recipients: 'подтверждено владельцем 2026-09-23',
  owner_summary_recipient: 'воскресная сводка (design §5.6)',
  system_alert_recipients: 'heartbeat / независимый наблюдатель (design §5.7)',
  albato_editor_email: 'email аккаунта Albato для доступа к «Входящие» — заполнить при подключении Albato (design §5.1, review №5); пока пусто — защита «Входящие» в режиме предупреждения',
  weekend_duty_enabled: 'true/false — дежурный на выходные/ночь (design §12 строка 7). По умолчанию false',
  weekend_duty_email: 'email дежурного вне рабочего времени, используется только если weekend_duty_enabled=true',
  pipeline_health_url: 'GET .../health (pipeline-health v1) — проверяется раз в час из tick(), алерт system_alert_recipients при деградации'
};

/**
 * Строки для записи в «Настройки» при первом setupCrm() (заголовок + по строке
 * на параметр). Не перезаписывает существующие значения — вызывающий код должен
 * писать только отсутствующие ключи (см. Sheets.gs ensureSettingsSheet_).
 */
function buildDefaultSettingsRows_(overrides) {
  var merged = {};
  Object.keys(DEFAULT_SETTINGS_).forEach(function (k) { merged[k] = DEFAULT_SETTINGS_[k]; });
  Object.keys(overrides || {}).forEach(function (k) { merged[k] = overrides[k]; });

  var rows = [['Параметр', 'Значение', 'Комментарий']];
  Object.keys(merged).forEach(function (key) {
    rows.push([key, merged[key], SETTINGS_COMMENTS_[key] || '']);
  });
  return rows;
}

function splitList_(s) {
  return String(s === undefined || s === null ? '' : s)
    .split(',')
    .map(function (x) { return x.trim(); })
    .filter(Boolean);
}

/**
 * Разбирает строки листа «Настройки» (включая заголовок) в плоский объект
 * "ключ -> сырое строковое значение", подставляя дефолты для отсутствующих ключей.
 *
 * design fix item2 (Codex review, CHANGES_REQUESTED): раньше явно ОЧИЩЕННОЕ
 * значение (пустая строка в ячейке) не отличалось от "строки для ключа нет
 * вовсе" — обе ветки проваливались через `String(value) !== ''` и оставляли
 * ДЕФОЛТ активным. Итог: владелец очищает office_recipients, чтобы никому не
 * слать письма с ФИО/телефоном лида, а скрипт продолжает слать их дефолтным
 * адресам — PII продолжает уходить получателям, которых владелец явно убрал.
 * Теперь: строка для ключа ЕСТЬ в листе -> её значение используется КАК ЕСТЬ,
 * даже пустое (пустой список получателей = «не отправлять», splitList_('')
 * уже возвращает [] — см. Utils/Config splitList_). Дефолт из
 * DEFAULT_SETTINGS_ применяется ТОЛЬКО когда строки для ключа нет вовсе
 * (миграция схемы — buildDefaultSettingsRows_ дописывает новые ключи одной
 * строкой, ensureSettingsSheet_ в Sheets.gs).
 */
function parseSettingsRows_(rows) {
  var raw = {};
  Object.keys(DEFAULT_SETTINGS_).forEach(function (k) { raw[k] = DEFAULT_SETTINGS_[k]; });
  (rows || []).slice(1).forEach(function (row) {
    var key = row[0];
    if (!key) return;
    key = String(key).trim();
    if (!key) return;
    var value = row[1];
    raw[key] = value === undefined || value === null ? '' : String(value);
  });
  return raw;
}

/**
 * Приводит сырые строковые настройки к типизированному calendar/thresholds/recipients.
 * holidays и shortDays сюда не входят намеренно — они читаются из отдельных
 * табличек листа «Настройки» построчно (Sheets.gs readHolidaysAndShortDays_),
 * т.к. это списки переменной длины, а не пары ключ/значение.
 */
function normalizeSettings_(raw, holidaysAndShortDays) {
  var hs = holidaysAndShortDays || { holidays: [], shortDays: {} };
  return {
    tz: raw.tz,
    calendar: {
      tz: raw.tz,
      businessDays: String(raw.business_days).split(',').map(function (s) { return parseInt(s, 10); }),
      businessStart: raw.business_start,
      businessEnd: raw.business_end,
      holidays: hs.holidays,
      shortDays: hs.shortDays
    },
    thresholds: {
      slaFirstAttemptMinutes: parseInt(raw.sla_first_attempt_minutes, 10),
      slaEscalationMinutes: parseInt(raw.sla_escalation_minutes, 10)
    },
    digestTime: raw.digest_time,
    officeRecipients: splitList_(raw.office_recipients),
    escalationRecipients: splitList_(raw.escalation_recipients),
    systemAlertRecipients: splitList_(raw.system_alert_recipients),
    ownerSummaryRecipient: raw.owner_summary_recipient,
    defaultDutyOfficer: raw.default_duty_officer,
    staffList: splitList_(raw.staff_list),
    observerStaleMinutes: parseInt(raw.observer_stale_minutes, 10),
    albatoEditorEmail: raw.albato_editor_email || '',
    weekendDuty: {
      enabled: String(raw.weekend_duty_enabled).trim().toLowerCase() === 'true',
      email: raw.weekend_duty_email || ''
    },
    pipelineHealthUrl: raw.pipeline_health_url || ''
  };
}

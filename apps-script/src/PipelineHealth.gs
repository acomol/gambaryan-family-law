/**
 * PipelineHealth.gs — независимый наблюдатель за резервным
 * бэкап/ретрай-воркером (Cloudflare, gambarian-lead-cron). Build-round
 * addition (owner-approved), контракт "pipeline-health v1":
 *
 *   GET <pipeline_health_url> -> 200 JSON:
 *   {schema, generated_at,
 *    backup:{last_ok_at, last_run_at, integrity_ok},
 *    sweep:{last_ok_at, last_run_at},
 *    stuck_leads, albato_configured}
 *   D1 недоступна -> 503 {schema:1, error:"d1_unavailable"}
 *   backup — раз в час, sweep — раз в 5 минут (со стороны воркера).
 *   После фикса на сервере отсутствующая health-таблица -> 200 с null в
 *   backup/sweep полях — null читается как деградация (см. ниже), не как
 *   "здоровый ответ".
 *
 * evaluatePipelineHealth_ — ЧИСТАЯ функция (тестируется без фейков, как
 * BusinessCalendar.gs/SendLog.gs). checkPipelineHealth_ — GAS-only обвязка:
 * fetch раз в час (throttle через Script Properties), алерт на переходе
 * ok->degraded (once per incident, с ретраем на КАЖДОМ часовом тике, пока
 * письмо реально не доставлено — C2), recovery-письмо ТОЛЬКО после
 * доверенного здорового 200 (C1), каждый переход журналируется.
 * Собственный шаг tick() (runStepSafely_) — падение здесь не должно ронять
 * остальной цикл (design item6, тот же принцип).
 *
 * build-round fix (owner: «CRM — самое главное», c-health team, 2026-09-23):
 * C1 false recovery, C2 lost alert, C3 malformed contract read as healthy,
 * C4 empty system_alert_recipients, C5 one update email per reason change —
 * см. комментарии по месту.
 */

var PIPELINE_HEALTH_CHECK_INTERVAL_MS_ = 60 * 60 * 1000; // раз в час
var PIPELINE_HEALTH_BACKUP_MAX_AGE_MS_ = 2 * 60 * 60 * 1000; // 2ч
var PIPELINE_HEALTH_SWEEP_MAX_AGE_MS_ = 30 * 60 * 1000; // 30 минут
var PIPELINE_HEALTH_MAX_CONSECUTIVE_FETCH_FAILURES_ = 2; // "2 проверки подряд" — один сбой не алертит

/**
 * C3 (review health #1): строгая проверка контракта pipeline-health v1.
 * Официально задокументированные причины, по которым поле, которое КАЖЕТСЯ
 * валидным по JS-сравнению, на деле не является тем, что контракт обещает:
 *  - JSON.parse() бросает SyntaxError на невалидном JSON — уже обрабатывается
 *    ДО вызова этой функции (см. checkPipelineHealth_), сюда попадает либо
 *    null (тело не распарсилось), либо распарсенный объект.
 *    https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse#exceptions
 *  - new Date(x).getTime() для НЕВАЛИДНОЙ строки возвращает NaN, а не бросает
 *    и не null — поэтому "NaN < now - MAX_AGE" всегда false, и такая дата
 *    молча читалась как "ещё не устарела" (найдено ревью health #1).
 *    https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date
 *  - "3" > 0 и "false" === false в JS дают ложные результаты для полей,
 *    которые контракт обещает как number/boolean, а не string —
 *    stuck_leads:"abc" > 0 === false (читалось как 0 заявок), а
 *    albato_configured:"false" === false тоже false (читалось как настроен).
 * Возвращает строку причины (контракт нарушен) или null (контракт соблюдён).
 * Null в backup/sweep timestamps — ВАЛИДНЫЙ по контракту случай (см. шапку
 * файла, "после фикса на сервере") — не нарушение контракта, а деградация,
 * которую дальше обрабатывает основной цикл reasons в evaluatePipelineHealth_.
 * @param {*} healthJson распарсенный JSON (может быть null/не-объектом)
 * @return {string|null}
 */
function validatePipelineHealthContract_(healthJson) {
  function isValidIsoOrNull(v) {
    if (v === null || v === undefined) return true; // контракт: ISO|null
    if (typeof v !== 'string') return false;
    return !isNaN(new Date(v).getTime());
  }

  if (!healthJson || typeof healthJson !== 'object') {
    return 'ответ /health не по контракту (тело — не JSON-объект)';
  }
  if (healthJson.schema !== 1) {
    return 'ответ /health не по контракту (schema !== 1)';
  }
  if (!isValidIsoOrNull(healthJson.generated_at)) {
    return 'ответ /health не по контракту (generated_at — не ISO-дата)';
  }
  var backup = healthJson.backup;
  var sweep = healthJson.sweep;
  if (!backup || typeof backup !== 'object') {
    return 'ответ /health не по контракту (backup отсутствует/не объект)';
  }
  if (!sweep || typeof sweep !== 'object') {
    return 'ответ /health не по контракту (sweep отсутствует/не объект)';
  }
  if (!isValidIsoOrNull(backup.last_ok_at)) {
    return 'ответ /health не по контракту (backup.last_ok_at — не ISO-дата)';
  }
  if (!isValidIsoOrNull(backup.last_run_at)) {
    return 'ответ /health не по контракту (backup.last_run_at — не ISO-дата)';
  }
  if (backup.integrity_ok !== null && backup.integrity_ok !== undefined && typeof backup.integrity_ok !== 'boolean') {
    return 'ответ /health не по контракту (backup.integrity_ok — не boolean)';
  }
  if (!isValidIsoOrNull(sweep.last_ok_at)) {
    return 'ответ /health не по контракту (sweep.last_ok_at — не ISO-дата)';
  }
  if (!isValidIsoOrNull(sweep.last_run_at)) {
    return 'ответ /health не по контракту (sweep.last_run_at — не ISO-дата)';
  }
  if (typeof healthJson.stuck_leads !== 'number' || !isFinite(healthJson.stuck_leads) || Math.floor(healthJson.stuck_leads) !== healthJson.stuck_leads) {
    return 'ответ /health не по контракту (stuck_leads — не целое число)';
  }
  if (typeof healthJson.albato_configured !== 'boolean') {
    return 'ответ /health не по контракту (albato_configured — не boolean)';
  }
  return null;
}

/**
 * Оценивает состояние pipeline-health по УЖЕ распарсенному ответу (или его
 * отсутствию — сеть/парсинг подвели). Чистая функция, без сети/сайд-эффектов.
 *
 * C1 (false recovery, Codex P1-5): три состояния, не два. httpStatus !== 200
 * (сеть недоступна, timeout, 503 d1_unavailable) НИКОГДА не означает "ok" —
 * до накопления PIPELINE_HEALTH_MAX_CONSECUTIVE_FETCH_FAILURES_ подряд это
 * 'unknown' (недостаточно данных, чтобы решить хоть что-то — ни алертить, ни
 * снимать активный инцидент), после накопления — 'degraded'. Единственный
 * путь к 'ok' — доверенный ответ 200 с контрактно-валидным телом и всеми
 * полями в норме.
 * reasonCodes (C5, review health #5): в отличие от reasons (человекочитаемые
 * строки для письма — могут содержать переменные детали: конкретную дату,
 * счётчик подряд идущих сбоев), reasonCodes — стабильный набор категорий
 * деградации, не меняющийся, пока не изменилась ИМЕННО категория проблемы.
 * checkPipelineHealth_ дедуплицирует письма-обновления по reasonCodes, а не
 * по reasons — иначе, например, растущий "недоступен уже N проверок подряд"
 * слал бы новое письмо КАЖДЫЙ час одной и той же продолжающейся недоступности.
 * @param {Object|null} healthJson распарсенный JSON ответа (null — fetch/JSON.parse не удались)
 * @param {number} httpStatus код ответа (0, если запрос не удался вовсе)
 * @param {Date} now
 * @param {number} consecutiveFetchFailures сколько ПОДРЯД попыток fetch (включая эту) не дали 200
 * @return {{status:('ok'|'degraded'|'unknown'), reasons:string[], reasonCodes:string[], fetchFailed:boolean}}
 */
function evaluatePipelineHealth_(healthJson, httpStatus, now, consecutiveFetchFailures) {
  var networkFailed = httpStatus !== 200;
  if (networkFailed) {
    // "недоступен 2 проверки подряд — один блип не алертит": решение зависит
    // от НАКОПЛЕННОГО числа подряд идущих неудач, которое считает вызывающий
    // код (Script Properties переживают между тиками, эта функция — нет).
    // Один блип — 'unknown', НЕ 'ok': вызывающий код не должен трактовать
    // недостающую информацию как признак восстановления (C1).
    var degradedByFetch = consecutiveFetchFailures >= PIPELINE_HEALTH_MAX_CONSECUTIVE_FETCH_FAILURES_;
    return {
      status: degradedByFetch ? 'degraded' : 'unknown',
      reasons: degradedByFetch
        ? ['/health недоступен уже ' + consecutiveFetchFailures + ' проверки подряд (код ответа: ' + httpStatus + ')']
        : [],
      reasonCodes: degradedByFetch ? ['fetch_unreachable'] : [],
      fetchFailed: true
    };
  }

  // httpStatus === 200 с этого момента — сервер ответил, но C3: тело могло
  // быть невалидным JSON (healthJson === null) или контрактно неверным.
  var contractError = validatePipelineHealthContract_(healthJson);
  if (contractError) {
    // Контрактная ошибка — НЕ сетевой сбой (сервер жив и ответил 200), поэтому
    // не требует накопления consecutiveFetchFailures — алертим сразу, как
    // любую другую подтверждённую деградацию.
    return { status: 'degraded', reasons: [contractError], reasonCodes: ['contract_violation'], fetchFailed: false };
  }

  var reasons = [];
  var reasonCodes = [];
  var backup = healthJson.backup || {};
  var sweep = healthJson.sweep || {};

  if (!backup.last_ok_at) {
    reasons.push('backup.last_ok_at отсутствует');
    reasonCodes.push('backup_missing');
  } else if (new Date(backup.last_ok_at).getTime() < now.getTime() - PIPELINE_HEALTH_BACKUP_MAX_AGE_MS_) {
    reasons.push('backup.last_ok_at старше 2ч (' + backup.last_ok_at + ')');
    reasonCodes.push('backup_stale');
  }
  if (backup.integrity_ok === false) {
    reasons.push('backup.integrity_ok = false');
    reasonCodes.push('backup_integrity');
  }
  if (!sweep.last_ok_at) {
    reasons.push('sweep.last_ok_at отсутствует');
    reasonCodes.push('sweep_missing');
  } else if (new Date(sweep.last_ok_at).getTime() < now.getTime() - PIPELINE_HEALTH_SWEEP_MAX_AGE_MS_) {
    reasons.push('sweep.last_ok_at старше 30 минут (' + sweep.last_ok_at + ')');
    reasonCodes.push('sweep_stale');
  }
  if ((healthJson.stuck_leads || 0) > 0) {
    reasons.push('stuck_leads = ' + healthJson.stuck_leads);
    reasonCodes.push('stuck_leads');
  }
  if (healthJson.albato_configured === false) {
    reasons.push('albato_configured = false');
    reasonCodes.push('albato_not_configured');
  }

  return { status: reasons.length === 0 ? 'ok' : 'degraded', reasons: reasons, reasonCodes: reasonCodes, fetchFailed: false };
}

/**
 * C4 (review health #3): system_alert_recipients пуст (владелец мог очистить
 * настройку) — событие не должно уходить в никуда молча. Фолбэк — тот же
 * self-identity паттерн, который уже используется в кодовой базе для
 * "владельца скрипта" (Sheets.gs: Session.getEffectiveUser().getEmail()).
 * Официально: https://developers.google.com/apps-script/reference/base/session#getEffectiveUser()
 * — при обычном запуске (не onEdit/onOpen simple trigger, не web-app "execute
 * as me" для чужого пользователя) возвращает реальный email; пустая строка
 * возможна только при отсутствии доступа к identity — в этом случае фолбэку
 * просто некуда слать, sendNotificationOnce_ логирует и не бросает.
 * @return {string[]}
 */
function resolvePipelineHealthAlertRecipients_(config) {
  if (config.systemAlertRecipients && config.systemAlertRecipients.length) {
    return config.systemAlertRecipients;
  }
  var effectiveEmail = Session.getEffectiveUser().getEmail();
  return effectiveEmail ? [effectiveEmail] : [];
}

/**
 * GAS-обвязка: throttle раз в час, fetch, оценка, алерт/recovery once-per-
 * incident (с ретраем недоставленного письма — C2), журналирование. Никогда
 * не бросает наружу за пределами throttle-проверки — вызывается через
 * runStepSafely_ из tick() (design item6 паттерн), но и сама по себе не
 * должна уронить остальной tick() при отсутствии этой защиты (защитный try
 * вокруг fetch — на случай прямого вызова из теста/другого места).
 */
function checkPipelineHealth_(ss, config, now) {
  var props = PropertiesService.getScriptProperties();
  var lastCheckAt = props.getProperty('pipelineHealthLastCheckAt');
  if (lastCheckAt && now.getTime() - new Date(lastCheckAt).getTime() < PIPELINE_HEALTH_CHECK_INTERVAL_MS_) {
    return; // design: не чаще раза в час
  }

  var url = config.pipelineHealthUrl;
  if (!url) return; // не настроено (пустая строка в «Настройках») — не пытаемся

  var httpStatus = 0;
  var healthJson = null;
  try {
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    httpStatus = response.getResponseCode();
    if (httpStatus === 200) {
      try {
        healthJson = JSON.parse(response.getContentText());
      } catch (parseErr) {
        // C3: тело НЕ распарсилось, но сервер ЖИВ и ответил 200 — это
        // нарушение контракта, а не сетевой сбой (httpStatus остаётся 200,
        // healthJson остаётся null -> validatePipelineHealthContract_ поймает).
        Logger.log('checkPipelineHealth_: JSON.parse ошибка: %s', parseErr);
        healthJson = null;
      }
    }
  } catch (err) {
    // Сетевой уровень (DNS/timeout/и т.п.) — UrlFetchApp бросает независимо
    // от muteHttpExceptions для таких ошибок (не для HTTP-кода ответа).
    Logger.log('checkPipelineHealth_: fetch ошибка: %s', err);
    httpStatus = 0;
    healthJson = null;
  }

  // Счётчик "подряд неудач" должен отражать именно НЕДОСТУПНОСТЬ сети/сервера
  // (httpStatus !== 200), а не контрактные ошибки при живом 200-ответе (C3) —
  // сервер, ответивший 200 с мусором в теле, доказанно ДОСТУПЕН.
  var fetchFailedNow = httpStatus !== 200;
  var prevConsecutiveFailures = parseInt(props.getProperty('pipelineHealthConsecutiveFailures') || '0', 10);
  var consecutiveFailures = fetchFailedNow ? prevConsecutiveFailures + 1 : 0;
  props.setProperty('pipelineHealthConsecutiveFailures', String(consecutiveFailures));
  props.setProperty('pipelineHealthLastCheckAt', now.toISOString());

  var state = evaluatePipelineHealth_(healthJson, httpStatus, now, consecutiveFailures);
  var journal = ss.getSheetByName(SHEET_JOURNAL_);
  var wasDegraded = props.getProperty('pipelineHealthDegraded') === 'true';
  var recipients = resolvePipelineHealthAlertRecipients_(config);

  if (state.status === 'unknown') {
    // C1: недостаточно данных, чтобы решить хоть что-то — НЕ трогаем
    // существующий инцидент (ни алерт, ни recovery).
    return;
  }

  if (state.status === 'degraded') {
    var reasonsSignature = state.reasonCodes.slice().sort().join(',');
    var isNewIncident = !wasDegraded;
    var degradedSince;
    if (isNewIncident) {
      degradedSince = now.toISOString();
      props.setProperty('pipelineHealthDegraded', 'true');
      props.setProperty('pipelineHealthDegradedSince', degradedSince);
      props.setProperty('pipelineHealthReasonsSignature', '');
      appendJournalRow_(journal, now, '', 'pipeline_health_degraded', 'sent', 'internal',
        state.reasons.join('; '), 'pipeline_health:degraded:' + now.getTime());
    } else {
      degradedSince = props.getProperty('pipelineHealthDegradedSince') || now.toISOString();
    }

    // C5: набор причин не изменился с последнего письма по этому инциденту —
    // ретраить нечего нового, но C2 (недоставленный алерт) всё ещё должен
    // повторяться — это делает сам sendNotificationOnce_ по СТАБИЛЬНОМУ ключу
    // ниже (SENT по этому ключу -> skip, FAILED/UNKNOWN -> retry).
    var prevSignature = props.getProperty('pipelineHealthReasonsSignature') || '';
    if (prevSignature !== reasonsSignature) {
      props.setProperty('pipelineHealthReasonsSignature', reasonsSignature);
      if (!isNewIncident) {
        appendJournalRow_(journal, now, '', 'pipeline_health_degraded_update', 'sent', 'internal',
          state.reasons.join('; '), 'pipeline_health:degraded_update:' + now.getTime());
      }
    }

    // C2 (lost alert, Codex P1-6 + review health #2): ключ привязан к
    // инциденту+набору причин, НЕ к моменту тика (now.getTime() менялся бы
    // каждый час) — sendNotificationOnce_/decideSendAction_ (SendLog.gs)
    // сами решают send/skip по журналу: SENT -> skip (не спамим), FAILED ->
    // retry (недоставленное письмо повторяется на СЛЕДУЮЩЕМ часовом тике,
    // а не считается отправленным по факту одной попытки).
    var alertKey = 'pipeline_health_alert:' + degradedSince + ':' + reasonsSignature;
    sendNotificationOnce_(journal, alertKey, '', 'pipeline_health_degraded', 'email',
      recipients, 'CRM: проблема с приёмом заявок',
      'Проверка приёма заявок (pipeline-health) обнаружила ' +
      'проблему с ' + degradedSince + ':\n\n' + state.reasons.join('\n') +
      '\n\nПроверьте резервный воркер (gambarian-lead-cron).');
    return;
  }

  // state.status === 'ok' — единственный путь сюда: доверенный здоровый 200 (C1).
  if (!wasDegraded) return; // и раньше было в порядке — тихо, без письма

  var since = props.getProperty('pipelineHealthDegradedSince') || '';
  var recoveryKey = 'pipeline_health_recovery:' + since;
  var result = sendNotificationOnce_(journal, recoveryKey, '', 'pipeline_health_recovered', 'email',
    recipients, 'CRM: приём заявок восстановлен',
    'Проверка приёма заявок (pipeline-health) снова в порядке. ' +
    'Проблема была с ' + since + '.');
  if (!result.sent) return; // C2: недоставленное recovery-письмо повторяем на следующем тике — инцидент остаётся "активным"

  appendJournalRow_(journal, now, '', 'pipeline_health_recovered', 'sent', 'internal', 'recovered',
    'pipeline_health:recovered:' + now.getTime());
  props.setProperty('pipelineHealthDegraded', 'false');
  props.setProperty('pipelineHealthReasonsSignature', '');
}

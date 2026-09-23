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
 *
 * evaluatePipelineHealth_ — ЧИСТАЯ функция (тестируется без фейков, как
 * BusinessCalendar.gs/SendLog.gs). checkPipelineHealth_ — GAS-only обвязка:
 * fetch раз в час (throttle через Script Properties), alert на переходе
 * ok->degraded (once per incident — тот же паттерн, что reportCycleHealth_ в
 * Code.gs), recovery-письмо на degraded->ok, каждый переход журналируется.
 * Собственный шаг tick() (runStepSafely_) — падение здесь не должно ронять
 * остальной цикл (design item6, тот же принцип).
 */

var PIPELINE_HEALTH_CHECK_INTERVAL_MS_ = 60 * 60 * 1000; // раз в час
var PIPELINE_HEALTH_BACKUP_MAX_AGE_MS_ = 2 * 60 * 60 * 1000; // 2ч
var PIPELINE_HEALTH_SWEEP_MAX_AGE_MS_ = 30 * 60 * 1000; // 30 минут
var PIPELINE_HEALTH_MAX_CONSECUTIVE_FETCH_FAILURES_ = 2; // "2 проверки подряд" — один сбой не алертит

/**
 * Оценивает состояние pipeline-health по ЮЖЕ распарсенному ответу (или его
 * отсутствию — сеть/парсинг подвели). Чистая функция, без сети/сайд-эффектов.
 * @param {Object|null} healthJson распарсенный JSON ответа (null — fetch/JSON.parse не удались)
 * @param {number} httpStatus код ответа (0, если запрос не удался вовсе)
 * @param {Date} now
 * @param {number} consecutiveFetchFailures сколько ПОДРЯД попыток fetch (включая эту) не дали 200+JSON
 * @return {{ok:boolean, reasons:string[], fetchFailed:boolean}}
 */
function evaluatePipelineHealth_(healthJson, httpStatus, now, consecutiveFetchFailures) {
  var fetchFailed = httpStatus !== 200 || !healthJson;
  if (fetchFailed) {
    // "недоступен 2 проверки подряд — один блип не алертит": решение зависит
    // от НАКОПЛЕННОГО числа подряд идущих неудач, которое считает вызывающий
    // код (Script Properties переживают между тиками, эта функция — нет).
    var degradedByFetch = consecutiveFetchFailures >= PIPELINE_HEALTH_MAX_CONSECUTIVE_FETCH_FAILURES_;
    return {
      ok: !degradedByFetch,
      reasons: degradedByFetch
        ? ['/health недоступен уже ' + consecutiveFetchFailures + ' проверки подряд (код ответа: ' + httpStatus + ')']
        : [],
      fetchFailed: true
    };
  }

  var reasons = [];
  var backup = healthJson.backup || {};
  var sweep = healthJson.sweep || {};

  if (!backup.last_ok_at) {
    reasons.push('backup.last_ok_at отсутствует');
  } else if (new Date(backup.last_ok_at).getTime() < now.getTime() - PIPELINE_HEALTH_BACKUP_MAX_AGE_MS_) {
    reasons.push('backup.last_ok_at старше 2ч (' + backup.last_ok_at + ')');
  }
  if (backup.integrity_ok === false) {
    reasons.push('backup.integrity_ok = false');
  }
  if (!sweep.last_ok_at) {
    reasons.push('sweep.last_ok_at отсутствует');
  } else if (new Date(sweep.last_ok_at).getTime() < now.getTime() - PIPELINE_HEALTH_SWEEP_MAX_AGE_MS_) {
    reasons.push('sweep.last_ok_at старше 30 минут (' + sweep.last_ok_at + ')');
  }
  if ((healthJson.stuck_leads || 0) > 0) {
    reasons.push('stuck_leads = ' + healthJson.stuck_leads);
  }
  if (healthJson.albato_configured === false) {
    reasons.push('albato_configured = false');
  }

  return { ok: reasons.length === 0, reasons: reasons, fetchFailed: false };
}

/**
 * GAS-обвязка: throttle раз в час, fetch, оценка, алерт/recovery once-per-
 * incident, журналирование. Никогда не бросает наружу — вызывается через
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
      healthJson = JSON.parse(response.getContentText());
    }
  } catch (err) {
    Logger.log('checkPipelineHealth_: fetch/parse ошибка: %s', err);
    httpStatus = 0;
    healthJson = null;
  }

  var fetchFailedNow = httpStatus !== 200 || !healthJson;
  var prevConsecutiveFailures = parseInt(props.getProperty('pipelineHealthConsecutiveFailures') || '0', 10);
  var consecutiveFailures = fetchFailedNow ? prevConsecutiveFailures + 1 : 0;
  props.setProperty('pipelineHealthConsecutiveFailures', String(consecutiveFailures));
  props.setProperty('pipelineHealthLastCheckAt', now.toISOString());

  var state = evaluatePipelineHealth_(healthJson, httpStatus, now, consecutiveFailures);
  var journal = ss.getSheetByName(SHEET_JOURNAL_);
  var wasDegraded = props.getProperty('pipelineHealthDegraded') === 'true';

  if (!state.ok) {
    props.setProperty('pipelineHealthDegraded', 'true');
    if (wasDegraded) return; // уже алертили этот инцидент (once per incident)
    var degradedSince = now.toISOString();
    props.setProperty('pipelineHealthDegradedSince', degradedSince);
    appendJournalRow_(journal, now, '', 'pipeline_health_degraded', 'sent', 'internal',
      state.reasons.join('; '), 'pipeline_health:degraded:' + now.getTime());
    sendNotificationOnce_(journal, 'pipeline_health_alert:' + now.getTime(), '', 'pipeline_health_degraded', 'email',
      config.systemAlertRecipients, 'CRM: проблема с приёмом заявок',
      'Проверка приёма заявок (pipeline-health) обнаружила ' +
      'проблему с ' + degradedSince + ':\n\n' + state.reasons.join('\n') +
      '\n\nПроверьте резервный воркер (gambarian-lead-cron).');
    return;
  }

  props.setProperty('pipelineHealthDegraded', 'false');
  if (!wasDegraded) return; // и раньше было в порядке — тихо, без письма
  var since = props.getProperty('pipelineHealthDegradedSince') || '';
  appendJournalRow_(journal, now, '', 'pipeline_health_recovered', 'sent', 'internal', 'recovered',
    'pipeline_health:recovered:' + now.getTime());
  sendNotificationOnce_(journal, 'pipeline_health_recovery:' + now.getTime(), '', 'pipeline_health_recovered', 'email',
    config.systemAlertRecipients, 'CRM: приём заявок восстановлен',
    'Проверка приёма заявок (pipeline-health) снова в порядке. ' +
    'Проблема была с ' + since + '.');
}

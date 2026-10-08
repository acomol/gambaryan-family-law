// PipelineHealth.gs — независимый наблюдатель за резервным бэкап/ретрай-
// воркером (gambarian-lead-cron), build-round addition (owner-approved).
// evaluatePipelineHealth_ — ЧИСТАЯ функция (без фейков); checkPipelineHealth_ —
// GAS-обвязка, тестируется через структурные фейки (UrlFetchApp/Properties/
// MailApp/Sheets), тем же приёмом, что и остальной Code.gs.
import { test, assert } from './helpers/harness.mjs';
import { loadGasContext } from './helpers/load-gas.mjs';
import {
  makeFakeSheet, makeFakeSpreadsheet, makeFakeSpreadsheetApp,
  makeFakePropertiesService, makeFakeMailApp, makeFakeUrlFetchApp, makeFakeSession
} from './helpers/gas-fakes.mjs';

var HEALTH_URL = 'https://gambarian-lead-cron.alex-799.workers.dev/health';

function buildConfig(overrides) {
  return Object.assign({
    tz: 'Asia/Jerusalem',
    systemAlertRecipients: ['alex@adfix.co.il'],
    pipelineHealthUrl: HEALTH_URL
  }, overrides || {});
}

function okHealthBody(overrides) {
  return JSON.stringify(Object.assign({
    schema: 1,
    generated_at: '2026-09-23T10:00:00Z',
    backup: { last_ok_at: '2026-09-23T09:30:00Z', last_run_at: '2026-09-23T09:30:00Z', integrity_ok: true },
    sweep: { last_ok_at: '2026-09-23T09:58:00Z', last_run_at: '2026-09-23T09:58:00Z' },
    stuck_leads: 0,
    albato_configured: true
  }, overrides || {}));
}

function newHarness(urlFetchOpts) {
  const props = makeFakePropertiesService({});
  const mail = makeFakeMailApp();
  const urlFetch = makeFakeUrlFetchApp(urlFetchOpts);
  const ctx = loadGasContext(undefined, {
    PropertiesService: props,
    MailApp: mail,
    UrlFetchApp: urlFetch,
    Session: makeFakeSession('alex@adfix.co.il'),
    SpreadsheetApp: makeFakeSpreadsheetApp({})
  });
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Журнал': journal });
  return { ctx, props, mail, urlFetch, journal, ss };
}

// =============================================================================
// evaluatePipelineHealth_ — чистая логика
// =============================================================================

const pureCtx = loadGasContext(['PipelineHealth.gs']);

test('evaluatePipelineHealth_: всё в порядке -> ok:true, без причин', () => {
  const now = new Date('2026-09-23T10:00:00Z');
  const health = JSON.parse(okHealthBody());
  const state = pureCtx.evaluatePipelineHealth_(health, 200, now, 0);
  assert.equal(state.status, 'ok');
  assert.equal(state.reasons.length, 0);
});

test('evaluatePipelineHealth_: backup.last_ok_at null -> degraded', () => {
  const now = new Date('2026-09-23T10:00:00Z');
  const health = JSON.parse(okHealthBody({ backup: { last_ok_at: null, last_run_at: null, integrity_ok: null } }));
  const state = pureCtx.evaluatePipelineHealth_(health, 200, now, 0);
  assert.equal(state.status, 'degraded');
  assert.ok(state.reasons.some((r) => r.indexOf('backup.last_ok_at') !== -1));
});

test('evaluatePipelineHealth_: backup.last_ok_at старше 2ч -> degraded', () => {
  const now = new Date('2026-09-23T10:00:00Z');
  const health = JSON.parse(okHealthBody({ backup: { last_ok_at: '2026-09-23T07:00:00Z', last_run_at: '2026-09-23T07:00:00Z', integrity_ok: true } })); // 3ч назад
  const state = pureCtx.evaluatePipelineHealth_(health, 200, now, 0);
  assert.equal(state.status, 'degraded');
  assert.ok(state.reasons.some((r) => r.indexOf('старше 2ч') !== -1));
});

test('evaluatePipelineHealth_: backup.last_ok_at РОВНО 2ч назад -> ещё не degraded (граница)', () => {
  const now = new Date('2026-09-23T10:00:00Z');
  const health = JSON.parse(okHealthBody({ backup: { last_ok_at: '2026-09-23T08:00:00Z', last_run_at: '2026-09-23T08:00:00Z', integrity_ok: true } }));
  const state = pureCtx.evaluatePipelineHealth_(health, 200, now, 0);
  assert.equal(state.status, 'ok');
});

test('evaluatePipelineHealth_: backup.integrity_ok === false -> degraded', () => {
  const now = new Date('2026-09-23T10:00:00Z');
  const health = JSON.parse(okHealthBody({ backup: { last_ok_at: '2026-09-23T09:30:00Z', last_run_at: '2026-09-23T09:30:00Z', integrity_ok: false } }));
  const state = pureCtx.evaluatePipelineHealth_(health, 200, now, 0);
  assert.equal(state.status, 'degraded');
  assert.ok(state.reasons.some((r) => r.indexOf('integrity_ok') !== -1));
});

test('evaluatePipelineHealth_: sweep.last_ok_at null или старше 30 минут -> degraded', () => {
  const now = new Date('2026-09-23T10:00:00Z');
  const nullSweep = pureCtx.evaluatePipelineHealth_(JSON.parse(okHealthBody({ sweep: { last_ok_at: null, last_run_at: null } })), 200, now, 0);
  assert.equal(nullSweep.status, 'degraded');
  assert.ok(nullSweep.reasons.some((r) => r.indexOf('sweep.last_ok_at') !== -1 && r.indexOf('отсутствует') !== -1));

  const staleSweep = pureCtx.evaluatePipelineHealth_(JSON.parse(okHealthBody({ sweep: { last_ok_at: '2026-09-23T09:00:00Z', last_run_at: '2026-09-23T09:00:00Z' } })), 200, now, 0); // час назад
  assert.equal(staleSweep.status, 'degraded');
  assert.ok(staleSweep.reasons.some((r) => r.indexOf('старше 30 минут') !== -1));
});

test('evaluatePipelineHealth_: stuck_leads > 0 -> degraded', () => {
  const now = new Date('2026-09-23T10:00:00Z');
  const state = pureCtx.evaluatePipelineHealth_(JSON.parse(okHealthBody({ stuck_leads: 3 })), 200, now, 0);
  assert.equal(state.status, 'degraded');
  assert.ok(state.reasons.some((r) => r.indexOf('stuck_leads = 3') !== -1));
});

test('evaluatePipelineHealth_: albato_configured === false -> degraded', () => {
  const now = new Date('2026-09-23T10:00:00Z');
  const state = pureCtx.evaluatePipelineHealth_(JSON.parse(okHealthBody({ albato_configured: false })), 200, now, 0);
  assert.equal(state.status, 'degraded');
  assert.ok(state.reasons.some((r) => r.indexOf('albato_configured') !== -1));
});

test('evaluatePipelineHealth_: 503/d1_unavailable — это fetchFailed (не 200), считается как недоступность', () => {
  const now = new Date('2026-09-23T10:00:00Z');
  const state1 = pureCtx.evaluatePipelineHealth_(null, 503, now, 1);
  assert.equal(state1.fetchFailed, true);
  assert.equal(state1.status, 'unknown', 'первая неудача подряд — недостаточно данных (unknown), не degraded и не ok');
  const state2 = pureCtx.evaluatePipelineHealth_(null, 503, now, 2);
  assert.equal(state2.status, 'degraded', 'вторая неудача подряд — degraded');
});

// =============================================================================
// checkPipelineHealth_ — GAS-обвязка через фейки
// =============================================================================

test('checkPipelineHealth_: fetch fails ОДИН раз -> НЕ degraded, письма нет (один блип не алертит)', () => {
  const { ctx, mail, journal, ss } = newHarness({ responses: [{ shouldThrow: 'timeout' }] });
  ctx.checkPipelineHealth_(ss, buildConfig(), new Date('2026-09-23T10:00:00Z'));
  assert.equal(mail._sent.length, 0);
  assert.equal(journal._data.length, 0);
});

test('checkPipelineHealth_: fetch fails ДВА раза подряд (2 часовые проверки) -> degraded, алерт уходит РОВНО один раз', () => {
  const { ctx, mail, journal, ss } = newHarness({ responses: [{ shouldThrow: 'timeout' }, { shouldThrow: 'timeout' }] });
  const config = buildConfig();

  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T10:00:00Z'));
  assert.equal(mail._sent.length, 0, 'первая неудача — не алертим');

  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T11:00:00Z')); // час спустя — throttle пропускает
  assert.equal(mail._sent.length, 1, 'вторая неудача подряд — алерт');
  assert.equal(mail._sent[0].to, 'alex@adfix.co.il');
  assert.ok(mail._sent[0].body.indexOf('недоступен') !== -1);
  assert.ok(journal._data.some((r) => r[2] === 'pipeline_health_degraded'));

  // третья проверка (тоже провалилась бы, но degraded уже true) — НЕ должна слать повторно
  const urlFetch3 = makeFakeUrlFetchApp({ responses: [{ shouldThrow: 'timeout' }] });
  ctx.UrlFetchApp = urlFetch3;
  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T12:00:00Z'));
  assert.equal(mail._sent.length, 1, 'деградация продолжается — повторного письма быть не должно (once per incident)');
});

test('checkPipelineHealth_: каждое условие деградации триггерит алерт (backup 2ч/sweep 30мин/stuck_leads/albato)', () => {
  const cases = [
    { label: 'backup 2ч', body: okHealthBody({ backup: { last_ok_at: '2026-09-23T07:00:00Z', last_run_at: '2026-09-23T07:00:00Z', integrity_ok: true } }) },
    { label: 'backup.integrity_ok=false', body: okHealthBody({ backup: { last_ok_at: '2026-09-23T09:30:00Z', last_run_at: '2026-09-23T09:30:00Z', integrity_ok: false } }) },
    { label: 'sweep 30мин', body: okHealthBody({ sweep: { last_ok_at: '2026-09-23T09:00:00Z', last_run_at: '2026-09-23T09:00:00Z' } }) },
    { label: 'stuck_leads', body: okHealthBody({ stuck_leads: 1 }) },
    { label: 'albato_configured=false', body: okHealthBody({ albato_configured: false }) }
  ];
  cases.forEach((c) => {
    const { ctx, mail, ss } = newHarness({ responses: [{ code: 200, body: c.body }] });
    ctx.checkPipelineHealth_(ss, buildConfig(), new Date('2026-09-23T10:00:00Z'));
    assert.equal(mail._sent.length, 1, c.label + ' должно алертить немедленно (не сетевая ошибка — не нужно 2 подряд)');
  });
});

test('checkPipelineHealth_: recovery-письмо на переходе degraded -> ok', () => {
  // важно: timestamps в "здоровом" ответе должны быть СВЕЖИМИ ОТНОСИТЕЛЬНО
  // момента ТРЕТЬЕЙ проверки (12:00) — иначе тот же фикстур-JSON, "здоровый"
  // в 10:00, сам становится "устаревшим" (backup >2ч) к 12:00 и recovery не
  // происходит вовсе.
  const recoveredBody = okHealthBody({
    backup: { last_ok_at: '2026-09-23T11:45:00Z', last_run_at: '2026-09-23T11:45:00Z', integrity_ok: true },
    sweep: { last_ok_at: '2026-09-23T11:58:00Z', last_run_at: '2026-09-23T11:58:00Z' }
  });
  const { ctx, mail, journal, ss } = newHarness({
    responses: [{ shouldThrow: 'x' }, { shouldThrow: 'x' }, { code: 200, body: recoveredBody }]
  });
  const config = buildConfig();

  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T10:00:00Z'));
  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T11:00:00Z'));
  assert.equal(mail._sent.length, 1, 'деградация подтверждена');

  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T12:00:00Z'));
  assert.equal(mail._sent.length, 2, 'должно уйти recovery-письмо');
  assert.match(mail._sent[1].subject, /восстановлен/);
  assert.ok(journal._data.some((r) => r[2] === 'pipeline_health_recovered'));
});

test('checkPipelineHealth_: не чаще раза в час (throttle) — повторный вызов в течение часа не делает fetch', () => {
  const { ctx, urlFetch, ss } = newHarness({ responses: [{ code: 200, body: okHealthBody() }] });
  const config = buildConfig();
  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T10:00:00Z'));
  assert.equal(urlFetch._calls.length, 1);

  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T10:30:00Z')); // 30 минут спустя — раньше часа
  assert.equal(urlFetch._calls.length, 1, 'throttle: 30 минут < 1 часа — fetch не должен повториться');

  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T11:01:00Z')); // час и минута спустя
  assert.equal(urlFetch._calls.length, 2, 'через час+ throttle пропускает следующую проверку');
});

// =============================================================================
// C1 — false recovery: fetch-неудача/non-200 НЕ должна тихо снимать активный
// инцидент и слать recovery. Только доверенный здоровый 200 восстанавливает.
// Официальная семантика: UrlFetchApp.fetch с muteHttpExceptions:true не
// бросает на неуспешном коде, а возвращает HTTPResponse — но контракт
// pipeline-health v1 не гарантирует "код без 200 = временный блип": до того,
// как накопилось MAX_CONSECUTIVE_FETCH_FAILURES_ неудач подряд, это
// "неизвестно" (unknown), а не "восстановлено".
// https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app#fetch(String,Object)
// =============================================================================

test('C1: инцидент активен (contract-нарушение), затем ОДИН сетевой сбой -> НЕ recovery, инцидент остаётся активным', () => {
  const { ctx, mail, ss } = newHarness({
    responses: [
      { code: 200, body: okHealthBody({ stuck_leads: 5 }) }, // t0: реальная деградация
      { shouldThrow: 'timeout' } // t1 (час спустя): сетевой блип, НЕ здоровый ответ
    ]
  });
  const config = buildConfig();
  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T10:00:00Z'));
  assert.equal(mail._sent.length, 1, 'реальная деградация алертит немедленно');

  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T11:00:00Z'));
  assert.equal(mail._sent.length, 1, 'один сетевой сбой НЕ должен слать recovery-письмо во время активного инцидента');
  assert.ok(!mail._sent.some((m) => /восстановлен/.test(m.subject)), 'recovery-письма быть не должно');
});

test('C1: инцидент активен, ДВА сетевых сбоя подряд (недоступность подтверждена) -> тоже НЕ recovery (просто остаётся degraded)', () => {
  const { ctx, mail, ss } = newHarness({
    responses: [
      { code: 200, body: okHealthBody({ stuck_leads: 5 }) },
      { shouldThrow: 'timeout' },
      { shouldThrow: 'timeout' }
    ]
  });
  const config = buildConfig();
  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T10:00:00Z'));
  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T11:00:00Z'));
  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T12:00:00Z'));
  assert.ok(!mail._sent.some((m) => /восстановлен/.test(m.subject)), 'недоступность — не признак восстановления, recovery не должно уйти');
});

test('C1: инцидент активен, сетевой сбой, ЗАТЕМ настоящий здоровый 200 -> ТЕПЕРЬ recovery уходит', () => {
  const recoveredBody = okHealthBody({
    backup: { last_ok_at: '2026-09-23T11:45:00Z', last_run_at: '2026-09-23T11:45:00Z', integrity_ok: true },
    sweep: { last_ok_at: '2026-09-23T11:58:00Z', last_run_at: '2026-09-23T11:58:00Z' }
  });
  const { ctx, mail, ss } = newHarness({
    responses: [
      { code: 200, body: okHealthBody({ stuck_leads: 5 }) },
      { shouldThrow: 'timeout' },
      { code: 200, body: recoveredBody }
    ]
  });
  const config = buildConfig();
  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T10:00:00Z'));
  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T11:00:00Z'));
  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T12:00:00Z'));
  assert.equal(mail._sent.length, 2, 'после доверенного здорового 200 recovery должно уйти');
  assert.match(mail._sent[1].subject, /восстановлен/);
});

// =============================================================================
// C2 — lost alert: если MailApp упал на первой попытке алерта, инцидент не
// должен "молча считаться заалерченным" — каждый часовой тик обязан
// повторять попытку, пока письмо реально не уйдёт.
// =============================================================================

test('C2: алерт не доставлен (MailApp упал) -> следующий часовой тик ПОВТОРЯЕТ попытку и письмо доходит', () => {
  const props = makeFakePropertiesService({});
  const mail = makeFakeMailApp({ shouldThrow: 'quota exceeded' });
  const urlFetch = makeFakeUrlFetchApp({ responses: [{ code: 200, body: okHealthBody({ stuck_leads: 2 }) }] });
  const ctx = loadGasContext(undefined, {
    PropertiesService: props, MailApp: mail, UrlFetchApp: urlFetch,
    Session: makeFakeSession('alex@adfix.co.il'), SpreadsheetApp: makeFakeSpreadsheetApp({})
  });
  const journal = makeFakeSheet('Журнал');
  const ss = makeFakeSpreadsheet({ 'Журнал': journal });
  const config = buildConfig();

  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T10:00:00Z'));
  assert.equal(mail._sent.length, 0, 'MailApp упал — письмо не доставлено');

  // "Чиним" MailApp (квота освободилась) и делаем ещё один часовой тик.
  mail.sendEmail = function (msg) { mail._sent.push(msg); };
  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T11:00:00Z'));
  assert.equal(mail._sent.length, 1, 'следующий часовой тик должен ПОВТОРИТЬ недоставленный алерт, а не считать его отправленным');
});

// =============================================================================
// C3 — malformed/mistyped contract fields не должны читаться как здоровые.
// Официально: JSON.parse бросает SyntaxError на невалидном JSON
// (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse#exceptions);
// new Date(x).getTime() для невалидной строки возвращает NaN, а не бросает
// (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date) —
// именно поэтому сравнение "NaN < число" всегда false и старый код читал
// такие поля как "не устарело" (здоровые).
// =============================================================================

test('C3: /health возвращает НЕ-JSON тело (200) -> degraded с "не по контракту", НЕ считается сетевым сбоем (не требует 2 подряд)', () => {
  const { ctx, mail, ss } = newHarness({ responses: [{ code: 200, body: 'not json at all' }] });
  ctx.checkPipelineHealth_(ss, buildConfig(), new Date('2026-09-23T10:00:00Z'));
  assert.equal(mail._sent.length, 1, 'нарушение контракта алертит немедленно, а не ждёт вторую проверку подряд');
  assert.ok(mail._sent[0].body.indexOf('не по контракту') !== -1);
});

test('C3: schema !== 1 -> degraded "не по контракту"', () => {
  const { ctx, mail, ss } = newHarness({ responses: [{ code: 200, body: okHealthBody({ schema: 2 }) }] });
  ctx.checkPipelineHealth_(ss, buildConfig(), new Date('2026-09-23T10:00:00Z'));
  assert.equal(mail._sent.length, 1);
  assert.ok(mail._sent[0].body.indexOf('не по контракту') !== -1);
});

test('C3: backup.last_ok_at — невалидная (не-ISO) строка -> degraded "не по контракту", НЕ читается как здоровая', () => {
  const { ctx, mail, ss } = newHarness({
    responses: [{ code: 200, body: okHealthBody({ backup: { last_ok_at: 'вчера что-то было', last_run_at: '2026-09-23T09:30:00Z', integrity_ok: true } }) }]
  });
  ctx.checkPipelineHealth_(ss, buildConfig(), new Date('2026-09-23T10:00:00Z'));
  assert.equal(mail._sent.length, 1, 'невалидная дата НЕ должна молча читаться как "не устарела" (NaN-сравнение)');
  assert.ok(mail._sent[0].body.indexOf('не по контракту') !== -1);
});

test('C3: stuck_leads — не целое число (строка) -> degraded "не по контракту", НЕ читается как 0', () => {
  const { ctx, mail, ss } = newHarness({ responses: [{ code: 200, body: okHealthBody({ stuck_leads: 'abc' }) }] });
  ctx.checkPipelineHealth_(ss, buildConfig(), new Date('2026-09-23T10:00:00Z'));
  assert.equal(mail._sent.length, 1, '"abc" > 0 === false в JS — старый код молча читал это как здоровое');
  assert.ok(mail._sent[0].body.indexOf('не по контракту') !== -1);
});

test('C3: albato_configured — строка "false" вместо boolean -> degraded "не по контракту", НЕ читается как true', () => {
  const { ctx, mail, ss } = newHarness({ responses: [{ code: 200, body: okHealthBody({ albato_configured: 'false' }) }] });
  ctx.checkPipelineHealth_(ss, buildConfig(), new Date('2026-09-23T10:00:00Z'));
  assert.equal(mail._sent.length, 1, '"false" (строка) !== false — старый код молча читал это как настроенный albato');
  assert.ok(mail._sent[0].body.indexOf('не по контракту') !== -1);
});

// =============================================================================
// C4 — пустой system_alert_recipients не должен означать "никто никогда не
// узнает": фолбэк на существующий в кодовой базе паттерн self-identity —
// Session.getEffectiveUser().getEmail() (тот же приём, что Sheets.gs использует
// для "владельца скрипта" — https://developers.google.com/apps-script/reference/base/session#getEffectiveUser()).
// =============================================================================

test('C4: system_alert_recipients пуст -> алерт уходит на Session.getEffectiveUser().getEmail() (self-alert fallback)', () => {
  const { ctx, mail, ss } = newHarness({ responses: [{ code: 200, body: okHealthBody({ stuck_leads: 1 }) }] });
  ctx.checkPipelineHealth_(ss, buildConfig({ systemAlertRecipients: [] }), new Date('2026-09-23T10:00:00Z'));
  assert.equal(mail._sent.length, 1, 'пустой список получателей не должен означать "письмо в никуда"');
  assert.equal(mail._sent[0].to, 'alex@adfix.co.il', 'fallback — эффективный пользователь скрипта (makeFakeSession)');
});

// =============================================================================
// C5 — набор причин деградации меняется В ХОДЕ одного и того же инцидента ->
// ОДНО письмо-обновление, не письмо на каждый час.
// =============================================================================

test('C5: набор причин деградации меняется в ходе инцидента -> ОДНО письмо-обновление (не по одному на час)', () => {
  // ВАЖНО (тот же приём, что и в тесте recovery выше): backup/sweep timestamps
  // должны быть СВЕЖИМИ ОТНОСИТЕЛЬНО момента каждой проверки — иначе sweep
  // сам "устареет" к следующему часу и добавит РЕАЛЬНУЮ новую причину
  // (sweep_stale), а тест должен изолированно проверять именно "причина
  // осталась той же" / "причина изменилась", без постороннего шума от времени.
  function freshBody(now, overrides) {
    return okHealthBody(Object.assign({
      backup: { last_ok_at: new Date(now.getTime() - 5 * 60000).toISOString(), last_run_at: new Date(now.getTime() - 5 * 60000).toISOString(), integrity_ok: true },
      sweep: { last_ok_at: new Date(now.getTime() - 2 * 60000).toISOString(), last_run_at: new Date(now.getTime() - 2 * 60000).toISOString() }
    }, overrides || {}));
  }
  const t0 = new Date('2026-09-23T10:00:00Z');
  const t1 = new Date('2026-09-23T11:00:00Z');
  const t2 = new Date('2026-09-23T12:00:00Z');
  const t3 = new Date('2026-09-23T13:00:00Z');
  const { ctx, mail, ss } = newHarness({
    responses: [
      { code: 200, body: freshBody(t0, { stuck_leads: 3 }) }, // t0: причина A
      { code: 200, body: freshBody(t1, { stuck_leads: 3 }) }, // t1: та же причина A — НЕ должно слать повторно
      { code: 200, body: freshBody(t2, { stuck_leads: 3, albato_configured: false }) }, // t2: причина изменилась (добавилась B)
      { code: 200, body: freshBody(t3, { stuck_leads: 3, albato_configured: false }) } // t3: тот же набор (A+B) — НЕ должно слать снова
    ]
  });
  const config = buildConfig();
  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T10:00:00Z'));
  assert.equal(mail._sent.length, 1, 't0: первый алерт инцидента');
  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T11:00:00Z'));
  assert.equal(mail._sent.length, 1, 't1: причина не изменилась — повторно слать не нужно');
  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T12:00:00Z'));
  assert.equal(mail._sent.length, 2, 't2: причина изменилась — ОДНО письмо-обновление');
  ctx.checkPipelineHealth_(ss, config, new Date('2026-09-23T13:00:00Z'));
  assert.equal(mail._sent.length, 2, 't3: набор причин снова тот же (A+B) — повторно слать не нужно');
});

test('checkPipelineHealth_: исключение внутри проверки не ломает tick() — остальные шаги выполняются', () => {
  const props = makeFakePropertiesService({});
  const mail = makeFakeMailApp();
  const lock = { getScriptLock: function () { return { tryLock: function () { return true; }, releaseLock: function () {} }; } };
  const spreadsheetApp = makeFakeSpreadsheetApp({});
  // checkPipelineHealth_ САМ ловит ошибки fetch/JSON.parse (это ожидаемая,
  // штатная деградация — не exception path). Чтобы проверить именно
  // "исключение вне предусмотренной обработки", ломаем то, что читается ДО
  // входа в try/catch (throttle-проверку через Script Properties) — это
  // симулирует ЛЮБУЮ непредвиденную ошибку внутри шага, не только сетевую.
  var scriptProps = props.getScriptProperties();
  var originalGetProperty = scriptProps.getProperty;
  scriptProps.getProperty = function (k) {
    if (k === 'pipelineHealthLastCheckAt') throw new Error('boom outside try');
    return originalGetProperty(k);
  };
  const okUrlFetch = makeFakeUrlFetchApp({ responses: [{ code: 200, body: okHealthBody() }] });
  const ctx = loadGasContext(undefined, {
    SpreadsheetApp: spreadsheetApp, PropertiesService: props, MailApp: mail, LockService: lock,
    Session: makeFakeSession('alex@adfix.co.il'), UrlFetchApp: okUrlFetch
  });

  const reqHeaders = Array.from(ctx.REQUESTS_HEADERS_);
  const svcHeaders = Array.from(ctx.SERVICE_SHEET_HEADERS_);
  const requests = makeFakeSheet('Заявки', { data: [reqHeaders] });
  const service = makeFakeSheet('Служебное', { data: [svcHeaders] });
  const intake = makeFakeSheet('Входящие', { data: [Array.from(ctx.INTAKE_HEADERS_)] });
  const journal = makeFakeSheet('Журнал');
  const settings = makeFakeSheet('Настройки', {
    data: ctx.buildDefaultSettingsRows_({ business_days: '0,1,2,3,4,5,6', digest_time: '00:00', pipeline_health_url: HEALTH_URL })
  });
  const ss = makeFakeSpreadsheet({ 'Заявки': requests, 'Служебное': service, 'Входящие': intake, 'Журнал': journal, 'Настройки': settings });
  spreadsheetApp.openById = function () { return ss; };

  // Не должно бросить наружу — весь смысл теста.
  ctx.tick();

  assert.ok(journal._data.some((r) => r[2] === 'tick_step_error' && String(r[3]).indexOf('pipeline_health') !== -1 || String(r[7] || '').indexOf('pipeline_health') !== -1),
    'ошибка шага pipeline_health должна журналироваться, как любой другой упавший шаг tick()');
  // heartbeat всё равно обновился — tick() дошёл до конца, несмотря на упавший шаг.
  assert.ok(props._store.heartbeatAt, 'heartbeat должен обновиться — остальной tick() не должен быть сорван');
});

// Сверка живой аналитики lp.gambarian.com против tracking/tracking-map.json и
// tracking/gtm-baseline.json. Независимые проверки, каждая может запускаться отдельно:
//
//   node scripts/verify-tracking-map.mjs                          # (a) только код
//   node scripts/verify-tracking-map.mjs --gtm <file.json>        # (a) + (b)
//   node scripts/verify-tracking-map.mjs --gtm <file.json> --live # (a) + (b) + (c)
//   node scripts/verify-tracking-map.mjs --skip-site --gtm <f>    # только (b)
//   node scripts/verify-tracking-map.mjs --gtm <f> --gtm-version-only  # быстрый (b0)
//   node scripts/verify-tracking-map.mjs --self-test              # регрессия diff-движка (b), без сети/файлов
//
// (a) код: `node scripts/verify-tracking.mjs` (полный сценарий — каждое взаимодействие
//     карты §3 реально кликается в Playwright) + текстовая сверка словаря событий в
//     verify-tracking.mjs против tracking/tracking-map.json (ловит рассинхрон карты и теста
//     раньше, чем рассинхрон карты и сайта).
// (b) GTM: --gtm принимает СЫРОЙ ответ GTM API v2 (containerVersionId/name/fingerprint +
//     tag[]/trigger[]/variable[]/builtInVariable[]/customTemplate[] — ровно то, что
//     возвращает mcp__gtm-stape__gtm_version {action:"live"} по каждому resourceType, или
//     сама tracking/gtm-baseline.json). Никакой ручной предобработки снимок не требует.
//     Обе стороны (baseline и свежий снимок) нормализуются ОДНОЙ и той же функцией
//     normalizeGtmSnapshot() и сравниваются ПОЛНОСТЬЮ — включая paused, blockingTriggerId,
//     consentSettings, значения GA4-параметров (не только имена) и ключи/значения
//     переменных (имя cookie, ключ DLV, строки lookup-таблицы). Из сравнения исключены
//     только волатильные поля: fingerprint, path, workspaceId, tagManagerUrl,
//     parentFolderId, accountId, containerId. Порядок list-параметров (eventSettingsTable,
//     configSettingsTable, map лукап-таблицы, consentType) сохраняется как в API —
//     не пересортировывается. firingTriggerId/blockingTriggerId — это множества
//     (сравниваются без учёта порядка).
// (b0) --gtm-version-only: быстрая проверка БЕЗ полного tag/trigger/variable diff — только
//     containerVersionId + fingerprint свежего снимка против baseline. FAIL, если контейнер
//     был опубликован заново (новая версия или новый fingerprint той же версии).
// (c) --live: перехват сети на живом lp.gambarian.com — ни один реальный хит в
//     GA4/Ads/Clarity не отправляется (все *collect*/pagead/ccm/measurement/clarity
//     запросы обрываются route.abort()), /api/lead замокан локальным 202. Сверяет, что
//     перехваченные (не отправленные) URL содержат правильный measurementId/label из
//     tracking-map.json.
// --self-test: прогоняет diff-движок (b) на baseline + 7 встроенных мутациях (см.
//     SELF_TEST_MUTATIONS) полностью в памяти, без сети и без временных файлов. Каждая
//     мутация обязана дать FAIL с непустым diff; немутированный клон baseline обязан
//     дать PASS. Это регрессионный тест самого верификатора, а не тест GTM-контейнера.
//
// Exit code 0 только когда все запрошенные проверки прошли; 1 — есть расхождение;
// 2 — проверка не может быть выполнена (нет сервера/файла/браузера) — это НЕ трактуется
// как PASS (см. поведение "пропуск = не зелёный", coding-guidelines.md). Если хотя бы одна
// проверка FAIL — итоговое сообщение и exit code ВСЕГДА отражают FAIL, даже если другая
// проверка была ПРОПУЩЕНА (SKIP не маскирует FAIL).

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MAP_PATH = path.join(ROOT, "tracking", "tracking-map.json");
const BASELINE_PATH = path.join(ROOT, "tracking", "gtm-baseline.json");
const SITE_CHECK_PATH = path.join(ROOT, "scripts", "verify-tracking.mjs");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function parseArgs(argv) {
  const args = { site: true, gtm: null, live: false, base: null, versionOnly: false, selfTest: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--gtm") args.gtm = argv[(i += 1)];
    else if (argv[i] === "--live") args.live = true;
    else if (argv[i] === "--base") args.base = argv[(i += 1)];
    else if (argv[i] === "--skip-site") args.site = false;
    else if (argv[i] === "--gtm-version-only") args.versionOnly = true;
    else if (argv[i] === "--self-test") args.selfTest = true;
    else if (argv[i] === "--help" || argv[i] === "-h") {
      console.log("Usage: node verify-tracking-map.mjs [--base <url>] [--gtm <file>] [--gtm-version-only] [--live] [--skip-site] [--self-test]");
      process.exit(0);
    } else {
      console.error(`Неизвестный аргумент: ${argv[i]}`);
      process.exit(2);
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// (a) Сайт: код по-прежнему пушит каждое событие карты.
// ---------------------------------------------------------------------------

function checkSite(map, baseUrl) {
  console.log("\n=== (a) Код: dataLayer против tracking-map.json ===");
  if (!fs.existsSync(SITE_CHECK_PATH)) {
    console.error(`  ПРОПУСК: не найден ${path.relative(ROOT, SITE_CHECK_PATH)}`);
    return 2;
  }

  // Текстовая сверка словаря: verify-tracking.mjs держит собственный EVENT_KEYS —
  // расхождение здесь означает «карта и тест разошлись», раньше чем «карта и сайт
  // разошлись». Разбор регэкспом, не импортом — verify-tracking.mjs не экспортирует
  // EVENT_KEYS, а импорт вытянул бы сборку/Playwright только ради константы.
  const testSource = fs.readFileSync(SITE_CHECK_PATH, "utf8");
  const testedEvents = new Set([...testSource.matchAll(/^\s{2}(\w+):\s*\[/gm)].map(m => m[1]));
  const mapEvents = new Set(map.events.map(e => e.event));
  const missingInTest = [...mapEvents].filter(e => !testedEvents.has(e));
  const missingInMap = [...testedEvents].filter(e => !mapEvents.has(e));
  let dictionaryOk = true;
  if (missingInTest.length) {
    dictionaryOk = false;
    console.error(`  ❌ Событ${missingInTest.length === 1 ? "ие" : "ия"} карты нет в EVENT_KEYS теста: ${missingInTest.join(", ")}`);
  }
  if (missingInMap.length) {
    dictionaryOk = false;
    console.error(`  ❌ Событ${missingInMap.length === 1 ? "ие" : "ия"} теста нет в tracking-map.json: ${missingInMap.join(", ")}`);
  }
  if (dictionaryOk) console.log(`  ✅ Словарь событий совпадает (${mapEvents.size} событий) — карта ⇄ verify-tracking.mjs`);

  // Полный прогон: verify-tracking.mjs сам поднимает Chromium и реально кликает по
  // каждому элементу карты §3 на 360/390/1440. Если сервер на baseUrl не отвечает,
  // это ПРОПУСК (exit 2), а не PASS.
  console.log(`  Запуск: node ${path.relative(ROOT, SITE_CHECK_PATH)} ${baseUrl}`);
  const result = spawnSync(process.execPath, [SITE_CHECK_PATH, baseUrl], { cwd: ROOT, encoding: "utf8", timeout: 180_000 });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  process.stdout.write(output.split("\n").map(line => `  ${line}`).join("\n"));
  if (result.error) {
    console.error(`  ❌ ПРОПУСК: не удалось запустить verify-tracking.mjs (${result.error.message}). Сервер на ${baseUrl} поднят?`);
    return 2;
  }
  const passLine = /Tracking: map §3 \/ funnel \/ honeypot \/ PII \/ design_version PASS/.test(output);
  if (result.status !== 0 || !passLine) {
    console.error(`  ❌ FAIL: verify-tracking.mjs завершился с кодом ${result.status}`);
    return 1;
  }
  console.log("  ✅ verify-tracking.mjs: PASS на всех вьюпортах — каждое взаимодействие карты §3 даёт своё событие");
  return dictionaryOk ? 0 : 1;
}

// ---------------------------------------------------------------------------
// (b) GTM: нормализация СЫРОГО снимка (GTM API v2 shape) + полный diff против
//     tracking/gtm-baseline.json.
// ---------------------------------------------------------------------------

// Волатильные поля GTM API: меняются при каждом чтении/операции, но не отражают
// функциональную конфигурацию контейнера. Снимаются на любом уровне вложенности.
const DROP_KEYS = new Set(["fingerprint", "path", "workspaceId", "tagManagerUrl", "parentFolderId", "accountId", "containerId"]);

// Множества id триггеров: OR (firingTriggerId) / AND-блокировка (blockingTriggerId) —
// порядок элементов не несёт смысла, сравниваются как множества.
const TRIGGER_ID_SET_KEYS = new Set(["firingTriggerId", "blockingTriggerId", "disablingTriggerId", "enablingTriggerId", "customEvaluationTriggerId"]);

// Массивы условий триггера: порядок ANDed-условий не меняет семантику, но не
// пересортировываем — сравниваем как дано (список условий короткий, стабильный).
const CONDITION_ARRAY_KEYS = new Set(["customEventFilter", "filter", "autoEventFilter"]);

// Разворачивает узел параметра GTM ({type:"template"/"boolean"/"integer",value} |
// {type:"list", list:[...]} | {type:"map", map:[{key,...}]}) в обычное JS-значение.
// Списки (type:"list") НЕ пересортировываются — порядок строк таблицы (eventSettingsTable,
// configSettingsTable, лукап-таблица) сохраняется ровно как вернул API.
function paramLeafValue(entry) {
  if (entry.type === "list") return (entry.list || []).map(paramLeafValue);
  if (entry.type === "map") {
    const obj = {};
    for (const e of entry.map || []) obj[e.key] = paramLeafValue(e);
    return obj;
  }
  return entry.value;
}

// tag.parameter / trigger.parameter / variable.parameter -> {key: value, ...}. Каждый
// элемент верхнего уровня имеет уникальный key (это карта настроек тега/переменной,
// а не упорядоченный список), поэтому объект, а не массив — но значения ВНУТРИ (списки,
// вложенные map) сохраняют порядок через paramLeafValue.
function parametersToObject(parameterArray) {
  const obj = {};
  for (const p of parameterArray || []) obj[p.key] = paramLeafValue(p);
  return obj;
}

function normalizeCondition(cond) {
  return { type: cond.type, parameter: parametersToObject(cond.parameter) };
}

// Consent Settings тега в формате API: {consentStatus, consentType:{type:"list",list:[...]}}
// (bullet 1 задачи: "consentSettings в API-формате игнорировался"). consentType — тоже
// list-параметр, порядок сохраняется, не пересортировывается.
function normalizeConsentSettings(cs) {
  if (!cs) return undefined;
  const out = { consentStatus: cs.consentStatus };
  if (cs.consentType) out.consentType = paramLeafValue(cs.consentType);
  return out;
}

// Общий глубокий клон+сортировка ключей объекта (для детерминированного JSON.stringify),
// БЕЗ пересортировки массивов — используется для «прочих» полей ресурса (notes,
// tagFiringOption, priority, scheduleStartMs/EndMs, setupTag/teardownTag,
// monitoringMetadata, поля триггеров вроде selector/interval и т.п.), которых мы не
// обрабатываем спецкейсом ниже, но которые всё равно обязаны попасть в сравнение —
// задача явно требует сравнивать ПОЛНЫЕ нормализованные объекты, а не выборочные поля.
function genericDeep(value) {
  if (Array.isArray(value)) return value.map(genericDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      if (DROP_KEYS.has(key)) continue;
      out[key] = genericDeep(value[key]);
    }
    return out;
  }
  return value;
}

// Нормализует один ресурс GTM (tag | trigger | variable | customTemplate) в сравнимую
// форму. Проходит по ВСЕМ полям сырого объекта (не по allowlist) — так любое новое поле,
// которое GTM когда-нибудь добавит, автоматически попадёт в сравнение вместо того, чтобы
// молча стать новым слепым пятном.
function normalizeEntity(raw, idKey) {
  const out = { id: String(raw[idKey] ?? raw.id) };
  for (const key of Object.keys(raw).sort()) {
    if (key === idKey || key === "id") continue;
    if (DROP_KEYS.has(key)) continue;
    if (key === "parameter") {
      out.params = parametersToObject(raw.parameter);
      continue;
    }
    if (CONDITION_ARRAY_KEYS.has(key)) {
      out[key] = raw[key].map(normalizeCondition);
      continue;
    }
    if (TRIGGER_ID_SET_KEYS.has(key)) {
      out[key] = [...raw[key]].map(String).sort();
      continue;
    }
    if (key === "consentSettings") {
      const cs = normalizeConsentSettings(raw[key]);
      if (cs) out[key] = cs;
      continue;
    }
    if (key === "paused") {
      out.paused = !!raw[key];
      continue;
    }
    out[key] = genericDeep(raw[key]);
  }
  if (out.paused === undefined) out.paused = false; // явный дефолт: paused отсутствует === paused:false
  return out;
}

function normalizeGtmSnapshot(raw) {
  const tags = (raw.tag || []).map(t => normalizeEntity(t, "tagId")).sort((a, b) => Number(a.id) - Number(b.id));
  const triggers = (raw.trigger || []).map(t => normalizeEntity(t, "triggerId")).sort((a, b) => Number(a.id) - Number(b.id));
  const variables = (raw.variable || []).map(v => normalizeEntity(v, "variableId")).sort((a, b) => Number(a.id) - Number(b.id));
  const builtInVariables = (raw.builtInVariable || [])
    .map(v => ({ id: v.type, name: v.name }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const customTemplates = (raw.customTemplate || []).map(t => normalizeEntity(t, "templateId")).sort((a, b) => Number(a.id) - Number(b.id));
  return { tags, triggers, variables, builtInVariables, customTemplates };
}

// Достаёт метаданные версии контейнера, допуская и "плоскую" форму настоящего GTM API
// (containerVersionId/name/fingerprint на верхнем уровне ответа), и обёртку MCP-инструмента
// gtm_version (те же поля внутри raw.version) — какой бы источник ни дал файл, доп.
// предобработка не нужна.
function extractVersionInfo(raw) {
  return {
    containerVersionId: raw.containerVersionId ?? raw.version?.containerVersionId,
    name: raw.name ?? raw.version?.name,
    fingerprint: raw.fingerprint ?? raw.version?.fingerprint,
  };
}

function diffArraysByKey(baseline, fresh, label) {
  const lines = [];
  const baseIds = new Map(baseline.map(item => [item.id, item]));
  const freshIds = new Map(fresh.map(item => [item.id, item]));
  for (const id of freshIds.keys()) {
    if (!baseIds.has(id)) lines.push(`  + ${label} ${id} добавлен (${freshIds.get(id).name}): ${JSON.stringify(freshIds.get(id))}`);
  }
  for (const id of baseIds.keys()) {
    if (!freshIds.has(id)) lines.push(`  - ${label} ${id} пропал (был: ${baseIds.get(id).name}): ${JSON.stringify(baseIds.get(id))}`);
  }
  for (const id of baseIds.keys()) {
    if (!freshIds.has(id)) continue;
    const before = JSON.stringify(baseIds.get(id));
    const after = JSON.stringify(freshIds.get(id));
    if (before !== after) lines.push(`  ~ ${label} ${id} изменён:\n      было:  ${before}\n      стало: ${after}`);
  }
  return lines;
}

// Считает diff между двумя СЫРЫМИ снимками (baseline и fresh), не трогая диск и не
// печатая ничего — переиспользуется и checkGtm() (файлы), и --self-test (в памяти).
function diffGtmSnapshots(baselineRaw, freshRaw) {
  const baseline = normalizeGtmSnapshot(baselineRaw);
  const fresh = normalizeGtmSnapshot(freshRaw);
  return [
    ...diffArraysByKey(baseline.tags, fresh.tags, "Тег"),
    ...diffArraysByKey(baseline.triggers, fresh.triggers, "Триггер"),
    ...diffArraysByKey(baseline.variables, fresh.variables, "Переменная"),
    ...diffArraysByKey(baseline.builtInVariables, fresh.builtInVariables, "Built-in переменная"),
    ...diffArraysByKey(baseline.customTemplates, fresh.customTemplates, "Кастомный шаблон"),
  ];
}

function checkGtm(gtmFile) {
  console.log("\n=== (b) GTM: свежий снимок против tracking/gtm-baseline.json (полное сравнение) ===");
  if (!fs.existsSync(gtmFile)) {
    console.error(`  ❌ ПРОПУСК: файл не найден: ${gtmFile}`);
    return 2;
  }
  const baselineRaw = readJson(BASELINE_PATH);
  const freshRaw = readJson(gtmFile);
  const lines = diffGtmSnapshots(baselineRaw, freshRaw);

  if (lines.length === 0) {
    const b = normalizeGtmSnapshot(baselineRaw);
    console.log(`  ✅ Совпадает с baseline: ${b.tags.length} тегов, ${b.triggers.length} триггеров, ${b.variables.length} переменных, ${b.builtInVariables.length} built-in переменных, ${b.customTemplates.length} шаблон(ов).`);
    return 0;
  }
  console.error(`  ❌ Расхождение с tracking/gtm-baseline.json (${lines.length} пункт(ов)):`);
  console.error(lines.join("\n"));
  return 1;
}

// ---------------------------------------------------------------------------
// (b0) --gtm-version-only: быстрый чек публикации без полного diff.
// ---------------------------------------------------------------------------

function checkGtmVersionOnly(gtmFile) {
  console.log("\n=== (b0) GTM: --gtm-version-only (быстрый чек публикации) ===");
  if (!fs.existsSync(gtmFile)) {
    console.error(`  ❌ ПРОПУСК: файл не найден: ${gtmFile}`);
    return 2;
  }
  const baseline = extractVersionInfo(readJson(BASELINE_PATH));
  const fresh = extractVersionInfo(readJson(gtmFile));
  if (baseline.containerVersionId === fresh.containerVersionId && baseline.fingerprint === fresh.fingerprint) {
    console.log(`  ✅ Версия не менялась: v${baseline.containerVersionId} (${baseline.name}), fingerprint ${baseline.fingerprint}.`);
    return 0;
  }
  console.error(
    `  ❌ FAIL: GTM опубликован заново: было v${baseline.containerVersionId}/${baseline.fingerprint}, стало v${fresh.containerVersionId}/${fresh.fingerprint}`
  );
  console.error("  Полный tag/trigger/variable diff не выполнялся — запусти без --gtm-version-only.");
  return 1;
}

// ---------------------------------------------------------------------------
// --self-test: 7 встроенных мутаций baseline + один немутированный клон — доказывают,
// что diff-движок (b) реально ловит расхождения, а не просто возвращает 0.
// ---------------------------------------------------------------------------

function findTag(raw, id) {
  return raw.tag.find(t => String(t.tagId) === id);
}
function findTrigger(raw, id) {
  return raw.trigger.find(t => String(t.triggerId) === id);
}
function findVariable(raw, name) {
  return raw.variable.find(v => v.name === name);
}
function cloneRaw(raw) {
  return JSON.parse(JSON.stringify(raw));
}

const SELF_TEST_MUTATIONS = [
  {
    // Ранее найдено верификатором-Opus: условие триггера 52 "whatsapp" -> "phone"
    // (конверсия WhatsApp начала бы срабатывать на клик по телефону).
    name: "m1-trigger52-condition-whatsapp-to-phone",
    apply: raw => {
      findTrigger(raw, "52").filter[0].parameter[1].value = "phone";
    },
  },
  {
    // Ранее найдено верификатором-Opus: тег конверсии "Заявка" перевешен на триггер
    // contact_click вместо generate_lead.
    name: "m2-ads53-wrong-trigger",
    apply: raw => {
      findTag(raw, "53").firingTriggerId = ["30"];
    },
  },
  {
    // Слепое пятно #1: paused игнорировался.
    name: "b1-ads53-paused",
    apply: raw => {
      findTag(raw, "53").paused = true;
    },
  },
  {
    // Слепое пятно #1: blockingTriggerId игнорировался.
    name: "b2-ga38-blocking-trigger-added",
    apply: raw => {
      findTag(raw, "38").blockingTriggerId = ["30"];
    },
  },
  {
    // Слепое пятно #1: consentSettings (формат API) игнорировался.
    name: "b3-ads53-consent-settings-changed",
    apply: raw => {
      findTag(raw, "53").consentSettings = {
        consentStatus: "needed",
        consentType: { type: "list", list: [{ type: "template", value: "ad_storage" }] },
      };
    },
  },
  {
    // Слепое пятно #1: значения GA4-параметров не сравнивались (только имена) —
    // параметр "method" тега 44 переставлен на другую переменную.
    name: "m3-ga44-method-param-remapped",
    apply: raw => {
      const table = findTag(raw, "44").parameter.find(p => p.key === "eventSettingsTable").list;
      const row = table.find(m => m.map.some(e => e.key === "parameter" && e.value === "method"));
      row.map.find(e => e.key === "parameterValue").value = "{{DLV - placement}}";
    },
  },
  {
    // Слепое пятно #1: ключи/значения переменных (лукап-таблица) не сравнивались —
    // строка "1" -> "internal" в LT - traffic_type меняет значение на "external".
    name: "m4-lookup-table-traffic-type-value",
    apply: raw => {
      const mapParam = findVariable(raw, "LT - traffic_type").parameter.find(p => p.key === "map");
      mapParam.list[0].map.find(e => e.key === "value").value = "external";
    },
  },
];

function runSelfTest() {
  console.log("\n=== --self-test: регрессия diff-движка (b) на 7 встроенных мутациях ===");
  const baseline = readJson(BASELINE_PATH);
  let allOk = true;

  {
    const lines = diffGtmSnapshots(baseline, cloneRaw(baseline));
    const ok = lines.length === 0;
    console.log(`  ${ok ? "✅" : "❌"} unmutated-baseline-clone → ${ok ? "PASS (0 diff)" : `FAIL (${lines.length} diff), ожидался PASS`}`);
    if (!ok) allOk = false;
  }

  for (const { name, apply } of SELF_TEST_MUTATIONS) {
    const mutated = cloneRaw(baseline);
    apply(mutated);
    const lines = diffGtmSnapshots(baseline, mutated);
    const ok = lines.length > 0;
    console.log(`  ${ok ? "✅" : "❌"} ${name} → ${ok ? `FAIL (${lines.length} diff), как и ожидалось` : "PASS — ОШИБКА: мутация должна была дать diff"}`);
    if (lines.length) console.log(lines[0].split("\n").map(l => `      ${l}`).join("\n"));
    if (!ok) allOk = false;
  }

  console.log(allOk ? "\n✅ --self-test: все 8 случаев (1 baseline + 7 мутаций) ведут себя как ожидалось." : "\n❌ --self-test: ЕСТЬ РАСХОЖДЕНИЕ С ОЖИДАНИЕМ — diff-движок сломан.");
  return allOk ? 0 : 1;
}

// ---------------------------------------------------------------------------
// (c) --live: перехваченный прогон на живом сайте (сеть — только на чтение, ни один
//     реальный хит аналитики/рекламы не уходит).
// ---------------------------------------------------------------------------

const BLOCK_PATTERNS = [
  /google-analytics\.com\/.*collect/i,
  /googletagmanager\.com\/.*collect/i,
  /googleadservices\.com/i,
  /doubleclick\.net/i,
  /google\.com\/ccm/i,
  /google\.com\/pagead/i,
  /google\.com\/measurement/i,
  /clarity\.ms\/collect/i,
  /[ac]\.clarity\.ms\/c(ollect)?/i,
  /clarity\.ms\/c\.gif/i,
];

function classifyHit(url, map) {
  if (/\/pagead\/conversion\//i.test(url) || /\/pagead\/1p-conversion\//i.test(url)) {
    const label = Object.entries(map.meta.googleAds.labels).find(([, v]) => url.includes(v));
    return { platform: "GoogleAds", detail: label ? `label=${label[1]} (${label[0]})` : "label не найден в URL" };
  }
  if (/google\.com\/measurement\/conversion/i.test(url) || /stats\.g\.doubleclick\.net\/g\/collect/i.test(url) || /google-analytics\.com/i.test(url) || /googletagmanager\.com\/a\?/i.test(url)) {
    const hasMid = url.includes(map.meta.ga4.measurementId);
    return { platform: "GA4", detail: hasMid ? `tid=${map.meta.ga4.measurementId} ✅` : "measurementId не найден в URL ⚠️" };
  }
  if (/clarity/i.test(url)) return { platform: "Clarity", detail: "project ym9xekxg89 (не проверяется здесь)" };
  return { platform: "other", detail: "" };
}

async function checkLive(map) {
  console.log("\n=== (c) --live: перехваченный прогон на lp.gambarian.com ===");
  let chromium;
  try {
    ({ chromium } = await import("@playwright/test"));
  } catch (error) {
    try {
      const { createRequire } = await import("node:module");
      const require = createRequire(pathToFileURL(path.join("I:/GIT/gamb-release", "package.json")).href);
      ({ chromium } = require("@playwright/test"));
    } catch (fallbackError) {
      console.error(`  ❌ ПРОПУСК: @playwright/test недоступен (${error.message}; fallback: ${fallbackError.message})`);
      return 2;
    }
  }

  const siteUrl = map.meta.site;
  const intercepted = [];
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 900 },
    });
    await context.addCookies([{ name: "adfix_internal", value: "1", url: siteUrl }]);
    await context.route("**/*", async route => {
      const url = route.request().url();
      if (BLOCK_PATTERNS.some(re => re.test(url))) {
        intercepted.push(url);
        return route.abort("blockedbyclient");
      }
      return route.continue();
    });
    await context.route("**/api/lead", route => route.fulfill({ status: 202, json: { ok: true, status: "accepted", submission_id: "live-check-mocked" } }));

    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", e => pageErrors.push(e.message));
    await page.goto(siteUrl, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(1500); // дать успеть уйти (и быть перехваченными) первичным пингам

    console.log(`  Перехвачено и оборвано запросов: ${intercepted.length} (реальных хитов в GA4/Ads/Clarity не отправлено)`);
    const byPlatform = { GA4: [], GoogleAds: [], Clarity: [], other: [] };
    for (const url of intercepted) {
      const { platform, detail } = classifyHit(url, map);
      (byPlatform[platform] ||= []).push(detail || url);
    }
    for (const [platform, hits] of Object.entries(byPlatform)) {
      if (hits.length) console.log(`    ${platform}: ${hits.length} — ${[...new Set(hits)].slice(0, 5).join(" | ")}`);
    }

    const ga4Hit = byPlatform.GA4.some(d => d.includes("✅"));
    let ok = true;
    if (!ga4Hit) {
      console.error("  ❌ Ни один перехваченный запрос не содержит measurementId страницы — проверь, что снимок вообще грузит GTM/GA4.");
      ok = false;
    } else {
      console.log(`  ✅ measurementId ${map.meta.ga4.measurementId} присутствует в перехваченных GA4-запросах.`);
    }
    if (pageErrors.length) {
      console.error(`  ❌ pageerror на странице: ${pageErrors.join(" | ")}`);
      ok = false;
    } else {
      console.log("  ✅ Ошибок на странице (pageerror) нет.");
    }
    console.log("  Примечание: этот прогон нагружает только загрузку страницы (page_view/consent/base-теги). Полная проводка клика по каждому взаимодействию карты уже проверена (a) локально на билде — здесь цель дешёвая, безопасная проверка «прод грузит тот же GTM/GA4 без реальной отправки данных», а не повтор всего §3.");
    return ok ? 0 : 1;
  } catch (error) {
    console.error(`  ❌ ПРОПУСК/ошибка live-прогона: ${error.message}`);
    return 2;
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.selfTest) {
    process.exit(runSelfTest());
  }

  if (args.versionOnly) {
    if (!args.gtm) {
      console.error("--gtm-version-only требует --gtm <file>");
      process.exit(2);
    }
    process.exit(checkGtmVersionOnly(args.gtm));
  }

  const map = readJson(MAP_PATH);
  const baseUrl = args.base || process.env.TRACKING_MAP_BASE_URL || "http://127.0.0.1:8098/build/variants/final-dev5/";

  const results = [];
  if (args.site) results.push(["(a) site", checkSite(map, baseUrl)]);
  if (args.gtm) results.push(["(b) gtm", checkGtm(args.gtm)]);
  else console.log("\n=== (b) GTM: пропущено (нет --gtm <file>) ===");
  if (args.live) results.push(["(c) live", await checkLive(map)]);

  console.log("\n=== Итог ===");
  for (const [name, code] of results) {
    console.log(`  ${code === 0 ? "✅ PASS" : code === 1 ? "❌ FAIL" : "⏸ ПРОПУСК"} — ${name}`);
  }
  // FAIL обязан отражаться в итоговом сообщении и exit code, даже если другая проверка
  // была ПРОПУЩЕНА (числовой max(1,2)=2 маскировал бы FAIL под "есть пропуски" — раньше
  // это был отдельный найденный баг).
  const hasFail = results.some(([, code]) => code === 1);
  const hasSkip = results.some(([, code]) => code === 2);
  const exitCode = hasFail ? 1 : hasSkip ? 2 : 0;
  if (exitCode === 0 && results.length > 0) console.log("\nВСЁ СОВПАДАЕТ.");
  else if (hasFail) console.log("\nЕСТЬ РАСХОЖДЕНИЯ — см. вывод выше.");
  else console.log("\nЕсть непройденные (ПРОПУСК) проверки — это НЕ 'всё совпадает'.");
  process.exit(exitCode);
}

main();

# Lead pipeline — "никогда не терять лид"

**Статус:** код и тесты готовы; **инфраструктура НЕ активирована** — ни один
Cloudflare-ресурс (KV/D1/R2/Worker) не создан и не привязан. До активации
`functions/api/lead.js` работает **байт-в-байт как раньше** (см. §1 ниже).

**Источник:** порт проверенной ADFIX-схемы «never lose a lead» из
`clients/luxemed/New Lending/` (репозиторий `digitalhook-os-`, ветка
`feature/luxemed-new-lending`, коммит `613cdd3032b5c94300297a5da3afd563e0552b5`).
Контракт: `knowledge/web-dev/ADFIX-SITE-SYSTEM-PLAYBOOK.md` §1.6–1.8.
Разбор по файлам — секция «Откуда что взято» ниже.

## 1. Что есть сейчас

| Слой | Файл | Состояние без биндингов | Состояние с биндингами |
|---|---|---|---|
| Приём заявки | `functions/api/lead.js` | Прямой форвард в Albato (как до этого изменения) — `hasDurableStorage(env)` возвращает `false` | KV(pending) → R2 → D1 insert-if-missing → lease → Albato → markDelivered |
| Dead-letter маяк | `functions/api/lead-dead-letter.js` | Отвечает `200`, ничего не пишет (нет `LEADS_KV`) | Агрегатный счётчик `dead:<день>:<причина>:<form_id>`, без PII |
| Админка | `functions/api/admin.js` на `/api/admin` | «Не настроено» (нет `LEADS_DB`) | Таблица лидов, поиск, CSV/MD, удаление |
| Крон-воркер | `cron-worker/` (`gambarian-lead-cron`) | Не задеплоен — этот PR его не разворачивает | `sweepPending` (5 мин), `reconcile` (18:00 UTC), `backupRun` (02:30 UTC) |
| Клиентский outbox | `site/app.js` | Активен всегда — независим от серверных биндингов | То же; сервер дедуплицирует ретраи по `submission_id`, когда `LEADS_KV` привязан |

### Почему без биндингов ничего не может стать хуже

`hasDurableStorage(env)` в `functions/api/lead.js` проверяет только
`env.LEADS_KV`. Если его нет, функция выполняет **тот же код**, что был в
репозитории до этого изменения (валидация → сборка `payload` → прямой
`fetch` на `ALBATO_WEBHOOK_URL` с текущим таймаутом → `202/502/503/504`).
Это проверено побайтово: `node scripts/verify-lead-hook.mjs` — существующий
тест, который никогда не передаёт `LEADS_KV`/`LEADS_DB`/`LEADS_ARCHIVE` —
проходит без единого изменения ассертов.

### Почему `/api/admin`, а не `/admin`

`site/_routes.json` ограничивает Pages Functions маршрутом `/api/*`
(проверяется тем же `verify-lead-hook.mjs`). Эталонная админка Assuta висит
на `/admin` — здесь она на `/api/admin`, чтобы не трогать `_routes.json`
(и, соответственно, не трогать существующий тест, который сверяет его
содержимое побайтово). Если владелец хочет `/admin` — добавить его в
`include` в `_routes.json` и обновить assert в `verify-lead-hook.mjs`
(это уже требует отдельного решения владельца, не входит в это изменение).

## 2. Клиентский outbox (`site/app.js`)

Write-ahead в `localStorage`:

- `gambarian_lead_outbox_v1` — записи `{submission_id, data, created_at, attempts}`, пишутся **до** `fetch`.
- `gambarian_lead_sent_v1` — до 200 последних `submission_id`, для которых уже отправлен `generate_lead` (защита от повторной отправки при ретрае).
- Ретраи: через 1.5 с после загрузки страницы, на событие `online`, каждые 60 с, и на `pagehide` через `navigator.sendBeacon` (best-effort, без подтверждения — следующий цикл проверит результат).
- Запись убирается из outbox по `2xx` или по окончательному `422` (повтор того же payload бессмыслен — сервер уже отверг данные, и пользователь либо увидел inline-ошибку и введёт заново с новым `submission_id`, либо это устаревшая ошибка после исправления).
- Если запись старше 7 дней и всё ещё не доставлена — считается потерей: удаляется из outbox и шлёт маяк `POST /api/lead-dead-letter` (`reason: "ttl"`), без PII (только `form_id`, `reason`, `attempts`).

**Известный риск (L14 плейбука, наследован от эталона, не устранён этим
изменением):** пока лид лежит в outbox, `localStorage` хранит его в открытом
виде (имя/телефон/email) до 7 дней — в том числе короткое время **после**
успешной отправки, до удаления записи. Для регулируемой ниши это отдельное
решение владельца (шифровать ключом сервера или не персистить контактные
поля); для юридической консультации риск ниже, чем для медицинской, но не
нулевой.

## 3. Активация (когда владелец решит включить биндинги)

**Статус на 2026-09-23 (round 2 review):** реальные Cloudflare-ресурсы для
Гамбаряна СУЩЕСТВУЮТ (аккаунт `4799e9f7…`, id ниже сообщены координатором,
созданы вне этого изменения репозитория) — но **ничего из этого ещё не
привязано ни к Pages, ни задеплоено как Worker**. `cron-worker/wrangler.toml`
уже содержит реальные PRODUCTION id (не плейсхолдеры) — см. таблицу ниже;
Pages-биндинги настраиваются отдельно, в дашборде проекта, не в файле этого
репозитория.

| Ресурс | Production | Preview |
|---|---|---|
| KV `LEADS_KV` | `gambarian-leads` — `10bb8fd2315248139fe95118affc1515` | `552a56110ca742aa879ca06c8f4dffe4` |
| D1 `LEADS_DB` | `gambarian-leads` — `da00d8e3-477c-4863-a677-dcad24868893` | `b57f842a-b498-4071-83a7-cee7d9aeb80b` |
| R2 `LEADS_ARCHIVE` | `gambarian-leads-archive` | `gambarian-leads-archive-preview` |

**Эти id НЕ проверены этой сессией через Cloudflare API** (ни `wrangler`, ни
MCP не вызывались против живого аккаунта — задача explicitly «no Cloudflare
changes»). Перед первым использованием — свериться `wrangler kv namespace
list` / `wrangler d1 list` / `wrangler r2 bucket list`.

1. **Cloudflare Pages** (`functions/api/lead.js`, `admin.js`, `lead-dead-letter.js`) —
   **у Pages ДВА независимых набора биндингов**, Production и Preview
   (Cloudflare Pages → Settings → Functions → в каждой из двух вкладок свои
   KV/D1/R2/переменные) — таблица выше даёт id для КАЖДОГО набора, перепутать
   Production/Preview значит писать боевые лиды в тестовое хранилище или наоборот:
   - привязать `LEADS_KV` (KV namespace) — id по таблице, отдельно для Production и Preview;
   - создать D1 (уже создана владельцем, id по таблице) — **применить схему из этого репозитория**:
     ```
     # рабочая директория: I:/GIT/gamb-lead-pipeline (или куда клонирован репозиторий), НЕ cron-worker/
     wrangler d1 execute gambarian-leads --remote --file=./db/leads-schema.sql          # production
     wrangler d1 execute <preview-D1-name> --remote --file=./db/leads-schema.sql        # preview, свою базу
     ```
     привязать как `LEADS_DB` — отдельно для каждого окружения;
   - привязать `LEADS_ARCHIVE` (R2 bucket) — отдельно для Production/Preview;
   - секреты (Cloudflare Pages, не в Git; **свои значения для Production и Preview**):
     `ALBATO_WEBHOOK_URL` (уже используется — без изменений), опционально
     `TELEGRAM_TOKEN` + `TELEGRAM_CHAT_ID`, **`ADMIN_PASSWORD` — обязателен**,
     если `/api/admin` вообще должен открываться (без него — всегда 403, см.
     ниже); опционально `ADMIN_USER`. **`ADMIN_ALLOWED_EMAILS` не используется**
     этим кодом — CF Access-путь убран в раунде ревью 2026-09-23 (finding 1),
     остался только Basic Auth; если эта переменная всё ещё где-то задана в
     дашборде — она безвредна, но бесполезна, можно убрать.
   - **`/api/admin` без `ADMIN_PASSWORD` остаётся закрытым (403)** — secure by
     default, ничего дополнительно включать не нужно, если админка не используется.
   - 🔴 **После добавления/изменения ЛЮБОГО биндинга Pages Functions
     обязателен НОВЫЙ деплой** (redeploy) — Cloudflare Pages не подхватывает
     новые/изменённые биндинги на уже существующем деплойменте задним числом;
     старый деплоймент как обслуживал трафик без биндингов (`hasDurableStorage`
     false, graceful degradation), так и продолжит, пока не будет пересобран.
2. **cron-worker** (`gambarian-lead-cron`):
   - `cron-worker/wrangler.toml` уже содержит реальные Production KV/D1/R2 id —
     **cron-worker привязывается только к Production** (у него нет Preview-режима);
   - применить схему D1 **из cron-worker/**, путь к файлу — на уровень выше:
     ```
     cd cron-worker
     wrangler d1 execute gambarian-leads --remote --file=../db/leads-schema.sql
     ```
   - `wrangler secret put ALBATO_WEBHOOK_URL` / `TELEGRAM_TOKEN` / `TELEGRAM_CHAT_ID` / `SHEET_COUNT_URL`
     (запускать из `cron-worker/` — это СВОИ секреты Worker'а, не общие с Pages);
   - `cd cron-worker && wrangler deploy`;
   - **обязательно проверить через Cloudflare API** (`/workers/scripts/gambarian-lead-cron/schedules`), что расписаний ровно 3 — вывод `wrangler` сам по себе не доказательство (см. комментарий в `wrangler.toml`).
   - `cron-worker/apps-script.gs` — **шаблон, не проверен против реальной Google-таблицы Гамбаряна**: подтвердить `SHEET_NAME`/`TIME_COLUMN_HEADER`/`ID_COLUMN_HEADER` против настоящего сценария Albato→Sheets, прежде чем заводить `SHEET_COUNT_URL` (иначе `reconcile` будет молча ругаться на несуществующие колонки).
3. **Гейт перед деплоем:** `node scripts/verify-lead-pipeline-remap.mjs` — должен быть `CLEAN`
   (ноль утечек Assuta/LuxeMed, оба id в `cron-worker/wrangler.toml` — реальные Cloudflare id, не плейсхолдер).
   🔴 **`CLEAN` не доказывает готовность к активации** — гейт проверяет только
   ФОРМУ строки (похоже на hex/UUID id, не `<GAMB_*>`, не известный Assuta-id) и
   НЕ вызывает Cloudflare API. Он не может обнаружить: неверный id (существует,
   но не тот ресурс), ресурс в чужом аккаунте, не применённую схему D1,
   отсутствующий Production/Preview биндинг на стороне Pages, не выполненный
   redeploy после привязки. Единственное реальное доказательство активации —
   **live readback**: тестовый лид (с разрешения владельца) → проверка через
   `/api/admin` (или GAQL/GTM на стороне аналитики) → удаление тестовой записи.
4. **Restore drill** (после первого реального дампа в R2):
   `node --experimental-sqlite scripts/restore-drill.mjs <manifest.json> <leads.ndjson>` —
   `scripts/restore-drill.mjs` для этого репозитория ещё не портирован (см. «Не сделано» ниже);
   можно временно скопировать `scripts/restore-drill.mjs` из эталона (не зависит от Assuta-специфики, только от `db/leads-schema.sql`).

## 4. Тесты

| Файл | Проверяет | Запуск |
|---|---|---|
| `test/lead-qa.mjs` | Реальные `functions/api/lead.js` + `admin.js` против mock KV/D1(node:sqlite)/R2 | `node --experimental-sqlite test/lead-qa.mjs` |
| `test/cron-backup-qa.mjs` | Реальный `cron-worker/src/index.js` против mock KV/D1/R2 | `node --experimental-sqlite test/cron-backup-qa.mjs` (+ `--negative-truncated` / `--negative-no-archive`) |
| `scripts/verify-lead-pipeline-remap.mjs` | Ноль Assuta/LuxeMed утечек + форма плейсхолдеров в `wrangler.toml` | `node scripts/verify-lead-pipeline-remap.mjs` |
| `scripts/verify-lead-hook.mjs` (существующий, не менялся по контракту) | Публичный контракт `/api/lead` не сломан graceful-degradation веткой | `node scripts/verify-lead-hook.mjs` |
| `scripts/verify-lead-form.mjs` (существующий, одна строка добавлена — очистка outbox перед блоком несовместимого контракта) | Форма, включая новый write-ahead outbox, не ломает существующие сценарии | обслуживается `scripts/full-checks.sh` |

## 5. Откуда что взято (для ревью диффа)

| Файл здесь | Взято из (`digitalhook-os-`, `feature/luxemed-new-lending@613cdd30`) | Что адаптировано |
|---|---|---|
| `functions/api/lead.js` (пайплайн-часть) | `functions/lead.js` | Сохранена вся существующая валидация/JSON-контракт Гамбаряна; добавлен KV→R2→D1→lease→Albato пайплайн как ветка `hasDurableStorage(env)`; форвард в Albato — JSON (не FormData, чтобы не менять текущую интеграцию); ответ всегда `{ok,status:"accepted",submission_id[,dedup]}` вместо `delivered\|pending` в теле |
| `functions/api/lead-dead-letter.js` | `functions/lead-dead-letter.js` | Только переименование под `/api/` |
| `functions/api/admin.js` | `functions/admin.js` | Колонки под схему Гамбаряна; де-брендинг (Гамбарян вместо Assuta, `gambarian-leads.csv/.md`); маршрут `/api/admin` вместо `/admin` (см. §1) |
| `db/leads-schema.sql` | `db/leads-schema.sql` | Убраны медицинские поля Assuta (`lead_type/direction/urgency/diagnosis/channel`); добавлены `corrects_submission_id` + полный набор attribution (`utm_id/utm_term/utm_content/fbclid`) под `site/lead-contract.js` |
| `cron-worker/*` | `cron-worker/*` | Имя воркера `gambarian-lead-cron`; бакет `gambarian-leads-archive`; KV/D1 id — плейсхолдеры `<GAMB_KV_ID>`/`<GAMB_D1_ID>`; `D1_COLUMNS` под новую схему; таймаут форварда синхронизирован с `LEAD_CONTRACT.upstreamTimeoutMs` (10 с вместо жёстких 5 с эталона) |
| `test/lead-qa.mjs`, `test/cron-backup-qa.mjs` | `test/lead-qa.mjs`, `test/cron-backup-qa.mjs` | JSON body вместо multipart; `lf_hp` вместо `website`; все fixture-id — настоящие `crypto.randomUUID()` (контракт Гамбаряна отвергает произвольные строки как `submission_id`); добавлен T4b (KV пишет, но падает — закрывает найденный на этом баг: `claim==="pending"` без реального персиста раньше отвечал 202) |
| `site/app.js` (outbox) | `src/tracking.jsx` (концепция, не код — другой стек: React/JSX vs vanilla) | Свой минимальный outbox на том же контракте (L2/L6/L9/L11 плейбука): localStorage write-ahead, ретраи load/online/60с/pagehide, `fireLeadOnce` с персистентным Set id |
| `scripts/verify-lead-pipeline-remap.mjs` | `docs/CLONE-CONFIG-MATRIX-2026-06.md` §7 (grep-гейт) | Формализован в скрипт; расширен проверкой формы плейсхолдеров (не только «нулевая утечка») |

## 6. Review 2026-09-23 — независимое ревью коммита `bd8dc8e`

Независимый ревьюер (Codex) вернул `CHANGES_REQUESTED` с 8 воспроизведёнными
дефектами. Для каждого — сначала тест, красный на `bd8dc8e`, затем правка,
затем тест зелёный (все прогоны — реальные команды, не пересказ).

| # | Уровень | Находка | Файл:строка (на `bd8dc8e`) | Правка | Тест |
|---|---|---|---|---|---|
| 1 | P1 | `Cf-Access-Authenticated-User-Email` доверялся без проверки — поддельный заголовок давал полный доступ (чтение, CSV, удаление) без пароля | `functions/api/admin.js:41` | CF Access убран полностью; только HTTP Basic Auth; сравнение пароля/логина в constant-time (`timingSafeEqual`, без ранних `return` по длине); нет `ADMIN_PASSWORD` → 403 | `test/lead-qa.mjs` T8 |
| 2 | P1 | Конкурентный follower отвечал `202` немедленно, не дожидаясь исхода leader'а; если leader в итоге падал (KV недоступен, D1 нет, Albato недоступен) — лид нигде не сохранён, а клиент уже очистил outbox по `2xx` | `functions/api/lead.js:649` | `processDurableLead` возвращает `{status, body}` (не `Response` — тело нельзя прочитать дважды); follower дожидается ТОЙ ЖЕ промисы leader'а и строит свой `Response` из реального исхода | `test/lead-qa.mjs` T9 |
| 3 | P1 | Лид, сохранённый только в D1 (все записи в KV упали), никогда не подхватывался свипом — оба свипа (`functions/api/lead.js` и `cron-worker`) сканируют только список ключей KV | `functions/api/lead.js:496`, `cron-worker/src/index.js:259` | Оба свипа получили второй источник: прямой D1-запрос `pending`/просроченный `forwarding`; запись восстанавливается из `payload_json` и проходит тот же `claim`/`forward` путь (лиз в D1 естественно защищает от дублей) | `test/lead-qa.mjs` T10; `test/cron-backup-qa.mjs` (cron-side D1-only retry) |
| 4 | P1 | `claimD1Lease` делал `upsertD1` (полный upsert) ДО попытки лиза; устаревший снимок из KV со статусом `pending` перезаписывал живую (не просроченную) строку `forwarding`, и следующий `UPDATE` отбирал лиз у изолята, который всё ещё доставлял — двойной POST в Albato | `cron-worker/src/index.js:158` | `upsertD1` перед лизом заменён на `insertD1IfMissing` (INSERT … ON CONFLICT DO NOTHING — никогда не трогает существующую строку); после успешного `UPDATE` — readback `delivered_at` как проверка «токена владения» | `test/cron-backup-qa.mjs` (`claimD1Lease does not steal a live unexpired forwarding lease…`) |
| 5 | P1 | Удаление сначала стирало D1, ошибки KV/R2 проглатывались, `deleted=…` возвращался всегда; призрак `pending` в KV потом подхватывался свипом и лид пересоздавался в D1 и переотправлялся в Albato; дата для R2-ключа терялась после удаления D1-строки | `functions/api/admin.js:123` | Tombstone (`tomb:<id>` в KV, TTL 90д) пишется ПЕРВЫМ, до любых удалений; оба свипа (KV- и D1-источник) в `lead.js` и свип в `cron-worker` проверяют tombstone и пропускают такой id; успех (`deleted=<id>`) — только когда tombstone-запись и ОБЕ копии (KV+D1) подтверждены; R2-архив — по-прежнему best-effort и вне вердикта («keep archive key» — сохранённый аудиторский след, не копия, способная воскресить лид) | `test/lead-qa.mjs` T11 |
| 6 | P1 | Мутации outbox/sent-ID в `localStorage` — без блокировки; две вкладки могут потерять запись друг друга (enqueue) или обе выстрелить `generate_lead` по одному лиду (fireLeadOnce) | `site/app.js:621` | Каждая мутация (`enqueueOutbox`, `dequeueOutbox`, `fireLeadOnce`, бухгалтерия `flushOutbox`) обёрнута в `navigator.locks.request` (кросс-вкладочная блокировка по origin); сетевой запрос — вне лока. **Остаточный риск (не устранён по дизайну, задокументирован по образцу того же приёма из ревью):** в браузере без Web Locks — деградация к прежнему поведению без кросс-вкладочной защиты | `scripts/verify-lead-outbox.mjs` → `verifyLeadOutboxLocking` |
| 7 | P2 | CSV-инъекция: ячейка, начинающаяся с `=`, `+`, `-`, `@`, таб или CR, открывается Excel/Sheets как формула | `functions/api/admin.js:36` | `csvCell` добавляет `'` перед такими значениями до экранирования кавычек/запятых (гейт OWASP CSV Injection) | `test/lead-qa.mjs` T12 |
| 8 | P2 | Ретрай коррекции (`corrects_submission_id` заполнен) из outbox слал `generate_lead` вместо `lead_corrected` | `site/app.js:682` | Общий обработчик `handleLeadAccepted(data, submissionId, secondsToLead)` для ручной отправки и ретрая; маршрутизация — по `data.corrects_submission_id` (данные самой записи), а не по UI-флагу `editingContacts`, которого у записи outbox нет | `scripts/verify-lead-outbox.mjs` → `verifyLeadOutboxCorrection` |

**Не входило в это ревью (сознательно, не запрашивалось):** обсуждался редундантный tombstone внутри самой D1-строки (`status='deleted'` вместо `DELETE`) как альтернатива для находки 5 — **раунд 2 (ниже) как раз это и реализовал** после того, как повторное ревью нашло обходы единственного KV-tombstone (находка B). Абзац сохранён для истории решения.

## 7. Review 2026-09-23 — раунд 2 (повторное ревью коммита `39750ac`)

Повторное ревью подтвердило исправление находок 1, 2 и 8 из раздела 6, признало
находки 3 и 4 закрытыми **для исходного сценария**, и нашло 7 новых дефектов
(A–G) — частично регрессии от самого исправления раунда 1, частично обходы,
не покрытые тестами раунда 1, частично долгоживущий баг гонки лизов.

| # | Уровень | Находка | Файл:строка (на `39750ac`) | Правка | Тест |
|---|---|---|---|---|---|
| A | P1, регрессия | D1-свип (введён в раунде 1 для находки 3) переотправлял в Albato лид, который KV уже показывал доставленным — сценарий: Albato принял, но ФИНАЛЬНАЯ запись в D1 не удалась, лиз истёк, D1-свип видит «свежий» pending/forwarding | `functions/api/lead.js:496`, `cron-worker/src/index.js:389` | Перед клеймом D1-кандидата — сверка с KV-маркером доставки; если KV уже `delivered`/`albato_delivered_at` — почистить (upsert) D1 БЕЗ повторного POST | `test/lead-qa.mjs` T13; `test/cron-backup-qa.mjs` (`cron D1 retry does not re-post…`) |
| B | P1 | Обход tombstone: повторный POST с id удалённого лида создавал новую D1-строку и слал в Albato; `reconcileKvToD1` мог восстановить после частичного удаления; ошибка чтения `tomb:*` трактовалась как «не удалён» (fail-open) | `functions/api/lead.js:536`, `cron-worker/src/index.js:625`, `functions/api/lead.js:429` | `status='deleted'` в D1 — теперь АВТОРИТЕТНЫЙ маркер: `admin.js` делает soft-delete (upsert, строка остаётся), `upsertLeadD1`/`upsertD1` защищают `deleted` в `CASE WHEN` наравне с `delivered`, claim-UPDATE структурно не выбирает `deleted`-строки; `isLeadDeleted`/`isDeleted` проверяют D1 (первично) + KV tombstone (вторично) на intake/в обоих свипах; ошибка чтения ОБОИХ сигналов → fail closed (считать удалённым) | `test/lead-qa.mjs` T14, T14b |
| C | P1, ранее существовавший | Владелец лиза — таймстамп: два изолята, вычисливших `new Date().toISOString()` в одну и ту же миллисекунду, оба получали `'claimed'` (fallback-ветка сравнивала `row.delivered_at === startedAt`, что могло совпасть с ЧУЖИМ выигравшим значением); отложенное завершение устаревшего владельца могло сбросить свежий активный лиз | `functions/api/lead.js:277`, `:403` | Убрано сравнение таймстампов как «токена владения» — `d1Changes(result) > 0` САМОЙ claim-UPDATE уже атомарно и авторитетно доказывает победу, fallback-ветка больше не пытается угадывать по значению; `markLeadDelivered`/`releaseLeadToPending` пишут в D1 через guarded UPDATE (`upsertLeadD1Guarded`) — применяется только если лиз всё ещё наш (`delivered_at` совпадает с тем, с которым мы клеймили) или строка не занята чужим `forwarding` | `test/lead-qa.mjs` T15 (прямой вызов `claimLeadD1Lease` с идентичным `startedAt` — детерминированная симуляция коллизии) |
| D | P2 | Исключение в `LEADS_KV.list()` прерывало весь `sweepPending` ДО D1-свипа — 0 ретраев в этом прогоне | `cron-worker/src/index.js:307` | KV-фаза обёрнута в собственный `try/catch`, независимый от D1-фазы | `test/cron-backup-qa.mjs` (`D1-only retry still runs… when LEADS_KV.list() throws`) |
| E | P2 | CSV: значение с внутренним `\r` без `\n` (например `"Review\r=1+1"`) экспортировалось БЕЗ кавычек — старая проверка кавычкования не видела голый `\r`; нестрогий CSV-парсер мог трактовать `\r` как разделитель строк и получить незаэкранированную `=1+1` | `functions/api/admin.js:49` | `csvCell` квотирует при наличии `\r` тоже (`/[",\n\r]/`); формульный префикс нейтрализуется на КАЖДОЙ строке внутри ячейки (`split(/\r\n|\r|\n/)`), не только в самом начале значения | `test/lead-qa.mjs` T16 |
| F | P2 | `handleLeadAccepted`: две вкладки, ретраящие одну и ту же коррекцию, обе слали `lead_corrected` для одного `submission_id` — лок (находка 6) защищает только запись в outbox, а не количество независимо успешных попыток доставки | `site/app.js:684` | Дедуп по `submission_id`, общий для `generate_lead` И `lead_corrected` (`fireEventOnce` → `fireLeadOnce`/`fireCorrectionOnce`, один персистентный Set под тем же локом) | `scripts/verify-lead-outbox.mjs` → `verifyLeadCorrectionDedup` (два `page` в одном `context`, общий origin/localStorage) |
| G | — | Документация: `ADMIN_PASSWORD` описан как опциональный (на деле обязателен — без него `/api/admin` всегда 403); `ADMIN_ALLOWED_EMAILS` больше не используется (CF Access убран в находке 1); не было явного различия Production/Preview биндингов Pages и обязательности redeploy после привязки; `remap CLEAN` не был явно помечен как «не доказывает готовность к активации» | `docs/LEAD-PIPELINE.md:70-71` | §3 переписан: реальные Production/Preview id (сообщены координатором 2026-09-23, аккаунт `4799e9f7…`, НЕ проверены этой сессией через Cloudflare API) сведены в таблицу; путь применения схемы из `cron-worker/` (`../db/leads-schema.sql`); явное требование redeploy Pages после смены биндингов; явная оговорка о недостаточности `remap CLEAN`. Реальные id внесены в `cron-worker/wrangler.toml` (заменили плейсхолдеры); `scripts/verify-lead-pipeline-remap.mjs` инвертирован — теперь падает, если плейсхолдер ОСТАЛСЯ, а не если остался | — (документация + гейт; гейт проверен: `node scripts/verify-lead-pipeline-remap.mjs` → `CLEAN` с реальными id, вручную подтверждено падение при возврате плейсхолдера) |

**Сознательно вне рамок раунда 2:** guard-UPDATE (находка C) применён только в
`functions/api/lead.js` (`markLeadDelivered`/`releaseLeadToPending`) — у
`cron-worker/src/index.js` завершение инлайново внутри `sweepPending`, и
ревьюер эту гонку там не указывал (его цитаты — только `lead.js:277,:403`);
`claimD1Lease` в `cron-worker` уже был устойчив к этой конкретной ошибке
(readback только в ветке `d1Changes>0`, что и так авторитетно). Если позже
найдётся эквивалент находки C на стороне cron — потребуется отдельная правка.

## Related

- `knowledge/web-dev/ADFIX-SITE-SYSTEM-PLAYBOOK.md` §1.6–1.8 — контракт «никогда не терять лид», админка, крон
- `docs/LEAD-WEBHOOK-CONTRACT.md` — публичный контракт `/api/lead` (payload, honeypot, ошибки) — не менялся по существу этим изменением

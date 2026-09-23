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

## 8. Review 2026-09-23 — раунд 3 (повторное ревью базы `ed4033f`)

Третье ревью подтвердило исправление находок A, D, E, F, G из раздела 7,
признало находки B и C **частичными**, и нашло 4 новых дефекта — два P1
(регрессия/недоделка самих находок раунда 2) и два P2 (утечка PII в
tombstone-строке и ложный алерт в reconcile).

| # | Уровень | Находка | Файл:строка (на `ed4033f`) | Правка | Тест |
|---|---|---|---|---|---|
| 1 | P1 | Ошибка чтения D1-статуса ИЛИ KV-tombstone (`isLeadDeleted`, булево) схлопывала «подтверждённо удалён» и «не удалось проверить» в один и тот же результат `true`; на intake это трактовалось как «тихо принять и ничего не делать» — новый, ранее не виданный `submission_id`, у которого ОБА сигнала временно недоступны, получал `202 accepted/dedup`, но не сохранялся НИГДЕ (ни в KV, ни в D1) — полная тихая потеря лида несмотря на то, что `KV.put` сам по себе был исправен | `functions/api/lead.js:527`, `:661` | `isLeadDeleted` заменена на трёхзначную `checkLeadDeletionStatus` → `'deleted' \| 'active' \| 'unknown'`; `'unknown'` (оба сигнала нечитаемы) НИКОГДА не трактуется как «удалён» — на intake проваливается в обычную попытку сохранения (которая и так вернёт ретраябельный `502 not_persisted`, если сохранить действительно нечего); в свипах (`isLeadDeletedForSweep`) `'unknown'` по-прежнему консервативно пропускается («не трогать в этом цикле» — безопасно, кандидат уже существует в durable-хранилище и будет пересмотрен следующим свипом) | `test/lead-qa.mjs` T14b (переписан: раньше допускал `202 ИЛИ 502`, что проходило и на баге; теперь проверяет РЕАЛЬНОЕ сохранение в KV и отсутствие пустого `dedup:true`) |
| 2 | P1 | CAS-условие guard-UPDATE (находка C, раунд 2) было логически инвертировано: `status != 'forwarding' OR delivered_at=?guard` РАЗРЕШАЛО запись всякий раз, когда строка НЕ в состоянии `forwarding` — включая терминальные состояния (`delivered`, `deleted`), выставленные СОВСЕМ ДРУГИМ актором (admin-delete во время активной доставки, или более новый изолят, довершивший лиз). Запись в KV при этом не была связана с результатом CAS вообще — писалась безусловно | `functions/api/lead.js:456`, `:465-484`; `cron-worker/src/index.js:474` (и ещё 3 аналогичных сайта: `:396`, `:408`, `:468`) | Условие исправлено на `status='forwarding' AND delivered_at=?guard` — запись проходит ТОЛЬКО если строка всё ещё под НАШИМ активным лизом; `upsertLeadD1Guarded`/`upsertD1Guarded` возвращают третье значение `"not_owner"`, и `markLeadDelivered`/`releaseLeadToPending` (и 4 эквивалентных места в `cron-worker`) пропускают последующую запись в KV (и, для `markLeadDelivered`, добавление в `deliveredLeadsInProcess`) при `"not_owner"` | `test/lead-qa.mjs` T17 (прямой вызов `markLeadDelivered`), T17b (`releaseLeadToPending`); `test/cron-backup-qa.mjs` (`upsertD1Guarded` — застаревшая доставка не должна перезаписать активный лиз более нового изолята) |
| 3 | P2 | Soft-delete (находка B, раунд 2) переключала только `status='deleted'`, но оставляла `name`/`phone`/`email`/`payload_json`/атрибуцию полностью нетронутыми в D1-строке навсегда, несмотря на то что админка сообщает «Удалено»; бэкап-дамп (`dumpD1ToR2`, `SELECT * FROM leads`) забирает эти значения как есть | `functions/api/admin.js:191`, `cron-worker/src/index.js:541` | `deleteLead`'s `ON CONFLICT DO UPDATE` теперь дополнительно зануляет `name/phone/email/corrects_submission_id/form_id/landing_path/referrer_host/utm_*/gclid/gbraid/wbraid/fbclid` и сбрасывает `payload_json` в `'{}'`, оставляя только `submission_id/received_at/status/delivered_at` — минимальный tombstone; `dumpD1ToR2` изменений не потребовал: раз сама строка уже очищена, дамп физически не может забрать то, чего в ней больше нет | `test/lead-qa.mjs` T18 |
| 4 | P2 | `reconcileR2Presence` не фильтровал `status='deleted'` — admin-delete best-effort удаляет `.md`-файл из R2, поэтому у любой удалённой заявки внутри 14-дневного окна закономерно нет архивного файла, и это подавалось как ложный алерт «нет MD-файлов» | `cron-worker/src/index.js:719` | В запрос добавлено `AND status != 'deleted'` | `test/cron-backup-qa.mjs` (`reconcile leg 4 does not alert a missing R2 MD file for a soft-deleted row`) |

**Проверено и не потребовало правки:** `cron-worker`'s `dumpD1ToR2` (находка 3,
вторая цитата `:541`) — сам дамп не содержит PII-специфичной логики, он читает
D1 «как есть»; после правки в `admin.js` очищенная строка автоматически даёт
очищенный бэкап без отдельного изменения дамп-запроса.

## 9. Review 2026-09-23 — раунд 4 (повторное ревью коммита `e7a719e`)

Четвёртое ревью подтвердило исправление находок 3 и 4 из раздела 8, и нашло
1 регрессию (P1) от самой находки 1 раунда 3, плюс 2 системных дефекта
(P2) — вызовы, не проверявшие явный результат владения лизом перед тем как
слать алерты и переписывать KV чужой (устаревшей) записью.

| # | Уровень | Находка | Файл:строка (на `e7a719e`) | Правка | Тест |
|---|---|---|---|---|---|
| A | P1, регрессия | Раунд 3 (находка 1) при `'unknown'` (ОБА сигнала удаления нечитаемы) проваливался в обычный intake, рассуждая, что дальнейшая логика persisted/delivered и так вернёт ретраябельный `502`. Но если id БЫЛ реально удалён (D1 скрыто хранит `status='deleted'`, просто временно недоступен из-за реального сбоя D1/KV), это ВОСКРЕШАЛО его: свежий PII уходил в KV/R2, и один POST улетал в Albato — до того как сигналы вообще разрешились | `functions/api/lead.js:697` (проверка `checkLeadDeletionStatus`), `:738` (fallthrough) | На `'unknown'` — немедленный отказ `503 deletion_status_unknown` ДО любой записи/архивации/отправки; клиентский write-ahead outbox сохраняет лид и повторит попытку после устранения сбоя — потерь нет, воскрешения нет. Гвард: `'unknown'` возможен ТОЛЬКО когда биндинг СУЩЕСТВУЕТ и чтение упало (`checkLeadDeletionStatus`'s `!d1Error \|\| !kvError` уже резолвит в `'active'`, если биндингов нет вовсе) — режим без биндингов (Albato-only, до активации) не затронут | `test/lead-qa.mjs` T14b (переписан под контракт раунда 4), T19 (точный сценарий воскрешения — в D1 реально `deleted`), T19b (гвард: без биндингов вообще — поведение не изменилось) |
| B | P2 | Вызовы `releaseLeadToPending`/`markLeadDelivered` не проверяли явный результат владения лизом перед тем как слать алерт или переписывать KV — при `"not_owner"` (другой актор уже изменил строку, пока эта попытка была в полёте) `sweepPendingLeads` всё равно слал «недоставлено»-алерт и переписывал KV своим устаревшим `rec` (с PII), а `processDurableLead`/D1-свип всё равно слали «новый лид»-алерт после `markLeadDelivered` | `functions/api/lead.js:612`, `:618` (свип, KV-цикл), `:744` (intake) | `releaseLeadToPending` теперь возвращает явный булев результат (раньше — `undefined`); ВСЕ вызывающие места (`sweepPendingLeads` — оба цикла, `processDurableLead`) проверяют возврат `markLeadDelivered`/`releaseLeadToPending` и пропускают алерт/переписывание KV при `false` | `test/lead-qa.mjs` T20 (свип, KV-цикл — сконструированная гонка через перехват SQL), T21 (intake, тот же приём) |
| C | P2 | Ошибка ВНУТРИ самого CAS-guard'а (D1 упал именно в момент завершающей записи) возвращала `false` — то же значение, что и «D1 не привязан вовсе» (легитимный legacy-режим); вызывающий код трактовал оба случая одинаково и всё равно помечал лид доставленным в KV + слал алерт, хотя владение подтвердить не удалось | `functions/api/lead.js:490` (`markLeadDelivered`'s `not_owner`-чек); `cron-worker/src/index.js:433` (и 3 аналогичных места: `:443`, `:516`, `:524`) | `upsertLeadD1Guarded`/`upsertD1Guarded`'s `catch` теперь возвращает отдельное значение `"error"` (не `false`) — «D1 привязан, но запрос упал», отличное от «не привязан вовсе»; все проверки `"not_owner"` расширены до `"not_owner" \|\| "error"` — трактуется как «владение не подтверждено», без записи в KV и без алерта; строка остаётся как есть до следующего свипа (tombstone/чужое состояние не трогается) | `test/lead-qa.mjs` T22 (прямой вызов `markLeadDelivered` с брошенным guard-запросом); `test/cron-backup-qa.mjs` (`upsertD1Guarded` — то же для cron-worker) |

**Process note:** для находок B/C реальная гонка (другой актор меняет строку
между клеймом и завершающей записью ЭТОГО же вызова) недостижима через
публичный путь без искусственного вмешательства — тесты перехватывают
`db.prepare` и вставляют побочный эффект (сырой `UPDATE` через оригинальный
`prepare`) ровно перед guard-запросом, детерминированно воспроизводя момент
гонки — тот же приём, что и T15/T17 в предыдущих раундах.

## 10. Review 2026-09-23 — раунд 5 (гонка admin-delete, найдена Codex на `6034203`)

Codex подтвердил находки A/B/C раунда 4 и нашёл отдельную гонку: **admin
DELETE не сериализован** относительно параллельного writer'а для ТОГО ЖЕ
`submission_id`. Два сценария:

1. **Гонка завершения:** наш CAS (`upsertLeadD1Guarded`) коммитит
   `changes=1` (значит, лиз наш) — но ПОТОМ, ДО того как наша запись в KV
   успевает выполниться, параллельный admin-delete успевает выполниться
   ПОЛНОСТЬЮ (D1→`deleted`, PII зачищен, KV/R2 стёрты). Наша собственная
   запись в KV после этого всё равно выполняется — воскрешая PII, и
   (без правки) слался бы «новый лид»-алерт.
2. **Гонка intake:** проверка `checkLeadDeletionStatus` читает `'active'`
   (на тот момент это правда) — но ПОТОМ, ДО записи intake, admin-delete
   успевает выполниться полностью. Intake всё равно пишет свежий KV+R2 —
   D1 при этом остаётся `'deleted'` (защищено `ON CONFLICT DO NOTHING` /
   CASE WHEN), POST в Albato не уходит (клейм лиза не матчит `'deleted'`
   строку), но PII оказывается заново в KV/R2.

**Решение (сознательно, без Durable Object):** полная сериализация
потребовала бы Durable Object — вне рамок этой правки. Вместо этого
удаление сделано **eventual и bounded**, а не мгновенно-атомарным:

- **(a) Re-check после записи.** Сразу после записи в KV (и, при intake,
  в R2) — повторное чтение D1-статуса ОДИН раз. Если `'deleted'` — стереть
  KV (и R2, если передан `receivedAt`) заново, и сообщить вызывающему коду
  «владение не подтверждено» (`false`), чтобы алерт не ушёл. Закрывает
  гонку в подавляющем большинстве случаев — **в рамках того же запроса**.
- **(b) Janitor в cron-worker.** Для D1-строк `status='deleted'` за
  последние `JANITOR_WINDOW_DAYS=30` дней — идемпотентно убедиться, что
  ключ KV и объект R2 ОТСУТСТВУЮТ; безопасно перезапускать каждый цикл.
  Алерт — только числа (сколько KV/R2 очищено), НИКОГДА `submission_id`
  или значение поля (иначе алерт сам стал бы вторым PII-каналом).
- **(c) Гарантия документирована здесь:** удаление гарантированно
  завершается **в течение одного интервала `reconcile`** (раз в сутки — с
  раунда 5 это часовой триггер `"0 * * * *"` при UTC-часе 18, см. §11; ранее
  был отдельный `"0 18 * * *"`), а не мгновенно. Для остаточного окна между
  re-check'ом (a) и возвратом ответа — теоретически возможна, но не
  доказано что ненулевая без Durable Object; janitor (b) закрывает её на
  следующем цикле в любом случае.
- **(d) Раунд 6 (Codex, «send-after-delete»):** re-check (a) закрывает
  ТОЛЬКО гонку «завершение ПОСЛЕ CAS». Отдельная гонка — admin-delete
  побеждает ПОСЛЕ клейма лиза, но ДО самого POST в Albato: и старая (a), и
  сама by design не покрывали этот момент. См. §13, находка 2.

| Сценарий | Файл:строка (на `6034203`) | Правка | Тест |
|---|---|---|---|
| 1 (завершение) | `functions/api/lead.js:493`, `:508` (`markLeadDelivered`) | Новая `wipeIfDeletedAfterWrite(env, key, submissionId, receivedAt)` вызывается после `putLeadRecordWithRetry`; при `'deleted'` — стирает KV(+R2), возвращает `false` (то же самое добавлено в `releaseLeadToPending`) | `test/lead-qa.mjs` T23 |
| 2 (intake) | `functions/api/lead.js:762-763` | `wipeIfDeletedAfterWrite` вызывается после `putLeadRecord`+`archiveLeadR2`; при обнаружении `'deleted'` — стирает KV+R2 и возвращает клиенту безобидный `202 {dedup:true}` без клейма лиза и без POST в Albato | `test/lead-qa.mjs` T24 |
| Janitor | `cron-worker/src/index.js` (новая функция `janitorPurgeDeletedLeads`, 5-й leg в `reconcile()`) | Раз в сутки проверяет все `deleted`-строки за 30 дней, чистит оставшиеся KV/R2, алерт только с числами | `test/cron-backup-qa.mjs` (leftover-сценарий + idempotency-сценарий — 0 алертов, если чистить нечего) |

**Приём тестирования:** оба сценария гонки воспроизведены через перехват
`kv.put` — побочный эффект (сырой admin-delete UPDATE через
`db.prepare(...).run()`) вставляется РОВНО перед фактической записью,
детерминированно моделируя «чужой delete выиграл гонку прямо перед нашей
записью» — тот же приём, что и в раундах 3/4 для CAS-гонок.

## 11. Раунд 5, дополнение — часовой бэкап вместо суточного (owner requirement)

**Причина:** владелец хочет снимок D1→R2 не старше 1 часа (было — раз в
сутки). **Жёсткое ограничение:** Cloudflare Workers Free допускает
**максимум 5 cron-триггеров НА АККАУНТ** (не на воркер) — `assuta-lead-cron`
уже занимает 3, так что `gambarian-lead-cron` остаётся ровно **2**. Деплой
с 3 выражениями упал с ошибкой `10072`.

**Решение:** суточные шаги (`verifyPreviousDump`, `purgeExpiredDumps`,
недельный heartbeat по воскресеньям — раньше свой `"30 2 * * *"`) и
`reconcile()` (раньше свой `"0 18 * * *"`) склеены в ОДИН часовой триггер
`"0 * * * *"` и различаются внутри `hourlyRun()` по UTC-часу СРАБАТЫВАНИЯ
(`event.scheduledTime`, не wall-clock «сейчас» — устойчиво к небольшой
задержке инвокации).

| Cron-выражение | Что делает |
|---|---|
| `*/5 * * * *` | `sweepPending()` — без изменений (плюс janitor раунда 5 живёт внутри `reconcile()`, см. §10, поэтому его собственная частота = частоте `reconcile`, не `sweepPending`) |
| `0 * * * *` (часовой) | **ВСЕГДА**, каждый час: `dumpD1ToR2()` — ключ дня `backups/d1/<jerusalemDay>/` перезаписывается каждым часовым снимком, так что самый свежий снимок не старше часа, а данные за прошлые дни остаются нетронутыми (свой префикс на день). **При UTC-часе 2** — ДОПОЛНИТЕЛЬНО `verifyPreviousDump()` + `purgeExpiredDumps()` (+ недельный heartbeat по воскресеньям). **При UTC-часе 18** — ДОПОЛНИТЕЛЬНО `reconcile()` (4 проверки + janitor). Порядок внутри `hourlyRun()`: дамп ПЕРВЫМ, суточные шаги — после; если суточный шаг бросит исключение, дамп уже выполнен и не пострадает |

**`verifyPreviousDump` проверено, изменений не потребовалось:** функция
всегда читает ТЕКУЩЕЕ содержимое `backups/d1/<vчера>/`, а не «первую запись
дня» — перезапись более поздним часовым снимком для неё прозрачна.
Доказано тестом (`test/cron-backup-qa.mjs`, «hourly overwrite»): два
последовательных `putBackup` на один и тот же день-ключ (более ранний, потом
более поздний с бо́льшим числом строк) → `verifyPreviousDump` успешно
верифицирует ИМЕННО последний (перезаписанный) снимок.

**Тесты** (`test/cron-backup-qa.mjs`, red на состоянии до этого дополнения
→ green после): часовое срабатывание в «обычный» час пишет дамп и не
запускает `reconcile`/sweep; срабатывание в UTC-час 2 пишет дамп + вызывает
`verifyPreviousDump`; срабатывание в UTC-час 18 пишет дамп + вызывает
`reconcile` (чинит KV-лид без D1-строки); `*/5 * * * *` никогда не пишет
дамп; `wrangler.toml` содержит РОВНО 2 cron-строки.

## 12. Раунд 5, дополнение 2 — pipeline-health v1 (owner approved)

**Причина:** у этого клиента НЕ настроен Telegram → сбои backup/sweep
сегодня происходят молча. Мини-CRM (Apps Script) раз в час читает
`GET /health` и шлёт письмо на `alex@adfix.co.il` при сбое. Контракт ниже —
фиксированный (тот же текст, на который CRM-агент строит читателя).

**Контракт `pipeline-health v1`:**

```
GET /health → 200 application/json, Cache-Control: no-store
Другой путь → 404. Другой метод на /health → 405.

{"schema":1,"generated_at":ISO,
 "backup":{"last_ok_at":ISO|null,"last_run_at":ISO|null,"integrity_ok":true|false|null},
 "sweep":{"last_ok_at":ISO|null,"last_run_at":ISO|null},
 "stuck_leads":int,
 "albato_configured":bool}

Если D1 недоступен → 503 {"schema":1,"error":"d1_unavailable"}
```

- `stuck_leads` — строки D1 со `status IN ('pending','forwarding')` и
  `received_at` старше 30 минут.
- `albato_configured` — булево `!!env.ALBATO_WEBHOOK_URL`, само значение
  URL НИКОГДА не возвращается.
- Тело ответа не содержит PII, текстов ошибок и других чисел кроме
  `stuck_leads`.

**Хранение — новая таблица D1 `cron_health(job TEXT PRIMARY KEY, last_run_at
TEXT, last_ok_at TEXT, detail TEXT)`** (`CREATE TABLE IF NOT EXISTS`
добавлена в `db/leads-schema.sql`; применение на прод — на владельце,
эта сессия Cloudflare не трогала). `last_run_at` пишется при КАЖДОМ
запуске job'а; `last_ok_at` — только при успехе (`backup`: дамп прошёл И
`integrity_ok===true`; `sweep`: прогон завершился без исключения).
**Никаких записей в KV** — общий на аккаунт free-tier лимит 1000
write/сутки, делится с Assuta.

**Реализация:** `cron-worker/src/index.js` — `recordCronHealth()` (пишет
`cron_health`, best-effort, никогда не бросает), вызывается из `hourlyRun()`
(job `backup`, каждый час) и `sweepPending()` (job `sweep`); `fetch()` —
новый экспорт воркера, роутинг `/health` (GET→200/503, иначе 404/405) +
`buildHealthResponse()` (читает `cron_health` + считает `stuck_leads`).

**Найденный и исправленный по ходу баг (пойман собственным тестом, не
ушёл в прод):** первая версия `recordCronHealth` писала `INSERT INTO
cron_health (job, last_run_at, last_ok_at, detail) VALUES (?1, ?2, ?2, ?3)`
— повторное использование `?2` валидно для настоящего D1/SQLite (резолвит
по индексу), но тестовый mock D1 в этом репозитории стрипает номера и
биндит анонимные `?` ПОЗИЦИОННО — четыре `?` при трёх переданных значениях
сдвинули на одну позицию всё после `last_run_at`, и `last_ok_at` получил
значение `detail`. Тест сразу поймал (`last_ok_at:"integrity_ok=true"`
вместо ISO-таймстампа) — исправлено на `VALUES (?1, ?2, ?3, ?4)` с `now`,
переданным дважды отдельными аргументами (тот же паттерн, что уже
документирован для раунда 2 — placeholder'ы в возрастающем текстовом
порядке, совпадающем с порядком `.bind()`).

**Тесты** (`test/cron-backup-qa.mjs`, red перед реализацией → green после):
полная форма ответа после реальных `hourlyRun`+`sweepPending` (включая
`stuck_leads` — считает лид старше 30 мин, не считает лид младше 5 мин);
`503` при отсутствии `LEADS_DB` И при падении самого запроса; `404` на
неизвестном пути; `405` на `POST /health`; провал бэкапа оставляет
`last_ok_at` прежним, но продвигает `last_run_at`. **Уточнено в раунде 6:**
при падении самого дампа (не только его integrity-проверки) `integrity_ok`
теперь корректно `null` (неизвестно), а не `false` — `false` зарезервирован
за случаем «дамп прошёл, но собственная same-run integrity-проверка не
сошлась»; код это уже считал верно, поправлена только формулировка теста.

## 13. Review 2026-09-23 — раунд 6 (сводное ревью коммита `ea91e3c`: Codex +
пятилинзовый ревью, каждая находка независимо перепроверена 2 скептиками)

**Контекст:** прод работает на `6034203`; владелец временно отключил живой
`*/5`-свип для защиты KV-квоты — сейчас в Cloudflare реально настроен
только `"30 2 * * *"`.

| # | Находка | Файл:строка (на `ea91e3c`) | Правка | Тест |
|---|---|---|---|---|
| 1 | Свип cron-worker (`sweepPending`) не имел пост-write recheck удаления, который уже есть в `lead.js` — конкурентный admin DELETE между CAS-коммитом и завершающей записью в KV резюрецировал PII под статусом `delivered` И слал Telegram-алерт с PII для уже удалённого лида | `cron-worker/src/index.js` KV-цикл `~483-497`, D1-straggler цикл `~561-579` | Портирован `wipeIfDeletedAfterWrite` (переиспользует существующую fail-closed `isDeleted`) в cron-worker; вызывается после завершающей записи в KV в ОБОИХ циклах, `notifyTelegram` пропускается при обнаружении `deleted` | `test/cron-backup-qa.mjs` — KV-цикл и D1-straggler цикл, оба сценария |
| 2 | Send-after-delete: admin DELETE побеждает ПОСЛЕ клейма лиза, но ДО самого POST в Albato — POST всё равно уходил, хотя D1 уже говорит `deleted` | `functions/api/lead.js:844` (intake) + оба свип-цикла; `cron-worker/src/index.js:561` (D1-straggler, цитата координатора) + KV-цикл | `wipeIfDeletedAfterWrite`/эквивалент вызывается СРАЗУ ПЕРЕД каждым `forwardToAlbato` (5 сайтов: 3 в lead.js, 2 в cron-worker); при `deleted` — POST пропускается, KV стирается, лиз «отпускается». Остаточное окно (POST уже в полёте в момент delete) — задокументированный лимит без Durable Object, см. §10(d) | `test/lead-qa.mjs` T25 (intake), T26 (sweep KV-цикл); `test/cron-backup-qa.mjs` (D1-straggler цикл — прямая цитата координатора) |
| 3 | KV-бюджет: один pending-лид без `ALBATO_WEBHOOK_URL` → 2 `KV.put` на первом свипе, затем 4/свип (оба цикла независимо клеймят и пишут ОДИН И ТОТ ЖЕ id) → ≈1150/сутки, выше общего на аккаунт free-tier лимита 1000/сутки, который делится с Assuta | `cron-worker/src/index.js`, `sweepPending` целиком | (a) без `ALBATO_WEBHOOK_URL` — пропуск ДО клейма/записи в KV; (b) новый `processedIds` (Set) — каждый `submission_id` обрабатывается МАКСИМУМ один раз за прогон, между обоими циклами; (c) экспоненциальный backoff (`attempt_count`/`next_attempt_at`, новые колонки D1, 5/10/20/40 мин, потолок 1 час) — постоянно падающий Albato стоит ~1 клейм за шаг backoff, а не за каждый 5-минутный свип | `test/cron-backup-qa.mjs` — 288 симулированных свипов (fake `Date`, реальный экспоненциальный backoff): без URL и с Albato→502 — оба ≤60 суммарных `KV.put` (на `ea91e3c` — фактически 1152 в обоих случаях, что подтверждает репро координатора «~1150/сутки» почти дословно) |
| 4 | `/health` ложный успех: (а) ранний `return` при провале `probeD1` записывал `sweep` как `ok=true`; (б) `probeD1` мог бросить исключение на сбое KV, роняя весь `sweepPending`; (в) `recordCronHealth` не гарантированно выполнялся при непредвиденном исключении; (г) отсутствие таблицы `cron_health` (миграция ещё не применена) давало `503`, маскируя полностью здоровую таблицу `leads` | `cron-worker/src/index.js` `sweepPending` (ранний return ~436), `probeD1`, `buildHealthResponse` | `sweepPending` переписан: флаг `ok`, апдейтится при провале КАЖДОЙ фазы (`probeD1`, KV-фаза, D1-фаза), `recordCronHealth` теперь в `finally`; `probeD1` обёрнут в try/catch (никогда не бросает); `buildHealthResponse` разделяет запрос к `leads` (провал → честный `503`) от запроса к `cron_health` (провал → `200` с `null`-полями `backup`/`sweep` — деградация, не авария) | `test/cron-backup-qa.mjs` — 4 отдельных теста: provider-failure→`ok=false`, KV-exception-не-бросает, missing-table→`200`+null, (try/finally доказывается тем же provider-failure тестом — `last_run_at` всё равно продвигается) |
| 5 | Deploy transition: `scheduled()` не распознавал уходящие литералы `"30 2 * * *"`/`"0 18 * * *"` — если Cloudflare-конфиг триггеров не успевает обновиться синхронно с деплоем кода, реальное текущее прод-расписание (`"30 2 * * *"`) попало бы в ветку «неизвестный cron» и дамп бы тихо пропускался | `cron-worker/src/index.js`, `scheduled()` | Оба уходящих литерала ТОЖЕ маршрутизируются в `hourlyRun(new Date(event.scheduledTime))` — час резолвится из времени срабатывания (`30 2`→час 2, `0 18`→час 18), так что поведение корректно независимо от того, сколько длится переходный период | `test/cron-backup-qa.mjs` — оба литерала, каждый проверяет свою часовую ветку (дамp+verify / дамп+reconcile) |

**Малые правки того же раунда:** `now` протянут через `dumpD1ToR2`/`verifyPreviousDump`/`purgeExpiredDumps`/`weeklyBackupHeartbeat` (дефолт `new Date()`) — раньше день для путей бэкапа вычислялся из СОБСТВЕННОГО `new Date()` каждой функции, а не из того же `now`, что и часовой гейтинг в `hourlyRun`; §10(c) выше поправлен (было `0 18 * * *`, теперь ссылка на §11); формулировка теста про `integrity_ok` после провала дампа поправлена на `null` (см. §12 выше).

**Приём тестирования:** для находок 1/2 использован перехват `kv.put` —
побочный эффект (сырой admin-delete `UPDATE` через оригинальный `prepare`)
вставляется РОВНО в момент интересующей записи (для находки 1 — записи
`status:'delivered'`, ДО реальной записи; для находки 2 — записи
`status:'forwarding'`, ПОСЛЕ реальной записи, поскольку гонка здесь
происходит уже ПОСЛЕ клейма). Для находки 3 — временная подмена
`global.Date`/`global.fetch` (с восстановлением в `finally`), чтобы
288 «часов» экспоненциального backoff прошли без реального ожидания.

## 14. Review 2026-09-23 — раунд 7 (P1 от Codex gpt-6-sol на живом коде `0aaf9e1`, задеплоен)

**Контекст:** прод работает на `0aaf9e1` (round-6 фикс уже задеплоен); живой
`*/5`-свип временно отключён владельцем.

**P1: KV-бюджет по-прежнему превышался, пока Albato падает.** Две причины,
обе — в паре записей на ОДИН И ТОТ ЖЕ ключ в пределах одного прогона:

| Причина | Файл:строка (на `0aaf9e1`) | Механизм |
|---|---|---|
| (1) cron KV-цикл проверял backoff из МЕТАДАННЫХ KV | `cron-worker/src/index.js:~531` | При быстром `502` запись «forwarding» (клейм) и следующая запись «pending»+`next_attempt_at` (release) попадали в ОДИН И ТОТ ЖЕ ключ KV в пределах одной секунды. Cloudflare KV допускает **1 запись/сек на ключ** ([лимиты](https://developers.cloudflare.com/kv/platform/limits/)) — вторая запись молча отклонялась, backoff в KV никогда не попадал, лид ретраился каждые 5 минут. D1 backoff ИМЕЛ, но KV-цикл его не читал. Репро Codex: 12 свипов → 12 принятых + 12 отклонённых записей; `attempt_count` в D1 оставался 1. 4 висящих лида ≈ 1152 записи/сутки |
| (2) Pages post-intake свип игнорировал backoff | `functions/api/lead.js:~647` (через `waitUntil`) | Один pending-лид получал 2 попытки Albato и 4 `KV.put` за ОДИН прогон |

**Правка (в порядке простоты):**

a) **Убран opportunistic Pages-свип из `waitUntil` целиком.** Ретраи — исключительно на cron-worker (раз в 5 минут); intake сохраняет ТОЛЬКО свою одну попытку доставки. `sweepPendingLeads` как функция осталась (используется тестами напрямую), но с этого раунда НЕ вызывается ни из одного продакшен-пути.
b) **cron KV-цикл читает `next_attempt_at`/`attempt_count` из D1** (источник истины) — новая `readBackoffState()` — ПЕРЕД любым клеймом/записью, пропускает кандидата, если backoff ещё не истёк. Убрана отдельная запись-клейм в KV в ОБОИХ циклах (KV и D1-straggler) — теперь РОВНО один `KV.put` за прогон на кандидата, отражающий ФИНАЛЬНЫЙ исход (доставлен/pending+backoff), а не промежуточное «forwarding». D1-straggler цикл уже читал backoff из D1 корректно (собственный `SELECT`) — там правился только повторный write, не источник backoff.
c) **KV-fake в тестах теперь принудительно соблюдает 1 запись/сек/ключ** (`makeRateLimitedKV()`, отдельная от обычной `makeKV()` — та осталась безлимитной, чтобы не сломать существующие тесты типа `probeD1`, которые легитимно пишут в один ключ много раз подряд без сдвига времени). Новый тест: `Albato` быстро возвращает `502`, 4 висящих лида, 288 симулированных свипов → на `0aaf9e1` замер дал `acceptedPuts=1148`, `rejectedPuts=1156`, `attempt_count` застрял на `1` у всех четырёх (тест правильно упал); после фикса — `≤240` суммарных принятых `KV.put` и `attempt_count > 1` у каждого лида.

**Найдено по ходу и исправлено:** первая версия теста для пункта (a) не
await'ила фоновую `waitUntil`-работу второго `post()` перед проверкой —
ассерт ложно проходил на `0aaf9e1` (гонка, а не настоящий red). Исправлено
добавлением `await trigger.wait()`; после исправления тест корректно
падает на `0aaf9e1` (ранний pending-лид становится `delivered` через
opportunistic-свип) и проходит после фикса.

**Тесты:** `test/cron-backup-qa.mjs` — новый P1-сценарий (red на `0aaf9e1`
→ green); `test/lead-qa.mjs` — T2 переписан под контракт «recovery теперь
только через cron-worker».

## Related

- `knowledge/web-dev/ADFIX-SITE-SYSTEM-PLAYBOOK.md` §1.6–1.8 — контракт «никогда не терять лид», админка, крон
- `docs/LEAD-WEBHOOK-CONTRACT.md` — публичный контракт `/api/lead` (payload, honeypot, ошибки) — не менялся по существу этим изменением

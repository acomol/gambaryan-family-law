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

1. **Cloudflare Pages** (`functions/api/lead.js`, `admin.js`, `lead-dead-letter.js`):
   - создать KV namespace, привязать как `LEADS_KV`;
   - создать D1 `gambarian-leads-db`, применить `db/leads-schema.sql`
     (`wrangler d1 execute gambarian-leads-db --remote --file=./db/leads-schema.sql`),
     привязать как `LEADS_DB`;
   - создать R2 bucket `gambarian-leads-archive`, привязать как `LEADS_ARCHIVE`;
   - секреты (Cloudflare Pages, не в Git): `ALBATO_WEBHOOK_URL` (уже используется — без изменений),
     опционально `TELEGRAM_TOKEN` + `TELEGRAM_CHAT_ID`, `ADMIN_PASSWORD` (+ опц. `ADMIN_USER`, `ADMIN_ALLOWED_EMAILS`).
   - **`/api/admin` без `ADMIN_PASSWORD`/CF Access остаётся закрытым (403)** — secure by default, ничего дополнительно включать не нужно, если админка не используется.
2. **cron-worker** (`gambarian-lead-cron`):
   - в `cron-worker/wrangler.toml` заменить `<GAMB_KV_ID>` и `<GAMB_D1_ID>` на реальные id (та же KV/D1, что и у Pages);
   - `wrangler secret put ALBATO_WEBHOOK_URL` / `TELEGRAM_TOKEN` / `TELEGRAM_CHAT_ID` / `SHEET_COUNT_URL` (свои копии, не общие с Pages);
   - `cd cron-worker && wrangler deploy`;
   - **обязательно проверить через Cloudflare API** (`/workers/scripts/gambarian-lead-cron/schedules`), что расписаний ровно 3 — вывод `wrangler` сам по себе не доказательство (см. комментарий в `wrangler.toml`).
   - `cron-worker/apps-script.gs` — **шаблон, не проверен против реальной Google-таблицы Гамбаряна**: подтвердить `SHEET_NAME`/`TIME_COLUMN_HEADER`/`ID_COLUMN_HEADER` против настоящего сценария Albato→Sheets, прежде чем заводить `SHEET_COUNT_URL` (иначе `reconcile` будет молча ругаться на несуществующие колонки).
3. **Гейт перед деплоем:** `node scripts/verify-lead-pipeline-remap.mjs` — должен быть `CLEAN`
   (ноль утечек Assuta/LuxeMed, оба id в `wrangler.toml` — валидные `<GAMB_*>` плейсхолдеры или уже заменены на реальные).
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

## Related

- `knowledge/web-dev/ADFIX-SITE-SYSTEM-PLAYBOOK.md` §1.6–1.8 — контракт «никогда не терять лид», админка, крон
- `docs/LEAD-WEBHOOK-CONTRACT.md` — публичный контракт `/api/lead` (payload, honeypot, ошибки) — не менялся по существу этим изменением

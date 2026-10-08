# Runbook: лиды Гамбарян (обработка сбоев)

**Дата:** 2026-09-24. Источник фактов — живые readback'и координатора,
`docs/STATE-2026-09-24.md` (Cloudflare API, D1, Gmail, wrangler).
Технические детали и история ревью — `docs/LEAD-PIPELINE.md`;
контракт payload — `docs/LEAD-WEBHOOK-CONTRACT.md`. Этот файл — только
однострочные действия оператора, без разбора «почему».

**Все команды `wrangler` ниже — с этим префиксом** (фиксированная версия через
`npx`, без токена окружения сессии; аккаунт передан явно):

```
env -u CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID=4799e9f76c607e036c430a148d06a80b npx --yes wrangler@4.120.0 …
```

Команды `d1`/`r2` с этим префиксом работают из **любой** рабочей директории — им не
нужен локальный `wrangler.toml`. Исключение — деплой самого воркера: конфиг лежит в
`cron-worker/wrangler.toml`, поэтому `wrangler deploy` запускается из `cron-worker/`.

## 1. Куда уходит заявка (в норме)

```
Форма сайта → POST /api/lead (lp.gambarian.com)
  → KV (pending) + R2 (архив .md) + D1 (queryable-копия)
  → Albato webhook (JSON: контактные поля + sheetSafe-версия для таблицы
     + email_subject/email_html для письма)
  → сценарий Albato «GAMB_ADV» (bundle 389465):
       Webhook → Google Sheets «Входящие» (create/update по submission_id)
              → Gmail «Send email» (HTML-письмо, 5 адресов офиса)
              → Answer
```

Если Cloudflare-часть (KV/D1/R2) недоступна на конкретном шаге, лид всё
равно уходит в Albato напрямую (graceful degradation) — заявка никогда не
теряется молча со стороны Cloudflare; cron-воркер каждые 5 минут досылает
то, что не дошло с первого раза.

Резервный крон (`gambarian-lead-cron`, живой):

| Когда | Что делает |
|---|---|
| `*/5 * * * *` | Досылает недоставленные заявки (backoff 5/10/20/40 мин, потолок 1 час) |
| `0 * * * *`, каждый час | Дамп D1 → R2 (часовой бэкап). В 02:00 UTC — доп. проверка вчерашнего дампа + чистка просроченных. В 18:00 UTC — доп. сверка (`reconcile`) + чистка удалённых лидов |

## 2. Проверка «жив ли пайплайн» — `/health`

```
GET https://gambarian-lead-cron.alex-799.workers.dev/health
```

Норма — `200` и:

```json
{"schema":1, "backup":{"last_ok_at":"...", "integrity_ok":true},
 "sweep":{"last_ok_at":"..."}, "stuck_leads":0, "albato_configured":true}
```

Что смотреть:

- `backup.last_ok_at` / `sweep.last_ok_at` — не старше ~1–2 часов (крон
  раз в час/5 минут; более старая метка = крон не бежит).
- `stuck_leads` — заявки старше 30 минут со статусом `pending`/`forwarding`
  в D1. `> 0` больше пары штук = что-то не доходит до Albato.
- `albato_configured: false` — секрет `ALBATO_WEBHOOK_URL` пропал/не задан.
- `503 {"error":"d1_unavailable"}` — D1 недоступен целиком (проверить статус
  Cloudflare, привязку `LEADS_DB`).

Мини-CRM (Apps Script) уже опрашивает этот адрес раз в час и шлёт письмо на
`alex@adfix.co.il` при сбое — `/health` вручную нужен, если письма от
мини-CRM не было, но подозрение есть, или чтобы проверить прямо сейчас.

## 3. Письма перестали приходить — куда смотреть по порядку

1. **Albato: сценарий `GAMB_ADV` не на паузе.** Приостановленный сценарий
   отвечает Cloudflare `200 OK`, но НЕ создаёт строку в Sheets и НЕ шлёт
   письмо — заявка при этом молча оседает только в D1/KV/R2. Смотреть
   статус сценария в самом Albato (bundle `389465`).
   **🔴 Никогда не ставить `GAMB_ADV` на паузу** — это уже случалось дважды
   23.09 и оба раза «терялись» письма, хотя лиды физически сохранялись.
2. **Gmail-подключение Albato не отвалилось.** Шаг «Send email» использует
   аккаунт `4774022@gmail.com` (From `4774020@gmail.com`) — если OAuth-токен
   Google истёк/отозван, шаг Gmail в сценарии начнёт падать; смотреть
   Automation Log конкретного запуска в Albato, не только общий статус
   сценария.
3. **`/health`** (раздел 2) — `albato_configured` и `stuck_leads` покажут,
   доходит ли заявка хотя бы до Cloudflare→Albato webhook.
4. **«Доставлено, но не видно»** — Cloudflare считает лид `delivered`
   (POST в Albato прошёл), но письма/строки в Sheets нет: значит webhook
   дошёл, а СЦЕНАРИЙ Albato упал на одном из внутренних шагов (Sheets или
   Gmail) уже ПОСЛЕ приёма. Проверить: (а) статус лида в D1/`/api/admin`
   (раздел 5) — `delivered` подтверждает, что Cloudflare сделал свою часть;
   (б) Automation Log того запуска в Albato — там видно, на каком именно
   шаге сценарий споткнулся.

## 4. Восстановить D1 (Time Travel)

Cloudflare D1 хранит историю изменений 7 дней — восстановление на любую
минуту в этом окне, без доплаты (Workers Free-план):

```
env -u CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID=4799e9f76c607e036c430a148d06a80b npx --yes wrangler@4.120.0 d1 time-travel restore gambarian-leads --timestamp=<unix-время>
```

`gambarian-leads` — имя production-базы (id `da00d8e3-477c-4863-a677-dcad24868893`).
Если нужно откатить preview-базу — то же самое с preview-именем/id
(`b57f842a-b498-4071-83a7-cee7d9aeb80b`), но обычные лиды пишутся в
production. Восстановление применяется без подтверждения — перепроверить
`<unix-время>` перед запуском (не проверено этой сессией: точный флаг
подтверждения/дополнительные опции — свериться (тем же префиксом) `d1
time-travel restore --help` перед первым реальным использованием).

## 5. Найти конкретный лид

**Через админку** (самый простой способ):

```
https://lp.gambarian.com/api/admin?q=<телефон или часть имени>
```

HTTP Basic Auth (логин/пароль — `ADMIN_USER`/`ADMIN_PASSWORD`, заданы в
Cloudflare Pages для Production; `ADMIN_PASSWORD` — секрет, `ADMIN_USER` —
обычная переменная (не секрет). Значения — `credentials`/менеджер паролей
ADFIX, не в этом репозитории). Без верных данных — `401`; если
`ADMIN_PASSWORD` вообще не задан на проде — `403`.
**Не проверено этой сессией:** реальный логин и удаление лида владельцем
через `/api/admin` живьём (`docs/STATE-2026-09-24.md` подтверждает только
сам `401` без креденшелов, не полный проход авторизации).

Можно фильтровать по статусу (`?status=pending`), формату экспорта
(`?format=csv` / `?format=md`) и лимиту строк (`?limit=...`, до 2000).

**Через D1 напрямую** (если админка недоступна):

```
env -u CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID=4799e9f76c607e036c430a148d06a80b npx --yes wrangler@4.120.0 d1 execute gambarian-leads --remote --command \
  "SELECT submission_id, received_at, status, name, phone FROM leads WHERE phone LIKE '%<цифры>%'"
```

**В R2 (архив `.md` на каждый лид):** бакет `gambarian-leads-archive`,
ключ `leads/<YYYY-MM-DD>/<submission_id>.md` — смотреть в Cloudflare
Dashboard → R2 → `gambarian-leads-archive`, или:

```
env -u CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID=4799e9f76c607e036c430a148d06a80b npx --yes wrangler@4.120.0 r2 object get gambarian-leads-archive/leads/<YYYY-MM-DD>/<submission_id>.md --remote --pipe
```

## 6. Удалить лид

Через `/api/admin` (форма «Удалить» на строке лида, тот же Basic Auth, что
и раздел 5). Это **soft-delete**: строка в D1 остаётся, но `status='deleted'`
и все персональные поля (имя/телефон/email/UTM/`payload_json`) зануляются;
запись в KV и объект в R2 удаляются (best-effort). Уже отправленную заявку
в Albato/Google Sheets/письме это **не отменяет** — если лид уже дошёл до
Sheets или в почтовый ящик, удалить его там нужно отдельно вручную.

## 7. Ограничения Workers Free-плана (для этого клиента)

Источники: developers.cloudflare.com/workers/platform/limits,
/workers/platform/pricing, /kv/platform/limits, /d1/platform/limits —
прочитано 2026-09-23.

| Лимит | Значение | Что это значит для Гамбаряна |
|---|---|---|
| Cron-триггеров на аккаунт | 5 | Заняты все 5: 3 у `assuta-lead-cron` + 2 у `gambarian-lead-cron`. **Добавить третий триггер Гамбаряну нельзя без удаления чужого** — если понадобится новый крон, сначала решить, что убрать |
| KV write/сутки на аккаунт | 1000 | Общий с Assuta, не только с этим клиентом — экспоненциальный backoff (раздел 1) существует именно для того, чтобы не выжечь бюджет одним зависшим лидом |
| CPU на вызов cron-воркера | 10 мс | Жёсткий потолок на одно срабатывание |
| D1-запросов на вызов | 50 | Жёсткий потолок на одно срабатывание |
| D1 Time Travel | 7 дней, всегда включено, бесплатно | См. раздел 4 |

## Related

- `docs/LEAD-PIPELINE.md` — «Состояние на 24.09» + полная история ревью и дефектов
- `docs/LEAD-WEBHOOK-CONTRACT.md` — контракт payload `/api/lead` и Albato-поля письма
- `shared/lead-email.js` — рендер офисного письма (subject/HTML)

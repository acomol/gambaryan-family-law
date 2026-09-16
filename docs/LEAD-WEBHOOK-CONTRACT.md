# Albato lead webhook contract

**Версия схемы:** `2.1.0`
**Дата требований:** `2026-09-16`
**Статус:** `LOCAL PASS / LIVE PENDING`; live-доставка не
включена до установки secret, контрольного catch, downstream-dedupe и
утверждённого privacy notice.

## История требований

| Версия | Дата | Изменение |
| --- | --- | --- |
| `2.1.0` | `2026-09-16` | Обязательный e-mail в форме, необязательный в API для старых клиентов; канал связи, подтверждение и исправление контактов |
| `2.0.0` | `2026-08-11` | Поля `email` и `topic` удалены по решению владельца; форма передаёт только имя и телефон |
| `1.1.0` | `2026-08-10` | Точные inline-ошибки, визуальное выделение поля, фокус на первом неверном поле и раздельные причины сбоев доставки |
| `1.0.0` | `2026-08-10` | Исходная схема lead payload и same-origin webhook |

## Правило версий

При любом изменении состава, названия, типа или смысла полей одновременно:

1. обновить `schema_version` по SemVer;
2. обновить `schema_date` датой утверждения требований (`YYYY-MM-DD`);
3. синхронизировать эту страницу и единую карту
   `site/lead-contract.js`;
4. повторить test catch в Albato и проверить конечную запись.

## Карта интеграции

| Участок | Источник истины | Ответственность |
| --- | --- | --- |
| Версия, дата, поля и лимиты | `site/lead-contract.js` | единая карта browser + Function |
| Поля формы и browser autofill | `site/index.html` | `name`, `tel`, обязательный `email`, radio `channel`; общая JS-валидация |
| Сбор first-touch attribution | `site/app.js` | читает список из общей карты |
| Endpoint браузера | `site/app.js` | читает `/api/lead` из общей карты |
| Payload и доставка | `functions/api/lead.js` | импортирует карту, валидирует и отправляет |
| Маршрутизация Function | `site/_routes.json` | только `/api/*` |
| URL Albato | Cloudflare encrypted secret | `ALBATO_WEBHOOK_URL`, никогда не в Git/JS |

Поток:

```text
lead-form → POST /api/lead → Cloudflare Pages Function → Albato Incoming Webhook
```

## Payload `2.1.0`

Albato получает плоский JSON. Все ключи присутствуют; для отсутствующей
attribution передаётся пустая строка.

| Поле | Тип | Источник |
| --- | --- | --- |
| `schema_version` | string | сервер, `2.1.0` |
| `schema_date` | date string | сервер, `2026-09-16` |
| `event_name` | string | сервер, `lead_form_submit` |
| `source_system` | string | сервер, `gambarian_family_law_landing` |
| `submission_id` | UUID v4 | браузер; сервер создаёт fallback |
| `submitted_at` | UTC RFC3339 | сервер |
| `form_id` | string | сервер, `family_law_contact` |
| `landing_path` | string | браузер, только path без query/hash |
| `landing_language` | string | сервер, `ru` |
| `name` | string | форма, 2–100 символов |
| `phone` | string | форма, 6–15 цифр, исходное форматирование сохранено |
| `email` | string | trim, максимум 120 символов; в API отсутствие/пустая строка допустимы для старых запросов |
| `channel` | string | `phone` (по умолчанию), `whatsapp`, `email` |
| `referrer_host` | string | внешний hostname без URL/path/query |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_id` | string | session first touch |
| `utm_term`, `utm_content` | string | session first touch |
| `gclid`, `gbraid`, `wbraid`, `fbclid` | string | session first touch |

Не отправляются IP, User-Agent, полный URL/referrer, cookie/GA client ID,
topic и свободный текст дела. Payload и webhook URL не логируются.

### Ошибки browser API

При `422` Function возвращает только стабильные коды и имена редактируемых
полей, без введённых пользователем значений:

```json
{
  "ok": false,
  "error": "invalid_lead",
  "field_errors": {
    "phone": "invalid_format"
  }
}
```

Допустимые коды: `required`, `too_short`, `too_long`, `invalid_format`.
Русские тексты берутся из единой карты `site/lead-contract.js`; технический
ответ upstream пользователю не показывается.

## UI и аналитика

- browser autofill: `autocomplete="name|tel|email"`. Новая форма требует все три поля;
  e-mail проверяется общим простым правилом: один @, непустые части адреса,
  точка внутри домена, без пробелов и пустых сегментов домена; лимит 120 после trim.
- первый submit показывает `.lead-form__confirm` без сетевого запроса; поля скрыты,
  телефон показан без пробелов/скобок/дефисов с сохранением начального +.
  «Исправить» и Esc возвращают поля и фокус имени. Только «Всё верно, отправить» отправляет лид.
- восемь явных опечаток домена предлагают исправление кнопкой; без автозамены.
- успех показывает введённые телефон и e-mail; «Указать другие контакты» сохраняет
  значения, «Отправить ещё одну заявку» очищает форму; обе начинают новую заявку.
- success показывается только после HTTP `2xx` от `/api/lead`;
- неверное поле получает `aria-invalid`, контрастную рамку и точную inline-
  подсказку; summary перечисляет поля и фокус переводится на первое из них;
- ошибки ввода, отсутствие сети, timeout, временная недоступность и прочие
  сбои доставки показываются как разные причины; поля всегда сохраняются;
- двойная отправка блокируется; ручный повтор неизменённых данных сохраняет
  тот же `submission_id`; сам endpoint не хранит состояние — dedup обязан быть
  настроен в Albato/destination;
- после принятия отправляется `generate_lead`, при ошибке — `form_error`;
  PII в `dataLayer` не передаётся.

## Секреты и приёмка

Production и Preview должны использовать разные Albato webhook URL. Локальный
секрет хранится в `.dev.vars` (файл игнорируется Git).

Минимальная приёмка перед production:

1. Albato `Catch a Webhook` получает полный синтетический payload `2.1.0`:
   присутствуют `name`, `phone`, `email`, `channel`; `topic` отсутствует.
2. Невалидная форма создаёт `0` запросов.
3. Каждое неверное поле визуально выделено, содержит точное сообщение и
   связано с ним через `aria-errormessage`; фокус стоит на первой ошибке.
4. После подтверждения валидная форма создаёт ровно один POST и одну конечную запись.
5. В Albato/destination настроен dedup/upsert по `submission_id`; повтор с тем
   же ID проверен полным automation run и не создаёт дубль.
6. Ошибка Albato оставляет поля, показывает конкретный transport-state и не
   показывает success.
7. В live HTML/JS/Network нет `ALBATO_WEBHOOK_URL`.

HTTP `202 accepted` подтверждает только приём webhook Albato. Создание записи
в CRM/Sheet подтверждается отдельно через Albato Automation Log и readback
конечного объекта.

## Production-блокеры

- рядом с формой должен быть утверждённый privacy notice/policy: обязательность
  полей, цель, controller/contact, получатели/процессоры, retention и права
  доступа/исправления; текст нельзя подменять техническим предположением;
- выбранный Albato destination должен иметь dedup/upsert по `submission_id`;
- до появления rate-limit/Turnstile публичный endpoint остаётся доступным для
  bot/spam; `Origin` защищает browser-CSRF, но не аутентифицирует клиента.

## Локальная проверка и границы

`node scripts/verify-lead-hook.mjs` вызывает реальную Pages Function с синтетическим
Request и подменённым fetch: проверяет доставку email/channel в JSON Albato,
совместимость без email (202), неверный адрес (422 + field_errors.email), отсутствие
вызова webhook при ошибках. Сохраняются существующие статусы 202/422, несмотря
на упоминание 200/400 в исходном ТЗ. Реальные заявки не отправляются.

Почтового транспорта в `functions/api/lead.js` нет: только fetch к
`ALBATO_WEBHOOK_URL`. Письмо заявителю требует отдельного подключения транспорта
и утверждённого адреса офиса для reply-to. В этой задаче не подключается.

## Related

- [Полное ТЗ](tasks/2026-09-16-final-dev5-email-field.md)
- [Указания владельца](CONTENT-OWNER-EDITS.md)
- [Карта источников](CONTENT-SOURCE-MAP.md)

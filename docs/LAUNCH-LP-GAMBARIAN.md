# Запуск lp.gambarian.com

**Версия:** `LAUNCH-LP v1.3.0 | 2026-09-23`

**Статус 2026-09-22:** шаги 2–5 сделаны, домен активен и отдаёт основную версию (отчёт запуска
19.09). Шаг 1 (секрет Albato) — за владельцем, форма пока отвечает 503. Шаг 7 теперь требует
ещё и трекинг: конверсия «Заявка» существует только как событие в коде, GTM/GA4 для `lp` не
созданы (доступа под ADFIX нет ни к одному GA4-ресурсу и ни к одному контейнеру GTM клиента),
план — `docs/TRACKING-REQUIREMENTS.md` v2.0.0, решения владельца — там же §1. Google Ads
подтверждён и проверен: `gambarian#2`, `994-218-4821`.

**SEO-слой 2026-09-23 (`PRODUCTION-BUILD v1.3.0`, в сборке, на Cloudflare ещё не опубликован):** canonical, author, hreflang ru/x-default, favicon 32×32 и apple-touch-icon 180×180, квадрат превью 1254×1254 первым `og:image` (1200×630 — вторым, twitter без изменений), JSON-LD + url/alternateName/logo/image/geo `32.06923, 34.78314` (Nominatim/Photon и ArcGIS, расхождение 14.8 м); `noindex` остаётся — `meta robots` действует на поисковые краулеры, не на AdsBot (developers.google.com/search/docs/crawling-indexing/robots-meta-tag).

Цель: лендинг final-dev5 открывается по адресу `https://lp.gambarian.com`, форма доставляет
заявки. Порядок важен: шаги 1–4 делаются **до** письма DNS-администратору.

## Исходное состояние (замер 2026-09-18)

| Что | Значение | Источник |
|---|---|---|
| DNS домена gambarian.com | `ns1/ns2.webprom.net` (не Cloudflare) | публичный DNS |
| Запись `lp` | нет (NXDOMAIN), общей записи `*` нет | публичный DNS |
| CAA | нет | публичный DNS |
| Проект Pages | `gambarian-landing`, основная ветка `main` | API Cloudflare |
| Основная версия (`gambarian-landing.pages.dev`) | старая сборка, 52 872 байта | readback |
| Переменные окружения проекта | **нет ни одной** — ни в production, ни в preview | API Cloudflare |
| Обработчик формы без `ALBATO_WEBHOOK_URL` | отвечает 503, заявка не уходит | `functions/api/lead.js` |

## Шаги

| № | Действие | Кто | Проверка |
|---|---|---|---|
| 1 | Задать `ALBATO_WEBHOOK_URL` (тип Secret) для **Production** и **Preview**: Cloudflare → Workers & Pages → gambarian-landing → Settings → Variables and Secrets | владелец (секрет не передаётся через чат) | тестовая заявка с именем «ТЕСТ» → ответ 202 и строка в Albato |
| 2 | Опубликовать основную версию: `python -B scripts/build-production.py`, затем `wrangler pages deploy build/production --project-name=gambarian-landing --branch=main` из корня репозитория (так уходит и `functions/`). Сборка = final-dev5 без демо-переключателя «Авто / Демо» | оператор, после «да» владельца | HTML `gambarian-landing.pages.dev` = `build/production/index.html`; `/api/lead` GET → 405 |
| 3 | `og:url` и картинка превью ссылки → `https://lp.gambarian.com/`; `noindex` оставить (рекламная страница не конкурирует с www.gambarian.com) — делает `build-production.py` | оператор | readback тегов |
| 4 | Добавить `lp.gambarian.com` в Custom domains проекта | оператор (API) или владелец в панели | статус домена «Pending / Verifying» |
| 5 | Письмо DNS-администратору (текст ниже) | владелец | ответ «запись создана» |
| 6 | Проверка после записи | оператор | `lp.gambarian.com CNAME gambarian-landing.pages.dev`; статус домена Active; HTTPS без ошибок; HTML = основная версия; тестовая заявка 202 |
| 7 | Сменить конечный URL в рекламе на `https://lp.gambarian.com/` **и включить рекламу** | владелец | переход из объявления открывает lp; **не раньше**, чем закрыт `docs/TRACKING-REQUIREMENTS.md` §11 (запуск — готово, когда) — иначе бюджет идёт без учёта заявок |

Почему такой порядок:
- **CNAME до шага 4** — Cloudflare отдаёт ошибку 522 на адресе, пока домен не добавлен в проект
  (developers.cloudflare.com/pages/configuration/custom-domains).
- **Реклама до шага 1** — каждая заявка получает 503.
- **Домен показывает основную версию проекта**, поэтому шаг 2 обязателен, иначе на lp откроется старая сборка.

## Письмо DNS-администратору

```text
Здравствуйте! Прошу добавить в зону gambarian.com одну запись:

Тип: CNAME
Имя (хост): lp
Значение: gambarian-landing.pages.dev
TTL: 3600 (или по умолчанию)

IP-адрес не нужен: сайт на Cloudflare Pages подключается только через CNAME.
Для lp не должно быть других записей (A, AAAA, TXT). Остальные записи домена не трогаем.
CAA-записей в зоне сейчас нет, так и оставьте. Если будете добавлять CAA, разрешите
letsencrypt.org, pki.goog и ssl.com — через них Cloudflare выпускает сертификат.
Сертификат HTTPS выпустится автоматически. Напишите, пожалуйста, когда запись появится.
```

## Аккаунт Google Ads (проверено 2026-09-22)

`gambarian#2`, ID `994-218-4821`, под ADFIX_MCC (`748-778-3835`). ILS, Asia/Jerusalem, оплата
`APPROVED`, проверка рекламодателя пройдена. Открытые пункты — `docs/TRACKING-REQUIREMENTS.md`
§1 (решения 2а — какой номер телефона, 2б — под каким адресом создавать GA4/GTM) и §0
(расхождение номера в ассете звонка: `058-780-3188` там, `054-549-0623` на сайте).

## Откат

- Адрес: удалить запись `lp` у DNS-администратора или убрать домен из Custom domains.
- Версия: Cloudflare → gambarian-landing → Deployments → предыдущий production → Rollback.
- Точки восстановления кода: [BACKUP-POINTS.md](BACKUP-POINTS.md).

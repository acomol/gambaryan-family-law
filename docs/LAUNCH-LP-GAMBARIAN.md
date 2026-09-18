# Запуск lp.gambarian.com

**Версия:** `LAUNCH-LP v1.0.0 | 2026-09-18`

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
| 2 | Опубликовать final-dev5 как основную версию: `wrangler pages deploy build/variants/final-dev5 --project-name=gambarian-landing --branch=main` | оператор, после «да» владельца | HTML `gambarian-landing.pages.dev` = сборка final-dev5 |
| 3 | `og:url` → `https://lp.gambarian.com/`; `noindex` оставить (рекламная страница не конкурирует с www.gambarian.com) | оператор | readback тегов |
| 4 | Добавить `lp.gambarian.com` в Custom domains проекта | оператор (API) или владелец в панели | статус домена «Pending / Verifying» |
| 5 | Письмо DNS-администратору (текст ниже) | владелец | ответ «запись создана» |
| 6 | Проверка после записи | оператор | `lp.gambarian.com CNAME gambarian-landing.pages.dev`; статус домена Active; HTTPS без ошибок; HTML = основная версия; тестовая заявка 202 |
| 7 | Сменить конечный URL в рекламе на `https://lp.gambarian.com/` | владелец | переход из объявления открывает lp |

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

## Откат

- Адрес: удалить запись `lp` у DNS-администратора или убрать домен из Custom domains.
- Версия: Cloudflare → gambarian-landing → Deployments → предыдущий production → Rollback.
- Точки восстановления кода: [BACKUP-POINTS.md](BACKUP-POINTS.md).

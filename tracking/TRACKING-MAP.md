# Карта трекинга lp.gambarian.com

**Назначение:** эта карта — то, с чем сравнивают live-конфигурацию GTM/GA4/Ads и код сайта
**после каждого изменения** (правка кода, публикация GTM, изменение в Ads-аккаунте). Она не
заменяет содержательный план `docs/TRACKING-REQUIREMENTS.md` (§3–§8) — она сверяет его с тем,
что реально работает.

Машиночитаемая версия той же карты (по одному объекту на dataLayer-событие, с полными GTM
триггерами/тегами) — [`tracking/tracking-map.json`](tracking-map.json). Нормализованный снимок
живого GTM для diff'а после изменений — [`tracking/gtm-baseline.json`](gtm-baseline.json).
Скрипт сверки — [`scripts/verify-tracking-map.mjs`](../scripts/verify-tracking-map.mjs).

## Базовая линия (baseline), от которой считаются расхождения

| Что | Значение | Источник |
|---|---|---|
| GTM live-версия | **v3** — «v3 — GA4 + Ads lp (этап 2)» | `GTM-MFLHW63Q` (account `6378261245` / container `264873266`) |
| GTM опубликован | **2026-09-23** | известный ID задачи |
| Сайт: production-ветка | `codex/final-dev5`, репозиторий `gambaryan-family-law` | — |
| Сайт: HTML деплоя (sha256, короткая форма) | **`ce53f4d00de81039`** — деплой Pages `c03e51c6` от 2026-09-24 (правки формы: Hero-кнопка ведёт к форме, панель успеха закрывается). До него — `b30026ff27b0d6bc` (23.09) | `curl https://lp.gambarian.com/` + sha256, 2026-09-24, после деплоя |
| Код: git-коммиты, на которых реально гонялся автотест | `4451006` (2026-09-23), `94687e0` (2026-09-24) и `60a1cea` (2026-09-24, выкатка `c03e51c6`) — **все PASS**. В `60a1cea` изменён `site/app.js` (панель успеха), набор событий и параметров тот же | `git log`, `verify-tracking-map.mjs --base` (билд) и `--live --skip-site` (прод, 10 хитов перехвачено) |
| GA4 | property `342151343`, поток `lp` = `G-P4MQ85ME2D` | известные ID задачи |
| Google Ads | `AW-18396553571`, аккаунт `9942184821` | известные ID задачи |
| Дата этой сверки | **2026-09-24** | — |

## Как читать таблицу

- **Триггер/Тег** — краткая ссылка на id из `tracking-map.json`/`gtm-baseline.json` (например
  `T24` = триггер id 24, `G38` = GA4-тег id 38, `A53` = Ads-тег id 53). Условие и полные
  параметры триггера/тега не повторяются в каждой строке — они те же для всех строк с одним
  событием (справочник ниже).
- **Ключевое GA4?** — событие помечено звёздочкой «ключевое событие» в GA4 Admin. `план` —
  так должно быть по `docs/TRACKING-REQUIREMENTS.md` §7; сама настройка в GA4 Admin в этом
  прогоне не проверялась ни разу — `[unverified]`.
- **Проверено** — какими источниками и когда:
  - **[1]** GTM API v2, read-only снимок live-версии, снят дважды (2026-09-24 и повторно после рестарта сессии, 2026-09-24) — оба раза байт-в-байт одинаковый контент (versionId 3, fingerprint `1790126564117`). Снимок в форме сырого ответа API (`tag[]`/`trigger[]`/`variable[]`/`builtInVariable[]`/`customTemplate[]`) — `I:/Temp/claude/tracking-map/verify-2026-09-24/gtm-live-raw.json`, и то же самое — `tracking/gtm-baseline.json`. Старый файл `gtm-live.json` в той же папке — снимок в предыдущем «evidence»-формате (поля `tags`/`customVariables`), которого `scripts/verify-tracking-map.mjs` больше не принимает (см. «Как сверять после изменений»); оставлен как есть для истории, для сверки не использовать. Покрывает КАЖДУЮ строку (триггер видит только имя события+параметр, а не конкретный элемент).
  - **[2]** `scripts/verify-tracking.mjs` — Playwright реально кликает каждый элемент карты §3 на 360×640/390×844/1440×900. Прогонялся дважды: HEAD `4451006` (2026-09-23, сборка `TRACKING-MAP-COMPARISON.md`) и HEAD `94687e0` (2026-09-24, этой сессией, на свежепересобранном `build/variants/final-dev5`) — **оба PASS**.
  - **[3]** Живой перехваченный прогон на `lp.gambarian.com` (2026-09-24): реальный UA, cookie `adfix_internal=1`, `/api/lead` замокан, все `*collect*/pagead/ccm/measurement/clarity` запросы перехвачены и **оборваны** (ни один реальный хит не ушёл). Кликнуто не всё — только то, что отмечено `[3]`; остальные строки подтверждены [1]+[2], но не индивидуальным живым кликом на проде.

## Триггеры и теги — справочник

| Триггер | Условие | Тег(и) | GA4 событие / параметры | Ads label |
|---|---|---|---|---|
| T24 `CE - generate_lead` | event equals `generate_lead` | G38 | `generate_lead` {form_id, submission_id, seconds_to_lead, design_version} | A53 `ccbrCO7u2YEdEOPClMRE` (основная) |
| T25 `CE - lead_corrected` | event equals `lead_corrected` | G39 | `lead_corrected` {submission_id, corrects_submission_id, design_version} | — |
| T26 `CE - form_error` | event equals `form_error` | G40 | `form_error` {form_id, error_type, http_status, design_version} | — |
| T27 `CE - form_start` | event equals `form_start` | G41 | `form_start` {form_id, design_version} | — |
| T28 `CE - form_confirm` | event equals `form_confirm` | G42 | `form_confirm` {form_id, design_version} | — |
| T29 `CE - form_correct` | event equals `form_correct` | G43 | `form_correct` {form_id, design_version} | — |
| T30 `CE - contact_click` | event equals `contact_click` | G44 | `contact_click` {method, placement, business_state, design_version} | — |
| T31 `CE - form_anchor_click` | event equals `form_anchor_click` | G45 | `form_anchor_click` {placement, service, attorney, design_version} | — |
| T32 `CE - nav_click` | event equals `nav_click` | G46 | `nav_click` {target, placement, design_version} | — |
| T33 `CE - service_select` | event equals `service_select` | G47 | `service_select` {service, via, design_version} | — |
| T34 `CE - section_view` | event equals `section_view` | G48 | `section_view` {section, design_version} | — |
| T35 `CE - scroll_depth` | event equals `scroll_depth` | G49 | `scroll_depth` {percent, design_version} | — |
| T36 `CE - time_on_page` | event equals `time_on_page` | G50 | `time_on_page` {seconds, design_version} | — |
| T52 `CE - contact_click (whatsapp)` | event equals `contact_click` **AND** `{{DLV - method}}` equals `whatsapp` | A54 | (доп. к G44) | A54 `HEcnCPHu2YEdEOPClMRE` (в плане: отдельная цель, не лид; факт в Ads-аккаунте: primary_for_goal=True — см. «Расхождения» M3) |
| T55 `CE - contact_click (phone)` | event equals `contact_click` **AND** `{{DLV - method}}` equals `phone` | A56 | (доп. к G44) | A56 `RTTHCL7o5YEdEOPClMRE` (тег в GTM помечен вспомогательной; факт в Ads-аккаунте: primary_for_goal=True — M3) |

Базовые теги на каждой странице (вне словаря событий) висят на двух РАЗНЫХ встроенных
триггерах GTM (у встроенных триггеров нет записи в `trigger[]` — они не возвращаются списком
кастомных, id фиксированные): **`2147479553` = `All Pages`** — Microsoft Clarity (тег 4, ждёт
`analytics_storage`) и Conversion Linker (тег 51); **`2147479573` = `Initialization — All Pages`
[likely]** — G-Tag конфиг (тег 37, `page_view` автоматически + `traffic_type`,
`allow_google_signals=false`, `allow_ad_personalization_signals=false`). Пометка `[likely]`:
имя встроенного триггера не подтверждено отдельным вызовом (built-in триггеры не читаются по
id через API) — вывод из типа тега (`googtag`/Google tag config по умолчанию цепляется на
`Initialization - All Pages`, а не на обычный `All Pages`) и из отдельного от `2147479553` id.

## Карта взаимодействий (одна строка = одно действие посетителя)

### 3.1 Шапка

| № | Действие | Событие {параметры} | Триггер→Тег | Ключевое GA4? | Проверено |
|---|---|---|---|---|---|
| 1 | Логотип «Гамбарян & Партнёры» | `nav_click` {target=top, placement=header} | T32→G46 | нет | [1][2] |
| 2 | «Услуги» | `nav_click` {target=services, placement=header} | T32→G46 | нет | [1][2] |
| 3 | «Подготовка» | `nav_click` {target=precedent, placement=header} | T32→G46 | нет | [1][2] |
| 4 | «Адвокаты» | `nav_click` {target=attorney, placement=header} | T32→G46 | нет | [1][2] |
| 5 | «Контакты» | `nav_click` {target=contact, placement=header} | T32→G46 | нет | [1][2] |

### 3.2 Мобильное меню

| № | Действие | Событие {параметры} | Триггер→Тег | Ключевое GA4? | Проверено |
|---|---|---|---|---|---|
| 6 | «Услуги»/«Подготовка»/«Адвокаты»/«Контакты» | `nav_click` {target, placement=menu} | T32→G46 | нет | [1][2] |
| 7 | «Позвонить» (по business_state) | `contact_click` {method=phone, placement=menu, business_state} | T30→G44 (+T55→A56 при method=phone) | нет | [1][2] |

### 3.3 Первый экран `#top`

| № | Действие | Событие {параметры} | Триггер→Тег | Ключевое GA4? | Проверено |
|---|---|---|---|---|---|
| 8 | Адрес → Google Maps | `contact_click` {method=google_maps, placement=hero} | T30→G44 | нет | [1][2] |
| 9 | «Записаться на консультацию» | `form_anchor_click` {placement=hero} | T31→G45 | нет | [1][2] |
| 10 | «Позвонить» (open) | `contact_click` {method=phone, placement=hero, business_state=open} | T30→G44 (+T55→A56) | нет | [1][2] |
| 11 | Та же кнопка (closed) → WhatsApp | `contact_click` {method=whatsapp, placement=hero, business_state=closed} | T30→G44 (+T52→A54) | нет | [1][2] |
| 12 | Блок наполовину в кадре | `section_view` {section=hero} | T34→G48 | нет | [1][2][3] |

### 3.4 Кубики фактов

| № | Действие | Событие {параметры} | Триггер→Тег | Ключевое GA4? | Проверено |
|---|---|---|---|---|---|
| 13 | Блок наполовину в кадре | `section_view` {section=facts} | T34→G48 | нет | [1][2][3] |

### 3.5 Услуги `#services`

| № | Действие | Событие {параметры} | Триггер→Тег | Ключевое GA4? | Проверено |
|---|---|---|---|---|---|
| 14 | 8 вкладок тем | `service_select` {service, via=tab} | T33→G47 | нет | [1][2][3] (клик «Алименты» на проде) |
| 15 | Свайп по карточке (телефон) | `service_select` {service, via=swipe} | T33→G47 | нет | [1][2] |
| 16 | 8 точек под карточкой | `service_select` {service, via=dot} | T33→G47 | нет | [1][2] |
| 17 | Стрелки назад/вперёд | `service_select` {service, via=arrow} | T33→G47 | нет | [1][2] |
| 18 | Прямая ссылка `#svc-<тема>` (реклама/sitelinks) | `service_select` {service, via=**anchor**} | T33→G47 | нет | [1][2][3] (`#svc-divorce`, `#svc-alimony` на проде); описано в `docs/TRACKING-REQUIREMENTS.md` §3.5/§4 с v2.2.0 — см. M1 (ложная находка, исправлено) |
| 19 | «Записаться» в карточке услуги | `form_anchor_click` {placement=services, service} | T31→G45 | нет | [1][2] |
| 20 | Блок наполовину в кадре | `section_view` {section=services} | T34→G48 | нет | [1][2][3] |

### 3.6 Подготовка `#precedent`

| № | Действие | Событие {параметры} | Триггер→Тег | Ключевое GA4? | Проверено |
|---|---|---|---|---|---|
| 21 | «Записаться на консультацию» | `form_anchor_click` {placement=precedent} | T31→G45 | нет | [1][2] |
| 22 | «Написать в WhatsApp» | `contact_click` {method=whatsapp, placement=precedent} | T30→G44 (+T52→A54) | нет | [1][2] |
| 23 | Блок наполовину в кадре | `section_view` {section=precedent} | T34→G48 | нет | [1][2][3] |

### 3.7 Адвокаты `#attorney`

| № | Действие | Событие {параметры} | Триггер→Тег | Ключевое GA4? | Проверено |
|---|---|---|---|---|---|
| 24 | «Записаться» в карточке Александра | `form_anchor_click` {placement=attorneys, attorney=alexander} | T31→G45 | нет | [1][2] |
| 25 | «Записаться» в карточке Юлии | `form_anchor_click` {placement=attorneys, attorney=yulia} | T31→G45 | нет | [1][2] |
| 26 | Блок наполовину в кадре | `section_view` {section=attorneys} | T34→G48 | нет | [1][2][3] |

### 3.8 Консультация `#contact` — контакты

| № | Действие | Событие {параметры} | Триггер→Тег | Ключевое GA4? | Проверено |
|---|---|---|---|---|---|
| 27 | «Телефон» (open) | `contact_click` {method=phone, placement=contacts, business_state=open} | T30→G44 (+T55→A56) | нет | [1][2][3] |
| 28 | Та же строка (closed) → WhatsApp | `contact_click` {method=whatsapp, placement=contacts, business_state=closed} | T30→G44 (+T52→A54) | нет | [1][2] |
| 29 | «WhatsApp» (open) | `contact_click` {method=whatsapp, placement=contacts, business_state=open} | T30→G44 (+T52→A54) | нет | [1][2][3] |
| 30 | «Заявка · Записаться» (нерабочее время) | `form_anchor_click` {placement=contacts} | T31→G45 | нет | [1][2] |
| 31 | Адрес → Google Maps | `contact_click` {method=google_maps, placement=contacts} | T30→G44 | нет | [1][2] |
| 32 | Блок наполовину в кадре | `section_view` {section=contact} | T34→G48 | нет | [1][2][3] |

### 3.9 Консультация `#contact` — форма

| № | Действие | Событие {параметры} | Триггер→Тег | Ключевое GA4? | Проверено |
|---|---|---|---|---|---|
| 33 | Первый ввод в любое поле | `form_start` {form_id} | T27→G41 | нет | [1][2][3] |
| 34 | «Записаться» с ошибками в полях | `form_error` {form_id, error_type=validation, http_status=0} | T26→G40 | нет | [1][2] |
| 35 | «Записаться» без ошибок | `form_confirm` {form_id} | T28→G42 | нет | [1][2][3] |
| 36 | «Исправить» на шаге проверки | `form_correct` {form_id} | T29→G43 | нет | [1][2] |
| 37 | «Всё верно, отправить» → 202 (новая заявка) | `generate_lead` {form_id, submission_id, seconds_to_lead} | T24→G38+A53 | **план: да** [unverified в GA4 Admin] | [1][2][3] |
| 38 | «Всё верно, отправить» → ошибка (503/сеть/500/422) | `form_error` {form_id, error_type∈{unavailable,network,server,validation}, http_status} | T26→G40 | нет | [1][2] |
| 39 | В ошибке: «позвонить» | `contact_click` {method=phone, placement=form_error} | T30→G44 (+T55→A56) | нет | [1][2] |
| 40 | В ошибке: «WhatsApp» | `contact_click` {method=whatsapp, placement=form_error} | T30→G44 (+T52→A54) | нет | [1][2] |
| 41 | «Указать другие контакты» → отправлено | `lead_corrected` {submission_id, corrects_submission_id} (**не** generate_lead) | T25→G39 | нет | [1][2] |
| 42 | «×» или «Продолжить на сайте» на панели успеха → панель сворачивается в строку «Заявка отправлена — мы свяжемся с вами» | — (событий нет, намеренно) | — | нет | код `site/app.js:1410-1411` |
| 42a | «Изменить контакты» в свёрнутой строке → отправлено | `lead_corrected` {submission_id, corrects_submission_id} — тот же путь, что строка 41 | T25→G39 | нет | код `site/app.js:1409` |

Кнопки «Отправить ещё одну заявку» больше нет (деплой `c03e51c6`, 2026-09-24): вторая
заявка — только с новой загрузки страницы (панель успеха между загрузками не сохраняется: в
storage лежат лишь outbox и атрибуция, `site/app.js:642-694, 851-885`), и тогда это обычная строка 37.

### 3.10 Подвал

| № | Действие | Событие {параметры} | Триггер→Тег | Ключевое GA4? | Проверено |
|---|---|---|---|---|---|
| 43 | 8 ссылок услуг | `service_select` {service, via=footer} | T33→G47 | нет | [1][2] |
| 44 | «Подготовьтесь к разговору о разводе» | `nav_click` {target=precedent, placement=footer} | T32→G46 | нет | [1][2] |
| 45 | Адрес → Google Maps | `contact_click` {method=google_maps, placement=footer} | T30→G44 | нет | [1][2] |
| 46 | Блок наполовину в кадре | `section_view` {section=footer} | T34→G48 | нет | [1][2][3] |

### 3.11 Нижняя панель (только телефон)

| № | Действие | Событие {параметры} | Триггер→Тег | Ключевое GA4? | Проверено |
|---|---|---|---|---|---|
| 47 | «Записаться» | `contact_click` {method=form_anchor, placement=action_bar} | T30→G44 | нет | [1][2] |
| 48 | «Позвонить» | `contact_click` {method=phone, placement=action_bar} | T30→G44 (+T55→A56) | нет | [1][2] |
| 49 | «WhatsApp» | `contact_click` {method=whatsapp, placement=action_bar} | T30→G44 (+T52→A54) | нет | [1][2] |

### 3.12 Вся страница

| № | Действие | Событие {параметры} | Триггер→Тег | Ключевое GA4? | Проверено |
|---|---|---|---|---|---|
| 0 | Загрузка страницы | `page_view` (авто) | (базовый G-tag конфиг, тег 37, `Initialization — All Pages`) | нет | [1][3] — GTM-конфиг + живой перехваченный прогон; `page_view` автоматический (GA4 Google tag), `verify-tracking.mjs` [2] его не кликает и не проверяет отдельной строкой |
| 50 | Прокрутка 25/50/75/90% | `scroll_depth` {percent} | T35→G49 | нет | [1][2][3] |
| 51 | 30/60/120/180 с видимого времени | `time_on_page` {seconds} | T36→G50 | нет | [1][2] (управляемые часы сильнее живого клика для этого события) |

**Вне карты GTM** (не dataLayer-события, упомянуты для полноты): `engagement_time_msec` — GA4
автоматически; `utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid`, `referrer_host` — уходят в заявку
через `site/lead-contract.js` напрямую в CRM, минуя GTM.

## Расхождения на 24.09

| # | Класс | Слой | Что | Действие |
|---|---|---|---|---|
| M1 | ⚪ RESOLVED (была ложной находкой) | код vs docs | Первоначально записано как «`service_select {via=anchor}` не описано в `docs/TRACKING-REQUIREMENTS.md` §3.5/§4». Перепроверено 2026-09-24: **ложно** — `via=anchor` уже есть в §3.5 (строка про `#svc-<тема>`) и в перечне `via` §4, добавлено там ещё в v2.2.0 (2026-09-23, до того как эта находка была впервые записана). Реального разрыва между кодом/GTM и документом нет | нет действия по докам §3.5/§4; §0 (v2.3.0) дополнительно называет `via=anchor` в сводке по тегу `GA4 - service_select` |
| M2 | ⚪ HISTORICAL | docs vs GTM | `docs/TRACKING-REQUIREMENTS.md` §0 на момент своей последней правки описывал GTM как «версия 2, только Clarity» — факт: версия 3, 19 тегов, GA4+Ads настроены (опубликовано в тот же день) | обновить §0 при следующей правке |
| M3 | 🟠 CURRENT (pre-launch blocker, не текущий разрыв) | Google Ads аккаунт (не код/GTM) | GAQL 2026-09-24 (`conversion_action`, все ENABLED): **5** конверсий, у ВСЕХ `primary_for_goal=True` **и** `include_in_conversions_metric=True` — «Заявка — форма lp.gambarian.com» `7788197742`, «Обращение WhatsApp — lp.gambarian.com» `7788197745`, «Клик по телефону — lp.gambarian.com» `7788393534`, «Calls from ads» `7725063533`, «Submit lead form» `7788414889`. По плану §5 основными должны быть «Заявка» и «Звонок из объявления» (`Calls from ads`, ≥ 60 с); WhatsApp и клик по телефону — вспомогательные (решение 5, §3) | понизить до secondary 3: WhatsApp `7788197745`, клик по телефону `7788393534`, «Submit lead form» `7788414889` (M4); «Заявка» и «Calls from ads» остаются основными (решения 5–6 приняты архитектором 24.09). НЕ поломка трекинга: ставки `MANUAL_CPC` — Smart Bidding ни на что не оптимизируется, лишние основные конверсии сейчас завышают только столбец «Конверсии». **Обновление 2026-09-24 (GAQL + `change_event`):** кампания переименована в `VER1_gads_search_leads_il_family_ru_22_09_26` и включена владельцем в 13:45 по времени аккаунта; все 5 конверсий по-прежнему основные. Правка через API подготовлена (`ads_primary.py apply`, исправлен 24.09: понижает 3, не 4), ждёт прямого «да» владельца — до перехода на автоматические ставки обязательна |
| M4 | 🟡 CURRENT | Google Ads аккаунт (не код/GTM) | «Submit lead form» (`7788414889`, label `Wrn7CKmP54EdEOPClMRE` — подтверждён `conversion_action.tag_snippets`, GAQL 2026-09-24) НЕ входит ни в один из 19 тегов `tracking/gtm-baseline.json` — с `lp.gambarian.com` не отправляется никогда. Это **пустая основная конверсия**, не дубль «Заявки» (задвоения на `lp` нет, т.к. событие не уходит вовсе) | понизить до secondary вместе с M3; не удалять — удаление необратимо, а шлёт ли её www, не проверено. Шлёт ли её `www.gambarian.com` (отдельный сайт/конфиг, вне зоны этой карты) — **не проверено** |
| M5 | ⚪ HISTORICAL | docs vs GA4 property | Доке: валюта USD «ждёт», связь с Ads «нет». Факт: валюта ILS, связь с Ads создана 2026-09-22 (`ads_personalization_enabled=false`, верно под запрет ремаркетинга) | обновить §0/§1а |
| M6 | ⚫ UNVERIFIED (методология) | синтетический тест | В live-перехвате не пойман отдельный GA4-сетевой хит именно для `contact_click` (похоже на батчинг gtag.js) | нет действия — live GA4-данные (14 дней) показывают 9 событий `contact_click`, тег доходит |
| M7 | ⚫ UNVERIFIED | живые данные GA4 | `nav_click` и `lead_corrected` — 0 событий за 14 дней в GA4 | подтвердить при живом клике на запуске (план §11); низкочастотные по сути события, не обязательно дефект |
| M8 | ⚪ OUT-OF-SCOPE | GA4 property | Custom dimension `page_title` зарегистрирован, не входит в 12 параметров плана §7 | нет действия, не мешает |

Полные формулировки и `sources` — в `tracking-map.json` → `mismatches[]`.

## Не проверено в этом прогоне

- GA4 Admin: реально ли `generate_lead` помечен как «ключевое событие» звёздочкой — ни один из
  трёх источников это не проверял ([unverified], см. строку 37 выше).
- Живой клик по каждой из строк 1–9, 15–17, 19, 21, 24–25, 28, 30–31, 34, 36, 38–45, 47–49, 51 —
  подтверждены структурой GTM [1] и автотестом на билде [2], но не индивидуальным кликом на
  проде [3] в этом прогоне (правила задачи разрешают перехваченный клик, но не требуют
  исчерпывающего перебора всех ~50 строк вживую при уже сильном структурном доказательстве).

## Как сверять после изменений

Шесть независимых режимов одного скрипта, `scripts/verify-tracking-map.mjs` — какие запускать,
зависит от того, что изменилось (таблица «Когда что запускать» — сразу после команд).

### 0. `--self-test` — сам верификатор не сломан

Ничего не читает с диска/сети кроме `tracking/gtm-baseline.json`: клонирует его в памяти,
накатывает 7 встроенных мутаций (paused, blockingTriggerId, consentSettings, значение
GA4-параметра, значение строки lookup-таблицы, неверный триггер, неверное условие триггера) и
проверяет, что каждая даёт FAIL с конкретным diff, а немутированный клон — PASS.

```bash
node scripts/verify-tracking-map.mjs --self-test
```

PASS = все 8 случаев (1 baseline + 7 мутаций) ведут себя как ожидалось, exit 0. Запускать перед
тем, как доверять результату любого другого режима ниже — если сам движок сравнения сломан,
«зелёный» результат (a)/(b)/(c) ничего не доказывает.

### 1. Код: что реально пушится (проверка `a`)

```bash
cd I:/GIT/gamb-docs   # или актуальный чекаут gambaryan-family-law/gamb-release
python -B scripts/build-preview.py site/gambarian-standalone.html --standalone
python -B scripts/build-font-variants.py
python -B scripts/build-hero-variants.py       # пересобирает build/variants/final-dev5
python -m http.server 8098 --bind 127.0.0.1 &  # или другой свободный порт — передать через --base
node scripts/verify-tracking-map.mjs --base http://127.0.0.1:8098/build/variants/final-dev5/
```

PASS = каждое взаимодействие карты §3 по-прежнему даёт своё событие с верными параметрами,
и словарь скрипта `verify-tracking.mjs` не разошёлся с `tracking/tracking-map.json`.

### 2. GTM: живая конфигурация не уехала от baseline (проверка `b`)

Снять свежий снимок теми же вызовами, что дали текущий `tracking/gtm-baseline.json`:

```
mcp__gtm-stape__gtm_version {action: "live", accountId: "6378261245", containerId: "264873266", resourceType: "tag"}
mcp__gtm-stape__gtm_version {action: "live", accountId: "6378261245", containerId: "264873266", resourceType: "trigger"}
mcp__gtm-stape__gtm_version {action: "live", accountId: "6378261245", containerId: "264873266", resourceType: "variable"}
mcp__gtm-stape__gtm_version {action: "live", accountId: "6378261245", containerId: "264873266", resourceType: "builtInVariable"}
mcp__gtm-stape__gtm_version {action: "live", accountId: "6378261245", containerId: "264873266", resourceType: "customTemplate"}
```

Скрипт принимает **сырой ответ GTM API v2 как есть** — containerVersionId/name/fingerprint на
верхнем уровне плюс поля `tag[]`/`trigger[]`/`variable[]`/`builtInVariable[]`/`customTemplate[]`
ровно в форме, которую вернули вызовы выше (никакой ручной сборки/переименования полей не
нужно — merge четырёх страниц в один JSON-объект с этими пятью массивами достаточен).
`tracking/gtm-baseline.json` — сам в этой форме, его можно использовать как образец структуры.
Сохранить свежий снимок в файл и сравнить:

```bash
node scripts/verify-tracking-map.mjs --skip-site --gtm <путь к свежему снимку raw-JSON>
```

PASS = 0 расхождений в тегах/триггерах/переменных/built-in переменных/шаблонах. Сравнение
ПОЛНОЕ — paused, blockingTriggerId, consentSettings (в формате API), значения GA4-параметров
(не только имена) и ключи/значения переменных (имя cookie, ключ DLV, строки lookup-таблицы)
тоже участвуют. Из сравнения исключены только волатильные поля: fingerprint, path,
workspaceId, tagManagerUrl, parentFolderId, accountId, containerId. Любой `+`/`-`/`~` в выводе —
дрейф конфигурации от того, что задокументировано здесь.

Быстрый чек публикации (без полного диффа тегов/триггеров/переменных — секунды, не минуты):

```bash
node scripts/verify-tracking-map.mjs --gtm <путь к свежему снимку raw-JSON> --gtm-version-only
```

PASS = containerVersionId и fingerprint снимка совпадают с baseline (контейнер не публиковался
заново). FAIL печатает `GTM опубликован заново: было vN/fp, стало vM/fp` — сигнал «нужен полный
`--gtm` дифф», а не «всё сломано» сам по себе (номер версии мог смениться без реального
изменения тегов/триггеров/переменных).

### 3. (опционально) Живой перехваченный прогон на проде

```bash
node scripts/verify-tracking-map.mjs --skip-site --live
```

Загружает `https://lp.gambarian.com` с полным перехватом сети (ни один хит в GA4/Ads/Clarity не
уходит по-настоящему — все `*collect*/pagead/ccm/measurement/clarity` запросы обрываются),
проверяет, что перехваченные (не отправленные) запросы несут правильный `measurementId`.
Не заменяет проверки 1–2, только дополняет их «прод грузит тот же контейнер».

### 4. Google Ads — конверсии

```
mcp__google-ads__execute_gaql_query {customer_id: "9942184821", query:
  "SELECT conversion_action.id, conversion_action.name, conversion_action.status,
   conversion_action.category, conversion_action.primary_for_goal,
   conversion_action.include_in_conversions_metric FROM conversion_action"}
```

Сверить label'ы и `primary_for_goal`/`include_in_conversions_metric` с таблицей «Триггеры и
теги — справочник» выше и с M3/M4. Перед включением рекламы — обязательно (M3: сейчас 5
конверсий одновременно основные, план §5 требует одну).

### 5. GA4 — конфигурация ресурса

```
mcp__ga4-mcp-server__get_property_details {property_id: "342151343"}
mcp__ga4-mcp-server__get_custom_dimensions_and_metrics {property_id: "342151343"}
mcp__ga4-mcp-server__list_google_ads_links {property_id: "342151343"}
```

### Когда что запускать

| Событие | Команды | Что доказывает |
|---|---|---|
| Правка кода сайта (`site/app.js`, `site-addons/action-bar/`, лендинг) | `0` → `1` | новый билд по-прежнему пушит каждое событие карты §3 с верными параметрами |
| Публикация новой версии GTM | `0` → сначала `2` (`--gtm-version-only`, секунды) → если версия сменилась, полный `2` (`--gtm`) | контейнер либо не менялся содержательно, либо весь diff перед глазами до того, как объявлять «готово» |
| Перед включением рекламы (снятие паузы кампании / смена `MANUAL_CPC`) | `4` (Ads GAQL) — обязательно; затем `2` и, если есть доступ к телефону, `3` | primary-конверсии в Ads соответствуют плану §5 (сейчас НЕ соответствуют — M3, блокер), и GTM/сайт не разошлись с картой перед первым реальным показом |
| Новый custom dimension/событие в GA4 | `5` | ресурс GA4 не разошёлся с параметрами карты §4/§7 |

### 6. Итог

Расхождение любого пункта 0–5 с этой картой → новая строка в разделе «Расхождения» выше (с
классом CURRENT/HISTORICAL/UNVERIFIED/OUT-OF-SCOPE), а не молчаливая правка карты без записи —
иначе теряется история дрейфа.

## Related

- `docs/TRACKING-REQUIREMENTS.md` — содержательный план (§3–§8); эта карта его не заменяет, только сверяет с живыми системами.
- `scripts/verify-tracking.mjs` — Playwright-тест, который эта карта переиспользует для проверки `(a)`.
- `scripts/verify-tracking-map.mjs` — скрипт сверки `(a)`/`(b)`/`(c)`, описанный выше.

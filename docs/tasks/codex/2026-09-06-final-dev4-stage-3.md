# Этап 3: Адрес, лицензия, карта, подвал

**Версия:** `FINAL-DEV4-STAGE-3 v1.0.0`

**Дата:** `2026-09-06`

**Ветка:** `codex/final-dev4-s3-contacts` → draft PR в `main`

**Исполнитель:** Codex CLI; уровень рассуждений: **high (контракты, скрипты, поведение)** — Этап меняет контракт копирайта (allowlist атрибутов и JSON-LD, синхронизация маркеров в 8 источниках), структуру трёх ссылок с риском «ссылка в ссылке» и падения verify-client-copy на 8.9, плюс добавляет новый Playwright-гейт; механических правок мало, а ошибки в контракте ломают CI всех Preview.

**Приёмка:** Claude (облачная сессия) по `docs/CODEX-WORKING-MODEL.md`; слияние — владелец.

## Цель

Во всех трёх местах с адресом (плашка под кубиками, ряд в контактах, колонка «Офис» в подвале) вся строка с иконкой становится ссылкой на Google Maps в новом окне с новым написанием «Прием — Тель-Авив / онлайн / Карлибах, 10», адрес визуально оформлен как ссылка; то же написание в aria-label и JSON-LD streetAddress; точка снята в JSON-LD jobTitle. Из подвала на всех ширинах убрана колонка «Связь» (телефон и WhatsApp остаются только рядом с формой), а строка «© 2026 Адвокат Александр Гамбарян. Лицензия № 30178» вынесена отдельной строкой внутри того же блока 8.9 без изменения текста и оформления. Результат собран в build/variants/final-dev4, проходит все статические гейты и новый DOM-гейт ссылок адреса.

## Основание

- Решения владельца (реестр в `../2026-09-06-final-dev4-spec.md`): №8, №13, №14, №26, №27
- Пункты разбора (`../2026-09-06-final-dev4-items.md`): `D:D-02`, `D:D-03`, `D:D-07`, `D:D-08`, `F:M-05`, `C:G-07`, `A:HF-07`
- Открытые вопросы, выполняемые «по умолчанию» (переделать при другом ответе):
  - №26 — из подвала убирается только колонка «Связь»; колонка «Офис» с адресом остаётся (значение по умолчанию из spec «Открытые вопросы (9)»)

## Не в скоупе этапа

- Тексты плашки (строки 11, 13), блока «Ведёт» (41, 42), карточек адвокатов (53–57) и точка в видимых строках лицензии — этап 2; здесь только ссылка/оформление, JSON-LD и подвал
- Колонка «Офис» из подвала не удаляется (открытый №26 без такого умолчания; по умолчанию остаётся)
- Контраст .site-footer__legal (alpha .4 → .55, OPEN A5) — отдельное решение, не в реестре; оформление строки 8.9 оставить как у соседнего текста
- Поведение в нерабочее время (tel: → WhatsApp) — этап 4; ряды «Телефон»/«WhatsApp» рядом с формой не трогать
- Встроенная карта (iframe), Waze, query_place_id, координаты — не добавлять (CONTACT-LINKS-SPEC §1–2)
- data-action на рядах Телефон/WhatsApp в контактах — не запрошено; только data-action="map_click" на ссылках карты
- Кубики, секция услуг, шрифты, фото, отступы (этапы 5–7); final-dev3 и production не пересобираются и не публикуются

## Шаги

### 1. Проверить предусловия этапов 1–2 и зафиксировать точку отсчёта.

Файлы: `scripts/client-preview-map.json`, `scripts/client_copy_contract.py`, `site/index.html`, `scripts/verify-live-previews.py`

В базовой ветке должны быть: alias final-dev4 в карте Preview; CONTRACT_VERSION = "1.3.0" (client_copy_contract.py:11); плашка уже с текстом этапа 2 «Прием&nbsp;— Тель-Авив / онлайн» и «Карлибах,&nbsp;10» (если этап 2 этого не сделал — сделать здесь дословно по строке 13 колонки «Правка», не унифицируя ё/е); li[data-copy-id="5.17"] удалён (строка 57). Запомнить текущее число защищённых тире в site/index.html и ожидание для final-dev4 в verify-live-previews.py (per-alias словарь или расчёт из сборки) — этап 3 счётчик не меняет.

Проверка: grep -c '"branch": "final-dev4"' scripts/client-preview-map.json → 1; grep -n 'CONTRACT_VERSION' scripts/client_copy_contract.py → 1.3.0; grep -c 'Карлибах,&nbsp;10' site/index.html ≥ 1; grep -c 'data-copy-id="5.17"' site/index.html → 0; grep -o '&nbsp;—' site/index.html | wc -l (записать в отчёт)

### 2. Сделать третий пункт плашки .facts-bar целиком ссылкой на Google Maps.

Файлы: `site/index.html`

Строки ~141–144: заменить <div class="facts-bar__item"> третьего пункта на <a class="facts-bar__item map-link" href="https://www.google.com/maps/search/?api=1&amp;query=%D7%A7%D7%A8%D7%9C%D7%99%D7%91%D7%9A+10%2C+%D7%AA%D7%9C+%D7%90%D7%91%D7%99%D7%91" target="_blank" rel="noopener" data-action="map_click" aria-label="Открыть адрес в Google Maps: Тель-Авив, Карлибах, 10">; внутри оставить тот же svg (aria-hidden) и <span>Прием&nbsp;— Тель-Авив / онлайн<br><span class="map-link__address">Карлибах,&nbsp;10</span></span>. Вложенный <a class="map-link"> удалить (ссылка в ссылке недопустима). URL карты не менять. Текст — дословно строка 13 колонки «Правка» (е в «Прием», запятая в «Карлибах, 10»); &nbsp; перед тире и между «Карлибах,» и «10».

Проверка: sed -n '/class="facts-bar"/,/<\/section>/p' site/index.html | grep -c 'class="facts-bar__item map-link"' → 1; тот же срез | grep -c 'map-link__address' → 1; grep -c '<a[^>]*>[^<]*<a ' site/index.html → 0

### 3. Сделать ряд адреса в #contact .contact-list ссылкой на всю строку с иконкой.

Файлы: `site/index.html`

Строки ~513–516: <div class="contact-list__row"> → <a class="contact-list__row map-link" href="<тот же Google Maps URL>" target="_blank" rel="noopener" data-action="map_click" aria-label="Открыть адрес в Google Maps: Тель-Авив, Карлибах, 10">; внутри <span class="contact-list__icon">…svg…</span> без изменений и <span class="contact-list__value">Прием&nbsp;— Тель-Авив / онлайн<br><span class="map-link__address">Карлибах,&nbsp;10</span></span>. Ряды «Телефон» и «WhatsApp» не трогать.

Проверка: awk '/id="contact"/,/<\/section>/' site/index.html | grep -c 'class="contact-list__row map-link"' → 1; awk '/id="contact"/,/<\/section>/' site/index.html | grep -c 'Карлибах&nbsp;10' → 0

### 4. Перестроить подвал: «Офис» — ссылка целиком с новым написанием, колонка «Связь» удалена.

Файлы: `site/index.html`

Строка ~564: <div><span class="site-footer__label">Офис</span><a class="map-link" href="<тот же URL>" target="_blank" rel="noopener" data-action="map_click" aria-label="Открыть адрес в Google Maps: Тель-Авив, Карлибах, 10"><span class="map-link__address">Карлибах,&nbsp;10</span><br>Прием&nbsp;— Тель-Авив / онлайн</a></div> — порядок строк подвала (адрес, затем «Прием…») сохранить, как в строке 88 списка владельцев (без правки). Строку ~565 (<div><span class="site-footer__label">Связь</span>… tel: … wa.me …</div>) удалить целиком — на всех ширинах, без @media. Логотип, разделитель и 8.9 остаются.

Проверка: grep -c 'site-footer__label">Связь' site/index.html → 0; awk '/<footer/,/<\/footer>/' site/index.html | grep -c 'tel:' → 0; awk '/<footer/,/<\/footer>/' site/index.html | grep -c 'wa.me' → 0; grep -c 'site-footer__label">Офис' site/index.html → 1

### 5. Обновить JSON-LD: новое написание адреса и jobTitle без точки.

Файлы: `site/index.html`

Строка ~585: "streetAddress": "Карлибах, 10"; строка ~593: "jobTitle": "Адвокат Израиля, лицензия № 30178" (без точки). В JSON-LD только обычные пробелы — никаких &nbsp; и U+00A0 (docs/TYPOGRAPHY-DASHES.md §3). hasMap, telephone, объект Юлии не трогать.

Проверка: python -c "import json,re;h=open('site/index.html',encoding='utf-8').read();d=json.loads(re.search(r'application/ld\+json[^>]*>(.*?)</script>',h,re.S).group(1));print(d['address']['streetAddress'],'|',d['employee'][0]['jobTitle'])" → «Карлибах, 10 | Адвокат Израиля, лицензия № 30178»; grep -c '30178\.' site/index.html → 0

### 6. Вынести копирайт отдельной строкой внутри блока 8.9.

Файлы: `site/index.html`

Строка ~569: в том же <p class="site-footer__legal" data-copy-id="8.9"> после «…обстоятельств конкретного дела.» поставить <br> и перевод строки с отступом, затем «© 2026 Адвокат Александр Гамбарян. Лицензия №&nbsp;30178</p>». Текст, точка после «Гамбарян», «№&nbsp;30178» — без изменений. Не создавать второй элемент с data-copy-id и не выносить «©…» из блока; не писать «дела.<br>©» без пробельного символа между — verify-client-copy склеит chunks в «дела.©» и упадёт.

Проверка: grep -c 'data-copy-id="8.9"' site/index.html → 1; python -B scripts/verify-client-copy.py без строки «data-copy-id='8.9'»

### 7. Добавить оформление адреса как ссылки и правило для нового элемента подвала.

Файлы: `site/styles.css`

После .nowrap-token (styles.css:101) добавить блок: .map-link__address { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; text-decoration-color: rgba(240, 174, 31, 0.55); } .map-link:hover .map-link__address, .map-link:focus-visible .map-link__address { text-decoration-color: var(--gold); }. Ничего другого в CSS не менять: .facts-bar__item, .contact-list__row уже display:flex и работают на <a>; a { color: inherit } даёт цвет строки; в подвале ссылка получит .site-footer__cols a (rgba .85) на обе строки — допустимо. Standalone пересобирается на шаге 10.

Проверка: grep -c 'map-link__address' site/styles.css → 2 (объявление + hover/focus); python scripts/verify-address-links.py (шаг 9) — textDecorationLine содержит underline

### 8. Обновить контракт копирайта: новые allowlist-строки, снятие старых, bump и синхронизация маркеров, тест.

Файлы: `scripts/client_copy_contract.py`, `scripts/tests/test_verify_client_copy.py`, `docs/RESUME.md`, `docs/FINAL-QA-CHECKLIST.md`, `docs/boards/2026-08-06-versions-links.md`, `docs/CONTENT-SOURCE-MAP.md`, `docs/CONTENT-EXTRA.md`, `docs/tasks/2026-08-13-dark-fact-cards.md`, `docs/CLIENT-PREVIEW-HANDOFF.md`

ALLOWED_TEXT_ATTRIBUTES: добавить «Открыть адрес в Google Maps: Тель-Авив, Карлибах, 10», удалить «Открыть адрес в Google Maps: Тель-Авив, Карлибах 10». ALLOWED_JSON_LD_TEXT: добавить «Карлибах, 10» и «Адвокат Израиля, лицензия № 30178», удалить «Карлибах 10» и «Адвокат Израиля, лицензия № 30178.». ALLOWED_OUTSIDE_COPY_TEXT: «Связь», «Карлибах 10», «Приём — Тель-Авив / онлайн» удалить только если grep по site/index.html даёт 0 (часть мог убрать этап 2); «Прием — Тель-Авив / онлайн» и «Карлибах, 10» должны уже быть (иначе добавить). Если после этапа 2 строки уже присутствуют и контракт править не нужно — bump не делать. Иначе CONTRACT_VERSION 1.3.0 → 1.3.1, CONTRACT_DATE — дата коммита, тот же маркер в docstring :3 и во всех документах с «CLIENT-COPY-CONTRACT v»/таблицах версий (grep -rn 'CLIENT-COPY-CONTRACT v\|Client Copy contract' docs scripts). Тест: добавить test_json_ld_old_address_and_job_title_fail — подмена «Карлибах, 10» → «Карлибах 10» и jobTitle с точкой в site/index.html даёт «неизвестный текст JSON-LD»; test_current_source_passes остаётся зелёным.

Проверка: python -B scripts/verify-client-copy.py → PASS; python -m unittest discover -s scripts/tests → OK; grep -rn 'CLIENT-COPY-CONTRACT v' docs scripts | sort -u по версии → одна версия/дата

### 9. Добавить DOM-гейт ссылок адреса (Playwright) и включить его в приёмку.

Файлы: `scripts/verify-address-links.py (новый)`

Скрипт с заголовком-маркером ADDRESS-LINKS-GATE v1.0.0 | <дата>; аргумент base_url (локальный http://127.0.0.1:8098/build/variants/final-dev4/ или живой alias), viewports 390×844 и 1440×900, вывод JSON Lines + итог, exit 0/1. Проверки: (a) a.map-link ровно 3, у каждого href начинается с https://www.google.com/maps/search/?api=1&query=, target=_blank, rel содержит noopener, dataset.action==='map_click', aria-label==='Открыть адрес в Google Maps: Тель-Авив, Карлибах, 10', внутри .map-link__address с текстом «Карлибах, 10» (U+00A0→пробел) и getComputedStyle(...).textDecorationLine содержит underline; (b) document.querySelectorAll('a a').length===0; (c) третий ряд #contact .contact-list и третий пункт .facts-bar — tagName 'A'; .site-footer__cols > div ровно 1, footer без a[href^="tel:"] и без текста «Связь»; (d) клик по каждой ссылке через page.expect_popup() → popup.url содержит google.com/maps; (e) блок [data-copy-id="8.9"]: Range по «©» и по «дела.» дают разные getBoundingClientRect().top, фраза «Лицензия № 30178» на одной строке; (f) JSON-LD: streetAddress «Карлибах, 10», employee[0].jobTitle без точки; (g) documentElement.scrollWidth <= innerWidth. Playwright уже в requirements-build.txt; в облаке Chromium запускать с executable_path из PLAYWRIGHT_BROWSERS_PATH (spec, подготовительный шаг 7).

Проверка: в отдельном терминале из корня: python -m http.server 8098; затем python scripts/verify-address-links.py http://127.0.0.1:8098/build/variants/final-dev4/ → exit 0, все проверки PASS на 390 и 1440

### 10. Пересобрать standalone и все Preview, прогнать полный набор гейтов.

Файлы: `site/gambarian-standalone.html`, `build/variants/final-dev4/ (производный)`

Порядок: python -B scripts/build-preview.py site/gambarian-standalone.html --standalone (standalone — target source:standalone verify-client-copy, коммитится); python -B scripts/build-font-variants.py; python -B scripts/build-hero-variants.py; python -B scripts/build-action-bar.py; python -B scripts/build-review-numbered.py; затем гейты из списка карточки. Сверить число «&nbsp;—» в build/variants/final-dev4/index.html с ожиданием verify-live-previews.py для final-dev4 (этап 3 его не меняет); build/ руками не править и не коммитить.

Проверка: все команды из блока gates завершаются кодом 0; grep -o '&nbsp;—' build/variants/final-dev4/index.html | wc -l равен ожиданию per-alias для final-dev4; python scripts/qa-browser-matrix.py http://127.0.0.1:8098/ --all-previews → summary status PASS без overflow на 360/390/960/961/1440

### 11. Зафиксировать решения и изменения в документации.

Файлы: `docs/CONTENT-OWNER-EDITS.md`, `docs/CONTACT-LINKS-SPEC.md`, `docs/TRACKING-REQUIREMENTS.md`, `docs/HERO-CTA-RESEARCH.md`, `docs/FINAL-QA-CHECKLIST.md`

CONTENT-OWNER-EDITS.md: новый раздел «Решения владельца 2026-09-06: адрес, лицензия в JSON-LD, подвал, строка 8.9» (№13 — написание «Прием — Тель-Авив / онлайн / Карлибах, 10» везде, включая aria-label и streetAddress; №14 — jobTitle без точки; №26 — из подвала убрана колонка «Связь» на всех ширинах, «Офис» остаётся по умолчанию; №27 — «© 2026 …» отдельной строкой в 8.9, текст и оформление без изменений; №8 — вся строка адреса — ссылка на Google Maps в новом окне, адрес подчёркнут), версия документа — следующая минорная после этапа 2, дата коммита. CONTACT-LINKS-SPEC.md §1: пример ссылки с новым aria-label и указанием «кликабельна вся строка с иконкой, вложенных <a> нет». TRACKING-REQUIREMENTS.md: отметить, что data-action="map_click" стоит на всех трёх ссылках карты. HERO-CTA-RESEARCH.md §6 (строки ~187–191): «в футере» заменить на «в блоке контактов и в мобильной панели; из футера снят решением владельца 2026-09-06 (вопрос 26)». FINAL-QA-CHECKLIST.md: §2 — версия контракта, если был bump; §3 — строка про адрес-ссылку, подвал без «Связи» и 8.9 в две строки. У новых разделов — секция Related не требуется (файлы существующие); новых файлов в docs/ нет.

Проверка: grep -c 'Карлибах, 10' docs/CONTENT-OWNER-EDITS.md ≥ 1; grep -c 'вопрос 26\|№26' docs/HERO-CTA-RESEARCH.md ≥ 1; git diff --check → пусто

### 12. Закоммитить, запушить, открыть draft PR; после деплоя владельцем выполнить live-приёмку.

Файлы: `.github/PULL_REQUEST_TEMPLATE.md`

Ветка codex/final-dev4-s3-contacts (от main после слияния PR #11 и PR этапа 2; пока PR #11 не влит — от codex/final-dev4). Коммиты вида feat: address rows link to Google Maps, footer without contact column / docs: record owner decisions 13, 14, 26, 27 — без идентификаторов моделей. Draft PR в main по шаблону + proof-блок. Деплой запускает владелец: Actions → Deploy Previews → Run workflow → «Use workflow from» = ветка этапа → only=final-dev4 (никогда не пусто). До деплоя снять SHA-256 final-dev3 и production: curl -sS -A gambarian-readback https://final-dev3.gambarian-landing.pages.dev/ | sha256sum (в PowerShell — curl.exe и Get-FileHash); после деплоя повторить и сравнить (production = 656CBCD0…C13E22), затем python -B scripts/verify-live-previews.py --only final-dev4; python scripts/verify-address-links.py https://final-dev4.gambarian-landing.pages.dev/; curl -sS -A gambarian-readback https://final-dev4.gambarian-landing.pages.dev/ | grep -c 'site-footer__label">Связь' → 0, | grep -c 'data-action="map_click"' → 3, | grep -c 'Карлибах&nbsp;10' → 0, | grep -c '30178\.' → 0. wrangler напрямую не запускать.

Проверка: PR draft открыт в main с proof-блоком; после деплоя verify-live-previews --only final-dev4 → PASS, SHA-256 final-dev3 и production до/после совпадают

## Гейты (в этом порядке)

- `python -B scripts/build-preview.py site/gambarian-standalone.html --standalone`
- `python -B scripts/verify-client-copy.py`
- `python -m unittest discover -s scripts/tests`
- `python -B scripts/build-font-variants.py && python -B scripts/build-hero-variants.py && python -B scripts/build-action-bar.py && python -B scripts/build-review-numbered.py`
- `python -B scripts/verify-client-previews.py`
- `node scripts/verify-lead-hook.mjs`
- `python -m http.server 8098 (отдельный терминал, из корня репо) && python scripts/verify-address-links.py http://127.0.0.1:8098/build/variants/final-dev4/`
- `python scripts/qa-browser-matrix.py http://127.0.0.1:8098/build/variants/final-dev4/ --target-name final-dev4`
- `python scripts/qa-browser-matrix.py http://127.0.0.1:8098/ --all-previews`
- `git diff --check`
- `после деплоя владельцем: python -B scripts/verify-live-previews.py --only final-dev4`
- `после деплоя: python scripts/verify-address-links.py https://final-dev4.gambarian-landing.pages.dev/`
- `после деплоя: curl -sS -A gambarian-readback https://final-dev3.gambarian-landing.pages.dev/ | sha256sum и curl -sS -A gambarian-readback https://gambarian-landing.pages.dev/ | sha256sum — совпадают с замером до деплоя (production 656CBCD0…C13E22)`

## Версии и маркеры

- CLIENT-COPY-CONTRACT: 1.3.0 → 1.3.1 + дата (только если allowlist меняется в этом этапе) — scripts/client_copy_contract.py:3 (docstring) и :11–12; таблицы/маркеры в docs/RESUME.md, docs/FINAL-QA-CHECKLIST.md, docs/boards/2026-08-06-versions-links.md, docs/CONTENT-SOURCE-MAP.md, docs/CONTENT-EXTRA.md, docs/tasks/2026-08-13-dark-fact-cards.md, docs/CLIENT-PREVIEW-HANDOFF.md (все, что находит grep 'CLIENT-COPY-CONTRACT v')
- CONTENT-OWNER-EDITS: следующая минорная версия после этапа 2 + дата (docs/CONTENT-OWNER-EDITS.md шапка)
- ADDRESS-LINKS-GATE v1.0.0 | <дата> — заголовок нового scripts/verify-address-links.py
- Не меняются: FINAL-DEV4-DESIGN (правки только в site/), ACTION-BAR-SPEC 2.x, LIVE-PREVIEW-READBACK (счётчик тире не меняется), PREVIEW-BROWSER-QA-RUNNER

## Приёмка этапа

- [ ] grep -c 'class="[^"]*map-link"' site/index.html = 3, grep -c 'data-action="map_click"' = 3, grep -c 'Карлибах&nbsp;10' = 0, grep -c 'Карлибах,&nbsp;10' = 3, вложенных <a> нет
- [ ] JSON-LD: streetAddress = «Карлибах, 10», employee[0].jobTitle = «Адвокат Израиля, лицензия № 30178»; grep -c '30178\.' site/index.html = 0; в JSON-LD нет &nbsp;
- [ ] grep -c 'site-footer__label">Связь' site/index.html = 0 и в site/gambarian-standalone.html = 0; в <footer> нет tel: и wa.me; «Офис» на месте
- [ ] data-copy-id="8.9" ровно 1; verify-client-copy PASS; в браузере «©» начинается с новой строки, «Лицензия № 30178» не рвётся на 360px
- [ ] verify-address-links.py PASS на 390 и 1440 (локальная сборка final-dev4): три ссылки открывают popup с google.com/maps, адрес подчёркнут, footer без телефона
- [ ] verify-client-copy, unit-тесты, verify-client-previews, verify-lead-hook, build-review-numbered — код 0; qa-browser-matrix без overflow на 360/390/960/961/1440
- [ ] Если контракт менялся: одна версия/дата CLIENT-COPY-CONTRACT во всех источниках маркера; ALLOWED_TEXT_ATTRIBUTES и ALLOWED_JSON_LD_TEXT без старых форм адреса и лицензии
- [ ] Число «&nbsp;—» в build/variants/final-dev4/index.html равно ожиданию verify-live-previews.py для final-dev4 (этап не меняет счётчик)
- [ ] После деплоя only=final-dev4: verify-live-previews --only final-dev4 PASS; SHA-256 final-dev3 и production до/после совпадают; curl final-dev4 показывает 0 «Связь», 3 map_click, 0 «Карлибах&nbsp;10»
- [ ] Документы обновлены: CONTENT-OWNER-EDITS (13/14/26/27/8), CONTACT-LINKS-SPEC, TRACKING-REQUIREMENTS, HERO-CTA-RESEARCH §6, FINAL-QA-CHECKLIST

## Отчёт в PR (обязательные поля)

- Хэш коммита(ов) и подтверждение push в codex/final-dev4-s3-contacts; ссылка на draft PR
- Diff-доказательство: git show --stat и ключевые фрагменты (три ссылки адреса, удалённая колонка «Связь», 8.9 с <br>, JSON-LD, allowlist-правки)
- Полный вывод: verify-client-copy, unittest, verify-client-previews, verify-lead-hook, build-review-numbered, verify-address-links (390/1440), qa-browser-matrix summary
- Число «&nbsp;—» в site/index.html и build/variants/final-dev4/index.html и ожидание verify-live-previews для final-dev4
- Проверено / Не проверено: до деплоя live-readback отсутствует — явно указать; после деплоя владельцем — вывод verify-live-previews --only final-dev4, verify-address-links по живому адресу, SHA-256 final-dev3 и production до/после
- Статус строк списка владельцев 57 (адрес в карточке — ссылка на этап 2), 75, 88–92, 96 («Связь») со ссылкой на коммит
- Вопросы владельцу: расширить ли aria-label до полного видимого текста строки (WCAG 2.5.3) — не блокирует; подтверждение, что «Прием…» в подвале как часть ссылки выглядит приемлемо

## Риски

- Пересечение с этапом 2 (плашка, allowlist «Прием…»/«Карлибах, 10», удаление 5.17): шаги сформулированы идемпотентно — сначала grep, потом правка; при расхождении остановиться и написать в отчёт
- «дела.<br>©» без пробельного символа → chunks склеятся, verify-client-copy FAIL на 8.9
- &nbsp; или U+00A0 в JSON-LD → структурированные данные с мусором; в JSON-LD только обычные пробелы
- Старые формы («Карлибах 10», «…30178.») оставленные в allowlist позволят регрессии — удалять, когда grep по site/index.html = 0
- aria-label короче видимого текста всей строки (WCAG 2.5.3 label-in-name): адрес «Карлибах, 10» в имя входит — допустимо; не расширять без решения
- Ссылка на весь блок «Офис» окрасит строку «Прием — …» в цвет ссылок подвала (.85) — ожидаемо; при замечании владельца scoped-правило .site-footer__cols .map-link { color: inherit }
- На машине владельца в PowerShell curl — псевдоним Invoke-WebRequest: использовать curl.exe и Get-FileHash
- page.expect_popup для target=_blank в headless Chromium требует клика Playwright, не JS .click() — иначе popup не перехватится
- Ожидание «&nbsp;—» per-alias для final-dev4 задано этапом 1: если оно жёсткое и не совпало с фактом сборки — причина в этапе 2/1, а не в этом этапе; зафиксировать в отчёте
- Workflow с пустым only опубликует все 11 alias, включая final-dev3 — поле only=final-dev4 обязательно

## Промпт для Codex

Вставить в Codex CLI в корне репозитория на ветке этапа:

```text
Ты исполнитель этапа 3 «Адрес, лицензия, карта, подвал» версии final-dev4 лендинга «Гамбарян и партнёры». Работай в корне репозитория, уровень рассуждений high.
Сначала прочитай по порядку: AGENTS.md; docs/RESUME.md (раздел «Следующий цикл»); docs/CODEX-WORKING-MODEL.md; docs/tasks/codex/2026-09-06-final-dev4-stage-3.md (карточка этапа, целиком); в docs/tasks/2026-09-06-final-dev4-spec.md — «Реестр решений владельца» (№8, 13, 14, 26, 27), «Правила для исполнителя», «Приёмка»; в docs/tasks/2026-09-06-final-dev4-items.md — пункты D:D-02, D:D-03, D:D-07, D:D-08, F:M-05, C:G-07, A:HF-07; docs/CONTENT-OWNER-REVISIONS-2026-09-06.md (строки 13, 57, 75, 88–92, 96); docs/TYPOGRAPHY-DASHES.md §2–3; docs/CONTACT-LINKS-SPEC.md §1 и §5. Только потом код: site/index.html, site/styles.css, scripts/client_copy_contract.py, scripts/verify-client-copy.py.
Предусловие: этапы 1 и 2 уже влиты (alias final-dev4 в scripts/client-preview-map.json, CONTRACT_VERSION 1.3.0, плашка с «Прием&nbsp;— …» и «Карлибах,&nbsp;10», блок 5.17 удалён). Если чего-то нет — остановись на этом пункте и напиши в отчёт, остальное сделай.
Ветка codex/final-dev4-s3-contacts от main (если PR #11 ещё не влит — от codex/final-dev4). Draft PR в main по .github/PULL_REQUEST_TEMPLATE.md.
Сделай (правки только в site/, scripts/, docs/; build/ руками не править и не коммитить):
1. Три места с адресом — третий пункт .facts-bar, третий ряд #contact .contact-list, колонка «Офис» в подвале — сделать целиком ссылкой <a class="… map-link" href=<существующий Google Maps URL> target="_blank" rel="noopener" data-action="map_click" aria-label="Открыть адрес в Google Maps: Тель-Авив, Карлибах, 10">, внутри «Прием&nbsp;— Тель-Авив / онлайн» и <span class="map-link__address">Карлибах,&nbsp;10</span>; вложенных <a> не оставлять; иконки на месте; в подвале порядок строк как сейчас (адрес, затем «Прием…»).
2. site/styles.css: .map-link__address — подчёркивание золотом (text-decoration-color rgba(240,174,31,.55), text-underline-offset 3px), на hover/focus-visible — var(--gold). Больше CSS не трогать.
3. JSON-LD: "streetAddress": "Карлибах, 10"; "jobTitle": "Адвокат Израиля, лицензия № 30178" — без точки, без &nbsp;.
4. Подвал: удалить колонку «Связь» целиком (span.site-footer__label «Связь», ссылка tel:, ссылка wa.me) — на всех ширинах, без @media. «Офис» остаётся.
5. Блок 8.9: внутри того же <p data-copy-id="8.9"> перед «© 2026 …» поставить <br> и перевод строки; текст и оформление не менять; второй data-copy-id не создавать.
6. scripts/client_copy_contract.py: в ALLOWED_TEXT_ATTRIBUTES и ALLOWED_JSON_LD_TEXT добавить новые формы и убрать старые («Карлибах 10», «…30178.», старый aria-label; «Связь» — при grep=0 по site/index.html); если контракт менялся — bump 1.3.0 → 1.3.1 с датой в docstring :3, в :11–12 и во всех документах, которые находит grep -rn 'CLIENT-COPY-CONTRACT v' docs scripts. В scripts/tests/test_verify_client_copy.py добавить тест: старые формы адреса и jobTitle в JSON-LD дают ошибку.
7. Новый гейт scripts/verify-address-links.py (Playwright, маркер ADDRESS-LINKS-GATE v1.0.0 | дата) по описанию шага 9 карточки: 3 ссылки, popup на google.com/maps, подчёркивание, нет a внутри a, подвал без tel и «Связи», «©» с новой строки, JSON-LD, нет overflow; 390 и 1440.
8. Пересобрать: python -B scripts/build-preview.py site/gambarian-standalone.html --standalone; build-font-variants, build-hero-variants, build-action-bar, build-review-numbered. Прогнать гейты: verify-client-copy, python -m unittest discover -s scripts/tests, verify-client-previews, node scripts/verify-lead-hook.mjs, verify-address-links по http://127.0.0.1:8098/build/variants/final-dev4/ (python -m http.server 8098 из корня), qa-browser-matrix для final-dev4 и --all-previews, git diff --check. Сверить число «&nbsp;—» в build/variants/final-dev4/index.html с ожиданием verify-live-previews.py.
9. Документы: docs/CONTENT-OWNER-EDITS.md (решения 8/13/14/26/27, версия и дата), docs/CONTACT-LINKS-SPEC.md (пример ссылки), docs/TRACKING-REQUIREMENTS.md (map_click стоит), docs/HERO-CTA-RESEARCH.md §6 (WhatsApp снят из футера решением владельца 2026-09-06), docs/FINAL-QA-CHECKLIST.md (§2 версия, §3 запись).
Не делай: не редактируй тексты владельца и frozen source docs/sources/client-copy-short-v1.0.0.txt; не трогай final-dev3, production, build/; не запускай wrangler и production-деплой; не добавляй встроенную карту, Waze, координаты; не удаляй колонку «Офис»; не меняй контраст .site-footer__legal; нерабочее время — этап 4.
Коммиты вида feat: address rows link to Google Maps, footer without contact column; docs: record owner decisions 13, 14, 26, 27 — без идентификаторов моделей.
Отчёт в PR: хэш и push; список файлов и что изменилось; вывод каждого гейта; число «&nbsp;—»; «Проверено / Не проверено / Вопросы владельцу». Деплой делает владелец (Actions → Deploy Previews → Run workflow → ветка этапа → only=final-dev4). До деплоя сними SHA-256: curl -sS -A gambarian-readback https://final-dev3.gambarian-landing.pages.dev/ | sha256sum и то же для https://gambarian-landing.pages.dev/ (в PowerShell — curl.exe и Get-FileHash). После деплоя: python -B scripts/verify-live-previews.py --only final-dev4; python scripts/verify-address-links.py https://final-dev4.gambarian-landing.pages.dev/; curl final-dev4 | grep -c 'site-footer__label">Связь' → 0, grep -c 'data-action="map_click"' → 3, grep -c 'Карлибах&nbsp;10' → 0; повтори SHA-256 final-dev3 и production — должны совпасть с замером до деплоя (production 656CBCD0…C13E22). Допиши proof-блок в PR.
```

## Related

- [Модель работы с Codex](../../CODEX-WORKING-MODEL.md)
- [Задание final-dev4](../2026-09-06-final-dev4-spec.md)
- [Разбор по пунктам](../2026-09-06-final-dev4-items.md)
- [Реестр текстов владельца](../../CONTENT-OWNER-REVISIONS-2026-09-06.md)
- [Рекомендации дизайнеров](../../DESIGN-RECOMMENDATIONS-2026-09-06.md)

# Этап 4: Нерабочее время: все tel: вне Hero → WhatsApp

**Версия:** `FINAL-DEV4-STAGE-4 v1.0.0`

**Дата:** `2026-09-06`

**Ветка:** `codex/final-dev4-s4-hours` → draft PR в `main`

**Исполнитель:** Codex CLI; уровень рассуждений: **high (контракты, скрипты, поведение)** — Этап пишет JS-адаптер с восстановлением DOM в обоих состояниях, меняет versioned-контракт FINAL-DEV4-DESIGN и токены двух проверок, добавляет Playwright-гейт с моком сети и принудительными состояниями, и обязан не задеть dev3/Action Bar; это уровень «контракты/JS/гейты», перестройки UI нет.

**Приёмка:** Claude (облачная сессия) по `docs/CODEX-WORKING-MODEL.md`; слияние — владелец.

## Цель

В состоянии «закрыто» (вс–чт вне 09:00–17:59 Asia/Jerusalem или demo-переключатель) на странице final-dev4 не остаётся ни одной кликабельной ссылки tel: — шапка, мобильное меню, Hero, ряд «Телефон» у формы и подсказка в ошибке доставки формы переключаются на WhatsApp тем же механизмом, что Hero и Action Bar: единственный источник состояния — .mobile-bar[data-business-state] из Action Bar, адаптер final-dev4 — только observer без часов и таймеров. В состоянии «открыто» исходная разметка восстанавливается байт в байт. Проверка — новый DOM-гейт scripts/verify-business-hours.py на 390 и 1440 в обоих состояниях, включая открытое меню и показанную ошибку формы.

## Основание

- Решения владельца (реестр в `../2026-09-06-final-dev4-spec.md`): №25
- Пункты разбора (`../2026-09-06-final-dev4-items.md`): `D:D-05`, `E:G-03`, `F:M-05`

## Не в скоупе этапа

- Расписание, таймзона, таймер, demo-switch — остаются в Action Bar (ACTION-BAR-SPEC 2.x — единственный источник состояния); Action Bar не менять, если этап 1 уже привёл его в соответствие dev4 (body class/латч)
- Подвал: колонка «Связь» уже удалена этапом 3 — здесь не трогать; .nav-call в final-dev4 отсутствует (вырезается builder-ом final-dev1/dev3/dev4) — атрибут ставится ради общей схемы, поведение проверяется только там, где элемент есть
- Новые формулировки вроде «офис закрыт» / часы работы на странице — не решено владельцем, не вводить
- JSON-LD telephone — не кликабельно, не трогать
- Production и final-dev3: адаптер устанавливается только в сборку final-dev4; в site/ добавляются только инертные data-атрибуты и скрытый вариант подсказки
- Runner qa-browser-matrix 1.5.0 с новыми гейтами — этап 6; здесь отдельный скрипт-гейт
- Открытые вопросы 1–3, 7, 10, 11, 15–18, 26, 28 — не относятся к этапу

## Шаги

### 1. Проверить предусловия этапов 1–3 и найти фактические имена dev4-контракта.

Файлы: `scripts/final_dev4_contract.py`, `site-addons/final-dev4/`, `scripts/build-hero-variants.py`, `scripts/verify-client-previews.py`, `scripts/verify-client-copy.py`, `site/index.html`

Убедиться, что влит этап 3 (в <footer> нет tel:). Найти, как этап 1 устроил dev4: константы VERSION/DATE/MARKER/BODY_CLASS/HERO_BUSINESS_SCRIPT в scripts/final_dev4_contract.py; файл адаптера в site-addons/final-dev4/ (ожидаемо копия dev3-адаптера hero-business-hours.js с маркером FINAL-DEV4-DESIGN); списки required/forbidden токенов dev4 в build-hero-variants.py verify() и verify-client-previews.py; путь адаптера в DYNAMIC_UI_PATHS verify-client-copy.py:56–61; TASK_PATH/BOARD_PATH, где проверяется маркер. Имя файла адаптера НЕ менять (иначе каскад правок путей); расширяется содержимое. Проверить, что Action Bar знает body class dev4 (латч finalDev3TopOnly) — если нет, это дефект этапа 1: записать в отчёт, здесь не чинить.

Проверка: awk '/<footer/,/<\/footer>/' site/index.html | grep -c 'tel:' → 0; grep -rn 'FINAL-DEV4-DESIGN v' scripts site-addons docs | одна версия/дата; grep -n 'final-dev4' scripts/verify-client-copy.py → путь адаптера в DYNAMIC_UI_PATHS

### 2. Завести собственный адаптер dev4 и расцепить проверки dev3/dev4 (этап 1 этого не делал — он копировал dev3-адаптер как есть).

Файлы: `site-addons/final-dev4/hero-business-hours.js (новый)`, `scripts/final_dev4_contract.py`, `scripts/build-hero-variants.py`, `scripts/verify-client-previews.py`, `scripts/verify-client-copy.py`, `docs/tasks/codex/README.md`

1) Скопировать site-addons/final-dev3/hero-business-hours.js → site-addons/final-dev4/hero-business-hours.js, заголовочный маркер заменить на FINAL-DEV4-DESIGN v<версия этапа> | <ДАТА> (дальнейшие правки поведения — в этом файле, dev3-адаптер не трогать). 2) scripts/final_dev4_contract.py: HERO_BUSINESS_SCRIPT = "hero-business-hours.js", HERO_BUSINESS_SCRIPT_TAG (как у final_dev3_contract), SCRIPT_REQUIRED_TOKENS / SCRIPT_FORBIDDEN_TOKENS для dev4 (свои: маркер dev4, селекторы вне Hero, data-business-closed; без dev3-токена '.hero--final-dev1 .hero__call--expanded', если он больше не нужен), apply_script_contract(js). 3) scripts/build-hero-variants.py: FINAL_DEV4_ADDON = ROOT / "site-addons" / "final-dev4"; в build(): отдельная ветка `if key == "dev4":` — копировать адаптер из FINAL_DEV4_ADDON и применять dev4 script-контракт (dev3 остаётся на своей ветке); в verify(): отдельный блок dev4 с байт-сравнением против site-addons/final-dev4 и dev4-токенами; условие `key in {"dev3", "dev4"}` из этапа 1 вернуть к `key == "dev3"`. 4) scripts/verify-client-previews.py: verify_final_dev4 сравнивает hero-business-hours.js с site-addons/final-dev4 и dev4-токенами; `branch in {...}` расцепить аналогично. 5) scripts/verify-client-copy.py: DYNAMIC_UI_PATHS += site-addons/final-dev4/hero-business-hours.js. 6) docs/tasks/codex/README.md (TASK_PATH): строка Marker final-dev4 → новая версия/дата. Действующее решение по латчу: класс page--final-dev3 в body dev4 сохраняется намеренно (Action Bar 2.4.0 включает scoped latch по нему); Action Bar не бампится.

Проверка: test -f site-addons/final-dev4/hero-business-hours.js; python -B scripts/build-hero-variants.py → все варианты «проверка пройдена»; cmp build/variants/final-dev4/hero-business-hours.js site-addons/final-dev4/hero-business-hours.js → без вывода; cmp build/variants/final-dev3/hero-business-hours.js site-addons/final-dev3/hero-business-hours.js → без вывода; grep -n 'key in {"dev3", "dev4"}' scripts/build-hero-variants.py → 0; python -B scripts/verify-client-previews.py → PASS; python -B scripts/verify-client-copy.py → PASS

### 3. Разметить в site/index.html, что делать с каждой телефонной ссылкой в состоянии «закрыто».

Файлы: `site/index.html`

Добавить атрибуты (значение текста ссылок не менять): a.nav-call (строка ~54) — data-business-closed="whatsapp"; a.nav-drawer__call (~64) — data-business-closed="whatsapp"; a.hero__call (~93) — data-business-closed="whatsapp" (dev3-адаптер этот атрибут не читает, конфликта нет); a.contact-list__row[href^="tel:"] (~505) — data-business-closed="hide" (рядом уже стоит ряд WhatsApp — как в Action Bar, где телефон скрывается, а WhatsApp остаётся). Атрибуты ставить после class="…", чтобы регулярка NAV_CALL и replace 'class="hero__call"' в build-hero-variants.py продолжали совпадать. В production/остальных Preview атрибуты инертны (адаптера там нет).

Проверка: grep -c 'data-business-closed="whatsapp"' site/index.html → 3; grep -c 'data-business-closed="hide"' site/index.html → 1; python -B scripts/build-hero-variants.py dev1 dev3 dev4 → без «.nav-call остался» и «пропал звонок»

### 4. Подготовить подсказку ошибки формы к двум состояниям без изменения текущего текста.

Файлы: `site/index.html`, `scripts/client_copy_contract.py`, `docs/CONTENT-EXTRA.md`

Строка ~526: внутри <span class="lead-form__error-contact" hidden> разделить содержимое на два варианта: <span data-business-variant="open">Если ошибка повторяется, позвоните: <a href="tel:+972545490623">054-549-0623</a> или напишите в <a href="https://wa.me/972545490623" target="_blank" rel="noopener">WhatsApp</a>.</span><span data-business-variant="closed" hidden>Если ошибка повторяется, напишите в <a href="https://wa.me/972545490623" target="_blank" rel="noopener">WhatsApp</a>.</span>. Открытый вариант — текущий текст дословно. Новый SYSTEM-UI фрагмент «Если ошибка повторяется, напишите в» добавить в ALLOWED_OUTSIDE_COPY_TEXT (это служебный текст формы, не клиентский контент; юридических фактов не содержит) и записать в docs/CONTENT-EXTRA.md (категория «Форма»). Без адаптера (production) закрытый вариант остаётся hidden — поведение прежнее.

Проверка: python -B scripts/verify-client-copy.py → PASS (нет «неизвестный текст вне data-copy-id»); node scripts/verify-lead-hook.mjs → PASS; grep -c 'data-business-variant="closed"' site/index.html → 1

### 5. Добавить CSS для скрытого ряда контактов.

Файлы: `site/styles.css`

Рядом с .contact-list__row (styles.css:1139) добавить .contact-list__row[hidden] { display: none; } — авторское display:flex перебивает UA-правило [hidden], без этого скрытый ряд останется видимым. Для inline-вариантов подсказки достаточно UA [hidden]. Другой CSS не менять.

Проверка: grep -c 'contact-list__row\[hidden\]' site/styles.css → 1

### 6. Расширить dev4-адаптер с Hero на все размеченные ссылки, сохранив архитектуру dev3-адаптера.

Файлы: `site-addons/final-dev4/hero-business-hours.js (или фактическое имя файла адаптера dev4 из scripts/final_dev4_contract.py)`

Оставить: bar = .mobile-bar[data-business-state], whatsappAction = bar.querySelector('[data-business-action="whatsapp"]'), MutationObserver(syncFromActionBar) c attributeFilter: ['data-business-state'], состояния open/closed, pending — ничего не делать. Заменить единственную цель на список: targets = document.querySelectorAll('[data-business-closed]'); variants = document.querySelectorAll('[data-business-variant]'). Для каждого target с 'whatsapp' сохранить originalMarkup (innerHTML) и оригинальные значения href/target/rel/data-action/aria-label; renderClosed: скопировать href/target/rel у whatsappAction, data-action='whatsapp_click', aria-label='Написать в WhatsApp', детей заменить на клон svg из whatsappAction (aria-hidden, width/height взять у исходного svg ссылки, если был) + <span class="<класс последнего span исходной ссылки, для Hero — hero__call-num nowrap-token>">Написать в WhatsApp</span>; для Hero дополнительно, как в dev3, ставить data-hero-business-state="closed" на .hero__phone. Для 'hide' — element.hidden = true. Для variants — hidden = (variant !== state). renderOpen: восстановить атрибуты и innerHTML, снять hidden. Никаких setTimeout/setInterval/DateTimeFormat/localStorage/sessionStorage/location.search/URLSearchParams. В заголовке файла — маркер FINAL-DEV4-DESIGN v<новая> | <дата> и описание «Hero + все tel: вне Hero». Кириллица в JS только 'Написать в WhatsApp' (уже в ALLOWED_DYNAMIC_UI_TEXT).

Проверка: python -B scripts/verify-client-copy.py → PASS (verify_dynamic_ui без новых строк); grep -c 'setTimeout(\|setInterval(\|DateTimeFormat(' <адаптер> → 0; grep -c 'new MutationObserver(syncFromActionBar)' <адаптер> → 1

### 7. Поднять версию FINAL-DEV4-DESIGN и синхронизировать токены проверок адаптера.

Файлы: `scripts/final_dev4_contract.py`, `scripts/build-hero-variants.py`, `scripts/verify-client-previews.py`, `docs/boards/2026-08-06-versions-links.md`, `docs/tasks/ (документ TASK_PATH из final_dev4_contract.py)`

VERSION — минорный bump относительно значения после этапа 3 (например 1.0.0 → 1.1.0), DATE — дата коммита; тот же маркер в заголовке адаптера и в документах, которые проверяет verify_final_dev4_sources (TASK_PATH, BOARD_PATH). HTML/CSS-маркеры сборки берутся из констант автоматически. Списки required-токенов dev4 (в обоих местах, где этап 1 продублировал dev3-список: grep -rn 'hero__call--expanded' scripts/) заменить на: ".mobile-bar[data-business-state]", "[data-business-closed]", "[data-business-variant]", '[data-business-action="whatsapp"]', "Написать в WhatsApp", "data-action', 'whatsapp_click", "new MutationObserver(syncFromActionBar)", "attributeFilter: ['data-business-state']"; forbidden-токены оставить. Токены и проверки dev3 не трогать. ACTION-BAR-SPEC не меняется.

Проверка: python -B scripts/build-hero-variants.py → все варианты «Проверка пройдена»; python -B scripts/verify-client-previews.py → PASS; grep -rn 'FINAL-DEV4-DESIGN v' scripts site-addons docs build/variants/final-dev4 | одна версия/дата

### 8. Обновить контракт копирайта под новый SYSTEM-UI фрагмент.

Файлы: `scripts/client_copy_contract.py`, `scripts/tests/test_verify_client_copy.py`, `docs/RESUME.md`, `docs/FINAL-QA-CHECKLIST.md`, `docs/boards/2026-08-06-versions-links.md`, `docs/CONTENT-SOURCE-MAP.md`, `docs/CONTENT-EXTRA.md`, `docs/tasks/2026-08-13-dark-fact-cards.md`, `docs/CLIENT-PREVIEW-HANDOFF.md`

ALLOWED_OUTSIDE_COPY_TEXT += «Если ошибка повторяется, напишите в» (шаг 3). CONTRACT_VERSION — следующий patch после этапа 3 (1.3.1 → 1.3.2 или 1.3.0 → 1.3.1, если этап 3 не бампил), CONTRACT_DATE — дата коммита; docstring :3 и все документы с маркером (grep -rn 'CLIENT-COPY-CONTRACT v\|Client Copy contract' docs scripts). Тест: test_current_source_passes остаётся зелёным; добавить проверку, что текст «Если ошибка повторяется, позвоните:» и «054-549-0623» по-прежнему присутствуют в site/index.html (открытый вариант не потерян).

Проверка: python -B scripts/verify-client-copy.py → PASS; python -m unittest discover -s scripts/tests → OK; grep -rn 'CLIENT-COPY-CONTRACT v' docs scripts → одна версия/дата

### 9. Добавить DOM-гейт рабочего времени (Playwright) с принудительными состояниями.

Файлы: `scripts/verify-business-hours.py (новый)`

Маркер BUSINESS-HOURS-GATE v1.0.0 | <дата>; аргумент base_url; viewports 390×844 и 1440×900; JSON Lines + итог; exit 0/1. Последовательность на каждом viewport: дождаться .mobile-bar[data-business-state] ∈ {open, closed}; setState(name) — через page.evaluate: document.querySelector('[data-business-demo]').click() (JS-клик работает и при hidden), ждать rAF, сверить атрибут. В open: снять snapshot outerHTML всех [data-business-closed] и .lead-form__error-contact. Перевести в closed и проверить: (a) по DOM — [...document.querySelectorAll('a[href^="tel:"]')].filter(a => !a.closest('[hidden]')).length === 0 и по видимости — .filter(a => a.getClientRects().length > 0).length === 0, при открытом меню (.nav-burger click на 390) и при показанной ошибке доставки (page.route('**/api/lead') → 503 JSON, заполнить имя/телефон, submit, дождаться .lead-form__error без hidden и .lead-form__error-contact без hidden); (b) каждый [data-business-closed="whatsapp"]: href/target/rel равны бару [data-business-action="whatsapp"], dataset.action==='whatsapp_click', aria-label и innerText === 'Написать в WhatsApp', svg.innerHTML === svg бара, номер «054-549-0623» в тексте отсутствует; (c) [data-business-closed="hide"] hidden и без client rects; (d) [data-business-variant="closed"] виден и содержит a[href^="https://wa.me/"], [data-business-variant="open"] hidden; (e) на 390 в баре [data-business-action="phone"] hidden (регрессия Action Bar). Перевести в open: outerHTML каждого элемента равен snapshot, ряд «Телефон» виден, hero href === 'tel:+972545490623', открытый вариант подсказки виден. Дополнительно: document.querySelectorAll('a a').length === 0; состояние никогда не 'pending' после ожидания.

Проверка: python -m http.server 8098 (из корня) и python scripts/verify-business-hours.py http://127.0.0.1:8098/build/variants/final-dev4/ → exit 0, PASS на 390 и 1440 в обоих состояниях

### 10. Пересобрать standalone и все Preview, прогнать полный набор гейтов.

Файлы: `site/gambarian-standalone.html`, `build/variants/final-dev4/ (производный)`

python -B scripts/build-preview.py site/gambarian-standalone.html --standalone; build-font-variants; build-hero-variants; build-action-bar; build-review-numbered; затем гейты из блока gates. Убедиться, что build/variants/final-dev4/<адаптер> байт в байт равен источнику в site-addons/final-dev4/ и подключён один раз после action-bar.js; что build/variants/final-dev3/hero-business-hours.js не изменился (git diff site-addons/final-dev3 пуст). Число «&nbsp;—» не меняется этим этапом — сверить с ожиданием verify-live-previews.py.

Проверка: все гейты код 0; git diff --stat site-addons/final-dev3 site-addons/action-bar → пусто; python scripts/qa-browser-matrix.py http://127.0.0.1:8098/ --all-previews → summary PASS, action-bar visibleItemCount open=3/closed=2 без регрессии

### 11. Зафиксировать поведение и решение в документации.

Файлы: `docs/FINAL-QA-CHECKLIST.md`, `docs/CONTENT-EXTRA.md`, `docs/CONTENT-OWNER-EDITS.md`, `docs/tasks/ (документ TASK_PATH final-dev4)`

FINAL-QA-CHECKLIST.md §7 (Action Bar / рабочее время): запись «final-dev4: в closed ни одной tel:-ссылки на странице — шапка (site/), меню, Hero, ряд у формы (скрыт), подсказка ошибки (вариант closed); единственный источник состояния — Action Bar; гейт scripts/verify-business-hours.py»; §2 — версии CLIENT-COPY-CONTRACT и FINAL-DEV4-DESIGN. CONTENT-EXTRA.md: строка «Если ошибка повторяется, напишите в WhatsApp.» как SYSTEM-UI формы, версия/дата документа. CONTENT-OWNER-EDITS.md: решение №25 (2026-09-06) — «в нерабочее время все телефонные ссылки вне Hero заменяются на WhatsApp», с указанием стратегии (замена / скрытие рядом с существующим WhatsApp). Документ TASK_PATH final-dev4: раздел с новым маркером и описанием адаптера (Related уже есть у документа этапа 1).

Проверка: grep -c 'verify-business-hours' docs/FINAL-QA-CHECKLIST.md ≥ 1; grep -rn 'FINAL-DEV4-DESIGN v' docs → только новая версия; git diff --check → пусто

### 12. Закоммитить, запушить, открыть draft PR; после деплоя владельцем выполнить live-приёмку.

Файлы: `.github/PULL_REQUEST_TEMPLATE.md`

Ветка codex/final-dev4-s4-hours от main после слияния PR этапа 3 (пока PR #11 не влит — от codex/final-dev4 с влитым этапом 3). Коммиты вида feat: switch every phone link to WhatsApp outside business hours (final-dev4) / test: add business-hours DOM gate — без идентификаторов моделей. Draft PR в main по шаблону + proof-блок. Деплой запускает владелец: Deploy Previews → ветка этапа → only=final-dev4. До деплоя — SHA-256 final-dev3 и production (curl -sS -A gambarian-readback … | sha256sum; в PowerShell curl.exe + Get-FileHash); после — повторить и сравнить (production 656CBCD0…C13E22), python -B scripts/verify-live-previews.py --only final-dev4, python scripts/verify-business-hours.py https://final-dev4.gambarian-landing.pages.dev/ (demo-переключатель есть на Preview, реальное время не важно), curl final-dev4 | grep -c 'data-business-closed=' → 4 (или 3, если .nav-call вырезан builder-ом — указать фактическое) и grep -c 'FINAL-DEV4-DESIGN v<новая>' ≥ 1. wrangler напрямую не запускать.

Проверка: Draft PR открыт; после деплоя verify-live-previews --only final-dev4 PASS, verify-business-hours по живому адресу PASS, SHA-256 final-dev3 и production до/после совпадают

## Гейты (в этом порядке)

- `python -B scripts/build-preview.py site/gambarian-standalone.html --standalone`
- `python -B scripts/verify-client-copy.py`
- `python -m unittest discover -s scripts/tests`
- `python -B scripts/build-font-variants.py && python -B scripts/build-hero-variants.py && python -B scripts/build-action-bar.py && python -B scripts/build-review-numbered.py`
- `python -B scripts/verify-client-previews.py`
- `node scripts/verify-lead-hook.mjs`
- `python -m http.server 8098 (отдельный терминал, из корня репо) && python scripts/verify-business-hours.py http://127.0.0.1:8098/build/variants/final-dev4/`
- `python scripts/verify-address-links.py http://127.0.0.1:8098/build/variants/final-dev4/ (регрессия этапа 3)`
- `python scripts/qa-browser-matrix.py http://127.0.0.1:8098/build/variants/final-dev4/ --target-name final-dev4`
- `python scripts/qa-browser-matrix.py http://127.0.0.1:8098/ --all-previews`
- `git diff --check`
- `после деплоя владельцем: python -B scripts/verify-live-previews.py --only final-dev4`
- `после деплоя: python scripts/verify-business-hours.py https://final-dev4.gambarian-landing.pages.dev/`
- `после деплоя: curl -sS -A gambarian-readback https://final-dev3.gambarian-landing.pages.dev/ | sha256sum и curl -sS -A gambarian-readback https://gambarian-landing.pages.dev/ | sha256sum — совпадают с замером до деплоя (production 656CBCD0…C13E22)`

## Версии и маркеры

- FINAL-DEV4-DESIGN: минорный bump (например 1.0.0 → 1.1.0) + дата — scripts/final_dev4_contract.py (VERSION/DATE), заголовок адаптера в site-addons/final-dev4/, документы TASK_PATH и BOARD_PATH (docs/boards/2026-08-06-versions-links.md), HTML/CSS-маркеры сборки через builder
- CLIENT-COPY-CONTRACT: следующий patch после этапа 3 (1.3.1 → 1.3.2) + дата — client_copy_contract.py:3 и :11–12 и все документы по grep 'CLIENT-COPY-CONTRACT v'
- BUSINESS-HOURS-GATE v1.0.0 | <дата> — заголовок нового scripts/verify-business-hours.py
- CONTENT-EXTRA и CONTENT-OWNER-EDITS — следующие версии/даты документов
- Не меняются: ACTION-BAR-SPEC (2.4.0 или версия после этапа 1), FINAL-DEV3-DESIGN 2.0.2, LIVE-PREVIEW-READBACK, PREVIEW-BROWSER-QA-RUNNER 1.4.2 (runner 1.5.0 — этап 6)

## Приёмка этапа

- [ ] verify-business-hours.py PASS на 390 и 1440: в closed (принудительно через [data-business-demo]) число a[href^="tel:"] вне [hidden] по DOM = 0 и видимых = 0 — включая открытое мобильное меню и показанную ошибку доставки формы (мок 503)
- [ ] В closed каждый [data-business-closed="whatsapp"] имеет href/target/rel Action Bar WhatsApp, data-action="whatsapp_click", aria-label и текст «Написать в WhatsApp», иконку WhatsApp; ряд «Телефон» у формы скрыт; подсказка ошибки показывает вариант «…напишите в WhatsApp.»
- [ ] closed → open восстанавливает исходную разметку: outerHTML всех целей и подсказки равны snapshot; hero href = tel:+972545490623; ряд «Телефон» виден
- [ ] Адаптер final-dev4 — только observer на .mobile-bar[data-business-state]: нет setTimeout/setInterval/DateTimeFormat/localStorage/sessionStorage/location.search/URLSearchParams; в сборке подключён один раз после action-bar.js и байт в байт равен источнику
- [ ] site-addons/final-dev3/ и site-addons/action-bar/ не изменены (git diff пуст); production в site/ без адаптера ведёт себя как раньше (закрытый вариант подсказки hidden, атрибуты инертны)
- [ ] FINAL-DEV4-DESIGN: одна новая версия/дата в contract.py, адаптере, TASK_PATH, BOARD_PATH и собранных HTML/CSS/JS final-dev4; verify-client-previews PASS с обновлёнными required-токенами
- [ ] CLIENT-COPY-CONTRACT: patch bump с новой SYSTEM-UI строкой, одна версия/дата во всех источниках маркера; verify-client-copy PASS; unit-тесты OK; verify-lead-hook PASS
- [ ] qa-browser-matrix --all-previews PASS: без overflow на 360/390/960/961/1440; action-bar open=3/closed=2 без регрессии; verify-address-links PASS (этап 3 не сломан)
- [ ] После деплоя only=final-dev4: verify-live-previews --only final-dev4 PASS; verify-business-hours по живому адресу PASS; SHA-256 final-dev3 и production до/после совпадают
- [ ] Документы: FINAL-QA-CHECKLIST §7 и §2, CONTENT-EXTRA, CONTENT-OWNER-EDITS (№25), документ FINAL-DEV4-DESIGN обновлены

## Отчёт в PR (обязательные поля)

- Хэш коммита(ов) и подтверждение push в codex/final-dev4-s4-hours; ссылка на draft PR
- Diff-доказательство: git show --stat; фрагменты — атрибуты data-business-closed в site/index.html, два варианта подсказки ошибки, CSS [hidden], адаптер (renderClosed/renderOpen), токены проверок, версии
- Вывод гейтов: verify-client-copy, unittest, verify-client-previews, verify-lead-hook, build-review-numbered, verify-business-hours (390/1440, JSON Lines), verify-address-links, qa-browser-matrix summary
- Подтверждение, что git diff site-addons/final-dev3 site-addons/action-bar пуст; число «&nbsp;—» в build/variants/final-dev4/index.html
- Проверено / Не проверено: до деплоя — только локальная сборка; после деплоя — verify-live-previews --only final-dev4, verify-business-hours по живому адресу, SHA-256 final-dev3 и production до/после
- Статус строк списка владельцев 72–74, 90–91, 94 («нерабочее время»), 96 («Связь») со ссылкой на коммит
- Вопросы владельцу (не блокируют): формулировка подсказки ошибки в закрытом состоянии «Если ошибка повторяется, напишите в WhatsApp.»; ряд «Телефон» у формы в закрытом состоянии скрыт (WhatsApp-ряд остаётся), а не дублируется вторым WhatsApp; если Action Bar не знает body class dev4 (латч) — дефект этапа 1

## Риски

- Если этап 1 не расширил латч finalDev3TopOnly в action-bar.js на body class dev4, панель на dev4 ведёт себя как на final-dev (без латча) — не в скоупе этапа 4, зафиксировать в отчёте как дефект этапа 1
- Переименование файла адаптера тянет правки DYNAMIC_UI_PATHS, контракта, builder-а и verify — имя файла оставить как после этапа 1, расширять содержимое
- Скрытие ряда «Телефон» вместо дублирования WhatsApp — архитектурное прочтение «как в Action Bar»; подтвердить у владельца в PR, переделка на «замену» — одна ветка renderClosed
- Новый SYSTEM-UI фрагмент подсказки — не клиентский текст, но новая строка на странице: явно показать владельцу в отчёте
- Авторское display:flex у .contact-list__row перебивает UA [hidden] — без правила .contact-list__row[hidden]{display:none} ряд останется видимым и гейт упадёт
- Demo-переключатель на 390 скрыт до прохода Hero — кликать через page.evaluate(...click()), а не locator.click()
- Если этап 1 распространил dev3-проверки runner-а (businessSnapshot) на dev4 — обобщённый renderClosed обязан сохранить для Hero aria-label/текст «Написать в WhatsApp», data-action whatsapp_click, иконку бара и один <a> в .hero__phone (текущая схема это обеспечивает)
- Восстановление через innerHTML теряет обработчики на детях — у целей их нет (как в dev3); проверять equality outerHTML в гейте
- Реальное состояние в момент прогона зависит от времени Asia/Jerusalem — гейт всегда принудительно проходит closed→open→closed через demo, а не полагается на часы
- Мок 503 для /api/lead в Playwright: route должна быть задана до submit; ошибка должна показать .lead-form__error-contact (showContact=true только для delivery-ошибок, не для 422)
- Workflow с пустым only опубликует все alias, включая final-dev3 — only=final-dev4 обязательно

## Проверка карточки критиком

скоуп: ок; пути: ЗАМЕЧАНИЯ; гейты: ок; промпт: ЗАМЕЧАНИЯ.

Правки критика, обязательные к применению исполнителем:

- Добавить шаг «Завести собственный адаптер dev4»: git mv/копия site-addons/final-dev3/hero-business-hours.js → site-addons/final-dev4/hero-business-hours.js с маркером FINAL-DEV4-DESIGN; в final_dev4_contract.py задать HERO_BUSINESS_SCRIPT/HERO_BUSINESS_SCRIPT_TAG (то же имя файла), TASK_PATH и списки SCRIPT_REQUIRED/FORBIDDEN_TOKENS dev4; в build-hero-variants.py: FINAL_DEV4_ADDON и копирование для dev4 из него (условие `if key == "dev4"` отдельно от dev3), в verify() отдельный блок dev4 с байт-сравнением против site-addons/final-dev4 и dev4-токенами; в verify-client-previews.py verify_final_dev4 сравнивать с site-addons/final-dev4 и dev4-токенами; в verify-client-copy.py DYNAMIC_UI_PATHS += site-addons/final-dev4/hero-business-hours.js
- Исправить «PREVIEW-BROWSER-QA-RUNNER 1.4.1» → 1.4.2
- Переписать пункт про Action Bar: класс page--final-dev3 в body dev4 сохраняется намеренно (латч finalDev3TopOnly), Action Bar 2.4.0 не бампится; либо перенести этот bump в карточку явно
- В промпте заменить «созданы этапом 1» на «создать в этом этапе по шагу N»

Логика адаптера, разметка data-business-closed (строки ~54/~64/~93/~505/~526 совпадают), CSS :1139, DYNAMIC_UI_PATHS :56–61, токены Action Bar ([data-business-demo], data-business-action phone/whatsapp/booking) и dev3-адаптера (MutationObserver/attributeFilter/hero__call-num/data-hero-business-state) подтверждены. Дефект структурный: карточка опирается на инфраструктуру dev4-адаптера, которую этап 1 явно отложил на этап 4, а этап 4 считает уже сделанной.

## Промпт для Codex

Вставить в Codex CLI в корне репозитория на ветке этапа:

```text
Ты исполнитель этапа 4 «Нерабочее время: все tel: вне Hero → WhatsApp» версии final-dev4 лендинга «Гамбарян и партнёры». Работай в корне репозитория, уровень рассуждений high.
Сначала прочитай по порядку: AGENTS.md; docs/RESUME.md («Следующий цикл»); docs/CODEX-WORKING-MODEL.md; docs/tasks/codex/2026-09-06-final-dev4-stage-4.md (карточка этапа, целиком); в docs/tasks/2026-09-06-final-dev4-spec.md — «Реестр решений владельца» (№25), «Что затрагивает контракты», «Правила для исполнителя», «Приёмка»; в docs/tasks/2026-09-06-final-dev4-items.md — D:D-05, E:G-03, F:M-05; docs/FINAL-QA-CHECKLIST.md §7. Затем код: site-addons/action-bar/action-bar.js (состояние data-business-state — единственный источник), site-addons/final-dev3/hero-business-hours.js (образец адаптера, НЕ менять), scripts/final_dev4_contract.py и адаптер в site-addons/final-dev4/ (создать в этом этапе (шаг 2 карточки «Завести собственный адаптер dev4»)), scripts/build-hero-variants.py и scripts/verify-client-previews.py (токены проверок dev4), scripts/verify-client-copy.py (DYNAMIC_UI_PATHS), site/index.html строки с tel: и .lead-form__error-contact, site/app.js (showFormError).
Предусловие: влиты этапы 1–3 (в <footer> нет tel:, есть alias final-dev4 и маркер FINAL-DEV4-DESIGN). Если нет — остановись на этом пункте и напиши в отчёт.
Ветка codex/final-dev4-s4-hours от main после слияния этапа 3 (пока PR #11 не влит — от codex/final-dev4). Draft PR в main по .github/PULL_REQUEST_TEMPLATE.md.
Сделай (правки только в site/, site-addons/final-dev4/, scripts/, docs/; build/ руками не править):
1. site/index.html: добавить data-business-closed="whatsapp" на a.nav-call, a.nav-drawer__call, a.hero__call; data-business-closed="hide" на a.contact-list__row[href^="tel:"] (атрибуты после class="…"). Подсказку .lead-form__error-contact разбить на <span data-business-variant="open">текущий текст дословно</span><span data-business-variant="closed" hidden>Если ошибка повторяется, напишите в <a href="https://wa.me/972545490623" target="_blank" rel="noopener">WhatsApp</a>.</span>.
2. site/styles.css: .contact-list__row[hidden] { display: none; } — больше ничего.
3. Адаптер dev4 (имя файла оставить как после этапа 1): вместо одной цели Hero обрабатывать все [data-business-closed] и [data-business-variant]; closed: для 'whatsapp' — href/target/rel из бара [data-business-action="whatsapp"], data-action='whatsapp_click', aria-label и подпись «Написать в WhatsApp», клон svg бара, для Hero — как в dev3 (класс подписи hero__call-num, data-hero-business-state на .hero__phone); для 'hide' — hidden; варианты подсказки — hidden по состоянию; open — восстановить атрибуты и innerHTML; pending — ничего. Только MutationObserver на data-business-state; запрещены setTimeout/setInterval/DateTimeFormat/localStorage/sessionStorage/location.search/URLSearchParams. Маркер FINAL-DEV4-DESIGN с минорным bump и датой; тот же маркер в scripts/final_dev4_contract.py и в документах TASK_PATH/BOARD_PATH. Required-токены dev4 в build-hero-variants.py и verify-client-previews.py заменить на новые ('[data-business-closed]', '[data-business-variant]' и остальные из карточки). final-dev3 и action-bar не трогать.
4. scripts/client_copy_contract.py: ALLOWED_OUTSIDE_COPY_TEXT += «Если ошибка повторяется, напишите в»; patch bump версии и даты с синхронизацией всех маркеров (grep -rn 'CLIENT-COPY-CONTRACT v' docs scripts); тест в scripts/tests/test_verify_client_copy.py, что открытый вариант подсказки и номер остались в site/index.html.
5. Новый гейт scripts/verify-business-hours.py (Playwright, маркер BUSINESS-HOURS-GATE v1.0.0 | дата) по шагу 8 карточки: 390 и 1440; принудительные состояния через [data-business-demo] (JS-клик в page.evaluate); в closed — ноль a[href^="tel:"] вне [hidden] и ноль видимых, включая открытое меню и ошибку доставки (route /api/lead → 503, submit); проверка атрибутов/иконок WhatsApp-замен, скрытого ряда «Телефон», варианта подсказки, панели (phone hidden); в open — outerHTML равен snapshot.
6. Пересобрать: python -B scripts/build-preview.py site/gambarian-standalone.html --standalone; build-font-variants, build-hero-variants, build-action-bar, build-review-numbered. Гейты: verify-client-copy; python -m unittest discover -s scripts/tests; verify-client-previews; node scripts/verify-lead-hook.mjs; python -m http.server 8098 из корня и python scripts/verify-business-hours.py http://127.0.0.1:8098/build/variants/final-dev4/; python scripts/verify-address-links.py по тому же адресу; qa-browser-matrix для final-dev4 и --all-previews; git diff --check; git diff site-addons/final-dev3 site-addons/action-bar → пусто.
7. Документы: docs/FINAL-QA-CHECKLIST.md (§7 запись о dev4 и гейте, §2 версии), docs/CONTENT-EXTRA.md (новый SYSTEM-UI фрагмент), docs/CONTENT-OWNER-EDITS.md (решение №25), документ TASK_PATH final-dev4 (новый маркер, описание адаптера).
Не делай: не меняй расписание/таймзону/таймер и файлы Action Bar и final-dev3; не вводи тексты «офис закрыт», часы работы и другие новые формулировки; не трогай frozen source, production, build/; не запускай wrangler; не переименовывай файл адаптера.
Коммиты вида feat: switch every phone link to WhatsApp outside business hours; test: add business-hours DOM gate — без идентификаторов моделей.
Отчёт в PR: хэш и push; список файлов и суть изменений; вывод каждого гейта (JSON Lines verify-business-hours для 390 и 1440); подтверждение, что dev3/action-bar не изменены; «Проверено / Не проверено / Вопросы владельцу» (формулировка подсказки в closed; скрытие ряда «Телефон» вместо второго WhatsApp; латч Action Bar для dev4, если он не учтён этапом 1). Деплой делает владелец (Actions → Deploy Previews → ветка этапа → only=final-dev4). До деплоя сними SHA-256 final-dev3 и production (curl -sS -A gambarian-readback … | sha256sum; в PowerShell — curl.exe и Get-FileHash). После деплоя: python -B scripts/verify-live-previews.py --only final-dev4; python scripts/verify-business-hours.py https://final-dev4.gambarian-landing.pages.dev/; повтори SHA-256 — должны совпасть (production 656CBCD0…C13E22); допиши proof-блок в PR.
```

## Related

- [Модель работы с Codex](../../CODEX-WORKING-MODEL.md)
- [Задание final-dev4](../2026-09-06-final-dev4-spec.md)
- [Разбор по пунктам](../2026-09-06-final-dev4-items.md)
- [Реестр текстов владельца](../../CONTENT-OWNER-REVISIONS-2026-09-06.md)
- [Рекомендации дизайнеров](../../DESIGN-RECOMMENDATIONS-2026-09-06.md)

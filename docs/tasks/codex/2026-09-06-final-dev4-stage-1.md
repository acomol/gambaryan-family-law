# Этап 1: Подготовка: alias final-dev4, per-alias readback, синхронизация маркеров, чистка, каркас документов

**Версия:** `FINAL-DEV4-STAGE-1 v1.0.0`

**Дата:** `2026-09-06`

**Ветка:** `codex/final-dev4-s1-prep` → draft PR в `main`

**Исполнитель:** Codex CLI; уровень рассуждений: **high (контракты, скрипты, поведение)** — Этап меняет контракты и гейты (карта Preview, review-numbered builder, live readback, runner, verifier) и добавляет новый versioned-модуль; ошибки здесь ломают все последующие этапы, поэтому нужен уровень high, хотя контента нет.

**Приёмка:** Claude (облачная сессия) по `docs/CODEX-WORKING-MODEL.md`; слияние — владелец.

## Цель

Ветка codex/final-dev4-s1-prep без единой контентной правки: alias final-dev4 заведён во всех картах, счётчиках, builder-е и workflow с собственным маркером FINAL-DEV4-DESIGN v1.0.0; verify-live-previews.py ждёт число защищённых тире per-alias и проверяет белое «прецедента» только пока в живой разметке есть .fact-card__unit 2.10; все расходящиеся маркеры версий сведены к фактическим значениям кода; мёртвые селекторы 2.14, комментарий app.js и verify-fact-cards.mjs убраны; CONTENT-OWNER-EDITS.md v1.1.0 закрывает долг по yulia-card-v1; все будущие owner-id предзарегистрированы в OWNER_REVIEW_IDS, а review-numbered builder больше не зависит от жёстких токенов разметки. На выходе build/variants/final-dev4 собирается и проходит все гейты, live-содержимое final-dev4 после деплоя байт в байт равно текущему site/ (то есть final-dev3) плюс маркер dev4.

## Основание

- Решения владельца (реестр в `../2026-09-06-final-dev4-spec.md`): №9
- Пункты разбора (`../2026-09-06-final-dev4-items.md`): `A:HF-08`

## Не в скоупе этапа

- Любые правки текстов владельца (строки списка 7–67) — этап 2; адрес/лицензия в JSON-LD и aria-label, подвал — этап 3; нерабочее время — этап 4
- site-addons/final-dev4/ и новый business-hours adapter — этап 4 (в этом этапе final-dev4 копирует site-addons/final-dev3/hero-business-hours.js как есть)
- Bump Action Bar 2.4.0 и собственная поддержка класса page--final-dev4 в action-bar.js — этап 4; сейчас final-dev4 наследует latch через класс page--final-dev3
- Runner 1.5.0 с новыми гейтами (toggle-missing, свайп, одна строка табов, отступы) — этап 6; здесь только patch 1.4.2 (12-й target)
- Скрипты замеров (measure-fonts.py, measure-section-gaps.py), гейт тире по 57 ширинам, порт verify-live-surface.py — подготовительные шаги 4–7 spec, отдельные задачи
- Новые документы docs/tasks/<дата>-fact-cards-hierarchy.md и <дата>-mobile-services.md — пишет архитектор к этапам 5–6
- Открытые вопросы №1, №2, №3, №15 («Защита при угрозах»), №18 — не трогать
- Пересборка/деплой final-dev3 и production; запуск wrangler; поле only пустым

## Шаги

### 1. Создать ветку этапа от codex/final-dev4 и убедиться, что рабочее дерево чистое.

Файлы: `AGENTS.md`, `docs/RESUME.md`, `docs/CODEX-WORKING-MODEL.md`

git fetch origin && git checkout codex/final-dev4 && git pull --ff-only && git checkout -b codex/final-dev4-s1-prep. Прочитать AGENTS.md → docs/RESUME.md (раздел «Следующий цикл») → docs/CODEX-WORKING-MODEL.md → эту карточку → spec разделы «Подготовительные шаги» (шаги 1–3, 8–9) и «Правила для исполнителя». Установить зависимости: python -m pip install -r requirements-build.txt && python -m playwright install chromium && npm ci.

Проверка: git branch --show-current → codex/final-dev4-s1-prep; git status --short → пусто

### 2. Завести alias final-dev4 в исполняемой карте Preview.

Файлы: `scripts/client-preview-map.json`

В массив previews после записи final-dev3 добавить {"branch": "final-dev4", "directory": "build/variants/final-dev4"}. Поле version «2.4.0» → «2.5.0», updated → дата коммита этапа (YYYY-MM-DD, далее <ДАТА>; одна и та же дата во всех маркерах этапа). action_bar_* и client_preview_mobile_* не трогать.

Проверка: python -c "import json;m=json.load(open('scripts/client-preview-map.json'));print(m['version'],m['updated'],len(m['previews']),[p['branch'] for p in m['previews']][3])" → 2.5.0 <ДАТА> 12 final-dev4

### 3. Создать versioned-контракт final-dev4 как наследника final-dev3.

Файлы: `scripts/final_dev4_contract.py (новый)`, `scripts/final_dev3_contract.py`

По образцу scripts/final_dev3_contract.py: VERSION = "1.0.0", DATE = "<ДАТА>", MARKER = f"FINAL-DEV4-DESIGN v{VERSION} | {DATE}", MARKER_RE = re.compile(r"FINAL-DEV4-DESIGN v(\d+\.\d+\.\d+) \| (\d{4}-\d{2}-\d{2})"), BOARD_PATH = "docs/boards/2026-08-06-versions-links.md", BODY_CLASS = "page--final-dev4", HTML_COMMENT = f"<!-- {MARKER} -->", CSS_COMMENT = f"/* {MARKER} */", BODY_TAG = '<body class="page--final-dev3 page--final-dev4">' (импортировать BODY_CLASS и HTML_COMMENT из final_dev3_contract), BODY_MARKER_SNIPPET = f"{BODY_TAG}\n{DEV3_HTML_COMMENT}\n{HTML_COMMENT}", CSS_MARKER_SNIPPET = f"\n{CSS_COMMENT}\n". apply_html_contract(html): ожидает ровно один фрагмент '<body class="page--final-dev3">\n' + DEV3_HTML_COMMENT (иначе ValueError «final-dev4 применяется поверх final-dev3»), запрещает повторное применение (MARKER или BODY_CLASS уже в html), заменяет фрагмент на BODY_MARKER_SNIPPET. apply_css_contract(css): запрет повтора, css + CSS_MARKER_SNIPPET. Класс page--final-dev3 сохраняется намеренно: Action Bar 2.4.0 включает scoped latch только по нему (action-bar.js: finalDev3TopOnly); собственная поддержка page--final-dev4 — этап 4.

Проверка: python -c "import sys;sys.path.insert(0,'scripts');import final_dev4_contract as c;print(c.MARKER, c.BODY_TAG)" → FINAL-DEV4-DESIGN v1.0.0 | <ДАТА> <body class="page--final-dev3 page--final-dev4">

### 4. Добавить вариант dev4 в builder Hero-вариантов.

Файлы: `scripts/build-hero-variants.py`, `site-addons/final-dev3/hero-business-hours.js`

Импортировать из final_dev4_contract (VERSION/DATE/MARKER_RE/HTML_COMMENT/CSS_COMMENT/BODY_TAG/apply_html_contract/apply_css_contract). def variant_final_dev4(html): html, css = variant_final_dev3(html); return apply_final_dev4_html_contract(html), apply_final_dev4_css_contract(css). VARIANTS["dev4"] = ("final-dev4", "final-dev4: наследник final-dev3 с правками владельцев 2026-09-06", variant_final_dev4) — после dev3. В build(): условие `if key == "dev3":` (копирование hero-business-hours.js из FINAL_DEV3_ADDON + apply_final_dev3_script_contract) → `if key in {"dev3", "dev4"}:`. В verify(): блок `if key in {"dev1", "dev3"}` → `{"dev1", "dev3", "dev4"}`; блок `if key == "dev3":` → `in {"dev3", "dev4"}`; добавить блок `if key == "dev4":` — MARKER_RE.findall(html) == [(VERSION, DATE)] и то же для styles; html.count(HTML_COMMENT) == 1; styles.count(CSS_COMMENT) == 1; html.count(BODY_TAG) == 1. Docstring модуля: добавить строку про dev4 и в пример запуска.

Проверка: python -B scripts/build-hero-variants.py → 5 вариантов, у каждого «проверка пройдена»; grep -c 'FINAL-DEV4-DESIGN' build/variants/final-dev4/index.html build/variants/final-dev4/styles.css → 1 и 1; grep -c 'FINAL-DEV4' build/variants/final-dev3/index.html → 0; cmp build/variants/final-dev4/hero-business-hours.js site-addons/final-dev3/hero-business-hours.js → без вывода

### 5. Научить verify-client-previews.py проверять final-dev4 и карту 2.5.0.

Файлы: `scripts/verify-client-previews.py`, `docs/boards/2026-08-06-versions-links.md`

MAP_VERSION = "2.5.0", MAP_DATE = "<ДАТА>"; EXPECTED_PREVIEWS += "final-dev4": "build/variants/final-dev4" (после final-dev3). Импорт final_dev4_contract. Новая функция verify_final_dev4(dest): html.count(FINAL_DEV4_HTML_COMMENT) == 1; css.count(FINAL_DEV4_CSS_COMMENT) == 1; html.count(FINAL_DEV4_BODY_TAG) == 1; FINAL_DEV4_MARKER_RE.findall(html) == [(V, D)] и для css; унаследованные маркеры final-dev3 присутствуют по одному разу (FINAL_DEV3_HTML_COMMENT, FINAL_DEV3_CSS_COMMENT); FINAL_DEV3_HERO_BUSINESS_SCRIPT_TAG ровно 1 раз и после ACTION_BAR_SCRIPT_TAG; файл hero-business-hours.js в сборке байт в байт равен site-addons/final-dev3/hero-business-hours.js. Новая verify_final_dev4_sources(): BOARD_PATH содержит FINAL_DEV4_MARKER. В main(): problems.extend(verify_final_dev4_sources()); условие `if branch in {"final-dev1", "final-dev3"}: verify_final_dev1` → добавить "final-dev4"; `if branch == "final-dev4": problems.extend(f"{branch}: {p}" for p in verify_final_dev4(dest))`. Проверку review-numbered `review_labels != list(OWNER_REVIEW_IDS.values())` заменить на сравнение со списком меток owner-id, реально присутствующих в site/index.html в порядке источника: `[OWNER_REVIEW_IDS[v] for kind, v in re.findall(...) if kind == "owner-copy"]` (иначе предрегистрация шага 7 сломает гейт). В docs/boards/2026-08-06-versions-links.md: в таблицу «Ссылки и различия» строка `| 12 | final-dev4 | Наследник final-dev3 + правки владельцев 2026-09-06 (в работе, spec v0.3.0) | https://final-dev4.gambarian-landing.pages.dev/ |`; в «Версии контрактов» строка `| final-dev4 | 1.0.0 | <ДАТА> | LOCAL PASS |`; ниже строки Marker final-dev3 добавить `Marker final-dev4: FINAL-DEV4-DESIGN v1.0.0 | <ДАТА>`.

Проверка: после всех builder-ов (шаг 15): python -B scripts/verify-client-previews.py → PASS «… во всех 12 клиентских Preview-артефактах»; временно сломать маркер в board → FAIL с текстом про final-dev4, вернуть

### 6. Поднять ожидание числа alias в verify-client-copy.py и версию верификатора.

Файлы: `scripts/verify-client-copy.py`

EXPECTED_PREVIEW_ALIASES = 12; docstring строки 2–4: «… в source и 12 Preview-артефактах.» и маркер `CLIENT-COPY-VERIFIER v1.1.0 | <ДАТА>`; VERIFIER_VERSION = "1.1.0", VERIFIER_DATE = "<ДАТА>". Логику не менять.

Проверка: python -B scripts/verify-client-copy.py → PASS CLIENT-COPY-VERIFIER v1.1.0 | <ДАТА>: 26 HTML targets, 24 unique files, … owner-approved 2 block; contract v1.2.0 | 2026-08-16

### 7. Предзарегистрировать все owner-id этапов 2 и 5 и сделать review-numbered builder независимым от жёстких токенов разметки.

Файлы: `scripts/review_numbered_contract.py`, `scripts/build-review-numbered.py`

review_numbered_contract.py: REVIEW_NUMBERED_VERSION = "2.1.0", REVIEW_NUMBERED_UPDATED = "<ДАТА>". OWNER_REVIEW_IDS (метка = номер заменяемого клиентского блока; порядок как в source): "fact-30-v1": "2.6", "fact-precedent-v1": "2.10", "fact-900-v1": "2.14", "fact-900-v2": "2.14", "svc-h2-v1": "3.H2", "svc-divorce-title-v1": "3.7", "svc-divorce-lead-v1": "3.8", "svc-children-lead-v1": "3.18", "svc-paternity-title-v1": "3.22", "svc-paternity-lead-v1": "3.23", "svc-property-lead-v1": "3.28", "svc-mediation-lead-v1": "3.33", "svc-prenup-lead-v1": "3.38", "svc-protection-lead-v1": "3.43", "precedent-title-v1": "4.5", "precedent-body-v1": "4.6", "alexander-card-v1": "5.9–5.13", "yulia-card-v1": "5.18", "yulia-card-v2": "5.18", "attorneys-note-v1": "5.19". Новый словарь OWNER_REVIEW_ANCHORS = {"fact-900-v1": '<span class="fact-card__unit">Автор</span>', "yulia-card-v1": '<h3 class="attorney-card__name">Юлия Саакян</h3>'} — где бейдж ставится на дочерний элемент, а не на контейнер. build-review-numbered.py: _add_owner_review_ids переписать обобщённо: для каждого `data-owner-copy-id="X"` в порядке появления взять label = OWNER_REVIEW_IDS[X] (KeyError → SystemExit «owner-id X не зарегистрирован в OWNER_REVIEW_IDS»); если X в OWNER_REVIEW_ANCHORS — найти anchor после позиции контейнера (не найден → SystemExit) и вставить ` data-review-id="label"` в его открывающий тег; иначе вставить ` data-review-id="label"` сразу после атрибута data-owner-copy-id на том же элементе. В verify(): expected_review_ids = [OWNER_REVIEW_IDS[v] for v in owner-id источника в порядке source] вместо list(OWNER_REVIEW_IDS.values()); сообщение об ошибке сохранить. main(): счётчик owner печатать по owner-id, реально найденным в source.

Проверка: python -B scripts/build-review-numbered.py → «Проверка пройдена»; grep -o 'data-review-id="[^"]*"' build/variants/review-numbered/index.html → ровно две строки: 2.14, 5.18 в этом порядке; python -c "import sys;sys.path.insert(0,'scripts');from review_numbered_contract import OWNER_REVIEW_IDS as o;print(len(o))" → 20

### 8. Перевести verify-live-previews.py на per-alias ожидание тире и условную проверку 2.10.

Файлы: `scripts/verify-live-previews.py`

Заменить NBSP_EXPECTED/NBSP_EXPECTED_REVIEW_NUMBERED на: NBSP_EXPECTED_DEFAULT = 23 и NBSP_EXPECTED = {"review-numbered": 22, "final-dev4": 23} с комментарием: значение alias = число «&nbsp;—» в релизе, который этот alias отдаёт; для final-dev4 пересчитывать после каждой текстовой правки командой grep -o '&nbsp;—' build/variants/final-dev4/index.html | wc -l; в check_preview: expected = NBSP_EXPECTED.get(branch, NBSP_EXPECTED_DEFAULT). Проверку белого «прецедента» (regex по .fact-card__unit 2.10 в 2 медиаблоках) выполнять только если в живой разметке есть маркер `class="fact-card__unit">прецедента</span>`; иначе пропускать (после перестройки кубиков в этапе 5 появится своя проверка). Docstring строка 4 → `LIVE-PREVIEW-READBACK v1.2.0 | <ДАТА>`; READBACK_VERSION = "1.2.0"; в docstring добавить пример `--only final-dev4`.

Проверка: python -B scripts/verify-live-previews.py --only final-dev3 → PASS final-dev3, PASS production (живая проверка сети: скрипт не сломан); python -B scripts/verify-live-previews.py --only final-dev4 → код 1 с «страница недоступна»/HTTP-ошибкой, но НЕ код 2 «Неизвестный alias» (alias ещё не опубликован)

### 9. Добавить final-dev4 в browser QA runner как 12-й target и распространить на него гейты final-dev3.

Файлы: `scripts/qa-browser-matrix.py`

PREVIEWS: после Target("final-dev3", …, True) добавить Target("final-dev4", "build/variants/final-dev4", True) (EXPECTED_FONTS подхватит его автоматически). Три условия `target.name == "final-dev3"` (≈:809 mobile-form/business-sync блок, ≈:1033 marker/body-class блок, ≈:1115 сбор finalDev3BarVisibility) → `target.name in {"final-dev3", "final-dev4"}`; имена failure-меток не менять. RUNNER_VERSION = "1.4.2"; docstring строка 2 → `PREVIEW-BROWSER-QA-RUNNER v1.4.2 | <ДАТА>`; строка 15: «The twelve-target aggregate is 120/120 + 60/60 + 10/10 + 4/4»; help --all-previews: «run 12 Preview targets plus the 10-cell large-desktop subset».

Проверка: python -m http.server 8098 (фон) && python scripts/qa-browser-matrix.py http://127.0.0.1:8098/ --all-previews → summary total 194/194, exit 0; python scripts/qa-browser-matrix.py http://127.0.0.1:8098/build/variants/final-dev4/ --target-name final-dev4 → все cells PASS

### 10. Обновить счётчики «11 Preview» в workflow, deploy-скрипте и инструкциях.

Файлы: `.github/workflows/deploy-previews.yml`, `scripts/deploy-previews.sh`, `docs/DEPLOY.md`, `docs/RESUME.md`, `docs/CODEX-WORKING-MODEL.md`

deploy-previews.yml:3 «Публикация 12 клиентских Preview…», :25 description «Один alias (пусто = все 12)»; deploy-previews.sh:12–13 комментарий «Preview-адресов двенадцать … Двенадцать команд руками — двенадцать шансов…»; docs/DEPLOY.md:85 заголовок «Preview: все двенадцать одной командой»; docs/RESUME.md:32 «…или пусто для всех 12» и :83–84 «…пусто для всех 12»; docs/CODEX-WORKING-MODEL.md:93 «публикует все двенадцать alias». README.md:33 и CLIENT-PREVIEW-HANDOFF.md описывают исторический пакет из 11 — не трогать.

Проверка: grep -n '11' .github/workflows/deploy-previews.yml | grep -v 'v11\|2011' → пусто; grep -n 'одиннадцать' scripts/deploy-previews.sh docs/DEPLOY.md → пусто

### 11. Синхронизировать расходящиеся маркеры версий с фактическим кодом (без bump контракта копирайта).

Файлы: `scripts/client_copy_contract.py`, `docs/RESUME.md`, `docs/CONTENT-APPROVED.md`, `docs/CONTENT-SOURCE-MAP.md`, `docs/boards/2026-08-06-versions-links.md`, `docs/FINAL-QA-CHECKLIST.md`, `docs/tasks/2026-08-13-dark-fact-cards.md`

client_copy_contract.py:3 → `CLIENT-COPY-CONTRACT v1.2.0 | 2026-08-16` (CONTRACT_VERSION/DATE :11–12 уже такие; не менять). Таблица «Текущие локальные контракты» docs/RESUME.md:119–131: Client Copy contract `1.2.0`; Client Copy verifier `1.1.0`; Review Numbered `2.1.0`; Browser QA runner `1.4.2` (`194/194`); добавить строку `| final-dev4 Design | 1.0.0 | LOCAL PASS |`. docs/CONTENT-APPROVED.md:25 → `v1.2.0` / `v1.1.0`: 26 targets / 24 unique / 45 client + 2 owner. docs/CONTENT-SOURCE-MAP.md:40–42 → `CLIENT-COPY-CONTRACT v1.2.0 | 2026-08-16`, `CLIENT-COPY-VERIFIER v1.1.0 | <ДАТА>`, `26 targets / 24 unique`. boards «Версии контрактов»: Client Copy contract `1.2.0` 2026-08-16; verifier `1.1.0` <ДАТА>; Review numbering `2.1.0` <ДАТА>; Browser QA runner `1.4.2` <ДАТА> `LOCAL PASS 194/194`. docs/FINAL-QA-CHECKLIST.md:55–56, :62, :65 те же значения; версию чек-листа 2.3.1 → 2.3.2, дата <ДАТА>. docs/tasks/2026-08-13-dark-fact-cards.md:80 → `CLIENT-COPY-CONTRACT v1.2.0 | 2026-08-16`, версию документа DARK-FACT-CARDS 1.0.1 → 1.0.2 с датой. Файлы docs/reviews/*, CLIENT-PREVIEW-HANDOFF.md, ERRORS.md — история, не трогать.

Проверка: grep -rn 'CLIENT-COPY-CONTRACT v' scripts docs --include=*.py --include=*.md | grep -v 'docs/reviews\|HANDOFF\|ERRORS\|final-dev4-\|OWNER-EDITS' → везде v1.2.0 | 2026-08-16; grep -rn 'Browser QA runner\|PREVIEW-BROWSER-QA-RUNNER v' docs/RESUME.md docs/boards docs/FINAL-QA-CHECKLIST.md scripts/qa-browser-matrix.py → везде 1.4.2

### 12. Чистка до контентного diff: мёртвые селекторы 2.14, комментарий app.js, verify-fact-cards.mjs.

Файлы: `site/styles.css`, `site/app.js`, `scripts/verify-fact-cards.mjs`, `docs/FINAL-QA-CHECKLIST.md`, `site/gambarian-standalone.html`

site/styles.css: удалить четыре строки-селектора `.fact-card[data-copy-id="2.14"] .fact-card__head,` (:657, :1572) и `.fact-card[data-copy-id="2.14"] .fact-card__num,` (:663, :1596); правила для fact-900-v1 и их тела остаются (в index.html вхождений 2.14 нет). site/app.js:602 комментарий «на <=720px абзац» → «на <=860px абзац» (matchMedia :615 уже 860). git rm scripts/verify-fact-cards.mjs (red на текущем site/, не гейт, playwright-core не объявлен). docs/FINAL-QA-CHECKLIST.md:683 → `- [x] закрыто <ДАТА>: verify-fact-cards.mjs удалён; действующий гейт аккордеона — scripts/qa-browser-matrix.py`. Пересобрать standalone: python -B scripts/build-preview.py site/gambarian-standalone.html --standalone (из корня репо).

Проверка: grep -c '2\.14' site/styles.css site/gambarian-standalone.html → 0 и 0; grep -n '<=720px' site/app.js → пусто; test ! -f scripts/verify-fact-cards.mjs; grep -c 'data-copy-id="2.14"' site/index.html → 0 (как и было); git diff --stat site/index.html → пусто

### 13. Документальный каркас: долг по yulia-card-v1, пометки superseded, устаревшие строки Юлии.

Файлы: `docs/CONTENT-OWNER-EDITS.md`, `docs/CONTENT-EDIT-PROPOSALS-2026-08-17.md`, `docs/CONTENT-SOURCE-MAP.md`, `docs/CONTENT-APPROVED.md`

CONTENT-OWNER-EDITS.md → версия `CONTENT-OWNER-EDITS v1.1.0`, дата <ДАТА>: новый раздел «Карточка Юлии Саакян (`yulia-card-v1`)» — решение владельца 2026-08-16 (контракт 1.2.0 | 2026-08-16): из первого и четвёртого пунктов сняты довески «— защита прав людей и правовые решения в сложных ситуациях» и «Специализация —»; привести точную нормализованную строку контракта из OWNER_APPROVED_COPY["yulia-card-v1"] дословно; ссылка на docs/TYPOGRAPHY-DASHES.md §5. CONTENT-EDIT-PROPOSALS-2026-08-17.md → версия 1.2.0: в строках 3.8, 3.23, 3.33, 4.6, 5.17, 5.19 колонку «Причина» дополнить `superseded — правка владельца 2026-09-06 (CONTENT-OWNER-REVISIONS строки 19/27/32/46/57/67)`; 7.4 и 7.6 — `не принято владельцем 2026-09-06`; в шапке одна фраза о статусе. CONTENT-SOURCE-MAP.md:75 и :78, CONTENT-APPROVED.md:149 и :152 → текущие строки v1: `Более 17 лет в юриспруденции` и `Миграционное и семейное право Израиля: репатриация, гражданство, статус, семейные споры`; версии документов 2.2.0 → 2.2.1 с датой.

Проверка: grep -n 'защита прав людей\|Специализация —' docs/CONTENT-SOURCE-MAP.md docs/CONTENT-APPROVED.md → пусто; grep -c 'yulia-card-v1' docs/CONTENT-OWNER-EDITS.md → ≥1; grep -c 'superseded' docs/CONTENT-EDIT-PROPOSALS-2026-08-17.md → 6

### 14. Добавить unit-тест инварианта owner-id ↔ OWNER_REVIEW_IDS.

Файлы: `scripts/tests/test_verify_client_copy.py`

Новый тест test_owner_review_ids_cover_owner_blocks: from review_numbered_contract import OWNER_REVIEW_IDS, OWNER_REVIEW_ANCHORS; (1) каждый ключ verifier.OWNER_APPROVED_COPY ∈ OWNER_REVIEW_IDS; (2) каждый `data-owner-copy-id` из site/index.html (re.findall) ∈ OWNER_REVIEW_IDS; (3) каждый ключ OWNER_REVIEW_ANCHORS ∈ OWNER_REVIEW_IDS. Существующие тесты не менять.

Проверка: python -m unittest discover -s scripts/tests -v → OK, 13 тестов; временно убрать ключ fact-900-v1 из OWNER_REVIEW_IDS → тест падает; вернуть

### 15. Пересобрать все производные, прогнать полный набор гейтов, закоммитить и открыть draft PR.

Файлы: `site/gambarian-standalone.html`, `build/variants/final-dev4`, `docs/tasks/codex/2026-09-06-final-dev4-stage-1.md`

Порядок: build-preview --standalone → build-font-variants → build-hero-variants → build-action-bar → build-review-numbered → verify-client-copy → unittest → verify-client-previews → verify-lead-hook → qa-browser-matrix --all-previews → git diff --check. Один коммит `chore(final-dev4): alias final-dev4, per-alias readback, sync markers, prep cleanup` (без идентификаторов моделей и trailer-ов), git push -u origin codex/final-dev4-s1-prep, draft PR в main по .github/PULL_REQUEST_TEMPLATE.md (Type: Refactoring + Documentation; Related: PR #11) с отчётом по разделу «Отчёт» карточки.

Проверка: все команды из «Гейты» с кодом 0; git log -1 --format=%H; git status --short → пусто; ссылка на PR

## Гейты (в этом порядке)

- `python -B scripts/build-preview.py site/gambarian-standalone.html --standalone`
- `python -B scripts/build-font-variants.py`
- `python -B scripts/build-hero-variants.py`
- `python -B scripts/build-action-bar.py`
- `python -B scripts/build-review-numbered.py`
- `python -B scripts/verify-client-copy.py`
- `python -m unittest discover -s scripts/tests`
- `python -B scripts/verify-client-previews.py`
- `node scripts/verify-lead-hook.mjs`
- `python -m http.server 8098 (фон) && python scripts/qa-browser-matrix.py http://127.0.0.1:8098/ --all-previews`
- `git diff --check`
- `после деплоя владельцем (Deploy Previews → ветка codex/final-dev4-s1-prep → only=final-dev4): python -B scripts/verify-live-previews.py --only final-dev4`
- `после деплоя: curl -sA gambarian-readback https://final-dev3.gambarian-landing.pages.dev/ | sha256sum (до и после — совпадает) и curl -sA gambarian-readback https://gambarian-landing.pages.dev/ | sha256sum → 656CBCD0…C13E22`

## Версии и маркеры

- scripts/client-preview-map.json: version 2.4.0 → 2.5.0, updated → <ДАТА>; scripts/verify-client-previews.py MAP_VERSION/MAP_DATE те же
- scripts/final_dev4_contract.py (новый): FINAL-DEV4-DESIGN v1.0.0 | <ДАТА>; строка Marker и таблица версий в docs/boards/2026-08-06-versions-links.md; строка в таблице контрактов docs/RESUME.md
- scripts/verify-client-copy.py: CLIENT-COPY-VERIFIER 1.0.0 → 1.1.0 | <ДАТА> (docstring :4, VERIFIER_VERSION/DATE) → RESUME, CONTENT-APPROVED:25, CONTENT-SOURCE-MAP:41, boards, FINAL-QA-CHECKLIST
- scripts/review_numbered_contract.py: REVIEW-NUMBERED 2.0.1 → 2.1.0 | <ДАТА> (маркер автоматически попадает в build-review-numbered и verify-client-previews) → RESUME:128, boards, FINAL-QA-CHECKLIST:62
- scripts/verify-live-previews.py: LIVE-PREVIEW-READBACK 1.1.0 → 1.2.0 | <ДАТА> (docstring :4 + READBACK_VERSION :30)
- scripts/qa-browser-matrix.py: PREVIEW-BROWSER-QA-RUNNER 1.4.1 → 1.4.2 | <ДАТА> (docstring :2, RUNNER_VERSION :62) → RESUME:131, boards, FINAL-QA-CHECKLIST:65
- scripts/client_copy_contract.py:3 docstring → CLIENT-COPY-CONTRACT v1.2.0 | 2026-08-16 (синхронизация без bump; CONTRACT_VERSION остаётся 1.2.0) → RESUME:121, CONTENT-APPROVED:25, CONTENT-SOURCE-MAP:40, boards, FINAL-QA-CHECKLIST:55, dark-fact-cards.md:80
- Документы: CONTENT-OWNER-EDITS 1.0.0 → 1.1.0; CONTENT-EDIT-PROPOSALS 1.1.0 → 1.2.0; CONTENT-APPROVED 2.2.0 → 2.2.1; CONTENT-SOURCE-MAP 2.2.0 → 2.2.1; FINAL-QA-CHECKLIST 2.3.1 → 2.3.2; DARK-FACT-CARDS 1.0.1 → 1.0.2 — все с датой <ДАТА>
- Не меняются: Action Bar 2.4.0, Client Preview Mobile 1.1.0, FINAL-DEV1-HERO 2.0.0, FINAL-DEV3-DESIGN 2.0.2, Lead schema 2.0.0, CONTRACT_VERSION 1.2.0

## Приёмка этапа

- [ ] scripts/client-preview-map.json: 12 записей, version 2.5.0, alias final-dev4 → build/variants/final-dev4; deploy-previews.sh final-dev4 находит сборку
- [ ] python -B scripts/build-hero-variants.py собирает build/variants/final-dev4 с маркером FINAL-DEV4-DESIGN v1.0.0 | <ДАТА> ровно по одному разу в index.html и styles.css, body `<body class="page--final-dev3 page--final-dev4">`, hero-business-hours.js байт в байт из site-addons/final-dev3
- [ ] python -B scripts/verify-client-copy.py → PASS v1.1.0: 26 HTML targets, 24 unique files, owner-approved 2 block, contract v1.2.0 | 2026-08-16
- [ ] python -B scripts/verify-client-previews.py → PASS, 12 Preview; при порче маркера final-dev4 в board или сборке — FAIL
- [ ] python -B scripts/build-review-numbered.py → PASS; data-review-id в сборке ровно 2.14 и 5.18; OWNER_REVIEW_IDS содержит 20 ключей, включая все id этапов 2 и 5
- [ ] python -m unittest discover -s scripts/tests → OK (13 тестов), новый тест инварианта owner-id
- [ ] qa-browser-matrix --all-previews → 194/194, final-dev4 проходит гейты final-dev3 (business-state, latch Action Bar)
- [ ] verify-live-previews.py: NBSP_EXPECTED — словарь per-alias (final-dev4: 23), проверка 2.10 условная, маркер v1.2.0 в docstring и READBACK_VERSION совпадают; --only final-dev3 живьём PASS
- [ ] grep '2\.14' в site/styles.css и site/gambarian-standalone.html = 0; scripts/verify-fact-cards.mjs отсутствует; app.js комментарий 860px
- [ ] git diff --stat site/index.html пустой (контентных правок нет); frozen source не тронут (git diff docs/sources пустой)
- [ ] Все маркеры CLIENT-COPY-CONTRACT в scripts/docs (кроме истории) = v1.2.0 | 2026-08-16; runner 1.4.2, Review Numbered 2.1.0, verifier 1.1.0 в RESUME/boards/FINAL-QA-CHECKLIST
- [ ] CONTENT-OWNER-EDITS.md v1.1.0 содержит запись yulia-card-v1; CONTENT-EDIT-PROPOSALS 6 пометок superseded и 2 «не принято»; устаревшие строки Юлии в SOURCE-MAP/APPROVED заменены
- [ ] После деплоя: verify-live-previews.py --only final-dev4 PASS (23 тире, noindex, nav 14px, 2.10 белый); SHA-256 final-dev3 и production не изменились

## Отчёт в PR (обязательные поля)

- Хэш коммита и подтверждение push в origin/codex/final-dev4-s1-prep; ссылка на draft PR в main
- Diff-доказательство: git diff --stat против codex/final-dev4 и построчно ключевые фрагменты (map, VARIANTS, EXPECTED_PREVIEWS, NBSP_EXPECTED, OWNER_REVIEW_IDS/ANCHORS, удалённые селекторы 2.14); явно: `git diff --stat site/index.html docs/sources` пустой
- Дословный вывод гейтов: verify-client-copy (строка PASS с 26 targets / 24 unique), unittest (OK, N тестов), verify-client-previews (PASS … 12), build-review-numbered (Проверка пройдена), verify-lead-hook, qa-browser-matrix summary (194/194), git diff --check
- Вывод `python -B scripts/verify-live-previews.py --only final-dev3` (живой PASS) и `--only final-dev4` до деплоя (код 1, не 2)
- Таблица маркеров «было → стало» по всем файлам из раздела «Версии»
- Проверено / Не проверено: не проверено до деплоя владельцем — live final-dev4, байтовый readback final-dev3 и production; не проверено — визуальный просмотр final-dev4 (контент не менялся)
- Вопросы владельцу: перечислить, если карточки не хватило (ожидается: нет)

## Риски

- Предрегистрация owner-id без перевода проверок review-numbered на source-derived список сломает build-review-numbered и verify-client-previews — шаг 7 и правка :375 в шаге 5 обязательны вместе
- final-dev4 наследует класс page--final-dev3: любые будущие проверки «только dev3» (runner, action-bar.js) будут срабатывать и на dev4 — это намеренно до этапа 4; зафиксировать в PR
- Пропуск пересборки standalone после правки styles.css/app.js → verify-client-copy пройдёт, но build-preview в CI даст другой байт; всегда пересобирать перед коммитом
- Полная матрица runner требует Chromium (python -m playwright install chromium) и занимает время; без неё этап не принят
- Первый деплой alias final-dev4 создаёт новый Preview-адрес; поле only обязано быть заполнено — пустое значение пересоберёт и опубликует final-dev3
- Команды проверки в карточке — bash (Git Bash/WSL); в PowerShell заменять grep на Select-String или python -c
- Маркер-синхронизация затрагивает много docs — не править исторические записи (docs/reviews, HANDOFF, ERRORS)

## Промпт для Codex

Вставить в Codex CLI в корне репозитория на ветке этапа:

```text
Ты работаешь в корне репозитория gambaryan-family-law (лендинг «Гамбарян и партнёры»). Этап 1 цикла final-dev4: «Подготовка» — без единой контентной правки.

Сначала прочитай по порядку: AGENTS.md → docs/RESUME.md (раздел «Следующий цикл») → docs/CODEX-WORKING-MODEL.md → карточку этапа docs/tasks/codex/2026-09-06-final-dev4-stage-1.md → в docs/tasks/2026-09-06-final-dev4-spec.md разделы «Реестр решений владельца» (№9), «Правила для исполнителя», «Подготовительные шаги» (только шаги 1–3, 8–9) и пункт A:HF-08 в docs/tasks/2026-09-06-final-dev4-items.md. Только потом код.

Ветка уже создана в origin: git fetch origin && git checkout codex/final-dev4-s1-prep && git pull --ff-only (если ветки нет локально — git checkout -b codex/final-dev4-s1-prep origin/codex/final-dev4-s1-prep). Установи зависимости (pip -r requirements-build.txt, playwright install chromium, npm ci).

Сделай ровно шаги 2–15 карточки, в её порядке, с указанными файлами и проверками:
1) alias final-dev4 в scripts/client-preview-map.json (2.5.0 + дата);
2) новый scripts/final_dev4_contract.py (FINAL-DEV4-DESIGN v1.0.0, наследник final-dev3, body class page--final-dev3 page--final-dev4);
3) вариант dev4 в scripts/build-hero-variants.py (variant_final_dev3 + маркер dev4; adapter копируется из site-addons/final-dev3);
4) verify-client-previews.py: MAP 2.5.0, EXPECTED_PREVIEWS + final-dev4, verify_final_dev4, board-маркер; проверка review-numbered — по owner-id, реально присутствующим в site/index.html;
5) verify-client-copy.py: 12 alias, verifier 1.1.0;
6) review_numbered_contract.py: 2.1.0, предрегистрация 20 owner-id и OWNER_REVIEW_ANCHORS; build-review-numbered.py — обобщённая вставка data-review-id без жёстких токенов;
7) verify-live-previews.py: NBSP_EXPECTED per-alias (final-dev4: 23), условная проверка 2.10, readback 1.2.0;
8) qa-browser-matrix.py: Target final-dev4, гейты final-dev3 → {final-dev3, final-dev4}, runner 1.4.2, docstring 194 ячейки;
9) счётчики «11» → «12» в workflow/deploy-previews.sh/DEPLOY.md/RESUME.md/CODEX-WORKING-MODEL.md;
10) синхронизация маркеров (client_copy_contract.py:3 → v1.2.0 | 2026-08-16; RESUME, CONTENT-APPROVED, CONTENT-SOURCE-MAP, boards, FINAL-QA-CHECKLIST, dark-fact-cards.md);
11) чистка: селекторы [data-copy-id="2.14"] в site/styles.css, комментарий app.js:602 → 860px, git rm scripts/verify-fact-cards.mjs, пересборка standalone;
12) CONTENT-OWNER-EDITS.md v1.1.0 (запись yulia-card-v1), superseded в CONTENT-EDIT-PROPOSALS, устаревшие строки Юлии в SOURCE-MAP/APPROVED;
13) unit-тест инварианта owner-id ↔ OWNER_REVIEW_IDS.

Запрещено: менять тексты в site/index.html, docs/sources/*, site-addons/*, Action Bar; трогать final-dev3 и production; запускать wrangler; оставлять поле only пустым; писать идентификаторы моделей в коммит/PR. Если решения не хватает — остановись на этом пункте, сделай остальное и опиши вопрос в отчёте.

Гейты по порядку: build-preview --standalone, build-font-variants, build-hero-variants, build-action-bar, build-review-numbered, verify-client-copy, python -m unittest discover -s scripts/tests, verify-client-previews, node scripts/verify-lead-hook.mjs, python -m http.server 8098 + python scripts/qa-browser-matrix.py http://127.0.0.1:8098/ --all-previews (ожидается 194/194), git diff --check; плюс python -B scripts/verify-live-previews.py --only final-dev3 (живой PASS).

Один коммит `chore(final-dev4): alias final-dev4, per-alias readback, sync markers, prep cleanup`, push в origin, draft PR в main по .github/PULL_REQUEST_TEMPLATE.md. В теле PR: хэш и push, diff-доказательство (в т.ч. пустой diff site/index.html и docs/sources), дословный вывод всех гейтов, таблица маркеров «было → стало», разделы «Проверено / Не проверено / Вопросы владельцу». Деплой делает владелец: Deploy Previews → ветка codex/final-dev4-s1-prep → only=final-dev4.
```

## Related

- [Модель работы с Codex](../../CODEX-WORKING-MODEL.md)
- [Задание final-dev4](../2026-09-06-final-dev4-spec.md)
- [Разбор по пунктам](../2026-09-06-final-dev4-items.md)
- [Реестр текстов владельца](../../CONTENT-OWNER-REVISIONS-2026-09-06.md)
- [Рекомендации дизайнеров](../../DESIGN-RECOMMENDATIONS-2026-09-06.md)

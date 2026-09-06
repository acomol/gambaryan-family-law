# Этап 8: Сборка и публикация final-dev4: полная пересборка, все гейты, деплой владельцем only=final-dev4, live-readback, байтовая неизменность final-dev3 и production, итоговый отчёт по списку владельцев

**Версия:** `FINAL-DEV4-STAGE-8 v1.0.0`

**Дата:** `2026-09-06`

**Ветка:** `codex/final-dev4-s8-release` → draft PR в `main`

**Исполнитель:** Codex CLI; уровень рассуждений: **medium (механические правки)** — Кода этап не меняет: это сборка, прогон уже написанных гейтов, чтение живых адресов и документирование по жёстким шаблонам (таблица статуса, версии, proof). Риск — не в логике, а в дисциплине: ничего не чинить по пути, не деплоить самому, не оставить поле only пустым и не перепутать «до/после»; для этого достаточно уровня medium.

**Приёмка:** Claude (облачная сессия) по `docs/CODEX-WORKING-MODEL.md`; слияние — владелец.

## Цель

Ветка codex/final-dev4-s8-release от main после слияния этапов 1–7 без единой правки site/, site-addons/, scripts/ и functions/ (только документы и итоговые записи). Полная пересборка build/variants/final-dev4 и всех производных из main, прогон полного набора гейтов (статических, unit, Playwright-гейтов этапов 3–7, browser matrix) с дословным выводом, аудит согласованности маркеров версий по всем контрактам, снимок SHA-256 final-dev3 и production «до». Деплой выполняет ТОЛЬКО владелец: Actions → Deploy Previews → ветка codex/final-dev4-s8-release → only=final-dev4; Codex не запускает wrangler и workflow. После деплоя: verify-live-previews --only final-dev4, все live-гейты по https://final-dev4.gambarian-landing.pages.dev/, байтовый readback final-dev3 и production «после» (curl -A gambarian-readback, SHA-256; production 656CBCD0…C13E22). Итог: новый документ docs/tasks/<ДАТА>-final-dev4-status.md с таблицей статуса каждой из 44 строк списка владельцев плюс 94 и 96 (сделано / отклонено владельцем / отложено — с коммитом и PR), обновлённые RESUME (новая версия, живое состояние 12 alias), FINAL-QA-CHECKLIST, CHANGELOG, boards/versions-links, CLIENT-PREVIEW-HANDOFF, CODEX-WORKING-MODEL (журнал этапов), spec — отметки «Приёмка» с proof; production не тронут.

## Основание

- Решения владельца (реестр в `../2026-09-06-final-dev4-spec.md`): №9
- Пункты разбора (`../2026-09-06-final-dev4-items.md`): `A:HF-08`
- Открытые вопросы, выполняемые «по умолчанию» (переделать при другом ответе):
  - Ветка этапа создаётся от main после слияния PR этапа 7; если этап 7 отложен (Часть B ждёт ответа), этап 8 всё равно выполняется, а строки 2, 15, 18, 20, 23, 26, 28, 31, 36, 45, 51, 59, 69 и абзац «шрифты» строки 94 получают статус «отложено: ждёт ответа №1/№2» со ссылкой на карточку этапа 7
  - Статусы открытых вопросов по умолчанию берутся из реестра решений spec: №10 (32/20), №11 (короткая золотая линия), №15 («Защита при угрозах» последней), №16–17 (одна строка тем; стрелки снаружи/в шапке), №7 (упор), №26 (только «Связь»), №28 (80/48, запас 80) — в таблице помечаются «сделано по умолчанию; переделать при другом ответе»
  - CHANGELOG.md ведётся в формате Keep a Changelog: запись цикла final-dev4 добавляется в [Unreleased] без нового номера версии проекта (нумерация 0.x относится к шаблону репозитория)

## Не в скоупе этапа

- Любые правки site/, site-addons/, scripts/, functions/, .github/workflows — этап только собирает, проверяет, публикует силами владельца и документирует; дефект, найденный гейтом, не чинится здесь: остановиться, описать в отчёте, фикс идёт отдельной веткой fix/… и отдельным PR, затем этап 8 повторяется
- Деплой final-dev3, остальных 10 alias и production; поле only пустым; deploy-pages.ps1/.sh; wrangler напрямую
- Решение открытых вопросов (№1–2, 3-размер, 7-упор, 10, 11-черта, 15, 16–17, 18, 26, 28-величины) — статусы «по умолчанию» и «отложено» переносятся в таблицу как есть
- Снятие noindex, подключение www.gambarian.com, social preview, Albato — вне цикла final-dev4 (FINAL-QA-CHECKLIST §17 BLOCKER-ы остаются)
- Обновление остальных десяти alias до текущего релиза (RESUME «живое важнее нового») — отдельное решение владельца, здесь только фиксируется расхождение
- Правки docs/CONTENT-OWNER-REVISIONS-2026-09-06.md (источник владельца) и docs/sources/*
- Правка spec (отметки «Приёмки», статус в шапке) — ведёт архитектор по отчёту этапа; Codex готовит данные для отметок в PR
- Ожидания «card-v3 → 4» и статусы строк «Поменять шрифт»/«фото» берутся из отчёта этапа 7 (Часть B и пропорция фото могут быть отложены), а не как константы

## Шаги

### 1. Создать ветку от main после слияния этапа 7 и убедиться, что все этапы цикла в базе.

Файлы: `docs/tasks/codex/`, `docs/tasks/2026-09-06-final-dev4-spec.md`, `scripts/client-preview-map.json`, `scripts/final_dev4_contract.py`

git checkout main && git pull --ff-only && git checkout -b codex/final-dev4-s8-release. Прочитать AGENTS.md → docs/RESUME.md → docs/CODEX-WORKING-MODEL.md → эту карточку → spec разделы «Порядок реализации» п.8, «Приёмка», «Правила для исполнителя» п.2, 5, 6 → docs/DEPLOY.md («Preview», «Публикация из GitHub Actions», «Проверка после публикации») → docs/FINAL-QA-CHECKLIST.md §2, §13, §17. Через gh pr list --state merged --search 'codex/final-dev4' собрать номера и merge-хэши PR #11 и этапов 1–7 (это основа колонки «коммит/PR» таблицы статуса). Проверить, что в main: alias final-dev4 в карте (12 записей), final_dev4_contract.py, адаптер site-addons/final-dev4, scripts/verify-address-links.py, verify-business-hours.py, measure-fonts.py, measure-section-gaps.py, measure-head-top.py; рабочее дерево чистое. Установить зависимости (pip -r requirements-build.txt, playwright install chromium, npm ci).

Проверка: git branch --show-current → codex/final-dev4-s8-release; git status --short → пусто; python -c "import json;print(len(json.load(open('scripts/client-preview-map.json'))['previews']))" → 12; ls scripts/verify-address-links.py scripts/verify-business-hours.py scripts/measure-fonts.py scripts/measure-section-gaps.py scripts/measure-head-top.py → все существуют; список PR этапов записан в черновик отчёта

### 2. Полная пересборка всех производных из main и статические гейты.

Файлы: `site/gambarian-standalone.html`, `build/ (производный, не коммитится)`

Порядок workflow deploy-previews.yml: python -B scripts/build-preview.py site/gambarian-standalone.html --standalone (после него git status должен остаться чистым — standalone в main актуален; иначе этап 7 не пересобрал standalone → дефект, остановиться) → build-font-variants → build-hero-variants → build-action-bar → build-review-numbered → verify-client-copy → python -m unittest discover -s scripts/tests → verify-client-previews → node scripts/verify-lead-hook.mjs → npm run check (CI-gate). Сохранять дословный вывод каждой команды в файл отчёта.

Проверка: git status --short после build-preview --standalone → пусто; все команды код 0; verify-client-copy печатает PASS с версией контракта после этапа 7; verify-client-previews → PASS «во всех 12 клиентских Preview-артефактах»

### 3. Playwright-гейты этапов 3–7 и полная browser-матрица по локальной сборке final-dev4.

Файлы: `build/variants/final-dev4 (производный)`

python -m http.server 8098 из корня (отдельный терминал). python scripts/verify-address-links.py http://127.0.0.1:8098/build/variants/final-dev4/; python scripts/verify-business-hours.py http://127.0.0.1:8098/build/variants/final-dev4/; python scripts/measure-fonts.py http://127.0.0.1:8098/build/variants/final-dev4/ (с --expect-heading <семейство>, если этап 7 выполнил Часть B); python scripts/measure-head-top.py --url http://127.0.0.1:8098/build/variants/final-dev4/ --out /tmp/head-s8; python scripts/measure-section-gaps.py http://127.0.0.1:8098/build/variants/final-dev4/ --expect-desktop 80 --expect-mobile 48 --allow hero,facts,footer; python scripts/qa-browser-matrix.py http://127.0.0.1:8098/build/variants/final-dev4/ --target-name final-dev4; python scripts/qa-browser-matrix.py http://127.0.0.1:8098/ --all-previews (итог ячеек — значение после этапов 6–7, записать); git diff --check. Любой FAIL — стоп: дефект в отчёт, этап не продолжается до фикса отдельным PR.

Проверка: все команды код 0; summary qa-browser-matrix --all-previews status PASS без overflow; вывод сохранён дословно

### 4. Аудит согласованности маркеров, счётчиков и ожиданий перед публикацией.

Файлы: `scripts/`, `docs/`, `site-addons/`, `.github/workflows/deploy-previews.yml`

Для каждого контракта grep даёт одну версию/дату (кроме docs/reviews, ERRORS, HANDOFF-истории и карточек этапов): CLIENT-COPY-CONTRACT (scripts/client_copy_contract.py :3 и :11–12, RESUME, FINAL-QA-CHECKLIST, boards, CONTENT-APPROVED, CONTENT-SOURCE-MAP, CONTENT-EXTRA, dark-fact-cards.md); CLIENT-COPY-VERIFIER; FINAL-DEV4-DESIGN (contract.py, адаптер, TASK_PATH, BOARD_PATH, build/variants/final-dev4/index.html и styles.css); ACTION-BAR-SPEC (action-bar.html/css/js, action_bar_addon.py, client-preview-map.json); PREVIEW-BROWSER-QA-RUNNER (docstring и RUNNER_VERSION, RESUME, boards, FINAL-QA-CHECKLIST); LIVE-PREVIEW-READBACK (docstring :4 и READBACK_VERSION); REVIEW-NUMBERED; карта Preview 2.5.0 (json, verify-client-previews MAP_VERSION, boards); BUILD-TOOLS. Счётчик тире: grep -o '&nbsp;—' build/variants/final-dev4/index.html | wc -l равен NBSP_EXPECTED['final-dev4'] в verify-live-previews.py. Счётчики «12»: workflow :3/:25, deploy-previews.sh, DEPLOY.md, RESUME, CODEX-WORKING-MODEL. Frozen source: sha256sum docs/sources/client-copy-short-v1.0.0.txt = 5234CC5D…FA18E (RESUME), размер 14 895 байт. Расхождения — в отчёт как дефект; чинить только документы (маркеры в docs), код — нет.

Проверка: таблица «контракт → версия → дата → источники (N совпадений)» в отчёте без расхождений; test "$(grep -o '&nbsp;—' build/variants/final-dev4/index.html | wc -l)" = "$(python -c "import re;print(re.search(r'\"final-dev4\": (\d+)',open('scripts/verify-live-previews.py').read()).group(1))")"; sha256sum docs/sources/client-copy-short-v1.0.0.txt → 5234cc5d…fa18e

### 5. Снимок живых поверхностей «до» деплоя.

Файлы: `docs/tasks/<ДАТА>-final-dev4-status.md (новый, раздел «Proof»)`

С машины с сетью: curl -sS -A gambarian-readback https://final-dev3.gambarian-landing.pages.dev/ -o /tmp/dev3-before.html && sha256sum /tmp/dev3-before.html && wc -c /tmp/dev3-before.html; то же для https://gambarian-landing.pages.dev/ → /tmp/prod-before.html (ожидается SHA-256 656CBCD0…C13E22, 52 872 байта); и для https://final-dev4.gambarian-landing.pages.dev/ → /tmp/dev4-before.html (состояние после деплоя этапа 7 — для сравнения «что изменилось этим деплоем», ожидается «ничего», так как site/ не менялся). В PowerShell — curl.exe и Get-FileHash -Algorithm SHA256. Значения записать в раздел «Proof» нового документа (шаг 8) и в PR.

Проверка: три SHA-256 и размера записаны; production = 656CBCD0…C13E22; python -B scripts/verify-live-previews.py --only final-dev4 → PASS (ещё релиз этапа 7) и PASS production

### 6. Деплой владельцем из ветки этапа; Codex ждёт и читает лог прогона.

Файлы: `.github/workflows/deploy-previews.yml`

Codex НЕ запускает workflow и wrangler. Владелец: git push -u origin codex/final-dev4-s8-release (после шага 8, чтобы ветка содержала отчёт — или сразу, а отчёт допушить вторым пушем в тот же коммит через amend запрещено: делать один коммит после деплоя, см. шаг 11) → GitHub → Actions → Deploy Previews → Run workflow → «Use workflow from» = codex/final-dev4-s8-release → only = final-dev4 → Run. Файл workflow берётся из main (workflow_dispatch требует его в ветке по умолчанию — DEPLOY.md), сборка и гейты идут из выбранной ветки. Codex/владелец: gh run list --workflow 'Deploy Previews' --limit 1 → id; gh run watch <id>; gh run view <id> --log | grep -A3 'Live readback' → строки PASS final-dev4 и PASS production; записать run id и URL. Если шаг Check token scope или Verify падает — стоп, лог в отчёт.

Проверка: gh run view <id> --json conclusion → success; в логе шага Live readback: PASS final-dev4, PASS production (не должен измениться)

### 7. Live-readback final-dev4 и байтовая неизменность final-dev3 и production «после».

Файлы: `docs/tasks/<ДАТА>-final-dev4-status.md (раздел «Proof»)`

python -B scripts/verify-live-previews.py --only final-dev4 → PASS (число тире per-alias, noindex, nav 14px, условная проверка 2.10). Живые гейты: python scripts/verify-address-links.py https://final-dev4.gambarian-landing.pages.dev/; python scripts/verify-business-hours.py https://final-dev4.gambarian-landing.pages.dev/ (demo-переключатель на Preview есть); python scripts/measure-fonts.py https://final-dev4.gambarian-landing.pages.dev/ [--expect-heading]; python scripts/measure-head-top.py --url https://final-dev4.gambarian-landing.pages.dev/ --out /tmp/head-live; python scripts/measure-section-gaps.py https://final-dev4.gambarian-landing.pages.dev/ --expect-desktop 80 --expect-mobile 48 --allow hero,facts,footer; python scripts/qa-browser-matrix.py https://final-dev4.gambarian-landing.pages.dev/ --target-name final-dev4. Статические маркеры: curl -sS -A gambarian-readback https://final-dev4.gambarian-landing.pages.dev/ -o /tmp/dev4-after.html; grep -c 'FINAL-DEV4-DESIGN v<версия из contract.py>' → 1; grep -c 'page--final-dev4' → 1; grep -c 'data-action="map_click"' → 3; grep -c 'site-footer__label">Связь' → 0; grep -c 'card-v3' → 4; grep -c 'data-business-closed=' → как в отчёте этапа 4; grep -c 'svc-eyebrow' → 0; sha256sum /tmp/dev4-after.html = sha256sum build/variants/final-dev4/index.html (собранный локально из того же main — байт в байт, иначе разобраться: деплой не из этой ветки). Байтовая неизменность: повторить curl+sha256sum для final-dev3 и production, сравнить с шагом 5 — равны; production 656CBCD0…C13E22.

Проверка: все живые команды код 0; SHA-256 final-dev3 «до» = «после»; SHA-256 production «до» = «после» = 656CBCD0…C13E22; SHA-256 live final-dev4 = SHA-256 build/variants/final-dev4/index.html

### 8. Итоговый документ статуса по списку владельцев: 44 строки + 94 + 96, каждая — со статусом и коммитом.

Файлы: `docs/tasks/<ДАТА>-final-dev4-status.md (новый)`

Заголовок с версией FINAL-DEV4-STATUS v1.0.0 | <ДАТА>. Раздел «Proof» (шаги 5–7: run id, SHA-256 до/после трёх адресов, вывод verify-live-previews, список live-гейтов). Раздел «Статус строк списка владельцев» — таблица: № строки (нумерация docs/CONTENT-OWNER-REVISIONS-2026-09-06.md, шапка = 0) / пункт разбора / что сделано / статус ∈ {сделано, сделано по умолчанию (переделать при другом ответе), отклонено владельцем, отложено (причина)} / этап / коммит (merge-хэш PR) / live-подтверждение (grep или гейт). Строки: 2 (шрифт H1 — этап 7); 7, 8, 9, 10 (кубики — этап 5; 10 «В» заглавная — №12); 11, 13 (плашка — этап 2; ссылка — этап 3); 15, 16, 18, 19, 24, 26, 27, 29, 32, 34, 37, 41, 42 (тексты услуг — этап 2; 20, 23, 28, 31, 36 — только пометка шрифта, этап 7); 40 (фото Юли в «Ведёт» — отложено, №18 нет данных); 43 (окошко/стрелки — этап 6, стрелки по умолчанию №17); 45, 46 (прецедент — этап 2); 50, 53, 54, 55, 57 (Александр — этап 2; 57 адрес — удалён, ссылка в контактах этап 3); 51, 59 (шрифт имён — этап 7); 61, 62, 64, 66, 67 (Юлия и примечание — этап 2); 69 (шрифт H2 контактов — этап 7); 75 (адрес → карта — этап 3); 92 (© отдельной строкой — этап 3); 94 — по абзацам: шрифты (этап 7 / отложено), фото (этап 7), нерабочее время (этап 4), границы секций и одинаковые отступы (этап 7; Hero/подвал — вопрос), порядок вкладок (этап 6; «Защита при угрозах» по умолчанию последней, №15); 96 — по абзацам: стрелка 2.10 (этап 5, №21), иерархия кубиков (этап 5), формат меню (этап 6, по умолчанию №16), свайп и неподвижный «Ведёт» (этап 6, упор по умолчанию №7), «Связь» (этап 3, только колонка по умолчанию №26). Итог: N сделано / M по умолчанию / K отложено — сверить с spec «Приёмка» п.1 (44 + 94/96). Раздел «Открытые вопросы после цикла» — список ответов, которых ждём (№1–2 при отложенной Части B, HEADING_LIGHT, SPACING_HERO_FOOTER, №18, подтверждение умолчаний). Раздел «Не проверено» (реальный iPhone, мониторы >900px высоты, Albato). ## Related: spec, items, CONTENT-OWNER-REVISIONS, карточки этапов, RESUME, CODEX-WORKING-MODEL.

Проверка: grep -c '^| ' docs/tasks/<ДАТА>-final-dev4-status.md → ≥ 47 строк таблицы (44 + 94 + 96 + шапка); каждая строка содержит хэш коммита или слово «отложено»/«отклонено»; grep -c 'Related' → 1

### 9. RESUME: новая версия, живое состояние 12 alias, контракты, следующий цикл.

Файлы: `docs/RESUME.md`

HANDOFF-RESUME 2.6.2 → 2.7.0, дата <ДАТА>, статус «final-dev4 LIVE + VERIFIED / final-dev3 LIVE (эталон) / остальные 10 Preview на старом релизе / PRODUCTION UNCHANGED». Раздел «Что изменилось» — итог цикла (8 этапов, PR, run id). Таблица «Живое состояние»: строка final-dev4 (LIVE, релиз <merge-хэш main>, маркер FINAL-DEV4-DESIGN v<версия>), final-dev3 (без изменений, SHA-256 «до» = «после»), production (656CBCD0…C13E22, 52 872 байта). Раздел «Следующий цикл: final-dev4» переписать в «Цикл final-dev4 завершён» со ссылкой на status-документ и списком открытых вопросов; правило «живое важнее нового» — уточнить: final-dev4 добавлен решением владельца №9 как 12-й alias, остальные десять по-прежнему устарели. Таблица «Текущие локальные контракты» — все версии после этапов 1–7 (Client Copy contract/verifier, Action Bar, final-dev4 Design, Review Numbered, Browser QA runner с итогом ячеек, Build tools, карта Preview 2.5.0) — значения брать из кода (grep), не из памяти. Команды: добавить verify-address-links, verify-business-hours, measure-*.

Проверка: grep -n 'HANDOFF-RESUME v2.7.0' docs/RESUME.md → 1; grep -c 'final-dev4' docs/RESUME.md → ≥ 5; версии в таблице совпадают с grep по scripts (шаг 4)

### 10. FINAL-QA-CHECKLIST, boards/versions-links, CLIENT-PREVIEW-HANDOFF, CHANGELOG, CODEX-WORKING-MODEL, spec «Приёмка».

Файлы: `docs/FINAL-QA-CHECKLIST.md`, `docs/boards/2026-08-06-versions-links.md`, `docs/CLIENT-PREVIEW-HANDOFF.md`, `CHANGELOG.md`, `docs/CODEX-WORKING-MODEL.md`, `docs/tasks/2026-09-06-final-dev4-spec.md`

FINAL-QA-CHECKLIST: версия минорный bump + дата; §2 таблица — все текущие версии (сверка с шагом 4); §13 новая подсекция «final-dev4 v<версия> — LIVE PASS»: run id, deployment URL, SHA-256 трёх адресов до/после, список live-гейтов; §17 — строка «карта 2.5.0 содержит final-dev4»; §16 — статусы, закрытые циклом (C2, C6 из этапа 7, остальные не трогать). boards/versions-links: версия документа 2.7.1 → 2.8.0, заголовок «Двенадцать…», строка 12 final-dev4 → «LIVE PASS, релиз <хэш>», таблица «Версии контрактов» — актуальные значения и строка final-dev4 LIVE PASS, Marker final-dev4 актуальный; «Карта пересборки» — строка dev4 (builder hero-variants + site-addons/final-dev4). CLIENT-PREVIEW-HANDOFF: 2.4.1 → 2.5.0, статус «final-dev3 LIVE (эталон) + final-dev4 LIVE + VERIFIED / остальные 10 LIVE PENDING / PRODUCTION UNCHANGED»; строка URL https://final-dev4.gambarian-landing.pages.dev/ с кратким отличием (правки владельцев 2026-09-06: тексты, адрес-ссылка, подвал, нерабочее время, кубики, услуги, фото, отступы, шрифты — по факту); «Что должен проверить клиент» — пункты по открытым вопросам (кадр фото, шрифт заголовков, отступы); чек-лист «Перед отправкой» — новые отметки с run id. CHANGELOG.md [Unreleased]: подраздел «### Added» — «final-dev4 Preview (alias final-dev4): owner revisions 2026-09-06 — stage 1–7 (PR #…)» одной строкой на этап; «### Changed» — контракты с версиями. CODEX-WORKING-MODEL 1.0.0 → 1.1.0: раздел «Журнал этапов цикла final-dev4» — таблица этап / ветка / PR / merge-хэш / деплой run / статус, и одна строка уроков (что в модели работало, что нет — по фактам PR-ревью). spec: статус в шапке → «РЕАЛИЗОВАН, final-dev4 LIVE <ДАТА>; открытые вопросы — см. status-документ», чек-боксы раздела «Приёмка» → [x] с короткой ссылкой на proof (или [ ] с причиной), версия spec patch; реестр решений и открытые вопросы не редактировать.

Проверка: grep -n 'final-dev4' docs/FINAL-QA-CHECKLIST.md docs/boards/2026-08-06-versions-links.md docs/CLIENT-PREVIEW-HANDOFF.md CHANGELOG.md docs/CODEX-WORKING-MODEL.md → в каждом ≥1; grep -c '\[x\]' docs/tasks/2026-09-06-final-dev4-spec.md → число отмеченных пунктов «Приёмки» с обоснованием в отчёте; git diff --check → пусто

### 11. Один коммит, push, draft PR в main с полным proof-блоком.

Файлы: `.github/PULL_REQUEST_TEMPLATE.md`, `docs/tasks/codex/2026-09-06-final-dev4-stage-8.md`

Порядок с учётом шага 6: если владелец деплоит из этой ветки до коммита — ветка может быть запушена пустой (равной main) и это допустимо (сборка идёт из site/ main); затем один коммит `docs(final-dev4): release report, live readback, owner list status, handoff refresh` после всех live-проверок и push. Никаких идентификаторов моделей. Draft PR в main по шаблону (Type: Documentation; Related: PR #11 и PR этапов 1–7). Тело — отчёт по разделу «Отчёт». Если после деплоя обнаружен дефект — PR остаётся draft с разделом «Блокеры», фикс отдельной веткой.

Проверка: git log -1 --format=%H; git status --short → пусто; git diff --stat main -- site site-addons scripts functions .github → пусто (только docs и CHANGELOG); ссылка на PR; CI зелёный

## Гейты (в этом порядке)

- `python -B scripts/build-preview.py site/gambarian-standalone.html --standalone (git status после — чистый)`
- `python -B scripts/build-font-variants.py`
- `python -B scripts/build-hero-variants.py`
- `python -B scripts/build-action-bar.py`
- `python -B scripts/build-review-numbered.py`
- `python -B scripts/verify-client-copy.py`
- `python -m unittest discover -s scripts/tests`
- `python -B scripts/verify-client-previews.py`
- `node scripts/verify-lead-hook.mjs`
- `npm run check`
- `python -m http.server 8098 (отдельный терминал, из корня) && python scripts/verify-address-links.py http://127.0.0.1:8098/build/variants/final-dev4/`
- `python scripts/verify-business-hours.py http://127.0.0.1:8098/build/variants/final-dev4/`
- `python scripts/measure-fonts.py http://127.0.0.1:8098/build/variants/final-dev4/ [--expect-heading <семейство>]`
- `python scripts/measure-head-top.py --url http://127.0.0.1:8098/build/variants/final-dev4/ --out /tmp/head-s8`
- `python scripts/measure-section-gaps.py http://127.0.0.1:8098/build/variants/final-dev4/ --expect-desktop 80 --expect-mobile 48 --allow hero,facts,footer`
- `python scripts/qa-browser-matrix.py http://127.0.0.1:8098/build/variants/final-dev4/ --target-name final-dev4`
- `python scripts/qa-browser-matrix.py http://127.0.0.1:8098/ --all-previews`
- `аудит маркеров: grep -rn по каждому контракту → одна версия/дата; счётчик «&nbsp;—» = NBSP_EXPECTED['final-dev4']; sha256sum docs/sources/client-copy-short-v1.0.0.txt`
- `git diff --check`
- `до деплоя: curl -sS -A gambarian-readback https://final-dev3.gambarian-landing.pages.dev/ | sha256sum; curl -sS -A gambarian-readback https://gambarian-landing.pages.dev/ | sha256sum (656CBCD0…C13E22); python -B scripts/verify-live-previews.py --only final-dev4`
- `деплой владельцем: Actions → Deploy Previews → ветка codex/final-dev4-s8-release → only=final-dev4; gh run view <id> → success, Live readback PASS`
- `после деплоя: python -B scripts/verify-live-previews.py --only final-dev4`
- `после деплоя: verify-address-links, verify-business-hours, measure-fonts, measure-head-top, measure-section-gaps, qa-browser-matrix --target-name final-dev4 по https://final-dev4.gambarian-landing.pages.dev/`
- `после деплоя: curl -sS -A gambarian-readback https://final-dev4.gambarian-landing.pages.dev/ | sha256sum = sha256sum build/variants/final-dev4/index.html; grep-маркеры (FINAL-DEV4-DESIGN, page--final-dev4, map_click=3, «Связь»=0, card-v3=4, svc-eyebrow=0)`
- `после деплоя: SHA-256 final-dev3 и production повторно — совпадают с «до» (production 656CBCD0…C13E22)`

## Версии и маркеры

- docs/RESUME.md: HANDOFF-RESUME 2.6.2 → 2.7.0 | <ДАТА>
- docs/boards/2026-08-06-versions-links.md: 2.7.1 → 2.8.0 | <ДАТА> (исполняемая карта остаётся 2.5.0)
- docs/CLIENT-PREVIEW-HANDOFF.md: CLIENT-PREVIEW-HANDOFF 2.4.1 → 2.5.0 | <ДАТА>
- docs/FINAL-QA-CHECKLIST.md: минорный bump относительно версии после этапа 7 + <ДАТА>
- docs/CODEX-WORKING-MODEL.md: 1.0.0 → 1.1.0 | <ДАТА> (журнал этапов)
- docs/tasks/2026-09-06-final-dev4-spec.md: FINAL-DEV4-SPEC patch bump (статус, отметки приёмки), реестр решений без изменений
- docs/tasks/<ДАТА>-final-dev4-status.md (новый): FINAL-DEV4-STATUS v1.0.0 | <ДАТА>
- CHANGELOG.md: запись в [Unreleased] (номер версии проекта не меняется)
- Не меняются: все кодовые контракты (CLIENT-COPY-CONTRACT/VERIFIER, FINAL-DEV4-DESIGN, ACTION-BAR-SPEC, PREVIEW-BROWSER-QA-RUNNER, LIVE-PREVIEW-READBACK, REVIEW-NUMBERED, FINAL-DEV1-HERO, FINAL-DEV3-DESIGN 2.0.2, Lead schema 2.0.0, карта Preview 2.5.0, BUILD-TOOLS), site/, site-addons/, scripts/, functions/

## Приёмка этапа

- [ ] git diff main -- site site-addons scripts functions .github пустой: этап не менял код; standalone в main актуален (build-preview --standalone не меняет дерево)
- [ ] Все статические, unit, Playwright-гейты и browser matrix из раздела «Гейты» — код 0, вывод дословно в PR и в status-документе
- [ ] Аудит маркеров: одна версия/дата у каждого контракта во всех источниках; число «&nbsp;—» в сборке = NBSP_EXPECTED['final-dev4']; frozen source SHA-256 5234CC5D…FA18E и 14 895 байт
- [ ] Деплой выполнен владельцем из ветки codex/final-dev4-s8-release с only=final-dev4; run id и success зафиксированы; wrangler/production-скрипты не запускались
- [ ] После деплоя verify-live-previews --only final-dev4 PASS + PASS production; live final-dev4 байт в байт равен локальной сборке index.html; все live-гейты PASS
- [ ] SHA-256 final-dev3 «до» = «после»; SHA-256 production «до» = «после» = 656CBCD0…C13E22 (52 872 байта)
- [ ] docs/tasks/<ДАТА>-final-dev4-status.md: 44 строки + 94 + 96 со статусом и коммитом/PR; итоговые числа сделано / по умолчанию / отложено; открытые вопросы и «Не проверено»; ## Related
- [ ] RESUME 2.7.0, FINAL-QA-CHECKLIST (версия, §2, §13, §17), boards 2.8.0 (12 alias, версии), CLIENT-PREVIEW-HANDOFF 2.5.0 (URL final-dev4), CHANGELOG [Unreleased], CODEX-WORKING-MODEL 1.1.0 (журнал этапов), spec «Приёмка» отмечена с proof — версии в документах совпадают с кодом
- [ ] Один коммит docs-only, draft PR в main с proof-блоком по Definition of Done (commit+push, diff, live-readback, «Проверено / Не проверено»)

## Отчёт в PR (обязательные поля)

- Хэш коммита, подтверждение push в origin/codex/final-dev4-s8-release, ссылка на draft PR; список PR этапов 1–7 с merge-хэшами
- Подтверждение docs-only: git diff --stat main -- site site-addons scripts functions .github пустой
- Дословный вывод всех гейтов раздела «Гейты» (локальных и живых), включая summary qa-browser-matrix --all-previews с итогом ячеек и npm run check
- Таблица аудита маркеров «контракт → версия → дата → число совпадений», счётчик тире, SHA-256 frozen source
- Proof-блок публикации: run id и URL прогона Deploy Previews, поле only=final-dev4, ветка; SHA-256 и размер final-dev3, production и final-dev4 «до» и «после»; SHA-256 live final-dev4 = локальной сборки
- Таблица статуса 44 строк + 94/96 (или ссылка на docs/tasks/<ДАТА>-final-dev4-status.md с итоговыми числами сделано / по умолчанию / отложено)
- Проверено / Не проверено: проверено — live final-dev4 всеми гейтами, байтовая неизменность final-dev3 и production; не проверено — реальный iPhone (safe-area, шрифты), мониторы выше 900px по высоте, остальные 10 alias (устарели, не публиковались), Albato delivery
- Вопросы владельцу: подтверждение умолчаний (№7, 10, 11, 15, 16–17, 26, 28-величины), ответы по №1–2 (если Часть B отложена), №18, HEADING_LIGHT, SPACING_HERO_FOOTER; решение об обновлении остальных 10 alias; готовность отправлять клиенту final-dev4 как единственный актуальный URL наряду с final-dev3

## Риски

- Соблазн починить найденный гейтом дефект в ветке релиза: запрещено — фикс отдельной веткой fix/… и PR, затем этап 8 заново; иначе release-PR перестаёт быть docs-only и proof теряет силу
- Деплой из ветки этапа возможен только потому, что workflow лежит в main; если владелец выберет ветку main вместо ветки этапа — результат тот же по коду (site/ совпадает), но run id надо сверить с фактической веткой; пустое поле only опубликует все 12 alias, включая final-dev3 — недопустимо
- Несовпадение SHA-256 live final-dev4 с локальной сборкой означает, что деплой шёл не из того дерева или сборка недетерминирована (хэши ассетов, дата в маркерах) — разобраться до отчёта, не «принять»
- Первый запрос к Cloudflare может попасть на старый эдж (DEPLOY.md): readback дважды подряд с паузой; workflow ждёт 15 с — вручную дать 30–60 с
- В PowerShell curl — псевдоним Invoke-WebRequest: использовать curl.exe и Get-FileHash; сравнивать SHA-256 без учёта регистра
- Версии в RESUME/boards/FINAL-QA-CHECKLIST исторически расходились с кодом (этап 1 синхронизировал) — брать значения только grep-ом из scripts, не переписывать из памяти
- Нумерация строк списка владельцев: шапка = 0, строка 6 исключена; счёт 44 + 94/96 должен сойтись со spec «Приёмка» — при расхождении искать ошибку в таблице, а не менять spec
- Остальные 10 alias по-прежнему отдают релиз 75558d9: verify-live-previews без --only упадёт — это ожидаемо и не дефект цикла; в отчёте зафиксировать, решение об их обновлении — за владельцем
- Если Часть B этапа 7 отложена, live-гейт measure-fonts запускать без --expect-heading, а строки «Поменять шрифт» — со статусом «отложено», не «сделано»
- CHANGELOG.md принадлежит шаблону репозитория (версии 0.x) — не заводить номер релиза лендинга, писать в [Unreleased]

## Проверка карточки критиком

скоуп: ок; пути: ок; гейты: ок; промпт: ок.

Правки критика, обязательные к применению исполнителем:

- Ожидание «card-v3 → 4» и статусы строк 2/15/…/69 привязать к фактическому исходу этапа 7 (Часть B и пропорция фото могут быть отложены) — сформулировать как «по отчёту этапа 7», не как константу
- Шаг 10 правит spec («Приёмка» → [x], статус в шапке) силами Codex — согласовать с ролевой моделью (spec ведёт Claude) либо ограничить docs-only правку явным списком строк
- Шаг 6: предупредить, что до коммита ветка codex/final-dev4-s8-release = main, и run id надо сверять с фактическим SHA ветки в логе workflow

HANDOFF-RESUME 2.6.2, boards 2.7.1, CLIENT-PREVIEW-HANDOFF 2.4.1, FINAL-QA §13 «Cloudflare deployment» и §17 «Финальная передача заказчику», frozen SHA-256 5234CC5D…FA18E / 14 895 байт, production 656CBCD0…C13E22 / 52 872 байта, релиз 75558d9 остальных alias — подтверждено по RESUME/документам. Все скрипты-гейты, на которые опирается этап (verify-address-links s3, verify-business-hours s4, measure-* s7), создаются более ранними этапами.

## Промпт для Codex

Вставить в Codex CLI в корне репозитория на ветке этапа:

```text
Ты исполнитель этапа 8 «Сборка и публикация» версии final-dev4 лендинга «Гамбарян и партнёры». Работай в корне репозитория, уровень рассуждений medium.
Этап docs-only: код (site/, site-addons/, scripts/, functions/, .github) не менять; найденный дефект — стоп и описание в отчёте, фикс отдельной веткой fix/… и отдельным PR.
Сначала прочитай по порядку: AGENTS.md; docs/RESUME.md; docs/CODEX-WORKING-MODEL.md; docs/tasks/codex/2026-09-06-final-dev4-stage-8.md целиком; в docs/tasks/2026-09-06-final-dev4-spec.md — «Порядок реализации» п.8, «Приёмка», «Правила для исполнителя» п.2/5/6, «Реестр решений владельца» (№9), «Открытые вопросы (9)»; docs/DEPLOY.md (Preview, публикация из GitHub Actions, проверка после публикации); docs/FINAL-QA-CHECKLIST.md §2, §13, §17; docs/CONTENT-OWNER-REVISIONS-2026-09-06.md (нумерация строк: шапка = 0, строка 6 исключена).
Предусловие: этапы 1–7 влиты в main (12 alias в карте; scripts/verify-address-links.py, verify-business-hours.py, measure-fonts.py, measure-section-gaps.py, measure-head-top.py существуют). Ветка codex/final-dev4-s8-release от main. Собери через gh pr list --state merged номера и merge-хэши PR #11 и этапов 1–7.
1. Полная пересборка из main в порядке workflow: build-preview --standalone (после него git status чистый, иначе дефект этапа 7), build-font-variants, build-hero-variants, build-action-bar, build-review-numbered.
2. Гейты: verify-client-copy; python -m unittest discover -s scripts/tests; verify-client-previews; node scripts/verify-lead-hook.mjs; npm run check.
3. python -m http.server 8098 из корня; по http://127.0.0.1:8098/build/variants/final-dev4/: verify-address-links, verify-business-hours, measure-fonts (--expect-heading <семейство>, если этап 7 выполнил Часть B), measure-head-top --out /tmp/head-s8, measure-section-gaps --expect-desktop 80 --expect-mobile 48 --allow hero,facts,footer, qa-browser-matrix --target-name final-dev4; qa-browser-matrix http://127.0.0.1:8098/ --all-previews; git diff --check.
4. Аудит маркеров grep-ом: CLIENT-COPY-CONTRACT/VERIFIER, FINAL-DEV4-DESIGN, ACTION-BAR-SPEC, PREVIEW-BROWSER-QA-RUNNER, LIVE-PREVIEW-READBACK, REVIEW-NUMBERED, карта 2.5.0, BUILD-TOOLS — одна версия/дата везде (кроме истории); grep -o '&nbsp;—' build/variants/final-dev4/index.html | wc -l = NBSP_EXPECTED['final-dev4']; sha256sum docs/sources/client-copy-short-v1.0.0.txt = 5234CC5D…FA18E.
5. До деплоя: curl -sS -A gambarian-readback https://final-dev3.gambarian-landing.pages.dev/ | sha256sum; то же для https://gambarian-landing.pages.dev/ (ожидается 656CBCD0…C13E22, 52 872 байта) и https://final-dev4.gambarian-landing.pages.dev/; python -B scripts/verify-live-previews.py --only final-dev4. В PowerShell — curl.exe и Get-FileHash.
6. Деплой делает ТОЛЬКО владелец: GitHub → Actions → Deploy Previews → Run workflow → «Use workflow from» = codex/final-dev4-s8-release (ветку запушить заранее, можно без коммита) → only = final-dev4. Ты не запускаешь workflow, wrangler и deploy-скрипты; поле only пустым не оставлять. Дождись gh run watch <id> → success, сохрани run id и строки Live readback.
7. После деплоя: python -B scripts/verify-live-previews.py --only final-dev4; verify-address-links, verify-business-hours, measure-fonts, measure-head-top, measure-section-gaps, qa-browser-matrix --target-name final-dev4 по https://final-dev4.gambarian-landing.pages.dev/.
8. curl final-dev4 → sha256sum равен sha256sum build/variants/final-dev4/index.html; grep -c: FINAL-DEV4-DESIGN v<версия> → 1, page--final-dev4 → 1, data-action="map_click" → 3, site-footer__label">Связь → 0, card-v3 → 4, svc-eyebrow → 0.
9. Повтори SHA-256 final-dev3 и production — совпадают с «до»; production 656CBCD0…C13E22.
10. Новый docs/tasks/<ДАТА>-final-dev4-status.md (FINAL-DEV4-STATUS v1.0.0): proof-раздел; таблица 44 строк + 94 + 96 со статусом (сделано / сделано по умолчанию / отклонено владельцем / отложено), этапом, merge-хэшем PR и live-подтверждением — распределение строк по этапам в шаге 8 карточки; открытые вопросы; не проверено; ## Related.
11. docs/RESUME.md → 2.7.0 (живое состояние 12 alias, таблица контрактов по grep из кода, цикл завершён); docs/FINAL-QA-CHECKLIST.md (версия, §2, §13 запись final-dev4 LIVE PASS с run id и SHA-256, §17); docs/boards/2026-08-06-versions-links.md → 2.8.0 (строка 12 LIVE PASS, версии, карта пересборки); docs/CLIENT-PREVIEW-HANDOFF.md → 2.5.0 (URL final-dev4, что проверить клиенту).
12. CHANGELOG.md — запись в [Unreleased]; docs/CODEX-WORKING-MODEL.md → 1.1.0 (журнал этапов: этап / ветка / PR / хэш / run / статус); spec — статус в шапке и отметки «Приёмки» с proof, реестр решений не трогать.
Не делай: не меняй код; не деплой сам; не публикуй final-dev3, остальные 10 alias и production; не решай открытые вопросы; идентификаторы моделей в коммит/PR не писать.
Один коммит `docs(final-dev4): release report, live readback, owner list status, handoff refresh` после всех live-проверок, push, draft PR в main по .github/PULL_REQUEST_TEMPLATE.md.
Отчёт в PR: хэш и push; список PR этапов; подтверждение docs-only (git diff --stat main -- site site-addons scripts functions .github пустой); дословный вывод всех гейтов; таблица аудита маркеров; proof публикации (run id, SHA-256 трёх адресов до/после, равенство live final-dev4 локальной сборке); ссылка на status-документ с итоговыми числами; «Проверено / Не проверено / Вопросы владельцу» (подтверждение умолчаний №7/10/11/15/16–17/26/28, ответы №1–2 и №18, обновление остальных 10 alias, готовность отправлять клиенту).
```

## Related

- [Модель работы с Codex](../../CODEX-WORKING-MODEL.md)
- [Задание final-dev4](../2026-09-06-final-dev4-spec.md)
- [Разбор по пунктам](../2026-09-06-final-dev4-items.md)
- [Реестр текстов владельца](../../CONTENT-OWNER-REVISIONS-2026-09-06.md)
- [Рекомендации дизайнеров](../../DESIGN-RECOMMENDATIONS-2026-09-06.md)

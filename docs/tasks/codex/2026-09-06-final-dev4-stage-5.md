# Этап 5: Кубики фактов: заголовок раздела снят, три кубика заголовок → линия → подзаголовок, кремовое поле 32/20, без аккордеонов; контракт 1.4.0, readback 1.3.0, DARK-FACT-CARDS 2.0.0

**Версия:** `FINAL-DEV4-STAGE-5 v1.0.0`

**Дата:** `2026-09-06`

**Ветка:** `codex/final-dev4-s5-facts` → draft PR в `main`

**Исполнитель:** Codex CLI; уровень рассуждений: **max (перестройка интерфейса)** — Перестройка интерфейса: единая схема трёх карточек на desktop и mobile отменяет визуальный контракт 13.08 и per-card CSS, снимает мобильный аккордеон вместе с JS, одновременно меняет контракт копирайта (3 owner-блока, снятие fact-900-v1 в четырёх местах: contract, review-numbered, anchors, тесты), live readback и эталоны; ошибка в любой связке (текст побайтно, порядок owner-id, счётчик тире, clipping-guard runner) ломает гейты всех Preview — уровень max по CODEX-WORKING-MODEL (перестройка UI).

**Приёмка:** Claude (облачная сессия) по `docs/CODEX-WORKING-MODEL.md`; слияние — владелец.

## Цель

В общем site/ секция .facts теряет надстрочник «30+ лет», h2 «Профессиональный опыт в юриспруденции» и золотую .rule (строка 7); кремовое поле ужато локально до 32px сверху/снизу на desktop и 20px на mobile (по умолчанию №10) без правки глобальной --section-pad. Три кубика собраны по единой схеме div.fact-card__title → div.notch (короткая золотая линия, по умолчанию №11) → div.fact-card__sub с текстами дословно из колонки «Правка» строк 8–10 (в кубике 3 — заглавная «В», №12): крупная «30+» и per-card overrides сняты, все заголовки одним кеглем, подзаголовки — другим, тире перед подзаголовками кубиков 1 и 2 нет, содержимое выровнено по верху, золотая рамка кубика 2 сохранена через модификатор. На мобильном тот же столбик; абзацев <p> в кубиках больше нет, поэтому buildToggle не создаёт стрелок (№21), а мёртвый код аккордеона снят из styles.css и app.js. Тексты кубиков — три новых owner-блока fact-30-v1 / fact-precedent-v1 / fact-900-v2 (fact-900-v1 снят везде), контракт копирайта 1.4.0 с синхронизацией маркеров, review-numbered 2.2.0, verify-live-previews 1.3.0 с собственной per-alias проверкой новых кубиков вместо проверки «белого прецедента», эталоны facts-dark-*-v2.0.0.png перерисованы, DARK-FACT-CARDS переиздан как v2.0.0. Счётчик «&nbsp;—» пересчитан и зафиксирован (aria-label секции сохраняется, ожидаемо 15).

## Основание

- Решения владельца (реестр в `../2026-09-06-final-dev4-spec.md`): №4, №5, №6, №11, №12, №19, №21
- Пункты разбора (`../2026-09-06-final-dev4-items.md`): `A:HF-02`, `A:HF-03`, `A:HF-04`, `A:HF-05`, `F:M-01`, `F:M-02`
- Открытые вопросы, выполняемые «по умолчанию» (переделать при другом ответе):
  - №10 — кремовое поле .facts оставить и сузить: padding-block 32px на ≥861px, 20px на ≤860px (рекомендация дизайнера; переделать одной константой при другом ответе)
  - №11 (черточка) — короткая золотая линия .notch 28×2px, как сейчас, между заголовком и подзаголовком; содержимое кубиков по верху (justify-content: flex-start)
  - Архитектурное умолчание: aria-label секции «30+ лет&nbsp;— профессиональный опыт в юриспруденции» сохраняется как accessible name (невидим, уже в ALLOWED_TEXT_ATTRIBUTES) — счётчик «&nbsp;—» не меняется; при желании владельца снять — минус одно тире и правка NBSP_EXPECTED
  - Архитектурное умолчание: единый кегль заголовков = текущий desktop-кегль кубика 2 clamp(28px, 2.4vw, 36px) / 26px на mobile; подзаголовки 15px/600 (текущий .fact-card__sub); золотая рамка кубика 2 сохраняется (пока владелец не скажет иначе)

## Не в скоупе этапа

- Плашка .facts-bar (строки 11, 13) — уже сделана этапами 2–3; здесь не трогать ни текст, ни ссылку карты
- Шрифт заголовков кубиков (семейство/курсив) — этап 7 (открытые №1–2); .fact-card__title остаётся на var(--font-serif) 500, чтобы этап 7 сменил его одной переменной
- Глобальные отступы секций (--section-pad, №28) — этап 7; здесь только локальный override кремового поля .facts
- Runner qa-browser-matrix остаётся 1.4.2: на кубиках без <p> его accordion-гейт не срабатывает; переписка условия toggle-missing и проверка «тумблер запрещён» — runner 1.5.0 в этапе 6
- Секция услуг, порядок вкладок, свайп — этап 6
- Отдельный документ docs/tasks/<дата>-fact-cards-hierarchy.md не создаётся: контракт переиздаётся в docs/tasks/2026-08-13-dark-fact-cards.md v2.0.0, задание — эта карточка
- Frozen source docs/sources/client-copy-short-v1.0.0.txt и APPROVED_COPY_ITEMS (блоки 2.6, 2.10, 2.14 остаются в allowlist неиспользуемыми) — не менять
- Пересборка/деплой final-dev3 и production; wrangler; поле only пустым

## Шаги

### 1. Создать ветку этапа от main после слияния этапа 4 и проверить предпосылки этапов 1–4.

Файлы: `scripts/review_numbered_contract.py`, `scripts/verify-live-previews.py`, `scripts/client_copy_contract.py`, `site/index.html`

git fetch origin && git checkout main && git pull --ff-only && git checkout -b codex/final-dev4-s5-facts (если PR этапа 4 ещё не влит — от codex/final-dev4-s4-hours, указать в PR). Прочитать AGENTS.md → docs/RESUME.md → docs/CODEX-WORKING-MODEL.md → карточку → spec «Реестр решений владельца» (№11, 12, 21; №4–6, 19), «Открытые вопросы» (№10, №11-черточка — по умолчанию), «Порядок реализации» п.5 → пункты A:HF-02…HF-05, F:M-01, F:M-02 → docs/CONTENT-OWNER-REVISIONS-2026-09-06.md строки 7–10 (колонка «Правка», дословно) → docs/DESIGN-RECOMMENDATIONS-2026-09-06.md №10, №11, №21 → docs/tasks/2026-08-13-dark-fact-cards.md (отменяемый визуальный контракт). Убедиться, что в базе: OWNER_REVIEW_IDS содержит fact-30-v1, fact-precedent-v1, fact-900-v1, fact-900-v2 и OWNER_REVIEW_ANCHORS содержит fact-900-v1 (этап 1); в verify-live-previews.py словарь NBSP_EXPECTED и условная проверка 2.10 (этап 1/2); CONTRACT_VERSION 1.3.x (этапы 2–4); в site/index.html есть data-business-closed (этап 4). Записать в отчёт текущее число «&nbsp;—» в site/index.html (ожидаемо 15) и значение NBSP_EXPECTED['final-dev4'].

Проверка: git branch --show-current → codex/final-dev4-s5-facts; grep -c 'fact-precedent-v1' scripts/review_numbered_contract.py → 1; grep -c 'NBSP_EXPECTED = {' scripts/verify-live-previews.py → 1; grep -o '&nbsp;—' site/index.html | wc -l → записать (ожидаемо 15)

### 2. Перестроить секцию фактов в site/index.html: снять заголовок раздела, локальный класс кремового поля, три кубика по единой схеме с текстами дословно.

Файлы: `site/index.html`

В <section class="facts" aria-label="30+ лет&nbsp;— профессиональный опыт в юриспруденции"> (aria-label НЕ трогать): у контейнера класс section-pad заменить на facts__container (<div class="container facts__container">); удалить три строки <div class="eyebrow eyebrow--wine">30+ лет</div>, <h2 class="section-title section-title--ink section-title--narrow">Профессиональный опыт в юриспруденции</h2>, <div class="rule"></div>. Три карточки .facts-grid заменить целиком на: (1) <div class="fact-card" data-owner-copy-id="fact-30-v1"><div class="fact-card__title">30+ лет</div><div class="notch"></div><div class="fact-card__sub">профессиональный опыт в юриспруденции</div></div>; (2) <div class="fact-card fact-card--accent" data-owner-copy-id="fact-precedent-v1"><div class="fact-card__title">Создание прецедента в международной судебной практике</div><div class="notch"></div><div class="fact-card__sub">возвращение похищенного ребёнка при незарегистрированных родительских правах.</div></div> (ё в «ребёнка», точка в конце — как прислано, строка 9); (3) <div class="fact-card" data-owner-copy-id="fact-900-v2"><div class="fact-card__title">Автор более 900 экспертных статей</div><div class="notch"></div><div class="fact-card__sub">В области уголовного, семейного и миграционного права, основанных на многолетнем опыте адвокатской деятельности</div></div> (заглавная «В», без точки — строка 10). Никаких <p>, .fact-card__head/__num/__unit, data-copy-id="2.6"/"2.10", fact-900-v1 в секции не остаётся; тире «—» перед подзаголовками не ставится (в присланном тексте его нет; №11). Плашку .facts-bar не трогать.

Проверка: grep -c 'data-owner-copy-id="fact-30-v1"\|data-owner-copy-id="fact-precedent-v1"\|data-owner-copy-id="fact-900-v2"' site/index.html → 3; grep -c 'fact-900-v1\|data-copy-id="2.6"\|data-copy-id="2.10"\|fact-card__head\|fact-card__num\|fact-card__unit\|eyebrow--wine">30+ лет\|Профессиональный опыт в юриспруденции</h2>' site/index.html → 0; sed -n '/class="facts"/,/class="facts-bar"/p' site/index.html | grep -c '<p>\|<p ' → 0; grep -c 'class="container facts__container"' site/index.html → 1; grep -c 'aria-label="30+ лет&nbsp;— профессиональный опыт в юриспруденции"' site/index.html → 1; grep -o '&nbsp;—' site/index.html | wc -l → то же число, что в шаге 1

### 3. Переписать CSS кубиков: единые .fact-card__title/.notch/.fact-card__sub, локальное кремовое поле, снятие per-card overrides и мобильной сетки.

Файлы: `site/styles.css`

Блок «3. Факты» (styles.css ~545–668): оставить .facts, .facts-grid (align-items: stretch), .fact-card (position/overflow/фон #101214/рамка/radius/padding 34px 32px 30px/flex column) и .fact-card::before; ДОБАВИТЬ .facts__container { padding-block: 32px; } (кремовое поле; --section-pad не менять), .fact-card { justify-content: flex-start; } (содержимое по верху), .fact-card--accent { border-color: rgba(240, 174, 31, 0.5); } вместо .fact-card[data-copy-id="2.10"], .fact-card__title { margin: 0; font-family: var(--font-serif); font-weight: 500; font-size: clamp(28px, 2.4vw, 36px); line-height: 1.12; letter-spacing: 0; color: #fff; text-wrap: pretty; } (nowrap запрещён — docs/ERRORS.md 2026-08-13), .fact-card .notch { margin: 14px 0 12px; background: rgba(240, 174, 31, 0.85); }, .fact-card__sub { margin: 0; font-size: 15px; font-weight: 600; line-height: 1.5; color: rgba(255, 255, 255, 0.85); text-wrap: pretty; }. УДАЛИТЬ: .fact-card__head, .fact-card__num, .fact-card__unit, .fact-card p, весь @media (min-width: 861px) блок с overrides 2.6/2.10/fact-900-v1 (~619–668). В мобильном блоке @media (max-width: 860px) (~1542–1676): удалить .facts .rule, сетку .fact-card { display:grid; grid-template-columns } и все правила .fact-card__head/__num/__sub/.notch с grid-column, per-card overrides 2.10/fact-900-v1, .fact-card p (обе записи), .fact-card { cursor: pointer }, .fact-card.is-open p, .fact-card__toggle (+::before, [hidden], :focus-visible), .fact-card__chevron (+.is-open); оставить .facts-grid { gap: 12px } и .facts-bar { margin-top: 14px; padding: 16px 18px }; добавить .facts__container { padding-block: 20px; } .fact-card { padding: 18px 18px 16px; } .fact-card__title { font-size: 26px; line-height: 1.15; }. Удалить блок @supports (interpolate-size: allow-keywords) { @media (max-width: 720px) … .fact-card { transition: height … } } (~1525–1530) и строку .fact-card, .fact-card__chevron { transition: none; } из @media (prefers-reduced-motion: reduce) (~1535). Соседние секции и Action Bar не трогать.

Проверка: grep -c 'fact-card__head\|fact-card__num\|fact-card__unit\|fact-card__toggle\|fact-card__chevron\|interpolate-size\|data-copy-id="2.10"\|fact-900-v1\|data-copy-id="2.6"' site/styles.css → 0; grep -c '^\.fact-card__title\|^\.fact-card__sub\|^\.facts__container\|^\.fact-card--accent' site/styles.css → 4; grep -c 'facts__container' site/styles.css → 2 (desktop + mobile); grep -c 'section-pad' site/styles.css → без изменений против base

### 4. Снять мёртвый код аккордеона из app.js (тумблер строился только при <p>, которых больше нет).

Файлы: `site/app.js`

Удалить целиком блок «Раскрывающиеся карточки фактов (только мобильный)» (~601–679: комментарий, factCards/factsMq, buildToggle, setExpanded, обработчики click, syncMode и подписка на factsMq) — по решению №21 стрелок нет ни у одного кубика, скрытого текста нет. Закрывающие })(); IIFE сохранить. Остальные блоки (карусель направлений, форма, Hero) не трогать.

Проверка: node --check site/app.js → без ошибок; grep -c 'fact-card\|buildToggle\|factsMq\|Показать полностью' site/app.js → 0; python -B scripts/verify-client-copy.py (после шага 5) → PASS без «неизвестный динамический UI-текст»

### 5. Контракт копирайта 1.4.0: три новых owner-блока, снятие fact-900-v1, чистка allowlist, синхронизация маркеров.

Файлы: `scripts/client_copy_contract.py`, `docs/RESUME.md`, `docs/CONTENT-APPROVED.md`, `docs/CONTENT-SOURCE-MAP.md`, `docs/boards/2026-08-06-versions-links.md`, `docs/FINAL-QA-CHECKLIST.md`, `docs/CONTENT-EXTRA.md`, `docs/CLIENT-PREVIEW-HANDOFF.md`

OWNER_APPROVED_COPY: удалить ключ "fact-900-v1"; добавить (нормализованные строки, обычные пробелы): "fact-30-v1": "30+ лет профессиональный опыт в юриспруденции"; "fact-precedent-v1": "Создание прецедента в международной судебной практике возвращение похищенного ребёнка при незарегистрированных родительских правах."; "fact-900-v2": "Автор более 900 экспертных статей В области уголовного, семейного и миграционного права, основанных на многолетнем опыте адвокатской деятельности" — у каждого комментарий: строка списка владельцев (8/9/10), заменённый клиентский блок (2.6/2.10/2.14), решение (№11 тире снято; №12 заглавная «В»). ALLOWED_OUTSIDE_COPY_TEXT: удалить "30+ лет" и "Профессиональный опыт в юриспруденции" только если grep по текстовым узлам site/index.html даёт 0 (после шага 2 «30+ лет» живёт внутри owner-блока, а не вне data-copy-id). ALLOWED_DYNAMIC_UI_TEXT: удалить "Показать полностью" (строки в JS больше нет). ALLOWED_TEXT_ATTRIBUTES: строку aria-label секции НЕ удалять. Bump: CONTRACT_VERSION — следующий minor после этапа 4 (ожидаемо 1.3.2 → 1.4.0), CONTRACT_DATE — <ДАТА>; docstring :3 и все документы по grep -rn 'CLIENT-COPY-CONTRACT v\|Client Copy contract' docs scripts (кроме docs/reviews, ERRORS, карточек этапов) — одна версия/дата; счётчик owner-блоков в RESUME/CONTENT-APPROVED/CONTENT-SOURCE-MAP/boards → «45 client + 18 owner».

Проверка: python -c "import sys;sys.path.insert(0,'scripts');import client_copy_contract as c;print(c.CONTRACT_VERSION,len(c.OWNER_APPROVED_COPY),'fact-900-v1' in c.OWNER_APPROVED_COPY,'Показать полностью' in c.ALLOWED_DYNAMIC_UI_TEXT)" → 1.4.0 18 False False; после пересборки python -B scripts/verify-client-copy.py → PASS … owner-approved 18 block; contract v1.4.0 | <ДАТА>; grep -rn 'CLIENT-COPY-CONTRACT v' scripts docs --include=*.py --include=*.md | grep -v 'docs/reviews\|HANDOFF\|ERRORS\|final-dev4-\|codex/' → везде v1.4.0 | <ДАТА>

### 6. Review-numbered 2.2.0: снять fact-900-v1 и его anchor, метки новых кубиков по порядку источника.

Файлы: `scripts/review_numbered_contract.py`, `scripts/build-review-numbered.py`

OWNER_REVIEW_IDS: удалить "fact-900-v1"; оставить "fact-30-v1": "2.6", "fact-precedent-v1": "2.10", "fact-900-v2": "2.14" первыми (порядок ключей = порядок в source). OWNER_REVIEW_ANCHORS: удалить ключ "fact-900-v1" (у новых кубиков бейдж ставится на контейнер, anchor не нужен; anchor yulia-card-v2 остаётся). REVIEW_NUMBERED_VERSION = "2.2.0", REVIEW_NUMBERED_UPDATED = "<ДАТА>". build-review-numbered.py не менять, если этап 1 сделал вставку обобщённой; иначе остановиться и написать в отчёт.

Проверка: python -B scripts/build-review-numbered.py → «Проверка пройдена»; grep -o 'data-review-id="[^"]*"' build/variants/review-numbered/index.html | head -3 | tr '\n' ' ' → 2.6 2.10 2.14; grep -rc 'fact-900-v1' scripts/*.py scripts/tests/*.py site/*.html site/*.css → везде 0

### 7. Live readback 1.3.0: собственная per-alias проверка новых кубиков вместо «белого прецедента», пересчёт тире.

Файлы: `scripts/verify-live-previews.py`

Добавить словарь FACT_CARD_MARKERS = {"final-dev4": ('data-owner-copy-id="fact-30-v1"', 'data-owner-copy-id="fact-precedent-v1"', 'data-owner-copy-id="fact-900-v2"')} и FACT_CARD_FORBIDDEN = {"final-dev4": ('class="fact-card__num"', 'Профессиональный опыт в юриспруденции</h2>', 'data-owner-copy-id="fact-900-v1"')}; в check_preview для branch из FACT_CARD_MARKERS: каждый маркер ровно 1 раз в page (иначе «кубик … не доехал»), запрещённые — 0 раз, в живом styles.css есть правило '.fact-card__title' (иначе «стили кубиков старые»). Условную проверку 2.10 (маркер class="fact-card__unit">прецедента</span>) оставить для остальных alias (они отдают релиз 75558d9). NBSP_EXPECTED['final-dev4']: пересчитать grep -o '&nbsp;—' build/variants/final-dev4/index.html | wc -l после сборки — ожидаемо 15 (aria-label секции сохранён, тире карточек были без &nbsp;); если число иное — записать фактическое и объяснить в отчёте; комментарий у словаря обновить (этап 5). Docstring :4 → LIVE-PREVIEW-READBACK v1.3.0 | <ДАТА>, READBACK_VERSION = "1.3.0".

Проверка: python -B scripts/verify-live-previews.py --only final-dev3 → PASS final-dev3, PASS production (скрипт не сломан; там маркеров dev4 нет); python -B scripts/verify-live-previews.py --only final-dev4 → до деплоя FAIL с текстом про кубики/маркеры, но НЕ код 2; test "$(grep -o '&nbsp;—' build/variants/final-dev4/index.html | wc -l)" = "$(python -c "import re;print(re.search(r'\"final-dev4\": (\d+)',open('scripts/verify-live-previews.py',encoding='utf-8').read()).group(1))")"

### 8. Unit-тесты: drift-тесты трёх новых кубиков, снятие теста fact-900-v1.

Файлы: `scripts/tests/test_verify_client_copy.py`

test_owner_approved_fact_900_drift_fails → test_owner_approved_fact_900_v2_drift_fails: replace("В области уголовного", "в области уголовного", 1) → assert 'owner:fact-900-v2' in problems (проверяет заглавную «В», №12). Новый test_owner_approved_fact_cards_drift_fails с subTest: fact-30-v1 — "профессиональный опыт в юриспруденции</div>" → "опыт в юриспруденции</div>"; fact-precedent-v1 — "в международной судебной практике" → "в судебной практике"; каждая мутация → 'owner:<id>' в problems. Новый test_fact_cards_have_no_paragraphs: в site/index.html между 'class="facts"' и 'class="facts-bar"' нет '<p' (№21 — нет скрытого текста, нет стрелок). Тест инварианта owner-id ↔ OWNER_REVIEW_IDS (этап 1) и остальные — без изменений.

Проверка: python -m unittest discover -s scripts/tests -v → OK (число тестов = после этапа 4 + 2), subTest без failures; временно вернуть "в области" строчной в OWNER_APPROVED_COPY['fact-900-v2'] → test_current_source_passes падает; вернуть

### 9. Пересобрать standalone и все производные, прогнать полный набор гейтов (runner 1.4.2 без правок).

Файлы: `site/gambarian-standalone.html`, `build/variants/final-dev4`

python -B scripts/build-preview.py site/gambarian-standalone.html --standalone (обязательно: standalone — source-target верификатора и инлайнит app.js/styles.css) → build-font-variants → build-hero-variants → build-action-bar → build-review-numbered → verify-client-copy → unittest → verify-client-previews → verify-lead-hook → python -m http.server 8098 (фон, из корня) → verify-business-hours и verify-address-links по http://127.0.0.1:8098/build/variants/final-dev4/ (регрессия этапов 3–4) → qa-browser-matrix --all-previews (ожидается 194/194: у кубиков без <p> hasExpandableContent=false, accordion-гейты молчат, head=null; clipping-guard проверяет .fact-card целиком) → git diff --check. build/ руками не править и не коммитить.

Проверка: все гейты код 0; grep -c 'fact-card__title' site/gambarian-standalone.html build/variants/final-dev4/index.html → ≥3 и 3; grep -c 'fact-card__toggle\|buildToggle' site/gambarian-standalone.html → 0; в JSON Lines runner нет строк 'fact-card-mobile-accordion' и 'fact-card-horizontal-clipping'

### 10. Перерисовать эталоны кубиков v2.0.0 (1440 и 390) с локальной сборки final-dev4.

Файлы: `docs/design-references/facts-dark-1440-v2.0.0.png (новый)`, `docs/design-references/facts-dark-390-v2.0.0.png (новый)`

При запущенном python -m http.server 8098 выполнить одноразовый Playwright-скрипт (не коммитить): from playwright.sync_api import sync_playwright; base='http://127.0.0.1:8098/build/variants/final-dev4/'; для (1440,900,'facts-dark-1440-v2.0.0.png') и (390,844,'facts-dark-390-v2.0.0.png'): page=browser.new_page(viewport=…); page.goto(base); page.wait_for_load_state('networkidle'); page.locator('.facts').screenshot(path='docs/design-references/'+name). Прежние facts-dark-*-v1.0.0.png не удалять (история контракта 1.x); состояний collapsed/expanded больше нет — один файл на viewport. Визуально сверить: у трёх кубиков заголовок → линия → подзаголовок на одной высоте, заголовки одним кеглем, «30+ лет» без крупной цифры, тире перед подзаголовками нет, кремовое поле узкое, стрелок нет.

Проверка: ls docs/design-references | grep -c 'facts-dark-.*v2.0.0.png' → 2; python -c "from PIL import Image;print(Image.open('docs/design-references/facts-dark-1440-v2.0.0.png').size[0], Image.open('docs/design-references/facts-dark-390-v2.0.0.png').size[0])" → 1440-ширина контейнера и 390 (ширина секции) — снимки не пустые

### 11. Документы: DARK-FACT-CARDS 2.0.0, owner-правки кубиков, allowlist-статусы 2.6/2.10, экран 3, чек-лист.

Файлы: `docs/tasks/2026-08-13-dark-fact-cards.md`, `docs/CONTENT-OWNER-EDITS.md`, `docs/CONTENT-APPROVED.md`, `docs/CONTENT-SOURCE-MAP.md`, `docs/SCREEN-COMPOSITION.md`, `docs/FINAL-QA-CHECKLIST.md`, `docs/RESUME.md`, `docs/boards/2026-08-06-versions-links.md`

dark-fact-cards.md → DARK-FACT-CARDS v2.0.0 | <ДАТА>, статус «FINAL-DEV4 CANDIDATE / LOCAL PASS / LIVE PENDING»: раздел «Решение владельца» дополнить решениями 2026-09-06 (№11: крупная «30+» и desktop-центрирование 13.08 отменены, заголовки одним кеглем, тире снято, тот же столбик на mobile; №12; №21; умолчания №10 32/20 и №11-линия); раздел «Текст карточек» — три owner-блока дословно и их нормализованные строки, fact-900-v1 superseded; «Визуальный контракт» переписать под единую схему (цвета карточек прежние; title clamp(28px,2.4vw,36px)/26px, notch 28×2 rgba(240,174,31,.85) margin 14/12, sub 15px/600 rgba(255,255,255,.85), рамка кубика 2 через .fact-card--accent, содержимое по верху, кремовое поле 32/20, mobile — тот же столбик, аккордеона нет); «Автоматическая приёмка» — текущие версии (contract 1.4.0, verifier 1.1.0, review 2.2.0, runner 1.4.2 194/194, readback 1.3.0); «Эталонные изображения» → v2.0.0 (v1.0.0 — история). CONTENT-OWNER-EDITS.md (следующая минорная версия, <ДАТА>): раздел «Кубики фактов (этап 5, 2026-09-06)» — строки 7–10, три owner-id с текстами дословно, снятый заголовок раздела, aria-label сохранён, fact-900-v1 закрыт. CONTENT-APPROVED.md: у 2.6 и 2.10 «Разрешён» → «да (заменён owner-override fact-30-v1 / fact-precedent-v1)», список owner-блоков +3 −fact-900-v1, счётчик «45 client + 18 owner», версия документа. CONTENT-SOURCE-MAP.md:47 строка «Факты» → owner-id кубиков; версия. SCREEN-COMPOSITION.md «Экран 3 — факты»: без заголовка раздела, три кубика заголовок/линия/подзаголовок. FINAL-QA-CHECKLIST.md: §2 версии (contract 1.4.0, review 2.2.0), §3 запись о кубиках, erratum 2.10 помечен закрытым перестройкой кубиков (клип невозможен: одна колонка, без nowrap); версия чек-листа patch. RESUME.md и boards: таблицы версий (Client Copy contract 1.4.0 «45 client + 18 owner», Review Numbered 2.2.0), ссылка «Действующее задание: dark fact cards» остаётся (документ переиздан). Исторические docs/reviews, HANDOFF, ERRORS не править.

Проверка: grep -c 'DARK-FACT-CARDS v2.0.0' docs/tasks/2026-08-13-dark-fact-cards.md → 1; grep -c 'fact-precedent-v1' docs/CONTENT-OWNER-EDITS.md docs/CONTENT-APPROVED.md → ≥1 и ≥1; grep -rn 'Review Numbered\|Review numbering' docs/RESUME.md docs/boards/2026-08-06-versions-links.md docs/FINAL-QA-CHECKLIST.md → везде 2.2.0; git diff --check → пусто

### 12. Коммит, push, draft PR; после деплоя владельцем — live-приёмка.

Файлы: `.github/PULL_REQUEST_TEMPLATE.md`, `docs/tasks/codex/2026-09-06-final-dev4-stage-5.md`

Один коммит `feat(final-dev4): fact cards title/line/sub hierarchy, copy contract 1.4.0` (без идентификаторов моделей и trailer-ов). git push -u origin codex/final-dev4-s5-facts. Draft PR в main по шаблону (Type: New feature + Documentation; Related: PR этапа 4) с отчётом по разделу «Отчёт». До деплоя снять SHA-256 final-dev3 и production (curl -sS -A gambarian-readback … | sha256sum; в PowerShell curl.exe + Get-FileHash). Деплой запускает владелец: Actions → Deploy Previews → ветка codex/final-dev4-s5-facts → only=final-dev4 (никогда не пусто). После деплоя: python -B scripts/verify-live-previews.py --only final-dev4 → PASS; python scripts/qa-browser-matrix.py https://final-dev4.gambarian-landing.pages.dev/ → PASS; curl -sS -A gambarian-readback https://final-dev4.gambarian-landing.pages.dev/ | grep -c 'Профессиональный опыт в юриспруденции</h2>' → 0, | grep -c 'data-owner-copy-id="fact-' → 3, | grep -c 'fact-card__num' → 0, | grep -c 'class="container facts__container"' → 1; повторить SHA-256 final-dev3 и production — совпадают (production 656CBCD0…C13E22). wrangler напрямую не запускать.

Проверка: git log -1 --format=%H; git status --short → пусто; ссылка на draft PR; CI зелёный; после деплоя PASS verify-live-previews --only final-dev4 и неизменные SHA-256 final-dev3/production

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
- `python -m http.server 8098 (фон, из корня) && python scripts/verify-business-hours.py http://127.0.0.1:8098/build/variants/final-dev4/ && python scripts/verify-address-links.py http://127.0.0.1:8098/build/variants/final-dev4/ (регрессия этапов 3–4)`
- `python scripts/qa-browser-matrix.py http://127.0.0.1:8098/build/variants/final-dev4/ --target-name final-dev4`
- `python scripts/qa-browser-matrix.py http://127.0.0.1:8098/ --all-previews (ожидается 194/194)`
- `git diff --check`
- `python -B scripts/verify-live-previews.py --only final-dev3 (живой PASS: скрипт не сломан)`
- `после деплоя владельцем (Deploy Previews → ветка codex/final-dev4-s5-facts → only=final-dev4): python -B scripts/verify-live-previews.py --only final-dev4`
- `после деплоя: python scripts/qa-browser-matrix.py https://final-dev4.gambarian-landing.pages.dev/`
- `после деплоя: curl -sS -A gambarian-readback https://final-dev3.gambarian-landing.pages.dev/ | sha256sum и curl -sS -A gambarian-readback https://gambarian-landing.pages.dev/ | sha256sum — совпадают с замером до деплоя (production 656CBCD0…C13E22)`

## Версии и маркеры

- scripts/client_copy_contract.py: CLIENT-COPY-CONTRACT 1.3.x → 1.4.0 | <ДАТА> (docstring :3, CONTRACT_VERSION/DATE) → docs/RESUME.md, docs/CONTENT-APPROVED.md, docs/CONTENT-SOURCE-MAP.md, docs/boards/2026-08-06-versions-links.md, docs/FINAL-QA-CHECKLIST.md, docs/CONTENT-EXTRA.md, docs/tasks/2026-08-13-dark-fact-cards.md, docs/CLIENT-PREVIEW-HANDOFF.md (всё, что находит grep 'CLIENT-COPY-CONTRACT v')
- scripts/review_numbered_contract.py: REVIEW-NUMBERED 2.1.1 → 2.2.0 | <ДАТА> (снят fact-900-v1 и его anchor) → RESUME, boards, FINAL-QA-CHECKLIST
- scripts/verify-live-previews.py: LIVE-PREVIEW-READBACK 1.2.1 → 1.3.0 | <ДАТА> (per-alias проверка кубиков; NBSP_EXPECTED final-dev4 пересчитан)
- docs/tasks/2026-08-13-dark-fact-cards.md: DARK-FACT-CARDS 1.0.3 → 2.0.0 | <ДАТА>; эталоны facts-dark-{1440,390}-v2.0.0.png
- Документы: CONTENT-OWNER-EDITS — следующая минорная; CONTENT-APPROVED, CONTENT-SOURCE-MAP, SCREEN-COMPOSITION, FINAL-QA-CHECKLIST — patch/minor с датой <ДАТА>
- Не меняются: PREVIEW-BROWSER-QA-RUNNER 1.4.2 (1.5.0 — этап 6), CLIENT-COPY-VERIFIER 1.1.0, карта Preview 2.5.0, FINAL-DEV4-DESIGN (правки только в site/), FINAL-DEV3-DESIGN 2.0.2, Action Bar, Lead schema 2.0.0, --section-pad

## Приёмка этапа

- [ ] site/index.html: секция .facts без .eyebrow/h2/.rule, aria-label сохранён; контейнер .facts__container; ровно три .fact-card с data-owner-copy-id fact-30-v1 / fact-precedent-v1 / fact-900-v2, у каждой DOM-порядок .fact-card__title → .notch → .fact-card__sub; ни одного <p>, .fact-card__head/__num/__unit, data-copy-id 2.6/2.10, fact-900-v1 (в index.html, standalone, styles.css, app.js, scripts)
- [ ] Тексты кубиков побайтно = колонка «Правка» строк 8–10: «30+ лет» / «профессиональный опыт в юриспруденции»; «Создание прецедента в международной судебной практике» / «возвращение похищенного ребёнка при незарегистрированных родительских правах.» (ё, точка); «Автор более 900 экспертных статей» / «В области уголовного, семейного и миграционного права, основанных на многолетнем опыте адвокатской деятельности» (заглавная «В», без точки); тире перед подзаголовками нет
- [ ] Playwright 390 и 1440 (локальная сборка final-dev4): computed font-size .fact-card__title одинаков у трёх карточек, .fact-card__sub — одинаков; .notch между ними высотой ≥1px; offsetTop title < notch < sub; getComputedStyle(title).whiteSpace !== 'nowrap'; document.querySelector('.fact-card__toggle') === null; scrollWidth === clientWidth
- [ ] Кремовое поле: на 1440 (factsGrid.top − facts.top) = 32 ±1 и (facts.bottom − factsBar.bottom) = 32 ±1; на 390 — 20 ±1; глобальная --section-pad не изменена (git diff styles.css без правки :40)
- [ ] python -B scripts/verify-client-copy.py → PASS CLIENT-COPY-VERIFIER v1.1.0: 26 HTML targets, 24 unique files, owner-approved 18 block; contract v1.4.0 | <ДАТА>; frozen SHA прежний; git diff docs/sources пустой
- [ ] python -B scripts/build-review-numbered.py → PASS, первые бейджи 2.6 2.10 2.14; OWNER_REVIEW_IDS без fact-900-v1; python -B scripts/verify-client-previews.py → PASS (12 Preview); unittest OK с drift-тестами fact-30-v1 / fact-precedent-v1 / fact-900-v2
- [ ] qa-browser-matrix 1.4.2 --all-previews → 194/194 без fact-card-horizontal-clipping и fact-card-mobile-accordion-*; verify-business-hours и verify-address-links PASS (регрессии нет)
- [ ] verify-live-previews.py v1.3.0: FACT_CARD_MARKERS/FORBIDDEN per-alias для final-dev4, NBSP_EXPECTED['final-dev4'] = фактическое число «&nbsp;—» в сборке (ожидаемо 15), docstring и READBACK_VERSION совпадают; --only final-dev3 живьём PASS
- [ ] Эталоны docs/design-references/facts-dark-1440-v2.0.0.png и facts-dark-390-v2.0.0.png закоммичены; DARK-FACT-CARDS v2.0.0 описывает новую схему и ссылается на них
- [ ] Маркеры CLIENT-COPY-CONTRACT v1.4.0 | <ДАТА> и REVIEW-NUMBERED 2.2.0 синхронизированы во всех источниках из раздела «Версии»; CONTENT-OWNER-EDITS содержит три owner-текста дословно
- [ ] После деплоя only=final-dev4: verify-live-previews --only final-dev4 PASS; live runner PASS; curl: 0 «Профессиональный опыт в юриспруденции</h2>», 3 data-owner-copy-id="fact-, 0 fact-card__num; SHA-256 final-dev3 и production не изменились

## Отчёт в PR (обязательные поля)

- Хэш коммита, подтверждение push в origin/codex/final-dev4-s5-facts, ссылка на draft PR и на PR этапа 4 (база)
- Diff-доказательство: git diff --stat; фрагменты — новая разметка трёх кубиков, удалённые заголовок/eyebrow/rule, CSS .fact-card__title/.notch/.fact-card__sub/.facts__container, удалённый блок аккордеона app.js, OWNER_APPROVED_COPY (+3 −1), OWNER_REVIEW_IDS/ANCHORS, FACT_CARD_MARKERS; явно: diff docs/sources пустой, APPROVED_COPY_ITEMS без изменений
- Таблица «строка списка 7/8/9/10 → owner-id → текст дословно → статус» и строка 96 (мобайл: стрелка, иерархия) со ссылкой на коммит
- Дословный вывод гейтов: verify-client-copy (PASS с owner-approved 18 block, contract v1.4.0), unittest (OK, N тестов), verify-client-previews (PASS 12), build-review-numbered (список бейджей), verify-lead-hook, verify-business-hours, verify-address-links, qa-browser-matrix summary (194/194), git diff --check, verify-live-previews --only final-dev3
- Счётчик тире: grep -o '&nbsp;—' … | wc -l для site/index.html и build/variants/final-dev4/index.html и значение NBSP_EXPECTED['final-dev4']
- Замеры Playwright 1440/390: font-size title/sub у трёх карточек, отступы кремового поля, отсутствие .fact-card__toggle; эталоны v2.0.0 приложены
- Таблица маркеров «было → стало» (contract, review-numbered, readback, DARK-FACT-CARDS, документы)
- Проверено / Не проверено: до деплоя — только локальная сборка; после деплоя — verify-live-previews --only final-dev4, live runner, SHA-256 final-dev3/production; не проверено — шрифт заголовков кубиков (этап 7), глобальные отступы (этап 7)
- Вопросы владельцу (не блокируют): подтвердить умолчания №10 (32/20) и №11-линия по эталонам v2.0.0; сохранённый невидимый aria-label секции «30+ лет — …» (снять при желании); рамка кубика 2 сохранена

## Риски

- Любая «редактура» текстов кубиков (ё/е, точка, регистр «В», тире) нарушает №4–6/№12: сверять каждую строку с колонкой «Правка» строк 8–10, не с разбором
- Если снять fact-900-v1 из OWNER_APPROVED_COPY, но забыть OWNER_REVIEW_IDS/OWNER_REVIEW_ANCHORS или тест инварианта — build-review-numbered/unittest падают; шаги 5, 6, 8 выполнять вместе
- Забытая пересборка site/gambarian-standalone.html после правок styles.css/app.js → verify-client-copy FAIL на source:standalone или расхождение с CI
- Runner 1.4.2 берёт .fact-card__head для head-guard: после перестройки head=null — это допустимо (гейт null-safe), но clipping-guard по .fact-card остаётся; длинный заголовок кубика 2 (6 слов, 28–36px) должен переноситься — nowrap запрещён
- Удаление .fact-card p / .fact-card { cursor:pointer } без удаления JS-блока оставит слушатели на карточках; удалять CSS и JS вместе, иначе клик по карточке будет менять класс is-open вхолостую
- aria-label секции сохраняется намеренно: если его снять «заодно», счётчик «&nbsp;—» станет 14 и live readback упадёт до правки NBSP_EXPECTED
- Allowlist-строки «30+ лет» и «Профессиональный опыт в юриспруденции» удалять только при grep=0 по текстовым узлам; «30+ лет» внутри owner-блока в allowlist не нужен, но лишняя запись не ломает гейт
- Эталоны снимать с локальной сборки final-dev4 при запущенном сервере; в облачном контейнере Chromium требует executable_path (spec, подготовительный шаг 7)
- Этап 7 сменит семейство заголовков: не «улучшать» шрифт кубиков здесь, оставить var(--font-serif)
- Workflow с пустым only опубликует все alias, включая final-dev3 — only=final-dev4 обязательно

## Проверка карточки критиком

скоуп: ок; пути: ок; гейты: ок; промпт: ок.

Правки критика, обязательные к применению исполнителем:

- Исправить ожидаемое число тестов на «после этапа 4 + 2»
- Явно отметить отклонение от подготовительного шага 9 spec (docs/tasks/<дата>-fact-cards-hierarchy.md не создаётся, контракт переиздаётся как DARK-FACT-CARDS v2.0.0) в самой spec на этапе 8, чтобы «Приёмка» не искала отсутствующий документ

Диапазоны styles.css (блок «3. Факты» 545–668, @media 861 :619–668, mobile :1542–1676, @supports :1525–1530, :1535), app.js :601–680, --section-pad :40, .notch 28×2, clamp(28px, 2.4vw, 36px), .fact-card__sub 15px/600, «Показать полностью» в ALLOWED_DYNAMIC_UI_TEXT, aria-label секции в ALLOWED_TEXT_ATTRIBUTES, «30+ лет»/«Профессиональный опыт…» в ALLOWED_OUTSIDE — всё подтверждено. Тире карточек действительно без &nbsp; (2.6 «— профессиональный…», 2.10 «<p>— возвращение…»), aria-label содержит одно &nbsp;— → 15 сохраняется. Поведение runner 1.4.2 без <p> и без тумблера проверено по коду (:443–444, :750–756): гейты молчат. Тексты строк 8–10 совпадают с колонкой «Правка» (ё, точка, заглавная «В»).

## Промпт для Codex

Вставить в Codex CLI в корне репозитория на ветке этапа:

```text
Ты исполнитель этапа 5 «Кубики фактов» версии final-dev4 лендинга «Гамбарян и партнёры». Работай в корне репозитория gambaryan-family-law, уровень рассуждений max.
Сначала прочитай по порядку: AGENTS.md; docs/RESUME.md («Следующий цикл»); docs/CODEX-WORKING-MODEL.md; docs/tasks/codex/2026-09-06-final-dev4-stage-5.md (карточка целиком); в docs/tasks/2026-09-06-final-dev4-spec.md — «Реестр решений владельца» (№11, 12, 21; №4–6, 19), «Открытые вопросы» (№10, №11-черточка — по умолчанию), «Правила для исполнителя», «Порядок реализации» п.5; в docs/tasks/2026-09-06-final-dev4-items.md — A:HF-02, A:HF-03, A:HF-04, A:HF-05, F:M-01, F:M-02; docs/CONTENT-OWNER-REVISIONS-2026-09-06.md строки 7–10 (единственный источник текстов — колонка «Правка», дословно, включая ё в «ребёнка», точку в строке 9 и заглавную «В» в строке 10); docs/DESIGN-RECOMMENDATIONS-2026-09-06.md №10, №11, №21; docs/tasks/2026-08-13-dark-fact-cards.md. Только потом код: site/index.html (секция .facts), site/styles.css (блок «3. Факты» и мобильный блок @media 860px), site/app.js (блок «Раскрывающиеся карточки фактов»), scripts/client_copy_contract.py, scripts/review_numbered_contract.py, scripts/verify-live-previews.py, scripts/tests/test_verify_client_copy.py.
Предусловие: влиты этапы 1–4 (OWNER_REVIEW_IDS содержит fact-30-v1/fact-precedent-v1/fact-900-v2, NBSP_EXPECTED — словарь per-alias, CONTRACT_VERSION 1.3.x, в site/index.html есть data-business-closed). Если нет — остановись на этом пункте и напиши в отчёт.
Ветка codex/final-dev4-s5-facts от main после слияния этапа 4. Draft PR в main по .github/PULL_REQUEST_TEMPLATE.md.
Сделай шаги 2–12 карточки (правки только в site/, scripts/, docs/; build/ руками не править):
1. site/index.html: снять .eyebrow «30+ лет», h2 и .rule секции фактов (aria-label секции оставить); контейнер section-pad → facts__container; три кубика по схеме div.fact-card__title → div.notch → div.fact-card__sub с data-owner-copy-id fact-30-v1 / fact-precedent-v1 (+ класс fact-card--accent) / fact-900-v2, тексты дословно, без <p>, без тире перед подзаголовками, без .fact-card__head/__num/__unit и data-copy-id 2.6/2.10.
2. site/styles.css (блок «3. Факты»): .facts__container padding-block 32px (≤860px — 20px), --section-pad не трогать; единые .fact-card__title (var(--font-serif) 500, clamp(28px,2.4vw,36px), mobile 26px, без nowrap), .notch margin 14/12, .fact-card__sub 15px/600; содержимое по верху; .fact-card--accent — золотая рамка; удалить per-card overrides 2.6/2.10/fact-900-v1 и desktop-медиаблок ≥861px.
2а. site/styles.css (@media ≤860px и хвост файла): удалить мобильную сетку auto 1fr, .facts .rule, весь CSS аккордеона (.fact-card p clamp, .fact-card__toggle, .fact-card__chevron, cursor:pointer, блок @supports interpolate-size, строку .fact-card/.fact-card__chevron в prefers-reduced-motion); добавить .facts__container 20px, .fact-card padding 18px 18px 16px, .fact-card__title 26px.
3. site/app.js: удалить блок аккордеона (factCards/buildToggle/setExpanded/syncMode) целиком; node --check.
4. scripts/client_copy_contract.py: OWNER_APPROVED_COPY −fact-900-v1 +fact-30-v1 «30+ лет профессиональный опыт в юриспруденции», +fact-precedent-v1 «Создание прецедента в международной судебной практике возвращение похищенного ребёнка при незарегистрированных родительских правах.», +fact-900-v2 «Автор более 900 экспертных статей В области уголовного, семейного и миграционного права, основанных на многолетнем опыте адвокатской деятельности»; из ALLOWED_DYNAMIC_UI_TEXT убрать «Показать полностью», из ALLOWED_OUTSIDE_COPY_TEXT — «30+ лет» и «Профессиональный опыт в юриспруденции» при grep=0; aria-label в ALLOWED_TEXT_ATTRIBUTES оставить; bump до 1.4.0 с датой в docstring :3, :11–12 и во всех документах по grep -rn 'CLIENT-COPY-CONTRACT v' docs scripts.
5. scripts/review_numbered_contract.py: снять fact-900-v1 из OWNER_REVIEW_IDS и OWNER_REVIEW_ANCHORS, версия 2.2.0 с датой. scripts/verify-live-previews.py: per-alias FACT_CARD_MARKERS/FORBIDDEN для final-dev4 (три owner-id ровно 1×, нет fact-card__num/старого h2, в styles.css есть .fact-card__title), старую условную проверку 2.10 оставить для других alias, NBSP_EXPECTED['final-dev4'] = фактическое число «&nbsp;—» в сборке (ожидаемо 15), readback 1.3.0. Тесты: fact_900 drift → v2 (мутация «В области» → «в области»), drift-тесты fact-30-v1 и fact-precedent-v1, тест «в секции фактов нет <p>».
6. Пересобрать: python -B scripts/build-preview.py site/gambarian-standalone.html --standalone; build-font-variants, build-hero-variants, build-action-bar, build-review-numbered. Гейты: verify-client-copy (owner-approved 18 block, v1.4.0); python -m unittest discover -s scripts/tests; verify-client-previews; node scripts/verify-lead-hook.mjs; python -m http.server 8098 из корня + verify-business-hours и verify-address-links по http://127.0.0.1:8098/build/variants/final-dev4/; qa-browser-matrix для final-dev4 и --all-previews (194/194, без fact-card-* failures); git diff --check; verify-live-previews --only final-dev3 (живой PASS).
7. Эталоны: с локальной сборки final-dev4 снять .facts на 1440×900 и 390×844 в docs/design-references/facts-dark-1440-v2.0.0.png и facts-dark-390-v2.0.0.png (одноразовый Playwright, v1.0.0 не удалять).
8. Документы: docs/tasks/2026-08-13-dark-fact-cards.md → v2.0.0 (новый визуальный контракт, тексты, эталоны, приёмка), docs/CONTENT-OWNER-EDITS.md (три owner-блока, снятый заголовок, №11/12/21, умолчания №10/11), docs/CONTENT-APPROVED.md и CONTENT-SOURCE-MAP.md (2.6/2.10 заменены override, 45 + 18 owner), docs/SCREEN-COMPOSITION.md «Экран 3», docs/FINAL-QA-CHECKLIST.md (§2 версии, §3, erratum 2.10 закрыт), docs/RESUME.md и docs/boards (contract 1.4.0, review 2.2.0).
Не делай: не меняй тексты кроме строк 7–10, frozen source, плашку .facts-bar, шрифт заголовков (этап 7), --section-pad и отступы других секций, runner qa-browser-matrix (1.5.0 — этап 6), секцию услуг, final-dev3, production, build/; не запускай wrangler; не пиши идентификаторы моделей в коммит/PR. Если решения не хватает — остановись на пункте, сделай остальное, опиши вопрос в отчёте.
Один коммит `feat(final-dev4): fact cards title/line/sub hierarchy, copy contract 1.4.0`, push, draft PR с отчётом: хэш и push; diff-доказательство (разметка кубиков, CSS, JS, контракт, пустой diff docs/sources); дословный вывод всех гейтов; счётчик тире; замеры 1440/390 и эталоны; таблица маркеров «было → стало»; «Проверено / Не проверено / Вопросы владельцу». Деплой делает владелец (Actions → Deploy Previews → ветка этапа → only=final-dev4). До деплоя сними SHA-256 final-dev3 и production (curl -sS -A gambarian-readback … | sha256sum; в PowerShell curl.exe + Get-FileHash); после — python -B scripts/verify-live-previews.py --only final-dev4, python scripts/qa-browser-matrix.py https://final-dev4.gambarian-landing.pages.dev/, curl-проверки из шага 12, повтор SHA-256 (production 656CBCD0…C13E22); допиши proof-блок в PR.
```

## Related

- [Модель работы с Codex](../../CODEX-WORKING-MODEL.md)
- [Задание final-dev4](../2026-09-06-final-dev4-spec.md)
- [Разбор по пунктам](../2026-09-06-final-dev4-items.md)
- [Реестр текстов владельца](../../CONTENT-OWNER-REVISIONS-2026-09-06.md)
- [Рекомендации дизайнеров](../../DESIGN-RECOMMENDATIONS-2026-09-06.md)

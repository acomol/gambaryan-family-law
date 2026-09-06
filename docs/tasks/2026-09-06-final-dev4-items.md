# final-dev4: разбор правок владельцев по пунктам

**Версия:** `FINAL-DEV4-ITEMS v0.1.0`

**Дата:** `2026-09-06`

**Статус:** `РАЗБОР / РЕАЛИЗАЦИЯ НЕ НАЧАТА`

Каждый пункт привязан к строкам списка владельцев (нумерация файла `docs/CONTENT-OWNER-REVISIONS-2026-09-06.md`, шапка таблицы = строка 0), к месту в коде и к номеру вопроса в анкете `2026-09-06-final-dev4-questions.md`. Идентификаторы пунктов имеют префикс группы (A–F), потому что внутри групп нумерация повторяется. Задание, порядок работ и приёмка — `2026-09-06-final-dev4-spec.md`.

Номера строк файлов даны по состоянию ветки `codex/final-dev4` на 2026-09-06 (`main` `2dc66eb`) и служат ориентиром; перед правкой перепроверять `grep`.

Критерии приёмки, где упоминается `verify-live-surface.py`, выполняются в этом репозитории через `python -B scripts/verify-live-previews.py --only final-dev4` плюс `curl`/`grep` по живому адресу, пока скрипт не портирован (spec, подготовительный шаг 5).

Упоминания «общий вопрос 1–5» внутри пунктов относятся к нумерации черновика ТЗ v0.1.0 и читаются по анкете так: 1 (шрифты) → №1 и №2; 2 (фото) → №3; 3 (формулировки) → №4; 4 (свайп) → №7; 5 (карта) → №8. Строка «Вопросы анкеты» у каждого пункта уже в новой нумерации.

## Группа A. Hero и факты (строки 1–13)

Группа A (строки 1–13, Hero + три кубика + плашка). Семь строк с правкой/заметкой: H1 «Поменять шрифт» (2), убрать заголовок секции фактов и ужать кремовое поле (7), единая иерархия заголовок/черта/подзаголовок в трёх кубиках (8–10, + мобайл 96), точка в лицензии (11), «Прием — … / Карлибах, 10» (13). Шесть строк без действий (1, 3, 4, 5, 6, 12). Все правки идут в site/index.html + site/styles.css с регенерацией gambarian-standalone.html (build-preview.py --standalone). Затронутые контракты: CLIENT-COPY-CONTRACT (bump до 1.3.0 с синхронизацией расходящихся маркеров v1.1.0/1.2.0; новые allowlist-строки для 11 и 13; owner override для 8/9/10 в зависимости от ответов), REVIEW-NUMBERED (OWNER_REVIEW_IDS и жёсткий токен fact-900-v1), LIVE-PREVIEW-READBACK (жёсткое правило на .fact-card__unit 2.10; счётчик 23 «&nbsp;—» держится, если aria-label секции фактов и «Прием&nbsp;—» сохраняются), PREVIEW-BROWSER-QA-RUNNER (EXPECTED_FONTS при смене семейства H1; список PREVIEWS при 12-м alias). Отдельное решение до приёмки: final-dev4 как 12-й alias (spec) против RESUME «живое важнее нового» — от него зависят цели всех прогонов и live readback. Вопросов владельцу: 8 (одно-словных/числовых) + ссылки на общие вопросы 1 и 3.

Строки без правки/заметки (действий нет): 1, 3, 4, 5, 6, 12.

### A:HF-01 — Hero — H1

- **Строки списка:** 2, 94
- **Тип:** типографика; **трудоёмкость:** M
- **Вопросы анкеты:** №1, №2
- **Сейчас на сайте:** Развод в Израиле? Адвокат по семейному праву — на русском языке
- **Правка владельца:** Для заметок: «Поменять шрифт». Общая заметка (строка 94): «Выбрать 2 шрифта. В распределении текста по иерархии использовать варианты этих 2-х шрифтов - bold, light и т.д.»
- **Где в коде:**
  - `site/index.html` (76) — h1.hero__title[data-copy-id="1.7"]
  - `site/styles.css` (12-17; 425-435; 1467-1473) — --font-serif/--font-body/--font-narrow; .hero__title (var(--font-serif), 500, clamp(32px,4.6vw,58px)); мобильная рамка ≤860px
  - `site/fonts.css` (28-105) — @font-face: Onest 400–800 ×4 subset (28–65), Playfair Display 500 italic (68–85), 500 normal (88–105)
  - `site/fonts` (8 файлов .woff2) — onest-normal-400-800-*, playfair-display-{italic,normal}-500-*
  - `scripts/build-font-variants.py` (45-49; 247-253) — v1 «Нынешний»; re.sub --font-serif/--font-body (H1 обязан остаться на var(), иначе шрифтовые Preview перестанут его менять)
  - `scripts/qa-browser-matrix.py` (2, 62; 89; 122-124; 232-236, 296-306; 783-785; 966-1002) — RUNNER_VERSION 1.4.1; SHORT_PORTRAIT_VIEWPORTS; EXPECTED_FONTS (title=Playfair Display для всех PREVIEWS); font samples role 'title'; hero-action-bottom; platform-font-* и title-font gate
  - `docs/GAMBARIAN-DESIGN-RULES.md` (33; 109) — «Playfair Display для editorial headings»; смена шрифтов = major
  - `docs/FONT-AND-PHOTO-MEASUREMENTS-2026-09-06.md` (9-43) — runtime-замер CSS.getPlatformFontsForNode: 0 фолбэков, карта селекторов, ограничение «у Playfair только 500»
- **Контракты и гейты:** Copy contract не затрагивается (текст 1.7 неизменен). (1) Браузерная матрица: EXPECTED_FONTS фиксирует title=«Playfair Display» для каждого Preview и сверяет и computed family, и реально отрисованный platform font (qa-browser-matrix.py:986-1002) — перевод H1 на Onest даёт `title-font=Onest expected=Playfair Display` на всех alias, пока не изменён EXPECTED_FONTS + RUNNER_VERSION (сейчас 1.4.1; RESUME:120 всё ещё говорит 1.4.0 — маркер уже расходится). Смена только веса Playfair этот гейт не трогает. (2) Физически есть Onest 400–800 (переменный) и Playfair 500 normal/italic: иерархия «bold/light» (строка 94) внутри Playfair = новые woff2 в site/fonts + fonts.css + preload в index.html + пересборка standalone (data-URI); внутри Onest — без новых файлов. (3) docs/GAMBARIAN-DESIGN-RULES.md:109 — смена шрифтов = major SemVer правил дизайна. (4) Смена числа строк H1 → гейт hero-action-bottom на 360×600 (≤592), 360×668 (≤660), 390×724 (≤716) и v2-специфичный titleLineCount=4. (5) Новая грань без кириллического subset повторит дефект Archivo 2026-08-04.
- **Приёмка:** 1) Грань физически есть: `[...document.fonts].some(f => f.family==='<семейство>' && f.weight==='<вес>' && f.status==='loaded')` в Playwright + `ls site/fonts/*<вес>*.woff2` + соответствующий @font-face в site/fonts.css. 2) Отрисовка: гейт platform-font-* и title-font в `python scripts/qa-browser-matrix.py http://127.0.0.1:8098/ --all-previews` (после обновления EXPECTED_FONTS/RUNNER_VERSION, если семейство меняется) без failures, включая hero-action-bottom на 360×600/360×668/390×724; критерий spec:84 — 0 элементов с системным фолбэком на 1440 и 390 тем же замером CSS.getPlatformFontsForNode. 3) `python -B scripts/build-font-variants.py` без ошибок; `python -B scripts/verify-client-copy.py` PASS. Цель прогонов — каталог alias по решению HF-08 (build/variants/final-dev4 по spec).
- **Примечания:** Поправки скептика приняты: fonts.css = 105 строк, @font-face 28–105 (проверено); добавлен гейт EXPECTED_FONTS/platform-font (qa-browser-matrix.py:122-124, 966-1002 — проверено); document.fonts.check не доказывает наличие грани (синтетический bold) — заменён на перечисление document.fonts + ls; добавлен 390×724 (SHORT_PORTRAIT_VIEWPORTS:89); вариант «третья гарнитура» снят, т.к. строка 94 требует ровно 2 семейства. Уточнение к скептику: версия runner сейчас 1.4.1 (строки 2, 62), а не 1.4.0 — bump будет 1.5.0; RESUME:120 держит 1.4.0 — ещё один рассинхронизированный маркер. Вопрос владельцу не дублируется: это общий вопрос 1 (какие два семейства; «Поменять шрифт» на H1 и ещё 13 заголовках — семейство или начертание). Замер шрифтов уже сделан и закоммичен — docs/FONT-AND-PHOTO-MEASUREMENTS-2026-09-06.md, ссылка вместо параллельной CSS-карты.

### A:HF-02 — Факты — заголовок секции

- **Строки списка:** 7
- **Тип:** удаление; **трудоёмкость:** M
- **Вопросы анкеты:** №10, №28
- **Сейчас на сайте:** 30+ лет / Профессиональный опыт в юриспруденции (надстрочник + h2 + золотая .rule над кубиками; aria-label секции «30+ лет&nbsp;— профессиональный опыт в юриспруденции»)
- **Правка владельца:** Правка: «Убрать заголовок, сократить белое поле до границ кубиков и текста». Для заметок: «Заголовок раздела повторяет заголовок 1-го кубика»
- **Где в коде:**
  - `site/index.html` (100-104) — section.facts[aria-label] > .container.section-pad > .eyebrow.eyebrow--wine + h2.section-title.section-title--ink.section-title--narrow + .rule
  - `site/gambarian-standalone.html` (1883-1887) — то же (производный; регенерировать build-preview.py --standalone)
  - `site/styles.css` (40; 121; 146; 547; 670; 1547; 1675) — --section-pad clamp(56px,8vw,96px); .section-pad; .rule margin-bottom 40px; .facts (bg cream); .facts-bar margin-top 20px; .facts .rule 24px (≤860); .facts-bar margin-top 14px (≤860)
  - `scripts/client_copy_contract.py` (28; 78; 96) — ALLOWED_OUTSIDE_COPY_TEXT «30+ лет», «Профессиональный опыт в юриспруденции»; ALLOWED_TEXT_ATTRIBUTES «30+ лет — профессиональный опыт в юриспруденции»
  - `scripts/verify-live-previews.py` (4; 30; 39-40; 82-89) — docstring v1.0.0 vs READBACK_VERSION 1.1.0; NBSP_EXPECTED=23/22; page.count('&nbsp;—') != expected → FAIL
  - `docs/tasks/2026-08-13-dark-fact-cards.md` (36-75) — визуальный контракт DARK-FACT-CARDS v1.0.1 + эталоны docs/design-references/facts-dark-{1440,390-collapsed,390-expanded}-v1.0.0.png
- **Контракты и гейты:** Copy contract: строки allowlist :28 и :78 становятся неиспользуемыми — гейт не упадёт (allowlist разрешающий); чистка = часть bump 1.3.0. aria-label секции (:96) сохранить: это accessible name секции и одно из 23 «&nbsp;—», которые verify-live-previews.py требует РОВНО (index.html:100; снятие → «защищённых тире 22, ожидалось 23» → live FAIL, пока NBSP_EXPECTED не станет per-alias). Семантика: удаление h2 = потеря уровня outline; допустима visually-hidden h2 с тем же текстом (уже в allowlist). Layout: «белое поле» = кремовый фон .facts + padding-block var(--section-pad); ужимать локальным override для .facts, не менять глобальную --section-pad (общие отступы секций — группа E). При обнулении верхнего отступа золотая полоса .hero::after упрётся в рамку карточек. Обновить docs/tasks/2026-08-13-dark-fact-cards.md (приёмка) и перерисовать эталоны facts-dark-*.png. Правка site/ распространяется на все производные Preview.
- **Вопрос из разбора (сведён в анкету):** Кремовую полосу оставить с малым отступом (сколько px?) или убрать фон совсем — число / «убрать»?
- **Приёмка:** Локально: `document.querySelector('.facts h2:not(.visually-hidden), .facts .eyebrow, .facts .rule') === null`; `section.facts.getAttribute('aria-label')` сохранён; Playwright 390 и 1440: (factsGrid.top − facts.top) и (facts.bottom − factsBar.bottom) ≤ согласованного значения; `grep -o '&nbsp;—' site/index.html | wc -l` = 23; `python -B scripts/verify-client-copy.py` PASS; `python scripts/qa-browser-matrix.py … --all-previews` без failures (page overflow 0). Live (регистрозависимо, aria-label строчный): `curl -s https://<alias>.gambarian-landing.pages.dev/ | grep -c 'Профессиональный опыт в юриспруденции'` = 0 и `… | grep -c 'aria-label="30+ лет&nbsp;— профессиональный'` = 1; `python -B scripts/verify-live-previews.py --only <alias>` PASS.
- **Примечания:** Поправки скептика приняты: добавлен live-гейт NBSP_EXPECTED=23 (проверено: index.html содержит ровно 23 «&nbsp;—», одно — aria-label:100); acceptance переписан без несуществующих флагов (у verify-live-previews.py только --only, :150) и с регистрозависимым grep. Дополнение, которого нет ни у аналитика, ни у скептика: маркер readback уже расходится — docstring `LIVE-PREVIEW-READBACK v1.0.0 | 2026-08-16` (:4) при READBACK_VERSION="1.1.0" (:30); при любом bump синхронизировать оба. Alias цели — по HF-08.

### A:HF-03 — Факты — кубик 1 (2.6) и общая иерархия трёх кубиков

- **Строки списка:** 8, 96
- **Тип:** раскладка; **трудоёмкость:** L
- **Вопросы анкеты:** №4, №11, №19
- **Сейчас на сайте:** 30+ | лет | — профессиональный опыт в юриспруденции (data-copy-id="2.6": num «30+» Playfair 500 64–84px по центру на desktop, unit «лет» золотая капитель, sub Onest 600 15/16px, золотой .notch после sub; на ≤860 цифра слева, текст справа)
- **Правка владельца:** Правка: «Заголовок: 30+ лет. Подзаголовок: профессиональный опыт в юриспруденции». Для заметок: «Во всех 3-х кубиках: разделение на заголовки и подзаголовки; все заголовки — одна величина шрифта; все подзаголовки — другая; между заголовком и подзаголовком — разделительная черточка». Мобайл (строка 96): «Вторая секция — привести в порядок иерархию текста во всех 3-х кубиках»
- **Где в коде:**
  - `site/index.html` (106-113) — .fact-card[data-copy-id="2.6"] > .fact-card__head(.fact-card__num + .fact-card__unit) + .fact-card__sub + .notch
  - `site/gambarian-standalone.html` (1889-1896) — то же (производный)
  - `site/styles.css` (149; 559-617; 619-628; 1550-1569) — .notch 28×2px; база .fact-card/__head/__num/__unit/__sub/.notch/p; desktop-override 2.6 (центр, num clamp(64px,6vw,84px), sub 16px); mobile grid auto 1fr, num 34px
  - `site/app.js` (614-635) — buildToggle(): тумблер только при <p>; aria-label из .fact-card__sub (при переименовании классов обновить)
  - `scripts/qa-browser-matrix.py` (396-462; 705-716; 745-756) — fact-card-horizontal-clipping (scrollWidth/clientWidth .fact-card и .fact-card__head, DOMRect потомков), hasExpandableContent по <p>, оба состояния аккордеона на 360/390
  - `scripts/verify-live-previews.py` (117-125) — regex `data-copy-id="2.10"] .fact-card__unit {… color:#fff}` ровно в 2 медиаблоках живого styles.css
  - `scripts/client_copy_contract.py` (3; 11-12; 209; 367-376) — docstring v1.1.0|2026-08-13 vs CONTRACT_VERSION 1.2.0|2026-08-16; блок 2.6 «30+ лет — профессиональный опыт в юриспруденции»; OWNER_APPROVED_COPY
  - `scripts/review_numbered_contract.py` (6-9) — OWNER_REVIEW_IDS = {fact-900-v1: 2.14, yulia-card-v1: 5.18} — новые override без записи теряют номера в review-numbered
  - `docs/RESUME.md` (96-105; 110) — «владелец отдельно утвердил … desktop-центрирование 30+»; таблица контрактов держит Client Copy 1.1.0
  - `docs/tasks/2026-08-13-dark-fact-cards.md` (36-75) — DARK-FACT-CARDS v1.0.1 — отменяемый визуальный контракт
- **Контракты и гейты:** ТЕКСТ: если «— » уходит из подзаголовка, textContent 2.6 = «30+ лет профессиональный опыт в юриспруденции» ≠ frozen (normalize_text: nbsp→пробел, без casefold) → verify FAIL → owner override data-owner-copy-id="fact-30-v1" в OWNER_APPROVED_COPY + запись CONTENT-OWNER-EDITS v1.1.0 + OWNER_REVIEW_IDS["fact-30-v1"]="2.6" + bump CLIENT-COPY-CONTRACT до 1.3.0 с синхронизацией всех маркеров (docstring :3, CONTRACT_VERSION/DATE :11-12, RESUME:110, dark-fact-cards.md:80 — сейчас уже расходятся 1.1.0/1.2.0). Если тире остаётся — exact 2.6 без override. Прятать тире визуально при сохранении в DOM — не рекомендуется. Frozen-источник (SHA 5234CC5D…) не меняется. ДИЗАЙН: «все заголовки одной величины» отменяет решение владельца 2026-08-13 (крупная «30+» 64–84px, desktop-центр) — нужна явная фиксация; per-card overrides (619-668, 1571-1601) заменяются едиными .fact-card__title/.fact-card__sub; «черточка» = существующий .notch, переставленный между title и sub. ШРИФТЫ: Playfair только 500 — иерархия размером/весом Onest, иначе asset-изменение (HF-01). ГЕЙТЫ: verify-live-previews.py:117-125 требует правило `.fact-card__unit` для 2.10 в 2 медиаблоках — при унификации классов live FAIL до правки readback (+ bump READBACK_VERSION с синхронизацией docstring :4); build-review-numbered.py ищет жёсткие токены fact-900-v1 (см. HF-05); эталоны design-references/facts-dark-* перерисовать; новая задача docs/tasks/<дата>-fact-cards-hierarchy.md. Счётчик 23 «&nbsp;—» не затрагивается: тире карточек в разметке без &nbsp;.
- **Вопрос из разбора (сведён в анкету):** 1) Крупная цифра «30+» (64–84px, по центру на desktop, ваше решение 13.08) снимается, заголовок «30+ лет» набирается тем же кеглем, что и «Создание прецедента…» — да/нет? 2) Черточка — короткая золотая 28px (как сейчас) или во всю ширину карточки — короткая/полная? 3) Тире «—» перед подзаголовками кубиков 1 и 2 убирается — да/нет?
- **Приёмка:** Playwright на каталоге alias по HF-08 при 390 и 1440: у трёх .fact-card computed font-size .fact-card__title одинаков, .fact-card__sub одинаков, между ними элемент-разделитель (height ≥1px, width >0), порядок DOM title→divider→sub; textContent карточки 1 = exact 2.6 (с тире) либо строка override fact-30-v1 (без тире) — по ответу 3; `python -B scripts/verify-client-copy.py` PASS (owner blocks = 2 + число новых override); `python -B scripts/build-review-numbered.py` без SystemExit; `python -m unittest scripts/tests/test_verify_client_copy.py` PASS; `python scripts/qa-browser-matrix.py … --all-previews` без fact-card-horizontal-clipping и без fact-card-mobile-accordion-* на 360/390; `python -B scripts/verify-client-previews.py` PASS; `git diff --stat docs/sources/client-copy-short-v1.0.0.txt` пустой; после деплоя `python -B scripts/verify-live-previews.py --only <alias>` PASS (с обновлённой проверкой :117-125).
- **Примечания:** Поправки скептика приняты: добавлены live-гейт на .fact-card__unit 2.10 (:117-125 — проверено), OWNER_REVIEW_IDS/жёсткие токены review-numbered (:177-188, :6-9 — проверено), рассинхрон маркеров контракта (:3 v1.1.0|2026-08-13 против :11-12 1.2.0|2026-08-16 — проверено; RESUME:110 = 1.1.0). verify-fact-cards.mjs удалён из where и рисков: скрипт уже red на текущем site/ (:60 `sem.every` требует BUTTON в каждой карточке, :164 `c.querySelector('p').textContent` → TypeError на 2.6 без <p>), не подключён в ci.yml/AGENTS/RESUME, требует неустановленный playwright-core — не гейт. Acceptance сделан условным по вопросу 3, «177/177» и «final-dev3» заменены на прогон по HF-08. Строка 96 (мобайл) добавлена как второй источник той же задачи. Общий вопрос 3 (Правка = утверждённый owner override?) — предпосылка для всех override этого пункта. HF-03/HF-04/HF-05 — одна задача с единым контрактом карточек.

### A:HF-04 — Факты — кубик 2 (2.10)

- **Строки списка:** 9, 96
- **Тип:** раскладка; **трудоёмкость:** M
- **Вопросы анкеты:** №4, №11, №21
- **Сейчас на сайте:** Создание | прецедента | в международной судебной практике | — возвращение похищенного ребёнка при незарегистрированных родительских правах. (data-copy-id="2.10": head две строки Playfair 500 28–36px, sub золотая капитель 12px, notch, <p> с тире; золотая рамка карточки)
- **Правка владельца:** Правка: «Заголовок: Создание прецедента в международной судебной практике. Подзаголовок: возвращение похищенного ребёнка при незарегистрированных родительских правах.» Мобайл (строка 96): «Убрать стрелочку для открытия доп. инфы — там ничего нет»
- **Где в коде:**
  - `site/index.html` (114-122) — .fact-card[data-copy-id="2.10"] > .fact-card__head(.fact-card__num «Создание» + .fact-card__unit «прецедента») + .fact-card__sub + .notch + p
  - `site/gambarian-standalone.html` (1897-1905) — то же (производный)
  - `site/styles.css` (569-571; 630-655; 1571-1595; 1603-1670) — золотая рамка; desktop num/unit block serif clamp(28px,2.4vw,36px) color:#fff + sub капитель; mobile head 1/-1, serif 26px, sub 11px; clamp 2 строки + .fact-card__toggle/__chevron
  - `site/app.js` (618-619) — buildToggle: `card.querySelector('p')` — подзаголовок как div, а не <p>, снимает стрелку без правки JS
  - `scripts/verify-live-previews.py` (117-125) — «белое «прецедента»» — regex на `[data-copy-id="2.10"] .fact-card__unit {… color:#fff}` ×2
  - `scripts/client_copy_contract.py` (211-215) — frozen блок 2.10
  - `docs/ERRORS.md` (14-30) — 2026-08-13 клип «прецедента» — причина и гейт runner 1.4.0
- **Контракты и гейты:** ТЕКСТ: слияние head+sub в один заголовок textContent не меняет; удаление «— » перед «возвращение» даёт «…практике возвращение…» ≠ frozen 2.10 → owner override data-owner-copy-id="fact-precedent-v1" (OWNER_APPROVED_COPY, OWNER_REVIEW_IDS→"2.10", CONTENT-OWNER-EDITS v1.1.0, contract 1.3.0). С тире в подзаголовке — exact 2.10 без override. Точка в конце сохраняется по frozen. LIVE: verify-live-previews.py:117-125 ищет в живом styles.css правило на `.fact-card__unit` внутри 2.10 в 2 медиаблоках — любое переименование класса = live FAIL независимо от текста → править проверку + READBACK_VERSION (и docstring :4). ДИЗАЙН: заголовок из 6 слов при общем кегле 28–36px в колонке 300–400px = 3–4 строки; nowrap запрещён (ERRORS 2026-08-13); золотая рамка (styles.css:569) сохраняется, пока владелец не скажет иначе. MOBILE: подзаголовок как div.fact-card__sub вместо <p> → buildToggle не создаёт тумблер → стрелка исчезает (строка 96) без правки app.js; матрица null-safe (hasExpandableContent по <p>).
- **Приёмка:** textContent карточки = exact 2.10 (с тире) или строка override fact-precedent-v1 (без тире) — по ответу на вопрос 3 в HF-03; `card.querySelector('.fact-card__toggle') === null` на 360/390 после app.js (стрелки нет); qa-browser-matrix без fact-card-horizontal-clipping на 1024/1280/1440/1920 и 360/390; `getComputedStyle(title).whiteSpace !== 'nowrap'`; `python -B scripts/verify-client-copy.py` PASS; visual diff со скриншотами 1440/390 в docs/design-references; после деплоя `python -B scripts/verify-live-previews.py --only <alias>` PASS с обновлённой проверкой 2.10.
- **Примечания:** Поправка скептика (live-гейт :117-125) принята и проверена. Вопрос про тире не дублируется — он задан один раз в HF-03 (вопрос 3, «кубиков 1 и 2»). Строка 96 (стрелка) закрывается конструктивно: тумблер строится только при наличии <p> (app.js:618-619), потому <p> → div.fact-card__sub. Общий вопрос 3 применяется. Часть общей задачи HF-03.

### A:HF-05 — Факты — кубик 3 (owner fact-900-v1)

- **Строки списка:** 10, 96
- **Тип:** текст; **трудоёмкость:** M
- **Вопросы анкеты:** №4, №12, №21
- **Сейчас на сайте:** Автор | более 900 | экспертных статей в области уголовного, семейного и миграционного права, основанных на многолетнем опыте адвокатской деятельности (data-owner-copy-id="fact-900-v1": unit «Автор», num «более 900» Playfair 40–52px nowrap, notch, <p>)
- **Правка владельца:** Правка: «Заголовок: Автор более 900 экспертных статей. Подзаголовок: В области уголовного, семейного и миграционного права, основанных на многолетнем опыте адвокатской деятельности»
- **Где в коде:**
  - `site/index.html` (123-130) — .fact-card[data-owner-copy-id="fact-900-v1"] > .fact-card__head(.fact-card__unit «Автор» + .fact-card__num «более 900») + .notch + p
  - `site/gambarian-standalone.html` (1906-1913) — то же (производный)
  - `site/styles.css` (657-668; 1571-1573; 1596-1601) — [data-owner-copy-id="fact-900-v1"] head колонка, num clamp(40px,3.4vw,52px) nowrap; mobile head 1/-1, num 34px nowrap
  - `scripts/client_copy_contract.py` (367-372) — OWNER_APPROVED_COPY['fact-900-v1'] (строчное «в области»)
  - `scripts/build-review-numbered.py` (177-188; 272-278) — жёсткие токены `data-owner-copy-id="fact-900-v1"` и `<span class="fact-card__unit">Автор</span>` → SystemExit; сверка OWNER_REVIEW_IDS
  - `scripts/review_numbered_contract.py` (6-9) — OWNER_REVIEW_IDS['fact-900-v1'] = '2.14'
  - `scripts/tests/test_verify_client_copy.py` (78-81) — test_owner_approved_fact_900_drift_fails ждёт 'owner:fact-900-v1'
  - `docs/CONTENT-OWNER-EDITS.md` (9-32) — запись override fact-900-v1 (v1.0.0, 2026-08-13)
- **Контракты и гейты:** ТЕКСТ: заглавная «В» в «В области…» меняет textContent (normalize_text без casefold) → verify FAIL на fact-900-v1 → новый ключ fact-900-v2: OWNER_APPROVED_COPY + data-owner-copy-id в разметке + CSS-селекторы (styles.css:658, 664, 1573, 1597) + build-review-numbered.py:178-186 (оба токена; при слиянии head в единый заголовок span «Автор» тоже исчезает) + review_numbered_contract.py:7 + тест :78-81 + CONTENT-OWNER-EDITS v1.1.0 + contract 1.3.0. Если «В» строчная — текст совпадает с fact-900-v1, override не меняется, но токен `<span class="fact-card__unit">Автор</span>` в build-review-numbered всё равно ломается при новой разметке заголовка. Разбиение «Автор более 900 экспертных статей» / «в области…» допустимо: слова и порядок те же; «основанных» согласуется со «статей» из заголовка — подзаголовок читается фрагментом, не переписывать без владельца. ДИЗАЙН: «более 900» теряет nowrap 40–52px (см. HF-03 вопрос 1). Frozen 2.14 не трогается.
- **Вопрос из разбора (сведён в анкету):** Заглавная «В» в начале подзаголовка «В области…» — намеренно (в кубиках 1 и 2 подзаголовки со строчной) — да/нет?
- **Приёмка:** textContent карточки после normalize = строка override (fact-900-v1 или v2) — `python -B scripts/verify-client-copy.py` PASS; ровно один ключ fact-900-* в OWNER_APPROVED_COPY и OWNER_REVIEW_IDS; `grep -c 'fact-900-v1' site/styles.css scripts/*.py` = 0 при переходе на v2; `python -m unittest scripts/tests/test_verify_client_copy.py` PASS; `python -B scripts/build-review-numbered.py` без SystemExit; qa-browser-matrix без head-scroll-overflow на 360/390.
- **Примечания:** Поправка скептика принята и проверена: build-review-numbered.py:177-188 (два жёстких токена → SystemExit «OWNER-карточка fact-900-v1 не уникальна»), review_numbered_contract.py:6-9, тест :78-81 (spec:83 требует unit-тесты PASS). Дополнение: токен `<span class="fact-card__unit">Автор</span>` ломается даже при неизменном тексте, как только «Автор» входит в единый заголовок — правка builder обязательна в любом сценарии. Часть общей задачи HF-03; общий вопрос 3 применяется.

### A:HF-06 — Факты — плашка (.facts-bar), лицензия

- **Строки списка:** 11
- **Тип:** текст; **трудоёмкость:** S
- **Вопросы анкеты:** №4, №14
- **Сейчас на сайте:** Адвокат Израиля, лицензия №&nbsp;30178.
- **Правка владельца:** Правка: «Адвокат Израиля, лицензия № 30178». Для заметок: «Убрать точку»
- **Где в коде:**
  - `site/index.html` (133-136 (span 135)) — .facts-bar .facts-bar__item:nth-child(1) span
  - `site/gambarian-standalone.html` (1918) — то же (производный)
  - `scripts/client_copy_contract.py` (35; 133; 301; 361) — ALLOWED_OUTSIDE_COPY_TEXT «…30178.»; ALLOWED_JSON_LD_TEXT «…30178.»; блок 5.13 «…30178.»; футер 8.9 «Лицензия № 30178» (без точки, другая строка)
  - `site/index.html` (195, 224, 253, 282, 311, 340, 369, 398 (.svc-media__license ×8, группа B); 463 (li[data-copy-id="5.13"], группа C); 593 (JSON-LD jobTitle)) — другие вхождения той же строки с точкой — вне группы
- **Контракты и гейты:** Новая строка «Адвокат Израиля, лицензия № 30178» (без точки) отсутствует в ALLOWED_OUTSIDE_COPY_TEXT → verify FAIL «неизвестный текст вне data-copy-id» → добавить в allowlist (в составе bump 1.3.0). Владельческая правка утверждённого текста (frozen 5.13 с точкой не меняется). Для этой группы — только .facts-bar. Та же строка в услугах ×8 (строка 42) и в карточке адвоката 5.13 (строка 56 — там exact match → owner override, а не allowlist) и JSON-LD jobTitle (:593, ALLOWED_JSON_LD_TEXT; nbsp в JSON-LD не ставить) — решения других групп; иначе на сайте две формы. Сохранить «№&nbsp;30178». Счётчик «&nbsp;—» не затрагивается.
- **Приёмка:** Локально: `sed -n '132,145p' site/index.html | grep -c '30178\.'` = 0 и `sed -n '132,145p' site/index.html | grep -c '№&nbsp;30178'` = 1; `python -B scripts/verify-client-copy.py` PASS после правки allowlist. Live: `curl -s https://<alias>.gambarian-landing.pages.dev/ | python -c "import sys;h=sys.stdin.read();i=h.find('class=\"facts-bar\"');b=h[i:h.find('</section>',i)];print('30178.' in b, '№&nbsp;30178' in b)"` → `False True`; `python -B scripts/verify-live-previews.py --only <alias>` PASS.
- **Примечания:** Поправка скептика принята: grep по всему файлу считал бы 10 строк (135, 195…398, 463; проверено), verify-live-surface.py в репозитории отсутствует, флагов --expect/--forbid нет — приёмка заменена на срез блока .facts-bar. Дополнение: футер 8.9 (:569) уже без точки («Лицензия №&nbsp;30178», allowlist :361) — после правки плашка и футер совпадут по форме.

### A:HF-07 — Факты — плашка (.facts-bar), адрес

- **Строки списка:** 13
- **Тип:** текст; **трудоёмкость:** S
- **Вопросы анкеты:** №4, №5, №13
- **Сейчас на сайте:** Приём&nbsp;— Тель-Авив / онлайн<br><a class="map-link" … aria-label="Открыть адрес в Google Maps: Тель-Авив, Карлибах 10">Карлибах&nbsp;10</a>
- **Правка владельца:** Правка: «Прием — Тель-Авив / онлайн ⏎ Карлибах, 10»
- **Где в коде:**
  - `site/index.html` (141-144 (span 143)) — .facts-bar .facts-bar__item:nth-child(3) span + a.map-link
  - `site/gambarian-standalone.html` (1926) — то же (производный)
  - `scripts/client_copy_contract.py` (57; 79; 116; 136; 303) — ALLOWED_OUTSIDE_COPY_TEXT «Карлибах 10», «Приём — Тель-Авив / онлайн»; ALLOWED_TEXT_ATTRIBUTES aria-label; ALLOWED_JSON_LD_TEXT «Карлибах 10»; блок 5.17
  - `site/index.html` (465 (li 5.17, группа C); 515 (.contact-list__value, группа D); 564 (футер, группа D); 585 (JSON-LD streetAddress)) — другие вхождения адреса — вне группы
  - `docs/TYPOGRAPHY-DASHES.md` (50-59; 103-107) — &nbsp; в JSON-LD запрещён; «Языки работы —» был единственным тире в начале строки до nbsp
- **Контракты и гейты:** Две правки в одной строке: (1) «Приём»→«Прием»; (2) «Карлибах 10»→«Карлибах, 10». Обе новые строки отсутствуют в ALLOWED_OUTSIDE_COPY_TEXT → verify FAIL → добавить «Прием — Тель-Авив / онлайн» (или оставить «Приём» по ответу) и «Карлибах, 10» (bump 1.3.0); frozen 5.17 не меняется. Типографика: «Прием&nbsp;—» сохраняет одно из 23 «&nbsp;—» (счётчик verify-live-previews не меняется); «Карлибах,&nbsp;10». aria-label карты «…Карлибах 10» — синхронизировать только при решении «везде» (правка ALLOWED_TEXT_ATTRIBUTES). JSON-LD streetAddress «Карлибах 10» не трогать (структурированные данные; nbsp запрещён). Google Maps URL не меняется. Для контактов (строка 76) и футера (строка 89) запятая/«Прием» не запрошены — без решения «везде» на сайте будут две формы адреса.
- **Вопрос из разбора (сведён в анкету):** 1) В присланных правках ё заменена на е в строках 13, 24, 45 («Прием», «ребенка», «перемещенного»), но сохранена в строках 9, 32, 46 — новые тексты принимать с «е» или сайт сохраняет «ё» — е/ё? (ответ применяется ко всем группам) 2) «Карлибах, 10» с запятой — везде на сайте (контакты, футер, aria-label карты) или только в плашке под кубиками — везде/плашка?
- **Приёмка:** Локально: span textContent (normalize) = «Прием — Тель-Авив / онлайн Карлибах, 10» (или «Приём…», по ответу 1); в разметке строки 143 есть «&nbsp;—» и «Карлибах,&nbsp;10»; `grep -o '&nbsp;—' site/index.html | wc -l` = 23; `python -B scripts/verify-client-copy.py` PASS после правки allowlist; прогон тире 320–1440 = 0 тире в начале строки; JSON-LD валиден (verify без «JSON-LD block невалиден»). Live: тот же curl-срез блока .facts-bar, что в HF-06, с условиями `'Карлибах,&nbsp;10' in b` и `'Карлибах&nbsp;10' not in b`; `python -B scripts/verify-live-previews.py --only <alias>` PASS.
- **Примечания:** Поправки скептика приняты: флагов --expect/--forbid нет, page-wide forbid «Карлибах 10» невозможен (остаётся в 143 aria-label, 465, 515, 564, 585 — проверено); вопрос о ё/е поставлен один раз на весь список. Уточнение к скептику: нумерация у него по строкам файла TSV (14/25/46/55) — в нумерации таблицы это строки 13/24/45/54, причём в строке 54 колонка «Правка» пуста («ребенка» там только в колонке «Текст»), а в правках строк 9, 32, 46 ё сохранена — замена не систематическая, поэтому вопрос сформулирован как выбор политики, а не как «опечатка».

### A:HF-08 — Публикация и гейты группы (вводная, пропущенная разбором)

- **Строки списка:** 2, 7, 8, 9, 10, 11, 13
- **Тип:** решение; **трудоёмкость:** M
- **Вопросы анкеты:** №9
- **Сейчас на сайте:** docs/tasks/2026-09-06-final-dev4-spec.md:53-54, 88-89 — «новый alias final-dev4 … final-dev3 не тронут»; docs/RESUME.md:78-83 — «живое важнее нового: новые варианты не добавляются, пока не обновлены остальные десять alias»
- **Правка владельца:** Все приёмки строк 2, 7–11, 13 зависят от того, куда публикуется результат и какие константы гейтов меняются; общий вопрос 3 (Правка = утверждённый owner override?) — предпосылка для строк 8–10, 13
- **Где в коде:**
  - `scripts/client-preview-map.json` (2-3; 10-54) — version 2.4.0 / updated 2026-08-13; массив previews (11 записей) — новая строка final-dev4
  - `scripts/build-hero-variants.py` (291-296) — VARIANTS: ключ dev4 → ('final-dev4', …, variant_final_dev4)
  - `scripts/verify-client-copy.py` (38; 333-335) — EXPECTED_PREVIEW_ALIASES = 11
  - `scripts/verify-client-previews.py` (60-61; 63-75) — MAP_VERSION 2.4.0 / MAP_DATE; EXPECTED_PREVIEWS (11 записей)
  - `scripts/qa-browser-matrix.py` (108-120; 122-124) — PREVIEWS (11 Target) и EXPECTED_FONTS — новый Target для final-dev4; итог матрицы вместо 177/177
  - `scripts/verify-live-previews.py` (4; 30; 39-40; 82-89; 117-125; 150) — docstring v1.0.0 vs READBACK_VERSION 1.1.0; NBSP_EXPECTED 23/22 жёстко для всех alias; regex 2.10; единственный флаг --only
  - `.github/workflows/deploy-previews.yml` (24; 69; 218-234) — input only; build-preview.py --standalone; verify-live-previews.py --only "$ONLY"
  - `docs/RESUME.md` (78-83; 108-121) — правило «живое важнее нового»; таблица версий (Client Copy 1.1.0, Browser QA runner 1.4.0 — оба устарели относительно кода)
- **Контракты и гейты:** Вариант A (spec): 12-й alias final-dev4 → client-preview-map.json (+ version 2.5.0 и дата), VARIANTS в build-hero-variants.py (наследник variant_final_dev3 + hero-business-hours.js), EXPECTED_PREVIEW_ALIASES 11→12, EXPECTED_PREVIEWS и MAP_VERSION в verify-client-previews.py, PREVIEWS/EXPECTED_FONTS в qa-browser-matrix.py (новый итог матрицы), новая запись в final_dev3_contract.py или отдельный final_dev4_contract.py с SemVer+датой. Вариант B (RESUME): правки уходят во все 11 alias, final-dev3 меняется — противоречит spec:89 «final-dev3 не тронут». В обоих вариантах любая правка текста этой группы (HF-02/03/04/07) держит счётчик «&nbsp;—» на 23, только если сохраняются aria-label секции фактов и «Прием&nbsp;—»; при отклонении NBSP_EXPECTED должен стать per-alias (словарь по branch) + bump READBACK_VERSION с синхронизацией docstring :4. Маркеры, уже расходящиеся до final-dev4 и подлежащие синхронизации в том же цикле: client_copy_contract.py:3 vs :11-12; verify-live-previews.py:4 vs :30; RESUME:110 (1.1.0) и :120 (runner 1.4.0 при коде 1.4.1).
- **Вопрос из разбора (сведён в анкету):** final-dev4 публиковать как 12-й alias (spec, final-dev3 остаётся эталоном) или обновить все 11 alias (RESUME «живое важнее нового») — 12-й/все?
- **Приёмка:** Вариант A: `python -B scripts/build-hero-variants.py dev4` собирает build/variants/final-dev4; `python -B scripts/verify-client-previews.py` PASS с 12 записями; `python -B scripts/verify-client-copy.py` PASS (EXPECTED_PREVIEW_ALIASES=12); `python scripts/qa-browser-matrix.py http://127.0.0.1:8098/ --all-previews` без failures на новом итоге; деплой workflow с only=final-dev4; `python -B scripts/verify-live-previews.py --only final-dev4` PASS; `curl -s https://final-dev3.gambarian-landing.pages.dev/ | sha256sum` без изменений и боевой SHA-256 656CBCD0…C13E22 без изменений (spec:88-89). Маркеры: `grep -n 'CLIENT-COPY-CONTRACT v' scripts/client_copy_contract.py docs/RESUME.md docs/tasks/*.md` показывают одну версию/дату; то же для LIVE-PREVIEW-READBACK и PREVIEW-BROWSER-QA-RUNNER.
- **Примечания:** Добавлено по missed_items скептика (план публикации, конфликт spec vs RESUME, общий вопрос 3 как предпосылка, CONTENT-OWNER-REVISIONS как закоммиченный источник — нумерация строк там совпадает с индексом TSV при шапке = 0, что и использовано в rows). Проверено: карта содержит 11 alias, EXPECTED_PREVIEW_ALIASES = 11 (:38), EXPECTED_PREVIEWS = 11 (:63-75), PREVIEWS = 11 (:108-120), workflow передаёт --only (:232). Общие вопросы 1 и 3 не дублируются; вопрос про alias — новый, в черновике ТЗ его нет, но без него приёмки строк 2, 7–11, 13 нельзя нацелить.

## Группа B. Семейное право: услуги (строки 15–43, плюс 94/96)

Группа B «Услуги» — строки 15–43 (нумерация 0-based, шапка = 0, совпадает с docs/CONTENT-OWNER-REVISIONS-2026-09-06.md; строка 44 «ПРЕЦЕДЕНТ» — уже группа C). Итог: 18 пунктов — 13 текстовых (G-01, G-03, G-04, G-06–G-12, G-14, G-15 + удаление G-02), 1 типографика (G-05), 1 asset (G-13), 1 layout (G-16), 2 decision из пропущенных скептиком строк 94 (G-17, порядок/состав вкладок) и 96 (G-18, мобильный формат меню/свайп, архитектурно часть G-16). Строк без правки/заметки — 10 (14, 17, 21, 22, 25, 30, 33, 35, 38, 39; всё на сайте дословно и в allowlist). Заметка о «мэпинге шрифтов» (строка 6) проигнорирована по инструкции.

Поправки скептика: все применены и перепроверены по текущему дереву codex/final-dev4 — сдвиг нумерации −1; целевой alias final-dev4 (новая строка scripts/client-preview-map.json + собственный маркер, final-dev3 не бампить); инструмент live readback с --expect/--forbid находится в другом репо (`verify-live-surface.py` (репо digitalhook-os-; в этом репо отсутствует, см. spec, подготовительный шаг 5)), в этом репо verify-live-previews.py имеет только --only; live-гейт NBSP_EXPECTED = 23 (секция даёт 10 из 23: 8× «Языки работы», 1× 3.8, 1× 3.28; после G-04/G-09/G-15 → 16 без учёта других групп) — обязательна per-alias/динамическая константа; маркеры версии контракта уже рассинхронизированы (docstring :3 v1.1.0/2026-08-13, константы :11-12 1.2.0/2026-08-16, CONTENT-APPROVED.md:25 и RESUME.md:110 «1.1.0») — синхронизировать все при bump 1.3.0; строки контракта: H2 :83, лицензия :35/:133/:301, объединённый абзац :41; alt-токен 'alt=\"Адвокат Юлия Саакян\"' требует ровно 1× (verify-client-copy.py:434-440); standalone CSS секции 836-1036. Одна поправка скептика сама неточна: JS в standalone — var tabs :2596, setActive(0) :2667 (не 2597/2668).

Общие вопросы ТЗ не дублируются: шрифты → общий вопрос 1 (G-01, G-05); фото → 2 (G-13); дословность формулировок «Правка», включая «ребенка»/«с учетом»/точку в 3.18 и подтверждение адвоката по 3.23 → 3 (все текстовые пункты); свайп → 4 (G-18). Частные вопросы владельцу оставлены только там, где формулировка допускает два прочтения: G-05 (строка 33), G-07 (жёсткий <br>), G-13 (вкладки Юлии, лицензия, подпись), G-15 (термин), G-16 (стороны, стрелки, mobile), G-17 (порядок/состав), G-18 (формат меню).

Архитектурный вопрос до начала правок (все пункты): scripts/build-hero-variants.py:305 делает shutil.copytree(site) для всех вариантов, поэтому любая правка site/ при пересборке изменит и build/variants/final-dev3 — требование «final-dev3 не тронут» выполнимо либо без пересборки/деплоя dev3, либо через overlay/addon для dev4 по образцу site-addons/final-dev3. Порядок: текстовые правки → G-02 → G-16/G-17/G-18 одной перестройкой → G-13 → G-05; пересборка standalone (python scripts/build-preview.py --standalone) и вариантов; деплой только only=final-dev4; проверка, что final-dev3 и боевой адрес (SHA-256 656CBCD0…C13E22) не изменились. Не проверено: Chromium для Playwright в контейнере не установлен — все замеры высоты/строк в acceptance выполняются на машине с браузером.

Строки без правки/заметки (действий нет): 14, 17, 21, 22, 25, 30, 33, 35, 38, 39.

### B:G-01 — Услуги / шапка секции — H2

- **Строки списка:** 15
- **Тип:** текст; **трудоёмкость:** S
- **Вопросы анкеты:** №4, №9
- **Сейчас на сайте:** Развод без судебного спора и бракоразводные процессы
- **Правка владельца:** Правка: «Развод по взаимному согласию и представительство в бракоразводных спорах при отсутствии соглашения между супругами». Для заметок: «Поменять шрифт»
- **Где в коде:**
  - `site/index.html` (155) — section#services .services__head h2.section-title.section-title--narrow (без data-copy-id)
  - `site/gambarian-standalone.html` (1938) — h2.section-title.section-title--narrow
  - `site/styles.css` (134-144) — .section-title (var(--font-serif)=Playfair Display, normal 500, clamp(26px,3.2vw,40px)), .section-title--narrow max-width:640px
  - `scripts/client_copy_contract.py` (83) — ALLOWED_OUTSIDE_COPY_TEXT «Развод без судебного спора и бракоразводные процессы» (дубль в ALLOWED_TEXT_ATTRIBUTES:123 в index.html не используется)
- **Контракты и гейты:** Текущая строка H2 разрешена только как служебный повтор через ALLOWED_OUTSIDE_COPY_TEXT (client_copy_contract.py:83). Новая формулировка отсутствует в 45 блоках и в OWNER_APPROVED_COPY → либо новый owner-блок (data-owner-copy-id, напр. svc-h2-v1, в OWNER_APPROVED_COPY:367 — H2 встречается 1×, owner id допустим), либо строка в ALLOWED_OUTSIDE_COPY_TEXT; дословная фиксация в docs/CONTENT-OWNER-EDITS.md; bump CONTRACT_VERSION 1.2.0→1.3.0 с синхронизацией всех маркеров (docstring :3 сейчас «v1.1.0 | 2026-08-13», константы :11-12 «1.2.0 / 2026-08-16», docs/CONTENT-APPROVED.md:25 «v1.1.0», docs/RESUME.md:110 «1.1.0»). Frozen-источник, блок 3.7 и allowlist-строка 83 не трогаются (неиспользуемая allowlist-строка допустима). Тире в тексте нет. Шрифт H2 — общий вопрос 1; дизайн-контракт «Locked visual system» (docs/GAMBARIAN-DESIGN-RULES.md:29-43) фиксирует Playfair для editorial headings → смена = версионируемое решение в маркере final-dev4 (наследник scripts/final_dev3_contract.py VERSION 2.0.2; final-dev3 не бампить). Целевой alias final-dev4: новая запись в scripts/client-preview-map.json, обработка в verify-client-previews.py (карта :66) и builder; build-hero-variants.py:305 делает shutil.copytree(SITE) для всех вариантов — правка site/index.html при пересборке изменит и build/variants/final-dev3, поэтому «final-dev3 не тронут» выполнимо только не пересобирая/не деплоя dev3 либо через overlay/addon для dev4 — решить до начала правок (относится ко всем пунктам группы).
- **Приёмка:** grep -c 'Развод по взаимному согласию и представительство' site/index.html site/gambarian-standalone.html build/variants/final-dev4/index.html → по 1; sed -n '150,419p' site/index.html | grep -c 'Развод без судебного спора' → 1 (только h3 3.7) или 0, если принят G-03; python -B scripts/verify-client-copy.py PASS; Playwright (после python -m playwright install chromium): getBoundingClientRect(h2).height/line-height на 1440/1024/390 — число строк зафиксировать в docs (сейчас не замерено), scrollWidth==clientWidth; после деплоя: python `verify-live-surface.py` (репо digitalhook-os-; в этом репо отсутствует, см. spec, подготовительный шаг 5) --url https://final-dev4.gambarian-landing.pages.dev/ --expect 'Развод по взаимному согласию и представительство' → exit 0; python -B scripts/verify-live-previews.py --only final-dev4 (только после перевода NBSP_EXPECTED на per-alias значение).
- **Примечания:** Применены поправки скептика: ссылка на контракт исправлена 66→83 (проверено: :66 — текст формы, :83 — H2); риск про «Hero 1.8» снят — data-copy-id="1.8" в site/index.html отсутствует, строка встречается только в :155 и :182, реальный риск — расхождение H2 и h3 3.7 в одной секции, если G-01 принят без G-03; утверждение «3 строки на desktop» переведено в «требует замера» (Chromium в контейнере не установлен). Шрифт — не переспрашивать, ссылка на общий вопрос 1; дословность текста — общий вопрос 3. Alias/маркер: final-dev3→final-dev4 по spec.

### B:G-02 — Услуги / карточки — бейдж с сердцем и eyebrow

- **Строки списка:** 16
- **Тип:** удаление; **трудоёмкость:** S
- **Вопросы анкеты:** нет
- **Сейчас на сайте:** Более 30 лет профессионального опыта в юриспруденции. (span.svc-eyebrow с иконкой-сердцем в круге, в каждой из 8 панелей)
- **Правка владельца:** Для заметок: «Убрать полностью эту строчку, включая сердечко в кружке»
- **Где в коде:**
  - `site/index.html` (178-181, 207-210, 236-239, 265-268, 294-297, 323-326, 352-355, 381-384) — .svc-card__main > .svc-card__badge > .svc-card__icon (svg path M20.84 4.61…) + span.svc-eyebrow — ×8
  - `site/gambarian-standalone.html` (1961-1964, 1990, 2019, 2048, 2077, 2106, 2135, 2164 (шаг 29)) — .svc-card__badge ×8
  - `site/styles.css` (763-787) — .svc-card__badge (margin-bottom 20px), .svc-card__icon, .svc-eyebrow — становятся мёртвым CSS
  - `site/gambarian-standalone.html` (904-929) — inline-копии .svc-card__badge (904), .svc-card__icon (910), .svc-eyebrow (921)
  - `scripts/client_copy_contract.py` (40, 295) — ALLOWED_OUTSIDE_COPY_TEXT «Более 30 лет профессионального опыта в юриспруденции.» и блок 5.9 (остаются)
- **Контракты и гейты:** Client allowlist не меняется: строка :40 остаётся (verifier не проверяет неиспользуемые allowlist-строки), блок 5.9 в карточке адвоката (index.html:461) не затронут. Owner overrides не затронуты. Удаление бейджа (margin-bottom 20px) уменьшает высоту всех 8 панелей — учесть в G-16. Мёртвый CSS (styles.css:763-787 + inline standalone 904-929): решить в PR — удалить целиком или оставить; критерий приёмки зависит от этого решения.
- **Приёмка:** grep -c 'class="svc-card__badge"\|class="svc-eyebrow"' site/index.html site/gambarian-standalone.html build/variants/final-dev4/index.html → 0; sed -n '150,419p' site/index.html | grep -c 'M20.84 4.61' → 0; если CSS удалён — grep -c 'svc-card__badge\|svc-eyebrow\|svc-card__icon' site/styles.css site/gambarian-standalone.html → 0; python -B scripts/verify-client-copy.py PASS; python -B scripts/verify-client-previews.py PASS; live: python `verify-live-surface.py` (репо digitalhook-os-; в этом репо отсутствует, см. spec, подготовительный шаг 5) --url https://final-dev4.gambarian-landing.pages.dev/ --forbid 'svc-eyebrow' → exit 0.
- **Примечания:** Поправка скептика применена: критерий grep по классам в standalone противоречил решению «мёртвый CSS решить при исполнении» (standalone инлайнит .svc-card__badge:904, .svc-card__icon:910, .svc-eyebrow:921) → счётчик ограничен разметкой (class="…"), а CSS-счётчик сделан условным. Alias final-dev3→final-dev4.

### B:G-03 — Услуги / панель 1 «Развод» — h3 3.7

- **Строки списка:** 18
- **Тип:** текст; **трудоёмкость:** S
- **Вопросы анкеты:** №4
- **Сейчас на сайте:** Развод без судебного спора и бракоразводные процессы
- **Правка владельца:** Правка: «Бракоразводные процессы». Для заметок: «Поменять шрифт» (см. G-05)
- **Где в коде:**
  - `site/index.html` (182) — h3.svc-title[data-copy-id="3.7"]
  - `site/gambarian-standalone.html` (1965) — h3.svc-title[data-copy-id="3.7"]
  - `scripts/client_copy_contract.py` (222) — APPROVED_COPY_ITEMS ("3.7", …) — остаётся; новый owner-блок в OWNER_APPROVED_COPY:367
- **Контракты и гейты:** verify-client-copy.py:417-421 требует байт-в-байт (после normalize_text) совпадения textContent под data-copy-id="3.7". Новая формулировка не входит в 45 блоков → снять data-copy-id="3.7", поставить data-owner-copy-id (напр. svc-divorce-title-v1), запись в OWNER_APPROVED_COPY по образцу fact-900-v1; блок 3.7 в контракте остаётся. Фиксация в docs/CONTENT-OWNER-EDITS.md, обновление CONTENT-APPROVED.md/CONTENT-SOURCE-MAP.md, bump CONTRACT_VERSION со всеми маркерами (см. G-01). build-review-numbered.py на 3.7 не завязан. Заголовок короче → панель «Развод» ниже (G-16).
- **Приёмка:** python -B scripts/verify-client-copy.py PASS; grep -c 'data-owner-copy-id="svc-divorce-title-v1"' site/index.html → 1; grep -c 'data-copy-id="3.7"' site/index.html → 0; live: python `verify-live-surface.py` (репо digitalhook-os-; в этом репо отсутствует, см. spec, подготовительный шаг 5) --url https://final-dev4.gambarian-landing.pages.dev/ --expect 'Бракоразводные процессы</h3>' → exit 0.
- **Примечания:** Дословность — общий вопрос 3; шрифт — общий вопрос 1 / G-05. Alias final-dev3→final-dev4. Строки контракта перепроверены: 3.7 на :222.

### B:G-04 — Услуги / панель 1 «Развод» — лид 3.8

- **Строки списка:** 19
- **Тип:** текст; **трудоёмкость:** S
- **Вопросы анкеты:** №4
- **Сейчас на сайте:** Консультация и полное юридическое сопровождение развода по взаимному согласию — без судебного спора между супругами. Если достичь соглашения не удаётся, адвокат подготовит необходимые документы и обеспечит ведение бракоразводного процесса в суде и других компетентных инстанциях.
- **Правка владельца:** Правка: «Консультация и полное юридическое сопровождение развода по взаимному согласию — без судебного спора между супругами. Когда соглашение между супругами невозможно, адвокат обеспечивает полное сопровождение бракоразводного процесса — от подготовки документов до представительства в суде и иных инстанциях.»
- **Где в коде:**
  - `site/index.html` (183) — p.svc-lead[data-copy-id="3.8"]
  - `site/gambarian-standalone.html` (1966) — p.svc-lead[data-copy-id="3.8"]
  - `scripts/client_copy_contract.py` (223-230) — APPROVED_COPY_ITEMS "3.8" (остаётся); новый owner-блок в OWNER_APPROVED_COPY:367
  - `scripts/verify-live-previews.py` (39-40, 87-89) — NBSP_EXPECTED = 23 / page.count("&nbsp;—")
- **Контракты и гейты:** Owner override (data-owner-copy-id вместо data-copy-id="3.8", OWNER_APPROVED_COPY, CONTENT-OWNER-EDITS.md, bump контракта со всеми маркерами). TYPOGRAPHY-DASHES: два тире — «согласию&nbsp;— без» и «процесса&nbsp;— от»; U+2014 с &nbsp; перед ним; normalize_text (verify-client-copy.py:64-67) сводит U+00A0 к пробелу — контракт сходится. Live-гейт: секция сейчас даёт 10 из 23 «&nbsp;—» (8× «Языки работы», 1× 3.8, 1× 3.28); эта правка +1, G-15 −8 → после группы 16 (без учёта других групп); scripts/verify-live-previews.py упадёт, пока NBSP_EXPECTED не станет per-alias/динамическим — пересчитать после всех текстовых правок всех групп. Закрывает предложение по 3.8 из docs/CONTENT-EDIT-PROPOSALS-2026-08-17.md:59 — пометить superseded.
- **Приёмка:** grep -c 'согласию&nbsp;— без' site/index.html → 1 и grep -c 'процесса&nbsp;— от' site/index.html → 1; python -B scripts/verify-client-copy.py PASS; grep -c '&nbsp;—' build/variants/final-dev4/index.html == значение NBSP_EXPECTED для final-dev4 в scripts/verify-live-previews.py; python scripts/qa-browser-matrix.py <url> без overflow; python -B scripts/verify-live-previews.py --only final-dev4 PASS (после per-alias ожидания).
- **Примечания:** Применены поправки скептика: добавлен live-гейт NBSP_EXPECTED (установленный факт 1); критерий «0 из 57 ширин» заменён на воспроизводимые команды — скрипта прогона по 57 ширинам в scripts/ нет (docs/TYPOGRAPHY-DASHES.md §6 описывает разовый прогон). Дословность — общий вопрос 3. Alias final-dev4.

### B:G-05 — Услуги / заголовки h3 всех карточек и H2 — «Поменять шрифт»

- **Строки списка:** 15, 18, 20, 23, 26, 28, 31, 36
- **Тип:** типографика; **трудоёмкость:** M
- **Вопросы анкеты:** №1, №2
- **Сейчас на сайте:** h3.svc-title ×8: «Развод без судебного спора…», «Алименты», «Дети, родительские права и международное возвращение», «Установление или оспаривание отцовства · тест ДНК», «Раздел имущества», «Семейная медиация и соглашение», «Брачный договор», «Защита при угрозах и насилии»; H2 «Развод без судебного спора и бракоразводные процессы»
- **Правка владельца:** Для заметок: «Поменять шрифт» — на H2 (строка 15) и на 7 из 8 h3 (строки 18, 20, 23, 26, 28, 31, 36); на «Брачный договор» (строка 33) пометки нет
- **Где в коде:**
  - `site/styles.css` (789-799) — .svc-title — var(--font-serif) (Playfair Display), italic, 500, clamp(24px,2.8vw,32px)
  - `site/styles.css` (134-144) — .section-title — Playfair normal 500 (H2, строка 15)
  - `site/gambarian-standalone.html` (930-940) — inline-копия .svc-title
  - `site/index.html` (182, 211, 240, 269, 298, 327, 356, 385) — h3.svc-title ×8
  - `site/gambarian-standalone.html` (1965, 1994, 2023, 2052, 2081, 2110, 2139, 2168) — h3.svc-title ×8
  - `scripts/qa-browser-matrix.py` (122-125, 234, 298, 986-991) — EXPECTED_FONTS: роль «italic» = .svc-title ожидает Playfair Display
  - `site/fonts.css` (29-103) — @font-face: Onest 400–800 variable normal; Playfair Display 500 normal и italic — других начертаний нет (site/fonts: 8 woff2)
  - `docs/GAMBARIAN-DESIGN-RULES.md` (29-43) — Locked visual system: Playfair для editorial headings; «не применять автоматически смену шрифтов… запрет курсива»
- **Контракты и гейты:** Текст не меняется — client allowlist/owner overrides не затронуты. Меняется дизайн-контракт: решение владельца по общему вопросу 1 фиксируется в маркере final-dev4 (наследник final_dev3_contract.py; final-dev3 не бампить). qa-browser-matrix.py EXPECTED_FONTS/роль «italic» переписать под новое семейство/стиль, иначе матрица упадёт. Новое начертание (Playfair regular/bold или иная пара) = новые физические woff2 в site/fonts + fonts.css + inline base64 в standalone (правило «все шрифты физические», spec: повторный замер «0 фолбэков» на 1440 и 390).
- **Вопрос из разбора (сведён в анкету):** Пометка «Поменять шрифт» распространяется и на «Брачный договор» (строка 33, без пометки) — да/нет? (Какой шрифт/начертание — общий вопрос 1.)
- **Приёмка:** python scripts/qa-browser-matrix.py <url> PASS с обновлённым EXPECTED_FONTS; Playwright: getComputedStyle(.svc-title).fontFamily/fontStyle/fontWeight одинаковы на всех 8 панелях, document.fonts.check(descriptor) === true; DevTools CSS.getPlatformFontsForNode → 0 элементов с системным фолбэком на 1440 и 390 (гейт spec); синтетический bold/italic (faux) отсутствует.
- **Примечания:** Поправка скептика применена: «Брачный договор» — строка 33 (не 34); пометки — строки 18, 20, 23, 26, 28, 31, 36; добавлена строка 15 (H2, .section-title) как носитель той же пометки. Вопрос о семействе/весе не дублируется — общий вопрос 1; оставлен только частный вопрос про строку 33. Уточнение по вкладкам: строки 20 и 28 в списке — это h3 (текст совпадает с кнопкой-вкладкой), вкладки .svc-tab — Onest; при ответе владельца уточнить, касается ли пометка кнопок-вкладок, отдельным вопросом не выносится.

### B:G-06 — Услуги / панель 3 «Дети» — лид 3.18

- **Строки списка:** 24
- **Тип:** текст; **трудоёмкость:** S
- **Вопросы анкеты:** №4, №5, №6
- **Сейчас на сайте:** Соглашения и споры о месте проживания ребёнка и порядке общения. Возвращение похищенных детей в международных делах, включая ситуации с незарегистрированными родительскими правами.
- **Правка владельца:** Правка: «Споры о месте проживания ребенка и порядке общения. Международные дела о возвращении похищенных или незаконно удерживаемых детей, включая сложные случаи с неоформленными родительскими правами»
- **Где в коде:**
  - `site/index.html` (241) — p.svc-lead[data-copy-id="3.18"]
  - `site/gambarian-standalone.html` (2024) — p.svc-lead[data-copy-id="3.18"]
  - `scripts/client_copy_contract.py` (238-243) — APPROVED_COPY_ITEMS "3.18" (остаётся); новый owner-блок в OWNER_APPROVED_COPY:367
- **Контракты и гейты:** Owner override (data-owner-copy-id, OWNER_APPROVED_COPY, CONTENT-OWNER-EDITS.md, bump контракта со всеми маркерами); блок 3.18 в allowlist остаётся. Тире нет. Орфография присланного текста: «ребенка» без ё и нет точки в конце (остальные лиды секции — с ё и точкой) — решается общим вопросом 3 (дословно или редактура).
- **Приёмка:** python -B scripts/verify-client-copy.py PASS; grep -c 'незаконно удерживаемых детей' site/index.html → 1; live: python `verify-live-surface.py` (репо digitalhook-os-; в этом репо отсутствует, см. spec, подготовительный шаг 5) --url https://final-dev4.gambarian-landing.pages.dev/ --expect 'незаконно удерживаемых детей' --forbid 'Соглашения и споры о месте' → exit 0.
- **Примечания:** Поправка скептика применена: частный вопрос про ё/точку снят — подчинён общему вопросу 3. Alias final-dev4.

### B:G-07 — Услуги / панель 4 «Отцовство» — h3 3.22

- **Строки списка:** 26
- **Тип:** текст; **трудоёмкость:** S
- **Вопросы анкеты:** №4, №20
- **Сейчас на сайте:** Установление или оспаривание отцовства · тест ДНК
- **Правка владельца:** Правка: «Установление или оспаривание отцовства, ⏎ тест ДНК» (запятая вместо « · », перенос строки). Для заметок: «Поменять шрифт» (см. G-05)
- **Где в коде:**
  - `site/index.html` (269) — h3.svc-title[data-copy-id="3.22"]
  - `site/gambarian-standalone.html` (2052) — h3.svc-title[data-copy-id="3.22"]
  - `scripts/client_copy_contract.py` (244, 303) — APPROVED_COPY_ITEMS "3.22" (остаётся); прецедент переноса — 5.17 (:303, «\n» в контракте)
  - `site/index.html` (465) — li[data-copy-id="5.17"] — прецедент: пробел перед <br>
- **Контракты и гейты:** Owner override (текст с запятой не входит в 45 блоков). Перенос: по прецеденту 5.17 в контракт писать «\n», в разметке <br> с пробелом/переводом строки перед ним (index.html:465 — «онлайн <br><a»), т.к. normalize_text сворачивает whitespace, а HTMLParser не порождает пробел из <br>. На ≤860px заголовок и так переносится — жёсткий <br> может дать висячее слово.
- **Вопрос из разбора (сведён в анкету):** Перенос после запятой жёсткий на всех ширинах (<br>) — да/нет?
- **Приёмка:** python -B scripts/verify-client-copy.py PASS; sed -n '150,419p' site/index.html | grep -c '·' → 0; Playwright: на 1440 h3[3.22] ровно 2 строки («тест ДНК» второй), на 390 — нет одиночного висячего слова, scrollWidth==clientWidth; python scripts/qa-browser-matrix.py <url> PASS.
- **Примечания:** Поправок скептика по пункту нет; прецедент 5.17 перепроверен (index.html:465, контракт :303): в разметке пробел стоит ПЕРЕД <br>, а не после — формулировка уточнена.

### B:G-08 — Услуги / панель 4 «Отцовство» — лид 3.23

- **Строки списка:** 27
- **Тип:** текст; **трудоёмкость:** S
- **Вопросы анкеты:** №4
- **Сейчас на сайте:** Сопровождение обращения в семейный суд, получения постановления о генетической проверке и процедуры установления либо оспаривания отцовства. В Израиле тест проводится на основании судебного постановления.
- **Правка владельца:** Правка: «Установление и оспаривание отцовства, получение судебного разрешения на проведение ДНК-теста и полное сопровождение процедуры. В Израиле генетическая экспертиза для установления родства проводится на основании постановления суда.»
- **Где в коде:**
  - `site/index.html` (270) — p.svc-lead[data-copy-id="3.23"]
  - `site/gambarian-standalone.html` (2053) — p.svc-lead[data-copy-id="3.23"]
  - `scripts/client_copy_contract.py` (245-251) — APPROVED_COPY_ITEMS "3.23" (остаётся); новый owner-блок в OWNER_APPROVED_COPY:367
- **Контракты и гейты:** Owner override + CONTENT-OWNER-EDITS.md + bump контракта со всеми маркерами. Тире нет; дефис в «ДНК-теста» допустим (TYPOGRAPHY-DASHES §1). Юридическая фраза о постановлении суда меняется — по docs/CONTENT-EDIT-PROPOSALS-2026-08-17.md:49 требует подтверждения адвоката; spec (общий вопрос 3) это уже выделяет — зафиксировать одобрение адвоката в CONTENT-OWNER-EDITS.md; предложение по 3.23 пометить superseded.
- **Приёмка:** python -B scripts/verify-client-copy.py PASS; grep -c 'генетическая экспертиза для установления родства' site/index.html → 1; live: python `verify-live-surface.py` (репо digitalhook-os-; в этом репо отсутствует, см. spec, подготовительный шаг 5) --url https://final-dev4.gambarian-landing.pages.dev/ --expect 'генетическая экспертиза' --forbid 'Сопровождение обращения в семейный суд' → exit 0.
- **Примечания:** Поправка скептика применена: «live readback --forbid» привязан к конкретному инструменту из другого репозитория (`verify-live-surface.py` (репо digitalhook-os-; в этом репо отсутствует, см. spec, подготовительный шаг 5); в этом репо verify-live-previews.py имеет только --only). Подтверждение адвоката — общий вопрос 3, отдельно не задаётся.

### B:G-09 — Услуги / панель 5 «Раздел имущества» — лид 3.28

- **Строки списка:** 29
- **Тип:** текст; **трудоёмкость:** S
- **Вопросы анкеты:** №4
- **Сейчас на сайте:** Квартира и ипотека, банковские счета, пенсионные накопления, бизнес и долги — в переговорах, соглашении и судебном процессе.
- **Правка владельца:** Правка: «Раздел имущества и долгов супругов: недвижимость, ипотека, банковские счета, пенсионные накопления, бизнес, кредиты и иные обязательства — в переговорах, соглашении и судебном процессе.»
- **Где в коде:**
  - `site/index.html` (299) — p.svc-lead[data-copy-id="3.28"]
  - `site/gambarian-standalone.html` (2082) — p.svc-lead[data-copy-id="3.28"]
  - `scripts/client_copy_contract.py` (253-257) — APPROVED_COPY_ITEMS "3.28" (остаётся); новый owner-блок в OWNER_APPROVED_COPY:367
  - `scripts/verify-live-previews.py` (39-40, 87-89) — NBSP_EXPECTED — счётчик «&nbsp;—»
- **Контракты и гейты:** Owner override + CONTENT-OWNER-EDITS.md + bump контракта со всеми маркерами. TYPOGRAPHY-DASHES: одно тире «обязательства&nbsp;— в переговорах» (U+2014, &nbsp; перед ним) — число «&nbsp;—» в панели не меняется (1→1), но входит в общий пересчёт NBSP_EXPECTED (см. G-04).
- **Приёмка:** grep -c 'обязательства&nbsp;— в переговорах' site/index.html → 1; python -B scripts/verify-client-copy.py PASS; grep -c '&nbsp;—' build/variants/final-dev4/index.html == NBSP_EXPECTED для final-dev4; python scripts/qa-browser-matrix.py <url> без overflow.
- **Примечания:** Поправки скептика применены: live-гейт NBSP_EXPECTED добавлен; критерий «0 из 57» заменён на воспроизводимые команды. Дословность — общий вопрос 3.

### B:G-10 — Услуги / панель 6 «Медиация» — лид 3.33

- **Строки списка:** 32
- **Тип:** текст; **трудоёмкость:** S
- **Вопросы анкеты:** №4
- **Сейчас на сайте:** Если стороны готовы к конструктивному диалогу, офис обеспечивает полное сопровождение процедуры медиации, помогает согласовать условия, касающиеся детей, алиментов и раздела имущества, а также подготовить юридически грамотное соглашение и представить его на утверждение в установленном законом порядке
- **Правка владельца:** Правка: «При готовности сторон к диалогу офис сопровождает медиацию, помогает достичь соглашения по вопросам детей, алиментов и имущества, а также оформляет договорённости в юридически грамотное соглашение для последующего утверждения.»
- **Где в коде:**
  - `site/index.html` (328) — p.svc-lead[data-copy-id="3.33"]
  - `site/gambarian-standalone.html` (2111) — p.svc-lead[data-copy-id="3.33"]
  - `scripts/client_copy_contract.py` (259-266) — APPROVED_COPY_ITEMS "3.33" (остаётся); новый owner-блок в OWNER_APPROVED_COPY:367
- **Контракты и гейты:** Owner override + CONTENT-OWNER-EDITS.md + bump контракта со всеми маркерами. Тире нет. Закрывает предложение по 3.33 из docs/CONTENT-EDIT-PROPOSALS-2026-08-17.md:53 — пометить superseded. Текст короче — панель «Медиация» ниже (G-16).
- **Приёмка:** python -B scripts/verify-client-copy.py PASS; grep -c 'оформляет договорённости' site/index.html → 1; live: python `verify-live-surface.py` (репо digitalhook-os-; в этом репо отсутствует, см. spec, подготовительный шаг 5) --url https://final-dev4.gambarian-landing.pages.dev/ --expect 'оформляет договорённости' --forbid 'конструктивному диалогу' → exit 0.
- **Примечания:** Поправка скептика применена: инструмент live readback назван явно; alias final-dev4. Дословность — общий вопрос 3.

### B:G-11 — Услуги / панель 7 «Брачный договор» — лид 3.38

- **Строки списка:** 34
- **Тип:** текст; **трудоёмкость:** S
- **Вопросы анкеты:** №4, №5
- **Сейчас на сайте:** Составление брачного договора на оптимальных для ситуации пары условиях: имущество, бизнес, обязательства и защита интересов каждого супруга. Сопровождение официального утверждения.
- **Правка владельца:** Правка: «Разработка брачного договора на индивидуальных условиях с учетом имущества, бизнеса, долговых и иных обязательств сторон. Защита интересов каждого супруга и сопровождение официального утверждения соглашения.»
- **Где в коде:**
  - `site/index.html` (357) — p.svc-lead[data-copy-id="3.38"]
  - `site/gambarian-standalone.html` (2140) — p.svc-lead[data-copy-id="3.38"]
  - `scripts/client_copy_contract.py` (268-273) — APPROVED_COPY_ITEMS "3.38" (остаётся); новый owner-блок в OWNER_APPROVED_COPY:367
- **Контракты и гейты:** Owner override + CONTENT-OWNER-EDITS.md + bump контракта со всеми маркерами. Тире нет. Орфография «с учетом» без ё — решается общим вопросом 3.
- **Приёмка:** python -B scripts/verify-client-copy.py PASS; grep -c 'Разработка брачного договора' site/index.html → 1; live: python `verify-live-surface.py` (репо digitalhook-os-; в этом репо отсутствует, см. spec, подготовительный шаг 5) --url https://final-dev4.gambarian-landing.pages.dev/ --expect 'Разработка брачного договора' --forbid 'оптимальных для ситуации пары' → exit 0.
- **Примечания:** Поправка скептика применена: вопрос про ё снят, подчинён общему вопросу 3; инструмент live readback назван явно; alias final-dev4.

### B:G-12 — Услуги / панель 8 «Защита при угрозах» — лид 3.43

- **Строки списка:** 37
- **Тип:** текст; **трудоёмкость:** S
- **Вопросы анкеты:** №4, №15
- **Сейчас на сайте:** Подготовка срочного обращения за защитным ордером. При непосредственной опасности необходимо обращаться в экстренные службы, не ожидая ответа через форму сайта.
- **Правка владельца:** Правка: «Срочное обращение за защитным ордером и юридическое сопровождение процедуры. При непосредственной опасности следует немедленно обратиться в экстренные службы, не дожидаясь ответа через сайт.»
- **Где в коде:**
  - `site/index.html` (386) — p.svc-lead[data-copy-id="3.43"]
  - `site/gambarian-standalone.html` (2169) — p.svc-lead[data-copy-id="3.43"]
  - `scripts/client_copy_contract.py` (275-280) — APPROVED_COPY_ITEMS "3.43" (остаётся); новый owner-блок в OWNER_APPROVED_COPY:367
- **Контракты и гейты:** Owner override + CONTENT-OWNER-EDITS.md + bump контракта со всеми маркерами. Тире нет. Зависит от G-17: если владелец убирает вкладку «Защита при угрозах», панель 8 и этот пункт снимаются.
- **Приёмка:** python -B scripts/verify-client-copy.py PASS; grep -c 'не дожидаясь ответа через сайт' site/index.html → 1; live: python `verify-live-surface.py` (репо digitalhook-os-; в этом репо отсутствует, см. spec, подготовительный шаг 5) --url https://final-dev4.gambarian-landing.pages.dev/ --expect 'не дожидаясь ответа через сайт' --forbid 'не ожидая ответа через форму сайта' → exit 0.
- **Примечания:** Поправка скептика применена (инструмент live readback, alias final-dev4). Добавлена зависимость от пропущенной скептиком-аналитиком строки 94 (G-17).

### B:G-13 — Услуги / блок «Ведёт» — фото Юлии в части тем

- **Строки списка:** 40
- **Тип:** ассет; **трудоёмкость:** M
- **Вопросы анкеты:** №3, №18
- **Сейчас на сайте:** Адвокат Александр Гамбарян (img.svc-media__avatar alexander-avatar-128w + имя, лицензия, абзац) — одинаково во всех 8 панелях
- **Правка владельца:** Для заметок: «В некоторых темах вставить фотку Юли»
- **Где в коде:**
  - `site/index.html` (186-200, 215-229, 244-258, 273-287, 302-316, 331-345, 360-374, 389-403) — .svc-media > .svc-media__person > picture > img.svc-media__avatar[src=assets/alexander-avatar-128w.71d1278f.jpg][alt="Адвокат Александр Гамбарян"] + .svc-media__name
  - `site/gambarian-standalone.html` (1974, 2003, 2032, 2061, 2090, 2119, 2148, 2177) — img.svc-media__avatar (base64 inline)
  - `site/styles.css` (841-857) — .svc-media__avatar (54px, object-fit cover, object-position center 12%), .svc-media__name
  - `site/assets` (—) — alexander-avatar-128w.{71d1278f.jpg,de2d4e53.webp}; yulia-card-{480w,760w,1100w}.* — карточка, не аватар; yulia-avatar-* отсутствует
  - `docs/source-photos/yulia-portrait.jpg` (—) — исходник 1122×1402, верх головы 1.3% — почти без запаса для круглого кропа
  - `scripts/client_copy_contract.py` (388-393, 98, 22-90) — OWNER_APPROVED_HTML_TOKENS ('alt="Адвокат Юлия Саакян"', src/srcset yulia-card-*); ALLOWED_TEXT_ATTRIBUTES:98; ALLOWED_OUTSIDE_COPY_TEXT — «Юлия Саакян» отсутствует
  - `scripts/verify-client-copy.py` (434-440) — html.count(token) != 1 → problem; пропуск только src=/srcset= в standalone
- **Контракты и гейты:** 1) Новый физический asset yulia-avatar-128w.{jpg,webp} с хэшем из docs/source-photos/yulia-portrait.jpg (пайплайн аватара в scripts/ не задокументирован: grep 'avatar' scripts/*.py docs/*.md → 0, alexander-avatar собран вне репо) — нужен build-шаг или ручная сборка с фиксацией в docs; yulia-card-* переиспользовать нельзя (их src/srcset обязаны встречаться ровно 1×). 2) alt: 'alt="Адвокат Юлия Саакян"' входит в OWNER_APPROVED_HTML_TOKENS:392 и обязан встречаться ровно 1× в каждом target, включая standalone → для аватара в «Ведёт» другой alt (напр. «Юлия Саакян») с добавлением в ALLOWED_TEXT_ATTRIBUTES, либо менять правило токенов. 3) Видимое имя «Юлия Саакян» в .svc-media__name отсутствует в ALLOWED_OUTSIDE_COPY_TEXT → добавить; номер лицензии Юлии в репозитории отсутствует (не выдумывать); абзац «Более 30 лет…» для Юлии неверен (yulia-card-v1: «Более 17 лет») → отдельный текст блока для Юлии = новая строка allowlist (повторяется в N панелях, owner id невозможен). 4) docs/SCREEN-COMPOSITION.md:82 («Имена адвокатов или «Ведёт» вне клиентского документа не добавляются») устарел относительно контракта 1.2.0 (:32 «Адвокат Александр Гамбарян», :37 «Ведёт» разрешены) — при добавлении Юлии обновить документ. 5) Standalone инлайнит аватар base64 — пересобрать python scripts/build-preview.py --standalone. 6) Связь с общим вопросом 2 (фото одинаковые/иерархия) и с G-16 (если «Ведёт» вынесен в один статический элемент, смена персоны по теме идёт через JS/данные).
- **Вопрос из разбора (сведён в анкету):** В каких вкладках ведёт Юлия — номера 1–8 через запятую? Есть ли у Юлии номер лицензии для показа — число или «нет»? Подпись под фото — только «Адвокат-партнёр · миграционное и семейное право» (уже утверждено) — да/нет?
- **Приёмка:** ls site/assets | grep -c 'yulia-avatar-128w' → 2 (jpg+webp с хэшем); python -B scripts/verify-client-copy.py PASS; grep -c 'alt="Адвокат Юлия Саакян"' site/index.html site/gambarian-standalone.html → по 1 (токен не задвоен); Playwright: на указанных владельцем вкладках img.svc-media__avatar naturalWidth>0, скриншоты 1440/390 — лицо не обрезано (object-position подобрать под запас 1.3%); python scripts/qa-browser-matrix.py <url> PASS; python -B scripts/verify-client-previews.py PASS.
- **Примечания:** Применены три поправки скептика: (а) alt-токен OWNER_APPROVED_HTML_TOKENS:392 с требованием 1× — проверено в verify-client-copy.py:434-440, вывод аналитика «alt уже разрешён» неполон; (б) исходник Юлии есть (docs/source-photos/yulia-portrait.jpg), вопрос «какое фото» сужен до подписи/лицензии/списка тем; (в) SCREEN-COMPOSITION — не «нарушение», а устаревший документ. Установленный факт 4: у yulia-portrait верх головы 1.3% — для круглого аватара запас минимальный, отражено в acceptance.

### B:G-14 — Услуги / блок «Ведёт» — строка лицензии

- **Строки списка:** 41
- **Тип:** текст; **трудоёмкость:** S
- **Вопросы анкеты:** №4, №14
- **Сейчас на сайте:** Адвокат Израиля, лицензия №&nbsp;30178.
- **Правка владельца:** Правка: «Адвокат Израиля, лицензия № 30178». Для заметок: «Убрать точку»
- **Где в коде:**
  - `site/index.html` (195, 224, 253, 282, 311, 340, 369, 398) — .svc-media__license ×8
  - `site/gambarian-standalone.html` (1978, 2007, 2036, 2065, 2094, 2123, 2152, 2181) — .svc-media__license ×8
  - `scripts/client_copy_contract.py` (35, 133, 301) — ALLOWED_OUTSIDE_COPY_TEXT (:35), ALLOWED_JSON_LD_TEXT (:133), блок 5.13 (:301) — все с точкой
  - `site/index.html` (135, 463, 593) — те же слова вне секции: Hero facts-bar (строка списка 11), li[data-copy-id="5.13"] (строка 55), JSON-LD jobTitle — другие группы
- **Контракты и гейты:** Строка без точки отсутствует в allowlist → добавить «Адвокат Израиля, лицензия № 30178» в ALLOWED_OUTSIDE_COPY_TEXT (identity-факт; owner id не подходит — 8 повторов, verifier требует 1×). Та же правка в строках 11 (Hero, index.html:135) и 55 (5.13, :463, с data-copy-id — там нужен owner override) — одна запись контракта и одна фиксация в CONTENT-OWNER-EDITS.md на все группы; JSON-LD (:593, с точкой; в JSON-LD &nbsp; недопустим) — решает группа Hero/Адвокаты. &nbsp; между «№» и номером сохранить.
- **Приёмка:** sed -n '/<section class="services"/,/<\/section>/p' site/index.html | grep -c 'лицензия №&nbsp;30178<' → 8 и … | grep -c '30178\.' → 0; python -B scripts/verify-client-copy.py PASS; общесайтовый счёт согласовать с группами Hero/Адвокаты; live: python `verify-live-surface.py` (репо digitalhook-os-; в этом репо отсутствует, см. spec, подготовительный шаг 5) --url https://final-dev4.gambarian-landing.pages.dev/ --forbid '30178.</div>' → exit 0.
- **Примечания:** Поправки скептика применены: строки контракта 36→35 и 143→133 (проверено: :143 — начало ALLOWED_DYNAMIC_UI_TEXT); счётчик «= 8» ограничен секцией через sed, т.к. index.html:135 и :463 дадут 9–10 после правок других групп; перекрёстные строки списка — 11 и 55 (нумерация 0-based).

### B:G-15 — Услуги / блок «Ведёт» — абзац под notch

- **Строки списка:** 42
- **Тип:** текст; **трудоёмкость:** S
- **Вопросы анкеты:** №4, №18, №19
- **Сейчас на сайте:** Более 30 лет профессионального опыта в юриспруденции. Языки работы — русский, иврит, английский
- **Правка владельца:** Правка: «Более 30 лет профессионального опыта в юридической сфере. Работа с клиентами на русском, иврите и английском языках.»
- **Где в коде:**
  - `site/index.html` (199, 228, 257, 286, 315, 344, 373, 402) — .svc-media > p ×8 (после .notch)
  - `site/gambarian-standalone.html` (1982, 2011, 2040, 2069, 2098, 2127, 2156, 2185) — .svc-media > p ×8
  - `scripts/client_copy_contract.py` (41) — ALLOWED_OUTSIDE_COPY_TEXT: объединённая строка (остаётся)
  - `scripts/verify-live-previews.py` (39-40, 87-89) — NBSP_EXPECTED — 8 «Языки работы&nbsp;—» уходят
  - `site/index.html` (100-111, 461) — «в юриспруденции» также в фактах 2.6 (aria-label :100, H2 :103, .fact-card__sub :111) и 5.9 (:461)
- **Контракты и гейты:** Новый текст вне 45 блоков, 8 повторов → запись в ALLOWED_OUTSIDE_COPY_TEXT + дословная фиксация в CONTENT-OWNER-EDITS.md как OWNER-APPROVED (owner id невозможен). Тире исчезает → секция теряет 8 «&nbsp;—» — обязательный пересчёт NBSP_EXPECTED (23 → per-alias) в scripts/verify-live-previews.py, иначе live-гейт final-dev4 упадёт. Несогласованность терминов: «в юридической сфере» здесь vs «в юриспруденции» в фактах 2.6 (index.html:100-111) и 5.9 (:461) — не в Hero. Если по G-13 в части тем ведёт Юлия — абзац для неё неверен (нужен отдельный текст).
- **Вопрос из разбора (сведён в анкету):** «В юридической сфере» здесь при «в юриспруденции» в фактах и карточке адвоката — оставить как есть (да) или унифицировать (нет)?
- **Приёмка:** grep -c 'Работа с клиентами на русском, иврите и английском языках.' site/index.html → 8; sed -n '150,419p' site/index.html | grep -c 'Языки работы&nbsp;—' → 0; python -B scripts/verify-client-copy.py PASS; grep -c '&nbsp;—' build/variants/final-dev4/index.html == NBSP_EXPECTED для final-dev4; python -B scripts/verify-live-previews.py --only final-dev4 PASS (после per-alias ожидания).
- **Примечания:** Поправки скептика применены: строка контракта 37→41 (:37 — «Ведёт»); «в Hero» → факты 2.6 и 5.9 (проверено grep 'юриспруденции' → 100, 103, 111, 461); добавлен live-гейт NBSP_EXPECTED — именно этот пункт снимает 8 из 23 защищённых тире (установленный факт 1).

### B:G-16 — Услуги / «окошко» с разделами — раскладка и стрелки

- **Строки списка:** 43
- **Тип:** раскладка; **трудоёмкость:** L
- **Вопросы анкеты:** №17
- **Сейчас на сайте:** 8 отдельных .svc-card (role=tabpanel), переключение через hidden; стрелки prev/next в шапке секции справа (.services__head > .services__arrows); блок «Ведёт» (.svc-media, border-left) продублирован в каждой панели СПРАВА от текста; .svc-card__cta внутри .svc-card__main под текстом
- **Правка владельца:** Для заметок: «Оставить одной величины, с равнением на середину по вертикали ⏎ Стрелочки — по бокам окошка ⏎ Меняется только правая часть с текстом по линии разделения. Левая часть (ведет…) — остается неподвижной ⏎ Красная кнопка “Записаться на консультацию” остается неподвижной»
- **Где в коде:**
  - `site/styles.css` (695-719) — .services__head, .services__arrows, .svc-arrow (44px круги в шапке)
  - `site/styles.css` (746-761) — .svc-card (padding clamp 26–46px), .svc-card[hidden]{display:none}, .svc-card__inner flex-wrap, .svc-card__main flex:1 1 380px
  - `site/styles.css` (810-831) — .svc-card__cta (inline-block после .svc-lead), .svc-media (flex 0 1 300px, align-self stretch, border-left, justify-content center)
  - `site/styles.css` (495-620, 1385-1600) — media-queries — правил для .svc-* НЕТ (awk по блокам @media → 0); mobile-раскладка карточки только через flex-wrap
  - `site/index.html` (158-161 (стрелки), 175-405 (8 панелей), 407-416 (.svc-dots)) — section#services
  - `site/app.js` (131-202) — tabs/dots/panels; setActive(): panel.hidden = i !== active (:153); ArrowLeft/Right/Home/End (:176-188); стрелки (:197-200)
  - `site/gambarian-standalone.html` (836-1036 (CSS), 1941-1944 (стрелки), 2596-2667 (JS: var tabs … setActive(0))) — inline-копии
- **Контракты и гейты:** Текст не меняется — client allowlist/owner overrides не затронуты. Дизайн-контракт: решение фиксируется в маркере final-dev4 (final-dev3 Design 2.0.2 не бампить); qa-browser-matrix.py — добавить замеры высоты/позиций; ARIA tablist/tabpanel, aria-selected и клавиатура сохраняются; Action Bar не затронут. Реализация: (а) единая высота — все панели в одной grid-ячейке (grid-area 1/1, visibility/opacity вместо display:none) либо min-height по максимальной панели после document.fonts.ready; (б) вертикальное центрирование .svc-card__main; (в) CTA вынесен из панели в общую обёртку или .svc-card__main как flex-column с CTA margin-top:auto; (г) блок «Ведёт» — один статический элемент вне панелей (тогда G-13 требует смены персоны по теме через JS/данные); (д) стрелки position:absolute по вертикальному центру карточки слева/справа, на ≤860px — решение владельца. Выполнять после текстовых правок (G-02/G-03/G-04/G-10 меняют высоты) и одной архитектурой с мобильным требованием строки 96 (G-18): свайп + другой формат меню + неподвижный низ.
- **Вопрос из разбора (сведён в анкету):** «Левая часть (ведёт…)»: сейчас блок «Ведёт» справа от разделительной линии — менять местами с текстом (да/нет)? Стрелки — снаружи карточки или внутри у краёв? На ≤860px стрелки — по бокам или в шапке?
- **Приёмка:** Playwright на 1440/1200/1024/961/960/390/360: для всех 8 вкладок .svc-card.getBoundingClientRect().height одинакова (разброс ≤1px); top/left у .svc-media и .svc-card__cta идентичны на всех вкладках; центр стрелок по Y = центр карточки ±2px, по X — у левого/правого края карточки; document.documentElement.scrollWidth === clientWidth; role=tab/tabpanel, aria-selected и ArrowLeft/Right работают; python scripts/qa-browser-matrix.py <url> PASS; python -B scripts/verify-client-previews.py PASS; после деплоя python -B scripts/verify-live-previews.py --only final-dev4 PASS.
- **Примечания:** Поправка скептика применена: диапазон inline-CSS в standalone 836-895 → 836-1036 (проверено: .services__head 836, .svc-card 887, .svc-title 930, .svc-card__cta 951, .svc-media 962, .svc-dot[aria-current] 1036). Поправка скептика по JS «2597-2668» сама неточна: в текущем дереве var tabs — строка 2596, setActive(0) — 2667 (аналитик был прав). Alias final-dev3→final-dev4. Добавлена связь с G-17 (состав/порядок вкладок) и G-18 (мобильный формат).

### B:G-17 — Услуги / вкладки — порядок и состав (из общих заметок владельца)

- **Строки списка:** 94
- **Тип:** решение; **трудоёмкость:** S
- **Вопросы анкеты:** №15
- **Сейчас на сайте:** 8 вкладок в порядке: Развод, Алименты, Дети, Отцовство, Раздел имущества, Медиация, Брачный договор, Защита при угрозах
- **Правка владельца:** Для заметок (строка 94, фрагмент): «2-ая секция: Развод, алименты, раздел имущества, дети, отцовство, медиация, брачный договор»
- **Где в коде:**
  - `site/index.html` (164-173) — .svc-tabs[role=tablist] > button.svc-tab ×8 (id svc-tab-1…8, aria-controls svc-panel-1…8)
  - `site/index.html` (175-405, 407-416) — .svc-card#svc-panel-1…8 (порядок панелей = порядок вкладок), .svc-dots > .svc-dot[aria-label] ×8
  - `site/gambarian-standalone.html` (1948-1957, 1960-2188) — те же вкладки/панели (inline-копия)
  - `site/app.js` (131-134, 138-158) — tabs/dots/panels по индексу — порядок задаётся разметкой
  - `scripts/client_copy_contract.py` (39-87, 101-125) — названия вкладок в ALLOWED_OUTSIDE_COPY_TEXT и ALLOWED_TEXT_ATTRIBUTES (aria-label точек) — при удалении вкладки строки остаются неиспользуемыми, это допустимо
- **Контракты и гейты:** Владелец перечисляет 7 тем в другом порядке и без «Защита при угрозах», называя секцию «2-ая» (на сайте это 3-я секция; 2-я — факты). Если это новый порядок/состав: переставить вкладки, панели и точки синхронно (id/aria-controls/aria-labelledby), при удалении 8-й вкладки снять панель 8 (тогда G-12 теряет смысл, блоки 3.42/3.43 становятся неиспользуемыми в allowlist — verifier требует 1× только для присутствующих data-copy-id, но APPROVED_COPY_ITEMS остаются); перестройка входит в G-16. Если описка — без изменений. Текст не меняется, контракт копирайта не бампится.
- **Вопрос из разбора (сведён в анкету):** Порядок «Развод, алименты, раздел имущества, дети, отцовство, медиация, брачный договор» — новый порядок вкладок (да/нет)? Вкладку «Защита при угрозах» убрать (да/нет)?
- **Приёмка:** При «да»: grep -o 'id="svc-tab-[0-9]"[^>]*>[^<]*' site/index.html — порядок совпадает с ответом владельца; grep -c 'class="svc-tab' site/index.html == grep -c 'class="svc-card"' site/index.html == grep -c 'class="svc-dot"' site/index.html; python -B scripts/verify-client-copy.py PASS; Playwright: ArrowRight обходит вкладки в новом порядке, aria-controls/aria-labelledby парные. При «нет»: без изменений.
- **Примечания:** Пропущенная аналитиком и добавленная скептиком строка (установленный факт 2). Строка 94 формально в группе E (общие), но напрямую задаёт состав этой секции; остальные фрагменты строки 94 (шрифты, фото, нерабочее время, отступы) — группа E, здесь не разбираются.

### B:G-18 — Услуги / мобильная раскладка меню тем (из группы F, архитектурно в G-16)

- **Строки списка:** 96
- **Тип:** решение; **трудоёмкость:** M
- **Вопросы анкеты:** №7, №16
- **Сейчас на сайте:** На ≤860px 8 вкладок .svc-tabs переносятся flex-wrap; панель = flex-wrap колонкой (текст, затем «Ведёт»); стрелки в шапке; правил для .svc-* в media-queries нет
- **Правка владельца:** Для заметок (строка 96, фрагменты): «Третья секция — привести в порядок, она очень перегружена. Упорядочить элементы меню в какой-то другой формат (развод, алименты и т.д.)»; «Третья секция — сделать возможность свайпить между темами. Нижняя часть остается недвижимой (ведет…)»
- **Где в коде:**
  - `site/styles.css` (721-744) — .svc-tabs (flex-wrap), .svc-tab, .svc-tab.is-active — единственные правила, без media-queries
  - `site/styles.css` (1385-1392, 1429-1600) — @media (max-width: 960px / 860px) — точки, куда добавлять mobile-правила .svc-*
  - `site/app.js` (131-202) — tabs-контроллер: нет обработчиков touch/pointer — свайп добавлять сюда
  - `site/gambarian-standalone.html` (858-886, 2596-2667) — inline-копии .svc-tabs/.svc-tab и JS
  - `site-addons/action-bar` (—) — Action Bar не затрагивает .svc-* (grep svc → 0), но нижняя фиксированная панель делит viewport с «неподвижной нижней частью» карточки
- **Контракты и гейты:** Текст не меняется. Формат меню на мобильном (горизонтальная прокрутка вкладок / выпадающий список / аккордеон) и свайп — та же перестройка секции, что G-16 (единая высота, статический «Ведёт», неподвижная CTA): делать одной архитектурой, иначе desktop- и mobile-решения разойдутся. Свайп — общий вопрос 4 (только жест или плюс стрелки/точки). Проверка обеих сторон границы 960/961 и короткого portrait обязательна (AGENTS.md).
- **Вопрос из разбора (сведён в анкету):** Формат меню тем на мобильном: горизонтальная прокрутка вкладок / выпадающий список / аккордеон — какой?
- **Приёмка:** python scripts/qa-browser-matrix.py <url> без overflow на 360/390/960/961/1440; Playwright 390×844 и 390×600 (короткий portrait): свайп влево/вправо по .svc-card переключает aria-selected и панель; rect .svc-media и .svc-card__cta (top) не меняются между темами; Action Bar не перекрывает CTA карточки; document.documentElement.scrollWidth === clientWidth.
- **Примечания:** Пропущенная аналитиком и добавленная скептиком строка; формально группа F, включена как зависимость G-16 (одна перестройка). Свайп отдельно не переспрашивается — общий вопрос 4.

## Группа C. Прецедент и адвокаты (строки 44–68)

Ветка codex/final-dev4 (HEAD a29be3b, дерево чистое) — проверено. Нумерация приведена к индексу TSV (шапка = 0), совпадает с docs/CONTENT-OWNER-REVISIONS-2026-09-06.md; все «+1»-номера аналитика исправлены. Итог: 11 пунктов (G-05…G-07 сведены в один owner-блок alexander-card-v1, G-04/G-09 — один селектор .attorney-card__name), 11 строк без правок.

Ключевые факты по коду (перепроверены по рабочему дереву):
1. Секции «Прецедент» и «Адвокаты» дублируются в site/index.html:421–495 и site/gambarian-standalone.html:2204–2277 (текст идентичен); CSS — site/styles.css и inline <style> standalone. Каждая правка вносится в оба HTML и оба CSS.
2. Контракт копирайта: любая новая формулировка = data-owner-copy-id + запись в OWNER_APPROVED_COPY (scripts/client_copy_contract.py:367–386), CONTRACT_VERSION 1.2.0→1.3.0 + дата (строки 11–12) И синхронизация docstring строки 3 (сейчас «v1.1.0 | 2026-08-13» — установленный факт 3). Для группы новые owner-id: precedent-title-v1, precedent-body-v1, alexander-card-v1, yulia-card-v2, attorneys-note-v1 → «owner-approved 6 block» в сводке verify-client-copy.py:484–489.
3. ПОПРАВКА К СКЕПТИКУ (его коррекция «OWNER_REVIEW_IDS — опционально» неверна): scripts/verify-client-previews.py:305–309 строит source_review_ids через OWNER_REVIEW_IDS[value] для КАЖДОГО data-owner-copy-id из site/index.html — неизвестный id = KeyError, гейт падает. А после добавления ключа build-review-numbered.py:272–278 требует, чтобы review_ids в сборке == list(OWNER_REVIEW_IDS.values()) в порядке источника (verify-client-previews.py:369–384 сверяет и порядок) — значит для каждого нового owner-id нужен и код вставки data-review-id в _add_owner_review_ids (build-review-numbered.py:180–200). Вывод аналитика («требует записи и кода») был верным; цепочка обязательна для всех 5 новых owner-id.
4. Скрытое 7-е место yulia-card-v1: scripts/tests/test_verify_client_copy.py:73–76 (assert «owner:yulia-card-v1» и мутация строки «Записаться к Юлии», которая после G-13 исчезнет → тест станет ложно-зелёным/упадёт). CI/deploy запускают этот unittest (.github/workflows/ci.yml:52, deploy-previews.yml:79).
5. Счётчик «&nbsp;—»: сейчас 23 в site/index.html и final-dev3 (проверено grep). В группе только G-08 (удаление 5.17 «Приём&nbsp;— …») меняет счёт: 23→22 (review-numbered 22→21). G-02 сохраняет «Гамбарян&nbsp;—». Установленный факт 1: verify-live-previews.py:39–40, 82–88 упадёт на final-dev4, пока ожидание не станет per-alias.
6. Font-gate qa-browser-matrix.py:296–300, 986–1002 смотрит только .hero__title/.svc-title/.hero__lede/.hero .btn — для .precedent-card__title и .attorney-card__name он ни риск, ни доказательство (поправка скептика принята). Ассеты: site/fonts/ содержит только Playfair 500 normal+italic и Onest variable 400–800.
7. Документы уже в долгу: CONTENT-SOURCE-MAP.md:75,78 и CONTENT-APPROVED.md:149,152 хранят старые строки Юлии (снятые 2026-08-16), CONTENT-OWNER-EDITS.md v1.0.0 не содержит записи о Юлии (только 2.14) — закрыть при бампе на yulia-card-v2.
8. Предпосылки вне группы: alias final-dev4 нигде не заведён (client-preview-map.json — 11 записей; verify-client-previews.py:63–75 EXPECTED_PREVIEWS; verify-client-copy.py:38 EXPECTED_PREVIEW_ALIASES=11; build-hero-variants.py:291–296 VARIANTS; qa-browser-matrix.py:108–120). Все builder-ы копируют site/ целиком (build-hero-variants.py:300–304) — при правке site/ пересборка final-dev3 перестанет быть байт-в-байт эталоном; требуется решение (final-dev4 из отдельного source или заморозка каталога final-dev3).
9. Строка 68 «КОНСУЛЬТАЦИЯ» по таблице спеки попадает в диапазон C (45–68), но это eyebrow секции «Консультация» (index.html:498) — правок нет, содержательно относится к группе D.
10. Прежние предложения docs/CONTENT-EDIT-PROPOSALS-2026-08-17.md:67 (4.6), :78 (5.17), :79 (5.19) перекрыты списком владельца — при внесении пометить superseded.
11. Общая приёмка группы: python -m unittest discover -s scripts/tests -p 'test_verify_client_copy.py'; python -B scripts/verify-client-copy.py (exit 0, owner-approved 6 block, contract v1.3.0); пересборка 4 builder-ов; python -B scripts/verify-client-previews.py; python scripts/qa-browser-matrix.py http://127.0.0.1:8098 --all-previews (0 overflow); git diff --check; после публикации workflow only=final-dev4: python -B scripts/verify-live-previews.py --only final-dev4 (ожидаемо FAIL по счётчику 22≠23 до правки ожидания) + curl -s https://final-dev4.gambarian-landing.pages.dev/ | grep -c по каждому пункту; final-dev3 — sha256 до/после совпадает.

Строки без правки/заметки (действий нет): 44, 47, 48, 49, 52, 56, 58, 60, 63, 65, 68.

### C:G-01 — Прецедент

- **Строки списка:** 45
- **Тип:** текст; **трудоёмкость:** M
- **Вопросы анкеты:** №1, №4, №5, №6, №9
- **Сейчас на сайте:** Возвращение похищенного ребёнка при незарегистрированных родительских правах
- **Правка владельца:** Правка: «Возвращение неправомерно перемещенного или удерживаемого ребенка, в том числе в случаях, когда родительские права не были официально зарегистрированы.» Для заметок: «Поменять шрифт»
- **Где в коде:**
  - `site/index.html` (432) — h3.precedent-card__title[data-copy-id="4.5"]
  - `site/gambarian-standalone.html` (2215) — h3.precedent-card__title[data-copy-id="4.5"]
  - `site/styles.css` (959-969) — .precedent-card__title (--font-serif, italic, 500, clamp(24px,3vw,32px), line-height 1.25)
  - `site/gambarian-standalone.html` (1100-1110) — .precedent-card__title (inline-дубль)
  - `site/styles.css` (944-950) — .precedent-card__text (max-width 432px)
  - `site/gambarian-standalone.html` (1085-1091) — .precedent-card__text (inline-дубль)
  - `scripts/client_copy_contract.py` (3, 11-12, 367-386) — docstring-маркер, CONTRACT_VERSION/DATE, OWNER_APPROVED_COPY
  - `scripts/review_numbered_contract.py` (6-9) — OWNER_REVIEW_IDS
  - `scripts/build-review-numbered.py` (180-200, 272-278) — _add_owner_review_ids + сверка review_ids
  - `scripts/verify-client-previews.py` (305-309) — OWNER_REVIEW_IDS[value] — KeyError для нового owner-id
- **Контракты и гейты:** Текст вне 45-строчного allowlist: снять data-copy-id="4.5" (блок 4.5 остаётся в allowlist неиспользуемым — verify-client-copy это допускает, test_unused_approved_block_is_allowed), поставить data-owner-copy-id="precedent-title-v1", текст в OWNER_APPROVED_COPY, CONTRACT_VERSION 1.2.0→1.3.0 + дата + docstring строки 3. Обязательно (не опционально): ключ precedent-title-v1 в OWNER_REVIEW_IDS (иначе KeyError в verify-client-previews.py:305–309) и вставка data-review-id в build-review-numbered.py:_add_owner_review_ids в порядке источника. Документы: CONTENT-OWNER-EDITS.md v1.0.0→v1.1.0, CONTENT-SOURCE-MAP.md:49 («Прецедент | 4.5, 4.6»), CONTENT-APPROVED.md:78 («да» → «заменён owner-override»). Тире в тексте нет. Шрифт: селектор .precedent-card__title сейчас Playfair 500 italic; без нового ассета доступны только Playfair 500 normal или Onest 600–800; иной вес Playfair = новый woff2 (cyrillic+latin) + @font-face в site/fonts.css и inline standalone + правка docs/GAMBARIAN-DESIGN-RULES.md:33 при смене семейства. Счётчик «&nbsp;—» не меняется.
- **Вопрос из разбора (сведён в анкету):** 1) «перемещённого», «ребёнка» — с ё, как весь сайт? (да/нет) 2) Точку в конце заголовка оставить? (да/нет) 3) Шрифт — общий вопрос 1.
- **Приёмка:** grep -c 'data-owner-copy-id="precedent-title-v1"' site/index.html site/gambarian-standalone.html → 1/1; grep -c 'data-copy-id="4.5"' site/index.html site/gambarian-standalone.html → 0/0; python -B scripts/verify-client-copy.py exit 0; python -B scripts/verify-client-previews.py exit 0 (без KeyError); python -B scripts/build-review-numbered.py exit 0; Playwright 1440/1280/1200/390: число строк h3.precedent-card__title (было ~3–4 при 32px/432px, ожидаемо 6–7), высота .precedent-card до/после, document.scrollingElement.scrollWidth == clientWidth; при смене начертания: getComputedStyle(h3.precedent-card__title).fontFamily/fontStyle/fontWeight равны целевым и CSS.getPlatformFontsForNode показывает файл сайта, не Georgia; после публикации: curl -s https://final-dev4.gambarian-landing.pages.dev/ | grep -c 'неправомерно перемещ' = 1 и grep -c 'похищенного ребёнка при незарегистрированных родительских правах</h3>' = 0.
- **Примечания:** Номер строки исправлен 46→45 (поправка скептика применена). Поправка «font-gate нерелевантен» принята: qa-browser-matrix.py:296–300 не смотрит .precedent-card__title. Поправка «OWNER_REVIEW_IDS — опционально» ОТВЕРГНУТА: verify-client-previews.py:305–309 делает OWNER_REVIEW_IDS[value] по каждому data-owner-copy-id источника → KeyError; после добавления ключа build-review-numbered.py:272–278 требует бейдж в сборке → код обязателен. Риск: заголовок в 1,8 раза длиннее (139 vs 79 знаков) — карточка вырастет, зона наложения текста на .precedent-photo (styles.css:927–942, замеренный контраст 16,97:1) изменится, на ≤1200px портрет скрыт (styles.css:1418), но карточка вытянется.

### C:G-02 — Прецедент

- **Строки списка:** 46
- **Тип:** текст; **трудоёмкость:** S
- **Вопросы анкеты:** №4
- **Сейчас на сайте:** Александр Гамбарян — автор международного судебного прецедента, связанного с возвращением похищенного ребёнка в ситуации, когда родительские права не были зарегистрированы. Опыт конкретного дела помогает видеть правовые и международные аспекты таких споров. Каждый новый случай оценивается отдельно.
- **Правка владельца:** Правка: «Александр Гамбарян — автор международного судебного прецедента по делу о возвращении похищенного ребёнка в ситуации, когда родительские права не были официально зарегистрированы. Практический опыт ведения такого дела позволяет глубоко оценивать правовые, процессуальные и международные аспекты подобных споров. При этом каждый случай индивидуален и требует отдельного юридического анализа.»
- **Где в коде:**
  - `site/index.html` (433) — .precedent-card__text p[data-copy-id="4.6"]
  - `site/gambarian-standalone.html` (2216) — .precedent-card__text p[data-copy-id="4.6"]
  - `site/styles.css` (970-976) — .precedent-card__text p (16px/1.6, max-width 42ch)
  - `site/gambarian-standalone.html` (1111-1117) — .precedent-card__text p (inline-дубль)
  - `scripts/client_copy_contract.py` (367-386) — OWNER_APPROVED_COPY (+ precedent-body-v1)
  - `scripts/review_numbered_contract.py` (6-9) — OWNER_REVIEW_IDS
  - `scripts/build-review-numbered.py` (180-200) — _add_owner_review_ids
  - `docs/CONTENT-EDIT-PROPOSALS-2026-08-17.md` (67) — строка 4.6 — пометить superseded
- **Контракты и гейты:** data-copy-id="4.6" → data-owner-copy-id="precedent-body-v1", запись в OWNER_APPROVED_COPY, бамп контракта и документы как в G-01; ключ в OWNER_REVIEW_IDS + вставка бейджа обязательны (см. G-01). TYPOGRAPHY-DASHES: набирать «Гамбарян&nbsp;— автор» — счётчик «&nbsp;—» сохраняется (23). В JS/JSON-LD текст не используется. Перекрывает предложение по 4.6 из CONTENT-EDIT-PROPOSALS-2026-08-17.md:67.
- **Приёмка:** grep -c 'Гамбарян&nbsp;— автор международного судебного прецедента по делу о возвращении' site/index.html site/gambarian-standalone.html → 1/1; grep -c 'связанного с возвращением' site/index.html site/gambarian-standalone.html → 0/0; grep -o '&nbsp;—' site/index.html | wc -l не уменьшился из-за этого пункта; python -B scripts/verify-client-copy.py exit 0; Playwright-прогон тире по 57 ширинам 320…1440 на build/variants/final-dev4 (метод docs/TYPOGRAPHY-DASHES.md §6) — 0 случаев тире в начале строки; после публикации: curl -s https://final-dev4.gambarian-landing.pages.dev/ | grep -c 'по делу о возвращении' = 1, grep -c 'связанного с возвращением' = 0.
- **Примечания:** Номер строки исправлен 47→46. Цель live-readback заменена на final-dev4 (поправка скептика). Абзац длиннее на ~70 знаков — при 42ch +1–2 строки; вместе с G-01 карточка заметно выше — замерять совместно.

### C:G-03 — Адвокаты

- **Строки списка:** 50
- **Тип:** удаление; **трудоёмкость:** S
- **Вопросы анкеты:** №22
- **Сейчас на сайте:** Адвокат Александр Гамбарян
- **Правка владельца:** Для заметок: «Строчка сверху - Лишнее, стереть» (h2 секции над карточками, дублирует имя в карточке)
- **Где в коде:**
  - `site/index.html` (446-448) — div.eyebrow.eyebrow--wine → h2.section-title.section-title--ink[data-copy-id="5.6"] → div.rule
  - `site/gambarian-standalone.html` (2229-2231) — тот же блок
  - `site/styles.css` (123-132, 134-142, 146) — .eyebrow (margin-bottom 14px), .section-title (margin 0 0 14px), .rule (margin-bottom 40px)
  - `site/gambarian-standalone.html` (264-273, 275-283, 287) — inline-дубли .eyebrow/.section-title/.rule
  - `site/styles.css` (103-111) — .visually-hidden — вариант скрытого h2 для a11y
  - `docs/CONTENT-SOURCE-MAP.md` (50) — строка «Адвокат | 5.6, …»
  - `docs/CONTENT-APPROVED.md` (85) — строка 5.6 «да»
- **Контракты и гейты:** Удаление клиентского блока 5.6 со страницы контракт не меняет: 5.6 остаётся в allowlist (client_copy_contract.py:294), verify-client-copy ругается только на неизвестные/дублирующиеся id (verify-client-copy.py:404–413), coverage 45/45 не требуется. build-review-numbered: expected_copy_ids читается из site/index.html (build-review-numbered.py:121–126, 257) — самоподстраивается, доп. проверка не нужна. Текст «Адвокат Александр Гамбарян» остаётся в hero, карточке, alt и JSON-LD — они в ALLOWED_OUTSIDE_COPY_TEXT:32 / ALLOWED_TEXT_ATTRIBUTES:97 / ALLOWED_JSON_LD_TEXT:132. Обновить SOURCE-MAP:50 и APPROVED:85 («не используется»).
- **Вопрос из разбора (сведён в анкету):** Золотую черту под надстрочником «Адвокаты» оставить? (да/нет)
- **Приёмка:** grep -c 'data-copy-id="5.6"' site/index.html site/gambarian-standalone.html → 0/0 (после сборки — 0 по 24 файлам verify-client-copy); python -B scripts/verify-client-copy.py exit 0; python -B scripts/build-review-numbered.py exit 0; Playwright 1440/390: расстояние от низа .eyebrow до верха .attorneys-grid одинаково в index и standalone; a11y: document.querySelectorAll('h1,h2,h3') — h3 карточек (457, 477) следуют за h2 «Развод без судебного спора…» (index.html:155), как сегодня h3 прецедента; после публикации: curl -s https://final-dev4.gambarian-landing.pages.dev/ | grep -c 'data-copy-id="5.6"' = 0.
- **Примечания:** Номер строки исправлен 51→50. Риск переформулирован по поправке скептика: h2 на странице есть (index.html:103, 155, 447, 501) — иерархия h1→h3 не возникает, h3 адвокатов окажутся под чужим h2 «Развод без судебного спора…» (как h3 прецедента 432 сегодня). Вариант с визуально скрытым h2 — класс .visually-hidden уже есть (styles.css:103, standalone:244). Строка «проверить build-review-numbered.py:260–271» снята (поправка скептика принята). Секция теряет шаблон «eyebrow+h2+rule», который есть у «30+ лет» и «Консультации».

### C:G-04 — Адвокаты

- **Строки списка:** 51, 59
- **Тип:** типографика; **трудоёмкость:** S
- **Вопросы анкеты:** №1, №2
- **Сейчас на сайте:** Адвокат Александр Гамбарян / Юлия Саакян
- **Правка владельца:** Для заметок: «Поменять шрифт» (имена в обеих карточках адвокатов, строки 51 и 59)
- **Где в коде:**
  - `site/index.html` (457, 477) — h3.attorney-card__name (обе карточки)
  - `site/gambarian-standalone.html` (2240, 2260) — h3.attorney-card__name (обе карточки)
  - `site/styles.css` (1053-1063) — .attorney-card__name (--font-serif, italic, 500, 23px/1.2)
  - `site/gambarian-standalone.html` (1194-1204) — .attorney-card__name (inline-дубль)
  - `site/fonts.css` (28-101) — @font-face: Onest 400–800 variable; Playfair Display 500 italic/normal — других начертаний нет
  - `scripts/build-review-numbered.py` (190-200) — жёсткий поиск '<h3 class="attorney-card__name">Юлия Саакян</h3>' — разметку h3 не менять
  - `docs/GAMBARIAN-DESIGN-RULES.md` (33) — «Playfair для editorial headings» — править при смене семейства
- **Контракты и гейты:** Текст не меняется — copy contract не затронут. Один селектор обслуживает обе карточки, поэтому строки 51 и 59 — одна CSS-правка (в styles.css и inline standalone). В пределах имеющихся ассетов: Playfair 500 normal (снять italic) или Onest 600–800; любой иной вес Playfair = новый woff2 (cyrillic+latin) в site/fonts/, @font-face в site/fonts.css и inline standalone. Менять только CSS-правило, не разметку h3: build-review-numbered.py:191 ищет точную строку h3 Юлии (при yulia-card-v2 строка :190 тоже меняется — см. G-10). Font-gate qa-browser-matrix для этих элементов нерелевантен.
- **Вопрос из разбора (сведён в анкету):** Шрифт — общий вопрос 1.
- **Приёмка:** Playwright 1440 и 390 по каждому h3.attorney-card__name: getComputedStyle → fontFamily/fontStyle/fontWeight равны целевым; document.fonts.check(`${style} ${weight} 23px "${family}"`, 'Адвокат Александр Гамбарян') === true; CSS.getPlatformFontsForNode — 0 системных фолбэков (метод spec «Приёмка», docs/FONT-AND-PHOTO-MEASUREMENTS-2026-09-06.md); python -B scripts/build-review-numbered.py exit 0; кнопки .btn--gold-block обеих карточек на одной высоте (flex:1 у .checklist, styles.css:1077–1085); при новом ассете — файл в site/fonts/ и его загрузка в network-логе.
- **Примечания:** Объединены G-04 и G-09 аналитика (строки 52/60 → 51/59 по поправке скептика): один селектор, одна правка. Поправка скептика о нерелевантности font-gate qa-browser-matrix принята (проверено: fontSamples только hero/svc). Риск: вес без файла → синтезированный bold/фолбэк Georgia, font-gate это не поймает — только замер по элементу.

### C:G-05 — Адвокаты — карточка Александра

- **Строки списка:** 53, 54, 55
- **Тип:** текст; **трудоёмкость:** S
- **Вопросы анкеты:** №4, №6, №19
- **Сейчас на сайте:** Более 30 лет профессионального опыта в юриспруденции. / Автор международного судебного прецедента по возвращению похищенного ребёнка при незарегистрированных родительских правах. / Адвокат Израиля, лицензия № 30178.
- **Правка владельца:** Для заметок (три строки): «Убрать точку»
- **Где в коде:**
  - `site/index.html` (460-466) — ul.checklist карточки 1: li[data-copy-id="5.9"] (461), li[data-copy-id="5.11"] (462), li[data-copy-id="5.13"] (463, «№&nbsp;30178.»), li[data-copy-id="5.15"] (464)
  - `site/gambarian-standalone.html` (2243-2249) — тот же ul.checklist: 5.9 (2244), 5.11 (2245), 5.13 (2246), 5.15 (2247)
  - `scripts/client_copy_contract.py` (295-302, 367-386) — APPROVED_COPY 5.9/5.11/5.13 (остаются), OWNER_APPROVED_COPY (+ alexander-card-v1)
  - `scripts/verify-client-copy.py` (223-231, 415-421) — handle_data пишет во все активные узлы — вложенность поддерживается; каждый узел сверяется отдельно
  - `scripts/review_numbered_contract.py` (6-9) — OWNER_REVIEW_IDS (+ alexander-card-v1)
  - `scripts/build-review-numbered.py` (180-200) — _add_owner_review_ids
- **Контракты и гейты:** Текст без точки ≠ блоки 5.9/5.11/5.13 (сверка побайтовая после normalize). Вместо трёх override — один data-owner-copy-id="alexander-card-v1" на <ul class="checklist"> карточки Александра: CopyHTMLParser добавляет текст во все активные узлы (вложенность работает, как yulia-card-v1), но вложенный data-copy-id всё равно сверяется с APPROVED_COPY отдельно — атрибуты 5.9/5.11/5.13 снять, 5.15 можно оставить вложенным (текст без изменений). Запись в OWNER_APPROVED_COPY = конкатенация пунктов (с учётом G-08: без 5.17), бамп контракта, ключ в OWNER_REVIEW_IDS + бейдж (обязательно, см. G-01), CONTENT-OWNER-EDITS.md, SOURCE-MAP:50, APPROVED:86–88. Та же строка с точкой «Более 30 лет … юриспруденции.» остаётся в 8× .svc-eyebrow (index.html:180…383, ALLOWED_OUTSIDE_COPY_TEXT:40) — группа Услуги; «лицензия № 30178.» — см. G-07.
- **Приёмка:** grep -c 'data-copy-id="5.9"\|data-copy-id="5.11"\|data-copy-id="5.13"' site/index.html site/gambarian-standalone.html → 0/0; grep -c 'data-owner-copy-id="alexander-card-v1"' → 1/1; Playwright: [...document.querySelectorAll('.attorney-card:first-child .checklist li span')].every(s => !s.textContent.trim().endsWith('.')); python -B scripts/verify-client-copy.py exit 0; python -B scripts/verify-client-previews.py exit 0; после публикации: curl -s https://final-dev4.gambarian-landing.pages.dev/ | grep -c 'юриспруденции\.</span></li>' = 0 и grep -c '30178\.</span></li>' = 0 (паттерн с </li> исключает hero и svc-eyebrow).
- **Примечания:** Строки исправлены 54–56 → 53–55. Объединяет G-05/G-06/G-07 аналитика по поправке скептика (один owner-блок на <ul>; вложенность проверена по verify-client-copy.py:223–231). Acceptance «grep 'юриспруденции\.</span>' → 0» отвергнут (9 совпадений: 8× svc-eyebrow + 1) — заменён на паттерн с </li> и Playwright-проверку. Наблюдение: владелец снимает точки у Александра, но добавляет их в двух пунктах Юлии (G-11, G-12) — единообразие вынесено в вопросы там.

### C:G-07 — Адвокаты — карточка Александра (сквозная строка «лицензия № 30178»)

- **Строки списка:** 55
- **Тип:** решение; **трудоёмкость:** S
- **Вопросы анкеты:** №14
- **Сейчас на сайте:** Адвокат Израиля, лицензия № 30178.
- **Правка владельца:** Для заметок: «Убрать точку» — та же правка стоит в строках 11 (hero) и 41 (карточка услуг); JSON-LD владелец не видит
- **Где в коде:**
  - `site/index.html` (135, 195, 224, 253, 282, 311, 340, 369, 398, 463, 593) — hero facts-bar span (135), 8× .svc-media__license, li 5.13 (463), JSON-LD Person.jobTitle (593); подвал 8.9 (569) — другая формулировка без точки
  - `site/gambarian-standalone.html` (1918, 1978…, 2246, 2376) — те же места; JSON-LD jobTitle 2376
  - `scripts/client_copy_contract.py` (35, 133) — ALLOWED_OUTSIDE_COPY_TEXT «…30178.» (hero + svc), ALLOWED_JSON_LD_TEXT «…30178.»
- **Контракты и гейты:** Строка с точкой стоит в 11 местах (не в 3): hero (группа A, строка 11 — тоже «Убрать точку»), 8× svc-media__license (группа B, строка 41 — тоже «Убрать точку»), карточка (эта группа), JSON-LD jobTitle. Если все группы снимают точку, в allowlist добавить «Адвокат Израиля, лицензия № 30178» без точки в ALLOWED_OUTSIDE_COPY_TEXT (hero/svc вне data-copy-id) и решить по JSON-LD: снять точку и в jobTitle + ALLOWED_JSON_LD_TEXT:133 (в JSON-LD без &nbsp; — TYPOGRAPHY-DASHES §3). Иначе на странице останется два написания одной строки. Координация с группами A и B обязательна.
- **Вопрос из разбора (сведён в анкету):** В JSON-LD (jobTitle) точку тоже убрать, чтобы написание было единым? (да/нет)
- **Приёмка:** grep -n '№&nbsp;30178\.' site/index.html site/gambarian-standalone.html → пусто после правок всех групп; grep -c '"jobTitle": "Адвокат Израиля, лицензия № 30178' site/index.html = 1 в выбранном варианте; python -B scripts/verify-client-copy.py exit 0 (включая JSON-LD gate); после публикации: curl -s https://final-dev4.gambarian-landing.pages.dev/ | grep -o 'лицензия №[^<"]*30178[.]\?' | sort | uniq -c — одна форма.
- **Примечания:** Выделено из G-07 аналитика как сквозное решение (сама точка в карточке — в G-05). Поправки скептика применены: JSON-LD место найдено (index.html:593, standalone:2376), 11 мест вместо 3, паттерн «лицензия № 30178» с обычным пробелом ловит только JSON-LD (в HTML «№&nbsp;30178»). Проверено по TSV: строки 11 и 41 тоже «Убрать точку» → страница сходится к варианту без точки; открыт только JSON-LD.

### C:G-08 — Адвокаты — карточка Александра

- **Строки списка:** 57
- **Тип:** удаление; **трудоёмкость:** S
- **Вопросы анкеты:** №13
- **Сейчас на сайте:** Приём — Тель-Авив / онлайн
Карлибах 10
- **Правка владельца:** Для заметок: «Лишнее, стереть»
- **Где в коде:**
  - `site/index.html` (465) — li[data-copy-id="5.17"] (внутри a.map-link aria-label «Открыть адрес в Google Maps: Тель-Авив, Карлибах 10»)
  - `site/gambarian-standalone.html` (2248) — li[data-copy-id="5.17"]
  - `scripts/verify-live-previews.py` (39-40, 82-88) — NBSP_EXPECTED = 23 — после удаления «Приём&nbsp;—» на странице 22
  - `docs/CONTENT-SOURCE-MAP.md` (50) — «Адвокат | … 5.17 …»
  - `docs/CONTENT-APPROVED.md` (90) — строка 5.17 «да»
  - `docs/CONTENT-EDIT-PROPOSALS-2026-08-17.md` (78) — предложение по 5.17 — superseded
- **Контракты и гейты:** Удаление клиентского блока — контракт не меняется (5.17 остаётся в allowlist, client_copy_contract.py:303). Если <ul> получает alexander-card-v1 (G-05), пункт просто не входит в конкатенацию. aria-label остаётся в hero (index.html:143), контактах (515) и футере (564) — из ALLOWED_TEXT_ATTRIBUTES:116 не удалять. build-review-numbered самоподстраивается (см. G-03). ВАЖНО: это единственный пункт группы, меняющий счётчик защищённых тире: «&nbsp;—» 23→22 в site/index.html (review-numbered 22→21) → verify-live-previews.py упадёт на всех alias, пока NBSP_EXPECTED не станет per-alias (установленный факт 1; правка вне группы).
- **Приёмка:** grep -c 'data-copy-id="5.17"' site/index.html site/gambarian-standalone.html → 0/0; grep -c 'class="map-link"' site/index.html = 3 (hero 143, контакты 515, футер 564 — при неизменном hero); awk '/id="attorney"/,/id="contact"/' site/index.html | grep -c 'map-link' → 0; grep -o '&nbsp;—' site/index.html | wc -l = 22 (зафиксировать как новое ожидание для final-dev4); python -B scripts/verify-client-copy.py exit 0; Playwright 1440: .btn--gold-block обеих карточек на одной высоте; после публикации: curl -s https://final-dev4.gambarian-landing.pages.dev/ | awk '/id="attorney"/,/id="contact"/' | grep -c 'Карлибах' = 0.
- **Примечания:** Строка исправлена 58→57. Поправки скептика применены: map-link сейчас 4 (143, 465, 515, 564), после удаления 3; aria-label есть и в hero; «проверить build-review-numbered.py:260–271» снято. Добавлено пропущенное обеими сторонами: удаление 5.17 уменьшает счётчик «&nbsp;—» до 22 — прямой конфликт с verify-live-previews.py:39 (установленный факт 1). Адрес остаётся в контактах и футере (группа D).

### C:G-10 — Адвокаты — карточка Юлии (owner-блок)

- **Строки списка:** 61
- **Тип:** текст; **трудоёмкость:** M
- **Вопросы анкеты:** №4, №19
- **Сейчас на сайте:** Более 17 лет в юриспруденции
- **Правка владельца:** Правка: «Более 17 лет профессионального опыта в юриспруденции»
- **Где в коде:**
  - `site/index.html` (472, 481) — div.attorney-card[data-owner-copy-id="yulia-card-v1"] → ul.checklist li:nth-child(1) span
  - `site/gambarian-standalone.html` (2255, 2264) — тот же контейнер и li:nth-child(1) span
  - `scripts/client_copy_contract.py` (3, 11-12, 372-385, 388-393) — docstring-маркер, CONTRACT_VERSION/DATE, OWNER_APPROVED_COPY['yulia-card-v1'], OWNER_APPROVED_HTML_TOKENS (token data-owner-copy-id)
  - `scripts/review_numbered_contract.py` (6-9) — OWNER_REVIEW_IDS['yulia-card-v1'] → 'yulia-card-v2'
  - `scripts/build-review-numbered.py` (190-200) — yulia_token / OWNER_REVIEW_IDS['yulia-card-v1']
  - `scripts/verify-client-previews.py` (305-309) — OWNER_REVIEW_IDS[value] по data-owner-copy-id источника
  - `scripts/tests/test_verify_client_copy.py` (73-76) — test_owner_approved_yulia_drift_fails — assert 'owner:yulia-card-v1' и мутация «Записаться к Юлии»
  - `docs/CONTENT-OWNER-EDITS.md` (1-45) — v1.0.0 — записи о Юлии нет
  - `docs/CONTENT-SOURCE-MAP.md` (68-83) — блок Юлии (строки 75, 78 устарели)
  - `docs/CONTENT-APPROVED.md` (143-154) — блок Юлии (строки 149, 152 устарели)
  - `docs/TYPOGRAPHY-DASHES.md` (85-91) — таблица Было/Стало v1
- **Контракты и гейты:** Строка входит в конкатенированный owner-блок yulia-card-v1 (client_copy_contract.py:377–385) — любое изменение ломает сверку. Оформить G-10…G-13 одним yulia-card-v2 (один бамп): новый текст в OWNER_APPROVED_COPY (старый ключ удалить — verifier требует присутствия каждого ключа, verify-client-copy.py:404–405), data-owner-copy-id в обоих source, OWNER_APPROVED_HTML_TOKENS:389, OWNER_REVIEW_IDS, build-review-numbered.py:190–199, unittest :73–76 (7-е место — иначе тест ложно проходит/падает после G-13), CONTRACT_VERSION 1.3.0 + docstring. Документы: сначала закрыть долг — запись о решении 2026-08-16 (v1) в CONTENT-OWNER-EDITS.md, затем v2; заменить устаревшие строки в SOURCE-MAP:73–80 и APPROVED:147–154; дописать TYPOGRAPHY-DASHES §5. Тире нет; счётчик «&nbsp;—» не меняется.
- **Приёмка:** grep -rc 'yulia-card-v1' scripts/*.py scripts/tests/*.py site/*.html → 0 везде; grep -c 'yulia-card-v2' scripts/client_copy_contract.py scripts/review_numbered_contract.py scripts/build-review-numbered.py scripts/tests/test_verify_client_copy.py site/index.html site/gambarian-standalone.html → ≥1 в каждом; python -m unittest discover -s scripts/tests -p 'test_verify_client_copy.py' OK; python -B scripts/verify-client-copy.py exit 0, в сводке «owner-approved N block» (N = число ключей OWNER_APPROVED_COPY после правок, ожидаемо 6); python -B scripts/build-review-numbered.py exit 0; после публикации: curl -s https://final-dev4.gambarian-landing.pages.dev/ | grep -c 'Более 17 лет профессионального опыта в юриспруденции' = 1 и grep -c 'Более 17 лет в юриспруденции<' = 0.
- **Примечания:** Строка исправлена 62→61. Поправки скептика применены: сводка печатает только число блоков (verify-client-copy.py:484–489); долг по документам подтверждён (SOURCE-MAP:75,78; APPROVED:149,152; OWNER-EDITS без Юлии). Добавлено пропущенное скептиком: unittest scripts/tests/test_verify_client_copy.py:73–76 жёстко завязан на yulia-card-v1 и строку «Записаться к Юлии»; verify-client-previews.py:305–309 требует ключ yulia-card-v2 в OWNER_REVIEW_IDS.

### C:G-11 — Адвокаты — карточка Юлии (owner-блок)

- **Строки списка:** 62
- **Тип:** решение; **трудоёмкость:** S
- **Вопросы анкеты:** №4, №6, №23
- **Сейчас на сайте:** Высшее юридическое образование с отличием
- **Правка владельца:** Правка: «Высшее юридическое образование, профильные курсы и профессиональная подготовка в Израиле.» Для заметок: «Не уверен, что релевантно. Упоминание об учебе важно, если нет опыта работы»
- **Где в коде:**
  - `site/index.html` (482) — [data-owner-copy-id="yulia-card-v1"] ul.checklist li:nth-child(2) span
  - `site/gambarian-standalone.html` (2265) — тот же li:nth-child(2) span
  - `scripts/client_copy_contract.py` (377-385) — OWNER_APPROVED_COPY['yulia-card-v1'] → v2 (см. G-10)
- **Контракты и гейты:** Входит в yulia-card-v2 (G-10). Новая формулировка содержит фактическое утверждение («профильные курсы и профессиональная подготовка в Израиле»), которого нет ни во frozen-источнике, ни в прежнем owner-блоке — по принципу «утверждённый контент» факт должен подтвердить Юлия/владелец. Если пункт удаляется, li исчезает из конкатенации v2. Точка в конце — единственная в списке Юлии при снятии точек у Александра (G-05).
- **Вопрос из разбора (сведён в анкету):** Вариант: (а) оставить как есть, (б) заменить на новую формулировку, (в) удалить пункт? Если (б): точку в конце оставить? (да/нет)
- **Приёмка:** После решения: grep -c '<выбранная формулировка>' site/index.html site/gambarian-standalone.html → 1/1 (или 0/0 при (в)); python -B scripts/verify-client-copy.py exit 0; после публикации: curl -s https://final-dev4.gambarian-landing.pages.dev/ | grep -c '<выбранная формулировка>' по варианту; при (б) — подтверждение факта зафиксировано в docs/CONTENT-OWNER-EDITS.md.
- **Примечания:** Строка исправлена 63→62. change_type «unclear» аналитика заменён на «decision» (схема). Вопрос сокращён до варианта одной буквой; вопрос про подтверждение факта включён в фиксацию решения в CONTENT-OWNER-EDITS, а не как отдельный.

### C:G-12 — Адвокаты — карточка Юлии (owner-блок)

- **Строки списка:** 64
- **Тип:** текст; **трудоёмкость:** S
- **Вопросы анкеты:** №4, №6
- **Сейчас на сайте:** Миграционное и семейное право Израиля: репатриация, гражданство, статус, семейные споры
- **Правка владельца:** Правка: «Миграционное и семейное право Израиля: репатриация, гражданство, легализация статуса и семейные споры.»
- **Где в коде:**
  - `site/index.html` (484) — [data-owner-copy-id="yulia-card-v1"] ul.checklist li:nth-child(4) span
  - `site/gambarian-standalone.html` (2267) — тот же li:nth-child(4) span
  - `scripts/client_copy_contract.py` (377-385) — OWNER_APPROVED_COPY → yulia-card-v2
  - `docs/TYPOGRAPHY-DASHES.md` (85-91) — таблица Было/Стало — этот пункт уже правился 2026-08-16
- **Контракты и гейты:** Входит в yulia-card-v2 (G-10). Тире нет; FORBIDDEN_COPY в verify-live-previews.py:42–45 («Специализация — миграционное») не затрагивается. Именно этот пункт уже правился владельцем 2026-08-16 (снято «Специализация —») — при бампе дописать таблицу в TYPOGRAPHY-DASHES §5.
- **Вопрос из разбора (сведён в анкету):** Точку в конце пункта оставить? (да/нет)
- **Приёмка:** grep -c 'легализация статуса' site/index.html site/gambarian-standalone.html → 1/1; grep -c 'гражданство, статус, семейные' site/index.html site/gambarian-standalone.html → 0/0; python -B scripts/verify-client-copy.py exit 0; после публикации: curl -s https://final-dev4.gambarian-landing.pages.dev/ | grep -c 'легализация статуса' = 1 и grep -c 'гражданство, статус,' = 0.
- **Примечания:** Строка исправлена 65→64. Вопрос про точку оставлен: в списке Юлии точек нет ни у одного пункта, у Александра точки снимаются — владелец добавляет точку только здесь и в G-11.

### C:G-13 — Адвокаты — карточка Юлии (owner-блок)

- **Строки списка:** 66
- **Тип:** текст; **трудоёмкость:** S
- **Вопросы анкеты:** №4
- **Сейчас на сайте:** Записаться к Юлии
- **Правка владельца:** Правка: «Записаться на консультацию»
- **Где в коде:**
  - `site/index.html` (487) — [data-owner-copy-id="yulia-card-v1"] a.btn--gold-block[href="#contact"]
  - `site/gambarian-standalone.html` (2270) — тот же a.btn--gold-block
  - `scripts/client_copy_contract.py` (384) — хвост конкатенации yulia-card-v1 «…судах Записаться к Юлии»
  - `scripts/tests/test_verify_client_copy.py` (73-76) — тест мутирует «Записаться к Юлии» — обновить вместе с v2
  - `docs/CONTENT-SOURCE-MAP.md` (80) — «Записаться к Юлии»
  - `docs/CONTENT-APPROVED.md` (154) — «Записаться к Юлии»
- **Контракты и гейты:** «Записаться на консультацию» уже в ALLOWED_OUTSIDE_COPY_TEXT:52 и блоках 1.9/7.21, но кнопка стоит внутри owner-контейнера, чей textContent сверяется целиком — это часть yulia-card-v2 (G-10). Обновить SOURCE-MAP:80, APPROVED:154 и unittest :73–76. Обе кнопки ведут на один #contact — поведение не меняется. Обе карточки получают одинаковый CTA.
- **Приёмка:** grep -c 'Записаться к Юлии' site/index.html site/gambarian-standalone.html scripts/client_copy_contract.py scripts/tests/test_verify_client_copy.py docs/CONTENT-SOURCE-MAP.md docs/CONTENT-APPROVED.md → 0 (история допустима только в docs/CONTENT-OWNER-EDITS.md и TYPOGRAPHY-DASHES); grep -c 'class="btn--gold-block" href="#contact">Записаться на консультацию</a>' site/index.html = 2; python -m unittest discover -s scripts/tests -p 'test_verify_client_copy.py' OK; python -B scripts/verify-client-copy.py exit 0; после публикации: curl -s https://final-dev4.gambarian-landing.pages.dev/ | grep -c 'Записаться к Юлии' = 0.
- **Примечания:** Строка исправлена 67→66. Добавлена зависимость от unittest (:73–76), пропущенная и аналитиком, и скептиком.

### C:G-14 — Адвокаты — примечание под карточками

- **Строки списка:** 67
- **Тип:** текст; **трудоёмкость:** S
- **Вопросы анкеты:** №4, №24
- **Сейчас на сайте:** В течение всего процесса, от первой консультации до завершения дела, клиент получает полное сопровождение на русском языке, включающее в себя разъяснение содержания и заполнение подготовленных документов
- **Правка владельца:** Правка: «В течение всего процесса, от первой консультации до завершения дела, клиент получает полное сопровождение, включающее в себя разъяснение содержания и заполнение подготовленных документов». Для заметок: «Сделать равнение на середину, сделать выделение Bold»
- **Где в коде:**
  - `site/index.html` (492) — p.attorneys__note[data-copy-id="5.19"]
  - `site/gambarian-standalone.html` (2275) — p.attorneys__note[data-copy-id="5.19"]
  - `site/styles.css` (1108-1115) — .attorneys__note (margin 32px 0 0; 15px/1.7; --ink-2; max-width 68ch; text-wrap pretty; выравнивание слева, вес 400)
  - `site/gambarian-standalone.html` (1249-1256) — .attorneys__note (inline-дубль)
  - `scripts/client_copy_contract.py` (305-310, 367-386) — APPROVED_COPY 5.19 (остаётся), OWNER_APPROVED_COPY (+ attorneys-note-v1)
  - `scripts/review_numbered_contract.py` (6-9) — OWNER_REVIEW_IDS (+ attorneys-note-v1)
  - `scripts/build-review-numbered.py` (180-200) — _add_owner_review_ids
  - `docs/CONTENT-EDIT-PROPOSALS-2026-08-17.md` (79) — предложение по 5.19 — superseded
- **Контракты и гейты:** Текст: удаление «на русском языке» = формулировка вне allowlist → data-copy-id="5.19" → data-owner-copy-id="attorneys-note-v1", OWNER_APPROVED_COPY, бамп контракта, ключ в OWNER_REVIEW_IDS + бейдж (обязательно, см. G-01), документы (SOURCE-MAP:50, APPROVED:91, OWNER-EDITS); блок 5.19 остаётся в allowlist неиспользуемым. Тире нет. CSS: text-align:center + margin-inline:auto (иначе блок 68ch останется у левого края) в styles.css и inline standalone; bold — Onest variable 400–800 уже загружен (site/fonts.css:28–65), новый ассет не нужен. «На русском языке» остаётся в H1 (1.7) и hero-лиде — группа A.
- **Вопрос из разбора (сведён в анкету):** Bold — весь абзац? (да/нет; если нет — какая фраза)
- **Приёмка:** grep -c 'на русском языке, включающее' site/index.html site/gambarian-standalone.html → 0/0; grep -c 'data-owner-copy-id="attorneys-note-v1"' → 1/1; python -B scripts/verify-client-copy.py exit 0; python -B scripts/verify-client-previews.py exit 0; Playwright 1440 и 390: s = getComputedStyle(document.querySelector('.attorneys__note')); s.textAlign === 'center' && Number(s.fontWeight) >= 600; |rect.left − container.left| == |container.right − rect.right| ± 1px; document.fonts.check(`${s.fontWeight} 15px Onest`) === true; python scripts/qa-browser-matrix.py http://127.0.0.1:8098 --all-previews без overflow; после публикации: curl -s https://final-dev4.gambarian-landing.pages.dev/ | grep -c 'полное сопровождение, включающее' = 1 и grep -c 'сопровождение на русском языке' = 0.
- **Примечания:** Строка исправлена 68→67. Вопрос про мобильное центрирование снят — «равнение на середину» без оговорок применяется на всех viewport. Вес (600/700) — решение дизайна, не владельца. Риск: жирный абзац 15px на 68ch снижает читаемость и спорит по весу с кнопками .btn--gold-block (600) над ним — проверить визуально.

## Группа D. Консультация, форма, подвал (строки 69–92, плюс 94/96)

Ветка codex/final-dev4 (HEAD a29be3b, рабочее дерево чистое) проверена. Все line-refs сверены заново по site/index.html: #contact = 497–551 (h2 7.4 :501, 7.6 :503, ряды Телефон :505–508 / WhatsApp :509–512 / адрес :513–518 с a.map-link :515, форма :520–542 с tel в ошибке :526, form-success :543–548), подвал = 556–571 («Офис» :564, «Связь» :565, 8.9 :569), JSON-LD streetAddress :585. Производный site/gambarian-standalone.html (:2284, :2286, :2298, :2304, :2309, :2328, :2347–2348, :2352, :2368) проверяется verify-client-copy как target source:standalone (:341) — после правки index.html пересобирать build-preview.py --standalone, затем все Preview. ГРУППОВОЕ УСЛОВИЕ (поправка скептика принята): все правки живут в alias final-dev4, final-dev3 не трогается; добавление alias — отдельное контрактное изменение до любого acceptance: строка в scripts/client-preview-map.json (version 2.4.0/2026-08-13 → bump), EXPECTED_PREVIEW_ALIASES 11→12 (scripts/verify-client-copy.py:38, проверка :333), EXPECTED_PREVIEWS + MAP_VERSION/MAP_DATE (scripts/verify-client-previews.py:60–75), «11 клиентских Preview»/«все 11» (.github/workflows/deploy-previews.yml:3, :25), и NBSP_EXPECTED per-alias в scripts/verify-live-previews.py:39–40 — сейчас единственное исключение review-numbered (:82–86); verify-live-previews.py --only final-dev4 возвращает код 2, пока alias не в карте (:154–159). Маркер дизайна: FINAL-DEV3-DESIGN v2.0.2 (site-addons/final-dev3/hero-business-hours.js:1) проверяется по имени в verify-client-previews.py:200–253 — final-dev4 нужен собственный versioned marker/каталог site-addons/final-dev4 (SemVer + дата). Copy contract уже рассинхронизирован (client_copy_contract.py:3 «v1.1.0 | 2026-08-13» vs :11–12 1.2.0/2026-08-16 vs docs/RESUME.md:110 «1.1.0») — любой bump выравнивает все три. Правки текста в группе нет ни одной; строки 76–83, 87 без изменений; 70–74 — no-op с пометкой: предложение по 7.6 из CONTENT-EDIT-PROPOSALS-2026-08-17.md:93 (и 7.4 из :92) владельцем НЕ принято — не применять. Строка 6 (реплика про мэпинг шрифтов) проигнорирована. Общие вопросы ТЗ: №1 (шрифты) и №5 (карта) — не дублируются, на них ссылки. Отброшенные поправки скептика: нет; уточнение к поправке по G-05 — порог для «только на мобиле» действительно 960px (styles.css:1385, action-bar.css:161–166), у подвала (styles.css:1333–1378) @media нет.

Строки без правки/заметки (действий нет): 76, 77, 78, 79, 80, 81, 82, 83, 87.

### D:D-01 — Консультация — заголовок

- **Строки списка:** 69
- **Тип:** типографика; **трудоёмкость:** S
- **Вопросы анкеты:** №1, №2
- **Сейчас на сайте:** Для ознакомительного разговора
- **Правка владельца:** Для заметок: «Поменять шрифт» (текст без правки)
- **Где в коде:**
  - `site/index.html` (501) — h2.section-title[data-copy-id="7.4"]
  - `site/styles.css` (134-142) — .section-title { font-family: var(--font-serif); font-weight: 500; font-size: clamp(26px,3.2vw,40px) } — общий класс всех H2 секций
  - `site/styles.css` (12-13, 17) — :root --font-serif «Playfair Display» / --font-body «Onest» / --font-narrow: var(--font-body)
  - `site/fonts.css` (28-103) — @font-face: Onest normal 400–800 (variable) + Playfair Display 500 normal/italic — других начертаний физически нет
  - `site/index.html` (521) — h3.lead-form__title — тот же текст в карточке формы, Onest 700 19px (site/styles.css:1169-1176)
  - `site/gambarian-standalone.html` (2284) — h2[data-copy-id="7.4"] (производный, пересобрать)
  - `scripts/build-font-variants.py` (249-255) — re.sub по --font-serif/--font-body — шрифт задавать только через токены, не хардкодом в модификаторе
- **Контракты и гейты:** Текст не меняется → copy contract 1.2.0, allowlist 7.4, owner overrides, TYPOGRAPHY-DASHES не затрагиваются; счётчик «&nbsp;—» не меняется. Дизайн-контракт docs/GAMBARIAN-DESIGN-RULES.md 1.0.0: :33 «Playfair для editorial headings; Onest для интерфейса», :42 «не применять автоматически смену шрифтов», :109 смена шрифтов = major. Правка живёт в final-dev4 со своим marker (наследник FINAL-DEV3-DESIGN 2.0.2), final-dev3 не трогается. Любое начертание Playfair ≠ 500 = новые файлы в site/fonts/ + fonts.css + повторный замер «0 фолбэков» (spec:49-50, :84); Onest 400–800 доступен без файлов. Ожидающее предложение 7.4 → «Для первого разговора» (CONTENT-EDIT-PROPOSALS-2026-08-17.md:92) не принято — не применять.
- **Вопрос из разбора (сведён в анкету):** Общий вопрос 1 (семейство vs начертание) закрывает выбор шрифта. Дополнительно: дубль заголовка в карточке формы (h3, Onest 700, index.html:521) менять вместе с H2? (да/нет)
- **Приёмка:** Playwright на build/variants/final-dev4 (360/390/960/961/1440): getComputedStyle(h2[data-copy-id="7.4"]).fontFamily/fontWeight/fontStyle = согласованные значения; document.fonts.check('<weight> 26px "<family>"') === true; CDP CSS.getPlatformFontsForNode для этого узла → 0 системных фолбэков на 1440 и 390 (spec:84); python -B scripts/verify-client-copy.py → PASS (7.4 без изменений); python -B scripts/build-font-variants.py && python -B scripts/verify-client-previews.py → PASS (токены не сломаны); python scripts/qa-browser-matrix.py <local-url> → без horizontal overflow, заголовок не уходит на лишнюю строку на 360px.
- **Примечания:** Поправка скептика (final-dev3 → final-dev4, ссылка на общий вопрос 1 вместо дубля, критерий getPlatformFontsForNode) применена. Where пересверен: styles.css:12-13,17 (не 12-17), fonts.css @font-face начинается с :28. Замер FONT-AND-PHOTO-MEASUREMENTS-2026-09-06.md:39-43 подтверждает: .section-title = Playfair 500, .lead-form__title = Onest.

### D:D-02 — Консультация — ряд адреса

- **Строки списка:** 75
- **Тип:** поведение; **трудоёмкость:** S
- **Вопросы анкеты:** №8
- **Сейчас на сайте:** Приём — Тель-Авив / онлайн ⏎ Карлибах 10
- **Правка владельца:** Для заметок: «При нажатии должна открываться карта с адресом»
- **Где в коде:**
  - `site/index.html` (513-518) — #contact .contact-list > div.contact-list__row (3-й ряд; в отличие от рядов Телефон :505 / WhatsApp :509 это <div>, не <a>)
  - `site/index.html` (515) — a.map-link[href^="https://www.google.com/maps/search/?api=1&query="] target=_blank aria-label="Открыть адрес в Google Maps: Тель-Авив, Карлибах 10" — ссылка на карту УЖЕ есть, только на «Карлибах 10», без data-action
  - `site/styles.css` (58-64, 1138-1159) — a { color: inherit; text-decoration: none }, .contact-list__row/__value; правил .map-link нет (grep = 0) — ссылка визуально неотличима от текста
  - `site/index.html` (143, 564) — тот же паттерн .map-link в hero facts-bar и подвале «Офис» — править согласованно; :465 (5.17) удаляется по строке 57 (группа C), :564 зависит от D-07
  - `docs/TRACKING-REQUIREMENTS.md` (29, 42, 67, 74) — docs требуют data-action="map_click" на .map-link; GTM-триггер по Click URL google.com/maps
  - `docs/CONTACT-LINKS-SPEC.md` (149-152, 176) — «текст ссылки на карту — сам адрес»; утверждение «на каждой контактной ссылке есть data-action» не соответствует коду
  - `site/gambarian-standalone.html` (2298) — производный
- **Контракты и гейты:** Текст не меняется. aria-label уже в ALLOWED_TEXT_ATTRIBUTES (client_copy_contract.py:116) — переиспользовать дословно. Если ряд становится <a>: вложенную a.map-link убрать (a в a невалидно), сохранить «Приём&nbsp;— …» (счётчик тире не меняется). Ставить data-action="map_click" по TRACKING-REQUIREMENTS.md:42; зафиксировать в docs расхождение: data-action есть только на :54, :64, :93, нет на :143, :437, :465, :505, :509, :515, :526, :564, :565 (гейта на data-* нет). Встроенная карта (iframe) = внешний запрос, ломает standalone «0 внешних запросов» — только по общему вопросу 5.
- **Вопрос из разбора (сведён в анкету):** Общий вопрос 5 (ссылка vs встроенная карта). Дополнительно: ссылка на Google Maps на «Карлибах 10» уже стоит — сделать кликабельным весь ряд с иконкой и выделить адрес как ссылку (цвет/подчёркивание)? (да/нет)
- **Приёмка:** Playwright на build/variants/final-dev4 (360/390/960/961/1440): document.querySelector('#contact .contact-list__row:nth-child(3)').tagName === 'A', href начинается с https://www.google.com/maps/search/?api=1&query=, dataset.action === 'map_click'; page.waitForEvent('popup') при клике → URL содержит google.com/maps; getComputedStyle адреса отличается от обычного текста (color или textDecorationLine); document.querySelectorAll('a a').length === 0; те же проверки для :143 (hero); :564 — после D-07, :465 — после строки 57. python -B scripts/verify-client-copy.py → PASS; node scripts/verify-lead-hook.mjs → PASS; qa-browser-matrix без overflow.
- **Примечания:** Поправки скептика применены: data-action обязателен по docs (подтверждено grep: data-action только :54,:64,:93); проверка только выживших экземпляров 143/515 с зависимостью от строк 57 и 96; вопрос про карту — ссылка на общий вопрос 5. Вопрос о написании адреса вынесен в D-03.

### D:D-03 — Кросс-групповое: написание адреса (строка 13 группы A)

- **Строки списка:** 75, 88
- **Тип:** решение; **трудоёмкость:** S
- **Вопросы анкеты:** №4, №5, №13
- **Сейчас на сайте:** Приём — Тель-Авив / онлайн / Карлибах 10 (контакты :515, подвал :564; aria-label; JSON-LD)
- **Правка владельца:** Строка 13 (hero) меняет адрес на «Прием — Тель-Авив / онлайн ⏎ Карлибах, 10» (без ё, с запятой); строки 75 и 88 этой группы оставляют «Приём … Карлибах 10»
- **Где в коде:**
  - `site/index.html` (515, 564) — экземпляры адреса в этой группе; :143 (hero, группа A); :465 (5.17, удаляется по строке 57)
  - `site/index.html` (585) — JSON-LD "streetAddress": "Карлибах 10" (без &nbsp; — сущности в JSON-LD не декодируются)
  - `scripts/client_copy_contract.py` (57, 79, 116, 136, 303) — ALLOWED_OUTSIDE_COPY_TEXT «Карлибах 10» / «Приём — Тель-Авив / онлайн»; ALLOWED_TEXT_ATTRIBUTES aria-label; ALLOWED_JSON_LD_TEXT «Карлибах 10»; клиентский блок 5.17
- **Контракты и гейты:** Если новое написание применяется ко всем экземплярам: новые строки в ALLOWED_OUTSIDE_COPY_TEXT (:57, :79), ALLOWED_TEXT_ATTRIBUTES (:116), ALLOWED_JSON_LD_TEXT (:136) + bump copy contract с синхронизацией трёх маркеров (client_copy_contract.py:3 и :11-12, docs/RESUME.md:110) + запись в docs/CONTENT-OWNER-EDITS.md; клиентский блок 5.17 остаётся «Приём … Карлибах 10» (frozen). «Прием» без ё — на одной странице будет два написания, если применять только к hero. Тире «Прием&nbsp;— …» сохраняется → счётчик «&nbsp;—» не меняется.
- **Вопрос из разбора (сведён в анкету):** Новое написание «Прием — Тель-Авив / онлайн / Карлибах, 10» применять ко всем экземплярам адреса (контакты, подвал, aria-label, JSON-LD), а не только к hero? (да/нет)
- **Приёмка:** grep -c 'Карлибах, 10' site/index.html → число выживших экземпляров (2–3 по решениям D-07/строки 57) и grep -c 'Карлибах&nbsp;10' → 0 при варианте «да»; python -B scripts/verify-client-copy.py → PASS с обновлённым контрактом; python -B scripts/verify-client-previews.py → PASS.
- **Примечания:** Пропущенный скептиком пункт (missed_items 3) добавлен как отдельное решение; входит в тему общего вопроса 3 (правки = owner override), но требует своего ответа «ко всем/только hero».

### D:D-04 — Консультация — лид-абзац и ряды Телефон/WhatsApp

- **Строки списка:** 70, 71, 72, 73, 74
- **Тип:** текст; **трудоёмкость:** S
- **Вопросы анкеты:** нет
- **Сейчас на сайте:** Оставьте свои контактные данные — специалист офиса свяжется с вами … / ТЕЛЕФОН / Позвонить: 054-549-0623 / WHATSAPP / Написать в WhatsApp
- **Правка владельца:** Правок нет (колонки пусты); no-op с пометкой
- **Где в коде:**
  - `site/index.html` (503) — p.contact__lead[data-copy-id="7.6"] (содержит «данные&nbsp;—», 1 из 23 защищённых тире)
  - `site/index.html` (505-508, 509-512) — a.contact-list__row[href="tel:+972545490623"], a.contact-list__row[href="https://wa.me/972545490623"] — без data-action
  - `docs/CONTENT-EDIT-PROPOSALS-2026-08-17.md` (93) — предложение по 7.6 («Оставьте контакты — …») — владельцем не принято
  - `site/gambarian-standalone.html` (2286, 2288-2296) — производный
- **Контракты и гейты:** Нет изменений: 7.6 в клиентском allowlist, «Позвонить: 054-549-0623» / «Написать в WhatsApp» в ALLOWED_OUTSIDE_COPY_TEXT (:75, :64). Предложение CONTENT-EDIT-PROPOSALS:93 по 7.6 НЕ применять (текст оставлен без правки). Ряд Телефон (:505) участвует в D-05 (режим «закрыто»).
- **Приёмка:** No-op: python -B scripts/verify-client-copy.py → PASS без изменений 7.6; grep -c '&nbsp;—' site/index.html не меняется этим пунктом.
- **Примечания:** Добавлен по missed_items 1. Поправка скептика к бывшему G-03 принята: константы ALLOWED_DYNAMIC_UI_TEXT в site/lead-contract.js нет — она в scripts/client_copy_contract.py:143 и проверяется verify-client-copy.py:56-61 (DYNAMIC_UI_PATHS), :318; lead-contract.js = Lead schema 2.0.0, не copy contract. Сам G-03 (строки 76–83) как пункт снят: правок/заметок нет, строки ушли в rows_without_change; его tel-точка :526 перенесена в D-05.

### D:D-05 — Общая заметка 94 применительно к группе: звонок в нерабочее время

- **Строки списка:** 72, 73, 90, 91, 94
- **Тип:** поведение; **трудоёмкость:** M
- **Вопросы анкеты:** №9, №25
- **Сейчас на сайте:** Позвонить: 054-549-0623 (контакты :505, подвал :565) + «Если ошибка повторяется, позвоните: 054-549-0623» (ошибка формы :526, вне списка)
- **Правка владельца:** «Удостовериться, что в нерабочее время пропадает возможность звонить. На данный момент эта опция пропадает только в первой секции» (строка 94); spec:86 — «в закрытом состоянии ни одного tel: в кликабельных элементах на всей странице»
- **Где в коде:**
  - `site/index.html` (505-508) — a.contact-list__row[href^="tel:"]
  - `site/index.html` (526) — span.lead-form__error-contact > a[href^="tel:"] (показывается при ошибке доставки)
  - `site/index.html` (565) — footer .site-footer__cols > div:nth-child(2) a.nowrap-token[href^="tel:"] (исчезает при D-07)
  - `site-addons/action-bar/action-bar.js` (32-35, 121-127) — BUSINESS_STATES.closed.phoneVisible=false — скрывает только phone Action Bar; data-business-state на .mobile-bar
  - `site-addons/final-dev3/hero-business-hours.js` (9-14) — адаптер читает состояние с bar и трогает только .hero--final-dev1 .hero__call--expanded — образец для нового адаптера
  - `scripts/verify-client-copy.py` (56-61) — DYNAMIC_UI_PATHS — новый JS-адаптер с кириллицей добавить сюда
- **Контракты и гейты:** Новый адаптер для final-dev4 (site-addons/final-dev4/*, свой versioned marker SemVer+дата) по образцу hero-business-hours.js; Action Bar 2.4.0 не менять (состояние уже вычисляется там). Тексты замены уже в allowlist: «Написать в WhatsApp» (ALLOWED_OUTSIDE_COPY_TEXT:64, ALLOWED_DYNAMIC_UI_TEXT:159), «WhatsApp» (:29), «054-549-0623» (:27) — новых строк не нужно, если не вводить новые формулировки. Новый JS-файл добавить в DYNAMIC_UI_PATHS (verify-client-copy.py:56-61). Desktop: Action Bar скрыт (action-bar.css:22, показ только ≤960px :161-166), но data-business-state на .mobile-bar ставится независимо от видимости — проверить, что адаптер работает и на 1440. Счётчик «&nbsp;—» не меняется.
- **Вопрос из разбора (сведён в анкету):** В состоянии «закрыто» ряд «Телефон» в контактах и подвале: скрыть или заменить на WhatsApp (как в hero)? (скрыть/заменить)
- **Приёмка:** Playwright на build/variants/final-dev4 (360/390/960/961/1440) с принудительным closed-состоянием (тот же механизм, что qa-browser-matrix для final-dev3, scripts/qa-browser-matrix.py:36-38): document.querySelectorAll('a[href^="tel:"]:not([hidden])').length === 0 с учётом видимости (offsetParent !== null) — включая :526 после вызова ошибки доставки (мок fetch → 5xx); в open-состоянии все tel-ссылки на месте; python -B scripts/verify-client-copy.py → PASS (адаптер в DYNAMIC_UI_PATHS); python -B scripts/verify-client-previews.py → PASS; node scripts/verify-lead-hook.mjs → PASS.
- **Примечания:** Добавлен по missed_items 2; поправка скептика о :526 принята (в group_notes аналитика была только nav-call/contact-list/подвал). Подтверждено кодом: action-bar.js скрывает только phoneAction, hero-business-hours.js — только hero. nav-call (:54) и drawer (:64) — вне группы (шапка).

### D:D-06 — Форма — состояние «Заявка получена»

- **Строки списка:** 84, 85, 86
- **Тип:** текст; **трудоёмкость:** S
- **Вопросы анкеты:** нет
- **Сейчас на сайте:** Заявка получена / Оставьте свои контактные данные — специалист офиса свяжется с вами … / Отправить ещё одну заявку
- **Правка владельца:** Правок нет; наблюдение исполнителя: после отправки абзац повторяет призыв «Оставьте свои контактные данные…» (дословный повтор 7.6)
- **Где в коде:**
  - `site/index.html` (543-548) — div.form-success[role=status][hidden]: .form-success__title, p, button.form-success__again
  - `site/app.js` (547-559, 590-597) — показ блока после submitLead, фокус на .form-success__title; кнопка «ещё одну заявку»
  - `site/styles.css` (1304-1310) — .form-success__title — Playfair Display 500 italic 26px (физически есть)
  - `scripts/client_copy_contract.py` (54, 66, 67) — «Заявка получена», повтор 7.6, «Отправить ещё одну заявку» — SYSTEM-UI в ALLOWED_OUTSIDE_COPY_TEXT
- **Контракты и гейты:** Сейчас нет изменений. Любая новая формулировка абзаца после отправки = новая строка ALLOWED_OUTSIDE_COPY_TEXT + bump copy contract (три маркера синхронно) + запись в docs/CONTENT-OWNER-EDITS.md. Абзац содержит «данные&nbsp;—» (1 из 23 тире) — замена текста без тире сдвинет NBSP_EXPECTED. Наблюдение занести новой строкой в docs/CONTENT-EDIT-PROPOSALS (следующая версия) с пометкой «SYSTEM-UI вне data-copy-id, повтор 7.6» — в текущей версии записи нет (grep 'Заявка получена|form-success' → 0).
- **Приёмка:** No-op: node scripts/verify-lead-hook.mjs → PASS; python -B scripts/verify-client-copy.py → PASS; запись предложения присутствует в docs/CONTENT-EDIT-PROPOSALS-*.md (grep -c 'Заявка получена' → 1).
- **Примечания:** Поправка скептика принята: вопрос владельцу снят (строки без правки, двух прочтений нет) — это предложение, которое по правилам проекта ложится в docs, а не в блокирующий вопрос. Line-refs app.js уточнены по текущему дереву (:551 success.hidden=false, :555 title, :594 hidden=true).

### D:D-07 — Подвал — колонки «Офис»/«Связь»

- **Строки списка:** 88, 89, 90, 91, 96
- **Тип:** удаление; **трудоёмкость:** S
- **Вопросы анкеты:** №26
- **Сейчас на сайте:** ОФИС / Карлибах 10 / Приём — Тель-Авив / онлайн / СВЯЗЬ / Позвонить: 054-549-0623 / Написать в WhatsApp
- **Правка владельца:** МОБАЙЛ (строка 96): «Связь (в последней секции) — убрать дублирование»; строки 88–91 сами без правки
- **Где в коде:**
  - `site/index.html` (563-566) — footer.site-footer .site-footer__cols > div:nth-child(1) («Офис»: span.site-footer__label + a.map-link + «Приём&nbsp;— Тель-Авив / онлайн») и div:nth-child(2) («Связь»: a[href="tel:+972545490623"] + a[href="https://wa.me/972545490623"])
  - `site/index.html` (504-518) — #contact .contact-list — источник дублирования, стоит непосредственно над подвалом
  - `site/styles.css` (1350-1367) — .site-footer__cols / .site-footer__label / .site-footer__cols a — @media-правил для подвала нет (весь блок :1333-1378 вне медиа)
  - `site/styles.css` (1385) — @media (max-width: 960px) — порог навигации/Action Bar (action-bar.css:161-166), к нему привязывать «только на мобиле»
  - `scripts/verify-live-previews.py` (39-40, 82-89) — NBSP_EXPECTED = 23 / 22 — «Приём&nbsp;— …» в :564 входит в 23
  - `site/gambarian-standalone.html` (2347-2348) — производный
- **Контракты и гейты:** Удаление текста allowlist не ломает («Офис» :65, «Связь» :86, «Позвонить: 054-549-0623» :75, «Написать в WhatsApp» :64 могут остаться в ALLOWED_OUTSIDE_COPY_TEXT — это allowlist, не coverage); bump copy contract не обязателен; docs/CONTENT-EXTRA.md править не нужно (записей «Связь»/«Офис» там нет). Client 45 блоков, owner overrides, 8.9, JSON-LD (telephone/hasMap) не затрагиваются. Вариант «обе колонки» убирает «Приём&nbsp;— …» из :564 → на живой странице 22 тире вместо 23: NBSP_EXPECTED должен стать per-alias для final-dev4 (verify-live-previews.py:39-40, :82-86), иначе live readback FAIL; если правка в общем site/, падают все alias (и review-numbered 22→21). Вариант «только ≤960px» = CSS display:none, DOM остаётся → тире и tel в DOM остаются (для D-05 «закрыто» считать по видимости). Удаление tel из подвала частично закрывает D-05. GTM contact_click по URL — меньше точек клика, схема не меняется.
- **Вопрос из разбора (сведён в анкету):** Убрать из подвала только «Связь» или обе колонки «Офис» и «Связь»? (Связь/обе). На всех ширинах или только ≤960px? (все/мобайл)
- **Приёмка:** grep -c 'site-footer__label">Связь' site/index.html → 0 (и «Офис» при варианте «обе»); python -B scripts/verify-client-copy.py → PASS; python -B scripts/build-hero-variants.py && python -B scripts/build-font-variants.py && python -B scripts/build-action-bar.py && python -B scripts/build-review-numbered.py && python -B scripts/verify-client-previews.py → PASS; Playwright на build/variants/final-dev4 (360/390/960/961/1440): [...document.querySelectorAll('footer a[href^="tel:"]')].filter(a => a.offsetParent !== null).length === 0; замер footer.getBoundingClientRect().height до/после; qa-browser-matrix без overflow; после деплоя: python -B scripts/verify-live-previews.py --only final-dev4 → PASS (с NBSP per-alias) и curl -s https://final-dev4.gambarian-landing.pages.dev/ | grep -c 'site-footer__label">Связь' → 0.
- **Примечания:** Поправки скептика применены: verify-live-surface.py в репо нет (только scripts/ репо digitalhook-os- (недоступно здесь)), цель final-dev4; порог 860 → 960 (подтверждено: у подвала @media нет, 860 — hero/CTA :495/:1429, 960 — навигация :1385 и Action Bar); учёт NBSP_EXPECTED и синхронизации трёх маркеров контракта при bump.

### D:D-08 — Подвал — юридическая строка 8.9

- **Строки списка:** 92
- **Тип:** раскладка; **трудоёмкость:** S
- **Вопросы анкеты:** №27
- **Сейчас на сайте:** Информация на странице носит ознакомительный характер и не является юридической консультацией. Возможные действия и результат зависят от обстоятельств конкретного дела. © 2026 Адвокат Александр Гамбарян. Лицензия № 30178
- **Правка владельца:** «Эту строчку снести отдельной строкой: ⏎ ⏎ © 2026 Адвокат Александр Гамбарян. Лицензия № 30178»
- **Где в коде:**
  - `site/index.html` (569) — p.site-footer__legal[data-copy-id="8.9"] — единый абзац, в разметке «Лицензия №&nbsp;30178»
  - `site/styles.css` (1373-1378) — .site-footer__legal { margin:0; font-size:12px; line-height:1.6; color: rgba(255,255,255,.4) }
  - `scripts/verify-client-copy.py` (64, 154, 412, 421) — normalize_text; CopyNode.text = normalize_text("".join(chunks)); data-copy-id ровно 1 раз; textContent узла сравнивается с 8.9 целиком
  - `scripts/client_copy_contract.py` (356-362) — 8.9 — обязательный клиентский блок целиком, включая «© 2026 … Лицензия № 30178»
  - `scripts/build-review-numbered.py` (74-83, 99) — .page--review-numbered [data-copy-id]::before — inline-flex бейдж на элементе с data-copy-id
  - `site/gambarian-standalone.html` (2352) — производный
- **Контракты и гейты:** Текст не меняется → 8.9, copy contract не трогаются; тире в блоке нет, счётчик «&nbsp;—» не меняется; сохранить «№&nbsp;30178». Ограничение верификатора: 8.9 остаётся ОДНИМ узлом data-copy-id с полным textContent. Предпочтительно <br> внутри того же <p> с пробелом/переводом строки перед «©» («дела. <br>©» или «дела.<br>\n©») — иначе chunks склеятся в «дела.©» ≠ 8.9 и verify-client-copy FAIL. Обёртка <div data-copy-id="8.9"> с двумя <p> допустима, но бейдж review-numbered (inline-flex ::before) встанет отдельной строкой над текстом — визуальная проверка. НЕЛЬЗЯ два элемента с отдельными data-copy-id или «©…» вне data-copy-id. CONTENT-EDIT-PROPOSALS:99 по 8.9 = «оставить как есть» — не конфликтует. OPEN A5 (контраст alpha .4) — отдельное решение.
- **Вопрос из разбора (сведён в анкету):** «Снести отдельной строкой» = вынести «© 2026 … Лицензия № 30178» на отдельную строку, текст сохраняется? (да/нет). Строка той же величины и цвета или выделить? (так же/выделить)
- **Приёмка:** grep -c 'data-copy-id="8.9"' site/index.html → 1; python -B scripts/verify-client-copy.py → PASS (8.9 совпадает после нормализации); python -B scripts/build-review-numbered.py && python -B scripts/verify-client-previews.py → PASS (один бейдж 8.9); Playwright на build/variants/final-dev4 (360/390/768/1440): Range по «©» и Range по «дела.» дают разные getBoundingClientRect().top; «Лицензия № 30178» на одной строке на 360px (обеспечено &nbsp;); qa-browser-matrix без overflow; после деплоя python -B scripts/verify-live-previews.py --only final-dev4 → PASS и curl -s https://final-dev4.gambarian-landing.pages.dev/ | grep -c 'data-copy-id="8.9"' → 1.
- **Примечания:** Поправки скептика применены: оговорка про пробел перед <br>© (verify-client-copy.py:154 склеивает chunks), поведение бейджа review-numbered (inline-flex :74-83), live-гейт final-dev4 вместо отсутствующего verify-live-surface.py, вопрос-закрепление прочтения «снести» = «вынести».

## Группа E. Общие заметки (строка 94)

Группа «Общие заметки» (TSV строки 93–94, шапка = 0) + 13 пометок «Поменять шрифт» (строки 2, 15, 18, 20, 23, 26, 28, 31, 36, 45, 51, 59, 69; в черновике ТЗ :41 и :59 ошибочно «14»). Ветка рабочего дерева — codex/final-dev4, подтверждено. Все 7 пунктов меняют общий источник site/ (styles.css, fonts.css, index.html) и/или site-addons — при пересборке затронут все 11 Preview из client-preview-map.json; спец требует не трогать final-dev3 → для final-dev4 нужен отдельный скоуп (новая строка в client-preview-map.json + вариант в builder), иначе нарушается правило RESUME:78 «живое важнее нового». Текст ни один пункт группы не меняет → Client Copy 1.2.0 и TYPOGRAPHY-DASHES не затрагиваются, но любой правкой ломается live readback (NBSP_EXPECTED=23 в verify-live-previews.py:39) только если меняется число «&nbsp;—» — типографика/раскладка его не меняют, поэтому verify-live-previews.py --only final-dev4 остаётся применимым гейтом для этой группы. Поправки скептика применены все, кроме двух уточнений: (1) метод замера шрифтов в docs/FONT-AND-PHOTO-MEASUREMENTS-2026-09-06.md:7 описан (CDP CSS.getPlatformFontsForNode), но committed-скрипта нет — критерий переформулирован на qa-browser-matrix.py + новый скрипт; (2) решение «Action Bar — единственный источник расписания» стоит в docs/FINAL-QA-CHECKLIST.md:944–947, а не 941–944. Дополнительно установлено: build-review-numbered.py:121–127,257–271 сравнивает data-copy-id с site/index.html, а не с контрактом, поэтому удаление вкладки его не ломает; qa-browser-matrix.py:122 жёстко ждёт («Playfair Display», «Onest») для всех Preview — смена пары без правки runner = FAIL. Строка 6 (заметка про «мэпинг шрифтов») по инструкции проигнорирована; строка 93 — заголовок «Общие заметки» без правки.

Строки без правки/заметки (действий нет): 6, 93.

### E:G-01 — Общие заметки — шрифты (весь сайт)

- **Строки списка:** 94
- **Тип:** типографика; **трудоёмкость:** L
- **Вопросы анкеты:** №1
- **Сейчас на сайте:** Сейчас две гарнитуры: --font-serif "Playfair Display" (только 500 normal + 500 italic, 4 woff2), --font-body "Onest" (переменный 400–800, 4 woff2); --font-narrow = var(--font-body) (псевдоним, отдельного узкого шрифта нет). Реально используемые веса Onest (site/styles.css): 400 body(:52); 500 .nav-links(:230), .svc-tab(:731), .hero__call-label ≤860(:529); 600 .eyebrow(:126), .btn--wine(:163), .btn--outline(:174), .logo__sub(:216), .hero__call-label(:482), .fact-card__unit/__sub(:596,:603,:652), .facts-bar strong(:689), .svc-tab.is-active(:740), .svc-eyebrow(:783), .svc-card__cta(:814), .svc-media__label(:835), .precedent-card__eyebrow(:954), .btn--ghost-lg(:1007), .attorney-card__role(:1068), .btn--gold-block(:1101), .contact-list__label/__value(:1154,:1159), .field__label(:1217), .form-success__again(:1322), .site-footer__label(:1361), 2.10 sub mobile(:1592); 650 .field__error(:1252); 700 .nav-call__num(:262), .nav-drawer__call(:311), .hero__call-num(:489), .btn--gold-lg(:994), .lead-form__title(:1172), .lead-form__error a(:1202), .lead-form__submit(:1269); 800 .logo__word(:204). Playfair: только 500 (:138, :429, :587, :638, :793, :853, :963, :1057, :1307, :1583). Замер 2026-09-06: 0 элементов с фолбэком, Onest ≈89–90% глифов, Playfair ≈10–11%.
- **Правка владельца:** Выбрать 2 шрифта. В распределении текста по иерархии использовать варианты этих 2-х шрифтов - bold, light и т.д.
- **Где в коде:**
  - `site/styles.css` (12–17) — :root --font-serif / --font-body / --font-narrow
  - `site/fonts.css` (28–104) — 8 блоков @font-face: Onest 400 800 ×4 subsets (:28–64), Playfair Display italic 500 ×2 (:68–84), normal 500 ×2 (:88–104)
  - `site/fonts/` (—) — 8 woff2: onest-normal-400-800-{cyrillic-ext,cyrillic,latin-ext,latin}, playfair-display-{italic,normal}-500-{cyrillic,latin}
  - `site/index.html` (34–36) — <link rel=preload> onest-…cyrillic и playfair-…normal-500-cyrillic; <link rel=stylesheet href=fonts.css>
  - `site/gambarian-standalone.html` (63–142, 153–158) — дубликат @font-face (src = data:font/woff2;base64) и токенов; производный файл — build-preview.py --standalone (docs/DEPLOY.md:220–229), проверяется verify-client-copy.py:341 как source:standalone
  - `site/styles.css` (134–142, 425–435, 585–592, 633–640, 789–799, 850–856, 959–969, 1053–1063, 1304–1311, 1578–1587) — все потребители --font-serif: .section-title, .hero__title, .fact-card__num, [data-copy-id="2.10"] num/unit (desktop+mobile), .svc-title, .svc-media__name, .precedent-card__title, .attorney-card__name, .form-success__title
  - `site-addons/action-bar/action-bar.css` (58, 105) — .mobile-bar__item, .mobile-bar-demo — font-family: var(--font-narrow)
  - `scripts/qa-browser-matrix.py` (62, 122–128, 222–262, 966–1003) — RUNNER_VERSION 1.4.1; EXPECTED_FONTS = ("Playfair Display","Onest") для всех Preview кроме v2–v4; platform_font_metrics: 4 роли .hero__title/.svc-title/.hero__lede/.hero .btn через CDP CSS.getPlatformFontsForNode; failures platform-font-fallback / not-custom / expected-family
  - `docs/GAMBARIAN-DESIGN-RULES.md` (33, 109) — «Playfair Display для editorial headings; Onest для интерфейса»; смена шрифтов = major
  - `.claude/skills/gambarian-landing-design/SKILL.md` (24–27) — Locked decisions: Preserve Playfair Display + Onest
  - `docs/FINAL-QA-CHECKLIST.md` (933–934) — OWNER 2026-08-11: для final-dev3 выбраны Playfair Display + Onest
  - `docs/RESUME.md` (102–104) — «…Hero assets/crop и Playfair/Onest сохраняются»
  - `docs/FONT-AND-PHOTO-MEASUREMENTS-2026-09-06.md` (7, 9–35) — метод CDP CSS.getPlatformFontsForNode; таблица объявленных начертаний; вывод «0 фолбэков»
- **Контракты и гейты:** Client Copy 1.2.0 (allowlist 45 блоков, owner overrides) и TYPOGRAPHY-DASHES — НЕ затрагиваются (текст не меняется). ACTION-BAR-SPEC 2.4.0: панель наследует --font-narrow; если меняется только токен в styles.css:17 — версия не бампится; если правится action-bar.css:58/:105 — новый SemVer+дата синхронно в action-bar.html/css/js:1, scripts/action_bar_addon.py:20–21, client-preview-map.json action_bar_version/updated. Смена ПАРЫ = major по GAMBARIAN-DESIGN-RULES:109, отмена locked decision SKILL.md:26 и решения владельца FINAL-QA-CHECKLIST:933–934, RESUME:103; ОБЯЗАТЕЛЬНО правка scripts/qa-browser-matrix.py: EXPECTED_FONTS (:122–128) + RUNNER_VERSION (:62) — иначе FAIL platform-font/expected-family на всех alias (:986–1003); font-variants v1–v4 (build-font-variants.py) строятся подменой семейств из site/ — перепроверить. Добавление начертаний той же пары runner не ломает, но требует новых woff2 в site/fonts/ + @font-face в fonts.css + дубликат в gambarian-standalone.html (пересборка): сейчас Playfair загружен ТОЛЬКО 500 — объявленный в CSS bold/light без файла = молчаливый faux-bold/фолбэк, критерий «0 фолбэков» упадёт. Onest 400–800 доступен без новых файлов; light 300 в файле нет. Затрагивает все 11 Preview при пересборке → нужен скоуп final-dev4.
- **Вопрос из разбора (сведён в анкету):** Пара шрифтов: оставить Playfair Display + Onest и добавить начертания (ответ «оставить»), или заменить (назвать две гарнитуры)? Если «оставить» — какие веса Playfair докупить: 400 / 700 / оба; нужен ли italic (да/нет)? Общий вопрос 1 ТЗ покрывает семейство — здесь нужен только список весов.
- **Приёмка:** 1) `ls site/fonts/` содержит файл для каждого объявленного начертания; `grep -E 'font-family|font-style|font-weight|unicode-range' site/fonts.css` и тот же grep по site/gambarian-standalone.html дают идентичные выборки (diff нормализованных дескрипторов пуст; сами src отличаются url vs data:). 2) `python scripts/qa-browser-matrix.py <url final-dev4>` PASS без platform-font-fallback / platform-font-not-custom / expected-family (после правки EXPECTED_FONTS/RUNNER_VERSION, если пара сменилась). 3) Новый committed-скрипт (scripts/measure-fonts.py или расширение platform_font_metrics) по методу docs/FONT-AND-PHOTO-MEASUREMENTS-2026-09-06.md:7 (CDP CSS.getPlatformFontsForNode): на 1440 и 390 — 0 элементов с системным фолбэком и для каждого объявленного веса/стиля ≥1 элемент отрисован именно этим файлом (postScriptName совпадает, нет faux-bold); таблица в docs/ с ## Related. 4) Таблица «уровень иерархии → семейство/вес/размер» в docs/ совпадает с computed style селекторов из where. 5) `python -B scripts/verify-client-copy.py` PASS. 6) `python -B scripts/verify-live-previews.py --only final-dev4` PASS (счётчик 23 «&nbsp;—» не меняется типографикой).
- **Примечания:** Применены поправки скептика: (а) contract_impact — EXPECTED_FONTS жёстко задан, проверено qa-browser-matrix.py:122–128, :986–1003; (б) acceptance п.1 — diff fonts.css vs standalone никогда не пуст (src url vs data:), заменён на сравнение дескрипторов; (в) source_text — полная карта весов по grep font-weight site/styles.css, все строки скептика подтверждены; (г) where — решение владельца в FINAL-QA-CHECKLIST.md:933–934, а не 936–937. Поправка (д) про «метод замера не описан в документе» принята частично: метод описан в docs/FONT-AND-PHOTO-MEASUREMENTS-2026-09-06.md:7 (CDP CSS.getPlatformFontsForNode, подсчёт глифов), но committed-скрипта нет и qa-browser-matrix покрывает 4 роли — критерий переписан на runner + новый скрипт. Добавлены where: docs/RESUME.md:102–104 (вместо :95), SKILL.md:24–27, DESIGN-RULES:33/109.

### E:G-02 — Заголовки с пометкой «Поменять шрифт» (Hero, Семейное право, Прецедент, Адвокаты, Консультация)

- **Строки списка:** 2, 15, 18, 20, 23, 26, 28, 31, 36, 45, 51, 59, 69
- **Тип:** типографика; **трудоёмкость:** M
- **Вопросы анкеты:** №1, №2
- **Сейчас на сайте:** 13 элементов, все Playfair Display 500: normal — h1 «Развод в Израиле? Адвокат по семейному праву — на русском языке» (index.html:76), h2 услуг «Развод без судебного спора и бракоразводные процессы» (:155), h2 контактов «Для ознакомительного разговора» (:501); italic — 7 из 8 h3.svc-title (:182 3.7, :211 3.12, :240 3.17, :269 3.22, :298 3.27, :327 3.32, :385 3.42; 3.37 «Брачный договор» :356 без пометки), h3.precedent-card__title (:432, 4.5), h3.attorney-card__name «Адвокат Александр Гамбарян» (:457) и «Юлия Саакян» (:477). Без пометки остаются 6 Playfair-элементов: h2.section-title фактов (:103, группа A просит убрать), h2.section-title 5.6 (:447, TSV 51 «стереть»), .fact-card__num (styles:585), [2.10] num/unit (:633, :1578), .svc-media__name (:850), .form-success__title (:1304).
- **Правка владельца:** Поменять шрифт (колонка «Для заметок», 13 строк: 2, 15, 18, 20, 23, 26, 28, 31, 36, 45, 51, 59, 69)
- **Где в коде:**
  - `site/index.html` (76) — h1.hero__title[data-copy-id="1.7"] → styles.css:425–435 (Playfair 500 normal)
  - `site/index.html` (155) — h2.section-title.section-title--narrow в .services__head → styles.css:134–142 (Playfair 500 normal)
  - `site/index.html` (182, 211, 240, 269, 298, 327, 385) — h3.svc-title data-copy-id 3.7, 3.12, 3.17, 3.22, 3.27, 3.32, 3.42 → styles.css:789–799 (Playfair 500 italic); :356 (3.37) без пометки
  - `site/index.html` (432) — h3.precedent-card__title[data-copy-id="4.5"] → styles.css:959–969 (Playfair 500 italic)
  - `site/index.html` (457, 477) — h3.attorney-card__name ×2 → styles.css:1053–1063 (Playfair 500 italic)
  - `site/index.html` (501) — h2.section-title[data-copy-id="7.4"] → styles.css:134–142
  - `site/index.html` (103, 447) — h2.section-title без пометки: факты (TSV 8 «Убрать заголовок»), 5.6 (TSV 51 «стереть») — судьба решается в группах A/C
  - `site/styles.css` (585–592, 633–640, 850–856, 1304–1311, 1578–1587) — Playfair-элементы без пометки: .fact-card__num, [2.10] num/unit, .svc-media__name, .form-success__title
  - `site/fonts.css` (68–84) — @font-face Playfair Display italic 500 ×2 — если italic снимается, блоки и файлы site/fonts/playfair-display-italic-500-*.woff2 можно убрать; preload index.html:34–35 italic не содержит
  - `scripts/qa-browser-matrix.py` (233, 990–991) — роль "italic" = .svc-title; ожидается семейство expected_fonts[0] — при смене семейства заголовков править
- **Контракты и гейты:** Текст не меняется → Client Copy allowlist/owner overrides не затрагиваются (новые формулировки в тех же строках 15, 18, 26, 45 — предмет групп B/C, там owner override). TYPOGRAPHY-DASHES, Action Bar — нет. Зависит от G-01: если семейство остаётся — правка только font-style/font-weight в 5 правилах styles.css (:134–142, :425–435, :789–799, :959–969, :1053–1063) + пересборка gambarian-standalone.html; если italic снимается — fonts.css:68–84, standalone-дубликат, 2 woff2; index.html:34–35 (preload) НЕ меняется. Если семейство заголовков меняется — qa-browser-matrix.py EXPECTED_FONTS (:122) и роли title/italic (:990–991). Затрагивает GAMBARIAN-DESIGN-RULES:33 и эталонные скриншоты docs/design-references/.
- **Вопрос из разбора (сведён в анкету):** «Поменять шрифт» на этих 13 заголовках — это (а) другое семейство, (б) убрать курсив (10 из 13 — italic), или (в) только вес/размер? Ответить буквой. И менять ли заодно 4–6 Playfair-элементов без пометки (.fact-card__num, число в 2.10, «Ведёт → Адвокат Александр Гамбарян», «Заявка получена») — да/нет.
- **Приёмка:** 1) Playwright-таблица до/после в docs/: для каждого из 13 селекторов computed font-family/font-style/font-weight на 1440 и 390 равны целевой схеме из G-01. 2) `python scripts/qa-browser-matrix.py <url>` PASS: роли title/italic без platform-font-fallback/faux (qa-browser-matrix.py:966–1003) и без overflow/клиппинга .svc-title, .precedent-card__title на 360/390/960/961/1440. 3) `git diff site/styles.css` затрагивает только перечисленные правила; `python -B scripts/verify-client-copy.py` PASS. 4) Скриншоты 1440/390 обновлены в docs/design-references/ с датой. 5) `python -B scripts/verify-live-previews.py --only final-dev4` PASS.
- **Примечания:** Применены поправки скептика: номера строк TSV пересчитаны с шапкой = 0 (2, 15, 18, 20, 23, 26, 28, 31, 36, 45, 51, 59, 69 — совпадает с № в docs/CONTENT-OWNER-REVISIONS-2026-09-06.md:14–81); добавлены h2.section-title index.html:103 и :447 (проверено); утверждение о preload при снятии italic исправлено — index.html:34–35 прелоадит только Onest cyrillic и Playfair normal-500 cyrillic. Все line-ranges в styles.css перепроверены по рабочему дереву. Добавлен where qa-browser-matrix.py роль italic=.svc-title.

### E:G-03 — Общие заметки — телефон в нерабочее время (шапка, меню, Hero, Консультация, форма, подвал, Action Bar)

- **Строки списка:** 94
- **Тип:** поведение; **трудоёмкость:** M
- **Вопросы анкеты:** №9, №25
- **Сейчас на сайте:** Кликабельные tel: в site/index.html: .nav-call:54 (в final-dev1/dev3 вырезается builder-ом build-hero-variants.py:57,:168–170; в site/ и остальных 9 Preview остаётся), .nav-drawer__call:64 «Позвонить 054-549-0623», .hero__call:93 «Позвонить: 054-549-0623», .contact-list__row:505 «Позвонить: 054-549-0623», .lead-form__error-contact a:526 «позвоните: 054-549-0623» (виден только при ошибке формы), footer a:565 «Позвонить: 054-549-0623», Action Bar [data-business-action=phone]. В нерабочее время скрываются ТОЛЬКО: элемент панели (action-bar.js:124 phoneAction.hidden) и Hero final-dev1/dev3 (hero-business-hours.js:45–67 подменяет .hero__call--expanded на «Написать в WhatsApp»). Расписание: Asia/Jerusalem, вс–чт 09:00–17:59 (action-bar.js:26–31); состояние — только атрибут bar[data-business-state] (:118–135), demo-переключатель [data-business-demo].
- **Правка владельца:** Удостовериться, что в нерабочее время пропадает возможность звонить. На данный момент, эта опция пропадает только в первой секции
- **Где в коде:**
  - `site-addons/action-bar/action-bar.js` (26–35, 118–135) — BUSINESS_HOURS, BUSINESS_STATES, syncBusinessState() → bar[data-business-state], phoneAction.hidden
  - `site-addons/final-dev3/hero-business-hours.js` (8–10, 45–91) — адаптер только для .hero--final-dev1 .hero__call--expanded; MutationObserver на data-business-state; renderClosed/renderOpen с восстановлением originalMarkup
  - `site/index.html` (54) — a.nav-call[href="tel:+972545490623"] (desktop-шапка; в dev1/dev3 удалён builder-ом, в site/ остаётся) — не покрыт
  - `site/index.html` (64) — a.nav-drawer__call[href="tel:…"] (мобильное меню) — не покрыт
  - `site/index.html` (505–508) — a.contact-list__row[href="tel:…"] «Телефон / Позвонить: 054-549-0623» — не покрыт
  - `site/index.html` (526) — .lead-form__error-contact a[href="tel:…"] — не покрыт
  - `site/index.html` (565) — footer a.nowrap-token[href="tel:…"] — не покрыт
  - `site/index.html` (573–603) — JSON-LD "telephone" — не кликабельно, не трогать
  - `scripts/final_dev3_contract.py` (8–10, 23–35, 56–60) — VERSION 2.0.2 / DATE 2026-08-13; HERO_BUSINESS_SCRIPT, ACTION_BAR_SCRIPT_TAG, ACTION_BAR_TOP_VISIBILITY_TOKENS; apply_script_contract «ожидает ровно один action-bar.js»
  - `scripts/build-hero-variants.py` (57, 168–170, 440–459) — NAV_CALL вырезание; verify(): required_script_tokens адаптера и forbidden (setTimeout/setInterval/DateTimeFormat/…) → «не должен иметь второй источник состояния»
  - `scripts/qa-browser-matrix.py` (318–358, 824–840, 1018–1022) — businessSnapshot только Hero (href/target/aria-label/иконка); action-bar visibleItemCount open=3/closed=2
  - `docs/FINAL-QA-CHECKLIST.md` (944–947) — OWNER 2026-08-11: Action Bar (тогда 2.3.1) — единственный источник расписания/state/timer; demo-switch синхронизирует Hero и панель
  - `scripts/client_copy_contract.py` (22–93, 143–160) — ALLOWED_OUTSIDE_COPY_TEXT («Позвонить: 054-549-0623», «054-549-0623», «Написать в WhatsApp»…), ALLOWED_DYNAMIC_UI_TEXT
- **Контракты и гейты:** ACTION-BAR-SPEC 2.4.0 → новый SemVer+дата синхронно в action-bar.html/css/js:1, scripts/action_bar_addon.py:20–21, client-preview-map.json action_bar_version/updated — если логика расширяется внутри панели; ИЛИ обобщённый адаптер (наследник hero-business-hours.js для dev4) с новой версией FINAL-DEV3/DEV4-DESIGN (final_dev3_contract.py:8–10) и правкой verify в build-hero-variants.py:440–459 — расширение обязано остаться observer-ом на data-business-state без своего таймера/часов (forbidden tokens). Client Copy: если подмена использует уже разрешённые строки («Написать в WhatsApp», «WhatsApp», «Позвонить: 054-549-0623») — без изменений; любая новая подпись («офис закрыт», часы работы) = ALLOWED_DYNAMIC_UI_TEXT + CONTRACT_VERSION/DATE (и синхронизация docstring :3, который уже расходится с :11–12). Пересечение с группой D («Связь — убрать дублирование»): в closed в contact-list и футере останутся два WhatsApp подряд; подсказка ошибки формы (:526) в closed оставит осиротевшее «или напишите в WhatsApp». JSON-LD telephone и &nbsp; там — не трогать. Скоуп: правило в site/ попадёт на боевой при следующем production-деплое (включая .nav-call:54).
- **Вопрос из разбора (сведён в анкету):** Скрывать телефонные строки полностью или оставлять номер некликабельным текстом (ответ: «скрыть» / «текст»)? И куда вносить правило — в общий site/ (попадёт на боевой при следующем деплое) или только в final-dev4 (ответ: «site» / «dev4»)?
- **Приёмка:** 1) Playwright на 390 и 1440, оба состояния через [data-business-demo] (без правки часов): при .mobile-bar[data-business-state="closed"] число видимых a[href^="tel:"] (не hidden, display≠none, включая открытый #nav-drawer и показанный .lead-form__error) = 0; при open — те же элементы присутствуют с href=tel:+972545490623. 2) closed→open→closed возвращает исходную разметку (innerHTML/атрибуты равны исходным, как hero-business-hours.js:69–76). 3) `python scripts/qa-browser-matrix.py <url>` PASS с расширенным businessSnapshot (:318–358, :824–840); action-bar visibleItemCount open=3/closed=2 (:1018–1022) не регрессирует. 4) `python -B scripts/build-hero-variants.py` verify без «второй источник состояния»; `grep -rn "ACTION-BAR-SPEC v" site-addons/action-bar scripts/action_bar_addon.py` даёт одну версию/дату. 5) `python -B scripts/verify-client-copy.py` PASS. 6) `python -B scripts/verify-live-previews.py --only final-dev4` PASS.
- **Примечания:** Применены поправки скептика: final_dev3_contract.py — константы :23–35, apply_script_contract :56–60 (проверено; :22 = CSS_MARKER_SNIPPET, :38 = apply_html_contract); добавлен вопрос о скоупе site/ vs dev4 (index.html:54 .nav-call и build-hero-variants.py:57,:168–170 подтверждены). Поправка по FINAL-QA-CHECKLIST исправлена ещё раз: решение «единственный источник» стоит в строках 944–947 (grep «единственный источник» → :946), а не 941–944 (там LIVE-запись о deployment); замечание про Action Bar 2.3.1 (сейчас 2.4.0 по action_bar_addon.py:20–21) верно. verify() в build-hero-variants.py начинается на :324, dev3-проверка адаптера — :440–459 (в разборе было 426–458).

### E:G-04 — Общие заметки — вертикальные отступы между и внутри секций (весь сайт)

- **Строки списка:** 94
- **Тип:** раскладка; **трудоёмкость:** M
- **Вопросы анкеты:** №10, №28
- **Сейчас на сайте:** Отступы desktop 1440 / mobile 390 из CSS: hero .hero__body padding clamp(72,8vw,96)=96 / 56 (styles:412), ≤860 — 14/26 (:1446); final-dev1/dev3 ≥961 — clamp(48,5vw,68)/26 (build-hero-variants.py:187–190), короткий mobile ≥600 — 4 сверху (:242); .hero min-height clamp(560px,84vh,880px) (:326). facts/services/attorneys/contact — .section-pad = --section-pad clamp(56px,8vw,96px) (:40, :121) = 96/56; .rule margin-bottom 40 (:146), .facts .rule 24 на ≤860 (:1547); .services__head margin-bottom 34 (:695–702), .svc-tabs margin-bottom 26 (:721–726); precedent: .precedent__container padding-block 0 clamp(48,7vw,80) (:900), .precedent-card margin-top clamp(120,13vw,192)=187 (:903) → ≤1200 clamp(40,6vw,64) (:1425) — резерв под абсолютный .precedent-photo высотой clamp(360,40vw,520) (:927–935), скрытый ≤1200 (:1418); .attorneys__note margin-top 32 (:1108); footer .site-footer__inner 44/28 (:1337–1341), __top margin-bottom 32 (:1342–1348), __divider margin-bottom 20 (:1368–1371); ≤960 body padding-bottom = --mobile-bar-h 60 + safe-area (action-bar.css:163–171). Самые большие пустоты: services→precedent на desktop 96+187=283px, precedent→attorneys 80+96=176px; footer 44 vs секции 96.
- **Правка владельца:** Пройтись по границам секций - сократить лишние и пустые места (сверху, снизу, посередине секции.
- **Где в коде:**
  - `site/styles.css` (40, 121) — :root --section-pad: clamp(56px, 8vw, 96px); .section-pad { padding-block }
  - `site/styles.css` (323–329, 406–413, 1446) — .hero min-height clamp(560px,84vh,880px); .hero__body padding clamp(72px,8vw,96px) … 56px; ≤860: 14px … 26px
  - `scripts/build-hero-variants.py` (176–192, 238–256) — FINAL-DEV1-HERO CSS: .hero--final-dev1 .hero__body padding-top clamp(48px,5vw,68px)/bottom 26px; short-mobile padding-top 4px, hero-photo max-height calc(100vh − 472px)
  - `scripts/final_dev1_contract.py` (8–10) — VERSION 2.0.0 / DATE 2026-08-11 / MARKER FINAL-DEV1-HERO
  - `site/styles.css` (146–148, 1547) — .rule margin-bottom 40 / --tight 22 / --flush 0; .facts .rule 24 на ≤860
  - `site/styles.css` (900–903, 1417–1426) — .precedent__container padding-block 0 clamp(48px,7vw,80px); .precedent-card margin-top clamp(120px,13vw,192px) → ≤1200 clamp(40px,6vw,64px), .precedent-photo display:none
  - `site/styles.css` (927–943) — .precedent-photo absolute, height clamp(360px,40vw,520px), z-index 1 — причина верхнего резерва
  - `site/styles.css` (695–702, 721–726) — .services__head margin-bottom 34; .svc-tabs margin-bottom 26
  - `site/styles.css` (1108–1115) — .attorneys__note margin: 32px 0 0
  - `site/styles.css` (1337–1348, 1368–1371) — .site-footer__inner padding 44 … 28; __top margin-bottom 32; __divider margin-bottom 20
  - `site-addons/action-bar/action-bar.css` (161–176) — ≤960: scroll-padding-bottom/body padding-bottom = --mobile-bar-h + safe-area (намеренно, под панель)
  - `docs/FINAL-QA-CHECKLIST.md` (884, 927) — известный дефект «Пустой чёрный промежуток на mobile» (резерв под скрытый портрет); C6 OPEN «Нижний отступ precedent через --section-pad»
- **Контракты и гейты:** Client Copy / owner overrides / TYPOGRAPHY-DASHES — нет. ACTION-BAR-SPEC — только если трогать --mobile-bar-h/padding-bottom (не требуется). FINAL-DEV1-HERO 2.0.0 (hero-паддинги живут в builder-CSS build-hero-variants.py:176–256): правка = новые VERSION/DATE в final_dev1_contract.py:8–10 + маркеры в hero/styles (verify :361–365); гейт «обе CTA в первом экране 390×740 / 360×600 / 360×668» (qa-browser-matrix short-mobile) должен остаться PASS. Закрывает C6 (FINAL-QA-CHECKLIST:927). Правка --section-pad затрагивает все 11 Preview и font-variants (их снимок «межблочные отступы не меняются» устареет); эталонные скриншоты docs/design-references/facts-dark-*-v1.0.0.png устареют. Связано с группой A (удаление h2 фактов index.html:103 меняет верх секции фактов, TSV 8 «сократить белое поле до границ кубиков»).
- **Вопрос из разбора (сведён в анкету):** Целевого числа нет. Три решения: (а) можно ли уменьшить резерв 187px над карточкой прецедента на desktop (он под выступающий вверх портрет; уменьшение = портрет меньше/ниже или наезжает на секцию услуг) — да/нет; (б) считать ли низ Hero на высоких экранах (min-height 84vh) пустотой — убрать min-height да/нет; (в) единый межсекционный интервал в px (сейчас 96 desktop / 56 mobile).
- **Приёмка:** 1) Committed Playwright-скрипт замера (scripts/measure-section-gaps.py): для каждой пары соседних `main > section`/footer на 1440×900, 1440×1200 и 390×740 — расстояние между нижней границей последнего контентного бокса секции N и верхней границей первого бокса секции N+1, плюс край секции → первый/последний контент; таблица до/после в docs/ с ## Related; после правки ни один интервал не превышает значение из вопроса (в) более чем на 4px, кроме задокументированных исключений (портрет прецедента, панель). 2) `python scripts/qa-browser-matrix.py <url>` PASS на 360×600, 360×668, 390×724, 390×740, 960, 961, 1440 — Hero CTA в первом экране, overflow 0. 3) `python -B scripts/build-hero-variants.py` verify PASS (маркеры FINAL-DEV1/DEV3 согласованы). 4) Скриншоты 1440/390 в docs/design-references/, C6 → PASS в FINAL-QA-CHECKLIST. 5) `python -B scripts/verify-live-previews.py --only final-dev4` PASS.
- **Примечания:** Поправок скептика по пункту не было. Все line-ranges перепроверены по рабочему дереву: .hero :323–329 (min-height :326), .hero__body :406–413, ≤860 :1446, .precedent__container :900, .precedent-card :902–915, ≤1200 :1417–1426, .precedent-photo :927–943, .attorneys__note :1108–1115, footer :1337–1348/:1368–1371, action-bar.css :161–176. Добавлен where scripts/final_dev1_contract.py:8–10 (VERSION 2.0.0, дата 2026-08-11) — при правке hero-паддингов бампится именно он.

### E:G-05 — Общие заметки — одинаковые внутренние отступы секций (facts, services, precedent, attorneys, contact; hero и footer — исключения)

- **Строки списка:** 94
- **Тип:** раскладка; **трудоёмкость:** S
- **Вопросы анкеты:** №28
- **Сейчас на сайте:** Единый токен есть: --section-pad clamp(56px,8vw,96px) (styles:40) применяется через .container.section-pad (:121) к facts (index.html:101), services (:151), attorneys (:445), contact (:498 — вместе с .contact__grid). Исключения: hero (.hero__body 96/56, :412; ≤860 14/26, :1446; dev1/dev3 68/26 из builder), precedent (index.html:423 .precedent__container без .section-pad: padding-block 0 clamp(48,7vw,80) :900 + .precedent-card margin-top 187 desktop / 40–64 ≤1200, :903/:1425), footer (.site-footer__inner 44/28, :1340). На mobile переопределения токена нет → 56/56 везде, где применён.
- **Правка владельца:** Удостовериться, что отступы в секциях одинаковы
- **Где в коде:**
  - `site/styles.css` (40, 121) — :root --section-pad; .section-pad { padding-block: var(--section-pad) }
  - `site/index.html` (101, 151, 445, 498) — div.container.section-pad в facts / services / attorneys / contact(.contact__grid)
  - `site/index.html` (423) — div.container.precedent__container — единственная контентная секция без .section-pad
  - `site/styles.css` (900, 903, 1425) — .precedent__container padding-block 0 …; .precedent-card margin-top desktop / ≤1200
  - `site/styles.css` (412, 1446) — .hero__body padding (desktop / ≤860)
  - `scripts/build-hero-variants.py` (187–190, 242) — .hero--final-dev1 .hero__body padding-top/bottom (FINAL-DEV1-HERO)
  - `site/styles.css` (1337–1341) — .site-footer__inner padding 44px … 28px
  - `docs/FINAL-QA-CHECKLIST.md` (927) — C6 OPEN — тот же дефект (precedent через --section-pad)
  - `docs/SCREEN-COMPOSITION.md` (—) — описание композиции экранов — обновить после унификации
- **Контракты и гейты:** Client Copy / owner overrides / TYPOGRAPHY-DASHES / Action Bar — нет. FINAL-DEV1-HERO (final_dev1_contract.py:8–10) — только если hero включают в «одинаковые» (паддинги hero живут в builder-CSS). Закрывает C6. Обновить docs/SCREEN-COMPOSITION.md и эталонные скриншоты; gambarian-standalone.html пересобирается. Правка общего токена меняет все 11 Preview → скоуп final-dev4.
- **Вопрос из разбора (сведён в анкету):** «Одинаковы» — только контентные секции (факты, услуги, прецедент, адвокаты, консультация) или включая Hero и подвал (подвал намеренно компактнее 44/28)? Ответ: «контент» / «все».
- **Приёмка:** 1) Playwright (тот же скрипт, что в G-04): для каждой `main > section` computed padding-top/-bottom контейнера (или сумма padding+margin первого/последнего ребёнка) на 1440 и 390 = --section-pad (96/56) ±1px; список исключений явно перечислен и согласован. 2) `grep -n "section-pad\|precedent__container" site/index.html site/styles.css` показывает, что precedent использует тот же токен (или формулу от него). 3) `python scripts/qa-browser-matrix.py <url>` PASS без overflow; C6 → PASS в FINAL-QA-CHECKLIST. 4) `python -B scripts/verify-client-copy.py` PASS. 5) `python -B scripts/verify-live-previews.py --only final-dev4` PASS.
- **Примечания:** Поправок скептика не было. Строки проверены: index.html:101/151/423/445/498, styles.css:40/121/412/900/903/1425/1446/1337–1341. Добавлен where build-hero-variants.py:187–190,242 — на dev1/dev3 hero-паддинги переопределены builder-ом, поэтому «одинаковость» hero надо мерить на собранном варианте, а не на site/.

### E:G-06 — Семейное право (#services) — порядок/состав вкладок

- **Строки списка:** 94
- **Тип:** решение; **трудоёмкость:** S
- **Вопросы анкеты:** №15
- **Сейчас на сайте:** Порядок вкладок сейчас (site/index.html:165–172): Развод, Алименты, Дети, Отцовство, Раздел имущества, Медиация, Брачный договор, Защита при угрозах — 8 штук; панели svc-panel-1…8 в том же порядке (:175–404; «Раздел имущества» = svc-panel-5 :291/3.27, «Защита при угрозах» = svc-panel-8 :378/3.42–3.44 с предупреждением об экстренных службах в 3.43); точки .svc-dot ×8 с aria-label по темам (:407–416). app.js:131–135: если число .svc-tab ≠ .svc-card ≠ .svc-dot — логика вкладок молча отключается.
- **Правка владельца:** 2-ая секция: Развод, алименты, раздел имущества, дети, отцовство, медиация, брачный договор
- **Где в коде:**
  - `site/index.html` (164–173) — .svc-tabs button.svc-tab#svc-tab-1…8 (aria-controls=svc-panel-N)
  - `site/index.html` (175–404) — .svc-card#svc-panel-1…8 (aria-labelledby=svc-tab-N); svc-panel-5 :291 (3.27), svc-panel-8 :378 (3.42)
  - `site/index.html` (407–416) — .svc-dots > button.svc-dot ×8 (aria-label = тема)
  - `site/app.js` (131–139, 171, 188) — tabs/dots/panels по DOM-порядку; guard :135 tabs.length === panels.length === dots.length
  - `scripts/client_copy_contract.py` (22–93, 274–277) — ALLOWED_OUTSIDE_COPY_TEXT содержит подписи вкладок; блоки 3.42–3.44 «Защита при угрозах и насилии»
  - `scripts/build-review-numbered.py` (121–127, 257–271) — expected data-copy-id берётся из site/index.html (не из контракта) — удаление панели сборку не ломает, лишь бы ids ⊆ APPROVED_COPY
  - `docs/CONTENT-OWNER-EDITS.md` (—) — фиксация решения владельца об удалении/переносе клиентского блока
- **Контракты и гейты:** Только перестановка: Client Copy, owner overrides, TYPOGRAPHY-DASHES, Action Bar — не затрагиваются; data-copy-id остаются при своих панелях. Если «Защита при угрозах» удаляется: блоки 3.42–3.44 перестают использоваться (допустимо — coverage 45/45 не требуется, verify-client-copy это разрешает; build-review-numbered сравнивает с site/index.html, не сломается), но это снятие утверждённого клиентом контента, включая предупреждение об экстренных службах (3.43) → фиксация в docs/CONTENT-OWNER-EDITS.md. Обязательно синхронно переставить/удалить tab + panel + dot (app.js:135). Пересекается с группами B (окно тем одной высоты, стрелки) и F (свайп, другой формат меню на мобильном).
- **Вопрос из разбора (сведён в анкету):** Владелец перечисляет 7 тем в новом порядке без «Защита при угрозах»: вкладку удалить или оставить последней (ответ: «удалить» / «оставить»)? И подтвердить, что «2-ая секция» (общие заметки) и «Третья секция» (МОБАЙЛ) — одна секция «Семейное право» (да/нет).
- **Приёмка:** 1) `grep -o 'class="svc-tab[^>]*>[^<]*' site/index.html` выдаёт подписи в порядке: Развод, Алименты, Раздел имущества, Дети, Отцовство, Медиация, Брачный договор [, Защита при угрозах — по ответу]; тот же порядок у id svc-panel-N (aria-controls = aria-labelledby) и у aria-label .svc-dot. 2) Playwright: количество .svc-tab = .svc-card = .svc-dot; клик по каждой вкладке, стрелкам prev/next и клавиши ←/→/Home/End переключают нужную панель (aria-selected/hidden). 3) `python -B scripts/verify-client-copy.py` PASS; `python -B scripts/build-review-numbered.py` собирается. 4) `python scripts/qa-browser-matrix.py <url>` PASS. 5) `python -B scripts/verify-live-previews.py --only final-dev4` PASS.
- **Примечания:** Поправок скептика не было. change_type «unclear» из разбора заменён на «decision» (схема). Уточнено по коду: build-review-numbered.py:121–127 берёт ожидаемые data-copy-id из site/index.html, поэтому опасение «сборка нумерованного варианта сломается при удалении вкладки» снято; ограничение — только ids ⊆ APPROVED_COPY. Строки проверены: index.html:164–173/175–404/407–416, app.js:131–139.

### E:G-07 — Адвокаты (#attorney) — фото Александра и Юлии

- **Строки списка:** 94
- **Тип:** ассет; **трудоёмкость:** M
- **Вопросы анкеты:** №3
- **Сейчас на сайте:** Карточки (site/index.html:451–489): оба <img class="attorney-photo"> width=1122 height=1402, окно aspect-ratio 4/5, object-fit cover, object-position center top (styles:1031–1044); ≤860 — 16/15 (:1508) и для первой карточки object-position center 16% (:1513). Замер 2026-09-06: верх головы на 1440 — Александр 75px (10.7%), Юлия 30px (4.3%); на 390 — 38px (12.9%) и 20px (6.8%); в исходных файлах карточек 8.8% vs 4.2% — разница зашита в кадрировании, мобильная компенсация 16% недокручена (~16px из ~34). Исходники docs/source-photos/: alexander-portrait.jpg 2794×4284 (верх головы 9.0% — запас есть), yulia-portrait.jpg 1122×1402 (верх головы 1.3% — почти без запаса, = размер карточки 1:1). alexander-card-v2-* появились в коммите 9d99539 (2026-08-10) без скрипта; в site/assets/manifest.json записи card-v2 нет (только старый alexander-card 2100×2200 :86, alexander-avatar :120, yulia-card); README перечисляет только hero-пайплайн (grade-hero-photo.py, extend-hero-canvas.py).
- **Правка владельца:** Фотки Гамбаряна и Юли - либо сделать их одинаковыми. Либо изменить иерархию на странице.
- **Где в коде:**
  - `site/index.html` (452–454) — picture > source/img.attorney-photo (assets/alexander-card-v2-{480,760,1100}w.*, sizes (max-width:787px) calc(100vw − 76px), 534px)
  - `site/index.html` (471–474) — .attorney-card[data-owner-copy-id="yulia-card-v1"] > picture > img.attorney-photo.attorney-photo--yulia (assets/yulia-card-*); orphan-класс — QA C2
  - `site/styles.css` (1017–1021, 1031–1044) — .attorneys-grid auto-fit minmax(min(380px,100%),1fr) — равные колонки; .attorney-photo 4/5, cover, center top
  - `site/styles.css` (1505–1513) — ≤860: .attorney-photo 16/15 (решение владельца 2026-08-10 «ниже на четверть»); .attorney-card:first-child .attorney-photo object-position center 16%
  - `docs/source-photos/README.md` (14–15, 30+) — alexander-portrait.jpg 2794×4284; yulia-portrait.jpg 1122×1402; раздел «Пайплайн» — только hero-скрипты
  - `site/assets/manifest.json` (86–119) — alexander-card (старый 2100×2200), alexander-avatar; записи alexander-card-v2 НЕТ
  - `docs/FONT-AND-PHOTO-MEASUREMENTS-2026-09-06.md` (47–67) — метод замера верха головы (порог 90, полоса 30–70%, 4 строки), таблица, рекомендация перекадрировать исходники
  - `docs/design-references/` (—) — attorney-head-top-2026-09-06-{desktop,mobile}-{0,1}-*marked.png — эталон замера
  - `scripts/deploy-pages.sh` (63) — readback ожидает подстроку alexander-card-v2 (и deploy-pages.ps1:101) — при смене имени файла обновить
  - `scripts/tests/test_verify_client_copy.py` (98) — фикстура src=assets/alexander-card-v2-760w.681730d0.jpg
  - `docs/RESUME.md` (102–104) — «Hero assets/crop и Playfair/Onest сохраняются» — заморожен Hero, карточки адвокатов отдельно не заморожены
- **Контракты и гейты:** Client Copy / owner overrides / TYPOGRAPHY-DASHES / Action Bar — нет (alt-тексты не меняются). Затрагивает: «approved photos» в SKILL.md:26 и RESUME:103 (заморожен Hero crop; карточки отдельно не заморожены, но «фото ниже на четверть» — решение владельца 2026-08-10, styles.css:1505–1508); manifest.json (добавить записи новых ассетов — card-v2 там и так отсутствует); readback deploy-pages.sh:63 / deploy-pages.ps1:101; scripts/tests/test_verify_client_copy.py:98; srcset/sizes в index.html и data-URI-дубликат в gambarian-standalone.html (пересборка). Вариант «изменить иерархию» (Александр крупнее/первый, Юлия меньшая карточка) меняет .attorneys-grid и пересекается с группой C («Записаться к Юлии» → «Записаться на консультацию», удаление h2 5.6). Общий вопрос 2 ТЗ (высота 698 → ?, пропорция 4/5) — здесь не дублируется.
- **Вопрос из разбора (сведён в анкету):** Какой вариант: «одинаковые» (выровнять верх головы перекадрированием — реалистично за счёт Александра: у Юлии исходник без запаса) или «иерархия» (Александр главный, Юлия меньше)? Ответить одним словом.
- **Приёмка:** 1) Тот же замер, что в docs/FONT-AND-PHOTO-MEASUREMENTS-2026-09-06.md:47 (Playwright-скриншот img при скрытой шапке, порог 90, 4 строки подряд, полоса 30–70%), оформленный committed-скриптом: разница верха головы Александр vs Юлия ≤3px на 1440 и 390; помеченные кадры в docs/design-references/ с датой. 2) Новые ассеты в site/assets/ с hash-именами, записью в manifest.json, srcset/sizes в index.html; документированный скрипт кадрирования карточек в scripts/ и docs/source-photos/README.md; `python scripts/build-preview.py site/gambarian-standalone.html --standalone` пересобран. 3) `python -B scripts/verify-client-copy.py` PASS; `python -m pytest scripts/tests/test_verify_client_copy.py` PASS (фикстура обновлена). 4) Если «иерархия»: computed ширина карточек на 1440 по согласованной пропорции; на 390 карточки в колонку без overflow. 5) `python scripts/qa-browser-matrix.py <url>` PASS на 360/390/787/788/960/961/1440. 6) `bash scripts/deploy-pages.sh`/ps1 readback-подстрока обновлена; `python -B scripts/verify-live-previews.py --only final-dev4` PASS.
- **Примечания:** Применены поправки скептика: RESUME — ссылка исправлена на :102–104 (фраза «Hero assets/crop и Playfair/Onest сохраняются» в :103; :95 — про блок Юлии и fact-900-v1); source_text дополнен происхождением alexander-card-v2 (git log -S → 9d99539, 2026-08-10) и наличием исходников; README таблица — строки 14–15. Числа из установленных фактов (верх головы в исходниках: Александр 9.0%, Юлия 1.3%) подставлены вместо оценок разбора «8.8%/4.2%» для карточек — это разные файлы (исходник vs готовая карточка), оба значения оставлены с пометкой. Строки styles.css:1505–1513 и index.html:452–454/471–474 перепроверены.

## Группа F. Мобайл (строка 96)

Группа «МОБАЙЛ» = owners-list.tsv строка 96 (шапка = 0; строка 95 — заголовок «МОБАЙЛ» без правки; совпадает с row 96/95 в docs/CONTENT-OWNER-REVISIONS-2026-09-06.md:107-108 и группой F спецификации). Рабочее дерево: ветка codex/final-dev4, HEAD a29be3b (docs-only поверх main 2dc66eb), чистое. Все пять пунктов — правки общего source site/index.html, site/styles.css, site/app.js; site/gambarian-standalone.html — сгенерированный bundle (scripts/build-preview.py --standalone, второй target verify-client-copy.py:341) и пересобирается, а не правится; build/ не трогать. Поправки скептика приняты все 12; одна уточнена: в M-04 скептик пишет «CLIENT-COPY-CONTRACT 1.1.0 → 1.2.0», но CONTRACT_VERSION уже 1.2.0/2026-08-16 (scripts/client_copy_contract.py:11-12), устарел только docstring строки 3 — bump идёт 1.2.0 → 1.3.0 с синхронизацией docstring (установленный факт 3). Номера строк у скептика местами 1-based («8–11», «42–43», «44», «88–92») — здесь всё нормализовано к шапке = 0: 7–10, 41–42, 43, 87–91. Установлено по дереву: (1) scripts/verify-live-surface.py в этом репо нет — live-гейт только `python -B scripts/verify-live-previews.py --only <alias>` (флаг один, NBSP_EXPECTED = 23 жёстко, строки 39-40/83-85), для JS-создаваемых элементов — `python scripts/qa-browser-matrix.py https://final-dev4.gambarian-landing.pages.dev/`, для статических маркеров — curl+grep; (2) alias final-dev4 в scripts/client-preview-map.json ещё не заведён (11 записей, version 2.4.0) — приёмка всех пунктов на final-dev4 после `only=final-dev4`, final-dev3 и боевой адрес не меняются; (3) scripts/verify-fact-cards.mjs — не гейт: старше редизайна карточек (9d99539 < 3fd80df), строка 60 `sem.every(s => s.tag === 'BUTTON')` ложна для 2.6 (нет <p>), строка ~82 даёт TypeError, playwright-core не установлен, в CI/RESUME/AGENTS.md не упоминается; (4) действующий гейт аккордеона — scripts/qa-browser-matrix.py v1.4.1 (строка 2; RESUME:120 устарел, там 1.4.0): условие toggle-missing строки 443/750-754 требует toggle у любой карточки с <p> — после M-01 обязателен bump 1.5.0 (в один релиз с новым гейтом свайпа M-04); (5) мёртвые селекторы `[data-copy-id="2.14"]` в site/styles.css:657,663,1572,1596 (карточки 2.14 в index.html нет), зеркало в standalone 798/804/1713/1737; комментарий app.js:602 «<=720px» расходится с media 860px (app.js:615); (6) мобильных переопределений .svc-* в styles.css нет ни в одном @media; touch/pointer-обработчиков нет; «Ведёт» продублирован 8 раз (index.html:186,215,244,273,302,331,360,389). Порядок работ: сначала решения по тексту строк 7–10, 16, 41–42 (общий вопрос 3), затем M-01+M-02 одной задачей (общий аккордеон + гейты + эталоны facts-dark-390 v1.1.0), затем M-03+M-04 вместе с desktop-строкой 43, M-05 отдельно (S, общая с группой D). Live readback final-dev4 через verify-live-previews.py пройдёт только пока число `&nbsp;—` на странице остаётся 23: сами пять мобильных пунктов его не меняют, но текстовые правки других групп (например строка 7 снимает aria-label/заголовок секции фактов с `&nbsp;—`) сломают счётчик — NBSP_EXPECTED нужно сделать per-alias до деплоя final-dev4 (установленный факт 1).

Строки без правки/заметки (действий нет): 95.

### F:M-01 — Факты (2-я секция) — карточка «Создание прецедента», мобильный ≤860px

- **Строки списка:** 96
- **Тип:** поведение; **трудоёмкость:** S
- **Вопросы анкеты:** №21
- **Сейчас на сайте:** Карточка data-copy-id="2.10" на ≤860px: «Создание» / «прецедента» / «в международной судебной практике» / <p>«— возвращение похищенного ребёнка при незарегистрированных родительских правах.» + кнопка-шеврон без текста (aria-label «Показать полностью: в международной судебной практике»), создаётся скриптом для любой карточки с <p>. Замер 390px: абзац 2 строки, clamp 2 ничего не скрывает — стрелка пустая; 360px: 3 строки, стрелка скрывает одну; fact-900-v1: 4 строки на обоих.
- **Правка владельца:** Вторая секция - Создание прецедента. Убрать стрелочку для открытия доп. инфы - там ничего нет
- **Где в коде:**
  - `site/app.js` (614-635, 645-676) — factCards/factsMq (614-615), buildToggle() (617-635): toggle создаётся при наличии <p> без сравнения scrollHeight/clientHeight; click/syncMode (645-676)
  - `site/app.js` (602-603) — комментарий «на <=720px» расходится с matchMedia (max-width: 860px) на строке 615 — поправить попутно
  - `site/styles.css` (1605-1666) — @media (max-width:860px): .fact-card{cursor:pointer} (1608), .fact-card p{-webkit-line-clamp:2} (1610-1615), .fact-card.is-open p (1616-1622), .fact-card__toggle/::before/[hidden] (1626-1652), .fact-card__chevron (1654-1664)
  - `site/styles.css` (1526-1536) — transition height / prefers-reduced-motion для .fact-card, .fact-card__chevron
  - `site/index.html` (114-122) — .fact-card[data-copy-id="2.10"] > p (строка 121)
  - `site/gambarian-standalone.html` (1897-1905, 3082-3100) — зеркало (generated bundle: python scripts/build-preview.py site/gambarian-standalone.html --standalone); второй target verify-client-copy.py:341
  - `scripts/qa-browser-matrix.py` (2, 443, 750-754) — PREVIEW-BROWSER-QA-RUNNER v1.4.1 | 2026-08-13; hasExpandableContent = Boolean(card.querySelector('p')); гейт fact-card-mobile-accordion-{state}-toggle-missing
  - `scripts/verify-fact-cards.mjs` (42-66, 80-84) — НЕ гейт: строка 60 sem.every(tag==='BUTTON') ложна для 2.6 (без <p>), ~82 TypeError на первой .fact-card; исключить из приёмки или чинить в задаче
  - `docs/tasks/2026-08-13-dark-fact-cards.md` (69-76, 96-100) — mobile-контракт «оба состояния аккордеона сохраняют золотую стрелку»; эталоны docs/design-references/facts-dark-390-collapsed/expanded-v1.0.0.png
  - `docs/RESUME.md` (120) — таблица контрактов «Browser QA runner 1.4.0» — устарела (файл несёт 1.4.1), обновить при bump
- **Контракты и гейты:** Client allowlist (45) не затрагивается: текст 2.10 не меняется, verifier сравнивает textContent, toggle без текста; «Показать полностью» остаётся в allowlist (client_copy_contract.py:169) — лишняя запись не запрещена. Owner overrides, CLIENT-COPY-CONTRACT, TYPOGRAPHY-DASHES, ACTION-BAR-SPEC 2.4.0, FINAL-DEV3-DESIGN — нет. Правка в общем site/ → во все Preview при пересборке. Обновить: PREVIEW-BROWSER-QA-RUNNER 1.4.1 → 1.5.0 (условие toggle-missing «toggle обязателен только если абзац реально обрезан» либо «только у карточек с data-атрибутом аккордеона»; маркер в docstring + RESUME:120); docs/tasks/2026-08-13-dark-fact-cards.md mobile-контракт и эталоны facts-dark-390-* v1.0.0 → v1.1.0; scripts/verify-fact-cards.mjs либо удалить/пометить historical, либо починить (проверки только по карточкам с toggle). Если по строке 9 (общий вопрос 3) абзац 2.10 становится «подзаголовком» без аккордеона, пункт закрывается вместе с M-02.
- **Вопрос из разбора (сведён в анкету):** На 360px абзац занимает 3 строки и стрелка скрывает одну. Убрать стрелку у «Создание прецедента» совсем и показывать абзац целиком (рекомендуется) — да/нет? (Если «да» и по строке 9 абзац становится подзаголовком — аккордеон уходит вместе с M-02.)
- **Приёмка:** 1) Playwright 360/390 на site/index.html: `document.querySelector('.fact-card[data-copy-id="2.10"] .fact-card__toggle') === null`; у `.fact-card[data-copy-id="2.10"] p` scrollHeight <= clientHeight; у `[data-owner-copy-id="fact-900-v1"]` toggle и aria-expanded сохранены (если аккордеон там остаётся); `document.documentElement.scrollWidth === innerWidth`. 2) `python -B scripts/verify-client-copy.py` PASS (текст не менялся). 3) `python scripts/qa-browser-matrix.py http://127.0.0.1:8098/ --all-previews` PASS после bump runner 1.5.0 (toggle-missing не срабатывает на 2.10). 4) `python -B scripts/verify-client-previews.py` PASS после пересборки. 5) Live после деплоя `only=final-dev4`: `python scripts/qa-browser-matrix.py https://final-dev4.gambarian-landing.pages.dev/` PASS (toggle создаётся JS — статический readback не доказывает) и `python -B scripts/verify-live-previews.py --only final-dev4` PASS (счётчик `&nbsp;—` = 23 этим пунктом не меняется); final-dev3 — `curl -s https://final-dev3.gambarian-landing.pages.dev/ | sha256sum` не изменился.
- **Примечания:** Применены поправки скептика: live-цель final-dev3 → final-dev4 (spec:53-54, 88-89; alias ещё не в client-preview-map.json — 11 записей); verify-fact-cards.mjs исключён из числа действующих гейтов (подтверждено: 9d99539 2026-08-10 старше 3fd80df 2026-08-13; index.html:106-113 — у 2.6 нет <p>; node_modules нет); версия runner — bump от 1.4.1 (qa-browser-matrix.py:2), RESUME:120 устарел. Дополнительно найдено: комментарий app.js:602 «<=720px» vs media 860px (app.js:615). Замер аналитика (390: 2 строки, clamp пуст; 360: 3 строки) не оспаривается.

### F:M-02 — Факты (2-я секция) — иерархия текста в трёх карточках, мобильный ≤860px

- **Строки списка:** 96
- **Тип:** типографика; **трудоёмкость:** M
- **Вопросы анкеты:** №11
- **Сейчас на сайте:** Три карточки на 390px строятся по-разному: 2.6 — сетка 2 колонки («30+» Playfair 500 34px + «лет» Onest 600 12px caps gold слева, «— профессиональный опыт в юриспруденции» Onest 600 15px справа, notch под текстом); 2.10 — «Создание»/«прецедента» Playfair 500 26px белым в столбик, «в международной судебной практике» Onest 600 11px caps gold, notch, абзац 13.5px с clamp 2; fact-900-v1 — «Автор» Onest 12px caps gold, «более 900» Playfair 34px, notch, абзац 13.5px с clamp 2. Notch (28×2px gold) есть во всех трёх, но на разных уровнях; порядок head/sub/notch/p различается.
- **Правка владельца:** Вторая секция. Привести в порядок иерархию текста во всех 3-х кубиках (см. строки 8–10: заголовок/подзаголовок; все заголовки — одна величина шрифта, все подзаголовки — другая; между ними разделительная чёрточка; строка 7 — убрать заголовок раздела)
- **Где в коде:**
  - `site/styles.css` (1542-1603) — @media (max-width:860px): .fact-card grid auto 1fr (1550-1554), .fact-card__head (1556-1564), __num/__sub/.notch (1565-1569), per-card overrides 2.10 (1571-1595) и fact-900-v1 (1573, 1597-1600), .fact-card p (1603)
  - `site/styles.css` (657, 663, 1572, 1596) — мёртвые селекторы `.fact-card[data-copy-id="2.14"]` (карточки 2.14 в index.html нет: grep = 0) — снять вместе с правкой
  - `site/styles.css` (559-617, 619-668, 149-150) — базовые .fact-card/__head/__num/__unit/__sub/.notch/p; desktop ≥861 (per-card 2.6/2.10/fact-900-v1); .notch
  - `site/index.html` (100-129) — section.facts aria-label с `&nbsp;—` (100), eyebrow/h2/rule (102-104), .facts-grid: 2.6 (106-113), 2.10 (114-122), fact-900-v1 (123-129) — порядок head/sub/notch/p разный
  - `site/gambarian-standalone.html` (700-809, 1683-1744, 1889-1913) — зеркало (generated bundle) + мёртвые 2.14 в 798/804/1713/1737
  - `scripts/verify-client-copy.py` (64-67, 158, 377) — normalize_text/textContent элемента с data-copy-id — любая правка текста внутри 2.6/2.10 = mismatch; fact-900-v1 сравнивается с OWNER_APPROVED_COPY
  - `scripts/client_copy_contract.py` (3, 11-12, 367-371) — docstring «v1.1.0 | 2026-08-13» vs CONTRACT_VERSION 1.2.0 / 2026-08-16 (рассинхрон до final-dev4); OWNER_APPROVED_COPY fact-900-v1
  - `docs/tasks/2026-08-13-dark-fact-cards.md` (39-76) — действующий визуальный контракт карточек (mobile-часть 69-76 переписать)
  - `site/fonts.css` (29-63, 69-101) — Onest variable 400–800 (normal); Playfair Display только 500 normal/italic — bold/light Playfair физически нет
  - `site/app.js` (602, 615) — комментарий «<=720px» vs matchMedia 860px
- **Контракты и гейты:** Если менять только CSS и порядок блоков при неизменном textContent — client allowlist, owner overrides и CLIENT-COPY-CONTRACT не затрагиваются. Но формулировки строк 8–10 меняют текст: 2.6 — подзаголовок без «— »; 2.10 — «Создание прецедента в международной судебной практике» / «возвращение…» без «— »; 900 — «Автор более 900 экспертных статей» / «В области…» — это новые owner overrides (data-owner-copy-id, записи в OWNER_APPROVED_COPY, docs/CONTENT-OWNER-EDITS.md v1.0.0 → 1.1.0, CLIENT-COPY-CONTRACT 1.2.0 → 1.3.0 с синхронизацией docstring строки 3); блоки 2.6/2.10 остаются в allowlist без размещения. Текстовая часть — зона группы A/«Текст» (строки 7–10, общий вопрос 3); мобильная иерархия делается после решения по тексту. TYPOGRAPHY-DASHES: «разделительную чёрточку» делать CSS-элементом (.notch), не текстовым тире — иначе попадает под правило `&nbsp;—`, в textContent блока и в счётчик NBSP_EXPECTED=23 verify-live-previews.py. Строка 7 (снять заголовок секции/aria-label с `&nbsp;—`, index.html:100-104) меняет счётчик `&nbsp;—` → live readback final-dev4 не пройдёт, пока NBSP_EXPECTED не станет per-alias. Шрифты: иерархия только размером/весом Onest 400–800 и размером Playfair 500. Гейты: PREVIEW-BROWSER-QA-RUNNER 1.4.1 → 1.5.0 (clipping guards + аккордеон вместе с M-01), новая задача docs/tasks/<дата>-mobile-fact-hierarchy.md, эталоны facts-dark-390-* v1.1.0 и facts-dark-1440 (если desktop тоже меняется по строке 8). FINAL-DEV3-DESIGN, Action Bar — нет.
- **Вопрос из разбора (сведён в анкету):** 1) «Разделительная чёрточка» — графическая линия (как золотая полоска-notch сейчас) или текстовое тире? — «линия»/«тире». 2) «30+ лет» на мобильном тоже перестраивать в столбик (заголовок → черта → подзаголовок), а не оставлять компактную сетку в две колонки? — да/нет. (Формулировки заголовков/подзаголовков — общий вопрос 3; стрелка у длинных подзаголовков — M-01.)
- **Приёмка:** 1) Playwright 360/390/1280/1440 на site/index.html: у всех трёх `.fact-card` одинаковый DOM-порядок head → divider → sub (offsetTop head < divider < sub), одно значение computed font-size у заголовков и одно — у подзаголовков (значения могут различаться между mobile и desktop, но не между карточками); divider — элемент высотой ≥1px в каждой карточке. 2) `python -B scripts/verify-client-copy.py` PASS (с новыми override, если текст меняется по строкам 8–10). 3) `python scripts/qa-browser-matrix.py http://127.0.0.1:8098/ --all-previews` PASS: `fact-card-horizontal-clipping` = 0, horizontal overflow 0 на 360/390/960/961/1440. 4) `grep -c '2\.14' site/styles.css` → 0 после снятия мёртвых селекторов. 5) Новые эталоны docs/design-references/facts-dark-390-*-v1.1.0.png (и 1440, если desktop меняется). 6) Live: `python scripts/qa-browser-matrix.py https://final-dev4.gambarian-landing.pages.dev/` PASS; `python -B scripts/verify-live-previews.py --only final-dev4` PASS (только после того как NBSP_EXPECTED учитывает изменённый счётчик `&nbsp;—`, если строка 7 реализована); final-dev3 sha256 без изменений.
- **Примечания:** Применены поправки скептика: desktop-критерий «DOMRect не изменились» заменён общим критерием одинаковой иерархии на всех вьюпортах (строка 8 «во всех 3-х кубиках» без ограничения по вьюпорту перекрывает утверждение 2026-08-13); добавлены мёртвые селекторы 2.14 (подтверждено grep: styles.css 657/663/1572/1596, index.html 0) и комментарий app.js:602; live-цель final-dev4; verify-fact-cards.mjs из приёмки исключён. Номера строк нормализованы к шапке = 0 (скептик писал «8–11» 1-based → 7–10). Уточнение к контракту: bump CLIENT-COPY-CONTRACT идёт от CONTRACT_VERSION 1.2.0 (установленный факт 3), а не от 1.1.0 из docstring.

### F:M-03 — Услуги (3-я секция) — формат меню тем, мобильный ≤860px

- **Строки списка:** 96
- **Тип:** раскладка; **трудоёмкость:** M
- **Вопросы анкеты:** №7, №15, №16
- **Сейчас на сайте:** Секция .services на 390px высотой 1414px: шапка «Семейное право» + две круглые стрелки 44px (.services__arrows); 8 пилюль .svc-tab «Развод, Алименты, Дети, Отцовство, Раздел имущества, Медиация, Брачный договор, Защита при угрозах» в 4 ряда (190px, просто flex-wrap — мобильных правил .svc-* в CSS нет); карточка 794px = бейдж с сердечком «Более 30 лет профессионального опыта в юриспруденции.» + заголовок + текст + «Записаться на консультацию» (main 494px) + блок «Ведёт…» (221px); 8 точек .svc-dot снизу. Три дублирующих способа навигации; на 360px секция 1560px.
- **Правка владельца:** Третья секция — привести в порядок, она очень перегружена. Упорядочить элементы меню в какой-то другой формат (развод, алименты и т.д.)
- **Где в коде:**
  - `site/index.html` (150-173) — section.services (150), .services__head (152), .services__arrows (158), .svc-tabs[role=tablist] > .svc-tab ×8 (164-173)
  - `site/index.html` (175-405) — .svc-card[role=tabpanel] ×8 (175, 204, 233, 262, 291, 320, 349, 378): .svc-card__badge (178-183, строка 16 списка), .svc-title, .svc-lead, .svc-card__cta, .svc-media
  - `site/index.html` (407-416) — .svc-dots > .svc-dot ×8 (aria-label = названия тем)
  - `site/styles.css` (693-895) — .services (693), .services__head/__arrows/.svc-arrow (695-719), .svc-tabs/.svc-tab/.is-active (721-745), .svc-card (746-753), .svc-dots/.svc-dot (870-895) — ни одного .svc-*/.services в @media (проверено awk от строки 1385 и grep)
  - `site/app.js` (131-203) — «Карусель направлений»: setActive(index, moveFocus) (138-156) синхронизирует tabs/dots/panels[hidden]; клавиатура ArrowLeft/Right/Up/Down/Home/End (171-195); стрелки (197-200)
  - `site/gambarian-standalone.html` (1947-1956, 2190-2199, 2594-2667) — зеркало (generated bundle)
  - `scripts/qa-browser-matrix.py` (234, 298, 681-683) — `.svc-title` — sample italic-шрифта (селектор сохранить); page-level horizontal-overflow гейт (scroll внутри контейнера допустим, page scrollWidth — нет)
  - `scripts/client_copy_contract.py` (22-93, 94-131) — тексты табов/точек уже в ALLOWED_OUTSIDE_COPY_TEXT (53 «Защита при угрозах», 52 «Записаться на консультацию») и ALLOWED_TEXT_ATTRIBUTES (108)
  - `docs/FINAL-QA-CHECKLIST.md` (918-919) — B6/B7 OPEN: контраст .svc-media__label и hover/transition tabs/dots
  - `docs/tasks/2026-09-06-final-dev4-spec.md` (38, 66, 75-76) — группа B (строки 15–44), общий вопрос 4, порядок реализации п.4
- **Контракты и гейты:** Тексты табов и их aria-label уже в allowlist — смена формата/порядка без новых слов CLIENT-COPY-CONTRACT не трогает. Любое новое служебное слово («Все темы», «Выбрать тему», «Ещё») = новая запись ALLOWED_OUTSIDE_COPY_TEXT/ALLOWED_TEXT_ATTRIBUTES + bump CLIENT-COPY-CONTRACT 1.2.0 → 1.3.0. Состав тем: строка 94 перечисляет 7 тем в другом порядке без «Защита при угрозах» (установленный факт 2) — снятие темы = снятие размещённых клиентских блоков 3.42/3.43, решение группы «Текст»/E, здесь зависимость. Снятие бейджа «Более 30 лет…» с сердечком (строка 16, группа B) уменьшает каждую карточку на ~56px — учесть в пороге высоты. Action Bar spec не меняется, но fixed-панель перекрывает низ вьюпорта — при dropdown/шторке проверять z-index и inert. Desktop-окно (строка 43) — группа B; мобильный формат в @media ≤860px, но проектировать одним DOM с desktop и с M-04. Паттерн tablist/tabpanel сохранить для a11y. PREVIEW-BROWSER-QA-RUNNER: новый гейт (одна строка табов/высота секции) в bump 1.5.0. FINAL-DEV3-DESIGN, TYPOGRAPHY-DASHES — нет.
- **Вопрос из разбора (сведён в анкету):** 1) Формат меню тем на мобильном: (а) одна горизонтально прокручиваемая строка чипов, (б) вертикальный список-аккордеон из тем без карусели, (в) выпадающий список «Тема: Развод ▾» — а/б/в? 2) Тем в меню 8 (как сейчас) или 7 по строке 94 без «Защита при угрозах» — 7/8? (Стрелки/точки при свайпе — общий вопрос 4.)
- **Приёмка:** 1) Playwright 360/390 на site/index.html: число уникальных `top` у `.svc-tab` = 1 (одна строка) либо табов нет (форматы б/в); видимых способов навигации по темам — по ответу на общий вопрос 4; `document.querySelector('.services').getBoundingClientRect().height <= 1220` при 390px (сейчас 1414; 1414 − 146 [табы 190→44] − 56 [бейдж] = 1212 — число фиксируется в docs/tasks/<дата>-mobile-services.md до реализации); `document.documentElement.scrollWidth === innerWidth`. 2) Семантика: после клика по каждой теме `aria-selected`/`hidden` синхронизированы; ArrowLeft/Right/Home/End работают; фокус виден. 3) `python -B scripts/verify-client-copy.py` PASS (никаких новых слов вне allowlist). 4) `python scripts/qa-browser-matrix.py http://127.0.0.1:8098/ --all-previews` PASS (с новым гейтом runner 1.5.0). 5) Desktop 1280/1440: DOMRect .svc-tabs/.svc-card без изменений, если desktop (строка 43) не входит в эту задачу. 6) Live: `python scripts/qa-browser-matrix.py https://final-dev4.gambarian-landing.pages.dev/` PASS; `curl -s https://final-dev4.gambarian-landing.pages.dev/ | grep -c '<новый класс контейнера меню>'` = 1; `python -B scripts/verify-live-previews.py --only final-dev4` PASS; final-dev3 sha256 без изменений.
- **Примечания:** Применены поправки скептика: verify-live-surface.py в этом репо нет (только в digitalhook-os-) → curl/grep + qa-browser-matrix на live; live-цель final-dev4; вопрос про стрелки/точки снят как дубль общего вопроса 4, оставлен только формат меню; порог высоты зафиксирован до реализации (≤1220px из замера 1414 − 146 − 56). Добавлен вопрос по составу тем 7/8 из установленного факта 2 (если группа E уже задаёт его по строке 94 — сослаться, не дублировать). Отсутствие мобильных .svc-* правил и touch-обработчиков подтверждено grep/awk.

### F:M-04 — Услуги (3-я секция) — свайп между темами, неподвижный блок «Ведёт…», мобильный ≤860px

- **Строки списка:** 96
- **Тип:** поведение; **трудоёмкость:** L
- **Вопросы анкеты:** №7, №17, №18
- **Сейчас на сайте:** Переключение тем сейчас только тапом по пилюле/точке/стрелке и клавиатурой; touch/pointer-обработчиков нет (grep touchstart|pointerdown|touchmove|swipe по site/app.js, standalone, action-bar.js — 0). Панели переключаются атрибутом hidden без анимации. Блок «Ведёт / Адвокат Александр Гамбарян / Адвокат Израиля, лицензия № 30178. / Более 30 лет… Языки работы…» (.svc-media) продублирован в каждой из 8 панелей и на мобильном стоит под текстом (221px при 390px) с desktop-правилом border-left/padding-left без mobile-override. Высоты панелей 606–794px при 390px.
- **Правка владельца:** Третья секция — сделать возможность свайпить между темами. Нижняя часть остается недвижимой (ведет…)
- **Где в коде:**
  - `site/app.js` (131-203) — setActive(index, moveFocus) (138-156), wrap-around по модулю (139); точка входа для swipe (pointerdown/pointermove/pointerup на .svc-card или общем контейнере); стрелки prev/next (197-200)
  - `site/index.html` (175-405) — .svc-card > .svc-card__inner > .svc-card__main + .svc-media — «Ведёт» ×8 (186, 215, 244, 273, 302, 331, 360, 389); для неподвижности выносится в один общий блок вне свайп-зоны либо анимируется только .svc-card__main
  - `site/index.html` (186-200) — .svc-media__label «Ведёт», .svc-media__license «Адвокат Израиля, лицензия №&nbsp;30178.» (строка 41 списка), <p> «Более 30 лет… Языки работы&nbsp;— …» (строка 42 списка)
  - `site/styles.css` (746-868) — .svc-card (746-753), .svc-card__inner flex-wrap (755-759), .svc-card__main (761), .svc-media border-left/padding-left (821-830) — нет @media override; .svc-media p (863-868)
  - `site/styles.css` (1532-1536) — @media (prefers-reduced-motion: reduce) — сейчас a, button, .fact-card; сюда же анимацию свайпа
  - `site/gambarian-standalone.html` (962-971, 1958-2188, 2594-2667) — зеркало (generated bundle)
  - `scripts/qa-browser-matrix.py` (2, 234, 298) — проверок поведения .svc-* нет (только italic-sample .svc-title) — новый гейт на свайп/неподвижность в bump 1.5.0
  - `scripts/client_copy_contract.py` (3, 11-12, 35, 37, 40-41, 90, 133) — текущие тексты блока «Ведёт» в ALLOWED_OUTSIDE_COPY_TEXT / ALLOWED_TEXT_ATTRIBUTES; строки 41–42 списка их меняют → новые записи + bump
  - `docs/tasks/2026-09-06-final-dev4-spec.md` (38, 66, 75-76) — группа B, общий вопрос 4, порядок реализации п.4
- **Контракты и гейты:** Client allowlist / owner overrides — нет, если не добавлять подсказку вроде «Свайпните» (тогда SYSTEM-UI allowlist + bump CLIENT-COPY-CONTRACT); aria-label новых кнопок/регионов → ALLOWED_TEXT_ATTRIBUTES. Зависимости: строка 40 (фото Юли в части тем), строки 41–42 (новый текст «Ведёт»: «лицензия № 30178» без точки, «Более 30 лет профессионального опыта в юридической сфере. Работа с клиентами на русском, иврите и английском языках.» → новые записи allowlist/owner override, CONTENT-OWNER-EDITS, CLIENT-COPY-CONTRACT 1.2.0 → 1.3.0 с синхронизацией docstring строки 3), строка 43 (desktop: окно одной величины, стрелки по бокам, левая часть и красная кнопка неподвижны). Вынос «Ведёт» в один блок делать ДО текстовой правки 41–42, чтобы править 1 копию вместо 8. Структурно: role=tabpanel/aria-labelledby остаются на main-части; единая модель «неподвижная media + CTA, скользит только текст» закрывает и desktop-строку 43 (там «Ведёт» справа, на мобильном снизу). Противоречие: строка 40 (Юля в части тем) несовместима с одним общим блоком без логики подмены фото/имени. Action Bar spec — нет, но горизонтальный жест не должен срабатывать поверх fixed-панели и при inert. PREVIEW-BROWSER-QA-RUNNER — новый гейт свайпа/неподвижности в bump 1.5.0. FINAL-DEV3-DESIGN, TYPOGRAPHY — нет.
- **Вопрос из разбора (сведён в анкету):** 1) Красная кнопка «Записаться на консультацию» на мобильном тоже неподвижна вместе с «Ведёт» (как в строке 43 для десктопа) — да/нет? 2) Свайп по кругу (после последней темы — первая, как сейчас у стрелок) или с упором на краях — «круг»/«упор»? 3) Если по строке 40 в части тем ведёт Юлия — неподвижный блок меняет фото/имя — да/нет? (Жест vs стрелки/точки — общий вопрос 4.)
- **Приёмка:** 1) Playwright, контекст hasTouch=true, 390×740 и 360×740 на site/index.html: горизонтальный жест ≥40px влево по карточке → `aria-selected="true"` у следующего .svc-tab, соответствующая .svc-card видима, `.svc-dot[aria-current="true"]` сдвинут (если точки остаются); жест вправо — назад. 2) DOMRect неподвижного блока «Ведёт» (top, height, left) до и после свайпа равны ±1px; панели одной высоты или min-height по самой длинной теме (сейчас 606–794px). 3) Вертикальный жест 100px прокручивает страницу и НЕ переключает тему; диагональ ≤30° от вертикали — тоже прокрутка. 4) При `prefers-reduced-motion: reduce` переключение мгновенное (без transform-анимации). 5) ArrowLeft/Right/Home/End без регрессии; `documentElement.scrollWidth === innerWidth`. 6) `grep -c 'class="svc-media"' site/index.html` = 1 при выносе в общий блок (сейчас 8). 7) `python -B scripts/verify-client-copy.py` PASS; `python scripts/qa-browser-matrix.py http://127.0.0.1:8098/ --all-previews` PASS с новым гейтом runner 1.5.0. 8) Live: `python scripts/qa-browser-matrix.py https://final-dev4.gambarian-landing.pages.dev/` PASS; `python -B scripts/verify-live-previews.py --only final-dev4` PASS (текст «Языки работы&nbsp;—» содержит `&nbsp;—` — при выносе из 8 копий в 1 счётчик `&nbsp;—` падает с 23, NBSP_EXPECTED должен стать per-alias до деплоя); final-dev3 sha256 без изменений.
- **Примечания:** Применены поправки скептика: вопросы дедуплицированы с общим вопросом 4 (оставлены кнопка/круг/Юля); добавлена зависимость от строк 41–42 (новый текст «Ведёт») и порядок «сначала вынос в один блок, потом текст». Поправка скептика уточнена: он пишет «CLIENT-COPY-CONTRACT 1.1.0 → 1.2.0», но CONTRACT_VERSION уже 1.2.0/2026-08-16 (client_copy_contract.py:11-12), устарел только docstring строки 3 → bump 1.2.0 → 1.3.0 + синхронизация маркера (установленный факт 3). Номера строк скептика 1-based (41/42–43/44) нормализованы к шапке = 0 (40/41–42/43). Замечено дополнительно: <p> блока «Ведёт» содержит `Языки работы&nbsp;—` ×8 — вынос в один блок меняет счётчик `&nbsp;—` на живой странице (установленный факт 1).

### F:M-05 — Подвал — колонка «Связь», дублирование телефона/WhatsApp

- **Строки списка:** 96
- **Тип:** удаление; **трудоёмкость:** S
- **Вопросы анкеты:** №25, №26
- **Сейчас на сайте:** Футер, колонка «Связь» (index.html:565): «Позвонить: 054-549-0623» (tel:+972545490623, class nowrap-token) / «Написать в WhatsApp» (wa.me/972545490623). Полный инвентарь tel: на странице — .nav-call в шапке (54), .nav-drawer__call в мобильном меню (64), hero .hero__call (93), .contact-list__row над формой (505), .lead-form__error-contact (526), футер (565) = 6; wa.me — кнопка .btn--ghost-lg в секции «Прецедент» (437), .contact-list__row (509), .lead-form__error-contact (526), футер (565) = 4; плюс Action Bar (Позвонить/Записаться/WhatsApp, fixed) в Preview. Колонка «Офис» (564) повторяет адрес блока контактов (513-515) — правки по ней у владельца нет (строки 87–88 без правки).
- **Правка владельца:** Связь (в последней секции) — убрать дублирование
- **Где в коде:**
  - `site/index.html` (563-566) — .site-footer__cols > div:nth-child(2): .site-footer__label «Связь» + a[href=tel:] + a[href=wa.me] (565)
  - `site/index.html` (504-512) — .contact-list__row tel (505-508) и WhatsApp (509-512) — второй участник дубля
  - `site/index.html` (54, 64, 93, 437, 526) — остальные точки tel:/wa.me (.nav-call, .nav-drawer__call, .hero__call, .btn--ghost-lg в #precedent, .lead-form__error-contact) — не трогать в этом пункте
  - `site/styles.css` (1350-1367) — .site-footer__cols (flex-wrap, gap 36px), .site-footer__label — mobile-override нет, колонки складываются в столбик
  - `site/gambarian-standalone.html` (2346-2349, 2288-2296) — зеркало (generated bundle): футер 2348, contact-list 2288/2292/2296
  - `site-addons/action-bar/action-bar.html` (1) — .mobile-bar — не трогать (ACTION-BAR-SPEC v2.4.0 | 2026-08-17)
  - `scripts/client_copy_contract.py` (64, 75, 86, 208, 341) — «Написать в WhatsApp», «Позвонить: 054-549-0623», «Связь» в ALLOWED_OUTSIDE_COPY_TEXT; клиентские блоки 1.12/7.7 не размещены как блоки
  - `scripts/qa-browser-matrix.py` (310, 842) — tel: проверяется только в Hero (.hero a[href^=tel:], final-dev3-hero-open-href) — не затронуто
  - `docs/HERO-CTA-RESEARCH.md` (187-191) — зафиксированное решение «WhatsApp остаётся в блоке контактов, в футере и в мобильной панели» — обновить
  - `docs/tasks/2026-09-06-final-dev4-spec.md` (40, 86) — группа D также включает «Связь без дублирования» (правка общая, не только мобильная); приёмка «ни одного tel: в кликабельных элементах в состоянии закрыто» — группа E
- **Контракты и гейты:** Client allowlist (45) не затрагивается: в футере data-copy-id только у 8.9 (юридическая строка, 570); «Связь», «Офис», «Позвонить: 054-549-0623», «Написать в WhatsApp» — SYSTEM-UI/identity в ALLOWED_OUTSIDE_COPY_TEXT; блоки 1.12/7.7 не размещены, coverage 45/45 не требуется — удаление mismatch не даёт. Owner overrides — нет. CLIENT-COPY-CONTRACT — версия не меняется (лишние записи allowlist не запрещены). TYPOGRAPHY-DASHES — нет (в строке «Связь» нет `&nbsp;—`; «Приём&nbsp;— …» в «Офис» остаётся → счётчик 23 не меняется). Action Bar spec — нет (панель остаётся единственным «дублем» на мобильном по спецификации). JSON-LD telephone сохраняется. Обновить docs/HERO-CTA-RESEARCH.md §6; docs/CONTACT-LINKS-SPEC.md футер не упоминает (grep пусто) — при необходимости зафиксировать точки размещения. Правка общая для mobile и desktop (группа D, spec:40) — делать один раз, ответ владельца фиксировать в CONTENT-OWNER-EDITS. Побочно: удаление футерной tel-ссылки сокращает всегда-видимые точки звонка с 6 до 5; оставшиеся 4 вне Action Bar/hero (.nav-call, .nav-drawer__call, contact-list, lead-form__error) всё равно требуют обработки рабочего времени — hero-business-hours.js:9-12 управляет только `.mobile-bar[data-business-state]` и `.hero--final-dev1 .hero__call--expanded` (группа E, spec:86).
- **Вопрос из разбора (сведён в анкету):** Убрать телефон/WhatsApp из футера (остаются «Офис» и юридическая строка) или, наоборот, из блока контактов над формой — «футер»/«контакты»?
- **Приёмка:** 1) Статически: `grep -c 'site-footer__label">Связь' site/index.html site/gambarian-standalone.html` → 0 в обоих (при удалении в футере). 2) Playwright 390 на site/index.html: `document.querySelectorAll('a[href^="tel:"]').length === 5` (было 6); ровно 1 tel-ссылка вне `.site-header, .nav-drawer, .hero, .lead-form__error, .mobile-bar` (contact-list); `a[href^="https://wa.me"]` вне `.mobile-bar, .precedent, .lead-form__error` = 1; `.site-footer__cols > div` = 1 без пустых колонок; horizontal overflow 0. 3) `python -B scripts/verify-client-copy.py` PASS, `python -B scripts/verify-client-previews.py` PASS, `python scripts/qa-browser-matrix.py http://127.0.0.1:8098/ --all-previews` PASS. 4) Live после `only=final-dev4`: `curl -s https://final-dev4.gambarian-landing.pages.dev/ | grep -c 'site-footer__label">Связь'` → 0 и `… | grep -c 'site-footer__label">Офис'` → 1; `python -B scripts/verify-live-previews.py --only final-dev4` PASS (счётчик `&nbsp;—` этим пунктом не меняется); final-dev3 sha256 без изменений.
- **Примечания:** Применены поправки скептика: verify-live-surface.py в репо нет → curl/grep + verify-live-previews --only; live-цель final-dev4; счётчики tel:/wa.me пересчитаны по инвентарю (подтверждено grep index.html: tel 54/64/93/505/526/565 = 6, wa.me 437/509/526/565 = 4); инвентарь дублей в source_text дополнен .nav-call, .nav-drawer__call и WhatsApp-кнопкой прецедента; вопрос про «Офис» снят (строки 87–88 без правки). Подтверждено: правка общая с группой D (spec:40) — задавать вопрос один раз.

## Related

- [Задание final-dev4](2026-09-06-final-dev4-spec.md)
- [Анкета вопросов владельцу](2026-09-06-final-dev4-questions.md)
- [Правки владельцев дословно](../CONTENT-OWNER-REVISIONS-2026-09-06.md)
- [Измерения шрифтов и фото](../FONT-AND-PHOTO-MEASUREMENTS-2026-09-06.md)
- [Точка входа](../RESUME.md)

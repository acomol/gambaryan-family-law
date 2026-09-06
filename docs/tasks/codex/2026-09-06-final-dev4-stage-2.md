# Этап 2: Тексты дословно: 8 панелей услуг, H2 услуг, прецедент, карточки адвокатов, примечание, плашка, «Ведёт», удаления; контракт 1.3.0

**Версия:** `FINAL-DEV4-STAGE-2 v1.0.0`

**Дата:** `2026-09-06`

**Ветка:** `codex/final-dev4-s2-texts` → draft PR в `main`

**Исполнитель:** Codex CLI; уровень рассуждений: **high (контракты, скрипты, поведение)** — Механический перенос текстов, но каждая строка проходит через побайтовый контракт (owner-блоки, allowlist, вложенность 5.15, bump 1.3.0, review-anchors, unit-тесты, per-alias readback); одна лишняя точка или ё ломает гейт, а догадка вместо дословного текста запрещена решением №4.

**Приёмка:** Claude (облачная сессия) по `docs/CODEX-WORKING-MODEL.md`; слияние — владелец.

## Цель

В общем site/ все текстовые правки владельцев групп A–D, помеченные в реестре решений как решённые (№4, 5, 6, 19, 22, 23, 24), перенесены дословно из колонки «Правка» docs/CONTENT-OWNER-REVISIONS-2026-09-06.md: 15 новых owner-approved блоков (data-owner-copy-id) и 4 новые allowlist-строки, удалены бейдж с сердечком ×8, заголовок 5.6, строка 5.17 и строка об образовании Юлии, примечание под карточками — по центру и bold. Контракт копирайта 1.3.0 с синхронизацией всех маркеров, frozen source не тронут, verify-client-copy PASS (owner-approved 16 block), build-review-numbered без SystemExit, число «&nbsp;—» в final-dev4 = 15 и зафиксировано в verify-live-previews.py.

## Основание

- Решения владельца (реестр в `../2026-09-06-final-dev4-spec.md`): №4, №5, №6, №19, №22, №23, №24
- Пункты разбора (`../2026-09-06-final-dev4-items.md`): `A:HF-06`, `A:HF-07`, `B:G-01`, `B:G-02`, `B:G-03`, `B:G-04`, `B:G-06`, `B:G-07`, `B:G-08`, `B:G-09`, `B:G-10`, `B:G-11`, `B:G-12`, `B:G-14`, `B:G-15`, `C:G-01`, `C:G-02`, `C:G-03`, `C:G-05`, `C:G-07`, `C:G-08`, `C:G-10`, `C:G-11`, `C:G-12`, `C:G-13`, `C:G-14`, `D:D-04`, `D:D-06`
- Открытые вопросы, выполняемые «по умолчанию» (переделать при другом ответе):
  - №15 — вкладка «Защита при угрозах» остаётся последней; лид 3.43 (строка 37) переносится как svc-protection-lead-v1
  - №20 (ответ владельца «как принято, best practice» + рекомендация дизайнера) — в заголовке 3.22 перенос естественный: «Установление или оспаривание отцовства, тест ДНК» одной строкой без <br>; в контракте пробел после запятой

## Не в скоупе этапа

- JSON-LD jobTitle (точка) и streetAddress, aria-label карты, адрес в контактах (:515) и подвале (:564), кликабельная строка адреса, колонка «Связь», строка 8.9 — этап 3 (решения №8, 13, 14, 26, 27); в этом этапе новое написание адреса только в плашке фактов (строка 13)
- Нерабочее время (все tel: вне Hero → WhatsApp) — этап 4
- Кубики фактов (строки 7–10: заголовок секции, fact-30-v1, fact-precedent-v1, fact-900-v2) — этап 5; их owner-id уже предзарегистрированы, в OWNER_APPROVED_COPY не добавлять
- Порядок вкладок, окошко услуг одной высоты, свайп, один блок «Ведёт», фото Юлии в «Ведёт» (№18 — данных нет) — этап 6
- Шрифты заголовков (№1, №2), фото (№3), отступы (№28) — этап 7; пометки «Поменять шрифт» на строках 15, 18, 20, 23, 26, 28, 31, 36, 45, 51, 59 не реализуются здесь
- Строки 84–86 («Заявка получена»), 70–74 и предложения из CONTENT-EDIT-PROPOSALS (7.4/7.6) — без изменений
- Frozen source docs/sources/client-copy-short-v1.0.0.txt и 45 клиентских блоков APPROVED_COPY_ITEMS — не менять; замещённые блоки остаются в allowlist неиспользуемыми

## Шаги

### 1. Создать ветку этапа поверх результата этапа 1 и проверить предпосылки.

Файлы: `scripts/review_numbered_contract.py`, `scripts/verify-live-previews.py`, `docs/CONTENT-OWNER-REVISIONS-2026-09-06.md`

База: main после слияния PR этапа 1; если PR #11 и PR этапа 1 ещё не влиты — от codex/final-dev4-s1-prep (стек; указать в PR). git checkout -b codex/final-dev4-s2-texts. Прочитать AGENTS.md → docs/RESUME.md → docs/CODEX-WORKING-MODEL.md → карточку → spec «Реестр решений владельца» (№4, 5, 6, 19, 22, 23, 24) → пункты разбора из списка items → docs/CONTENT-OWNER-REVISIONS-2026-09-06.md (источник текстов, колонка «Правка»; строка 6 — не текст сайта). Правило: ё/е, точки, регистр — строго как в колонке «Правка»; пустая «Правка» = текст сайта не меняется (только заметка).

Проверка: grep -c 'svc-h2-v1' scripts/review_numbered_contract.py → 1; grep -c '"final-dev4": 23' scripts/verify-live-previews.py → 1; git branch --show-current → codex/final-dev4-s2-texts

### 2. Группа A: плашка фактов — лицензия без точки, новое написание адреса.

Файлы: `site/index.html`

строка 11 → без id, .facts-bar__item:nth-child(1) span → site/index.html:135 → `<span>Адвокат Израиля, лицензия №&nbsp;30178</span>` (снять точку, №&nbsp; сохранить). строка 13 → без id, .facts-bar__item:nth-child(3) span → site/index.html:143 → `<span>Прием&nbsp;— Тель-Авив / онлайн<br><a class="map-link" href="…без изменений…" target="_blank" rel="noopener" aria-label="Открыть адрес в Google Maps: Тель-Авив, Карлибах 10">Карлибах,&nbsp;10</a></span>` — «Прием» через е, запятая после «Карлибах», href и aria-label не менять (этап 3).

Проверка: sed -n '132,145p' site/index.html | grep -c '30178\.' → 0; sed -n '132,145p' site/index.html | grep -c 'Прием&nbsp;— Тель-Авив / онлайн<br>' → 1; grep -c 'Карлибах,&nbsp;10' site/index.html → 1

### 3. Группа B: H2 услуг, удаление бейджа ×8, тексты панелей, «Ведёт» ×8.

Файлы: `site/index.html`

строка 15 → h2 без id → data-owner-copy-id="svc-h2-v1" → :155 → `<h2 class="section-title section-title--narrow" data-owner-copy-id="svc-h2-v1">Развод по взаимному согласию и представительство в бракоразводных спорах при отсутствии соглашения между супругами</h2>`. строка 16 → удалить целиком блок `<div class="svc-card__badge">…</div>` (иконка-сердце + span.svc-eyebrow) во всех 8 панелях → :178–181, 207–210, 236–239, 265–268, 294–297, 323–326, 352–355, 381–384. строка 18 → 3.7 → svc-divorce-title-v1 → :182 → `<h3 class="svc-title" data-owner-copy-id="svc-divorce-title-v1">Бракоразводные процессы</h3>`. строка 19 → 3.8 → svc-divorce-lead-v1 → :183 → «Консультация и полное юридическое сопровождение развода по взаимному согласию&nbsp;— без судебного спора между супругами. Когда соглашение между супругами невозможно, адвокат обеспечивает полное сопровождение бракоразводного процесса&nbsp;— от подготовки документов до представительства в суде и иных инстанциях.». строка 24 → 3.18 → svc-children-lead-v1 → :241 → «Споры о месте проживания ребенка и порядке общения. Международные дела о возвращении похищенных или незаконно удерживаемых детей, включая сложные случаи с неоформленными родительскими правами» (без точки в конце, «ребенка» через е). строка 26 → 3.22 → svc-paternity-title-v1 → :269 → «Установление или оспаривание отцовства, тест ДНК» (без « · », без <br>). строка 27 → 3.23 → svc-paternity-lead-v1 → :270 → «Установление и оспаривание отцовства, получение судебного разрешения на проведение ДНК-теста и полное сопровождение процедуры. В Израиле генетическая экспертиза для установления родства проводится на основании постановления суда.». строка 29 → 3.28 → svc-property-lead-v1 → :299 → «Раздел имущества и долгов супругов: недвижимость, ипотека, банковские счета, пенсионные накопления, бизнес, кредиты и иные обязательства&nbsp;— в переговорах, соглашении и судебном процессе.». строка 32 → 3.33 → svc-mediation-lead-v1 → :328 → «При готовности сторон к диалогу офис сопровождает медиацию, помогает достичь соглашения по вопросам детей, алиментов и имущества, а также оформляет договорённости в юридически грамотное соглашение для последующего утверждения.». строка 34 → 3.38 → svc-prenup-lead-v1 → :357 → «Разработка брачного договора на индивидуальных условиях с учетом имущества, бизнеса, долговых и иных обязательств сторон. Защита интересов каждого супруга и сопровождение официального утверждения соглашения.» («с учетом» через е). строка 37 → 3.43 → svc-protection-lead-v1 → :386 → «Срочное обращение за защитным ордером и юридическое сопровождение процедуры. При непосредственной опасности следует немедленно обратиться в экстренные службы, не дожидаясь ответа через сайт.». Во всех перечисленных заменить атрибут data-copy-id="…" на data-owner-copy-id="…"; классы svc-title/svc-lead сохранить. строка 41 → .svc-media__license ×8 (allowlist) → :195, 224, 253, 282, 311, 340, 369, 398 → `Адвокат Израиля, лицензия №&nbsp;30178`. строка 42 → .svc-media > p ×8 (allowlist) → :199, 228, 257, 286, 315, 344, 373, 402 → `Более 30 лет профессионального опыта в юридической сфере. Работа с клиентами на русском, иврите и английском языках.` Без изменений: 3.12, 3.13, 3.17, 3.27, 3.32, 3.37, 3.42 (data-copy-id остаются).

Проверка: grep -c 'class="svc-card__badge"\|class="svc-eyebrow"' site/index.html → 0; sed -n '150,419p' site/index.html | grep -c 'M20.84 4.61' → 0; grep -c 'data-owner-copy-id="svc-' site/index.html → 10; sed -n '150,419p' site/index.html | grep -c 'лицензия №&nbsp;30178<' → 8; grep -c 'Работа с клиентами на русском, иврите и английском языках\.' site/index.html → 8; sed -n '150,419p' site/index.html | grep -c 'Языки работы&nbsp;—\|·' → 0; grep -c 'согласию&nbsp;— без' site/index.html → 1; grep -c 'процесса&nbsp;— от' site/index.html → 1; grep -c 'обязательства&nbsp;— в переговорах' site/index.html → 1

### 4. Группа C: прецедент, заголовок 5.6, карточка Александра, карточка Юлии, примечание.

Файлы: `site/index.html`

строка 45 → 4.5 → precedent-title-v1 → :432 → `<h3 class="precedent-card__title" data-owner-copy-id="precedent-title-v1">Возвращение неправомерно перемещенного или удерживаемого ребенка, в том числе в случаях, когда родительские права не были официально зарегистрированы.</h3>` (е в «перемещенного», «ребенка»; точка в конце). строка 46 → 4.6 → precedent-body-v1 → :433 → `<p data-owner-copy-id="precedent-body-v1">Александр Гамбарян&nbsp;— автор международного судебного прецедента по делу о возвращении похищенного ребёнка в ситуации, когда родительские права не были официально зарегистрированы. Практический опыт ведения такого дела позволяет глубоко оценивать правовые, процессуальные и международные аспекты подобных споров. При этом каждый случай индивидуален и требует отдельного юридического анализа.</p>` (ё в «ребёнка»). строка 50 → 5.6 → удалить строку :447 `<h2 … data-copy-id="5.6">Адвокат Александр Гамбарян</h2>` целиком; eyebrow :446 и `<div class="rule"></div>` :448 остаются (№22). строки 53/54/55/57 → `<ul class="checklist">` :460 получает data-owner-copy-id="alexander-card-v1"; li :461 → снять data-copy-id="5.9", текст «Более 30 лет профессионального опыта в юриспруденции» (без точки); li :462 → снять data-copy-id="5.11", текст «Автор международного судебного прецедента по возвращению похищенного ребёнка при незарегистрированных родительских правах» (без точки; «ребёнка» с ё — колонка «Правка» строки 54 пуста); li :463 → снять data-copy-id="5.13", текст «Адвокат Израиля, лицензия №&nbsp;30178» (без точки); li :464 data-copy-id="5.15" — без изменений (вложенность в owner-блок поддерживается парсером: handle_data пишет во все активные узлы); li :465 (5.17, адрес) → удалить целиком; svg-галочки сохранить. строки 61/62/64/66 → контейнер :471 `data-owner-copy-id="yulia-card-v1"` → `yulia-card-v2`; li :481 → «Более 17 лет профессионального опыта в юриспруденции»; li :482 («Высшее юридическое образование с отличием») → удалить целиком (№23); li :483 без изменений; li :484 → «Миграционное и семейное право Израиля: репатриация, гражданство, легализация статуса и семейные споры.» (с точкой); li :485 без изменений; кнопка :487 → `<a class="btn--gold-block" href="#contact">Записаться на консультацию</a>`; h3 :477 `<h3 class="attorney-card__name">Юлия Саакян</h3>` не менять (anchor review-numbered). строка 67 → 5.19 → attorneys-note-v1 → :492 → `<p class="attorneys__note" data-owner-copy-id="attorneys-note-v1">В течение всего процесса, от первой консультации до завершения дела, клиент получает полное сопровождение, включающее в себя разъяснение содержания и заполнение подготовленных документов</p>`.

Проверка: grep -c 'data-copy-id="4.5"\|data-copy-id="4.6"\|data-copy-id="5.6"\|data-copy-id="5.9"\|data-copy-id="5.11"\|data-copy-id="5.13"\|data-copy-id="5.17"\|data-copy-id="5.19"' site/index.html → 0; grep -c 'data-copy-id="5.15"' site/index.html → 1; grep -c 'class="map-link"' site/index.html → 3; grep -c 'Записаться к Юлии\|Высшее юридическое образование\|yulia-card-v1' site/index.html → 0; grep -c 'class="btn--gold-block" href="#contact">Записаться на консультацию</a>' site/index.html → 2; grep -c 'на русском языке, включающее' site/index.html → 0; grep -o '&nbsp;—' site/index.html | wc -l → 15

### 5. CSS: мёртвый бейдж удалить, примечание под карточками — центр и bold.

Файлы: `site/styles.css`

Удалить правила .svc-card__badge, .svc-card__icon, .svc-eyebrow (:763–787) — в разметке их больше нет. .attorneys__note (:1108–1115): `margin: 32px auto 0;` (вместо 32px 0 0 — центрирует блок 68ch), добавить `text-align: center;` и `font-weight: 700;` (Onest variable 400–800 уже загружен, новых файлов не нужно); max-width 68ch и text-wrap pretty сохранить. Соседний код и отступы секций не трогать.

Проверка: grep -c 'svc-card__badge\|svc-card__icon\|svc-eyebrow' site/styles.css → 0; grep -n -A7 '^\.attorneys__note' site/styles.css → содержит text-align: center и font-weight: 700

### 6. Контракт копирайта 1.3.0: новые owner-блоки, allowlist, токены.

Файлы: `scripts/client_copy_contract.py`

Docstring :3 → `CLIENT-COPY-CONTRACT v1.3.0 | <ДАТА>`; CONTRACT_VERSION = "1.3.0", CONTRACT_DATE = "<ДАТА>". ALLOWED_OUTSIDE_COPY_TEXT += "Адвокат Израиля, лицензия № 30178", "Более 30 лет профессионального опыта в юридической сфере. Работа с клиентами на русском, иврите и английском языках.", "Прием — Тель-Авив / онлайн", "Карлибах, 10" (старые строки оставить: allowlist разрешающий). OWNER_APPROVED_COPY: удалить "yulia-card-v1"; добавить (нормализованные строки, обычные пробелы, тире U+2014): "svc-h2-v1": "Развод по взаимному согласию и представительство в бракоразводных спорах при отсутствии соглашения между супругами"; "svc-divorce-title-v1": "Бракоразводные процессы"; "svc-divorce-lead-v1": "Консультация и полное юридическое сопровождение развода по взаимному согласию — без судебного спора между супругами. Когда соглашение между супругами невозможно, адвокат обеспечивает полное сопровождение бракоразводного процесса — от подготовки документов до представительства в суде и иных инстанциях."; "svc-children-lead-v1": "Споры о месте проживания ребенка и порядке общения. Международные дела о возвращении похищенных или незаконно удерживаемых детей, включая сложные случаи с неоформленными родительскими правами"; "svc-paternity-title-v1": "Установление или оспаривание отцовства, тест ДНК"; "svc-paternity-lead-v1": "Установление и оспаривание отцовства, получение судебного разрешения на проведение ДНК-теста и полное сопровождение процедуры. В Израиле генетическая экспертиза для установления родства проводится на основании постановления суда."; "svc-property-lead-v1": "Раздел имущества и долгов супругов: недвижимость, ипотека, банковские счета, пенсионные накопления, бизнес, кредиты и иные обязательства — в переговорах, соглашении и судебном процессе."; "svc-mediation-lead-v1": "При готовности сторон к диалогу офис сопровождает медиацию, помогает достичь соглашения по вопросам детей, алиментов и имущества, а также оформляет договорённости в юридически грамотное соглашение для последующего утверждения."; "svc-prenup-lead-v1": "Разработка брачного договора на индивидуальных условиях с учетом имущества, бизнеса, долговых и иных обязательств сторон. Защита интересов каждого супруга и сопровождение официального утверждения соглашения."; "svc-protection-lead-v1": "Срочное обращение за защитным ордером и юридическое сопровождение процедуры. При непосредственной опасности следует немедленно обратиться в экстренные службы, не дожидаясь ответа через сайт."; "precedent-title-v1": "Возвращение неправомерно перемещенного или удерживаемого ребенка, в том числе в случаях, когда родительские права не были официально зарегистрированы."; "precedent-body-v1": "Александр Гамбарян — автор международного судебного прецедента по делу о возвращении похищенного ребёнка в ситуации, когда родительские права не были официально зарегистрированы. Практический опыт ведения такого дела позволяет глубоко оценивать правовые, процессуальные и международные аспекты подобных споров. При этом каждый случай индивидуален и требует отдельного юридического анализа."; "alexander-card-v1": "Более 30 лет профессионального опыта в юриспруденции Автор международного судебного прецедента по возвращению похищенного ребёнка при незарегистрированных родительских правах Адвокат Израиля, лицензия № 30178 Языки работы — русский, иврит, английский"; "yulia-card-v2": "Юлия Саакян Адвокат-партнёр · миграционное и семейное право Более 17 лет профессионального опыта в юриспруденции Возглавляла юридические подразделения в государственных учреждениях, в том числе в сфере международного сотрудничества Миграционное и семейное право Израиля: репатриация, гражданство, легализация статуса и семейные споры. Представительство в МВД Израиля, апелляционных инстанциях и судах Записаться на консультацию"; "attorneys-note-v1": "В течение всего процесса, от первой консультации до завершения дела, клиент получает полное сопровождение, включающее в себя разъяснение содержания и заполнение подготовленных документов". Комментарий к каждому ключу: строка списка владельцев и заменённый клиентский блок. OWNER_APPROVED_HTML_TOKENS: 'data-owner-copy-id="yulia-card-v1"' → 'data-owner-copy-id="yulia-card-v2"'. APPROVED_COPY_ITEMS, ALLOWED_JSON_LD_TEXT, ALLOWED_TEXT_ATTRIBUTES, OWNER_APPROVED_JSON_LD_PERSON — не менять.

Проверка: python -c "import sys;sys.path.insert(0,'scripts');import client_copy_contract as c;print(c.CONTRACT_VERSION,len(c.OWNER_APPROVED_COPY),'yulia-card-v1' in c.OWNER_APPROVED_COPY)" → 1.3.0 16 False; после пересборки python -B scripts/verify-client-copy.py → PASS … owner-approved 16 block; contract v1.3.0 | <ДАТА>

### 7. Review-numbered: снять yulia-card-v1, anchor для yulia-card-v2.

Файлы: `scripts/review_numbered_contract.py`, `scripts/build-review-numbered.py`

OWNER_REVIEW_IDS: удалить ключ "yulia-card-v1" (остальные 19 без изменений; порядок ключей — как в source). OWNER_REVIEW_ANCHORS: ключ "yulia-card-v1" → "yulia-card-v2" с тем же anchor '<h3 class="attorney-card__name">Юлия Саакян</h3>'. REVIEW_NUMBERED_VERSION = "2.1.1", REVIEW_NUMBERED_UPDATED = "<ДАТА>". build-review-numbered.py не менять, если этап 1 сделал вставку обобщённой; иначе остановиться и написать в отчёт.

Проверка: python -B scripts/build-review-numbered.py → «Проверка пройдена»; grep -o 'data-review-id="[^"]*"' build/variants/review-numbered/index.html | tr '\n' ' ' → 2.14 3.H2 3.7 3.8 3.18 3.22 3.23 3.28 3.33 3.38 3.43 4.5 4.6 5.9–5.13 5.18 5.19 в этом порядке; grep -rc 'yulia-card-v1' scripts/*.py scripts/tests/*.py site/*.html → везде 0

### 8. Live readback: новое ожидание тире для final-dev4.

Файлы: `scripts/verify-live-previews.py`

NBSP_EXPECTED["final-dev4"] = 15 (23 + 1 второе тире в 3.8 − 8 «Языки работы» в «Ведёт» − 1 удалённая 5.17); значения других alias не трогать (они описывают релиз, который те отдают). Docstring :4 → `LIVE-PREVIEW-READBACK v1.2.1 | <ДАТА>`, READBACK_VERSION = "1.2.1".

Проверка: после сборки: test "$(grep -o '&nbsp;—' build/variants/final-dev4/index.html | wc -l)" = 15 && grep -c '"final-dev4": 15' scripts/verify-live-previews.py → 1

### 9. Unit-тесты: переключить тест Юлии на v2 и добавить drift-тесты новых owner-блоков.

Файлы: `scripts/tests/test_verify_client_copy.py`

test_owner_approved_yulia_drift_fails → test_owner_approved_yulia_v2_drift_fails: replace("Более 17 лет профессионального опыта в юриспруденции", "Более 17 лет опыта", 1), assert 'owner:yulia-card-v2' in problems. Новый test_owner_approved_new_blocks_drift_fails с subTest по парам (owner-id, фрагмент → замена): svc-h2-v1 «представительство в бракоразводных спорах» → «представительство в спорах»; svc-divorce-title-v1 «Бракоразводные процессы</h3>» → «Развод</h3>»; svc-divorce-lead-v1 «иных инстанциях» → «других инстанциях»; svc-children-lead-v1 «незаконно удерживаемых» → «удерживаемых»; svc-paternity-title-v1 «отцовства, тест ДНК» → «отцовства и тест ДНК»; svc-paternity-lead-v1 «генетическая экспертиза» → «экспертиза»; svc-property-lead-v1 «кредиты и иные обязательства» → «кредиты»; svc-mediation-lead-v1 «оформляет договорённости» → «оформляет договоренности»; svc-prenup-lead-v1 «Разработка брачного договора» → «Составление брачного договора»; svc-protection-lead-v1 «не дожидаясь ответа через сайт» → «не ожидая ответа»; precedent-title-v1 «неправомерно перемещенного» → «похищенного»; precedent-body-v1 «по делу о возвращении» → «о возвращении»; alexander-card-v1 «Более 30 лет профессионального опыта в юриспруденции</span>» → «Более 30 лет опыта</span>»; attorneys-note-v1 «полное сопровождение, включающее» → «сопровождение, включающее». Каждая мутация → assert f'owner:{id}' в problems. test_owner_approved_fact_900_drift_fails и test инварианта из этапа 1 — без изменений.

Проверка: python -m unittest discover -s scripts/tests -v → OK (14 тестов, subTest ×14 без failures)

### 10. Пересобрать standalone и все производные, прогнать гейты.

Файлы: `site/gambarian-standalone.html`, `build/variants/final-dev4`

python -B scripts/build-preview.py site/gambarian-standalone.html --standalone (обязательно после всех правок index.html/styles.css — standalone тоже source-target верификатора) → build-font-variants → build-hero-variants → build-action-bar → build-review-numbered → verify-client-copy → unittest → verify-client-previews → verify-lead-hook → qa-browser-matrix --all-previews (ожидается 194/194, 0 overflow; hero не менялся) → git diff --check.

Проверка: grep -c 'data-owner-copy-id="precedent-title-v1"' site/index.html site/gambarian-standalone.html build/variants/final-dev4/index.html → 1 1 1; grep -c 'svc-card__badge\|svc-eyebrow' site/gambarian-standalone.html → 0; все гейты код 0

### 11. Документы: owner-правки дословно, allowlist-статусы, синхронизация маркеров 1.3.0.

Файлы: `docs/CONTENT-OWNER-EDITS.md`, `docs/CONTENT-APPROVED.md`, `docs/CONTENT-SOURCE-MAP.md`, `docs/RESUME.md`, `docs/boards/2026-08-06-versions-links.md`, `docs/FINAL-QA-CHECKLIST.md`, `docs/tasks/2026-08-13-dark-fact-cards.md`, `docs/TYPOGRAPHY-DASHES.md`

CONTENT-OWNER-EDITS.md → v1.2.0, <ДАТА>: раздел «Правки владельцев 2026-09-06 (final-dev4, этап 2)» — для каждого нового owner-id: строка списка, заменённый клиентский блок, текст дословно, решение (№4 дословно; №5 ё/е как прислано; №6 точки как прислано; №19 «в юридической сфере» не унифицировать; 3.23 — юридическая фраза заверена заказчиком-адвокатами, чат 2026-09-06); отдельно allowlist-строки (лицензия без точки — строки 11/41/55; абзац «Ведёт» — строка 42; «Прием — Тель-Авив / онлайн» и «Карлибах, 10» — строка 13, пока только плашка); удаления (бейдж — строка 16; 5.6 — строка 50, №22; 5.17 — строка 57; образование Юлии — строка 62, №23); примечание 67 центр + bold (№24). CONTENT-APPROVED.md → v2.3.0: строка 25 → `v1.3.0` / `v1.1.0`: 26 targets / 24 unique / 45 client + 16 owner; у блоков 3.7, 3.8, 3.18, 3.22, 3.23, 3.28, 3.33, 3.38, 3.43, 4.5, 4.6, 5.9, 5.11, 5.13, 5.19 колонка «Разрешён» → «да (заменён owner-override <id>)», у 5.6 и 5.17 → «да (на сайте не используется)»; раздел OWNER-APPROVED Юлии → строки v2; новый раздел со списком 15 новых блоков. CONTENT-SOURCE-MAP.md → v2.3.0: :40 `CLIENT-COPY-CONTRACT v1.3.0 | <ДАТА>`, :42 `16 owner blocks`, блок Юлии → v2, добавить карту owner-id → секции. RESUME.md таблица: Client Copy contract `1.3.0` «45 client + 16 owner blocks»; Review Numbered `2.1.1`. boards: Client Copy contract `1.3.0` <ДАТА> («45 allowlist + 16 Owner overrides»), Review numbering `2.1.1`. FINAL-QA-CHECKLIST.md:55 → `1.3.0`, :62 → `2.1.1`, версия 2.3.2 → 2.3.3. dark-fact-cards.md:80 → `CLIENT-COPY-CONTRACT v1.3.0 | <ДАТА>`, версия документа 1.0.2 → 1.0.3. TYPOGRAPHY-DASHES.md: в §4 или §6 абзац «final-dev4: 15 защищённых тире (per-alias ожидание в verify-live-previews.py v1.2.1)», в §5 таблицу Было/Стало дополнить строками v2 Юлии (два пункта); версию документа поднять на patch. CONTENT-OWNER-REVISIONS-2026-09-06.md не редактировать (источник владельца; статус меняет архитектор).

Проверка: grep -rn 'CLIENT-COPY-CONTRACT v' scripts docs --include=*.py --include=*.md | grep -v 'docs/reviews\|HANDOFF\|ERRORS\|final-dev4-\|OWNER-EDITS' → везде v1.3.0 | <ДАТА>; grep -c 'Записаться к Юлии' docs/CONTENT-SOURCE-MAP.md docs/CONTENT-APPROVED.md → 0 0; grep -c 'svc-protection-lead-v1' docs/CONTENT-OWNER-EDITS.md → ≥1

### 12. Коммит, push, draft PR с отчётом.

Файлы: `docs/tasks/codex/2026-09-06-final-dev4-stage-2.md`

Один коммит `feat(final-dev4): owner texts verbatim, copy contract 1.3.0` (без идентификаторов моделей и trailer-ов). git push -u origin codex/final-dev4-s2-texts. Draft PR в main по .github/PULL_REQUEST_TEMPLATE.md (Type: New feature + Documentation; Related: PR #11 и PR этапа 1); в теле — отчёт по разделу «Отчёт» карточки, включая таблицу «строка списка → owner-id/allowlist → статус» для строк 11, 13, 15, 16, 18, 19, 24, 26, 27, 29, 32, 34, 37, 41, 42, 45, 46, 50, 53, 54, 55, 57, 61, 62, 64, 66, 67 и no-op 84–86.

Проверка: git log -1 --format=%H; git status --short → пусто; ссылка на PR; CI (workflow CI на PR) зелёный

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
- `после деплоя владельцем (Deploy Previews → ветка codex/final-dev4-s2-texts → only=final-dev4): python -B scripts/verify-live-previews.py --only final-dev4`
- `после деплоя: curl -sA gambarian-readback https://final-dev4.gambarian-landing.pages.dev/ | grep -c по каждому новому тексту (см. «Приёмка»); curl -sA gambarian-readback https://final-dev3.gambarian-landing.pages.dev/ | sha256sum (до/после совпадает); curl -sA gambarian-readback https://gambarian-landing.pages.dev/ | sha256sum → 656CBCD0…C13E22`

## Версии и маркеры

- scripts/client_copy_contract.py: CLIENT-COPY-CONTRACT 1.2.0 → 1.3.0 | <ДАТА> (docstring :3, CONTRACT_VERSION/DATE :11–12) → docs/RESUME.md таблица, docs/CONTENT-APPROVED.md:25, docs/CONTENT-SOURCE-MAP.md:40, docs/boards/2026-08-06-versions-links.md, docs/FINAL-QA-CHECKLIST.md:55, docs/tasks/2026-08-13-dark-fact-cards.md:80
- scripts/review_numbered_contract.py: REVIEW-NUMBERED 2.1.0 → 2.1.1 | <ДАТА> (снят yulia-card-v1, anchor yulia-card-v2) → RESUME, boards, FINAL-QA-CHECKLIST
- scripts/verify-live-previews.py: LIVE-PREVIEW-READBACK 1.2.0 → 1.2.1 | <ДАТА> (NBSP_EXPECTED final-dev4 23 → 15)
- Документы: CONTENT-OWNER-EDITS 1.1.0 → 1.2.0; CONTENT-APPROVED 2.2.1 → 2.3.0; CONTENT-SOURCE-MAP 2.2.1 → 2.3.0; FINAL-QA-CHECKLIST 2.3.2 → 2.3.3; DARK-FACT-CARDS 1.0.2 → 1.0.3; TYPOGRAPHY-DASHES patch — все с датой <ДАТА>
- Не меняются: CLIENT-COPY-VERIFIER 1.1.0, карта Preview 2.5.0, FINAL-DEV4-DESIGN 1.0.0, FINAL-DEV3-DESIGN 2.0.2, Action Bar 2.4.0, runner 1.4.2, Lead schema 2.0.0, JSON-LD

## Приёмка этапа

- [ ] git diff --stat docs/sources/client-copy-short-v1.0.0.txt пустой; APPROVED_COPY_ITEMS без изменений (45 блоков); frozen SHA в PASS-строке verify-client-copy прежний
- [ ] python -B scripts/verify-client-copy.py → PASS CLIENT-COPY-VERIFIER v1.1.0: 26 HTML targets, 24 unique files, client-copy allowlist 45 IDs, owner-approved 16 block; contract v1.3.0 | <ДАТА>
- [ ] python -B scripts/verify-client-previews.py → PASS (12 Preview, без KeyError); python -B scripts/build-review-numbered.py → PASS, 16 owner-бейджей в порядке источника
- [ ] python -m unittest discover -s scripts/tests → OK, включая drift-тесты всех 15 новых owner-блоков и yulia-card-v2
- [ ] grep -o '&nbsp;—' site/index.html | wc -l = 15 и grep -o '&nbsp;—' build/variants/final-dev4/index.html | wc -l = 15 = NBSP_EXPECTED["final-dev4"]
- [ ] В site/index.html и site/gambarian-standalone.html: 0 вхождений data-copy-id 3.7/3.8/3.18/3.22/3.23/3.28/3.33/3.38/3.43/4.5/4.6/5.6/5.9/5.11/5.13/5.17/5.19; по одному data-owner-copy-id для 15 новых id; 0 вхождений svc-card__badge/svc-eyebrow/«Записаться к Юлии»/«Высшее юридическое образование»/yulia-card-v1; class="map-link" = 3
- [ ] Точки: sed -n '132,145p' site/index.html | grep -c '30178\.' = 0; секция услуг: grep -c 'лицензия №&nbsp;30178<' = 8 и '30178\.' = 0; карточка Александра: ни один span в .checklist не оканчивается точкой; у Юлии пункт 4 с точкой, остальные без — как прислано
- [ ] Тексты сверены побайтно с колонкой «Правка» (ё/е и точки): «Прием», «ребенка» (3.18, 4.5), «перемещенного», «с учетом» — через е; «ребёнка» (4.6, 5.11), «договорённости» — через ё
- [ ] JSON-LD не изменён (jobTitle с точкой, streetAddress «Карлибах 10») — python -B scripts/verify-client-copy.py без ошибок JSON-LD; aria-label карты без изменений
- [ ] CSS: .attorneys__note — text-align center, margin-inline auto, font-weight 700; правила бейджа удалены; qa-browser-matrix --all-previews 194/194 без overflow; скриншоты 1440/390 секции адвокатов и прецедента приложены в PR (визуально: примечание по центру и жирное, заголовок прецедента 5–7 строк без nowrap)
- [ ] Маркеры CLIENT-COPY-CONTRACT v1.3.0 | <ДАТА> во всех источниках из раздела «Версии»; CONTENT-OWNER-EDITS v1.2.0 содержит все 15 owner-текстов дословно и 4 allowlist-строки
- [ ] После деплоя: verify-live-previews.py --only final-dev4 PASS (15 тире); curl … | grep -c: 'Развод по взаимному согласию и представительство' = 1, 'Бракоразводные процессы</h3>' = 1, 'незаконно удерживаемых детей' = 1, 'генетическая экспертиза' = 1, 'оформляет договорённости' = 1, 'Разработка брачного договора' = 1, 'не дожидаясь ответа через сайт' = 1, 'неправомерно перемещ' = 1, 'по делу о возвращении' = 1, 'data-copy-id="5.6"' = 0, 'Записаться к Юлии' = 0, 'полное сопровождение, включающее' = 1, 'svc-eyebrow' = 0, 'Соглашения и споры о месте' = 0, 'Карлибах,&nbsp;10' = 1; SHA-256 final-dev3 и production не изменились

## Отчёт в PR (обязательные поля)

- Хэш коммита, подтверждение push в origin/codex/final-dev4-s2-texts, ссылка на draft PR и на PR этапа 1 (база ветки)
- Diff-доказательство: git diff --stat; таблица «строка списка → data-copy-id/owner-id → файл:строка → новый текст» для всех 27 строк этапа и no-op 84–86; явно: diff docs/sources пустой, APPROVED_COPY_ITEMS без изменений
- Дословный вывод гейтов: verify-client-copy (PASS-строка с owner-approved 16 block, contract v1.3.0), unittest (OK, N тестов), verify-client-previews (PASS 12), build-review-numbered (список бейджей), verify-lead-hook, qa-browser-matrix summary (194/194), git diff --check
- Счётчик тире: вывод grep -o '&nbsp;—' … | wc -l для site/index.html и build/variants/final-dev4/index.html (15) и значение в verify-live-previews.py
- Скриншоты 1440 и 390: секция услуг (панель 1 и 4), прецедент, карточки адвокатов с примечанием — как визуальная проверка, не как приёмка
- Проверено / Не проверено: не проверено до деплоя — live final-dev4 и байтовый readback final-dev3/production; не проверено — JSON-LD/aria-label/подвал (этап 3), высота панелей услуг после укорочения текстов (этап 6), шрифт заголовков (этап 7)
- Вопросы владельцу: ожидается «нет»; если при переносе найдено расхождение колонки «Правка» с разбором — не править самостоятельно, описать

## Риски

- Любая «редактура» (ё↔е, точка, регистр, « · » вместо запятой) нарушает решения №4–6: сверять каждую строку с колонкой «Правка», не с разбором и не с памятью
- Забытая пересборка site/gambarian-standalone.html → verify-client-copy FAIL на source:standalone или расхождение с CI
- Если этап 1 не влит и ветка создана не от него — KeyError в verify-client-previews/qa-browser-matrix на новых owner-id; предпосылки шага 1 обязательны
- Удаление бейджа, укорочение 3.7/3.33 и рост 4.5/4.6 меняют высоту панелей и карточки прецедента — ожидаемо, выравнивание делает этап 6/7; не «чинить» отступами здесь
- Жирный абзац 15px на 68ch спорит по весу с кнопками .btn--gold-block (600) — решение владельца №24, отметить в скриншотах для дизайнера
- На странице временно два написания адреса (плашка «Прием … Карлибах, 10» и контакты/подвал «Приём … Карлибах 10») и точка в JSON-LD jobTitle — до этапа 3; отметить в «Не проверено»
- Live readback других 10 alias по-прежнему FAIL (они отдают релиз 75558d9) — запускать только --only final-dev4

## Проверка карточки критиком

скоуп: ок; пути: ок; гейты: ок; промпт: ок.

Правки критика, обязательные к применению исполнителем:

- Необязательно: в шаге 6 можно вместе с новыми allowlist-строками пометить старые «Адвокат Израиля, лицензия № 30178.» / «Приём — Тель-Авив / онлайн» как «после этапа 3 удалить», чтобы этап 3 не искал их заново

Все номера строк index.html (:135, :143, :155, :178–181…, :182–183, :241, :269–270, :299, :328, :357, :386, :195/:199 ×8, :432–433, :446–448, :460–465, :471, :477, :481–487, :492), styles.css (:763–787, :1108) совпадают; счётчик тире 23 → +1 (второе тире 3.8) −8 («Ведёт») −1 (5.17) = 15 верен (3.28 и 4.6 сохраняют по одному тире); OWNER_APPROVED_COPY 2 → 16, тесты 13 → 14, map-link 4 → 3, heart-path 'M20.84 4.61' есть. Тексты сверены с колонкой «Правка» (ё/е, точки, заглавная). Открытые №15/№20 применены только по умолчанию и задокументированы.

## Промпт для Codex

Вставить в Codex CLI в корне репозитория на ветке этапа:

```text
Ты работаешь в корне репозитория gambaryan-family-law. Этап 2 цикла final-dev4: «Тексты дословно» — перенос правок владельцев в общий site/ и контракт копирайта 1.3.0.

Сначала прочитай по порядку: AGENTS.md → docs/RESUME.md → docs/CODEX-WORKING-MODEL.md → карточку docs/tasks/codex/2026-09-06-final-dev4-stage-2.md → в docs/tasks/2026-09-06-final-dev4-spec.md «Реестр решений владельца» (№4, 5, 6, 19, 22, 23, 24) и «Правила для исполнителя» → пункты A:HF-06, A:HF-07, B:G-01…G-04, G-06…G-12, G-14, G-15, C:G-01…G-03, G-05, G-07, G-08, G-10…G-14 в docs/tasks/2026-09-06-final-dev4-items.md → docs/CONTENT-OWNER-REVISIONS-2026-09-06.md (единственный источник текстов: колонка «Правка», дословно; пустая «Правка» = текст не меняется, действует только заметка «Убрать точку»/«стереть»).

Предпосылка: этап 1 (codex/final-dev4-s1-prep) уже в базе — в scripts/review_numbered_contract.py есть svc-h2-v1, в verify-live-previews.py словарь NBSP_EXPECTED. Ветка: от main после слияния этапа 1 (если не влит — от codex/final-dev4-s1-prep, укажи это в PR): git checkout -b codex/final-dev4-s2-texts.

Сделай шаги 2–12 карточки строго по её таблице «строка списка → id → файл:строка → текст»: плашка (строки 11, 13); H2 услуг svc-h2-v1, удаление бейджа с сердечком ×8, лиды/заголовки панелей 3.7, 3.8, 3.18, 3.22 (одной строкой, без <br>), 3.23, 3.28, 3.33, 3.38, 3.43 → data-owner-copy-id svc-*-v1, лицензия без точки ×8, абзац «Ведёт» ×8; прецедент precedent-title-v1/precedent-body-v1; удалить h2 5.6 (черта остаётся); ul Александра → alexander-card-v1 (5.9/5.11/5.13 без точек и без data-copy-id, 5.15 остаётся вложенным, 5.17 удалить); карточка Юлии → yulia-card-v2 (строка 61 новая, строка об образовании удалить, строка 64 с точкой, кнопка «Записаться на консультацию»); примечание → attorneys-note-v1, CSS: центр + font-weight 700; удалить мёртвый CSS бейджа. Затем контракт: OWNER_APPROVED_COPY (+15, −yulia-card-v1), 4 allowlist-строки, токен yulia-card-v2, CONTRACT 1.3.0 с датой; review_numbered_contract 2.1.1 (без yulia-card-v1, anchor v2); verify-live-previews: final-dev4 → 15, readback 1.2.1; unit-тесты (Юлия v2 + drift-тесты 15 новых блоков); документы по шагу 11.

Тире в видимом тексте только `&nbsp;—`; ё/е и точки — строго как прислано (сверяй каждую строку с колонкой «Правка»). Не трогать: docs/sources/*, APPROVED_COPY_ITEMS, JSON-LD, aria-label карты, адрес в контактах/подвале, кубики фактов, порядок вкладок, шрифты, site-addons, final-dev3, production, wrangler, поле only пустым, идентификаторы моделей в коммите/PR. Если решения не хватает — остановись на пункте, сделай остальное, опиши вопрос в отчёте.

Гейты по порядку: build-preview --standalone (обязательно после правок), build-font-variants, build-hero-variants, build-action-bar, build-review-numbered, verify-client-copy (ожидается owner-approved 16 block, contract v1.3.0), python -m unittest discover -s scripts/tests, verify-client-previews (12), node scripts/verify-lead-hook.mjs, python -m http.server 8098 + python scripts/qa-browser-matrix.py http://127.0.0.1:8098/ --all-previews (194/194), git diff --check; grep -o '&nbsp;—' build/variants/final-dev4/index.html | wc -l → 15.

Один коммит `feat(final-dev4): owner texts verbatim, copy contract 1.3.0`, push, draft PR в main по .github/PULL_REQUEST_TEMPLATE.md с отчётом: хэш и push, diff-доказательство (таблица строка→id→файл→текст, пустой diff docs/sources), дословный вывод гейтов, счётчик тире, скриншоты 1440/390, «Проверено / Не проверено / Вопросы владельцу». Деплой делает владелец: Deploy Previews → ветка codex/final-dev4-s2-texts → only=final-dev4.
```

## Related

- [Модель работы с Codex](../../CODEX-WORKING-MODEL.md)
- [Задание final-dev4](../2026-09-06-final-dev4-spec.md)
- [Разбор по пунктам](../2026-09-06-final-dev4-items.md)
- [Реестр текстов владельца](../../CONTENT-OWNER-REVISIONS-2026-09-06.md)
- [Рекомендации дизайнеров](../../DESIGN-RECOMMENDATIONS-2026-09-06.md)

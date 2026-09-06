# Этап 6: Секция услуг: новый порядок вкладок, окошко одной высоты с неподвижными «Ведёт» и CTA, стрелки снаружи/в шапке, одна строка тем и свайп с упором на мобильном; runner 1.5.0

**Версия:** `FINAL-DEV4-STAGE-6 v1.0.0`

**Дата:** `2026-09-06`

**Ветка:** `codex/final-dev4-s6-services` → draft PR в `main`

**Исполнитель:** Codex CLI; уровень рассуждений: **max (перестройка интерфейса)** — Полная перестройка интерфейса секции одной архитектурой для desktop и mobile: смена DOM (8 панелей в одной ячейке, единственные «Ведёт»/CTA, перестановка id/aria), новая модель состояния (упор вместо кольца, disabled-стрелки, автопрокрутка табов), жест на Pointer Events без конфликта с вертикальной прокруткой и Action Bar, плюс runner 1.5.0 с восемью новыми гейтами, которые сами синтезируют события; ошибка в любой связке даёт либо разъезд desktop/mobile, либо ложные failures на всех 12 Preview — уровень max по CODEX-WORKING-MODEL (перестройка UI).

**Приёмка:** Claude (облачная сессия) по `docs/CODEX-WORKING-MODEL.md`; слияние — владелец.

## Цель

В общем site/ секция #services перестроена одной архитектурой для desktop и mobile: вкладки, панели и точки идут в порядке владельца (Развод, Алименты, Раздел имущества, Дети, Отцовство, Медиация, Брачный договор; «Защита при угрозах» — последней по умолчанию), все 8 панелей лежат в одной grid-ячейке .svc-stage и потому имеют одну высоту с вертикальным центрированием текста, единственный блок «Ведёт» справа и единственная красная кнопка «Записаться на консультацию» вынесены из панелей и не двигаются при смене темы ни на desktop, ни на mobile. Стрелки на desktop стоят снаружи окошка по центру высоты, на mobile — в шапке окошка рядом с названием темы; на краях списка стрелка бледнеет (упор, по умолчанию №7; клавиатура остаётся по кругу). На ≤860px строка тем — одна горизонтально прокручиваемая с подсветкой и автопрокруткой активной темы, окошко листается горизонтальным жестом (Pointer Events, touch-action: pan-y, без scroll-listener), точки-индикаторы сохранены. Тексты не меняются, контракт копирайта не бампится, «Ведёт» для Юлии не собирается (№18 открыт). Runner qa-browser-matrix 1.5.0 получает гейты: одна строка табов, порог высоты секции на 390 (≤1220px), равная высота панелей, неподвижность .svc-media/.svc-card__cta, положение и размер стрелок (44px), упор, свайп (влево/вправо/вертикаль/край), запрет тумблеров в кубиках вместо старого toggle-missing.

## Основание

- Решения владельца (реестр в `../2026-09-06-final-dev4-spec.md`): №7, №15, №17, №21
- Пункты разбора (`../2026-09-06-final-dev4-items.md`): `B:G-12`, `B:G-13`, `B:G-16`, `B:G-17`, `B:G-18`, `E:G-06`, `F:M-03`, `F:M-04`
- Открытые вопросы, выполняемые «по умолчанию» (переделать при другом ответе):
  - №15 (часть) — «Защита при угрозах» остаётся последней вкладкой/панелью/точкой
  - №16 — меню тем на mobile: одна прокручиваемая строка чипов с подсветкой активной темы, правый край затухает (mask), активная тема автоматически подъезжает в видимую зону
  - №17 (стрелки) — desktop: снаружи окошка, по центру его высоты (position:absolute относительно .svc-window с padding-inline 64px); mobile: в шапке окошка справа рядом с названием темы (title получает padding-right под две кнопки 44px)
  - №7 (упор) — после последней темы дальше не листается: стрелки disabled/бледнеют на краях, свайп у края — no-op; то же на desktop; клавиатура ArrowLeft/Right в tablist остаётся по кругу (рекомендация дизайнера: «управление с клавиатуры как сейчас»)
  - Архитектурные умолчания: единая CTA неподвижна на обоих viewport (строка 43 + №17-cta); точки-индикаторы сохраняются (№7 «стрелки + точки»); порог высоты секции на 390px ≤ 1220px (F:M-03, зафиксирован до реализации); порог жеста 40px и |dx| > |dy|; переключение — только opacity-transition 0.2s, отключаемая prefers-reduced-motion; panel.hidden сохраняется как источник состояния (CSS переопределяет display для скрытых панелей на visibility:hidden ради равной высоты)

## Не в скоупе этапа

- Блок «Ведёт» для Юлии (фото, имя, лицензия, абзац) — открытый №18, данных нет: собирается один блок с Александром; смена персоны по теме не программируется (B:G-13 остаётся отложенным)
- Удаление вкладки «Защита при угрозах» — открытая часть №15: вкладка и панель svc-panel-8 остаются последними (B:G-12 текст уже перенесён этапом 2)
- Тексты вкладок, панелей, «Ведёт» — этап 2; здесь только перенос существующих элементов с атрибутами; новых служебных слов (подсказка «свайпните», счётчик «1 из 8», aria-label регионов) не вводить — иначе нужен bump контракта копирайта
- Шрифт заголовков .svc-title/.svc-media__name (курсив, Playfair) — этап 7; italic-sample runner (.svc-title) не менять
- Отступы секций (--section-pad, .services__head margin) — этап 7; здесь только геометрия окошка
- OPEN B6/B7 чек-листа (контраст .svc-media__label, hover/transition табов и точек) — не в реестре решений
- Action Bar, site-addons/final-dev3, final-dev4-адаптер — не трогать; горизонтальный жест не должен срабатывать поверх fixed-панели (панель вне .svc-stage)
- Frozen source, production, final-dev3, wrangler, поле only пустым
- Правка docs/tasks/2026-09-06-final-dev4-spec.md (реестр решений, открытые вопросы, версия) — ведёт архитектор; Codex пишет только отчёт в PR и docs/tasks/<ДАТА>-mobile-services.md

## Шаги

### 1. Создать ветку этапа от main после слияния этапа 5, проверить предпосылки, зафиксировать точку отсчёта.

Файлы: `site/index.html`, `scripts/qa-browser-matrix.py`, `scripts/verify-live-previews.py`, `scripts/review_numbered_contract.py`

git fetch origin && git checkout main && git pull --ff-only && git checkout -b codex/final-dev4-s6-services (если PR этапа 5 не влит — от codex/final-dev4-s5-facts, указать в PR). Прочитать AGENTS.md → docs/RESUME.md → docs/CODEX-WORKING-MODEL.md → карточку → spec «Реестр решений владельца» (№7, 15, 17, 21), «Открытые вопросы» (№7-упор, №15-«Защита», №16, №17-стрелки — по умолчанию; №18 — не делать), «Порядок реализации» п.6 → items B:G-12, B:G-13, B:G-16, B:G-17, B:G-18, E:G-06, F:M-03, F:M-04 → docs/DESIGN-RECOMMENDATIONS-2026-09-06.md №7, №15 (в сводке), №16, №17 → docs/GAMBARIAN-DESIGN-RULES.md «Spacing и geometry», «States и motion» → docs/CONTENT-OWNER-REVISIONS-2026-09-06.md строки 43, 94, 96 (заметки, не тексты). Предпосылки: этап 2 — в #services нет .svc-card__badge, есть data-owner-copy-id svc-*; этап 5 — в .facts нет <p>, runner 1.4.2; readback 1.3.0. Записать в отчёт: grep -c 'class="svc-media"' site/index.html (8), число «&nbsp;—» (ожидаемо 15), текущий порядок вкладок, отсортированный список всех data-copy-id/data-owner-copy-id секции (для сверки после перестановки).

Проверка: git branch --show-current → codex/final-dev4-s6-services; grep -c 'svc-card__badge' site/index.html → 0; grep -c 'data-owner-copy-id="svc-' site/index.html → 10; grep -n 'RUNNER_VERSION' scripts/qa-browser-matrix.py → 1.4.2; grep -o 'data-\(owner-\)\?copy-id="[^"]*"' site/index.html | sort > /tmp/ids-before.txt

### 2. Перестроить разметку #services: новый порядок, одна .svc-stage с 8 панелями, единственные CTA и «Ведёт», стрелки в .svc-window.

Файлы: `site/index.html`

В .services__head оставить <div> с .eyebrow «Семейное право», h2[data-owner-copy-id="svc-h2-v1"] и .rule.rule--flush; блок .services__arrows из шапки ВЫРЕЗАТЬ (не удалять — переносится). .svc-tabs[role=tablist]: кнопки переставить в порядок Развод, Алименты, Раздел имущества, Дети, Отцовство, Медиация, Брачный договор, Защита при угрозах; id svc-tab-1…8 и aria-controls svc-panel-1…8 перенумеровать по новой позиции; is-active/aria-selected="true"/без tabindex — только у первой, у остальных aria-selected="false" tabindex="-1". После .svc-tabs — новый блок: <div class="svc-window"> + перенесённый <div class="services__arrows"> (обе кнопки .svc-arrow с data-dir и svg дословно) + <div class="svc-frame"><div class="svc-frame__main"><div class="svc-stage"> … 8 панелей … </div><a class="svc-card__cta" href="#contact">Записаться на консультацию</a></div> + ОДИН <div class="svc-media">…</div> (содержимое текущего блока «Ведёт» после этапа 2: .svc-media__label, .svc-media__person с picture/img alt="Адвокат Александр Гамбарян", .svc-media__name, .svc-media__license «Адвокат Израиля, лицензия №&nbsp;30178», .notch, <p>«Более 30 лет профессионального опыта в юридической сфере. Работа с клиентами на русском, иврите и английском языках.») </div></div></div>. Каждая панель: <div class="svc-card" role="tabpanel" id="svc-panel-N" aria-labelledby="svc-tab-N"> с h3.svc-title и p.svc-lead, перенесёнными дословно со всеми атрибутами (data-copy-id 3.12/3.13/3.27/3.17/3.32/3.37/3.42, data-owner-copy-id svc-*), в новом порядке: 1 Развод (svc-divorce-title-v1 / svc-divorce-lead-v1), 2 Алименты (3.12 / 3.13), 3 Раздел имущества (3.27 / svc-property-lead-v1), 4 Дети (3.17 / svc-children-lead-v1), 5 Отцовство (svc-paternity-title-v1 / svc-paternity-lead-v1), 6 Медиация (3.32 / svc-mediation-lead-v1), 7 Брачный договор (3.37 / svc-prenup-lead-v1), 8 Защита при угрозах (3.42 / svc-protection-lead-v1). Обёртки .svc-card__inner/.svc-card__main, семь дублей .svc-card__cta и семь дублей .svc-media удалить. .svc-dots: точки в том же новом порядке (aria-label = название темы), aria-current="true" только у первой. Новых текстов и aria-label не добавлять.

Проверка: grep -o 'data-\(owner-\)\?copy-id="[^"]*"' site/index.html | sort | diff - /tmp/ids-before.txt → пусто (набор id не изменился); grep -c 'class="svc-media"' site/index.html → 1; grep -c 'class="svc-card__cta"' site/index.html → 1; grep -c 'class="svc-card" role="tabpanel"' site/index.html → 8; grep -c 'svc-card__inner\|svc-card__main' site/index.html → 0; grep -o 'id="svc-tab-[0-9]"[^>]*>[^<]*' site/index.html | sed 's/.*>//' | tr '\n' ',' → Развод,Алименты,Раздел имущества,Дети,Отцовство,Медиация,Брачный договор,Защита при угрозах; grep -o 'class="svc-dot"[^>]*aria-label="[^"]*"' site/index.html | sed 's/.*aria-label="//;s/"//' | tr '\n' ',' → тот же порядок; python -c "import re;h=open('site/index.html',encoding='utf-8').read();t=re.findall(r'id=\"svc-tab-(\d)\" aria-controls=\"svc-panel-(\d)\"',h);p=re.findall(r'id=\"svc-panel-(\d)\" aria-labelledby=\"svc-tab-(\d)\"',h);print(all(a==b for a,b in t+p),len(t),len(p))" → True 8 8; grep -c 'class="svc-window"\|class="svc-frame"\|class="svc-frame__main"\|class="svc-stage"' site/index.html → 4

### 3. CSS окошка: одна высота, центрирование, неподвижные CTA/«Ведёт», стрелки снаружи (desktop) и в шапке (mobile), одна строка табов на mobile.

Файлы: `site/styles.css`

Блок «4. Услуги» (~693–895). .services__head: убрать зависимость от стрелок (justify-content/flex-end не обязательны), margin-bottom 34px оставить. НОВОЕ: .svc-window { position: relative; padding-inline: 64px; } (место под стрелки 44px + 20px); .services__arrows — больше не flex-ряд: .svc-arrow { position: absolute; top: 50%; transform: translateY(-50%); z-index: 1; } .svc-arrow[data-dir="prev"] { left: 0; } .svc-arrow[data-dir="next"] { right: 0; } (размер 44×44, круг, цвета — прежние), .svc-arrow:disabled { opacity: .35; cursor: default; } .svc-arrow:disabled:hover { border-color: rgba(255,255,255,.18); } .svc-arrow:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }. Старые стили .svc-card (position/background/border/radius/padding clamp(26px,4vw,46px)) перенести на .svc-frame и добавить display:flex; flex-wrap: wrap; gap: clamp(24px, 4vw, 56px) (бывший .svc-card__inner). .svc-frame__main { flex: 1 1 380px; min-width: 0; display: flex; flex-direction: column; } .svc-stage { display: grid; flex: 1 1 auto; min-width: 0; touch-action: pan-y; } .svc-card { grid-area: 1 / 1; display: grid; align-content: center; min-width: 0; transition: opacity .2s ease; } .svc-card[hidden] { display: grid; visibility: hidden; opacity: 0; pointer-events: none; } (ЗАМЕНЯЕТ .svc-card[hidden] { display: none; } — скрытые панели остаются в одной ячейке, поэтому высота ячейки = самая высокая панель, текст центрируется в ней). .svc-lead { margin: 0; } (нижний отступ переезжает на кнопку); .svc-card__cta { margin-top: 28px; align-self: flex-start; } — остальное прежнее. .svc-media без изменений (flex 0 1 300px, border-left, justify-content center, align-self stretch). В @media (prefers-reduced-motion: reduce) добавить .svc-card { transition: none; }. МОБИЛЬНЫЙ блок @media (max-width: 860px): .svc-window { padding-inline: 0; } .svc-frame { flex-direction: column; flex-wrap: nowrap; gap: 24px; padding: 22px 20px 24px; } .svc-arrow { top: 22px; transform: none; } .svc-arrow[data-dir="prev"] { left: auto; right: 72px; } .svc-arrow[data-dir="next"] { right: 20px; } .svc-title { padding-right: 104px; min-height: 44px; } (заголовок темы рядом со стрелками, не под ними) .svc-media { flex: none; min-width: 0; border-left: 0; padding-left: 0; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; } .svc-tabs { flex-wrap: nowrap; overflow-x: auto; overscroll-behavior-x: contain; margin-inline: calc(var(--pad-x) * -1); padding-inline: var(--pad-x); scroll-padding-inline: var(--pad-x); scrollbar-width: none; -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 28px), transparent); mask-image: linear-gradient(90deg, #000 calc(100% - 28px), transparent); } .svc-tabs::-webkit-scrollbar { display: none; } .svc-tab { flex: none; min-height: 44px; }. Порядок в столбике mobile: панели → CTA → «Ведёт» (DOM-порядок из шага 2, доп. правил не нужно). Ничего в .facts, Hero, Action Bar не трогать.

Проверка: grep -c '^\.svc-window\|^\.svc-frame\|^\.svc-frame__main\|^\.svc-stage' site/styles.css → 4; grep -c 'svc-card\[hidden\] { display: none' site/styles.css → 0; grep -c 'svc-card__inner\|svc-card__main' site/styles.css → 0; grep -c 'touch-action: pan-y' site/styles.css → 1; grep -c 'svc-arrow:disabled' site/styles.css → ≥1; awk '/@media \(max-width: 860px\)/,0' site/styles.css | grep -c 'svc-tabs\|svc-arrow\|svc-media\|svc-frame' → ≥6

### 4. app.js: упор для стрелок/точек/свайпа, disabled на краях, автопрокрутка активной темы, свайп на Pointer Events; клавиатура по кругу.

Файлы: `site/app.js`

Блок «Карусель направлений» (~131–203). Добавить var last = panels.length - 1; var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)'); var stage = document.querySelector('.svc-stage'); prev/next искать до setActive. setActive(index, moveFocus, wrap): active = wrap ? (index + panels.length) % panels.length : Math.max(0, Math.min(index, last)); далее прежняя синхронизация tabs/dots/panels (panel.hidden = i !== active — оставить), затем if (prev) prev.disabled = active === 0; if (next) next.disabled = active === last; и scrollTabIntoView(tabs[active]): если tablist && tablist.scrollWidth > tablist.clientWidth — tablist.scrollTo({ left: tab.offsetLeft - (tablist.clientWidth - tab.offsetWidth) / 2, behavior: reduceMotion.matches ? 'auto' : 'smooth' }) — только горизонтальная прокрутка контейнера, не scrollIntoView (иначе страница прыгает по вертикали). Клавиатура в tablist: ArrowRight/Down → setActive(active + 1, true, true), ArrowLeft/Up → setActive(active - 1, true, true) (по кругу, как сейчас), Home/End без изменений. Стрелки и точки — setActive(i) без wrap (упор). Свайп: if (stage) { var swipe = null; stage.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' || !e.isPrimary) return; swipe = { id: e.pointerId, x: e.clientX, y: e.clientY }; }); function finish(e) { if (!swipe || e.pointerId !== swipe.id) return; var dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; swipe = null; if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) setActive(active + (dx < 0 ? 1 : -1)); } stage.addEventListener('pointerup', finish); stage.addEventListener('pointercancel', function () { swipe = null; }); } — без pointermove, без preventDefault (вертикальную прокрутку отдаёт браузеру touch-action: pan-y), без setTimeout, без scroll-listener, без localStorage. Вызов setActive(0) в конце оставить. Комментарий блока обновить (упор, свайп, одна строка тем).

Проверка: node --check site/app.js; grep -c "pointerType\|pointerdown\|pointerup\|pointercancel" site/app.js → 4; grep -c "addEventListener(\"scroll\"\|addEventListener('scroll'" site/app.js → 0 (как в base); grep -c 'scrollIntoView' site/app.js → 0; grep -c 'setTimeout\|setInterval' site/app.js → как в base (новых нет)

### 5. Review-numbered 2.2.1: порядок ключей OWNER_REVIEW_IDS как в новом source.

Файлы: `scripts/review_numbered_contract.py`

Переставить ключи OWNER_REVIEW_IDS в порядок появления в site/index.html после шага 2: fact-30-v1, fact-precedent-v1, fact-900-v2, svc-h2-v1, svc-divorce-title-v1, svc-divorce-lead-v1, svc-property-lead-v1, svc-children-lead-v1, svc-paternity-title-v1, svc-paternity-lead-v1, svc-mediation-lead-v1, svc-prenup-lead-v1, svc-protection-lead-v1, precedent-title-v1, precedent-body-v1, alexander-card-v1, yulia-card-v2, attorneys-note-v1 (значения не менять). REVIEW_NUMBERED_VERSION = "2.2.1", REVIEW_NUMBERED_UPDATED = "<ДАТА>". Проверки этапа 1 source-derived, поэтому это синхронизация, а не починка; build-review-numbered.py не менять.

Проверка: python -B scripts/build-review-numbered.py → «Проверка пройдена»; grep -o 'data-review-id="[^"]*"' build/variants/review-numbered/index.html | sed 's/data-review-id=//' | tr '\n' ' ' → "2.6" "2.10" "2.14" "3.H2" "3.7" "3.8" "3.28" "3.18" "3.22" "3.23" "3.33" "3.38" "3.43" "4.5" "4.6" "5.9–5.13" "5.18" "5.19"; python -c "import sys,re;sys.path.insert(0,'scripts');from review_numbered_contract import OWNER_REVIEW_IDS as o;src=[v for k,v in re.findall(r'data-(copy|owner-copy)-id=\"([^\"]+)\"',open('site/index.html',encoding='utf-8').read()) if k=='owner-copy'];print(list(o)==src)" → True

### 6. Runner qa-browser-matrix 1.5.0: гейты окошка услуг, одной строки табов, высоты секции, свайпа и запрета тумблеров в кубиках.

Файлы: `scripts/qa-browser-matrix.py`

RUNNER_VERSION = "1.5.0"; docstring :2 → PREVIEW-BROWSER-QA-RUNNER v1.5.0 | <ДАТА>; в описании заменить «collapsed and expanded mobile accordion states» на «fact cards without accordion toggles; services window (equal panel height, fixed «Ведёт»/CTA, arrows, single tab row, swipe)»; итог 194/194 не меняется (новые проверки внутри ячеек). (а) Кубики: в browser_metrics селектор head → const head = card.querySelector('.fact-card__title') (guard ширины заголовка), hasExpandableContent → hasClampedParagraph: p && p.scrollHeight > p.clientHeight; блок setFactCardsExpanded/factCardAccordion упростить до одного замера; в validate_metrics: togglePresent → failure fact-card-accordion-forbidden copy-id=… (№21: тумблеров нет); hasClampedParagraph && !togglePresent → fact-card-mobile-accordion-toggle-missing (остаётся на случай возврата абзацев); coverage/state-проверки убрать. (б) Новый объект metrics.services из page.evaluate (после ожидания document.fonts.ready): tabsRows = число уникальных Math.round(rect.top) у .svc-tab; tabsScrollable = tablist.scrollWidth > tablist.clientWidth; servicesHeight = .services rect.height; mediaCount/ctaCount = число .svc-media/.svc-card__cta; frame = .svc-frame rect; arrows = {prev,next}: rect, disabled; panelHeights = все .svc-card rect.height (скрытые visibility:hidden тоже измеряются); для каждого индекса 0…7: клик по .svc-dot[i] (dot.click()), два rAF, запись rect .svc-media и .svc-card__cta (top,left,width,height), title rect; после последнего — next.disabled; вернуться к 0 и записать prev.disabled. (в) Свайп (только innerWidth ≤ 860): функция swipe(dx, dy) — на .svc-stage dispatchEvent(new PointerEvent('pointerdown', {pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: 300, clientY: y, bubbles: true})) затем 'pointerup' с clientX: 300 + dx, clientY: y + dy; два rAF; активный индекс = tabs.findIndex(aria-selected=true). Последовательность: из 0 swipe(-120,0) → 1; swipe(120,0) → 0; swipe(120,0) → 0 (упор); swipe(0,100) → 0 (вертикаль не переключает); swipe(-30,0) → 0 (ниже порога); перейти на 7 (dot.click) и swipe(-120,0) → 7 (упор); вернуться на 0. Результаты — в metrics.services.swipe. (г) validate_metrics: mediaCount != 1 → svc-media-count=N; ctaCount != 1 → svc-cta-count=N; max−min panelHeights > 1 → svc-panels-unequal-height=…; любой rect .svc-media/.svc-card__cta отличается от rect при индексе 0 более чем на 1px → svc-media-moved / svc-cta-moved index=i; ширина/высота стрелок < 44 → svc-arrow-target; prev.disabled at 0 != true или next.disabled at 7 != true → svc-edge-stop; width ≥ 861: |arrowCenterY − frameCenterY| > 2 или prev.right > frame.left или next.left < frame.right → svc-arrows-desktop-position; width ≤ 860: tabsRows != 1 → svc-tabs-rows=N; arrow.top < frame.top или arrow.bottom > titleRect.bottom + 44 → svc-arrows-mobile-position; ошибки свайпа → svc-swipe-next-failed / svc-swipe-prev-failed / svc-swipe-edge-not-stopped / svc-swipe-vertical-switched / svc-swipe-threshold; width == 390: servicesHeight > 1220 → services-height-390=N. Все проверки — для всех targets (site/ общий), имена failure стабильные. help --all-previews и docstring обновить.

Проверка: python scripts/qa-browser-matrix.py http://127.0.0.1:8098/build/variants/final-dev4/ --target-name final-dev4 → все cells PASS, в metrics.services есть swipe с шестью результатами; python scripts/qa-browser-matrix.py http://127.0.0.1:8098/ --all-previews → summary totals 194/194; временно вернуть .svc-card[hidden] { display: none; } в build/variants/final-dev4/styles.css → cell FAIL svc-panels-unequal-height; вернуть (пересобрать)

### 7. Пересобрать standalone и все производные, прогнать полный набор гейтов.

Файлы: `site/gambarian-standalone.html`, `build/variants/final-dev4`

python -B scripts/build-preview.py site/gambarian-standalone.html --standalone (обязательно: инлайнит app.js/styles.css) → build-font-variants → build-hero-variants → build-action-bar → build-review-numbered → verify-client-copy (контракт не менялся: та же PASS-строка, что после этапа 5) → unittest → verify-client-previews → verify-lead-hook → python -m http.server 8098 (фон, из корня) → verify-business-hours и verify-address-links по локальной сборке final-dev4 → qa-browser-matrix final-dev4 и --all-previews → git diff --check. Число «&nbsp;—» в build/variants/final-dev4/index.html сверить с NBSP_EXPECTED['final-dev4'] (этап не меняет: 8→1 копий «Ведёт» тире не содержат) — readback не бампится. build/ не коммитить.

Проверка: все гейты код 0; grep -c 'class="svc-media"' site/gambarian-standalone.html build/variants/final-dev4/index.html → 1 и 1; test "$(grep -o '&nbsp;—' build/variants/final-dev4/index.html | wc -l)" = "$(python -c "import re;print(re.search(r'\"final-dev4\": (\d+)',open('scripts/verify-live-previews.py',encoding='utf-8').read()).group(1))")"; в JSON Lines runner нет failures svc-* / services-height-390 / fact-card-accordion-forbidden

### 8. Ручная проверка обеих сторон границы и короткого portrait, скриншоты для PR.

Файлы: `docs/design-references/services-window-1440-v1.0.0.png (новый)`, `docs/design-references/services-window-390-v1.0.0.png (новый)`

Одноразовым Playwright (как в этапе 5) снять .services на 1440×900 (тема 1 и тема 3) и 390×844 (тема 1) с локальной сборки final-dev4 в docs/design-references/services-window-{1440,390}-v1.0.0.png; глазами: на 1440 стрелки снаружи окошка по центру высоты, левая бледная на первой теме; текст темы по центру по вертикали, «Ведёт» справа и красная кнопка не двигаются при смене тем; на 960/961 нет overflow; на 390 и 360×600 — одна строка чипов с обрезанным краем, стрелки в шапке рядом с заголовком темы, кнопка под областью текста, «Ведёт» ниже, Action Bar не перекрывает кнопку при прокрутке к секции; на 844×390 (landscape) окошко не рвётся.

Проверка: ls docs/design-references | grep -c 'services-window-.*v1.0.0.png' → 2; скриншоты приложены в PR

### 9. Документы: задание секции услуг, решения владельца, версии runner/review-numbered, чек-лист.

Файлы: `docs/tasks/<ДАТА>-mobile-services.md (новый)`, `docs/CONTENT-OWNER-EDITS.md`, `docs/FINAL-QA-CHECKLIST.md`, `docs/RESUME.md`, `docs/boards/2026-08-06-versions-links.md`, `docs/SCREEN-COMPOSITION.md`

Новый docs/tasks/<ДАТА>-mobile-services.md: версия SERVICES-WINDOW v1.0.0 | <ДАТА>, статус; решения владельца (№7 жест+стрелки+точки, №15 порядок, №17 «Ведёт» справа/кнопка неподвижна) и умолчания (упор, одна строка, стрелки снаружи/в шапке, «Защита» последней), архитектура (svc-window/svc-frame/svc-stage, одна ячейка grid, panel.hidden + visibility, единственные CTA/«Ведёт», Pointer Events + touch-action pan-y, клавиатура по кругу), геометрия (64px под стрелки, 44px цели, порог 1220 на 390), гейты runner 1.5.0 с именами failure, что отложено (№18 Юлия, удаление «Защиты»), ссылки на эталоны; секция ## Related (spec, items, DESIGN-RECOMMENDATIONS, CODEX-WORKING-MODEL, карточка этапа). CONTENT-OWNER-EDITS.md (следующая минорная): решения №15 (порядок; «Защита при угрозах» оставлена по умолчанию), №17, №7 — текстов нет, зафиксировать, что тексты «Ведёт» теперь в одном блоке. FINAL-QA-CHECKLIST.md: §2 runner 1.5.0, Review Numbered 2.2.1; §4 запись о секции услуг и новых гейтах; B6/B7 остаются OPEN; версия patch. RESUME.md и boards: Browser QA runner 1.5.0 «LOCAL PASS 194/194, services window gates», Review Numbered 2.2.1. SCREEN-COMPOSITION.md: «Экран 4 — услуги» (порядок тем, один блок «Ведёт») и абзац про runner (:163–164: .fact-card__title вместо __head, без аккордеона, гейты услуг). spec НЕ править: статусы умолчаний (№16, №17-стрелки, №7-упор — «реализовано по умолчанию (этап 6)»; №15-«Защита» и №18 — открыты) и версию spec ставит архитектор при приёмке; Codex передаёт эти данные отдельным разделом отчёта в PR.

Проверка: test -f docs/tasks/<ДАТА>-mobile-services.md && grep -c '^## Related' docs/tasks/<ДАТА>-mobile-services.md → 1; grep -rn 'Browser QA runner\|PREVIEW-BROWSER-QA-RUNNER v' docs/RESUME.md docs/boards/2026-08-06-versions-links.md docs/FINAL-QA-CHECKLIST.md scripts/qa-browser-matrix.py → везде 1.5.0; git diff --check → пусто

### 10. Коммит, push, draft PR; после деплоя владельцем — live-приёмка.

Файлы: `.github/PULL_REQUEST_TEMPLATE.md`, `docs/tasks/codex/2026-09-06-final-dev4-stage-6.md`

Один коммит `feat(final-dev4): services window with fixed lead block, tab order, swipe; qa runner 1.5.0` (без идентификаторов моделей и trailer-ов). git push -u origin codex/final-dev4-s6-services. Draft PR в main по шаблону (Type: New feature + Documentation; Related: PR этапа 5) с отчётом по разделу «Отчёт». До деплоя — SHA-256 final-dev3 и production. Деплой запускает владелец: Actions → Deploy Previews → ветка codex/final-dev4-s6-services → only=final-dev4. После деплоя: python -B scripts/verify-live-previews.py --only final-dev4 → PASS; python scripts/qa-browser-matrix.py https://final-dev4.gambarian-landing.pages.dev/ → PASS с гейтами svc-* (свайп и неподвижность создаются JS — статический readback их не доказывает); curl -sS -A gambarian-readback https://final-dev4.gambarian-landing.pages.dev/ | grep -c 'class="svc-media"' → 1, | grep -c 'class="svc-card__cta"' → 1, | grep -c 'class="svc-stage"' → 1, | grep -o 'id="svc-tab-[0-9]"[^>]*>[^<]*' | sed 's/.*>//' | tr '\n' ',' → новый порядок; повторить SHA-256 final-dev3 и production — совпадают (production 656CBCD0…C13E22). wrangler не запускать.

Проверка: git log -1 --format=%H; git status --short → пусто; ссылка на draft PR; CI зелёный; после деплоя PASS verify-live-previews --only final-dev4 и live runner; SHA-256 final-dev3/production до/после совпадают

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
- `python scripts/qa-browser-matrix.py http://127.0.0.1:8098/build/variants/final-dev4/ --target-name final-dev4 (runner 1.5.0)`
- `python scripts/qa-browser-matrix.py http://127.0.0.1:8098/ --all-previews (ожидается 194/194)`
- `git diff --check`
- `после деплоя владельцем (Deploy Previews → ветка codex/final-dev4-s6-services → only=final-dev4): python -B scripts/verify-live-previews.py --only final-dev4`
- `после деплоя: python scripts/qa-browser-matrix.py https://final-dev4.gambarian-landing.pages.dev/`
- `после деплоя: curl -sS -A gambarian-readback https://final-dev3.gambarian-landing.pages.dev/ | sha256sum и curl -sS -A gambarian-readback https://gambarian-landing.pages.dev/ | sha256sum — совпадают с замером до деплоя (production 656CBCD0…C13E22)`

## Версии и маркеры

- scripts/qa-browser-matrix.py: PREVIEW-BROWSER-QA-RUNNER 1.4.2 → 1.5.0 | <ДАТА> (docstring :2, RUNNER_VERSION) → docs/RESUME.md, docs/boards/2026-08-06-versions-links.md, docs/FINAL-QA-CHECKLIST.md
- scripts/review_numbered_contract.py: REVIEW-NUMBERED 2.2.0 → 2.2.1 | <ДАТА> (порядок ключей по новому source) → RESUME, boards, FINAL-QA-CHECKLIST
- docs/tasks/<ДАТА>-mobile-services.md (новый): SERVICES-WINDOW v1.0.0 | <ДАТА>; эталоны services-window-{1440,390}-v1.0.0.png
- Документы: CONTENT-OWNER-EDITS — следующая минорная; FINAL-QA-CHECKLIST, SCREEN-COMPOSITION — patch с датой <ДАТА>; spec patch — архитектор при приёмке, не Codex
- Не меняются: CLIENT-COPY-CONTRACT 1.4.0 (новых текстов нет), CLIENT-COPY-VERIFIER 1.1.0, LIVE-PREVIEW-READBACK 1.3.0 (NBSP final-dev4 прежний), карта Preview 2.5.0, FINAL-DEV4-DESIGN, FINAL-DEV3-DESIGN 2.0.2, Action Bar, Lead schema 2.0.0

## Приёмка этапа

- [ ] site/index.html: вкладки, панели svc-panel-1…8 и точки в порядке Развод, Алименты, Раздел имущества, Дети, Отцовство, Медиация, Брачный договор, Защита при угрозах; aria-controls/aria-labelledby парные; набор data-copy-id/data-owner-copy-id секции не изменился (diff с /tmp/ids-before.txt пуст); ровно 1 .svc-media, 1 .svc-card__cta, 1 .svc-stage, 8 .svc-card[role=tabpanel]; новых текстов/aria-label нет — verify-client-copy PASS с той же строкой, что после этапа 5
- [ ] Playwright 1440/1280/1024/961/960/390/360 (локальная сборка final-dev4): высоты всех 8 .svc-card равны (разброс ≤1px); rect .svc-media и .svc-card__cta одинаковы на всех темах (±1px); текст активной панели центрирован по вертикали в .svc-stage; documentElement.scrollWidth === clientWidth
- [ ] Стрелки: 44×44; на ≥861 центр по Y = центр .svc-frame ±2px, prev.right ≤ frame.left, next.left ≥ frame.right; на ≤860 в шапке окошка рядом с заголовком темы; на первой теме prev disabled/бледная, на последней next disabled; по кругу не листает; клавиши ArrowLeft/Right в tablist по-прежнему по кругу, Home/End работают
- [ ] Mobile ≤860: число уникальных top у .svc-tab = 1; активная тема подсвечена и после смены темы находится в видимой зоне tablist; правый край строки затухает; горизонтальная прокрутка только внутри .svc-tabs; высота .services на 390 ≤ 1220px
- [ ] Свайп (Pointer Events, pointerType touch): влево ≥40px → следующая тема, вправо → предыдущая, на краях — упор, вертикальный жест 100px и жест <40px не переключают; в app.js нет новых scroll-listener/setTimeout; touch-action: pan-y на .svc-stage; при prefers-reduced-motion переключение без transition
- [ ] review-numbered 2.2.1: порядок OWNER_REVIEW_IDS = порядок owner-id в source; build-review-numbered PASS с бейджами в новом порядке (… 3.8 3.28 3.18 3.22 …); verify-client-previews PASS (12)
- [ ] Runner 1.5.0: --all-previews 194/194; в metrics.services есть swipe-результаты; намеренная порча (.svc-card[hidden]{display:none}) даёт svc-panels-unequal-height; fact-card-accordion-forbidden не срабатывает (тумблеров нет); маркеры 1.5.0 в docstring/RUNNER_VERSION/RESUME/boards/FINAL-QA-CHECKLIST
- [ ] verify-business-hours и verify-address-links PASS (этапы 3–4 не сломаны); число «&nbsp;—» в сборке final-dev4 = NBSP_EXPECTED['final-dev4'] (readback не менялся)
- [ ] Документы: docs/tasks/<ДАТА>-mobile-services.md с Related; CONTENT-OWNER-EDITS (№7, 15, 17, умолчания); FINAL-QA-CHECKLIST §2/§4; SCREEN-COMPOSITION; статусы умолчаний переданы разделом отчёта (spec правит архитектор); эталоны services-window-{1440,390}-v1.0.0.png
- [ ] После деплоя only=final-dev4: verify-live-previews --only final-dev4 PASS; live runner PASS; curl: 1 svc-media, 1 svc-card__cta, 1 svc-stage, новый порядок вкладок; SHA-256 final-dev3 и production не изменились

## Отчёт в PR (обязательные поля)

- Хэш коммита, подтверждение push в origin/codex/final-dev4-s6-services, ссылка на draft PR и на PR этапа 5 (база)
- Diff-доказательство: git diff --stat; фрагменты — новая разметка .svc-window/.svc-frame/.svc-stage, порядок вкладок/панелей/точек, единственные .svc-media и .svc-card__cta, CSS (grid-ячейка, [hidden] → visibility, стрелки desktop/mobile, одна строка табов), app.js (clamp/disabled/scrollTo/pointer-свайп), runner 1.5.0 (новые метрики и failure-имена), OWNER_REVIEW_IDS; явно: набор copy-id не изменился, diff docs/sources и scripts/client_copy_contract.py пустой
- Таблица «строка списка 40/43/94(порядок)/96(меню, свайп) → статус → коммит» и статус умолчаний №7/15/16/17, отложенных №18 и «Защита при угрозах»
- Дословный вывод гейтов: verify-client-copy, unittest, verify-client-previews, build-review-numbered (порядок бейджей), verify-lead-hook, verify-business-hours, verify-address-links, qa-browser-matrix final-dev4 (metrics.services одной ячейки 390×844 и 1440×900) и summary --all-previews (194/194), git diff --check
- Замеры: высоты панелей на 1440 и 390, rect .svc-media/.svc-card__cta по темам, положение стрелок, высота .services на 390 (≤1220), число рядов табов; скриншоты 1440 (темы 1 и 3), 390, 360×600, 844×390
- Счётчик тире в build/variants/final-dev4/index.html и NBSP_EXPECTED (без изменений)
- Таблица маркеров «было → стало» (runner, review-numbered, документы)
- Проверено / Не проверено: до деплоя — только локальная сборка; после деплоя — verify-live-previews --only final-dev4, live runner, SHA-256 final-dev3/production; не проверено — реальные touch-жесты на устройстве (runner синтезирует PointerEvent), Юлия в «Ведёт» (№18), удаление «Защиты» (№15)
- Вопросы владельцу (не блокируют): подтвердить умолчания по эталонам (упор и бледная стрелка, одна строка тем с затуханием края, стрелки в шапке на mobile, «Защита при угрозах» последней); клавиатура по кругу при упоре у стрелок; точки под окошком оставить или снять на mobile

## Риски

- Перестановка панелей руками легко теряет атрибут data-copy-id/data-owner-copy-id или меняет текст — сверять набор id с /tmp/ids-before.txt и не редактировать h3/p; любое новое слово (подсказка, счётчик) = bump контракта копирайта, который этап не делает
- Если оставить .svc-card[hidden] { display: none } — высоты панелей разойдутся и текст перестанет центрироваться; скрытие через visibility:hidden обязательно, а panel.hidden остаётся источником состояния для a11y
- Стрелки снаружи требуют padding-inline 64px у .svc-window: на 1024px окошко сужается на ~120px (ожидаемо по дизайнеру); проверять 960/961/1024 на overflow
- scrollIntoView для активного таба прокручивает страницу по вертикали — использовать tablist.scrollTo по горизонтали
- Свайп: обработчик должен игнорировать pointerType 'mouse' (иначе выделение текста мышью переключает темы) и не вызывать preventDefault — вертикальную прокрутку отдаёт touch-action: pan-y; синтетические PointerEvent в runner работают только если хендлер читает clientX/clientY из событий, а не из touches
- Mask-image на .svc-tabs может обрезать focus-ring последнего чипа; при замечании заменить на псевдоэлемент-градиент поверх края
- Упор у стрелок при клавиатуре по кругу — намеренное расхождение (рекомендация дизайнера); если владелец захочет кольцо и у стрелок — одна строка в setActive
- Runner 1.5.0 меняет head-guard кубиков на .fact-card__title и запрещает тумблеры: если этап 5 не влит, гейт fact-card-accordion-forbidden сработает на старых кубиках — предпосылки шага 1 обязательны
- Порог 1220px на 390 рассчитан до реализации (F:M-03); при новом кадре/шрифтах этапа 7 порог пересматривается там, здесь не поднимать «под факт»
- Action Bar (fixed, 60px) на mobile соседствует с кнопкой окошка — визуально проверить, что кнопки не сливаются; жест не должен срабатывать на панели (панель вне .svc-stage)
- Workflow с пустым only опубликует все alias, включая final-dev3 — only=final-dev4 обязательно

## Проверка карточки критиком

скоуп: ок; пути: ок; гейты: ок; промпт: ок.

Правки критика, обязательные к применению исполнителем:

- **Применено.** Шаг 9 больше не правит spec — статусы умолчаний уходят разделом отчёта в PR, spec и его версию ведёт архитектор (исходное замечание: «Шаг 9 поручает Codex править spec — по CODEX-WORKING-MODEL реестр решений и spec ведёт Claude»)
- **Применено** (шаг 7: «итог 194/194 не меняется (новые проверки внутри ячеек)» и «имена failure стабильные»). Исходное замечание: уточнить, что runner 1.5.0 сохраняет имена cells/итог 194/194 при удалении блока factCardAccordion (иначе изменится структура JSON Lines, на которую опираются документы 2026-08-10-all-previews-browser-qa.md)

Блок «4. Услуги» :691–895, .svc-card padding clamp(26px,4vw,46px) :746–752, .svc-card[hidden]{display:none} :753, .svc-card__inner :755, .svc-media flex 0 1 300px/border-left/justify-content center/align-self stretch :821–831, app.js «Карусель направлений» :129–202, runner .fact-card__head :403 / hasExpandableContent :443 / setFactCardsExpanded :449 — подтверждено. Порядок панелей и меток review-numbered (3.8 → 3.28 → 3.18 → 3.22) соответствует текущей нумерации 3.12/3.13 = Алименты. Открытые №7/16/17-стрелки применены только по умолчанию, №18 и удаление «Защиты» не делаются.

## Промпт для Codex

Вставить в Codex CLI в корне репозитория на ветке этапа:

```text
Ты исполнитель этапа 6 «Секция услуг» версии final-dev4 лендинга «Гамбарян и партнёры». Работай в корне репозитория gambaryan-family-law, уровень рассуждений max.
Сначала прочитай по порядку: AGENTS.md; docs/RESUME.md («Следующий цикл»); docs/CODEX-WORKING-MODEL.md; docs/tasks/codex/2026-09-06-final-dev4-stage-6.md (карточка целиком); в docs/tasks/2026-09-06-final-dev4-spec.md — «Реестр решений владельца» (№7, 15, 17, 21), «Открытые вопросы» (№7-упор, №15-«Защита», №16, №17-стрелки — по умолчанию; №18 — НЕ делать), «Правила для исполнителя», «Порядок реализации» п.6; в docs/tasks/2026-09-06-final-dev4-items.md — B:G-12, B:G-13, B:G-16, B:G-17, B:G-18, E:G-06, F:M-03, F:M-04; docs/DESIGN-RECOMMENDATIONS-2026-09-06.md №7, №16, №17; docs/GAMBARIAN-DESIGN-RULES.md («Spacing и geometry», «States и motion»). Затем код: site/index.html (#services), site/styles.css (блок «4. Услуги» и @media 860px), site/app.js («Карусель направлений»), scripts/qa-browser-matrix.py, scripts/review_numbered_contract.py.
Предусловие: влиты этапы 1–5 (в #services нет бейджа, есть data-owner-copy-id svc-*; в .facts нет <p>; runner 1.4.2; readback 1.3.0). Если нет — остановись на этом пункте и напиши в отчёт. Ветка codex/final-dev4-s6-services от main после слияния этапа 5. Draft PR в main по .github/PULL_REQUEST_TEMPLATE.md.
Сделай шаги 2–10 карточки (правки только в site/, scripts/, docs/; build/ руками не править; тексты не менять — набор data-copy-id/data-owner-copy-id секции до и после должен совпасть):
1. site/index.html: порядок вкладок/панелей/точек — Развод, Алименты, Раздел имущества, Дети, Отцовство, Медиация, Брачный договор, Защита при угрозах (последняя по умолчанию), id svc-tab-N/svc-panel-N перенумеровать по позиции, aria-controls/aria-labelledby парные. После .svc-tabs — <div class="svc-window"> со стрелками .services__arrows (перенести из шапки дословно) и <div class="svc-frame"><div class="svc-frame__main"><div class="svc-stage">8 × <div class="svc-card" role="tabpanel">h3.svc-title + p.svc-lead дословно с атрибутами</div></div><a class="svc-card__cta" href="#contact">Записаться на консультацию</a></div> + ОДИН .svc-media (Александр, тексты этапа 2)</div></div>. Дубли CTA/«Ведёт», обёртки __inner/__main удалить; новых текстов и aria-label не добавлять.
2. site/styles.css (desktop, блок «4. Услуги»): .svc-window { position:relative; padding-inline:64px } со стрелками absolute по центру высоты снаружи (prev left:0, next right:0), :disabled → opacity .35; стили бокса с .svc-card → .svc-frame (flex-wrap, gap как у __inner); .svc-frame__main flex-column; .svc-stage { display:grid; touch-action:pan-y }; .svc-card { grid-area:1/1; display:grid; align-content:center; transition: opacity .2s }; .svc-card[hidden] { display:grid; visibility:hidden; opacity:0; pointer-events:none } вместо display:none; .svc-lead margin 0, .svc-card__cta margin-top 28px; reduced-motion — transition none.
3. site/styles.css (@media ≤860px): .svc-window padding 0; .svc-frame колонкой (панели → кнопка → «Ведёт»), стрелки в шапке окошка справа (top 22px, right 20px / 72px), .svc-title padding-right 104px; .svc-media border-top вместо border-left; .svc-tabs одна строка: nowrap, overflow-x auto, full-bleed через margin/padding var(--pad-x), скрытый scrollbar, mask-затухание правого края 28px; .svc-tab flex:none, min-height 44px.
4. site/app.js: setActive(index, moveFocus, wrap) — упор (clamp) для стрелок/точек/свайпа, кольцо только для клавиш в tablist; prev/next.disabled на краях; активный таб подъезжает через tablist.scrollTo (горизонтально, smooth кроме reduced-motion; НЕ scrollIntoView); свайп на .svc-stage: pointerdown/pointerup/pointercancel, игнорировать pointerType 'mouse', порог |dx| ≥ 40 и |dx| > |dy|; без pointermove/preventDefault, без scroll-listener, setTimeout, localStorage.
5. scripts/review_numbered_contract.py: ключи OWNER_REVIEW_IDS в порядке нового source (svc-property-lead-v1 перед svc-children-lead-v1), версия 2.2.1 с датой.
6. scripts/qa-browser-matrix.py → 1.5.0 с датой, кубики: head-guard по .fact-card__title, тумблер запрещён (fact-card-accordion-forbidden), toggle-missing только при реально обрезанном <p>.
7. Runner, metrics.services: одна строка табов (≤860), высота .services на 390 ≤ 1220, равные высоты 8 панелей, неподвижные rect .svc-media/.svc-card__cta по всем темам, стрелки 44px и их положение (desktop снаружи по центру, mobile в шапке), disabled на краях, свайп синтетическими PointerEvent(pointerType 'touch') на .svc-stage: влево → +1, вправо → −1, край → упор, вертикаль 100px и 30px — без смены; failure-имена из шага 6 карточки; итог матрицы остаётся 194/194.
8. Пересобрать: python -B scripts/build-preview.py site/gambarian-standalone.html --standalone; build-font-variants, build-hero-variants, build-action-bar, build-review-numbered. Гейты: verify-client-copy (та же PASS-строка, что после этапа 5); python -m unittest discover -s scripts/tests; verify-client-previews; node scripts/verify-lead-hook.mjs; python -m http.server 8098 из корня + verify-business-hours и verify-address-links по http://127.0.0.1:8098/build/variants/final-dev4/; qa-browser-matrix final-dev4 и --all-previews (194/194); git diff --check; число «&nbsp;—» в сборке = NBSP_EXPECTED['final-dev4'].
9. Эталоны services-window-{1440,390}-v1.0.0.png в docs/design-references (одноразовый Playwright), ручной просмотр 960/961, 360×600, 844×390.
10. Документы: новый docs/tasks/<дата>-mobile-services.md (архитектура, умолчания, гейты, Related), docs/CONTENT-OWNER-EDITS.md (№7/15/17, умолчания), docs/FINAL-QA-CHECKLIST.md (§2 runner 1.5.0 и review 2.2.1, §4), docs/RESUME.md и docs/boards (версии), docs/SCREEN-COMPOSITION.md. spec не трогать: статусы умолчаний и версию spec ставит архитектор — передай их разделом отчёта в PR.
Не делай: не собирай блок «Ведёт» для Юлии (№18 открыт), не удаляй «Защиту при угрозах», не меняй тексты, контракт копирайта, шрифты (этап 7), --section-pad, Action Bar, site-addons, кубики фактов (кроме селектора в runner), final-dev3, production, build/; не запускай wrangler; не пиши идентификаторы моделей в коммит/PR. Если решения не хватает — остановись на пункте, сделай остальное, опиши вопрос в отчёте.
Один коммит `feat(final-dev4): services window with fixed lead block, tab order, swipe; qa runner 1.5.0`, push, draft PR с отчётом: хэш и push; diff-доказательство (разметка, CSS, JS, runner, порядок ключей; неизменный набор copy-id, пустой diff docs/sources и client_copy_contract.py); дословный вывод всех гейтов с metrics.services для 390×844 и 1440×900; замеры и скриншоты; таблица маркеров «было → стало»; «Проверено / Не проверено / Вопросы владельцу». Деплой делает владелец (Actions → Deploy Previews → ветка этапа → only=final-dev4). До деплоя сними SHA-256 final-dev3 и production (curl -sS -A gambarian-readback … | sha256sum; в PowerShell curl.exe + Get-FileHash); после — python -B scripts/verify-live-previews.py --only final-dev4, python scripts/qa-browser-matrix.py https://final-dev4.gambarian-landing.pages.dev/, curl-проверки из шага 10 (1 svc-media, 1 svc-card__cta, 1 svc-stage, новый порядок вкладок), повтор SHA-256 (production 656CBCD0…C13E22); допиши proof-блок в PR.
```

## Related

- [Модель работы с Codex](../../CODEX-WORKING-MODEL.md)
- [Задание final-dev4](../2026-09-06-final-dev4-spec.md)
- [Разбор по пунктам](../2026-09-06-final-dev4-items.md)
- [Реестр текстов владельца](../../CONTENT-OWNER-REVISIONS-2026-09-06.md)
- [Рекомендации дизайнеров](../../DESIGN-RECOMMENDATIONS-2026-09-06.md)

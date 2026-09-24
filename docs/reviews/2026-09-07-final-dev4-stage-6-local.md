# Этап 6: локальная проверка окна услуг

**Версия:** `SERVICES-WINDOW-QA v1.0.0`

**Дата:** `2026-09-07`

**Статус:** `LOCAL final-dev4 15/15 PASS / ALL-PREVIEWS INCOMPLETE / LIVE NOT RUN`

## Основание и границы

Внешнее задание `codex-services.md` прочитано как UTF-8. Рабочая ветка
`codex/final-dev4-s6-services`, база `43d5003`. Последние указания владельца:
без новых веток, PR, публикации и build-font-variants; один коммит с сообщением
`feat(final-dev4): services window keeps one height, lead block and CTA stay put`.
Контракт копирайта 1.4.1 и все тексты сохранены. Шрифты, assets, кубики,
`--section-pad`, `.precedent-card`, `.attorney-photo`, подвал, frozen source,
адаптеры final-dev3/final-dev4 не менялись. Производные собраны генераторами.

## Проверено

`[verified]` Два независимых прогона: прямое переключение DOM через Playwright MCP
и штатный Python Playwright runner 1.5.0. Все 8 тем имеют одинаковую высоту;
rect (top/left/width/height) единственных `.svc-media` и `.svc-card__cta`
не меняется: максимальное смещение 0 px. Полные значения двух ячеек — в JSON рядом.

| Тема | Секция на 1440×900, px | Секция на 390×844, px |
|---|---:|---:|
| Развод | 1003.328125 | 1217.203125 |
| Алименты | 1003.328125 | 1217.203125 |
| Раздел имущества | 1003.328125 | 1217.203125 |
| Дети | 1003.328125 | 1217.203125 |
| Отцовство | 1003.328125 | 1217.203125 |
| Медиация | 1003.328125 | 1217.203125 |
| Брачный договор | 1003.328125 | 1217.203125 |
| Защита при угрозах | 1003.328125 | 1217.203125 |

Высоты восьми панелей: 1440 — `198 px` каждая; 390 — `344.5 px` каждая.
На 390 одна строка табов, горизонтальная прокрутка внутри неё, секция ≤1220 px.
Стрелки 44×44 px, desktop снаружи рамки и по её центру, mobile в шапке.
На первой теме prev disabled; на последней next disabled.

Синтетический PointerEvent touch: next=1, prev=0, start=0, vertical=0,
threshold=0, end=7. Клавиатура: ArrowLeft из 0 → 7, ArrowRight → 0,
End → 7, Home → 0; активная последняя тема попадает в видимую зону tablist.
Дополнительные прямые измерения: 360×600, 844×390, 960×900, 961×900,
1024×768, 1280×720 — service gates PASS и scrollWidth=clientWidth.

Регрессия внесена только временным CSS в браузере: `.svc-card[hidden] {display:none}`.
На 390 высоты секции: 1203.703125, 1009.203125, 1101.703125, 1217.203125,
1217.203125, 1157.203125, 1101.703125, 1131.703125. Гейт обнаружил
`svc-panels-unequal-height`, `svc-media-moved`, `svc-cta-moved`,
`svc-section-height-changed`. Подмена удалена; исходники/build не портились.

## Матрица final-dev4

| Viewport | Результат | Высота секции, px |
|---|---|---:|
| 360×600 | PASS | 1302.046875 |
| 360×668 | PASS | 1302.046875 |
| 390×724 | PASS | 1217.203125 |
| 390×844 | PASS | 1217.203125 |
| 720×760 | PASS | 913.796875 |
| 860×760 | PASS | 941.687500 |
| 861×760 | PASS | 1049.843750 |
| 1024×768 | PASS | 985.281250 |
| 1280×720 | PASS | 1003.328125 |
| 1440×900 | PASS | 1003.328125 |
| 960×760 | PASS | 1132.781250 |
| 961×760 | PASS | 1133.265625 |
| 960×400 | PASS | 1132.781250 |
| 960×401 | PASS | 1132.781250 |
| 844×390 | PASS | 937.296875 |

Дословный summary:

```json
{"limitations": ["visual review is still required for heads/hair, overlaps, and microtext", "lead-form submission and broader click interaction smoke remain separate gates", "the known unused hero-duo-air preload timing warning is excluded"], "mode": "single-preview", "runner_version": "1.5.0", "status": "PASS", "suites": {"breakpoint": {"fail": 0, "pass": 5, "total": 5}, "main": {"fail": 0, "pass": 10, "total": 10}}, "targets": 1, "totals": {"fail": 0, "pass": 15, "total": 15}, "type": "summary"}
```

## Вывод гейтов

- Standalone: `site/gambarian-standalone.html: 3.75 MB`, exit 0.
- Hero builders: все пять вариантов — `Проверка пройдена: слоты подставлены, звонок и путь к форме на месте, текст не изменился.`, exit 0.
- Action Bar: `Замеренная высота панели: open=60px, closed=60px (компенсация у body — 60px + safe-area)`; `Проверка пройдена: разметка, подключение, контакты, слои и защита кликов на месте.`, exit 0.
- Review Numbered 2.2.1: `Использованных утверждённых номеров: client=18, owner=18`; `Проверка пройдена: 36 уникальных номеров, noindex и Action Bar сохранены.`, exit 0.
- `verify-client-copy.py`, exit 1: `FAIL CLIENT-COPY-VERIFIER v1.1.0 | 2026-09-07: 8 ошибок` — только отсутствующие index/standalone четырёх font-variants, которые владелец запретил собирать.
- Дополнительная проверка тем же copy verifier: `PASS existing-copy-targets: 18 targets; 16 unique; font targets skipped by owner`. Frozen source и dynamic UI также PASS.
- `python -m unittest discover -s scripts/tests`: `Ran 18 tests`, `OK`, exit 0.
- `verify-client-previews.py`, exit 1: нет собранных v1-playfair-onest, v2-lora-inter, v3-literata-manrope, v4-ptserif-golos; других ошибок нет.
- Lead: `Lead hook 2.0.0 (2026-08-11): contract/static/runtime PASS`, exit 0; реальный лид не отправлялся.
- Business hours: `BUSINESS-HOURS-GATE v1.0.0`, `PASS`, passed=2, total=2, exit 0.
- Address links: `ADDRESS-LINKS-GATE v1.0.0`, `PASS`, passed=2, total=2, exit 0.
- `git diff --check`: PASS, exit 0 (CRLF-предупреждения не являются ошибками diff).
- Статическая сверка: `PASS service texts/IDs unchanged; ARIA pairs 8/8; media 8->1; CTA 8->1; review order; protected dashes=15`.

Первоначальные WinError 5 у Python Playwright и tempfile не считаются PASS.
Успешные проверки выполнены позднее; для временных файлов использованы
`TEMP=TMP=I:\GIT\gambaryan-services\temp`.

## Уточнения реализации

- Мобильный «Ведёт»: label и прежняя золотая черта в одной строке, остальные
  элементы ниже, gap 8 px. Это сокращает высоту 1251.203125 → 1217.203125
  при прежних размерах текста, фото и внешних отступах; порог 1220 не повышен.
- `.svc-frame__main {flex:none}` на mobile снимает desktop flex-basis 380px.
- Заголовок mobile имеет `min-width:0; overflow-wrap:anywhere`, чтобы длинное
  слово не пересекалось со стрелками на 360px; возможен перенос внутри слова.
- Активный таб прокручивается горизонтально; focus имеет preventScroll.
- Новые гейты услуг и запрет аккордеонов применяются ко всем обновляемым
  вариантам; frozen final-dev3 сохраняет legacy-разметку и исключён из них.

## Не проверено / отложено

- Матрица всех 194 ячеек не запускалась: font-variants отсутствуют по указанию владельца.
- Live readback и production не проверялись, деплоя не было.
- Реальные жесты на физическом телефоне и iPhone safe-area не проверены.
- №18 (Юлия в «Ведёт») открыт; оставлен один блок Александра.
- №15: «Защита при угрозах» последней, без удаления. Умолчания №7/16/17
  реализованы: упор, одна строка, стрелки снаружи/в шапке, точки сохранены.
- Для чистых PNG в Playwright MCP временно скрыты fixed header/Action Bar/demo;
  на измерения секции это не влияет. Полная матрица проверяет обычную страницу.
  MCP использует Windows scrollbar 15px; в его дополнительных измерениях
  scrollbar скрыт только QA-стилем, чтобы clientWidth совпадал с viewport.

## Related

- [Карточка этапа](../tasks/codex/2026-09-06-final-dev4-stage-6.md)
- [Архитектура и приёмка](../tasks/2026-09-07-mobile-services.md)
- [JSON доказательства](2026-09-07-services-window-evidence.json)
- [Desktop эталон](../design-references/services-window-1440-v1.0.0.png)
- [Mobile эталон](../design-references/services-window-390-v1.0.0.png)

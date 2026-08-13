> **CURRENT ADDENDUM 2026-08-13.** Историческая приёмка ниже относится к
> прежним `2.3.1`/`v1.1.0` и review со 102 номерами. Текущий кандидат — Action
> Bar `2.3.4`, `final-dev3 2.0.2`, runner `1.3.2` — имеет статус
> `LOCAL QA PASS / LIVE PENDING`. Прежние заявления `173/173` и manual PASS для него —
> `HISTORICAL / INVALIDATED` независимым Claude review. Действующий allowlist
> gate: [`2026-08-11-client-approved-copy-only.md`](2026-08-11-client-approved-copy-only.md),
> точка входа: [`../RESUME.md`](../RESUME.md).

# Полная browser/responsive-приёмка клиентских Preview — HISTORICAL

**Версия:** `PREVIEW-BROWSER-QA v1.2.2`

**Дата:** `2026-08-13`

**Ветка:** `claude/website-development-kb0fu0`

**Статус:** `HISTORICAL LIVE PASS 11/11 / CURRENT LOCAL QA PASS / LIVE PENDING / NO DEPLOY`

## Текущий delta-gate `2026-08-13`

- Полный run runner `1.3.2` должен дать
  `177/177 = 110 main + 55 breakpoint + 8 large + 4 effective-width`.
- Четыре новые cells — `345×600` и `345×668` для `v2-lora-inter` и
  `v3-literata-manrope`: effective width nominal `360px` при classic scrollbar
  `15px`.
- V2: `FONT-VARIANT-V2-MOBILE v1.1.0 | 2026-08-13`, только Lora H1 width
  `+12px`, ожидаемый перенос `5→4` строки.
- V3: `FONT-VARIANT-V3-MOBILE v1.0.0 | 2026-08-13`, только Manrope lede width
  `+12px`, ожидаемый перенос `4→3` строки.
- В обоих вариантах дизайн, семейства/размеры шрифтов, photo source/crop и
  межблочные отступы не меняются.
- Regression `final-dev3`: `0 → 2 → 50 → 100 → 320` hidden → pass Hero visible
  → `320` visible → `0` reset → `320` hidden. Form/menu/focus скрывают
  bar/demo независимо от latch.
- Полный автоматический прогон `177/177` и повторный manual visual QA пройдены.
  Live aliases остаются историческими; deploy запрещён без
  отдельного разрешения владельца.

## Цель

Проверить все одиннадцать Preview из карты `2.4.0`: реальный рендер в Chrome,
измерения геометрии, визуальную проверку и live-readback каждого URL.
Статический verifier, HTTP 200 или общий smoke Action Bar сами по себе эту
приёмку не закрывают. Специфические стили, proof-блок, количество и порядок CTA
`final-dev1` не переносятся в остальные варианты: каждый Preview проверяется по
собственной композиции.

## Область

Полный прогон требуется для:

- `final-dev`;
- `final-dev1`;
- `v1-playfair-onest`;
- `v2-lora-inter`;
- `v3-literata-manrope`;
- `v4-ptserif-golos`;
- `hero-a-actions-first`;
- `hero-b-call-first`;
- `action-bar`;
- `review-numbered`.
- `final-dev3`.

`final-dev` и `action-bar` публикуются из одного каталога, но по прямому решению
владельца полная browser-матрица выполняется на каждом URL. Их
byte-identical состояние проверяется как дополнительный инвариант, а не как
основание пропустить один из URL.

Опубликованный `final-dev3 v1.0.0` — исторический strict clone `final-dev1`:
Playfair Display + Onest, текущие тексты и Action Bar `2.3.1`. Кандидат
`FINAL-DEV3-DESIGN v1.1.0 | 2026-08-11` сохраняет эту базу, но меняет
Hero-контакт по уже вычисленному состоянию Action Bar `2.3.1`
(`Asia/Jerusalem`, Sun–Thu, `[09:00, 18:00)`): открыто — текущий телефон;
закрыто — `Написать в WhatsApp` со ссылкой и иконкой. Второй
clock/timer/state map не допускается.

## Матрица viewport

Для каждого из одиннадцати Preview URL:

| Класс | Viewport |
|---|---|
| Короткий mobile | `360×600`, `360×668`, `390×724` |
| Обычный mobile/tablet | `390×844`, `720×760`, `860×760` |
| Граница Hero | `861×760` |
| Desktop | `1024×768`, `1280×720`, `1440×900` |

Дополнительно:

- `1920×1080` и `2560×1440` — базовый Hero, Hero A, Hero B и `final-dev3`;
- `960×760`, `961×760`, `960×400`, `960×401` — канонический Action Bar;
- на каждом опубликованном live alias — mobile smoke и
  readback URL.
- для `final-dev3 v1.1.0` — auto open/closed и оба demo-состояния на mobile с
  проверкой синхронности Hero/Action Bar; на desktop — оба Hero-state при
  по-прежнему скрытых Action Bar/demo.

## Универсальная приёмка

Для каждой ячейки основной матрицы сохранить измерения и DOM-состояние;
screenshots обязательны для репрезентативных mobile/desktop случаев и каждого
найденного дефекта.

- [x] `document.documentElement.scrollWidth === innerWidth`.
- [x] Нет обрезки, пересечений, горизонтального скролла и нечитаемого
  микротекста.
- [x] Фото и лица сбалансированы: головы и волосы не обрезаны, люди не
  перекрыты текстом, на mobile нет явно лишнего одностороннего пустого поля.
- [x] На `360×600`, `360×668` и `390×724` все Hero CTA, предусмотренные
  конкретным вариантом, полностью входят в viewport; запас после последней CTA
  не меньше 8px. Порядок и количество CTA сверяются с контрактом варианта.
- [x] На `861px` не остаётся mobile-transform или промежуточная дублирующая
  композиция.
- [x] Реально загружены заявленные локальные шрифты; кириллица не уходит в
  системный fallback, внешних font-запросов нет.
- [x] Action Bar проходит Hero → чтение → форма: `hidden/inert` → видима и
  интерактивна не позднее 300 ms → `hidden/inert`.
- [x] Исторический demo-switch меняет три действия на два и обратно; reload
  возвращает автоматическое расписание.
- [x] LOCAL `final-dev3 v1.1.0`: demo-switch и автоматическое расписание
  одновременно меняют Action Bar и Hero-контакт; существует один state/timer.
- [x] На ширине до `960px` панель доступна, от `961px` скрыта; её высота 60px,
  колонки равны и собственного overflow нет.
- [x] `#contact`, `tel:+972545490623` и WhatsApp ведут по назначению; форма
  сохраняет autocomplete, inline-ошибки и focus первого невалидного поля.
- [x] Console `error` и `warning` равны нулю.
- [x] `final-dev3` live URL возвращает 200 и текущий marker `v1.1.0`;
  `/lead-contract.js` содержит `1.1.0`, `GET /api/lead` возвращает 405 и
  `Allow: POST`. Для десяти исторических alias этот live-гейт уже закрыт.
- [x] Новый marker `FINAL-DEV3-DESIGN v1.1.0` и live Hero-state readback
  проверены после отдельного deploy.

## Проверки по назначению варианта

| Preview | Дополнительный критерий |
|---|---|
| `final-dev` / `action-bar` | Артефакт HTML/CSS/JS byte-identical; оба alias проходят отдельный live smoke |
| Четыре font Preview | H1/курсив/основной текст/CTA используют заявленные семейства; переносы и цифры не ломают сетку |
| `hero-a-actions-first` | Сохраняется объявленный порядок с действиями до фотографии и основной записью |
| `hero-b-call-first` | Сохраняется объявленный порядок с доминирующим звонком; `tel:` и `#contact` не перепутаны |
| `review-numbered` | Ровно 102 уникальных `data-rvn`; бейджи читаемы и не закрывают исходный текст |
| `final-dev3 v1.0.0` | HISTORICAL: strict clone `final-dev1`, pixel-identical на `1293×724` и `390×844` |
| `final-dev3 v1.1.0` | LIVE PASS: Playfair Display + Onest, текущие тексты, Action Bar `2.3.1`; open Hero сохраняет телефон, closed показывает точный WhatsApp CTA; demo-sync и один state/timer |

Исходные точки, закрытые в локальном кандидате:

- `v2-lora-inter`: прежний page overflow `+3px` на ширине 360px закрыт
  вариантным responsive-правилом;
- `review-numbered`: прежний overflow `+48px` на 360px и `+18px` на 390px
  закрыт переносами аннотаций и variant-only mobile-композицией;
- `v4-ptserif-golos`: итоговый статус шрифта 500 остаётся OPEN до отдельного
  решения по отсутствующему PT Serif 500.

## Доказательства и закрытие

Для каждого URL записываются:

- timestamp, URL, deployment/commit SHA и версия этого контракта;
- измерения всех ячеек и репрезентативные screenshots;
- `innerWidth/scrollWidth`, bounding boxes Hero-фото и CTA;
- computed font family/size и DOM snapshot;
- console errors/warnings и live-readback endpoint.

В клиентский отчёт достаточно вынести `360×600`, `390×844`, `1280×720` и
`1440×900`; остальные материалы сохраняются как QA-доказательство.

Если найден дефект, сначала определяется его source of truth и карта зависимых
alias. Исправление вносится в source/generator, а не вручную в `build/`; затем
поднимается версия затронутого контракта, пересобираются и повторно проверяются
все зависимые Preview. Production не затрагивается без отдельного решения
владельца. Если общий source влияет на `final-dev1`, его regression-smoke
обязателен. Реальный POST в Albato в этом прогоне не выполняется.

## Результаты `2026-08-11`

### Исторический release десяти Preview

- [x] `100/100` основных ячеек прошли на всех десяти Preview.
- [x] `50/50` breakpoint/landscape-ячеек прошли.
- [x] `6/6` дополнительных large-desktop случаев прошли для базового Hero,
  Hero A и Hero B на `1920×1080`/`2560×1440`.
- [x] Overflow отсутствует; заявленные семейства загружены; console
  errors/warnings `0`.
- [x] Минимальный запас после последней Hero CTA на коротком portrait —
  `8.7px`; у `review-numbered` — `14.7px`.
- [x] Зоны панели, demo `3 ↔ 2`, reduced motion, no-IO fallback,
  autofill и field-validation прошли.
- [x] Агрегат, окружение, thresholds и команды записаны в
  `docs/reviews/2026-08-11-client-preview-local-qa.md`; raw per-cell JSON не
  коммитился.
- [x] LIVE Readback десяти alias после публикации Action Bar `2.3.1` и Client
  Preview Mobile `1.0.0` прошёл; commit `98374c1`, HTTP/assets/Functions и
  browser smoke `10/10`.

Эти числа относятся к опубликованному release десяти URL и не переписываются
результатами добавленного позже `final-dev3`.

### Историческая карта `2.4.0` с `final-dev3 v1.0.0`

- [x] Browser-runner `PREVIEW-BROWSER-QA-RUNNER v1.1.0 | 2026-08-11`.
- [x] `110/110` основных ячеек: одиннадцать Preview × десять viewport.
- [x] `55/55` breakpoint/landscape-ячеек.
- [x] `8/8` large-desktop ячеек; общий результат `173/173`.
- [x] Одиночный прогон `final-dev3` прошёл `15/15`.
- [x] Скриншоты `final-dev1 ↔ final-dev3 v1.0.0` pixel-identical на `1293×724` и
  `390×844`; статический verifier подтвердил нормализованное равенство
  HTML/CSS и идентичность общих assets/scripts/fonts.
- [ ] OPEN Strict clone наследует дефект `final-dev1` при browser zoom `200%`:
  proof/call-help скрываются mobile-правилом. Полный WCAG AA PASS не заявлять.
- [x] Cloudflare deployment `2f20dc33-714f-4b3a-86ea-b51880e33f05` и live
  readback `final-dev3` прошли; прежние десять alias и production не изменились.

### Кандидат `final-dev3 v1.1.0`

- [x] LOCAL Пересобрать и подтвердить marker
  `FINAL-DEV3-DESIGN v1.1.0 | 2026-08-11`.
- [x] LOCAL На auto open/closed и обоих demo-состояниях подтвердить точный
  Hero phone/WhatsApp CTA, ссылку, иконку и синхронность с Action Bar.
- [x] LOCAL Action Bar `2.3.1` остаётся единственным владельцем
  `Asia/Jerusalem`, state и timer; runner
  `PREVIEW-BROWSER-QA-RUNNER v1.2.0 | 2026-08-11` прошёл `173/173`, single
  `15/15`.
- [x] LIVE `15/15`, deployment `52a9addb-0166-4f78-8c7d-5f1b0ed2ad07`
  и isolation readback после deploy прошли.

## Related

- [Карта клиентских Preview](../boards/2026-08-06-versions-links.md)
- [Композиция экранов](../SCREEN-COMPOSITION.md)
- [Итоговый QA-чек-лист](../FINAL-QA-CHECKLIST.md)
- [Локальный QA-отчёт](../reviews/2026-08-11-client-preview-local-qa.md)
- [Live release final-dev3](../reviews/2026-08-11-final-dev3-live-release.md)
- [Live release-отчёт](../reviews/2026-08-11-client-preview-live-release.md)
- [Принятый Final Dev 1](2026-08-10-final-dev1-desktop-hero.md)

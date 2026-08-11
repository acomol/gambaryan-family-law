# Полная browser/responsive-приёмка клиентских Preview

**Версия:** `PREVIEW-BROWSER-QA v1.0.1`

**Дата:** `2026-08-11`

**Ветка:** `claude/website-development-kb0fu0`

**Статус:** `PASS LOCAL + LIVE`

## Цель

Проверить все десять стабильных Cloudflare Preview: реальный рендер в Chrome,
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

`final-dev` и `action-bar` публикуются из одного каталога, но по прямому решению
владельца полная browser-матрица выполняется на каждом из десяти URL. Их
byte-identical состояние проверяется как дополнительный инвариант, а не как
основание пропустить один из URL.

## Матрица viewport

Для каждого из десяти Preview URL:

| Класс | Viewport |
|---|---|
| Короткий mobile | `360×600`, `360×668`, `390×724` |
| Обычный mobile/tablet | `390×844`, `720×760`, `860×760` |
| Граница Hero | `861×760` |
| Desktop | `1024×768`, `1280×720`, `1440×900` |

Дополнительно:

- `1920×1080` и `2560×1440` — базовый Hero, Hero A и Hero B;
- `960×760`, `961×760`, `960×400`, `960×401` — канонический Action Bar;
- на каждом из десяти live alias — mobile smoke и
  readback URL.

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
- [x] Demo-switch меняет три действия на два и обратно; reload возвращает
  автоматическое расписание.
- [x] На ширине до `960px` панель доступна, от `961px` скрыта; её высота 60px,
  колонки равны и собственного overflow нет.
- [x] `#contact`, `tel:+972545490623` и WhatsApp ведут по назначению; форма
  сохраняет autocomplete, inline-ошибки и focus первого невалидного поля.
- [x] Console `error` и `warning` равны нулю.
- [ ] Live URL возвращает 200 и правильный marker варианта;
  `/lead-contract.js` содержит `1.1.0`, `GET /api/lead` возвращает 405 и
  `Allow: POST`.

## Проверки по назначению варианта

| Preview | Дополнительный критерий |
|---|---|
| `final-dev` / `action-bar` | Артефакт HTML/CSS/JS byte-identical; оба alias проходят отдельный live smoke |
| Четыре font Preview | H1/курсив/основной текст/CTA используют заявленные семейства; переносы и цифры не ломают сетку |
| `hero-a-actions-first` | Сохраняется объявленный порядок с действиями до фотографии и основной записью |
| `hero-b-call-first` | Сохраняется объявленный порядок с доминирующим звонком; `tel:` и `#contact` не перепутаны |
| `review-numbered` | Ровно 102 уникальных `data-rvn`; бейджи читаемы и не закрывают исходный текст |

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

## Локальный результат `2026-08-11`

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

## Related

- [Карта клиентских Preview](../boards/2026-08-06-versions-links.md)
- [Композиция экранов](../SCREEN-COMPOSITION.md)
- [Итоговый QA-чек-лист](../FINAL-QA-CHECKLIST.md)
- [Локальный QA-отчёт](../reviews/2026-08-11-client-preview-local-qa.md)
- [Live release-отчёт](../reviews/2026-08-11-client-preview-live-release.md)
- [Принятый Final Dev 1](2026-08-10-final-dev1-desktop-hero.md)

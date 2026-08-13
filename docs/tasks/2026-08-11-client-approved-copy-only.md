# Задание: только утверждённый клиентом текст во всех Preview

**Версия:** `CLIENT-APPROVED-COPY-ONLY v1.2.0`

**Дата:** `2026-08-13`

**Статус:** `LIVE PASS 11/11 / READY FOR CLIENT PREVIEW / PRODUCTION UNCHANGED`

## Цель

Собрать одиннадцать воспроизводимых Preview, где каждый реально размещённый
смысловой текст дословно входит либо в client-document allowlist, либо в точный
`OWNER-APPROVED` блок Юлии Саакян. Полный coverage клиентского документа не
требуется.

## Источник и границы

- файл: `D:\Копия LP - Короткая версия (1).txt`;
- frozen repo copy: `docs/sources/client-copy-short-v1.0.0.txt`;
- SHA-256: `5234CC5D9A3A4DF991827EF02E8DA46AE9C8B46D33C84CC33671E4B0465FA18E`;
- размер: `14 895 bytes`;
- клиентский документ содержит `45` разрешённых номерных блоков; использовать
  все `45` необязательно, missing допустим и документируется;
- отдельный `OWNER-APPROVED` override: точный прежний блок Юлии Саакян из
  `CONTENT-APPROVED.md`;
- допустимо вне содержательных allowlist: identity/brand, навигация,
  accessibility, form validation/status, business-hours demo, review instruction;
- форма содержит только `Имя` и `Телефон`; `Email` и «Тема обращения»/`topic`
  запрещены явным решением владельца;
- запрещены прежние proof-тексты и редакция «ВПЕРВЫЕ…».
- design baseline не меняется: сохраняются утверждённые композиции, исходные
  Hero assets/crop и шрифты вариантов; Action Bar обновлён до `2.3.4`. На
  effective-width `345×600/668` разрешены только variant-only ширина Lora H1
  `+12px` в V2 и Manrope-lede `+12px` в V3; дизайн и межблочные отступы не
  меняются.

## Архитектура

1. `site/` — единый канонический DOM; используемые client строки получают
   `data-copy-id`, owner-block Юлии — отдельные стабильные owner markers.
2. `scripts/client_copy_contract.py` — точный client allowlist, owner override и
   hash frozen source.
3. Все builders меняют только композицию/шрифты/поведение и сохраняют copy.
4. `review-numbered` подписывает только реально использованные client/owner ID.
5. Lead schema `2.0.0`: только обязательные `name`/`phone`; `email` и `topic`
   отсутствуют.
6. `scripts/verify-client-copy.py` проверяет source и все одиннадцать сборок по
   правилу принадлежности; полный `45/45` coverage не является gate.

## Версии кандидата

| Контракт | Версия |
|---|---|
| `FINAL-DEV1-HERO` | `2.0.0 | 2026-08-11` |
| `FINAL-DEV3-DESIGN` | `2.0.2 | 2026-08-13` |
| `ACTION-BAR-SPEC` | `2.3.4 | 2026-08-13` |
| `CLIENT-PREVIEW-MOBILE` | `1.1.0 | 2026-08-11` |
| `LEAD-CONTRACT` | `2.0.0 | 2026-08-11` |
| `REVIEW-NUMBERED` | `2.0.0 | 2026-08-11` |
| `CLIENT-COPY-CONTRACT/VERIFIER` | `1.0.0 | 2026-08-11` |
| `FONT-VARIANT-V2-MOBILE` | `1.1.0 | 2026-08-13` |
| `FONT-VARIANT-V3-MOBILE` | `1.0.0 | 2026-08-13` |
| `PREVIEW-BROWSER-QA-RUNNER` | `1.3.2 | 2026-08-13` |

## Сборка и проверка

1. Пересобрать Hero, font, Action Bar и review artifacts из `site/`.
2. Проверить принадлежность каждого размещённого смыслового текста client или
   owner allowlist и отсутствие запрещённого copy во всех одиннадцати.
3. Проверить форму: только обязательные имя/телефон; `topic` и `email` не
   рендерятся, не принимаются и не отправляются.
4. Прогнать статический preview verifier, lead tests и browser matrix на обеих
   сторонах `960/961px`, коротком mobile и desktop.
5. Проверить Action Bar и `final-dev3`: Hero меняется по той же карте рабочего
   времени, без второго timer; WhatsApp использует `wa.me` без `?text=`;
   первый downscroll остаётся hidden до геометрического прохода `.hero__phone`,
   после прохода возврат на `scrollY > 1` остаётся visible, а `scrollY <= 1`
   скрывает панель/demo и сбрасывает latch.
6. Для `v2-lora-inter` и `v3-literata-manrope` проверить `345×600/668`,
   моделирующие nominal `360px` с classic scrollbar `15px`: Lora H1 `5→4`
   строки, Manrope-lede `4→3`; без изменений шрифтов/crop/отступов.

## Приёмка

- [x] hash источника совпадает;
- [x] каждый размещённый client-блок дословно входит в allowlist; missing
  разрешённых блоков допустим;
- [x] точный прежний блок Юлии присутствует как `OWNER-APPROVED` без изменений;
- [x] смыслового текста вне client/owner allowlist нет;
- [x] `SYSTEM-UI` не добавляет новых фактов/обещаний;
- [x] `Email`, `topic`, proof-тексты и «ВПЕРВЫЕ…» отсутствуют;
- [x] неутверждённый WhatsApp prefill отсутствует; markers Action Bar `2.3.4`
  повторно подтверждены в source и всех builds;
- [x] source/build markers и версии согласованы после полной пересборки;
- [x] browser matrix и overflow gates: итог
  `177/177 = 110 main + 55 breakpoint + 8 large + 4 effective-width`;
- [x] regression `final-dev3`: `0 → 2 → 50 → 100 → 320` hidden → pass Hero
  visible → `320` visible → `0` reset → `320` hidden;
- [x] ручной visual QA повторён для текущего кандидата, включая
  `v2-lora-inter` и `v3-literata-manrope` на `345×600/668`;
- [x] Preview опубликованы после явного разрешения владельца; live `177/177`,
  served-content 11/11 и API readback PASS; production не изменён.

## Публикация

После явного `go` владельца 11 Preview опубликованы из SHA
`75558d904d2d1d41ffc9af075f2ea363b15c0b91`; live Browser QA `177/177` и
served-content readback 11/11 прошли. Production не деплоился. Полный отчёт:
[`../reviews/2026-08-13-client-preview-live-release.md`](../reviews/2026-08-13-client-preview-live-release.md).

## Related

- [Карта источников](../CONTENT-SOURCE-MAP.md)
- [Утверждённые блоки](../CONTENT-APPROVED.md)
- [Финальный QA](../FINAL-QA-CHECKLIST.md)
- [Карта Preview](../boards/2026-08-06-versions-links.md)

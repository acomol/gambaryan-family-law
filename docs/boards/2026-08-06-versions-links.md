# Одиннадцать Cloudflare Preview-версий для заказчика

**Версия документа:** `2.7.0`; исполняемая Preview-карта — `2.4.0`

**Обновлено:** `2026-08-17`

**Статус:** `final-dev3 LIVE / остальные 10 alias LIVE PENDING / PRODUCTION UNCHANGED`

`final-dev3` опубликован из `main` (GitHub Actions run `32038757556`,
подтверждено байтовым readback 2026-08-17). Остальные десять alias ниже пока
обслуживают старый release `75558d904d2d1d41ffc9af075f2ea363b15c0b91` —
проверено байтовым сравнением, защиты тире там нет. Обновить перед отправкой
клиенту: `Actions -> Deploy Previews -> Run workflow`, поле `only` пусто.

## Ссылки и различия

| № | Preview | Отличие нового кандидата | URL |
|---:|---|---|---|
| 1 | `final-dev` | Базовая композиция и эталон Action Bar | https://final-dev.gambarian-landing.pages.dev/ |
| 2 | `final-dev1` | Без desktop-дубля телефона, плотный mobile crop и короткая mobile-композиция | https://final-dev1.gambarian-landing.pages.dev/ |
| 3 | `final-dev3` | Те же композиция и Playfair/Onest, что в `final-dev1`; панель скрыта на первом downscroll внутри Hero, после прохода Hero остаётся при возврате и сбрасывается на верху | https://final-dev3.gambarian-landing.pages.dev/ |
| 4 | `v1-playfair-onest` | Playfair Display + Onest | https://v1-playfair-onest.gambarian-landing.pages.dev/ |
| 5 | `v2-lora-inter` | Lora + Inter; effective-width `345×600/668`: только Lora H1 width `+12px` (`5→4` строки) | https://v2-lora-inter.gambarian-landing.pages.dev/ |
| 6 | `v3-literata-manrope` | Literata + Manrope; effective-width `345×600/668`: только Manrope lede width `+12px` (`4→3` строки) | https://v3-literata-manrope.gambarian-landing.pages.dev/ |
| 7 | `v4-ptserif-golos` | PT Serif + Golos Text | https://v4-ptserif-golos.gambarian-landing.pages.dev/ |
| 8 | `hero-a-actions-first` | Hero: действия перед фото | https://hero-a-actions-first.gambarian-landing.pages.dev/ |
| 9 | `hero-b-call-first` | Hero: телефонный блок выше формы/фото | https://hero-b-call-first.gambarian-landing.pages.dev/ |
| 10 | `action-bar` | Эталон зонной мобильной панели | https://action-bar.gambarian-landing.pages.dev/ |
| 11 | `review-numbered` | Реально использованные client/owner блоки со служебными номерами | https://review-numbered.gambarian-landing.pages.dev/ |

## Общее для нового кандидата

- каждый размещённый смысловой блок входит в client allowlist или в точный
  `OWNER-APPROVED` блок Юлии/`fact-900-v1`; фактически используются `37/45`
  client ID;
- все три карточки фактов тёмные; `2.10` имеет единственную золотую рамку,
  `30+` центрировано только на desktop, `Автор / более 900` не переносится;
- вне client/owner allowlist разрешены только identity и `SYSTEM-UI`;
- форма содержит только `Имя`/`Телефон`; Email, topic, proof-тексты и редакция
  «ВПЕРВЫЕ…» отсутствуют;
- Action Bar `2.3.4` общий для всех вариантов и использует `wa.me` без
  неутверждённого `?text=` prefill;
- effective-width fixes V2/V3 меняют только доступную ширину H1/lede на
  `+12px`; дизайн, шрифты, photo source/crop и межблочные отступы сохраняются;
- production не меняется.

## Версии контрактов

| Функционал | Версия кандидата | Дата | Статус контракта |
|---|---:|---:|---:|
| Action Bar | `2.3.4` | 2026-08-13 | `LIVE PASS 11/11` |
| Client Preview Mobile | `1.1.0` | 2026-08-11 | `LIVE PASS 11/11` |
| Client Copy contract: 45 allowlist + 2 Owner overrides | `1.1.0` | 2026-08-13 | `LOCAL PASS` |
| Client Copy verifier | `1.0.0` | 2026-08-11 | `LOCAL PASS 24 targets / 22 unique` |
| Desktop Hero `final-dev1` | `2.0.0` | 2026-08-11 | `LIVE PASS` |
| `final-dev3` | `2.0.2` | 2026-08-13 | `LIVE PASS` |
| Lead hook / форма (name + phone only) | `2.0.0` | 2026-08-11 | `LIVE PASS` |
| Review numbering | `2.0.0` | 2026-08-11 | `LIVE PASS` |
| Font Variant V2 Mobile | `1.1.0` | 2026-08-13 | `LIVE PASS` |
| Font Variant V3 Mobile | `1.0.0` | 2026-08-13 | `LIVE PASS` |
| Browser QA runner | `1.4.0` | 2026-08-13 | `LOCAL PASS 177/177` |

Marker `final-dev3`: `FINAL-DEV3-DESIGN v2.0.2 | 2026-08-13`.

## Историческая live-приёмка

| Release | Статус |
|---|---|
| Прежние десять Preview, commit `98374c1` | `HISTORICAL LIVE PASS` |
| `final-dev3 v1.0.0`, commit `78f429d`, deployment `2f20dc33-714f-4b3a-86ea-b51880e33f05` | `HISTORICAL LIVE PASS` |
| `final-dev3 v1.1.0`, commit `88efa2c`, deployment `52a9addb-0166-4f78-8c7d-5f1b0ed2ad07` | `HISTORICAL LIVE PASS` |

Эти live-результаты и промежуточный локальный PASS `45/45` не доказывают
финальный allowlist-контракт. Прежние заявления `173/173` и manual PASS для
текущего кандидата имеют статус `HISTORICAL / INVALIDATED` после независимого
Claude review. Полный текущий gate —
`177/177 = 110 main + 55 breakpoint + 8 large + 4 effective-width` плюс ручной
visual QA — были пройдены локально и на live до обнаружения внутрикардового
клиппинга. Текущий локальный runner `1.4.0` закрывает этот пробел; новый deploy
ещё не выполнен. Полные UUID release `75558d9` и erratum:
[`../reviews/2026-08-13-client-preview-live-release.md`](../reviews/2026-08-13-client-preview-live-release.md).

## Карта пересборки

| Группа | Источник | Производные |
|---|---|---|
| База | `site/` | все одиннадцать Preview |
| Copy | frozen `docs/sources/client-copy-short-v1.0.0.txt` + `scripts/client_copy_contract.py` | 45 client allowlist, owner overrides Юлии/`fact-900-v1` и статический gate source + builds |
| Action Bar | `site-addons/action-bar/` | общий addon во всех Preview |
| Hero | `scripts/build-hero-variants.py` | `final-dev1`, `final-dev3`, Hero A/B |
| Шрифты | `scripts/build-font-variants.py` | четыре font Preview |
| Review | `scripts/build-review-numbered.py` | `review-numbered`, 37 используемых client ID + 2 owner blocks |

## Ограничения

- Preview имеют `noindex` и не являются production.
- Реальный Albato POST не выполнять до настройки секрета и readback.
- Stable URL не означает, что локальный кандидат уже опубликован.

## Related

- [Строгий клиентский copy](../tasks/2026-08-11-client-approved-copy-only.md)
- [Dark fact cards](../tasks/2026-08-13-dark-fact-cards.md)
- [Пакет для заказчика](../CLIENT-PREVIEW-HANDOFF.md)
- [Финальный QA](../FINAL-QA-CHECKLIST.md)
- [Deploy runbook](../DEPLOY.md)

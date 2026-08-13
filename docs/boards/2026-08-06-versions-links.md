# Одиннадцать Cloudflare Preview-версий для заказчика

**Версия карты:** `2.4.3`

**Обновлено:** `2026-08-13`

**Статус:** `LOCAL QA PASS / LIVE PENDING / NO DEPLOY`

Стабильные aliases ниже сейчас обслуживают предыдущий опубликованный release.
Он сохранён как `HISTORICAL LIVE`; описание отличий в таблице относится к
новому локальному кандидату и станет live только после отдельного деплоя.

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
  `OWNER-APPROVED` блок Юлии; полный coverage 45 client ID не требуется;
- вне client/owner allowlist разрешены только identity и `SYSTEM-UI`;
- форма содержит только `Имя`/`Телефон`; Email, topic, proof-тексты и редакция
  «ВПЕРВЫЕ…» отсутствуют;
- Action Bar `2.3.4` общий для всех вариантов и использует `wa.me` без
  неутверждённого `?text=` prefill;
- effective-width fixes V2/V3 меняют только доступную ширину H1/lede на
  `+12px`; дизайн, шрифты, photo source/crop и межблочные отступы сохраняются;
- production не меняется.

## Версии контрактов

| Функционал | Локальный кандидат | Дата | Live до публикации |
|---|---:|---:|---:|
| Action Bar | `2.3.4` | 2026-08-13 | `2.3.1` `HISTORICAL` |
| Client Preview Mobile | `1.1.0` | 2026-08-11 | `1.0.0` `HISTORICAL` |
| Client Copy allowlist + Owner override | `1.0.0` | 2026-08-11 | текущего live нет; повторить в final full QA |
| Desktop Hero `final-dev1` | `2.0.0` | 2026-08-11 | `1.3.0` `HISTORICAL` |
| `final-dev3` | `2.0.2` | 2026-08-13 | `1.1.0` `HISTORICAL` |
| Lead hook / форма (name + phone only) | `2.0.0` | 2026-08-11 | `1.1.0` `HISTORICAL` |
| Review numbering | `2.0.0` | 2026-08-11 | прежние 102 подписи `HISTORICAL` |
| Font Variant V2 Mobile | `1.1.0` | 2026-08-13 | прежний `1.0.0` `HISTORICAL` |
| Font Variant V3 Mobile | `1.0.0` | 2026-08-13 | текущего live нет |
| Browser QA runner | `1.3.2` | 2026-08-13 | `1.2.x` `HISTORICAL` |

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
visual QA — пройдены локально. Deployment не выполнялся и запрещён до отдельного
разрешения владельца.

## Карта пересборки

| Группа | Источник | Производные |
|---|---|---|
| База | `site/` | все одиннадцать Preview |
| Copy | frozen `docs/sources/client-copy-short-v1.0.0.txt` + `scripts/client_copy_contract.py` | client allowlist, owner override и статический gate source + builds |
| Action Bar | `site-addons/action-bar/` | общий addon во всех Preview |
| Hero | `scripts/build-hero-variants.py` | `final-dev1`, `final-dev3`, Hero A/B |
| Шрифты | `scripts/build-font-variants.py` | четыре font Preview |
| Review | `scripts/build-review-numbered.py` | `review-numbered`, 38 используемых client ID + owner block |

## Ограничения

- Preview имеют `noindex` и не являются production.
- Реальный Albato POST не выполнять до настройки секрета и readback.
- Stable URL не означает, что локальный кандидат уже опубликован.

## Related

- [Строгий клиентский copy](../tasks/2026-08-11-client-approved-copy-only.md)
- [Пакет для заказчика](../CLIENT-PREVIEW-HANDOFF.md)
- [Финальный QA](../FINAL-QA-CHECKLIST.md)
- [Deploy runbook](../DEPLOY.md)

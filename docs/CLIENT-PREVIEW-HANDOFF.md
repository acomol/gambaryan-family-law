# Пакет Preview для согласования с заказчиком

**Версия:** `CLIENT-PREVIEW-HANDOFF v2.1.3`

**Дата:** `2026-08-13`

**Статус:** `LOCAL QA PASS / LIVE PENDING / DO NOT SEND / NO DEPLOY`

## Важное перед отправкой

Стабильные URL сейчас показывают исторический опубликованный release. Последняя
коррекция владельца реализована локально: точный блок Юлии сохранён, поля
«Тема обращения» и Email удалены. Текущий кандидат использует Action Bar
`2.3.4`, `final-dev3 2.0.2` и Browser runner `1.3.2`. Финальная матрица
`177/177` и ручной visual QA пройдены локально. Клиенту ссылки не отправлять
до deployment и live-readback исправленного кандидата.

## Что одинаково во всех одиннадцати кандидатах

- каждый размещённый смысловой текст входит в client allowlist или в точный
  `OWNER-APPROVED` блок Юлии; использовать все 45 client ID необязательно;
- общий Action Bar `2.3.4` с business-hours и demo-switch;
- общий mobile-слой `CLIENT-PREVIEW-MOBILE v1.1.0`;
- WhatsApp `wa.me/972545490623` без неутверждённого prefill;
- форма содержит только обязательные имя и телефон, без Email и topic;
- одинаковые телефон/WhatsApp, `noindex`, lead/autofill/validation;
- точный прежний блок Юлии сохранён; proof-тексты и редакция «ВПЕРВЫЕ…»
  отсутствуют.
- Effective-width fixes V2/V3 меняют только доступную ширину H1/lede на
  `+12px`; дизайн, семейства/размеры шрифтов, photo source/crop и межблочные
  отступы сохраняются.

## Короткое описание каждого URL

| URL | Что отличается |
|---|---|
| https://final-dev.gambarian-landing.pages.dev/ | Базовый визуальный вариант и эталон Action Bar |
| https://final-dev1.gambarian-landing.pages.dev/ | Без desktop-дубля телефона, плотнее mobile-фото, CTA входят на коротком экране |
| https://final-dev3.gambarian-landing.pages.dev/ | Те же композиция и Playfair/Onest, что в `final-dev1`; Action Bar/demo скрыты до первого прохода Hero, после него остаются видимыми при возврате и сбрасываются на верху |
| https://v1-playfair-onest.gambarian-landing.pages.dev/ | Playfair Display + Onest |
| https://v2-lora-inter.gambarian-landing.pages.dev/ | Lora + Inter; `FONT-VARIANT-V2-MOBILE v1.1.0`, Lora H1 width `+12px` на effective-width `345×600/668` (`5→4` строки) |
| https://v3-literata-manrope.gambarian-landing.pages.dev/ | Literata + Manrope; `FONT-VARIANT-V3-MOBILE v1.0.0`, Manrope lede width `+12px` на effective-width `345×600/668` (`4→3` строки) |
| https://v4-ptserif-golos.gambarian-landing.pages.dev/ | PT Serif + Golos Text |
| https://hero-a-actions-first.gambarian-landing.pages.dev/ | Hero: действия идут перед фотографией |
| https://hero-b-call-first.gambarian-landing.pages.dev/ | Hero: контактный блок поднят выше |
| https://action-bar.gambarian-landing.pages.dev/ | Эталон поведения нижней мобильной панели |
| https://review-numbered.gambarian-landing.pages.dev/ | Служебная сверка реально использованных client/owner блоков по номерам |

## Что должен проверить клиент

- какой шрифт лучше читается;
- какой порядок Hero понятнее;
- нормально ли кадрированы адвокаты на mobile/desktop;
- помещаются ли CTA и не перекрывают ли фото;
- понятны ли рабочее/нерабочее состояния панели и `final-dev3` Hero;
- нет ли смысловых формулировок вне client/owner allowlist.

## Что уже не требуется выбирать

- форма содержит только `Имя` и `Телефон`: ни topic, ни Email;
- полный client coverage не требуется: документ работает как allowlist;
- точный прежний блок Юлии подтверждён владельцем и сохраняется;
- Action Bar WhatsApp не подставляет неутверждённое сообщение.

## Перед отправкой заказчику

- [x] повторить `CLIENT-COPY-VERIFIER v1.0.0` после полной пересборки: каждый
  размещённый смысловой блок входит в client/owner allowlist на всех 11;
  coverage `45/45` не требуется;
- [x] повторить lead tests `2.0.0` после удаления Email/topic;
- [x] full browser matrix `PREVIEW-BROWSER-QA-RUNNER v1.3.2` — итог
  `177/177 = 110 main + 55 breakpoint + 8 large + 4 effective-width`;
- [x] manual screenshots/visual inspection, включая V2/V3 `345×600/668`;
- [ ] commit/push feature branch и новый CI result;
- [ ] явное разрешение владельца на Preview deploy получено;
- [ ] 11/11 stable URL проверены по marker и served behavior;
- [ ] production readback показывает отсутствие изменений.

## Исторические releases

`final-dev3 v1.0.0` и `v1.1.0`, Action Bar `2.3.1`, прежний
`final-dev1 v1.3.0` и review со 102 подписями — `HISTORICAL LIVE PASS`.
Их результаты и промежуточный локальный PASS `45/45` не считаются приёмкой
исправленного allowlist-кандидата. Прежние заявления `173/173` и manual PASS
для текущего кандидата — `HISTORICAL / INVALIDATED` после независимого Claude
review: они не покрывали stateless-scroll regression и четыре effective-width
cells V2/V3 `345×600/668`. Новый кандидат прошёл локальную приёмку и остаётся
`LIVE PENDING` до разрешённого deploy/readback.

## Related

- [Карта Preview](boards/2026-08-06-versions-links.md)
- [Действующее задание](tasks/2026-08-11-client-approved-copy-only.md)
- [Карта источников](CONTENT-SOURCE-MAP.md)
- [Frozen client source](sources/client-copy-short-v1.0.0.txt)
- [Финальный QA](FINAL-QA-CHECKLIST.md)
- [Screen composition](SCREEN-COMPOSITION.md)

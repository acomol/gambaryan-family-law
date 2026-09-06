# Пакет Preview для согласования с заказчиком

**Версия:** `CLIENT-PREVIEW-HANDOFF v2.4.1`

**Дата:** `2026-09-06`

**Статус:** `final-dev3 LIVE + VERIFIED / остальные 10 alias LIVE PENDING / PRODUCTION UNCHANGED`

## Важное перед отправкой

**Только `final-dev3` отдаёт текущий код.** Он опубликован из `main`
(GitHub Actions run `32038757556`, все шаги `success`) и подтверждён
независимым байтовым readback 2026-08-17: защита тире на месте, Action Bar
`2.4.0` с переключателем рабочего времени, доступным на desktop и mobile.
Этот один URL можно отправлять.

**Остальные десять** (`final-dev`, `final-dev1`, `v1`…`v4`, `hero-a`,
`hero-b`, `action-bar`, `review-numbered`) **всё ещё отдают release
`75558d9`** от 2026-08-13 — старую версию без правок от 2026-08-17. Проверено
байтовым сравнением: 0 вхождений защиты тире на выборке из четырёх alias.
Не отправлять клиенту вместе с `final-dev3` как «одинаковый набор» — они
разойдутся визуально и текстуально. Обновить перед отправкой: `Actions ->
Deploy Previews -> Run workflow`, поле `only` пусто (все 11) или конкретный
alias. Production не изменён ни разу.

## Что одинаково во всех одиннадцати кандидатах

- каждый размещённый смысловой текст входит в client allowlist или в один из
  двух точных `OWNER-APPROVED` блоков: Юлия и `fact-900-v1`; фактически
  используются `37/45` client ID;
- все три карточки фактов тёмные; только `2.10` имеет золотую рамку;
- `30+` центрировано и увеличено только на desktop; `2.10` использует две
  полноразмерные строки; карточка `fact-900-v1` показывает `Автор` и
  `более 900` без прежней строки `опубликованных материалов,`;
- общий Action Bar `2.4.0` с business-hours и demo-switch (переключатель доступен и на desktop); на живых alias кроме `final-dev3` пока стоит `2.3.4`;
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

- [x] повторить `CLIENT-COPY-CONTRACT v1.1.0` через
  `CLIENT-COPY-VERIFIER v1.0.0` после полной пересборки: `24 targets / 22
  unique`, `45` client allowlist + `2` owner blocks, фактически `37` client ID;
- [x] повторить lead tests `2.0.0` после удаления Email/topic;
- [x] full browser matrix `PREVIEW-BROWSER-QA-RUNNER v1.4.0` — итог
  `177/177 = 110 main + 55 breakpoint + 8 large + 4 effective-width`, включая
  fact-card clipping/DOMRect и оба состояния mobile-аккордеона;
- [x] эталоны `1440`, `390 collapsed`, `390 expanded` сохранены в
  `design-references/`;
- [x] функциональный кандидат закоммичен, запушен, CI зелёный (`main` `37ebf2b`);
- [x] deploy `final-dev3` выполнен и подтверждён readback (run `32038757556`);
- [ ] остальные 10/11 stable URL всё ещё отдают старый served content —
  обновить тем же workflow перед отправкой полного набора;
- [x] production readback показывает отсутствие изменений — подтверждено и
  до, и после деплоя `final-dev3` (SHA-256 `656CBCD0…C13E22` неизменно).

## Исторические releases

`final-dev3 v1.0.0` и `v1.1.0`, Action Bar `2.3.1`, прежний
`final-dev1 v1.3.0` и review со 102 подписями — `HISTORICAL LIVE PASS`.
Их результаты и промежуточный локальный PASS `45/45` не считаются приёмкой
исправленного allowlist-кандидата. Прежние заявления `173/173` и manual PASS
для текущего кандидата — `HISTORICAL / INVALIDATED` после независимого Claude
review: они не покрывали stateless-scroll regression и четыре effective-width
cells V2/V3 `345×600/668`. Release `75558d9` затем получил отдельный erratum по
desktop-клиппингу `2.10`; полный отчёт —
[`reviews/2026-08-13-client-preview-live-release.md`](reviews/2026-08-13-client-preview-live-release.md).

## Related

- [Карта Preview](boards/2026-08-06-versions-links.md)
- [Действующее задание: dark fact cards](tasks/2026-08-13-dark-fact-cards.md)
- [Copy contract](tasks/2026-08-11-client-approved-copy-only.md)
- [Owner edits](CONTENT-OWNER-EDITS.md)
- [Карта источников](CONTENT-SOURCE-MAP.md)
- [Frozen client source](sources/client-copy-short-v1.0.0.txt)
- [Финальный QA](FINAL-QA-CHECKLIST.md)
- [Screen composition](SCREEN-COMPOSITION.md)

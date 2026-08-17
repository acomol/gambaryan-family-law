# Final Dev 1 — вариант Hero

**Версия:** `FINAL-DEV1-HERO v2.0.0`

**Дата:** `2026-08-11`

**Статус:** `LIVE PASS / PRODUCTION UNCHANGED`

**Preview alias:** https://final-dev1.gambarian-landing.pages.dev/

**Визуальный reference:** `docs/design-references/final-dev1-desktop-hero-v1.0.0.png`,
`1293×724`, SHA-256
`1E07C0D348AC6C61754D8B05B1FFD1A3F31C8F03B34D85749559707398BC27AB`.

## Действующее решение

`final-dev1` сохраняет только отличия композиции:

- без дублирующего desktop-телефона в шапке;
- более плотное mobile-кадрирование исходного Hero-фото;
- сжатые интервалы, чтобы CTA входили на коротких мобильных экранах;
- Playfair Display + Onest и общий Action Bar `2.3.4`.

Каждый размещённый смысловой текст входит в client allowlist или в точный
`OWNER-APPROVED` блок Юлии и совпадает с остальными Preview. Использовать все 45
client ID необязательно. Builder не добавляет отдельный copy-слой.

## SUPERSEDED: `v1.3.0` и неутверждённый copy

Опубликованный `FINAL-DEV1-HERO v1.3.0` остаётся `HISTORICAL LIVE PASS`, но не
является текущим контентным кандидатом. Из `v2.0.0` удаляются:

- «Или позвоните сразу» и «Срочный вопрос? Позвоните напрямую»;
- три proof-подписи «Семейное право…», «Конфиденциальность…» и
  «Индивидуальный подход…»;
- редакция прецедента «ВПЕРВЫЕ / СОЗДАН ПРЕЦЕДЕНТ… / Добились…»;
- любая сокращённая или рекламная замена номерных блоков.

Точный прежний блок Юлии не относится к этому списку: он отдельно подтверждён
владельцем и должен быть сохранён как `OWNER-APPROVED` override.

Исторические коммиты/deployments `v1.1.0`–`v1.3.0` сохраняются в Git/Cloudflare
и не переопределяются этой документацией.

## Реализация `v2.0.0`

- source of truth: вариант `dev1` в `scripts/build-hero-variants.py`;
- изоляция стилей: `.hero--final-dev1`;
- marker: `FINAL-DEV1-HERO v2.0.0 | 2026-08-11`;
- каждый реально использованный client `data-copy-id` сохраняется без изменения
  текста; полный coverage `45/45` не требуется;
- точный прежний блок Юлии сохраняется как `OWNER-APPROVED`;
- в Hero остаётся один телефонный блок; WhatsApp доступен в общем Action Bar;
- общий Action Bar `2.3.4` не содержит неутверждённого WhatsApp prefill;
- source assets фото не меняются.

## Приёмка

- [x] builder завершается без ошибки;
- [x] `CLIENT-COPY-VERIFIER v1.0.0` подтверждает принадлежность каждого
  размещённого смыслового текста client/owner allowlist;
- [x] точный прежний блок Юлии присутствует; proof и другие неутверждённые
  owner-copy отсутствуют;
- [x] на `360×600`, `360×668`, `390×724`, `390×844`, `860×760` обе Hero CTA
  доступны, лица не обрезаны и overflow равен нулю;
- [x] на `961`, `1024`, `1280`, `1440` текст не пересекает фотографию;
- [x] desktop header не содержит дублирующий номер, mobile drawer рабочий;
- [x] Action Bar работает по зонам и business-hours;
- [x] Preview опубликован после разрешения; production не изменён.

## Публикация

Live `v1.3.0` — `HISTORICAL`; текущий `v2.0.0` после owner correction
опубликован и прошёл live-readback.

## Related

- [Действующий client + owner allowlist](2026-08-11-client-approved-copy-only.md)
- [Карта источников](../CONTENT-SOURCE-MAP.md)
- [Карта Preview](../boards/2026-08-06-versions-links.md)
- [Финальный QA](../FINAL-QA-CHECKLIST.md)

# Задание: отдельный `final-dev3`

**Версия:** `FINAL-DEV3-PLAN v2.0.1`

**Дата:** `2026-08-13`

**Статус:** `FINAL-DEV3-DESIGN v2.0.1 LOCAL QA PASS / LIVE PENDING`

## Цель

Сохранить выбранную композицию `final-dev1`, Playfair Display + Onest и общий
Action Bar, но применить client + owner allowlist-контракт ко всему варианту.
`final-dev3` отличается поведением Hero-контакта: он использует уже вычисленное
Action Bar состояние и синхронно отражает рабочее/нерабочее время.

## Состав `v2.0.1`

- база: `FINAL-DEV1-HERO v2.0.0`;
- шрифты: Playfair Display + Onest;
- текст: каждый размещённый смысловой блок входит в client allowlist или в
  точный `OWNER-APPROVED` блок Юлии; полный coverage 45 ID не требуется;
- Action Bar: `2.3.3`, без неутверждённого WhatsApp prefill;
- lead schema: `2.0.0`, только обязательные name/phone, без Email/topic;
- marker: `FINAL-DEV3-DESIGN v2.0.1 | 2026-08-13`.

## Business-hours

- единственный источник состояния — Action Bar: `Asia/Jerusalem`,
  воскресенье–четверг, `[09:00, 18:00)`;
- в рабочее время Hero сохраняет утверждённый телефон/WhatsApp из блока `1.12`;
- вне рабочего времени телефонная часть Hero уступает место утверждённому
  «Написать в WhatsApp»;
- demo-switch синхронно меняет Hero и Action Bar;
- в закрытом состоянии в Hero видна ровно одна WhatsApp-ссылка, без дубля;
- вторые часы, timer или отдельная карта состояний запрещены.
- только в `final-dev3` панель остаётся видимой при возврате вверх, пока
  `scrollY > 1`; на точном верху страницы, у формы, в открытом меню и при
  фокусе поля она скрыта. Правило живёт в единственном Action Bar owner.

## SUPERSEDED и исторические live

- `FINAL-DEV3-DESIGN v1.0.0`, commit `78f429d`, deployment
  `2f20dc33-714f-4b3a-86ea-b51880e33f05` — `HISTORICAL LIVE PASS`;
- `FINAL-DEV3-DESIGN v1.1.0`, commit `88efa2c`, deployment
  `52a9addb-0166-4f78-8c7d-5f1b0ed2ad07` — `HISTORICAL LIVE PASS`;
- их proof/precedent и другой неутверждённый copy не переносится в `v2.0.1`;
  точный прежний блок Юлии, напротив, сохраняется как `OWNER-APPROVED`;
- stable alias пока обслуживает исторический live; новый кандидат не
  опубликован.

## Приёмка `v2.0.1`

- [x] source/generator/marker согласованы;
- [x] каждый размещённый client/owner блок точен; missing client ID допустим,
  запрещённого текста нет;
- [x] точный прежний блок Юлии присутствует без переформулировок;
- [x] открытое и закрытое Hero-состояния используют только утверждённые строки;
- [x] один business-hours state и один timer;
- [x] Playfair Display + Onest, Action Bar `2.3.3`, lead `2.0.0` name/phone-only
  и визуальные ошибки полей не регрессируют;
- [x] local single-preview и полная browser matrix проходят: общий итог
  `173/173`;
- [x] production и прежние live Preview не изменены: deployment не выполнялся;
- [x] deployment отсутствует до отдельного разрешения владельца.

## Related

- [Действующий client + owner allowlist](2026-08-11-client-approved-copy-only.md)
- [Пакет для заказчика](../CLIENT-PREVIEW-HANDOFF.md)
- [Карта источников](../CONTENT-SOURCE-MAP.md)
- [GAM-DESIGN](../GAMBARIAN-DESIGN-RULES.md)
- [Финальный QA](../FINAL-QA-CHECKLIST.md)
- [Исторический live release](../reviews/2026-08-11-final-dev3-live-release.md)

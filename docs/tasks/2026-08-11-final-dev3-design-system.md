# Задание: отдельный `final-dev3` после утверждения Preview

**Версия:** `FINAL-DEV3-PLAN v1.3.1`

**Дата:** `2026-08-11`

**Статус:** `COMPLETE — FINAL-DEV3-DESIGN v1.1.0 LIVE PASS`

## Цель

Обновить только отдельный `final-dev3`: сохранить выбранные заказчиком шрифт,
Hero, тексты и нижнюю панель, а Hero-контакт синхронизировать с рабочим
состоянием Action Bar. Ни один из десяти переданных Preview и production не
используется как площадка для незавершённых экспериментов.

## Подтверждённый состав

- база и Hero: `final-dev1`;
- шрифты: существующие локальные Playfair Display + Onest из `final-dev1`;
- copy: текущие тексты `final-dev1`, включая owner-редакцию прецедента;
- нижняя панель: общий Action Bar `2.3.1` без копирования business logic;
- production и прежние десять Preview не изменяются и не передеплоиваются.

`final-dev1` уже содержит выбранные семейства, тексты и Action Bar. Поэтому
`final-dev3` является отдельным воспроизводимым кандидатом и Cloudflare alias,
а не скрытой заменой шрифтовых файлов или новым редизайном. Опубликованный
`FINAL-DEV3-DESIGN v1.0.0 | 2026-08-11` остаётся историческим LIVE PASS;
стабильный alias теперь обслуживает `FINAL-DEV3-DESIGN v1.1.0 | 2026-08-11`.

## Изменение `v1.1.0`

- Action Bar `2.3.1` остаётся единственным источником состояния:
  `Asia/Jerusalem`, воскресенье–четверг, `[09:00, 18:00)`.
- В рабочее время Hero сохраняет текущий контакт по телефону.
- В нерабочее время тот же Hero-контакт показывает точный текст
  `Написать в WhatsApp`, WhatsApp-ссылку и WhatsApp-иконку.
- Preview demo-switch синхронно меняет Hero-контакт и состав Action Bar.
- Вторые часы, timer или отдельная карта open/closed для Hero запрещены:
  Hero только отображает уже вычисленное Action Bar состояние.

## Что агент обязан перечислить до внедрения

1. Какие конкретно блоки и файлы будут изменены.
2. Какие элементы останутся byte-identical выбранному Preview.
3. Какая новая версия и дата будут записаны.
4. Какие desktop/mobile viewport и интеракции будут проверены.
5. Как будет доказано, что production и прежние десять Preview не изменились.

Список для `v1.0.0` был показан владельцу перед реализацией; команда «Делай»
получена 2026-08-11. Изменение `v1.1.0` также задано владельцем явно и
ограничено синхронизацией одного Hero-контакта с Action Bar.

## Область реализации

- отдельный артефакт `build/variants/final-dev3`;
- отдельный Cloudflare Preview alias `final-dev3`;
- marker `FINAL-DEV3-DESIGN v1.1.0 | 2026-08-11`;
- правила `GAM-DESIGN` как ограничения и QA-gates без нового визуального слоя;
- выбранные шрифт, Hero и клиентский текст;
- текущие проверенные контракты Action Bar/lead/autofill без дублирования
  state, timer или business logic.

## Не делать

- не менять `final-dev`, `final-dev1` и остальные восемь Preview;
- не деплоить production;
- не переносить upstream design skills буквально;
- не редактировать ignored `build/` вручную;
- не исправлять в этом clone унаследованный zoom-200% accessibility-дефект;
  он остаётся OPEN и не позволяет заявлять полный WCAG AA PASS.

## Историческая приёмка `v1.0.0`

- [x] Commit `78f429d`, deployment
  `2f20dc33-714f-4b3a-86ea-b51880e33f05`, live browser `15/15` и локальная
  карта `173/173` прошли.
- [x] Hero/CTA были pixel-identical `final-dev1` на `1293×724` и `390×844`.
- [x] Cloudflare API и HTTP SHA подтвердили: production и прежние десять
  Preview не изменились.

## Приёмка `v1.1.0`

- [x] Source/generator и marker `FINAL-DEV3-DESIGN v1.1.0 | 2026-08-11`
  согласованы.
- [x] Открытое состояние сохраняет текущий Hero-телефон; закрытое показывает
  ровно `Написать в WhatsApp`, WhatsApp-ссылку и WhatsApp-иконку.
- [x] Автоматическое расписание и demo-switch синхронно меняют Hero и Action
  Bar; в кандидате существует одна карта состояния и один timer Action Bar.
- [x] Тексты, Playfair Display + Onest, геометрия Hero вне изменяемого контакта,
  Action Bar `2.3.1`, lead/autofill и визуальные ошибки полей не регрессируют.
- [x] Полный локальный browser-прогон: `110/110 + 55/55 + 8/8 = 173/173`;
  одиночный `final-dev3` — `15/15`; центрирование формы входит в gate.
- [x] Commit `88efa2c`, CI `31486509765`, Preview deployment
  `52a9addb-0166-4f78-8c7d-5f1b0ed2ad07` и live-readback нового marker прошли.
- [x] Cloudflare API и HTTP SHA-readback подтвердили отсутствие изменений в
  production и прежних десяти Preview.

## Related

- [Пакет для заказчика](../CLIENT-PREVIEW-HANDOFF.md)
- [Карта источников текста](../CONTENT-SOURCE-MAP.md)
- [GAM-DESIGN](../GAMBARIAN-DESIGN-RULES.md)
- [Аудит upstream](../research/AI-DESIGN-SKILLS-AUDIT.md)
- [Финальный QA-чек-лист](../FINAL-QA-CHECKLIST.md)
- [Live release final-dev3](../reviews/2026-08-11-final-dev3-live-release.md)

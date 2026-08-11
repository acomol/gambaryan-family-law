# Задание: отдельный `final-dev3` после утверждения Preview

**Версия:** `FINAL-DEV3-PLAN v1.1.0`

**Дата:** `2026-08-11`

**Статус:** `LOCAL PASS — Cloudflare Preview deployment pending`

## Цель

Собрать новый отдельный `final-dev3` на основе выбранных заказчиком шрифта,
Hero, текстов и нижней панели. Ни один из десяти переданных Preview и production
не используется как площадка для незавершённых экспериментов.

## Подтверждённый состав

- база и Hero: `final-dev1`;
- шрифты: существующие локальные Playfair Display + Onest из `final-dev1`;
- copy: текущие тексты `final-dev1`, включая owner-редакцию прецедента;
- нижняя панель: общий Action Bar `2.3.1` без копирования business logic;
- production и прежние десять Preview не изменяются и не передеплоиваются.

`final-dev1` уже содержит выбранные семейства, тексты и Action Bar. Поэтому
`final-dev3` является отдельным воспроизводимым кандидатом и Cloudflare alias,
а не скрытой заменой шрифтовых файлов или новым редизайном.

## Что агент обязан перечислить до внедрения

1. Какие конкретно блоки и файлы будут изменены.
2. Какие элементы останутся byte-identical выбранному Preview.
3. Какая новая версия и дата будут записаны.
4. Какие desktop/mobile viewport и интеракции будут проверены.
5. Как будет доказано, что production и прежние десять Preview не изменились.

Список был показан владельцу перед реализацией; команда «Делай» получена
2026-08-11. Дополнительные визуальные изменения в этот release не входят.

## Область реализации

- отдельный артефакт `build/variants/final-dev3`;
- отдельный Cloudflare Preview alias `final-dev3`;
- marker `FINAL-DEV3-DESIGN v1.0.0 | 2026-08-11`;
- правила `GAM-DESIGN` как ограничения и QA-gates без нового визуального слоя;
- выбранные шрифт, Hero и клиентский текст;
- текущие проверенные контракты Action Bar/lead/autofill без дублирования
  state или business logic.

## Не делать

- не менять `final-dev`, `final-dev1` и остальные восемь Preview;
- не деплоить production;
- не переносить upstream design skills буквально;
- не редактировать ignored `build/` вручную;
- не исправлять в этом clone унаследованный zoom-200% accessibility-дефект;
  он остаётся OPEN и не позволяет заявлять полный WCAG AA PASS.

## Приёмка

- [x] source/generator и version/date marker согласованы;
- [x] полный browser-прогон по `PREVIEW-BROWSER-QA`: `173/173`;
- [x] текущий текст побайтно унаследован от `final-dev1`;
- [x] Hero/CTA pixel-identical `final-dev1` на `1293×724` и `390×844`;
- [x] Action Bar, автозаполнение и визуальные ошибки полей не регрессируют;
- [ ] PENDING: отдельные commit, push, Preview deploy и live-readback;
- [ ] PENDING: доказать по live baseline, что production и прежние десять Preview
  не изменились.

## Related

- [Пакет для заказчика](../CLIENT-PREVIEW-HANDOFF.md)
- [Карта источников текста](../CONTENT-SOURCE-MAP.md)
- [GAM-DESIGN](../GAMBARIAN-DESIGN-RULES.md)
- [Аудит upstream](../research/AI-DESIGN-SKILLS-AUDIT.md)
- [Финальный QA-чек-лист](../FINAL-QA-CHECKLIST.md)

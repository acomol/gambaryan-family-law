# Задание: отдельный `final-dev3` после утверждения Preview

**Версия:** `FINAL-DEV3-PLAN v1.0.0`

**Дата:** `2026-08-11`

**Статус:** `PAUSED — начать только после ответа заказчика`

## Цель

Собрать новый отдельный `final-dev3` на основе выбранных заказчиком шрифта,
Hero, текстов и нижней панели. Ни один из десяти переданных Preview и production
не используется как площадка для незавершённых экспериментов.

## Обязательные входные решения

- выбран основной Preview;
- выбран один из четырёх шрифтовых наборов;
- выбран Hero: базовый, A, B либо `final-dev1`;
- закрыты нужные строки `OPEN` из `docs/CONTENT-SOURCE-MAP.md`;
- подтверждены расписание и тексты Action Bar.

## Что агент обязан перечислить до внедрения

1. Какие конкретно блоки и файлы будут изменены.
2. Какие элементы останутся byte-identical выбранному Preview.
3. Какая новая версия и дата будут записаны.
4. Какие desktop/mobile viewport и интеракции будут проверены.
5. Как будет доказано, что production и прежние десять Preview не изменились.

После этого владелец подтверждает список, и только затем начинается код.

## Область будущей реализации

- отдельный артефакт `build/variants/final-dev3`;
- отдельный Cloudflare Preview alias `final-dev3`;
- marker `FINAL-DEV3-DESIGN v1.0.0 | <дата реализации>`;
- правила `GAM-DESIGN`, адаптированные к юридическому лендингу;
- выбранные шрифт, Hero и клиентский текст;
- текущие проверенные контракты Action Bar/lead/autofill без дублирования
  state или business logic.

## Не делать

- не менять `final-dev`, `final-dev1` и остальные восемь Preview;
- не деплоить production;
- не переносить upstream design skills буквально;
- не редактировать ignored `build/` вручную;
- не начинать до клиентского ответа.

## Приёмка будущей версии

- source/generator и version/date marker согласованы;
- полный browser-прогон по `PREVIEW-BROWSER-QA`;
- текст соответствует `CONTENT-SOURCE-MAP` после закрытия клиентских решений;
- Hero-фото сверено с оригинальными assets, лица и волосы не обрезаны;
- CTA не перекрывают адвокатов и входят в короткие portrait-экраны;
- Action Bar, автозаполнение и визуальные ошибки полей не регрессируют;
- `final-dev3` получает отдельный commit, push, Preview deploy и live-readback;
- served baseline production и прежних десяти Preview не изменился.

## Related

- [Пакет для заказчика](../CLIENT-PREVIEW-HANDOFF.md)
- [Карта источников текста](../CONTENT-SOURCE-MAP.md)
- [GAM-DESIGN](../GAMBARIAN-DESIGN-RULES.md)
- [Аудит upstream](../research/AI-DESIGN-SKILLS-AUDIT.md)
- [Финальный QA-чек-лист](../FINAL-QA-CHECKLIST.md)

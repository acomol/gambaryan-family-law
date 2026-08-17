# Аудит `elayadesign/ai-design-skills`

**Версия:** `1.0.0`

**Дата:** `2026-08-11`

## Проверенный источник

| Источник | Immutable revision | Проверенный файл |
|---|---|---|
| [`elayadesign/ai-design-skills`](https://github.com/elayadesign/ai-design-skills) | [`1c1e97cb9878e236552c772092dda7adcdddbcb2`](https://github.com/elayadesign/ai-design-skills/tree/1c1e97cb9878e236552c772092dda7adcdddbcb2) | blob [`d1f81e4f1142c0369828b14f4d04ccd5b898106a`](https://github.com/elayadesign/ai-design-skills/blob/1c1e97cb9878e236552c772092dda7adcdddbcb2/skills/landing-page-design/SKILL.md) |
| [`elayadesign/redesign-skill`](https://github.com/elayadesign/redesign-skill) | [`64627f6ebe7a7a2f17c0affe4fe5838e2d46a876`](https://github.com/elayadesign/redesign-skill/tree/64627f6ebe7a7a2f17c0affe4fe5838e2d46a876) | blob [`fe84201bd5052d019001c7929e5e6b9df5aefeec`](https://github.com/elayadesign/redesign-skill/blob/64627f6ebe7a7a2f17c0affe4fe5838e2d46a876/skills/redesign-existing-projects/SKILL.md) |

Проверка выполнена по полному Git-дереву и содержимому обоих skill-файлов.
Сторонние команды установки и скрипты не запускались.

## Что это такое

Основной репозиторий содержит один Markdown-skill, README и MIT license. В нём
нет runtime, генератора кода, шаблонов, зависимостей, тестов, CI, releases или
версионированных tags. Это набор инструкций для LLM, а не дизайн-движок.

Рабочий процесс основного skill:

1. intake: цель, аудитория, трафик, возражения и доказательства;
2. выбор структуры и типа лендинга;
3. copy, CTA и базовые SEO/AEO-решения;
4. применение opinionated visual values;
5. посекционная реализация;
6. ручной checklist.

Для существующего проекта основной skill сам направляет в companion. Companion
задаёт корректную для нас последовательность: `scan → diagnose → targeted fix`,
без переписывания стека и с проверкой после каждого изменения.

## Проверенные ограничения upstream

- README предлагает копирование из mutable `main` без commit pin или checksum.
- Описание skill требует слишком широкого auto-trigger почти для любого UI.
- Визуальные значения являются авторскими предпочтениями, а не стандартом:
  один шрифт, фиксированные семейства, Tailwind-only scale, glass island nav,
  обязательные reveal-анимации и отдельная tagline-секция.
- Запрет любого scroll-listener конфликтует с разрешённым в том же skill
  throttled listener для tagline reveal.
- Обязательная motion-система не содержит собственного требования
  `prefers-reduced-motion`.
- «Правдоподобные» имена и неокруглённые цифры недопустимы как замена реальным
  доказательствам в юридическом проекте.
- Запрет дефисов неприменим к корректному русскому тексту и названию
  `Тель-Авив`.
- Free trial, refund и generic risk reversal не соответствуют юридической
  услуге.

## Матрица применения

| Решение upstream | Статус | Решение для Gambarian |
|---|---|---|
| Один conversion intent | **ADOPT** | Консультация — одна цель; форма, телефон и WhatsApp — каналы этой цели |
| Proof рядом с claim | **ADOPT** | Использовать только подтверждённые факты и реальные материалы клиента |
| Посекционные небольшие изменения | **ADOPT** | Source-of-truth → rebuild → Browser QA → live readback |
| Meaningful wraps и отсутствие orphan words | **ADOPT** | `balance` для заголовков, `pretty` для читаемого текста, ручная проверка русского |
| Полные focus/error/active states | **ADOPT** | Только релевантные состояния; без фиктивных loading/empty у обычных ссылок |
| Один основной CTA | **MODIFY** | `Записаться` визуально primary; телефон/WhatsApp остаются secondary channels |
| Type/spacing/radius tokens | **MODIFY** | Использовать проектную карту, не переносить Tailwind values механически |
| Motion через `IntersectionObserver` | **MODIFY** | Только полезная motion, без scroll-listener и с `prefers-reduced-motion` |
| Один шрифт, без курсива | **REJECT** | Сохраняются Playfair Display + Onest и утверждённый editorial italic |
| Запрет gradients | **REJECT** | Сохраняются задокументированные scrim/градиенты и фирменная палитра |
| Floating glass nav | **REJECT** | Сохраняется текущая шапка и мобильный drawer |
| Обязательная tagline reveal | **REJECT** | Новые секции и copy — только по решению владельца |
| Вымышленные имена/цифры/proof | **REJECT** | Только верифицированные данные |
| Автозамена иконок/шрифтов | **REJECT** | Без новых внешних зависимостей без отдельного решения |

## Security и лицензия

На проверенных revisions исполняемого кода нет, поэтому риск прямого запуска
низкий. Риск prompt/scope injection и дизайн-регрессии при полном копировании —
средний/высокий. Полный upstream не добавляется в `AGENTS.md` и не
автозагружается.

Оба репозитория используют MIT. Если когда-либо будет vendored существенный
фрагмент исходного текста, рядом должна сохраняться соответствующая LICENSE.
Текущая интеграция содержит собственные правила и ссылки на источники, без
копирования upstream skill.

## Вывод

Upstream используется как источник эвристик. Нормативный результат для проекта
— `GAM-DESIGN`, а не чужой `SKILL.md`. Первое применение ограничено
подтверждёнными accessibility/responsive-дефектами и presenter-багом demo
Action Bar; production не изменяется.

## Related

- [Проектная дизайн-система](../GAMBARIAN-DESIGN-RULES.md)
- [План отдельного final-dev3](../tasks/2026-08-11-final-dev3-design-system.md)
- [Финальный QA-чек-лист](../FINAL-QA-CHECKLIST.md)
- [Композиционная спецификация](../SCREEN-COMPOSITION.md)

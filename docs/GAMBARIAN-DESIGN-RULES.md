# GAM-DESIGN — дизайн-контракт лендинга Gambarian

**Версия:** `1.0.0`

**Дата:** `2026-08-11`

## Приоритет решений

При конфликте действует порядок:

1. последнее явное решение владельца/клиента;
2. секция `Приёмка` текущей задачи;
3. `docs/FINAL-QA-CHECKLIST.md` и принятые versioned contracts;
4. этот `GAM-DESIGN`;
5. внешние design skills и общие эвристики.

Внешнее правило никогда не отменяет утверждённую копию, фото, CTA, шрифты,
симметрию, breakpoint или live-функцию.

## Цель страницы

- Один conversion intent: записаться на юридическую консультацию.
- Primary action: `Записаться на консультацию`.
- Телефон и WhatsApp — альтернативные каналы того же действия, а не отдельные
  офферы.
- Все claims, стаж, лицензия, публикации и результаты дел должны иметь
  сохранённый источник. Вымышленные proof, цифры, отзывы и имена запрещены.

## Locked visual system

| Область | Контракт |
|---|---|
| Шрифты | Playfair Display для editorial headings; Onest для интерфейса и текста |
| Палитра | Только существующие проектные tokens; новые цвета требуют version bump |
| Фото | Реальные утверждённые assets; crop не скрывает головы и не создаёт лишний воздух |
| Copy | Только утверждённый текст; изменение фиксируется в `docs/CONTENT-*` |
| CTA | Wine — primary; gold/outline — contextual secondary |
| Радиусы | 8px обычные controls, 12px крупные CTA, 20px крупная precedent surface |
| Контейнер | Существующие `--container` и `--container-hero`; текст не заходит на адвокатов |
| Breakpoints | Существующие contract boundaries; новый порог требует browser evidence по обе стороны |

Не применять автоматически: смену шрифтов, glass/pill navigation, gradient
heading, запрет курсива/дефисов, обязательную асимметрию, новые icon libraries,
tagline reveal или background animation.

## Типографика и читаемость

- Заголовки: meaningful line breaks и `text-wrap: balance` там, где это не
  ломает утверждённый перенос.
- Читаемый основной текст: целевой минимум 16px; вспомогательный текст может
  быть 12–14px только при достаточном контрасте и короткой длине.
- Последняя строка из одного слова устраняется без `nowrap`, создающего
  horizontal overflow.
- Длина абзаца — ориентир до 65 символов/строку; у Hero граница определяется
  безопасной зоной портрета.
- Увеличение размера не оплачивается наложением текста на лица, clipping или
  потерей CTA в обязательном viewport.

## Spacing и geometry

- Для новых правил использовать проектный ряд: `0, 4, 8, 12, 16, 20, 24, 32,
  40, 48, 64, 80, 96px`.
- Legacy values не переписываются массово: нормализуются только в затронутом
  компоненте с визуальной приёмкой.
- Интерактивная цель: 44×44px рекомендуется; 24×24px — нижний формальный
  предел только с достаточным расстоянием.
- `scrollWidth === innerWidth` обязателен от 320px для затронутого компонента и
  от 360px для всей утверждённой страницы.
- Sticky-header anchors должны показывать начало секции, а не прятать его.

## States и motion

- Интерактивы получают релевантные hover, active, focus-visible, disabled,
  loading, success и error states.
- Form errors конкретны, находятся рядом с полем, видимы не только цветом и
  связаны через ARIA.
- Motion работает через `transform`/`opacity`, не через непрерывный
  scroll-listener.
- Любая декоративная motion отключается при `prefers-reduced-motion: reduce`.
- Demo controls не меняют URL/storage/dataLayer и не перекрывают основной
  контент.

## Accessibility и contrast

- Обычный текст: контраст не ниже 4.5:1; крупный — не ниже 3:1.
- Visible label входит в accessible name; состояние switch выражается через
  `aria-checked`, его имя остаётся стабильным.
- Есть skip link, семантические landmarks и видимый focus indicator.
- Скрытые zoning-компоненты не попадают в Tab/a11y tree.
- Проверка выполняется Lighthouse/axe плюс ручной keyboard и Browser QA.

## Responsive acceptance

Минимальная матрица для изменённой поверхности:

- `320×568`, `360×600`, `390×844`, `768×1024`;
- `960×900`, `961×900`, `1024×768`, `1280×720`, `1440×900`, `1920×1080`;
- `844×390` landscape;
- `prefers-reduced-motion: reduce`;
- browser zoom/reflow smoke, если контент скрывается breakpoint-правилом.

Для каждого viewport: overflow, clipping, переносы, touch targets, порядок CTA,
фокус, console errors, image crop и отсутствие пересечения текста с людьми.

## Versioning

- Формулировка без изменения требований: patch.
- Новое правило/gate/token: minor.
- Смена приоритетов, CTA-архитектуры, шрифтов или source-of-truth: major.
- Любое изменение требований обновляет версию и дату одновременно.
- Визуальный variant marker повышается только при изменении его output.

## Related

- [Аудит внешнего design skill](research/AI-DESIGN-SKILLS-AUDIT.md)
- [План отдельного final-dev3](tasks/2026-08-11-final-dev3-design-system.md)
- [Композиционная спецификация](SCREEN-COMPOSITION.md)
- [Финальный QA-чек-лист](FINAL-QA-CHECKLIST.md)

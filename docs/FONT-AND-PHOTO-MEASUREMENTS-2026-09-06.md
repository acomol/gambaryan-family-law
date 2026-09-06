# Измерения: шрифты и фотографии адвокатов на final-dev3

**Версия:** `1.0.0`

**Дата замера:** `2026-09-06`

**Объект:** живая страница `https://final-dev3.gambarian-landing.pages.dev/` (58 592 байта, SHA-256 начинается `525F1912…`), зеркало со всеми 52 ресурсами, рендер в Chromium через Playwright; реально отрисованные шрифты сняты через DevTools-протокол `CSS.getPlatformFontsForNode` (подсчёт глифов по каждому элементу с текстом), а не по объявлениям CSS.

## Шрифты — что объявлено

| Семейство | Начертание | Стиль | display | Файл на месте |
|---|---|---|---|---|
| Onest | 400 800 | normal | swap | да |
| Onest | 400 800 | normal | swap | да |
| Onest | 400 800 | normal | swap | да |
| Onest | 400 800 | normal | swap | да |
| Playfair Display | 500 | italic | swap | да |
| Playfair Display | 500 | italic | swap | да |
| Playfair Display | 500 | normal | swap | да |
| Playfair Display | 500 | normal | swap | да |

CSS-переменные: `--font-serif = "Playfair Display", Georgia, "Times New Roman", serif`; `--font-body = "Onest", Helvetica, Arial, sans-serif`; `--font-narrow = var(--font-body)` — «узкого» шрифта на сайте нет, это псевдоним Onest.

## Шрифты — что реально отрисовано

| Вьюпорт | Шрифт | Тип | Глифов | Доля |
|---|---|---|---:|---:|
| desktop | Onest | веб-шрифт сайта | 3589 | 89.6% |
| desktop | Playfair Display Medium | веб-шрифт сайта | 418 | 10.4% |
| desktop | элементов с фолбэком | — | 0 | — |
| mobile | Onest | веб-шрифт сайта | 3468 | 89.4% |
| mobile | Playfair Display Medium | веб-шрифт сайта | 413 | 10.6% |
| mobile | элементов с фолбэком | — | 0 | — |

**Вывод:** на обоих вьюпортах 0 элементов с системным фолбэком; все глифы отрисованы физическими файлами сайта (Onest ≈89–90%, Playfair Display Medium ≈10–11%).

## Шрифты — где какой (по селекторам `site/styles.css`, `site-addons/action-bar/action-bar.css`)

- **Playfair Display 500** (`--font-serif`): `.hero__title`, `.section-title`, `.svc-title`, `.svc-media__name`, `.precedent-card__title`, `.attorney-card__name`, `.fact-card__num`, `.form-success__title`.
- **Onest** (`--font-body`): `body`, `.btn`, `.svc-tab`, `.lead-form`, `.lead-form__submit`, `.hero__call-label`, `.lead-form__title`.
- **Onest как `--font-narrow`**: `.eyebrow`, `.svc-eyebrow`, `.logo__sub`, `.fact-card__unit`, `.attorney-card__role`, `.field__label`, `.site-footer__label`, `.contact-list__label`, `.svc-media__label`, `.precedent-card__eyebrow`, `.mobile-bar__item`, `.mobile-bar-demo`.

Ограничение для final-dev4: у Playfair загружено одно начертание (500 normal/italic); иерархия «bold/light» внутри Playfair потребует добавить файлы. Onest — переменный 400–800, начертания доступны без новых файлов.

## Фотографии адвокатов

Метод: скриншот элемента `img` при скрытой шапке; верх головы — первая строка пикселей в центральной полосе (30–70% ширины), отличающаяся от фона той же строки на пороге 90 (сумма |ΔRGB|), 4 строки подряд. Отметки проверены визуально.

| Вьюпорт | Кто | Файл | Кадр (px) | object-fit / position | aspect | Верх головы |
|---|---|---|---|---|---|---|
| desktop | Александр | `alexander-card-v2-760w.621afb9f.webp` | 558×698 | cover / 50% 0% | 4 / 5 | 23px = 3.3% |
| desktop | Юлия | `yulia-card-760w.cb17a9cc.webp` | 558×698 | cover / 50% 0% | 4 / 5 | 77px = 11.0% |
| mobile | Александр | `alexander-card-v2-480w.b11d2ea8.webp` | 314×294 | cover / 50% 16% | 16 / 15 | 38px = 12.9% |
| mobile | Юлия | `yulia-card-480w.a736c3ca.webp` | 314×294 | cover / 50% 0% | 16 / 15 | 20px = 6.8% |

Десктопные значения таблицы выше сняты из-под фиксированной шапки и неверны для десктопа; повторный замер со скрытой шапкой (кадры с отметкой: `design-references/attorney-head-top-2026-09-06-desktop-0-clean-marked.png`, `…-desktop-1-clean-marked.png`, мобильные `…-mobile-0-marked.png`, `…-mobile-1-marked.png`):

| Вьюпорт | Кто | Верх головы |
|---|---|---|
| desktop 1440 | Александр | 75px = 10.7% |
| desktop 1440 | Юлия | 30px = 4.3% |
| mobile 390 | Александр | 38px = 12.9% |
| mobile 390 | Юлия | 20px = 6.8% |

В исходных файлах (все размеры одинаково): Александр — верх головы на **8.8%** высоты, Юлия — на **4.2%**. Разница заложена в кадрировании файлов, а не в CSS. На десктопе компенсации нет (`object-position: center top` у обоих); на мобильном для первой карточки стоит `object-position: center 16%` с комментарием «голова ниже примерно на 5%» — оценка занижена: реальная разница ≈8.7% высоты кадра, а сдвиг 16% от запаса cover поднимает голову лишь на ~16px из нужных ~34.

**Рекомендация для final-dev4:** выравнивать верх головы перекадрированием исходников (держится на любой ширине), а не `object-position` (требует пересчёта на каждый брейкпоинт и уже раз недокручен). Критерий: разница верха головы ≤3px на 1440 и 390 тем же замером.

## Related

- [Правки владельцев](CONTENT-OWNER-REVISIONS-2026-09-06.md)
- [Спецификация final-dev4](tasks/2026-09-06-final-dev4-spec.md)
- [Шрифтовые варианты](FONT-VARIANTS.md)
- [Композиция экранов](SCREEN-COMPOSITION.md)

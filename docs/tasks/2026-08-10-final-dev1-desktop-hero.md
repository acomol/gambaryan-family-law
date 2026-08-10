# Final Dev 1 — расширенный конверсионный блок Hero на десктопе

**Версия:** `FINAL-DEV1-HERO v1.0.0`

**Дата:** `2026-08-10`

**Ветка:** `claude/website-development-kb0fu0`

**Preview:** https://final-dev1.gambarian-landing.pages.dev/

## Источник решения

- Референс владельца: [final-dev1-desktop-hero-v1.0.0.png](../design-references/final-dev1-desktop-hero-v1.0.0.png)
- Размер: `1293×724 px`.
- SHA-256: `1E07C0D348AC6C61754D8B05B1FFD1A3F31C8F03B34D85749559707398BC27AB`.
- Уточнение владельца: длинное пояснение не удаляется и располагается ниже
  ряда из трёх иконок.

## Область изменений

Создаётся отдельная производная `build/variants/final-dev1`. Исходный `site/`,
production, существующий `final-dev` и остальные Preview не меняются.

На ширине от `961px` нижняя часть Hero имеет следующий реальный DOM-порядок:

1. основная кнопка «Записаться на консультацию»;
2. золотой разделитель;
3. расширенный блок звонка с круглой иконкой, текстом «Или позвоните сразу»,
   номером `054-549-0623` и подписью «Срочный вопрос? Позвоните напрямую»;
4. три преимущества с декоративными иконками:
   - «Семейное право во всех аспектах»;
   - «Конфиденциальность и защита интересов»;
   - «Индивидуальный подход к каждому делу»;
5. существующий длинный `.hero__note` без изменения текста.

Шапка, заголовок, вводный текст, фотографии и их кадрирование не меняются.
На ширине до `960px` новый ряд преимуществ скрыт, а звонок и остальной Hero
сохраняют базовую компактную композицию. Action Bar использует общий контракт
`v2.3.0` с автоматическим составом по рабочему времени Израиля и Preview-
переключателем для демонстрации обоих состояний.

## Реализация

- Source of truth: вариант `dev1` в `scripts/build-hero-variants.py`.
- Изоляция стилей: `.hero--final-dev1`.
- Маркер версии и даты присутствует в HTML и CSS сборки.
- В Hero остаётся ровно один `.hero__phone`: он служит sentinel для зонной
  модели Action Bar.
- Все SVG преимуществ имеют `aria-hidden="true"`; текст преимуществ остаётся
  доступным в семантическом списке.

## Приёмка

### Статические гейты

- [x] `python scripts/build-hero-variants.py dev1` завершается с кодом `0`.
- [x] `python scripts/verify-client-previews.py` подтверждает точную карту из
  десяти Preview и контракт `final-dev1`.
- [x] `node scripts/verify-lead-hook.mjs` проходит без ошибок.
- [x] `git diff --check` проходит.
- [x] `git diff --exit-code -- site site-addons/action-bar functions` не
  показывает изменений.

### Browser QA

- [x] На `1280×720`, `1440×900` и `1920×1080` видны разделитель,
  расширенный звонок, ровно три преимущества и длинное пояснение ниже них.
- [x] DOM- и визуальный порядок совпадают с утверждённым порядком; элементы не
  пересекаются, не обрезаются и не создают горизонтальный overflow.
- [x] На `390×844` новый ряд преимуществ скрыт, базовые CTA/фото/пояснение не
  изменены, Action Bar проходит зоны Hero → чтение → форма.
- [x] На desktop Action Bar не отображается; в консоли нет ошибок приложения.
- [x] Основная кнопка и телефон остаются рабочими ссылками на `#contact` и
  `tel:+972545490623`.

### Cloudflare Preview

- [x] `final-dev1.gambarian-landing.pages.dev` возвращает `200` и содержит
  `FINAL-DEV1-HERO v1.0.0 | 2026-08-10`.
- [x] `/lead-contract.js` возвращает JavaScript со схемой `1.1.0`.
- [x] `GET /api/lead` возвращает `405` и `Allow: POST`.
- [x] Production и существующий `final-dev` не содержат маркер `final-dev1`.

## Результат

- Feature commit: `dd6af2d609d4fa74804090fb59bf1066e7ea0fb2`.
- Cloudflare deployment: `eecb9e75-e330-4f19-a768-540de501ac9a`, status
  `success`, branch `final-dev1`.
- GitHub Actions: [run 31394432909](https://github.com/acomol/gambaryan-family-law/actions/runs/31394432909),
  conclusion `success`.
- Live Browser QA: `1280×720` и `390×844`, console errors/warnings `0`;
  mobile Action Bar прошла состояния Hero → чтение → форма.

## Related

- [Карта клиентских Preview](../boards/2026-08-06-versions-links.md)
- [Action Bar v2](2026-08-10-action-bar-v2.md)
- [Итоговый QA-чек-лист](../FINAL-QA-CHECKLIST.md)

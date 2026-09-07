# Окно услуг final-dev4

**Версия:** `SERVICES-WINDOW v1.0.0 | 2026-09-07`

**Статус:** `LOCAL PASS 15/15 / LIVE NOT RUN`

## Решения владельца

№7: жест, стрелки и точки. №15: Развод, Алименты, Раздел имущества, Дети,
Отцовство, Медиация, Брачный договор; «Защита при угрозах» последней по умолчанию.
№17: одна высота окна, вертикальное центрирование, единственные неподвижные
«Ведёт» и CTA; desktop «Ведёт» справа. Тексты сохранены дословно.
Умолчания №7/16/17: упор, прокручиваемая строка тем, desktop стрелки снаружи,
mobile в шапке. №18 (Юлия) не реализован, удаления «Защиты» нет.

## Реализация

`site/index.html`: svc-window → svc-frame → svc-frame__main → svc-stage;
восемь svc-card лежат в ячейке `1 / 1`. CTA — сосед stage, media — сосед main.
`panel.hidden` задаёт состояние; CSS заменяет display:none на grid/visibility:hidden.
Сетка учитывает самую высокую панель. Переход только opacity .2s, при reduce отключён.
На desktop место под стрелки 64px с каждой стороны; цели 44×44.
Mobile ≤860px: одна строка табов с mask, окно колонкой, CTA перед media;
label/золотая черта media в одной строке, gap 8px для соблюдения лимита высоты.
Pointer Events на stage, touch-action:pan-y, порог 40px и |dx|>|dy|,
игнорируются mouse/неосновной указатель, cancel сбрасывает жест.
Стрелки и свайп упираются в края; клавиатура по кругу, Home/End поддержаны.
Автопрокрутка tablist горизонтальная, без прокрутки страницы.

## Приёмка

- [x] 8 пар ARIA; набор IDs и точные h3/p не изменились; media/CTA по одной.
- [x] Runner 1.5.0, final-dev4 15/15; 390px секция 1217.203125 ≤1220.
- [x] 1440/390: разброс высот секции и смещение media/CTA по восьми темам 0px.
- [x] Стрелки/упор/свайп/одна строка и отсутствие overflow проверены браузером.
- [x] Намеренный display:none обнаружен `svc-panels-unequal-height`.
- [x] Review Numbered 2.2.1, порядок OWNER_REVIEW_IDS соответствует source.
- [ ] Общий copy/preview PASS: нет четырёх font-variants (пропущены по заданию).
- [ ] 194/194, live и реальное touch-устройство не проверены.

Стабильные failure: svc-media-count, svc-cta-count, svc-panels-unequal-height,
svc-media-moved, svc-cta-moved, svc-arrow-target, svc-edge-stop,
svc-arrows-desktop-position, svc-tabs-rows, svc-arrows-mobile-position,
svc-swipe-next-failed, svc-swipe-prev-failed, svc-swipe-edge-not-stopped,
svc-swipe-vertical-switched, svc-swipe-threshold, services-height-390,
fact-card-accordion-forbidden. Дополнительно: svc-window-missing,
svc-state-count, svc-section-height-changed. Frozen final-dev3 исключён
из новых требований к source.

## Related

- [Отчёт и эталоны](../reviews/2026-09-07-final-dev4-stage-6-local.md)
- [Карточка](codex/2026-09-06-final-dev4-stage-6.md)
- [Реестр решений](2026-09-06-final-dev4-spec.md)
- [Пункты задачи](2026-09-06-final-dev4-items.md)
- [Рекомендации](../DESIGN-RECOMMENDATIONS-2026-09-06.md)
- [Модель работы](../CODEX-WORKING-MODEL.md)

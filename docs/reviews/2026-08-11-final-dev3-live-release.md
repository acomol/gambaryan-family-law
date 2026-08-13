> **HISTORICAL / SUPERSEDED AS CURRENT 2026-08-11.** Этот отчёт подтверждает
> только `final-dev3 v1.1.0`; локальный `v2.0.2` с клиентским copy-контрактом
> пока не опубликован. Актуальные входы: [`../RESUME.md`](../RESUME.md) и
> [`../tasks/2026-08-11-client-approved-copy-only.md`](../tasks/2026-08-11-client-approved-copy-only.md).

# Live release: `final-dev3` — HISTORICAL

**Версия:** `FINAL-DEV3-LIVE-RELEASE v1.1.0`

**Дата:** `2026-08-11`

**Статус:** `HISTORICAL LIVE PASS / SUPERSEDED AS CURRENT`

## Релиз

| Поле | Значение |
|---|---|
| Stable URL | https://final-dev3.gambarian-landing.pages.dev/ |
| Immutable URL | https://52a9addb.gambarian-landing.pages.dev/ |
| Deployment UUID | `52a9addb-0166-4f78-8c7d-5f1b0ed2ad07` |
| Source commit | `88efa2ce0fb9dc5903e1f435310b372383a20d09` |
| GitHub CI | `31486509765` — `success` |
| Cloudflare status | `deploy / success` |
| HTML SHA-256 | `48d8e11b40934c85e5ba7e90c98400ad9852fa4937eaae60bbff92450309a6ec` |

Опубликован только каталог `build/variants/final-dev3` в Cloudflare branch
`final-dev3` закреплённым Wrangler `4.120.0`. Production и прежние десять
Preview не передеплоивались.

## Live-readback

- Stable и immutable URL возвращают одинаковый HTML, HTTP `200` и
  `text/html`.
- HTML/CSS/variant script содержат `FINAL-DEV3-DESIGN v1.1.0 | 2026-08-11`; унаследованы
  `FINAL-DEV1-HERO v1.3.0`, текущие тексты и `noindex`.
- `fonts.css` возвращает `text/css`; Playfair Display и Onest загружены как
  локальные webfonts.
- `action-bar.css`/`action-bar.js` возвращают правильные MIME и marker
  `ACTION-BAR-SPEC v2.3.1 | 2026-08-11`.
- `client-preview.css` содержит `CLIENT-PREVIEW-MOBILE v1.0.0 | 2026-08-11`.
- `/lead-contract.js` возвращает JavaScript с контрактом `1.1.0`;
  `GET /api/lead` возвращает `405`, JSON и `Allow: POST`.
- Social preview PNG возвращает `image/png`, размер `1200×630`.

## Browser QA

- Live runner: `15/15` — десять основных viewport и пять
  breakpoint/landscape viewport.
- Полный локальный прогон карты: `173/173` (`110 + 55 + 8`).
- Локальные screenshots `final-dev1 ↔ final-dev3` pixel-identical на
  `1293×724` и `390×844`; live desktop также pixel-identical. На live mobile
  геометрия/DOM совпали, а минимальная raster-дельта осталась только внутри
  декодированного WebP-фото и не является layout-изменением.
- Action Bar: Hero `hidden/inert`, чтение — три действия, demo closed — два
  действия и подпись «Демо · Нерабочее время», у формы снова `hidden/inert`.
- Hero-контакт синхронен с тем же состоянием: open — исходный телефон;
  closed — «Написать в WhatsApp» с canonical WhatsApp URL/иконкой. Вторых
  часов, timer или отдельного состояния Hero нет.
- Autofill `name/tel/email`; пустая форма показывает точные inline-ошибки и
  summary. Реальный POST не выполнялся; console warning/error `0`.

## Изоляция

Cloudflare API и HTTP SHA-сверка подтвердили:

- все десять прежних Preview сохранили deployment UUID из release
  `98374c133f91a7c47112561f86debbcec2129f6c` и прежние HTML SHA-256;
- production сохранил deployment
  `af10299b-1257-4f65-b66d-4b1e3041bf74`, source
  `cb9135ce9d63e73bab5f01a3aa27ffc5f1fe7a7b` и HTML SHA-256
  `656cbcd0635952899e79b847d5c262724979d21f548ca66e13fe3a7d2ec13e22`;
- production по-прежнему не содержит Action Bar, Client Preview Mobile или
  `FINAL-DEV3` marker.

## Известное ограничение

Strict clone намеренно наследует OPEN-дефект `final-dev1` при browser zoom
`200%`: desktop proof/call-help скрываются mobile-правилом. Поэтому полный
WCAG AA PASS не заявляется.

## История

Предыдущий `FINAL-DEV3-DESIGN v1.0.0` был опубликован из commit `78f429d`:
deployment `2f20dc33-714f-4b3a-86ea-b51880e33f05`, immutable URL
https://2f20dc33.gambarian-landing.pages.dev/. Он остаётся историческим
strict clone `final-dev1`; стабильный alias теперь обслуживает `v1.1.0`.

## Related

- [Задание Final Dev 3](../tasks/2026-08-11-final-dev3-design-system.md)
- [Карта Preview](../boards/2026-08-06-versions-links.md)
- [Пакет для заказчика](../CLIENT-PREVIEW-HANDOFF.md)
- [Финальный QA-чек-лист](../FINAL-QA-CHECKLIST.md)
- [Исторический release десяти Preview](2026-08-11-client-preview-live-release.md)

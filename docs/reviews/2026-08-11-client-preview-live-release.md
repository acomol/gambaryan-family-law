> **HISTORICAL / SUPERSEDED AS CURRENT 2026-08-11.** Это доказательство
> предыдущего live release, а не публикации исправленного allowlist-кандидата.
> Актуальные входы: [`../RESUME.md`](../RESUME.md) и
> [`../tasks/2026-08-11-client-approved-copy-only.md`](../tasks/2026-08-11-client-approved-copy-only.md).

# Live-релиз десяти клиентских Preview — HISTORICAL

**Версия:** `CLIENT-PREVIEW-LIVE-RELEASE v1.0.0`

**Дата:** `2026-08-11`

**Статус:** `HISTORICAL LIVE PASS / SUPERSEDED AS CURRENT`

**Git commit:** `98374c133f91a7c47112561f86debbcec2129f6c`

**GitHub Actions:** run `31469797937`, status `success`

**Cloudflare project:** `gambarian-landing`, production branch `main`

## Deployment map

Все deployment имеют status `success` и commit `98374c1`.

| Preview branch | Deployment |
|---|---:|
| `final-dev` | `76d3778a` |
| `final-dev1` | `69fa4640` |
| `v1-playfair-onest` | `d402e2ca` |
| `v2-lora-inter` | `308cad66` |
| `v3-literata-manrope` | `8a182caa` |
| `v4-ptserif-golos` | `80ba9adf` |
| `hero-a-actions-first` | `930f558c` |
| `hero-b-call-first` | `b4e3c1de` |
| `action-bar` | `f5b76f77` |
| `review-numbered` | `aaa2e734` |

## Live-readback

- [x] 10/10 stable alias: HTML 200, `noindex`, Action Bar
  `2.3.1 | 2026-08-11`.
- [x] 10/10: `client-preview.css` имеет `text/css` и marker
  `CLIENT-PREVIEW-MOBILE v1.0.0 | 2026-08-11`.
- [x] Action Bar CSS/JS и Client Preview CSS имеют по одному общему hash во
  всех десяти версиях; `final-dev` и `action-bar` byte-identical.
- [x] 10/10: `lead-contract.js` содержит `1.1.0`; `GET /api/lead` возвращает
  `405`, `Allow: POST`, JSON `method_not_allowed`.
- [x] Шрифтовые варианты отдают заявленные пары; Hero A/B имеют вариантные
  classes; `review-numbered` содержит 102 уникальных номера.
- [x] `final-dev1` сохраняет Hero `1.3.0`, Precedent Copy `1.0.0`, удалённый
  desktop `.nav-call`; marker `FINAL-DEV1-DESIGN` отсутствует.

## Browser smoke

Системный Chrome `151.0.7922.108`, stable alias, `390×844` и `1280×720`:

- [x] 10/10 mobile: Hero hidden/inert, reading visible, contact hidden/inert;
- [x] 10/10: `Авто · Рабочее время` и ручное
  `Демо · Нерабочее время ↔ Демо · Рабочее время` согласованы с составом
  `3 ↔ 2`, `aria-checked`, focus, URL и нулём analytics events;
- [x] 10/10: Action Bar 60px, horizontal overflow 0, заявленные шрифты loaded,
  console warnings/errors 0;
- [x] 10/10 desktop: Action Bar/demo `display:none`, body bottom padding 0,
  overflow 0.

## Production isolation

До и после Preview deploy:

- deployment ID: `af10299b-1257-4f65-b66d-4b1e3041bf74`;
- HTML SHA-256:
  `656cbcd0635952899e79b847d5c262724979d21f548ca66e13fe3a7d2ec13e22`;
- размер HTML: `52 872` bytes;
- Action Bar и Client Preview CSS отсутствуют;
- `GET /api/lead` остаётся прежним HTML fallback 200.

Production не изменился.

## Исправленный deployment-инцидент

Первый PowerShell batch передал `--branch=$i.b`, где `$i` был hashtable.
Wrangler создал ветку `System.Collections.Hashtable.b` и alias
`system-collections-hashtable-o1z0`. Деплой был остановлен до следующего batch.

Три ошибочных deployment (`2db3a628`, `dea1d7bd`, `e824aa9c`) удалены по
полным API ID после readback; повторная API-проверка вернула `0` deployment этой
ветки, ошибочный alias — HTTP 404. Нужные команды повторены с буквальными
`--branch=<slug>`.

Правило: в PowerShell не передавать property expression внутри CLI token.
Сначала присвоить scalar либо использовать буквальный аргумент; после deploy
сверять `deployment_trigger.metadata.branch` и alias через API.

## Не выполнялось

- реальный POST в Albato;
- изменение production;
- разработка `final-dev3`.

## Related

- [Клиентский handoff](../CLIENT-PREVIEW-HANDOFF.md)
- [Локальный QA](2026-08-11-client-preview-local-qa.md)
- [Карта Preview](../boards/2026-08-06-versions-links.md)
- [Финальный чек-лист](../FINAL-QA-CHECKLIST.md)

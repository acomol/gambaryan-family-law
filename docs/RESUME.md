# Актуальная точка входа в проект

**Версия:** `HANDOFF-RESUME v2.4.0`

**Обновлено:** `2026-08-17`

**Текущий статус:** `LOCAL + CI PASS / LIVE PENDING / DO NOT SEND / PRODUCTION UNCHANGED`

## Что мешает прямо сейчас — читать первым

**Блокер:** 11 клиентских Preview собраны и проходят все локальные гейты, но не
опубликованы. Причина одна — из облачной сессии Claude нет ключей Cloudflare.
Это **свойство среды**, а не отказ агента и не дефект. Проверять наличие ключей
заново каждую сессию не нужно: их не будет.

**Снимает блокер:** владелец, двумя действиями в GitHub. Агент сделать это за
него не может.

**Порядок (нарушать нельзя — иначе кнопки не будет):**

1. Влить PR #3 в `main`. `workflow_dispatch` показывает кнопку **Run workflow**
   только для файлов, лежащих в ветке по умолчанию, а на `main` сейчас один
   `ci.yml`. Merge ничего не публикует: `ci.yml` — только проверки, Pages-проект
   работает через direct upload, не через git-интеграцию.
2. Settings -> Secrets and variables -> Actions: `CLOUDFLARE_API_TOKEN`
   (Pages:Edit, поле **Client IP оставить пустым**) и `CLOUDFLARE_ACCOUNT_ID`
   = `4799e9f76c607e036c430a148d06a80b`.
3. Actions -> Deploy Previews -> Run workflow.

Подробности и источники — `docs/DEPLOY.md`, раздел «Публикация из GitHub
Actions: обязательное условие».

## Пути публикации, закрытые окончательно

Каждый из них уже проверялся и отпал. **Не переоткрывать.** Если появляется
идея опубликовать «как-нибудь иначе» — сначала сверить с этой таблицей.

| Путь | Вердикт | Разбор |
|---|---|---|
| Vercel, GitHub Pages | закрыт 2026-08-04 — площадка уже существует | `ERRORS.md` |
| Pages-проект `assuta-dev` | закрыт — требует положить файлы Гамбаряна в папку другого клиента, нарушает `PROJECT-BOUNDARY-RULES.md` | `ERRORS.md` |
| `wrangler deploy --temporary` | закрыт — адрес временный, Cloudflare отдаёт антибот 403, автоматический readback невозможен | `DEPLOY.md` |
| Токен `cfut_…86ead2b9` из облака | закрыт — ограничение по Client IP | `ERRORS.md` |
| MCP-коннектор Cloudflare | закрыт 2026-08-17 — сервер не имеет инструментов Pages вообще | `ERRORS.md` |
| Другая сессия или контейнер (Assuta и пр.) | не путь — ключей нет по свойству среды, смена контейнера этого не меняет | `AGENTS.md` |

**Открыт ровно один путь:** GitHub Actions по шагам выше — либо запуск с машины
владельца по `docs/DEPLOY.md`.

## Правило приоритета: живое важнее нового

Пока ни один Preview не стал живым в текущем цикле, **новые варианты, шрифтовые
версии и Hero-редакции не добавляются**. Каждый вариант умножает QA-поверхность:
кластер из четырёх дефектов 2026-08-13 целиком порождён вариативностью, а не
содержанием лендинга. Сначала публикация, потом расширение.

## Главное решение владельца

Во всех одиннадцати Preview каждый размещённый смысловой текст должен входить в
один из двух allowlist:

- frozen client source `docs/sources/client-copy-short-v1.0.0.txt`, идентичный
  `D:\Копия LP - Короткая версия (1).txt`;
- SHA-256 `5234CC5D9A3A4DF991827EF02E8DA46AE9C8B46D33C84CC33671E4B0465FA18E`;
- размер `14 895 bytes`;
- `45` номерных блоков — разрешённые формулировки, а не обязательный coverage;
- точный прежний блок Юлии Саакян и новый `fact-900-v1` — два отдельных
  `OWNER-APPROVED` override;
- вне client/owner allowlist допустим только identity/brand и `SYSTEM-UI`;
- `Email`, «Тема обращения»/`topic`, proof и «ВПЕРВЫЕ…» отменены;
- WhatsApp prefill отменён; Action Bar использует `wa.me` без `?text=`.
- owner correction `fact-900-v1` заменяет фактическую карточку `2.14`, но не
  удаляет исходный блок `2.14` из 45-строчного allowlist;
- владелец отдельно утвердил три тёмные карточки фактов и desktop-центрирование
  `30+`; остальные композиции, Hero assets/crop и Playfair/Onest сохраняются;
  текущий Action Bar — `2.3.4`.

## Текущие локальные контракты

| Контракт | Версия | Статус |
|---|---:|---|
| Client Copy contract | `1.1.0` | LOCAL PASS: 45 client + 2 owner blocks |
| Client Copy verifier | `1.0.0` | LOCAL PASS: 24 targets / 22 unique |
| Action Bar | `2.3.4` | LIVE PASS 11/11 |
| Client Preview Mobile | `1.1.0` | LIVE PASS 11/11 |
| `final-dev1` Hero | `2.0.0` | LIVE PASS |
| `final-dev3` Design | `2.0.2` | LIVE PASS |
| Lead schema | `2.0.0` | LIVE readback: name/phone only; GET `405` |
| Review Numbered | `2.0.0` | LIVE PASS: client/owner gate |
| Font Variant V2 Mobile | `1.1.0` | LIVE PASS: effective-width fix Lora H1 |
| Font Variant V3 Mobile | `1.0.0` | LIVE PASS: effective-width fix Manrope lede |
| Browser QA runner | `1.4.0` | LOCAL PASS: `177/177`, fact-card clip guard |

Версии контракта датированы `2026-08-11` или `2026-08-13`. Stable aliases
обслуживают прежний release `75558d9`, а не новый dark-facts кандидат.

## Текущая regression-семантика

- Только в `final-dev3` Action Bar и demo-switch скрыты до первого
  геометрического прохода `.hero__phone` вверх за viewport.
- После прохода latch остаётся armed: при возврате внутрь Hero и `scrollY > 1`
  Action Bar/demo остаются видимыми.
- `scrollY <= 1` скрывает оба элемента и сбрасывает latch; форма, открытое меню
  и фокус поля скрывают их независимо от latch.
- Обязательная последовательность: `0 → 2 → 50 → 100 → 320` — hidden;
  проход Hero — visible; возврат на `320` — visible; `0` — reset; повторный
  `320` — hidden.
- Для `v2-lora-inter` и `v3-literata-manrope` добавлены effective-width cells
  `345×600` и `345×668`, моделирующие nominal `360px` с classic scrollbar
  `15px` — четыре cells суммарно.
- `FONT-VARIANT-V2-MOBILE v1.1.0 | 2026-08-13`: только variant-only ширина
  Lora H1 `+12px`, чтобы сохранить `4` строки вместо `5`.
- `FONT-VARIANT-V3-MOBILE v1.0.0 | 2026-08-13`: только variant-only ширина
  Manrope-lede `+12px`, чтобы сохранить `3` строки вместо `4`.
- В обоих вариантах дизайн, шрифты, crop и межблочные отступы не меняются.

## Git и границы

- рабочая ветка: `codex/client-approved-copy-only`;
- source of truth: `site/`, `site-addons/`, `functions/`, `scripts/`;
- `build/` — только производные; вручную не редактировать;
- production deploy и реальный Albato POST запрещены без отдельного разрешения;
- Preview опубликованы из SHA `75558d904d2d1d41ffc9af075f2ea363b15c0b91`;
  у него подтверждён desktop-клиппинг `2.10`, поэтому ссылки не отправлять;
- функциональный кандидат `3fd80dfe9af9710d29a8b6e632c341477e0ccabc`
  закоммичен и запушен; GitHub Actions run `31701536955` — `success`;
- Preview deploy нового кандидата не разрешён.

## Локальная приёмка dark-facts и следующий шаг

1. [x] Зафиксировать owner override `fact-900-v1`; frozen 45-блочный источник
   и исходный `2.14` не менять.
2. [x] Пересобрать Standalone и все одиннадцать Preview с тремя тёмными
   карточками фактов.
3. [x] Copy contract `1.1.0` + verifier `1.0.0`: `24 targets / 22 unique`,
   `45` client allowlist + `2` owner blocks; фактически используются `37`
   client ID.
4. [x] Browser runner `1.4.0`: DOMRect/scroll clipping guard для каждой
   fact-card и обоих состояний mobile-аккордеона; локально `177/177`.
5. [x] Сохранить эталонные screenshots `1440`, `390 collapsed` и
   `390 expanded` в `docs/design-references/`.
6. [x] Commit/push функционального кандидата `3fd80df`; GitHub Actions run
   `31701536955` завершён `success`.
7. [ ] Получить отдельное разрешение владельца на новый Preview deploy.
8. [ ] После deploy повторить live-readback минимум трёх Preview и production
   isolation; только затем снять `DO NOT SEND`.

## Команды

```powershell
python -B scripts/build-hero-variants.py
python -B scripts/build-font-variants.py
python -B scripts/build-action-bar.py
python -B scripts/build-review-numbered.py
python -B scripts/verify-client-copy.py
python -B scripts/verify-client-previews.py
node scripts/verify-lead-hook.mjs
python scripts/qa-browser-matrix.py http://127.0.0.1:8098 --all-previews
git diff --check
```

## Опубликованный live-state — superseded для передачи

Опубликованный release: SHA `75558d904d2d1d41ffc9af075f2ea363b15c0b91`,
Action Bar `2.3.4`, `final-dev3 2.0.2`, 11/11 stable aliases и Browser QA
`177/177` — исторически PASS. Последующий точечный DOMRect/visual review
подтвердил desktop-клиппинг слова «прецедента» в общей карточке `2.10`, который
runner `1.3.2` не проверял. Поэтому live URLs — `DO NOT SEND`. Полные deployment
UUID, прежний readback и erratum:
[`reviews/2026-08-13-client-preview-live-release.md`](reviews/2026-08-13-client-preview-live-release.md).

## Исторический live-state

| Контур | Исторический факт |
|---|---|
| Прежние десять Preview | commit `98374c1`, `HISTORICAL LIVE PASS` |
| `final-dev3 v1.0.0` | commit `78f429d`, deployment `2f20dc33-714f-4b3a-86ea-b51880e33f05` |
| `final-dev3 v1.1.0` | commit `88efa2c`, deployment `52a9addb-0166-4f78-8c7d-5f1b0ed2ad07` |
| Production | не изменять; client-preview markers отсутствуют |

Исторические live результаты и промежуточный локальный PASS `45/45` не
подтверждают финальный allowlist-контракт. Soft-404
исключается только проверкой served markers/body class, а не одним HTTP 200.

Прежние утверждения о `173/173` и ручном visual PASS именно для текущего
кандидата имеют статус `HISTORICAL / INVALIDATED`: независимый Claude review
нашёл stateless `scrollY > 1` regression и отсутствующие effective-width cells.
Они не закрывают новую матрицу `177/177` и ручную перепроверку.

## Незакрытые внешние шаги

- Preview secrets, Albato Catch, дедупликация и readback реальной записи;
- реальный iPhone safe-area;
- zoom 200% accessibility-дефект остаётся OPEN; полный WCAG AA PASS не заявлять.

## Related

- [Действующее задание: dark fact cards](tasks/2026-08-13-dark-fact-cards.md)
- [Copy contract](tasks/2026-08-11-client-approved-copy-only.md)
- [Owner edits](CONTENT-OWNER-EDITS.md)
- [Карта источников](CONTENT-SOURCE-MAP.md)
- [Карта Preview](boards/2026-08-06-versions-links.md)
- [Пакет для заказчика](CLIENT-PREVIEW-HANDOFF.md)
- [Финальный QA](FINAL-QA-CHECKLIST.md)
- [Lead contract](LEAD-WEBHOOK-CONTRACT.md)
- [Deploy runbook](DEPLOY.md)

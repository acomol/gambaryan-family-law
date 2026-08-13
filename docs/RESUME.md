# Актуальная точка входа в проект

**Версия:** `HANDOFF-RESUME v2.1.3`

**Обновлено:** `2026-08-13`

**Текущий статус:** `LOCAL QA PASS / LIVE PENDING / NO DEPLOY`

## Главное решение владельца

Во всех одиннадцати Preview каждый размещённый смысловой текст должен входить в
один из двух allowlist:

- frozen client source `docs/sources/client-copy-short-v1.0.0.txt`, идентичный
  `D:\Копия LP - Короткая версия (1).txt`;
- SHA-256 `5234CC5D9A3A4DF991827EF02E8DA46AE9C8B46D33C84CC33671E4B0465FA18E`;
- размер `14 895 bytes`;
- `45` номерных блоков — разрешённые формулировки, а не обязательный coverage;
- точный прежний блок Юлии Саакян — отдельный `OWNER-APPROVED` override;
- вне client/owner allowlist допустим только identity/brand и `SYSTEM-UI`;
- `Email`, «Тема обращения»/`topic`, proof и «ВПЕРВЫЕ…» отменены;
- WhatsApp prefill отменён; Action Bar использует `wa.me` без `?text=`.
- owner correction меняет только copy/form contract: утверждённые композиции,
  Hero assets/crop и Playfair/Onest сохраняются; текущий Action Bar — `2.3.4`.

## Текущие локальные контракты

| Контракт | Версия | Статус |
|---|---:|---|
| Client Copy contract/verifier | `1.0.0` | UNCHANGED; повторить в final full QA |
| Action Bar | `2.3.4` | LOCAL QA PASS; live `2.3.1` historical |
| Client Preview Mobile | `1.1.0` | UNCHANGED; live `1.0.0` historical |
| `final-dev1` Hero | `2.0.0` | UNCHANGED; live `1.3.0` historical |
| `final-dev3` Design | `2.0.2` | LOCAL QA PASS; live `1.1.0` historical |
| Lead schema | `2.0.0` | UNCHANGED; повторить name/phone gate |
| Review Numbered | `2.0.0` | UNCHANGED; повторить client/owner gate |
| Font Variant V2 Mobile | `1.1.0` | LOCAL QA PASS: effective-width fix Lora H1 |
| Font Variant V3 Mobile | `1.0.0` | LOCAL QA PASS: effective-width fix Manrope lede |
| Browser QA runner | `1.3.2` | LOCAL PASS: `177/177` |

Версии контракта датированы `2026-08-11` или `2026-08-13`. Live aliases пока обслуживают предыдущие
контракты и считаются `HISTORICAL LIVE PASS`, а не текущим результатом.

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
- в этой задаче Preview также не деплоить: сначала локальная приёмка и передача
  на финальное подтверждение ведущего агента.

## Локальная приёмка и следующий шаг

1. [ ] После пересборки повторить frozen-source, client/owner allowlist,
   name/phone-only и отсутствие WhatsApp prefill во всех Preview.
2. [ ] Пересобрать Standalone и все одиннадцать Preview с Action Bar `2.3.4`
   и `final-dev3 2.0.2`.
3. [x] Повторить copy/preview verifiers, lead tests и полную browser matrix
   `177/177 = 110 main + 55 breakpoint + 8 large + 4 effective-width`.
4. [x] Повторить ручной visual QA голов/наложений/центрирования, включая
   `v2-lora-inter` и `v3-literata-manrope` на `345×600/668`; реальный iPhone
   safe-area остаётся внешним шагом.
5. [ ] После финальной приёмки зафиксировать текущий кандидат в feature branch
   и получить новый CI result. Коммиты `fdba4c2`/`d804450` и run `31512971589`
   относятся к предыдущему состоянию.
6. [ ] Получить явное решение владельца на Preview deploy.
7. [ ] После deploy выполнить 11/11 served-content/live-readback.

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

- финальный full QA и подтверждение ведущего агента;
- решение владельца о публикации Preview;
- Preview secrets, Albato Catch, дедупликация и readback реальной записи;
- ручной visual QA голов/наложений и реальный iPhone safe-area;
- zoom 200% accessibility-дефект остаётся OPEN; полный WCAG AA PASS не заявлять.

## Related

- [Действующее задание](tasks/2026-08-11-client-approved-copy-only.md)
- [Карта источников](CONTENT-SOURCE-MAP.md)
- [Карта Preview](boards/2026-08-06-versions-links.md)
- [Пакет для заказчика](CLIENT-PREVIEW-HANDOFF.md)
- [Финальный QA](FINAL-QA-CHECKLIST.md)
- [Lead contract](LEAD-WEBHOOK-CONTRACT.md)
- [Deploy runbook](DEPLOY.md)

# Актуальная точка входа в проект

**Версия:** `HANDOFF-RESUME v2.1.2`

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
  Hero assets/crop, Playfair/Onest и Action Bar `2.3.3` сохраняются.

## Текущие локальные контракты

| Контракт | Версия | Статус |
|---|---:|---|
| Client Copy contract/verifier | `1.0.0` | LOCAL PASS: allowlist + owner override |
| Action Bar | `2.3.3` | LOCAL PASS; live `2.3.1` historical |
| Client Preview Mobile | `1.1.0` | LOCAL PASS; live `1.0.0` historical |
| `final-dev1` Hero | `2.0.0` | LOCAL PASS; live `1.3.0` historical |
| `final-dev3` Design | `2.0.1` | LOCAL PASS; live `1.1.0` historical |
| Lead schema | `2.0.0` | LOCAL PASS: только name/phone |
| Review Numbered | `2.0.0` | LOCAL PASS: реально используемые client/owner ID |
| Browser QA runner | `1.3.1` | LOCAL PASS: `173/173` |

Версии контракта датированы `2026-08-11` или `2026-08-13`. Live aliases пока обслуживают предыдущие
контракты и считаются `HISTORICAL LIVE PASS`, а не текущим результатом.

## Git и границы

- рабочая ветка: `codex/client-approved-copy-only`;
- source of truth: `site/`, `site-addons/`, `functions/`, `scripts/`;
- `build/` — только производные; вручную не редактировать;
- production deploy и реальный Albato POST запрещены без отдельного разрешения;
- в этой задаче Preview также не деплоить: сначала локальная приёмка и передача
  на независимое review.

## Локальная приёмка и следующий шаг

1. [x] Frozen source, client/owner allowlist, форма name/phone-only и отсутствие
   WhatsApp prefill проверены.
2. [x] Standalone и все одиннадцать Preview пересобраны.
3. [x] Copy verifier, preview verifier, lead tests и browser matrix повторно
   прошли после scoped visibility-fix final-dev3 (`173/173`).
4. [x] Локальный visual QA голов/наложений и центрирования пройден; реальный
   iPhone safe-area остаётся внешним шагом.
5. [x] Functional commit `fdba4c2` и CI fix `d804450` отправлены в feature
   branch; Draft PR №3 открыт, quality run `31512971589` — PASS.
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
python scripts/qa-browser-matrix.py http://127.0.0.1:8098
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

## Незакрытые внешние шаги

- независимый review агента;
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

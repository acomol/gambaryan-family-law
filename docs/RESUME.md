# Актуальная точка входа в проект

**Версия:** `HANDOFF-RESUME v2.6.1`

**Обновлено:** `2026-09-06`

**Текущий статус:** `final-dev3 LIVE + VERIFIED / остальные 10 Preview на старом релизе / PRODUCTION UNCHANGED`

## Что изменилось с прошлой версии этого документа

Блокер публикации, описанный здесь версией `2.4.0`, снят. Владелец выполнил
обе части: влил PR #3 в `main` и завёл секреты `CLOUDFLARE_API_TOKEN` /
`CLOUDFLARE_ACCOUNT_ID`. Три раунда потребовались из-за дефектов самого гейта
`Check token scope` (пропущенный Chromium, `grep` вместо разбора JSON) и
Client IP Filtering на токене — все разобраны в `ERRORS.md` v1.8.0. Итог
подтверждён прогоном `32038757556`: все шаги `success`, `Live readback` —
`PASS final-dev3` + `PASS production`.

## Живое состояние прямо сейчас — читать первым

**Опубликован только `final-dev3`.** Владелец запускал workflow с полем
`only=final-dev3`, остальные десять alias этим прогоном не тронуты.

| Что | Состояние |
|---|---|
| `final-dev3.gambarian-landing.pages.dev` | LIVE, текущий релиз `main` (защита тире `fda9726`, Action Bar `2.4.0` с desktop-переключателем) |
| Остальные 10 Preview (`final-dev`, `final-dev1`, `v1`…`v4`, `action-bar`, `review-numbered`, `hero-a`/`hero-b`) | **устарели** — обслуживают релиз `75558d9` от 2026-08-13, без защиты тире и без исправленного переключателя. Проверено байтовым сравнением 2026-08-17: 0 вхождений `&nbsp;—` на `final-dev`, `final-dev1`, `v1-playfair-onest`, `action-bar` |
| `gambarian-landing.pages.dev` (боевой) | не изменялся; SHA-256 `656CBCD0…C13E22`, 52 872 байта — подтверждено байтовым сравнением до и после каждого деплоя |

**Если нужно показать клиенту больше одного варианта** — сначала обновить
нужные alias тем же workflow (`Actions -> Deploy Previews -> Run workflow`,
поле `only` под конкретный alias или пусто для всех 11), иначе часть Preview
будет отдавать текст без правок от 2026-08-17.

**Правило деплоя, подтверждённое прогоном 2026-08-17:** `workflow_dispatch` виден в Actions
только когда файл workflow лежит в ветке по умолчанию; `Check token scope`
проверяет форму обоих секретов, принимает ли Cloudflare токен, видит ли он
нужный аккаунт и не совпадает ли какой-либо Preview alias с боевой веткой —
прежде чем что-либо публиковать. Подробности — `docs/DEPLOY.md`.

## Следующий цикл: final-dev4 — ветка `codex/final-dev4`

Список правок от владельцев получен 2026-09-06 и зафиксирован дословно в
`docs/CONTENT-OWNER-REVISIONS-2026-09-06.md`. Задание, порядок работ,
подготовительные шаги и приёмка — `docs/tasks/2026-09-06-final-dev4-spec.md`
(v0.2.0). Разбор по коду: 58 пунктов в шести группах —
`docs/tasks/2026-09-06-final-dev4-items.md`. Анкета владельцу: 28 вопросов,
18 блокирующих — `docs/tasks/2026-09-06-final-dev4-questions.md` (v1.1.0, там же
ссылка на интерактивную версию на простом языке); без ответов на первые девять
(шрифты, фото, ё/е, точки, свайп, карта, скоуп публикации) реализация не
начинается. Уже решено владельцем 2026-09-06: присланные тексты заверены
заказчиком и верстаются дословно; телефон в нерабочее время везде заменяется
на WhatsApp; стрелка раскрытия остаётся только там, где есть скрытый текст;
листание тем — жест плюс видимые стрелки. Замеры шрифтов и фото —
`docs/FONT-AND-PHOTO-MEASUREMENTS-2026-09-06.md`. Реализация не начата; ветка
предназначена для работы Claude Code и Codex CLI по одним правилам.

## Не отправлено клиенту: правки текста ждут решения

`docs/CONTENT-EDIT-PROPOSALS-2026-08-17.md` (v1.1.0) — 12 предложений по
формулировке, снятых с живого `final-dev3`. Ждёт ответа владельца по каждой
строке. Прежнее утверждение о «расхождении» в блоке `7.6` снято как ошибочное:
тему обращения уточняют в разговоре, форма ничего не обещает. Предложение по
`3.23` больше не трогает юридическую фразу о судебном постановлении.

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
| Другая сессия или контейнер | не путь — у облачной сессии ключей Cloudflare нет по свойству среды | `AGENTS.md` |

**Рабочий путь — GitHub Actions:** `Actions -> Deploy Previews -> Run
workflow`, ветка `main`, поле `only` — конкретный alias или пусто для всех
11. Секреты заведены и работают; повторная проверка их наличия не нужна.
Запускать может только владелец — токен облачной сессии не имеет права
`actions: write` (`403 Resource not accessible by integration`); агент читает
статус и логи прогона, но не запускает workflow сам.

## Правило приоритета: живое важнее нового

Новые варианты, шрифтовые версии и Hero-редакции не добавляются, пока
расхождение между Preview не устранено обновлением остальных десяти alias.
Каждый вариант умножает QA-поверхность: кластер из четырёх дефектов
2026-08-13 целиком порождён вариативностью, а не содержанием лендинга.

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
  текущий Action Bar — `2.4.0` (desktop-доступный переключатель рабочего времени).

## Текущие локальные контракты

| Контракт | Версия | Статус |
|---|---:|---|
| Client Copy contract | `1.1.0` | LOCAL PASS: 45 client + 2 owner blocks |
| Client Copy verifier | `1.0.0` | LOCAL PASS: 24 targets / 22 unique |
| Action Bar | `2.4.0` | LIVE на `final-dev3`; остальные 10 alias всё ещё отдают `2.3.4` |
| Client Preview Mobile | `1.1.0` | LIVE PASS 11/11 |
| `final-dev1` Hero | `2.0.0` | LIVE PASS |
| `final-dev3` Design | `2.0.2` | LIVE PASS |
| Lead schema | `2.0.0` | LIVE readback: name/phone only; GET `405` |
| Review Numbered | `2.0.0` | LIVE PASS: client/owner gate |
| Font Variant V2 Mobile | `1.1.0` | LIVE PASS: effective-width fix Lora H1 |
| Font Variant V3 Mobile | `1.0.0` | LIVE PASS: effective-width fix Manrope lede |
| Browser QA runner | `1.4.0` | LOCAL PASS: `177/177`, fact-card clip guard |

Версии контрактов датированы `2026-08-11`, `2026-08-13` и `2026-08-17`
(Action Bar `2.4.0`, маркер `ACTION-BAR-SPEC v2.4.0 | 2026-08-17` в
`site-addons/action-bar/action-bar.{html,css,js}` и в Preview-карте). Из
stable aliases текущий релиз `main` отдаёт только `final-dev3`; остальные
десять по-прежнему обслуживают прежний release `75558d9`.

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

- `codex/client-approved-copy-only` слит в `main` (PR #3, коммит `8eca5d2`);
  ветка закрыта, дальше вся работа идёт короткими ветками от `main` и PR;
- `main` — `37ebf2b` на момент этой записи; `.github/workflows/deploy-previews.yml`
  живёт там, а не в отдельной ветке — обязательное условие для кнопки Run workflow;
- source of truth: `site/`, `site-addons/`, `functions/`, `scripts/`;
- `build/` — только производные; вручную не редактировать; в git не хранится,
  собирается заново на каждом прогоне workflow;
- production deploy и реальный Albato POST запрещены без отдельного разрешения;
- `final-dev3` опубликован из `main` — текущий; остальные 10 alias всё ещё
  обслуживают старый SHA `75558d904d2d1d41ffc9af075f2ea363b15c0b91`, см.
  таблицу выше;
- деплой Preview разрешён и работает — единственное ограничение: запускать
  workflow может только владелец (см. «Живое состояние прямо сейчас»).

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

- [Предложения по тексту final-dev3, ждут решения владельца](CONTENT-EDIT-PROPOSALS-2026-08-17.md)
- [Действующее задание: dark fact cards](tasks/2026-08-13-dark-fact-cards.md)
- [Copy contract](tasks/2026-08-11-client-approved-copy-only.md)
- [Owner edits](CONTENT-OWNER-EDITS.md)
- [Карта источников](CONTENT-SOURCE-MAP.md)
- [Карта Preview](boards/2026-08-06-versions-links.md)
- [Пакет для заказчика](CLIENT-PREVIEW-HANDOFF.md)
- [Финальный QA](FINAL-QA-CHECKLIST.md)
- [Lead contract](LEAD-WEBHOOK-CONTRACT.md)
- [Журнал ошибок и уроков CI](ERRORS.md)
- [Deploy runbook](DEPLOY.md)

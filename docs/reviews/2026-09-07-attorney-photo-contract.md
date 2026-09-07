# Контракт новых кадров адвокатов

**Версия:** `ATTORNEY-PHOTO-CONTRACT-REVIEW v1.0.0`

**Дата:** `2026-09-07`

**Статус:** `LOCAL CONTRACT FIX / FULL GATES BLOCKED / NOT DEPLOYED`

## Задание и границы

Ветка: `codex/final-dev4-s4-hours`. Задание владельца: обновить контракт
под уже подготовленные кадры v3, синхронизировать маркеры, пересобрать
Standalone/Hero/Action Bar/numbered-review, выполнить гейты и замер 1440/390.
Шрифтовую сборку пропустить; публикация запрещена. Один коммит с сообщением
`fix(final-dev4): copy contract follows the new attorney crops`, затем push.
При ошибке `.git/index.lock` оставить изменения в дереве.

До начала работы уже изменены портреты, `site/index.html`, manifest,
Standalone и `scripts/crop-attorney-cards.py`; старые портреты staged на удаление.
Самостоятельных правок кадров, разметки карточек и crop-скрипта не выполнялось.
Standalone обновлён штатным builder. Локальный `final-dev3` пересобран как часть
прямо запрошенного Hero builder; его код и живой alias не редактировались.

## Изменения

`CLIENT-COPY-CONTRACT v1.4.3 | 2026-09-07`: patch после 1.4.2.
Все найденные числовые маркеры `CLIENT-COPY-CONTRACT v…` в `docs/` и `scripts/`
синхронизированы. В `CONTENT-OWNER-EDITS.md` добавлено решение №3:
кадры приведены к одному виду, окно остаётся 4:5 до ответа владельца.

Токены взяты непосредственно из `site/index.html`:

| Место | Было | Стало |
|---|---|---|
| Контракт и unit mutation, `src` Юлии | `assets/yulia-card-760w.df9bd223.jpg` | `assets/yulia-card-v3-760w.3ac185f4.jpg` |
| Контракт, WebP 480w | `assets/yulia-card-480w.a736c3ca.webp` | `assets/yulia-card-v3-480w.e3707784.webp` |
| Контракт, WebP 760w | `assets/yulia-card-760w.cb17a9cc.webp` | `assets/yulia-card-v3-760w.507619a3.webp` |
| Контракт, WebP 1100w | `assets/yulia-card-1100w.6f3eba82.webp` | `assets/yulia-card-v3-1100w.89383576.webp` |
| Unit mutation, подмена на Александра | `assets/alexander-card-v2-760w.681730d0.jpg` | `assets/alexander-card-v3-760w.1a3f51a4.jpg` |

Отдельных токенов файлов Александра в copy-контракте нет.
Регрессия подтверждена исходным FAIL по старым токенам и проверкой разметки;
исправление подтверждено повторным verifier по свежим HTML и unit-тестами.

## Вывод гейтов

| Команда | Exit | Результат |
|---|---:|---|
| `python -B scripts/build-preview.py site/gambarian-standalone.html --standalone` | 0 | `site/gambarian-standalone.html: 3.76 MB`, внешних ссылок: 3 (Google Maps) |
| `python -B scripts/build-hero-variants.py` | 0 | Проверка пройдена для hero-a-actions-first, hero-b-call-first, final-dev1, final-dev3, final-dev4 |
| `python -B scripts/build-action-bar.py` | 1 | `measure_and_pin → sync_playwright → asyncio.create_subprocess_exec → windows_utils.pipe → PermissionError: [WinError 5] Access is denied` |
| `python -B scripts/build-review-numbered.py` | 0 | `client=18, owner=18`; `Проверка пройдена: 36 уникальных номеров, noindex и Action Bar сохранены.` |
| `python -B scripts/verify-client-copy.py` | 1 | `FAIL CLIENT-COPY-VERIFIER v1.1.0 \| 2026-09-07: 8 ошибок` — по два новых токена Юлии отсутствуют в каждом из четырёх старых font-variants |
| `python -m unittest discover -s scripts/tests` | 0 при TEMP/TMP внутри repo | `Ran 27 tests in 0.762s`, `OK` |
| `node scripts/verify-lead-hook.mjs` | 0 | `Lead hook 2.0.0 (2026-08-11): contract/static/runtime PASS` |
| `git diff --check` | 0 | Ошибок whitespace нет; предупреждения Git LF → CRLF |

Первый запуск unit-тестов: `Ran 27 tests`, `FAILED (errors=34)` из-за отказа
доступа к временным каталогам в `I:\Temp`. Повтор выполнен без изменения тестов:

```powershell
New-Item -ItemType Directory -Force -Path build/photofix-tmp | Out-Null
$env:TEMP = (Resolve-Path build/photofix-tmp).Path
$env:TMP = $env:TEMP
python -m unittest discover -s scripts/tests
```

Дополнительный прямой вызов штатного `verify_html` дал PASS для девяти файлов:
source, Standalone и семи `build/variants/*/index.html`. Это ограниченная
проверка HTML, не полный PASS общего гейта и не browser PASS Action Bar.
Четыре font-variants не пересобирались и вручную не исправлялись по заданию.

## Фото: исходные данные и незакрытый замер

`owner-confirmed`: координаты взяты из задания и существовавшего
`build/attorney-crops/evidence.json`. Фиксируются здесь, поскольку `build/`
не хранится в Git. Это входные замеры владельца, не результат Playwright.

| Портрет | Исходник | Верх головы / подбородок, px | Кадр (left, top, right, bottom) | Размер кадра |
|---|---|---|---|---|
| Александр | 2794×4284 | 850 / 1785 | (0, 501, 2794, 3994) | 2794×3493 |
| Юлия | 1122×1402 | 140 / 448 | (101, 25, 1021, 1176) | 920×1151 |

В evidence: `face_fraction=0.2677165354330709`,
`head_fraction=0.09982174688057041`. По заданию оба фото подрезаны,
без растяжения и дорисовки; окно остаётся 4:5.

| Viewport | Высота фото Александра / Юлии | Верх головы Александра / Юлии | Разница ≤3px |
|---|---|---|---|
| 1440 | Не измерено | Не измерено | Не проверено |
| 390 | Не измерено | Не измерено | Не проверено |

Playwright не стартует: отказ Windows при создании pipe драйвера,
воспроизведён штатным Action Bar builder. Скриншотов текущего кандидата нет.
Геометрия исходных кадров не заменяет измерение браузерного отображения.
Для закрытия приёмки требуется запуск Playwright в среде с рабочим драйвером;
для полного copy PASS также нужны свежие шрифтовые сборки.

## Related

- [Решение владельца №3](../CONTENT-OWNER-EDITS.md)
- [Текущая точка входа](../RESUME.md)
- [Приёмка final-dev4](../tasks/2026-09-06-final-dev4-spec.md)
- [Copy contract](../../scripts/client_copy_contract.py)
- [Unit-тесты](../../scripts/tests/test_verify_client_copy.py)

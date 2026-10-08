# final-dev4: устранение дубля WhatsApp

**Версия:** `CONTACT-DEDUP-LOCAL v1.0.0`

**Дата:** `2026-09-07`

**Статус:** изменения в рабочем дереве; частичная локальная приёмка.

Ветка: `codex/final-dev4-s4-hours`.
Задание: `I:\Temp\claude\I--GIT-digitalhook-os---claude-worktrees-admiring-pascal-e1a77a\e147268f-ad98-4156-8273-9bbcd5820109\scratchpad\codex-dup.md`, прочитано как UTF-8.
Решение и дословные новые строки сохранены в `CONTENT-OWNER-EDITS.md`.

Изменения: нижний контакт использует общий переключатель `data-business-variant`.
Закрытый вариант ведёт на `#contact`; обработчик отменяет стандартный переход
и вызывает `focus()` для `#lead-name`. Общая функция клонирования SVG используется
телефонными заменами и закрытой подсказкой ошибки. В open исходная разметка
подсказки восстанавливается, повторный closed не накапливает иконки.
Версии: Client Copy 1.4.2; final-dev4 Design 1.1.1; Business Hours Gate 1.0.1.

## Проверено

Источники доказательства: канонические HTML/JS и DOM собранного final-dev4
через стандартный Playwright MCP. URL:
`http://127.0.0.1:8107/build/variants/final-dev4/`.

| Closed | 1440×900 | 390×844 |
|---|---|---|
| Верхний ряд | «Написать в WhatsApp», `https://wa.me/972545490623`, SVG=1 | то же |
| Нижний ряд | «ЗАЯВКА / Оставить заявку», `#contact`, SVG=1 | то же |
| Видимых рядов WhatsApp / формы | 1 / 1 | 1 / 1 |
| SVG ссылки в подсказке ошибки | 1; содержимое совпадает с SVG Action Bar | то же |
| `CLOSED_CHECK` из обновлённого гейта | `failures: []` | `failures: []` |

Проверка подсказки использовала подмену `window.fetch` для `/api/lead`:
один `POST` получил локальный `503 delivery_failed`, сетевой запрос не отправлялся.
На 1440 проверено восстановление `outerHTML` при возврате в open: `restored: true`;
повторный closed также вернул `failures: []`.

## Вывод гейтов

| Команда | Результат |
|---|---|
| `python -B scripts/build-preview.py site/gambarian-standalone.html --standalone` | exit 0, 3.80 MB |
| `python -B scripts/build-hero-variants.py` | exit 0, проверки всех пяти вариантов пройдены |
| `python -B scripts/build-action-bar.py` | exit 1, `[WinError 5] Access is denied` при создании pipe Python Playwright |
| `python -B scripts/build-review-numbered.py` | exit 0, 36 уникальных номеров: client=18, owner=18 |
| `python -B scripts/verify-client-copy.py` | PASS, 26 HTML targets / 24 unique, 45 client IDs / 18 owner blocks, contract v1.4.2 |
| `python -m unittest discover -s scripts/tests` | 18 tests, OK при TEMP/TMP=`I:\GIT\gambaryan-family-law\build\qa-temp` |
| `node scripts/verify-lead-hook.mjs` | `Lead hook 2.0.0 (2026-08-11): contract/static/runtime PASS` |
| `git diff --check` | exit 0, без ошибок |
| `python -B scripts/verify-business-hours.py <local-url>` | запуск заблокирован: `[WinError 5] Access is denied`, 0/2; DOM-часть отдельно выполнена через Playwright MCP |

Первый запуск unit-тестов получил ошибки доступа к `I:\Temp`; повторный запуск
с временным каталогом внутри разрешённого репозитория прошёл.
`build-font-variants` пропущен по заданию. Общая свежая сборка всех Preview
не считается завершённой: Action Bar заблокирован, шрифтовые артефакты прежние.

## Не проверено

- Фактический клик по «Оставить заявку» и перенос фокуса в браузере.
  `browser_click` отклонён: `MCP tool call requires approval, but approval policy is never`.
  Проверка фокуса добавлена в Python-гейт, но его запуск блокирует среда.
- Полный сценарий Python-гейта с открытием мобильного меню.
- Live readback: публикация запрещена заданием и не выполнялась.

## Related

- [Решение владельца](../CONTENT-OWNER-EDITS.md)
- [Служебные строки](../CONTENT-EXTRA.md)
- [Карточка этапа 4](../tasks/codex/2026-09-06-final-dev4-stage-4.md)
- [Гейт рабочего времени](../../scripts/verify-business-hours.py)

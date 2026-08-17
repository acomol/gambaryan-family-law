# Аудит `hronicasync/nodumbmode`

**Версия:** `NODUMBMODE-AUDIT v1.1.0`

**Дата:** `2026-08-11`

**Статус:** `PASS LOCAL / NOT REDISTRIBUTED`

## Установка

Выполнена запрошенная команда:

```powershell
npx skills@latest add hronicasync/nodumbmode
```

Локально установлены четыре project-local skill и lock-файл:

| Skill | SHA-256 из `skills-lock.json` |
|---|---|
| `ask-nodumb` | `a4088a6ce18379423f26cbd39d637193ed6b9afd7792b56d6710f1ba81085881` |
| `changelog-discipline` | `cdcf52be931da265b76c83d02aa0cf89b90a588db0d237006c2546e15ff71fc0` |
| `nodumb` | `499c032c7b9d14b6eb60dfcb6e665d315d9036ed29684dbdd47b32ee3b65b80e` |
| `system-feedback` | `e3be1000da096e265fcd807a2ad8092188d226566ad525fae3f4bc11334e1f49` |

## Проверка безопасности

- каждый из четырёх skill проверен локальным `skill-security-auditor` в
  режиме `--strict --json`;
- результат: `0 critical`, `0 high`, `0 informational` findings;
- в установленном наборе только Markdown-инструкции и references, нет
  исполняемых scripts, packages или hooks;
- секреты и credentials не добавлены.

PASS подтверждён двумя независимыми источниками: выводом security scanner и
фактическим inventory файлов/хешей в `skills-lock.json`.

## Лицензирование и передача на другую машину

GitHub API разрешает `hronicasync/nodumbmode` в фактический upstream
`hanumatori/nodumbmode`, где `license=null`; в корне также нет файла LICENSE.
Поэтому полный сторонний текст skill не коммитится и исключён через
`.gitignore`. Это не отменяет локальную установку, но не создаёт неподтверждённое
право на перераспространение.

После клонирования ветки на другой машине выполнить из корня проекта:

```powershell
npx skills@latest add hronicasync/nodumbmode
```

Затем повторить security scan и сверить четыре хеша с таблицей выше. В GitHub
передаются этот аудит, команда и хеши; `.agents/` и `skills-lock.json` остаются
локальными до появления явной лицензии или разрешения автора.

## Правило использования

Skill помогает формулировать вопросы и проверять план, но не имеет приоритета
над задачами проекта, клиентской приёмкой, `AGENTS.md` и versioned contracts.
Он не разрешает самовольный deploy, изменение production или расширение scope.

## Related

- [Пакет Preview для заказчика](../CLIENT-PREVIEW-HANDOFF.md)
- [План отдельного final-dev3](../tasks/2026-08-11-final-dev3-design-system.md)

# Какие разрешённые блоки не используются

**Версия:** `CONTENT-MISSING v2.1.2`

**Дата:** `2026-08-13`

**Статус:** `CURRENT COVERAGE REPORTED / LIVE PASS 11/11`

## Итог

Frozen source
[`docs/sources/client-copy-short-v1.0.0.txt`](sources/client-copy-short-v1.0.0.txt)
содержит `45` разрешённых блоков и byte-for-byte совпадает с переданным
владельцем `D:\Копия LP - Короткая версия (1).txt`.

Эти `45` строк — allowlist, а не обязательный список для размещения. Отсутствие
разрешённого блока допустимо и фиксируется здесь после rebuild; оно
не является дефектом само по себе. Дефект — содержательный текст, которого нет
ни в client allowlist, ни в точном `OWNER-APPROVED` блоке Юлии.

Явное решение владельца для формы:

- использовать только поля `Имя` и `Телефон`;
- не размещать поле `Тема обращения` (`7.19`);
- не размещать `Email`.

Текущий release использует одинаковые `38/45` client ID во всех 24
HTML targets (source/standalone и 11 пар Preview). Не используются семь
разрешённых ID: `1.8`, `1.12`, `6.6`, `6.9`, `6.12`, `7.7`, `7.19`. Последний
исключён явным решением владельца; остальные не требуются контрактом.

Предыдущий результат `45/45` относится к отменённой промежуточной сборке. Новый
allowlist-кандидат сохраняет coverage `38/45` и после изменений повторно прошёл
verifier и browser matrix
`177/177 = 110 main + 55 breakpoint + 8 large + 4 effective-width`. Прежние
заявления `173/173` и manual PASS для текущего кандидата —
`HISTORICAL / INVALIDATED` независимым Claude review. Новый release с coverage
`38/45` прошёл live Browser QA `177/177` и served-content readback 11/11.

## Related

- [Карта источников](CONTENT-SOURCE-MAP.md)
- [Утверждённые 45 блоков](CONTENT-APPROVED.md)
- [Допустимый служебный текст](CONTENT-EXTRA.md)
- [Задание](tasks/2026-08-11-client-approved-copy-only.md)

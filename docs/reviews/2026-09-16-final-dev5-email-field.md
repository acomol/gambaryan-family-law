# final-dev5: e-mail и подтверждение контактов

**Версия:** `1.0.0` | **Дата:** `2026-09-16`

**Статус:** `LOCAL PASS / FONT VARIANTS SKIPPED / NOT DEPLOYED`

## Реализация

- Указание владельца об обязательности e-mail имеет приоритет над пунктами
  исходного ТЗ о необязательном поле. Новая форма требует e-mail; API сохраняет
  прежние запросы без него. HTTP-статусы сохранены: 202 для принятого лида,
  422 с `field_errors.email` для неверного адреса, вместо названных в ТЗ 200/400.
- Подсказки «Ваше имя» и «Ваш e-mail»; e-mail занимает отдельную строку.
- Первый submit показывает имя, нормализованный телефон и e-mail. До
  подтверждения POST отсутствует. «Исправить» и Esc возвращают фокус имени.
- `channel`: `phone` по умолчанию, `whatsapp`, `email`. Оба новых поля входят
  в JSON, который `functions/api/lead.js` передаёт в `ALBATO_WEBHOOK_URL`.
- Восемь явных опечаток домена предлагают исправление кнопкой, без автозамены.
- Успех показывает контакты; исправление сохраняет значения, новая заявка
  очищает их. Двойная отправка блокируется; повтор неизменённых данных после
  сбоя сохраняет `submission_id`.
- Lead schema `2.1.0`, Client Copy `1.12.0`, verifier `1.2.0`,
  Review Numbered `2.8.0`; дата всех изменений `2026-09-16`.
  `precedent-body-v3` заменяет v2, номер ревью `4.6` сохранён.

## Проверки

Основания технических выводов: исходники и независимые runtime-проверки
реальной Pages Function / собранной страницы в Chromium. Данные синтетические,
все запросы формы перехвачены локальным mock; реальных лидов нет.

| Гейт | Результат |
|---|---|
| `python -B scripts/build-preview.py site/gambarian-standalone.html --standalone` | PASS, 4.10 MB |
| `python -B scripts/build-hero-variants.py` | PASS, шесть вариантов включая final-dev5 |
| `python -B scripts/build-action-bar.py` | PASS; open=60px, closed=60px |
| `python -B scripts/build-review-numbered.py` | PASS, 38 уникальных номеров: 16 client + 22 owner |
| `python -B scripts/verify-client-copy.py` | FAIL, 24 ошибки только в 8 HTML четырёх font-variants: v2 вместо v3 и прежняя подсказка имени |
| Тот же verifier без font-variants, включая frozen source и dynamic UI | PASS, 20 targets / 18 unique |
| `python -m unittest discover -s scripts/tests` | 33 tests, OK; TEMP/TMP внутри `temp/email-field` |
| `node scripts/verify-lead-hook.mjs` | `Lead hook 2.1.0 (2026-09-16): contract/static/runtime PASS` |
| `node --check functions/api/lead.js` | PASS |
| `node --check site/app.js` | PASS |
| `node --check scripts/verify-lead-form.mjs` | PASS |
| `node scripts/verify-lead-form.mjs` | PASS, пять mocked POST, ноль page errors |
| `git diff --check` / `git diff --cached --check` | PASS |

Browser-проверка: 360×600, 390×844, 960×800, 961×800, 1440×900.
Проверены ошибки пустого/неверного e-mail, все восемь подсказок домена,
отсутствие подсказки для gmail.com/yandex.ru/mail.ru/walla.co.il,
первый submit без сети, нормализованный телефон, Esc и «Исправить»,
повторная проверка изменившихся контактов, блокировка двойной отправки,
успех и оба возврата к форме, 503/422, фокус, сохранение канала и UUID повтора.
Переполнения нет в форме и подтверждении, включая адрес длиной 120 символов.

Первый запуск CLI завершался WinError 5 / spawn EPERM. Повтор обычной команды
с выводом в лог прошёл; ограничения среды не изменялись. Пример воспроизведения:

```powershell
python -m http.server 8098 --bind 127.0.0.1 --directory .
# В другом терминале:
node scripts/verify-lead-form.mjs *> temp/email-field/browser.log
```

До работы существовали изменения PNG и standalone, а также `.playwright-mcp/`.
PNG не менялись и не добавлялись в индекс. Standalone пересобран и проверен в
рабочей копии, но оставлен вне коммита из-за существовавших до задачи изменений:
при частичном включении собственного diff Git дважды отказал в создании
`.git/index.lock` для завершающего hunk v3. Частичное включение отменено.
Все канонические исходники включены; standalone воспроизводится первой командой
таблицы. Исходная копия сохранена в `temp/email-field/standalone-before.html`.

## Осталось

- Четыре font-variants не пересобирались по прямому указанию ТЗ.
- Письмо заявителю не реализовано: в обработчике отсутствует почтовый
  транспорт; необходимо отдельно выбрать транспорт и адрес офиса для reply-to.
- Деплой и реальный Albato catch не выполнялись. PNG-эталоны не переснимались.

## Related

- [Полное ТЗ](../tasks/2026-09-16-final-dev5-email-field.md)
- [Lead contract](../LEAD-WEBHOOK-CONTRACT.md)
- [Указания владельца](../CONTENT-OWNER-EDITS.md)
- [Карта источников](../CONTENT-SOURCE-MAP.md)
- [Browser regression test](../../scripts/verify-lead-form.mjs)

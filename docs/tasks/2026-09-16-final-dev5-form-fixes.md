# Задание на исполнение: три доработки формы по итогам ревью (final-dev5)

**Версия документа:** `1.0.0`; **Дата:** `2026-09-16`.

Рабочий каталог: `I:\GIT\gambaryan-deck-a` (worktree, ветка `codex/deck-a`, голова = `aac7868`,
проверь `git log -1`). Это отдельная копия: в основной сейчас другой процесс правит тесты.
Не трогать `tests/visual/` (кроме `states.spec.ts`, если без него нельзя), PNG и
`site/gambarian-standalone.html`. **Публиковать не надо.**

Независимое ревью формы (`e5dccd0`, `301c88c`) дало вердикт «доработать» с тремя пунктами.
Исправь все три, сохранив всё остальное поведение (`scripts/verify-lead-form.mjs` описывает его
и должен остаться зелёным после обновления ожиданий).

## 1. Экран успеха и карточка проверки должны учитывать канал связи

Сейчас при `channel=whatsapp` успех говорит «по телефону … и e-mail …» (`site/app.js` ~849),
а в карточке «Проверьте, как с вами связаться» канал не показан вовсе.

- В карточке проверки добавить строку «Связь» со значением по выбранной радиокнопке:
  «Позвонить», «WhatsApp», «Написать на e-mail» (текст берётся из подписи радиокнопки —
  новых строк вне контракта не плодить; если нужна подпись «Связь», добавить её в
  `ALLOWED_OUTSIDE_COPY_TEXT` как остальные подписи формы).
- Успех: `phone` → «Мы свяжемся с вами по телефону <displayPhone>», `whatsapp` → «Мы напишем
  вам в WhatsApp: <displayPhone>», `email` → «Мы ответим на e-mail: <email>». Остальные
  контакты — второй фразой «Вы указали: <телефон>, <e-mail>» (чтобы ошибку в любом контакте
  было видно). Тексты — в `ALLOWED_OUTSIDE_COPY_TEXT` (проверь, как сейчас разрешён текст
  успеха — вероятно, как составная динамическая строка; повтори механизм).

## 2. «Указать другие контакты» не должно плодить несвязанные заявки

Сейчас после успеха → «Указать другие контакты» → отправка без изменений создаёт вторую
заявку с новым `submission_id` (`app.js` ~890, `functions/api/lead.js` ~101).

- Запоминать `acceptedSubmissionId` и снимок принятых контактов после 202.
- В режиме исправления (`editingContacts = true`): если имя/телефон/e-mail/канал не
  изменились — POST не делать, показать успех снова; если изменились — отправить с полем
  `corrects_submission_id: <acceptedSubmissionId>` и **новым** `submission_id`.
- `site/lead-contract.js`: поле `corrects_submission_id` (необязательное, формат UUID как у
  `submission_id`); версия схемы minor. `functions/api/lead.js`: валидация (пустое или UUID,
  иначе 422 с полем), передача в Albato-payload после `submission_id`; старые запросы без
  поля — как раньше. `docs/LEAD-WEBHOOK-CONTRACT.md`: описать поле и смысл («исправление
  контактов ранее принятой заявки; в CRM объединять с указанной»).
- «Отправить ещё одну заявку» — как сейчас: чистая форма, новая заявка без связи.

## 3. Согласованные версии скриптов против смешанного кэша

Ревью показало: новый `app.js` со старым `lead-contract.js` падает до POST
(`LEAD_CONTRACT.isValidEmail is not a function`). Заголовки отдачи `max-age=0, must-revalidate`,
поэтому сценарий условный, но защита дешёвая: в `site/index.html` подключать
`lead-contract.js?v=<версия схемы>` и `app.js?v=<та же версия>`, где версия — строка из
`GAMBARIAN_LEAD_CONTRACT.version` (после п.2 она станет новой). Проверь, что сборка
(`build-preview.py`, `build-hero-variants.py`, `build-action-bar.py`) и статический гейт
`scripts/verify-lead-hook.mjs` понимают `?v=` (поправь гейт, если он ищет точное имя файла),
и что в `app.js` есть защита: если `LEAD_CONTRACT.version` не совпадает с ожидаемой в
`app.js` константой — отправлять в обход новой логики нельзя, но и молча падать нельзя:
показать общую ошибку формы с контактами (существующий `.lead-form__error`) — пусть
пользователь позвонит, лид не теряется молча.

## Проверка

```
python -B scripts/build-preview.py site/gambarian-standalone.html --standalone
python -B scripts/build-hero-variants.py
python -B scripts/build-action-bar.py
python -B scripts/verify-client-copy.py
python -m unittest discover -s scripts/tests
node scripts/verify-lead-hook.mjs
node --check functions/api/lead.js
git diff --check
```

`build-font-variants` пропусти (падение verify-client-copy только по шрифтовым вариантам —
назови). `scripts/verify-lead-form.mjs` — обновить ожидания текстов и добавить сценарии:
(а) исправление без изменений → нет POST; (б) исправление с изменением → POST с
`corrects_submission_id` = прежний id и новым `submission_id`; (в) WhatsApp → текст успеха
про WhatsApp. Прогнать против `python -m http.server 8098` из корня worktree (порт занят —
возьми другой и передай URL аргументом), сервер остановить.

## Завершение

Один коммит только своих файлов (`git add` по именам, не `-A`), без push:
`fix(final-dev5): lead form — channel-aware texts, linked contact corrections, versioned scripts`.
Без идентификаторов моделей.

## Отчёт

```
КОММИТ: <sha> на codex/deck-a
ПО ПУНКТАМ 1-3: что сделано (файл:строка), тексты дословно
СХЕМА: версия lead-contract, поле corrects_submission_id в Albato-payload (позиция)
ГЕЙТЫ: вывод каждого, verify-lead-form: число mocked-запросов
ЧТО НУЖНО ОТ ВЛАДЕЛЬЦА: настройка Albato/CRM под corrects_submission_id
ОСТАЛОСЬ: что не сделано и почему
```

Ничего кроме этого блока не выводи. Отвечай по-русски.


## Related

- [Исходное задание формы](2026-09-16-final-dev5-email-field.md)
- [Контракт доставки](../LEAD-WEBHOOK-CONTRACT.md)

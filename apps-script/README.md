# Мини-CRM lp.gambarian.com — Apps Script

Реализация design-документа `docs/MINI-CRM-DESIGN.md` версии **0.4.0** —
раздел §12 — решения владельца, и владельческое решение 2026-09-23: «Заявки»
несёт только поля офиса, вся техника — на скрытом защищённом листе
«Служебное» (§2, §3.2). Код здесь **не выполнялся вживую** ни разу — ни на
реальной таблице, ни как задеплоенный проект. Всё, что ниже помечено «не проверено»,
нужно пройти вручную перед подключением рекламы/Albato.

## Что where

```
apps-script/
  appsscript.json        # манифест: V8, TZ Asia/Jerusalem, oauthScopes, webapp
  src/
    Utils.gs              # colByHeader_, buildContactLinks_ — чистые хелперы
    BusinessCalendar.gs    # вс-чт 09:00-18:00, праздники, DST — ЧИСТАЯ ЛОГИКА
    Sla.gs                 # 30/120 рабочих минут — ЧИСТАЯ ЛОГИКА
    CorrectionChain.gs      # цепочки исправлений §5.4 — ЧИСТАЯ ЛОГИКА
    SendLog.gs              # журнал отправок, pending/sent/failed/unknown — ЧИСТАЯ ЛОГИКА
    Digest.gs               # состав дайджеста, ключ дня — ЧИСТАЯ ЛОГИКА
    Source.gs               # «Откуда» — ЧИСТАЯ ЛОГИКА
    Numbering.gs            # №-нумерация — ЧИСТАЯ ЛОГИКА
    SyncPlan.gs              # дедуп submission_id — ЧИСТАЯ ЛОГИКА
    EmailTemplates.gs         # брендированные HTML/plain-text письма — ЧИСТАЯ ЛОГИКА (Task B, задача 0.4.0)
    Config.gs                # дефолты/парсинг «Настроек» — ЧИСТАЯ ЛОГИКА (кроме чтения листа)
    Sheets.gs                 # setupCrm() — GAS-only, тестируется через фейки (gas-fakes.mjs); «Заявки» (14 office-полей) + «Служебное» (скрыт, защищён)
    Notifications.gs           # MailApp (htmlBody+body через EmailTemplates.gs) + журнал — GAS-only
    Code.gs                     # tick(), onEdit, триггеры, doGet, admin-функции — GAS-only, тестируется через фейки; sync/corrections/onEdit пишут в «Заявки» и «Служебное», связь по №
  test/
    run.mjs                     # node apps-script/test/run.mjs
    helpers/                     # harness, vm-загрузчик .gs, gas-fakes (структурные фейки GAS-сервисов), независимый oracle, фикстуры
    *.test.mjs                   # 108 тестов (чистая логика + GAS-only через структурные фейки)
  preview/
    render-previews.mjs           # рендерит новые письма (new-lead/SLA/эскалация) в HTML + PNG-скриншоты (Playwright) — docs/email-previews/
```

Модули «ЧИСТАЯ ЛОГИКА» не знают о `SpreadsheetApp`/`MailApp` (кроме одной точки —
`Utilities.formatDate`, см. ниже) и поэтому одинаково выполняются и в Apps Script,
и в Node (`vm`-контекст с маленьким моком). `Sheets.gs`/`Notifications.gs`/`Code.gs` —
интеграционный слой, вызывает чистую логику и настоящие GAS-сервисы; тестируется через
структурные фейки этих сервисов (`test/helpers/gas-fakes.mjs` — in-memory лист/протекшн/
PropertiesService/MailApp/ScriptApp/ContentService), не живым Google API.

## Тесты

```bash
node apps-script/test/run.mjs
```

108/108 зелёных, exit code 0 (83 после разбора двух независимых ревью коммита `1d64f41`
+ 20 задачи 0.4.0 «Служебное» split (`test/sheets-protection.test.mjs`,
`test/code-corrections.test.mjs`, `test/code-integration.test.mjs`) + 12 задачи 0.4.0
Task B — брендированные письма и HTML-escaping (`test/email-templates.test.mjs` и
дополнение в `code-integration.test.mjs`)). GAS-only код
(`Sheets.gs`/`Code.gs`/`Notifications.gs`) тестируется через структурные фейки
GAS-сервисов — `test/helpers/gas-fakes.mjs` (in-memory лист/протекшн/PropertiesService/
MailApp/ScriptApp/ContentService), а не пропускается. Единственная зависимость чистой
логики от Apps Script —
`Utilities.formatDate(date, tz, "yyyy-MM-dd'T'HH:mm:ss")` (стабильный документированный
API — https://developers.google.com/apps-script/reference/utilities/utilities#formatDate);
в Node он подменяется мок-функцией на `Intl.DateTimeFormat` (`test/helpers/mock-utilities.mjs`).
Все остальные вычисления (день недели, следующая календарная дата, перевод «стенного»
локального времени в UTC) — чистая арифметика на `Date.UTC`, не зависящая от TZ рантайма.

### Как воспроизвести RED -> GREEN

Тесты написаны и прогонялись как настоящий red-then-green: сначала против заглушек
(каждая функция бросает `Error('RED baseline: ... ещё не реализована')`), затем против
реализации в `src/`. Переменная `GAS_SRC_DIR` подменяет каталог, откуда `test/run.mjs`
грузит `.gs`-файлы, так что тот же набор тестов можно прогнать против любой копии:

```bash
# GREEN — реализация в репозитории
node apps-script/test/run.mjs
# => 40 passed, 0 failed, exit 0

# RED — воспроизводится генерацией временных заглушек (не хранятся в репозитории),
# см. вывод в отчёте задачи. Каждая тестируемая функция при этом бросает
# "RED baseline: <имя> ещё не реализована" — 0 passed, 40 failed, exit 1.
```

### Независимая проверка (oracle)

`test/helpers/oracle.mjs` — перебор по минутам через `Intl` НАПРЯМУЮ (не через код из
`src/`), используется как независимый эталон для `businessMinutesBetween` в тестах на
пример из дизайна (чт 17:50 -> вс 09:20 = 30 мин), на праздник и на переход DST. Дата
перехода DST **не хардкожена** — находится сканированием реальных данных ICU
(`findDstTransitions`), т.к. дата перехода в Израиле определяется законом и меняется
год от года (см. `behavioral-corrections.md`: не полагаться на память модели для
таких фактов).

## Настройки — «Настройки» лист, не код

`setupCrm()` пишет дефолты только для отсутствующих ключей (не перезаписывает то, что
уже поменяли руками). Три из них — **предложенные значения, ждущие подтверждения
владельца** (design §12.2, дата решения 2026-09-23):

| Ключ | Предложенное значение | Статус |
|---|---|---|
| `office_recipients` | cityr.ta@gmail.com, justicetelaviv@gmail.com | ждёт подтверждения |
| `escalation_recipients` | gambarian@gmail.com, alex@adfix.co.il | ждёт подтверждения |
| `default_duty_officer` | cityr.ta@gmail.com | ждёт подтверждения — design явно спрашивал «кто дежурит по умолчанию» и ответа не получил |

Правится прямо в листе «Настройки», без изменения кода — `loadConfig_()` читает их
при каждом `tick()`.

Ещё два ключа (review находка №13 / design §12 строка 7 — дежурный на выходные/ночь,
по умолчанию выключен, владелец: «пока нет»):

| Ключ | Дефолт | Смысл |
|---|---|---|
| `weekend_duty_enabled` | `false` | `true`/`false` — включить дежурного вне рабочего времени |
| `weekend_duty_email` | *(пусто)* | email дежурного; используется только если `weekend_duty_enabled=true` |

И один ключ для Albato (review находка №5 — заменяет ошибочное упоминание Script
Property в старой версии этого README, см. «Установка» шаг 5):

| Ключ | Дефолт | Смысл |
|---|---|---|
| `albato_editor_email` | *(пусто)* | email аккаунта Albato для доступа к «Входящие»; пока пусто — защита листа в режиме предупреждения, не жёсткая |

Праздники и сокращённые дни **не** заполняются автоматически: список меняется каждый
год, и хардкодить конкретные даты в код — риск ошибиться без второго источника
(`behavioral-corrections.md`, "2+ источника на технический вывод"). Добавляются вручную
в «Настройках» под строками-маркерами `ПРАЗДНИКИ` / `СОКРАЩЁННЫЕ ДНИ` (формат see
`Sheets.gs:readHolidaysAndShortDays_`).

## Установка (alex@adfix.co.il)

Design §12.3: владелец скрипта — **alex@adfix.co.il** (явный редактор таблицы
`1_jhfr7ucoKkbrwWlUQoS9wyw7uHYhe_oOutKpTlcoV4`; у ADFIX нет доступа к gambarian@gmail.com).

1. **Доступ по ссылке на таблице должен быть закрыт** (design §12.6, обязательное
   условие установки) — проверить в «Настройки доступа» перед следующим шагом.
2. Создать **отдельный** (не привязанный к таблице) проект Apps Script от аккаунта
   alex@adfix.co.il: script.google.com -> New project.
3. Скопировать содержимое `appsscript.json` в манифест проекта (Project Settings ->
   "Show appsscript.json" должен быть включён), и каждый файл из `src/*.gs` — отдельным
   файлом с тем же именем. Через `clasp`: `clasp create --type standalone`, затем
   `clasp push` из этой папки (`.clasp.json` с `scriptId` в репозиторий не кладём —
   секрет проекта, заводится локально при установке).
4. Авторизовать при первом запуске `setupCrm()` — потребует подтверждения scope'ов из
   `appsscript.json` (`spreadsheets`, `script.send_mail`, `script.scriptapp`).
5. Script Properties (Project Settings -> Script Properties):
   - `healthEndpointToken` — случайная строка для `doGet` (внешний наблюдатель, §5.7).
   - `albato_editor_email` здесь НЕ заводится (review находка №5 — раньше этот пункт
     противоречил коду): это строка листа «Настройки» (пустой дефолт создаёт
     `setupCrm()`), не Script Property. Заполняется прямо в таблице при подключении
     Albato. Пока пусто — `protectIntakeSheet_` держит «Входящие» в режиме
     предупреждения (`Protection.setWarningOnly(true)`), не блокирует Albato молча.
6. Запустить `setupCrm()` вручную один раз (Run -> setupCrm). Проверить: лист «2026»
   переименован в «Входящие» (если «Входящие» ещё не было), появились «Заявки»,
   «Сегодня», «Сводка», «Настройки» с дефолтами, «Журнал».
7. Запустить `installTriggers()` вручную один раз — создаст `tick` (каждые 5 мин) и
   `handleEdit_` (installable onEdit) триггеры.
8. Меню «CRM» в таблице НЕ появляется (review находка №2 — сознательно убрано, не
   баг): скрипт — standalone-проект (design §5.1), а официальная документация Google
   однозначна — `SpreadsheetApp.getUi()`/меню работают только у скрипта, привязанного
   к таблице:
   > "Only bound scripts can create menus. To display the menu when the user opens
   > a file, write the menu code within an onOpen function."
   — [Custom menus](https://developers.google.com/apps-script/guides/menus)
   > "A script can only interact with the UI for the current instance of an open
   > spreadsheet, and only if the script is bound to the spreadsheet."
   — [SpreadsheetApp.getUi()](https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app#getui())

   Это не зависит от типа триггера (простой `onOpen(e)` или installable) — дело в
   bound/standalone статусе самого проекта. Административные действия ADFIX выполняет
   вручную из редактора Apps Script: открыть проект -> выбрать функцию
   `menuSendTestNotification_` или `menuArchiveClosed_` в выпадающем списке -> Run;
   результат смотреть в логе выполнения (View -> Executions / Logger), не во
   всплывающем диалоге. Проверить, что тестовое письмо реально приходит на
   `system_alert_recipients`.

**Не проверено вживую** (см. также раздел отчёта задачи «не проверено»):
- Точные тексты ошибок `MailApp.sendEmail` при квотах/невалидных адресах —
  `classifySendError_` в `Notifications.gs` — эвристика, не подтверждённая живым вызовом.
- `INTAKE_HEADERS_` в `Sheets.gs` — реальные 24 поля маппинга Albato (владелец
  подтвердил порядок A..X, review находка №3, разбор двух независимых ревью
  коммита `1d64f41`); `setupCrm()` их только сверяет (`verifyIntakeHeaders_`,
  расхождение — строка в «Журнал»), никогда не переставляет/не дописывает.
  Живого прогона против настоящего сценария Albato (bundle 389466) всё ещё не было.
- `ConditionalFormatRuleBuilder` не имеет метода для рамки (border) — design §4 просит
  «красную рамку» для просроченного/пустого обязательного поля; реализовано как жирный
  красный фон (`applyRequestsConditionalFormatting_`). Если рамка нужна визуально
  буквально — потребуется либо смириться с фоном, либо кастомный подход (например,
  условное форматирование по границе ячейки штатно не поддерживается Apps Script API).
- Установка installable-триггера `onEdit` через `ScriptApp.newTrigger(...).forSpreadsheet(id).onEdit()`
  из standalone-проекта — механизм задокументирован (installable triggers,
  https://developers.google.com/apps-script/guides/triggers/installable), но сам вызов
  ни разу не выполнялся против реальной таблицы в рамках этой задачи.
- «Связаться» теперь пишется как `SpreadsheetApp.newRichTextValue()` с настоящей
  кликабельной ссылкой на WhatsApp (`buildContactCellPlan_` в `Utils.gs`,
  `writeContactCell_`/`buildContactRichText_` в `Code.gs`) — review находка №12.
  `tel:` НЕ сделан ссылкой: официальная документация `RichTextValueBuilder.setLinkUrl()`
  не описывает поддерживаемые URL-схемы явно
  (https://developers.google.com/apps-script/reference/spreadsheet/rich-text-value-builder),
  а независимые источники (справка/форум Google Docs, проверено поиском 2026-09-23)
  сообщают, что штатный `HYPERLINK()` в Google Sheets поддерживает кликабельными
  только http/https/mailto — устойчивой поддержки `tel:` не подтверждено. Телефон
  остаётся видимым текстом в той же ячейке («Позвонить: +972…  WhatsApp»), ссылка —
  только на слово WhatsApp. `[likely]`, не проверено вживую на реальной таблице —
  первое, что стоит перепроверить при живой приёмке (может оказаться, что `tel:`
  на мобильном Sheets всё-таки кликабелен — тогда стоит вернуть его как ссылку).

## Приёмочный тест Albato (design §7)

Сценарий Albato «Лиды с лендинга -> Таблица + Email (LP Leads)» (bundle 389466),
триггер «Gambarian lp- leads (prod)»: Webhook -> Google Sheets Create/update a row в
«Входящие», поиск по `submission_id`. Перед боем проверить (находка Codex №2 design
§7 — «повтор не создаёт вторую строку» НЕ считать доказанным, пока не пройдено):

1. Ключ поиска строки — `submission_id`, НЕ колонка A (проверить реальную настройку
   действия Albato, не значение по умолчанию).
2. Повторная доставка того же `submission_id` -> в «Входящие» одна строка (проверка
   самого Albato-действия), и `tick()` создаёт в «Заявки» тоже одну строку/одно
   уведомление (это уже покрыто `SyncPlan.gs`/`test/sync-plan.test.mjs` — но только
   на уровне логики, не на уровне реального прогона через Albato).
3. Пустой email в вебхуке — не должен ронять запись строки.
4. Две одновременные доставки (гонка) — `LockService` в `tick()` защищает только сам
   скрипт, не запись Albato через Sheets API напрямую в «Входящие» — там гонки в
   принципе нет, т.к. Albato пишет только туда, а `tick()` только читает.
5. Лист «Входящие» защищён (после `protectIntakeSheet_`) — попытка записи без прав
   редактора Albato должна быть отклонена Google, а не тихо проигнорирована.

## Откат (rollback)

1. Меню «CRM» недоступно / скрипт ведёт себя не так, как ожидалось: `removeTriggers()`
   из редактора Apps Script (Run -> removeTriggers) — останавливает `tick` и `onEdit`
   немедленно, без удаления данных.
2. Данные в «Заявки»/«Входящие»/«Журнал» не трогаются откатом — design §12.5:
   закрытые заявки хранятся бессрочно, авто-архивации нет (`menuArchiveClosed_` — заглушка).
3. Если нужно полностью отвязать скрипт от таблицы: снять редактора-владельца скрипта
   в списке доступа таблицы (Настройки доступа) — установленные триггеры перестанут
   выполняться от его имени. Код при этом остаётся в отдельном Apps Script проекте и
   в этом репозитории — можно переустановить в любой момент повторным `setupCrm()` +
   `installTriggers()` (обе идемпотентны).

## Открытые вопросы к владельцу (не блокируют код, см. design §12.2)

- Кто дежурит по умолчанию (`default_duty_officer`) и кому уходит эскалация
  (`escalation_recipients`) — сейчас в «Настройках» стоят ПРЕДЛОЖЕННЫЕ значения из
  design §12.2, требуют подтверждения или правки прямо в листе.
- Аккаунт Albato для доступа к «Входящим» (`albato_editor_email`) — заполняется при
  подключении Albato, сейчас пусто.

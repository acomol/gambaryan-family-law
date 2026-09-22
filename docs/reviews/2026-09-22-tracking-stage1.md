# Аналитика: локальная приёмка этапа 1

Дата: 2026-09-22. Ветка: `codex/deck-b`. Основа: `18f8ebd`.
Статус: LOCAL PASS: full-checks exit 0, 466 passed / 31 skipped, 0 обновлений эталонов. Публикаций, push, изменений GTM/GA4/Cloudflare и реальных заявок нет.

## Изменённые файлы

| Файл | Изменение |
|---|---|
| `site/app.js` | Общий track; клики, услуги, видимость, время, воронка, ID заявки и разделение исправлений; подавление конверсии ловушки. |
| `site/index.html` | Скрытый company без текста/label; версии скриптов 2.4.0. |
| `site/styles.css` | Поле company убрано из потока и за пределы экрана. |
| `site/lead-contract.js` | Версия 2.4.0, дата 2026-09-22. |
| `site/gambarian-standalone.html` | Пересобран штатным build-preview.py; вручную не редактировался. |
| `functions/api/lead.js` | Непустой company возвращает 202 до валидации/доставки, без webhook и логирования заявки. |
| `site-addons/action-bar/action-bar.js` | business_state и design_version в contact_click; контракт 2.5.0. |
| `site-addons/action-bar/action-bar.html` | Маркер Action Bar 2.5.0, дата 2026-09-22. |
| `site-addons/action-bar/action-bar.css` | Тот же маркер версии/даты; стили панели не менялись. |
| `scripts/action_bar_addon.py` | Синхронизация версии и даты addon. |
| `scripts/client-preview-map.json` | Action Bar 2.5.0; версия карты 2.6.0. |
| `scripts/qa-browser-matrix.py` | Ожидаемый маркер Action Bar 2.5.0. |
| `scripts/build-production.py` | Один GTM-MFLHW63Q в head с hostname guard; без noscript; отказ при дубле. |
| `scripts/verify-tracking.mjs` | Карта событий на трёх viewport, touch, кратность, фоновые часы, форма, атрибуция, ловушка, PII. |
| `scripts/verify-lead-hook.mjs` | Контракт 2.4.0; ловушка с/без секрета, без webhook/логов; company не попадает в Albato. |
| `scripts/verify-lead-form.mjs` | Список полей учитывает скрытый company; существующие сценарии сохранены. |
| `scripts/full-checks.sh` | verify-tracking сразу после verify-lead-form. |
| `tests/visual/python-matrix.spec.ts` | Только ожидаемый маркер Action Bar 2.5.0; эталоны не менялись. |
| `docs/LEAD-WEBHOOK-CONTRACT.md` | Контракт ловушки 2.4.0 и события новой/исправленной заявки. |
| `docs/ERRORS.md` | Причины и проверки двух дефектов аналитики формы. |
| `docs/TRACKING-REQUIREMENTS.md` | Статус этапа 1, «есть» в §3/§4, закрытие §6, slugs и точный порог видимости. |
| `docs/reviews/2026-09-22-tracking-stage1.md` | Этот отчёт, вывод проверок и доказательство красного/зелёного прогона. |

## Проверки

Две опоры проверки: исходный контракт/исходники и runtime-ассерты браузера/реальной
Function с подменой upstream. Тексты проверены exact-copy гейтом без изменения
allowlist; визуальные эталоны — штатным набором с `updateSnapshots: none` и git diff.

Windows: для дочернего Chromium заданы `TEMP` и `TMP` в
`I:/GIT/gambaryan-deck-b/build/tracking-tmp` (каталог игнорируется Git).

```powershell
$env:TEMP=(Resolve-Path 'build/tracking-tmp').Path
$env:TMP=$env:TEMP
bash scripts/full-checks.sh --visual
python -B scripts/build-production.py
```

Последние 40 строк полного прогона, exit 0:

```text
site/gambarian-standalone.html: 6.54 MB
   Проверка пройдена: кириллица на месте, внешних ссылок нет, файлы существуют.
   Проверка пройдена: слоты подставлены, звонок и путь к форме на месте, текст не изменился.
Проверка пройдена: разметка, подключение, контакты, слои и защита кликов на месте.
Проверка пройдена: 37 уникальных номеров, noindex и Action Bar сохранены.
PASS CLIENT-COPY-VERIFIER v1.2.0 | 2026-09-16: 28 HTML targets, 26 unique files, client-copy allowlist 45 IDs, owner-approved 22 block; contract v1.16.0 | 2026-09-18; source SHA256 5234CC5D9A3A4DF991827EF02E8DA46AE9C8B46D33C84CC33671E4B0465FA18E
OK
Lead hook 2.4.0 (2026-09-22): contract/static/runtime PASS
  status: 'PASS',
  layouts: [ '360x600', '390x844', '960x800', '961x800', '1440x900' ],
{"viewport":"360x640","status":"PASS","sections":7,"scroll":[25,50,75,90],"mockedRequests":8,"swipe":"PASS touch","pageErrors":0}
360x640: PASS visible 30/60/120/180; hidden excluded; seconds_to_lead=190
{"viewport":"390x844","status":"PASS","sections":7,"scroll":[25,50,75,90],"mockedRequests":8,"swipe":"PASS touch","pageErrors":0}
390x844: PASS visible 30/60/120/180; hidden excluded; seconds_to_lead=190
{"viewport":"1440x900","status":"PASS","sections":7,"scroll":[25,50,75,90],"mockedRequests":8,"swipe":"N/A desktop","pageErrors":0}
1440x900: PASS visible 30/60/120/180; hidden excluded; seconds_to_lead=190
Tracking: map §3 / funnel / honeypot / PII / design_version PASS
warning: in the working copy of 'docs/LEAD-WEBHOOK-CONTRACT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'docs/TRACKING-REQUIREMENTS.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/verify-tracking.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'site/app.js', LF will be replaced by CRLF the next time Git touches it
git diff --check: чисто
  31 skipped
  466 passed (4.5m)
Полные проверки за 344 с
```

Production builder и выполнение сниппета через Node VM с подменённым DOM, без сети:

```text
PASS PRODUCTION-BUILD v1.1.0: build\variants\final-dev5 -> build\production; без демо-переключателя; GTM ровно 1, только lp.gambarian.com; og:url и картинка превью на https://lp.gambarian.com/; index.html sha256 17a90fce6815c294
PASS GTM hostname lp.gambarian.com: 1 script request(s), DOM mock, no network
PASS GTM hostname gambarian-landing.pages.dev: 0 script request(s), DOM mock, no network
PASS GTM hostname final-dev5.gambarian-landing.pages.dev: 0 script request(s), DOM mock, no network
PASS GTM hostname 127.0.0.1: 0 script request(s), DOM mock, no network
PASS no GTM snippet: site/index.html
PASS no GTM snippet: build/variants/final-dev5/index.html
```

Сниппет соответствует [официальному образцу Google](https://developers.google.com/tag-platform/devguides/datalayer).
Для управления временем тест использует [Playwright Clock](https://playwright.dev/docs/clock):
30/60/120/180 секунд проверены без ожидания этих интервалов в реальном времени.
Два фоновых интервала по 180 секунд не вошли в `seconds_to_lead=190`.

## Проверка намеренной поломкой

В каноническом `site/app.js` временно заменён один вызов
`track('nav_click', ...)` на `track('nav_click_broken', ...)`, затем штатно
пересобраны Hero-варианты. Тест завершился exit 1 на клике логотипа.
После этого исходные байты app.js восстановлены в `finally`, варианты пересобраны.
Намеренная поломка в коммит не вошла.

Красный прогон:

```text
node:internal/modules/run_main:107
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: header .logo
+ actual - expected

  [
    {
      design_version: 'final-dev5',
+     event: 'nav_click_broken',
-     event: 'nav_click',
      placement: 'header',
      target: 'top'
    }
  ]

    at action (file:///I:/GIT/gambaryan-deck-b/scripts/verify-tracking.mjs:32:10)
    at async click (file:///I:/GIT/gambaryan-deck-b/scripts/verify-tracking.mjs:70:5)
    at async verifyTracking (file:///I:/GIT/gambaryan-deck-b/scripts/verify-tracking.mjs:82:3)
    at async file:///I:/GIT/gambaryan-deck-b/scripts/verify-tracking.mjs:295:36 {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: [
    {
      event: 'nav_click_broken',
      design_version: 'final-dev5',
      target: 'top',
      placement: 'header'
    }
  ],
  expected: [
    {
      event: 'nav_click',
      design_version: 'final-dev5',
      target: 'top',
      placement: 'header'
    }
  ],
  operator: 'deepStrictEqual',
  diff: 'simple'
}

Node.js v24.18.0
```

Зелёный прогон после восстановления, exit 0:

```text
{"viewport":"360x640","status":"PASS","sections":7,"scroll":[25,50,75,90],"mockedRequests":8,"swipe":"PASS touch","pageErrors":0}
360x640: PASS visible 30/60/120/180; hidden excluded; seconds_to_lead=190
{"viewport":"390x844","status":"PASS","sections":7,"scroll":[25,50,75,90],"mockedRequests":8,"swipe":"PASS touch","pageErrors":0}
390x844: PASS visible 30/60/120/180; hidden excluded; seconds_to_lead=190
{"viewport":"1440x900","status":"PASS","sections":7,"scroll":[25,50,75,90],"mockedRequests":8,"swipe":"N/A desktop","pageErrors":0}
1440x900: PASS visible 30/60/120/180; hidden excluded; seconds_to_lead=190
Tracking: map §3 / funnel / honeypot / PII / design_version PASS
```

## Покрытие карты §3 и отклонение от ТЗ

Все события карты §3 реализованы. Строки «не отслеживаем» сохранены: бургер
и подсказка e-mail не создают событие; `page_view`/время вовлечения остаются
автосбором GA4 этапа 2. First-touch UTM/gclid проверены в запросе и при повторном входе.

- На мобильных проверены реальные клики меню/нижней панели и touch-свайп через CDP.
  На desktop эти элементы/жесты недоступны по дизайну; проверена навигация шапки.
- Скрытые на мобильных стрелки проверены через dispatchEvent; на desktop — обычным кликом.
  Это проверка обработчика, не утверждение о доступности стрелок посетителю телефона.
- `service` получается из текста вкладки: нижний регистр, пробелы → дефисы;
  словарь зафиксирован в §4 плана (включая `раздел-имущества`).
- **Отклонение:** буквальный threshold 0.5 всей секции недостижим для адвокатов
  на мобильном: измерено 2121 px высоты при viewport 360×640 (максимум 30.2%).
  Поэтому порог равен половине меньшей из высот блока и экрана; IO сохраняет
  также границу 0.5. Уточнение отправлено владельцу, ответа на момент сдачи нет;
  это техническое решение исполнителя, не owner-approved изменение требования.
  Все 7 событий проверены реальной прокруткой без изменения геометрии секций.

Не проверены доставка/сбор в живых GTM/GA4/Ads и реальный Albato — публикация
и изменения внешних систем запрещены этим заданием. Все API-запросы формы в
браузерных проверках перехвачены; Function проверялась с подменённым fetch.

## Коммиты

- `221b818568ab9d53892cfc2ea3e2637761267c11` — реализация, контракты и проверки.
- Этот отчёт и актуализация статусов §3/§4/§6 сохранены отдельным документационным коммитом.

## Доработка по ревью

Версия дополнения: `V01`. Дата: `2026-09-22`. База: `5fc54b5`.
Ветка: `codex/deck-b`. Основание: `brief-tracking-stage1-fix.md` и
`brief-tracking-stage1-review-report.md` из scratchpad сессии
`e147268f-ad98-4156-8273-9bbcd5820109`.
Ранее в этом документе описана первичная приёмка; текущие результаты ниже.

1. **PII и структура событий.** В `verify-tracking.mjs` значения и запрещённые
   ключи проверяются рекурсивно, включая массивы. Имя/e-mail сравниваются без
   учёта регистра; в сериализации после удаления всех нецифровых символов
   ищутся оба тестовых номера `972501234567` и `0501234567`. Allowlist параметров
   сверена отдельным разбором таблицы §4: совпадают все 13 событий. Неизвестные
   события/параметры и вложенная структура вместо скалярного параметра дают FAIL.
   До исправления воспроизведён пропуск вложенного форматированного телефона,
   e-mail в верхнем регистре и неизвестного параметра. После исправления
   отдельный вызов настоящего `checkPrivacy` через Node VM отклонил восемь
   невалидных примеров и принял валидное событие.
2. **Успешный повтор новой заявки.** На каждом из 360×640, 390×844, 1440×900
   добавлены отдельные просмотры `network → 202` и `503 → 202`. Проверены:
   ровно два POST, равенство всего payload и `submission_id`, отсутствие
   `corrects_submission_id`, ноль лидов после ошибки и ровно один
   `generate_lead` после успеха с исходным ID; `lead_corrected` отсутствует.
3. **Четыре намеренные поломки.** Каждый красный прогон завершился exit 1
   по ожидаемому ассерту; каждый следующий зелёный — exit 0. Исходные байты
   восстанавливались в `finally`, после правки app.js варианты пересобирались
   штатным `build-hero-variants.py`. Временный runner и логи находятся в
   игнорируемом `build/tracking-fix/`; поломки в коммит не включаются.
4. **Ловушка.** Имя и класс заменены на `lf_hp`; id у поля отсутствует.
   Синхронизированы HTML/CSS, app.js, Function, lead-hook/tracking и ожидаемый
   список полей в `verify-lead-form.mjs`. Добавлен статический гейт на
   несемантические name/id/class и атрибуты `autocomplete="off"`, `tabindex="-1"`,
   `aria-hidden="true"`. Контракт и дата остаются `2.4.0` / `2026-09-22` по брифу;
   причина имени записана в контракте. Standalone пересобран штатным скриптом.

Две опоры выводов: сверка исходников/словаря/контракта и runtime браузера/Function
с подменой сети. После поломок отдельно доказано сравнением с HEAD: изменения
`site/app.js`, `site/index.html`, `site/styles.css`, `functions/api/lead.js`
сводятся ровно к переименованию ловушки. Проверены маркеры пересобранного standalone.

### Красные и зелёные прогоны

**Лишний лид:** в ветку успешного исправления контактов добавлен второй
`generate_lead` рядом с `lead_corrected`.

```text
Красный: exit 1 — AssertionError: Исправление контактов не создаёт лишний generate_lead
  actual: 2,
  expected: 1,
Зелёный: exit 0 — Tracking: map §3 / funnel / honeypot / PII / design_version PASS
```

**Вложенный PII:** в одно событие `section_view` для hero добавлен
`detail.entries[0].label = "+972 50-123-4567"`; ошибка именно PII-проверки.

```text
Красный: exit 1 — AssertionError: PII: телефон в dataLayer: 972501234567
  actual: false,
  expected: true,
Зелёный: exit 0 — Tracking: map §3 / funnel / honeypot / PII / design_version PASS
```

**Ловушка → лид:** условие `if (!data.lf_hp)` временно заменено на `if (true)`.

```text
Красный: exit 1 — AssertionError: Ловушка не создаёт generate_lead
  actual: 1,
  expected: 0,
Зелёный: exit 0 — Tracking: map §3 / funnel / honeypot / PII / design_version PASS
```

**Ловушка → webhook:** внутри ветки непустого `lf_hp` добавлен вызов fetch
при наличии тестового секрета. Fetch подменён в `verify-lead-hook.mjs`;
внешнего запроса нет, красный прогон фиксирует захваченный вызов вместо undefined.

```text
Красный: exit 1 — AssertionError: Ловушка не должна вызывать webhook
  actual: {
  expected: undefined,
Зелёный: exit 0 — Lead hook 2.4.0 (2026-09-22): contract/static/runtime PASS
```

### Итоговая проверка

`bash scripts/full-checks.sh --visual` — **exit 0**, 358 секунд.
`verify-client-copy` PASS без правок allowlist; визуальный набор —
**466 passed / 31 skipped**, `unexpected=0` в JSON-отчёте Playwright.
`updateSnapshots: none`; эталоны не обновлялись.

Последние 15 строк полного прогона:

```text
{"viewport":"1440x900","status":"PASS","sections":7,"scroll":[25,50,75,90],"mockedRequests":12,"swipe":"N/A desktop","pageErrors":0}
1440x900: PASS visible 30/60/120/180; hidden excluded; seconds_to_lead=190
Tracking: map §3 / funnel / honeypot / PII / design_version PASS
warning: in the working copy of 'docs/LEAD-WEBHOOK-CONTRACT.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'functions/api/lead.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/verify-lead-form.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/verify-lead-hook.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/verify-tracking.mjs', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'site/app.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'site/index.html', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'site/styles.css', LF will be replaced by CRLF the next time Git touches it
git diff --check: чисто
  31 skipped
  466 passed (4.8m)
Полные проверки за 358 с
```

Не проверены реальное автозаполнение Chrome/менеджеров паролей и живые
GTM/GA4/Albato. Публикации, push и реальные заявки не выполнялись.

## Related

- [План аналитики](../TRACKING-REQUIREMENTS.md)
- [Контракт заявки](../LEAD-WEBHOOK-CONTRACT.md)
- [Дефекты формы](../ERRORS.md)
- [Верификатор событий](../../scripts/verify-tracking.mjs)
- [Верификатор Function](../../scripts/verify-lead-hook.mjs)
- [Полный прогон](../../scripts/full-checks.sh)

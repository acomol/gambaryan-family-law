# final-dev4: нерабочее время, этап 4

**Версия отчёта:** `V01`

**Дата:** `2026-09-07`

**Статус:** локальный кандидат; browser/live приёмка не выполнена.

Ветка: `codex/final-dev4-s4-hours`. База этапа: `537d3ded19a59c13520200f30384cd906126ea5f`.
Запрошенный коммит: `feat(final-dev4): every phone link outside the hero switches to WhatsApp after hours`.

## Изменение

- FINAL-DEV4-DESIGN 1.1.0: отдельный адаптер, наблюдающий только за состоянием Action Bar.
- CLIENT-COPY-CONTRACT 1.4.1: добавлен SYSTEM-UI фрагмент ошибки «Если ошибка повторяется, напишите в».
- BUSINESS-HOURS-GATE 1.0.0: принудительные open/closed, мок /api/lead 503, восстановление outerHTML, меню на 390 и desktop 1440.
- В site/index.html и standalone по 4 data-business-closed="whatsapp": nav-call, nav-drawer__call, hero__call, contact-list__row. В final-dev4 их 3: nav-call удаляет существующий builder. Значений hide нет.
- Ошибка формы переключается двумя data-business-variant=open/closed; исходный открытый текст сохранён дословно. Телефонной ссылки в подвале уже нет после этапа 3.
- Следствие решения №25: в закрытом состоянии в блоке контактов будет два одинаковых ряда WhatsApp по назначению; владелец увидит дублирование на Preview и решит, оставлять ли. Ряд телефона не скрывается.

## Проверено

[verified] Исходная разметка сверена HTMLParser и прочитана в собранном HTML: 4/4/3 атрибута, все whatsapp. Копирайт проверен отдельным verifier и unit-тестами (18/18 после переноса TEMP/TMP в workspace). Проверки final-dev4 в builder и verify-client-previews проходят; общий Preview-гейт падает только на неполном v1. Синтаксис Python (ast.parse) и адаптера JS (node --check) проверен.

Адаптер в build/variants/final-dev4 байт в байт равен новому источнику. Источники final-dev3, Action Bar и frozen source не изменены относительно базы этапа (git diff и сверка копий адаптеров). Общая запрошенная команда build-hero-variants пересобрала локальный производный final-dev3; его addon и опубликованный alias не менялись. Production не публиковался; в site/ адаптер не подключён. Секции услуг, факты, шрифты, фото и отступы не редактировались.

## Не проверено и ограничения

- build-font-variants: curl exit 7 при загрузке Google Fonts. По прямому указанию владельца пропущен, остальные гейты запущены. Остальные шрифтовые build-каталоги могли остаться от предыдущего прогона; copy PASS не доказывает свежесть полной сборки.
- build-action-bar и все browser-гейты: WinError 5 при создании subprocess pipe, до запуска браузера. Не подтверждены реальное DOM-переключение, восстановление, латч, отсутствие overflow и скриншоты. Гейты не ослаблялись.
- Первый unit-прогон: ошибки доступа к I:\\Temp, итог 18 tests / errors=34. Повтор той же команды с TEMP/TMP=I:\\GIT\\gambaryan-family-law\\build\\stage4-tmp: 18/18 OK. Первый большой вывод инструмент обрезал; ниже дан финальный полный успешный вывод.
- Деплой, live readback, реальные лиды и PR не выполнялись по заданию. Этап 6 не входит в эту работу.

## Файлы

- `docs/CLIENT-PREVIEW-HANDOFF.md`
- `docs/CONTENT-APPROVED.md`
- `docs/CONTENT-EXTRA.md`
- `docs/CONTENT-OWNER-EDITS.md`
- `docs/CONTENT-SOURCE-MAP.md`
- `docs/FINAL-QA-CHECKLIST.md`
- `docs/RESUME.md`
- `docs/boards/2026-08-06-versions-links.md`
- `docs/reviews/2026-09-07-final-dev4-stage-4-local.md`
- `docs/tasks/2026-08-13-dark-fact-cards.md`
- `docs/tasks/codex/README.md`
- `scripts/build-hero-variants.py`
- `scripts/client_copy_contract.py`
- `scripts/final_dev4_contract.py`
- `scripts/tests/test_verify_client_copy.py`
- `scripts/verify-business-hours.py`
- `scripts/verify-client-copy.py`
- `scripts/verify-client-previews.py`
- `site-addons/final-dev4/hero-business-hours.js`
- `site/gambarian-standalone.html`
- `site/index.html`
- `site/styles.css`

## Дополнительная статическая проверка

```text
site/index.html [('a', 'nav-call', 'whatsapp'), ('a', 'nav-drawer__call', 'whatsapp'), ('a', 'hero__call', 'whatsapp'), ('a', 'contact-list__row', 'whatsapp')]
site/gambarian-standalone.html [('a', 'nav-call', 'whatsapp'), ('a', 'nav-drawer__call', 'whatsapp'), ('a', 'hero__call', 'whatsapp'), ('a', 'contact-list__row', 'whatsapp')]
build/variants/final-dev4/index.html [('a', 'nav-drawer__call', 'whatsapp'), ('a', 'hero__call hero__call--expanded', 'whatsapp'), ('a', 'contact-list__row', 'whatsapp')]
PASS final-dev4 source/build contract; adapter byte equality; protected sources unchanged from 537d3ded19a59c13520200f30384cd906126ea5f
final-dev4 &nbsp;— count: 15
```

## Дословные выводы гейтов

Выводы stdout/stderr сохранены без сокращений, кроме первого unit-прогона, обрезанного инструментом (см. ограничения). Последний повтор unit приведён отдельно. Команды запускались по порядку задания; дополнительные browser-гейты — после основных.

### `python -B scripts/build-preview.py site/gambarian-standalone.html --standalone`

Exit 0.

```text
site/gambarian-standalone.html: 3.79 MB
внешних ссылок: 3 -> ['https://www.google.com/maps/search/?api=1&amp;query=%D7%A7%D7%A8%D7%9C%D7%99%D7%91%D7%9A+10%2C+%D7%AA%D7%9C+%D7%90%D7%91%D7%99%D7%91', 'https://www.google.com/maps/search/?api=1&amp;query=%D7%A7%D7%A8%D7%9C%D7%99%D7%91%D7%9A+10%2C+%D7%AA%D7%9C+%D7%90%D7%91%D7%99%D7%91', 'https://www.google.com/maps/search/?api=1&amp;query=%D7%A7%D7%A8%D7%9C%D7%99%D7%91%D7%9A+10%2C+%D7%AA%D7%9C+%D7%90%D7%91%D7%99%D7%91']
```

### `python -B scripts/build-font-variants.py`

Exit 1.

```text

=== Вариант 1: Нынешний
Traceback (most recent call last):
  File "I:\GIT\gambaryan-family-law\scripts\build-font-variants.py", line 365, in <module>
    raise SystemExit(main())
                     ~~~~^^
  File "I:\GIT\gambaryan-family-law\scripts\build-font-variants.py", line 344, in main
    rep = build(n)
  File "I:\GIT\gambaryan-family-law\scripts\build-font-variants.py", line 199, in build
    css = fetch(f"https://fonts.googleapis.com/css2?family={cfg['query']}&display=swap").decode()
          ~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "I:\GIT\gambaryan-family-law\scripts\build-font-variants.py", line 130, in fetch
    out = subprocess.run(["curl", "-fsS", "--max-time", "60", "--retry", "3",
                          "--retry-delay", "1", "--retry-all-errors", "-A", UA, url],
                         capture_output=True, check=True)
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\subprocess.py", line 577, in run
    raise CalledProcessError(retcode, process.args,
                             output=stdout, stderr=stderr)
subprocess.CalledProcessError: Command '['curl', '-fsS', '--max-time', '60', '--retry', '3', '--retry-delay', '1', '--retry-all-errors', '-A', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..700;1,400..700&display=swap']' returned non-zero exit status 7.
```

### `python -B scripts/build-hero-variants.py`

Exit 0.

```text
=== hero-a-actions-first — Действия перед фотографией
   Проверка пройдена: слоты подставлены, звонок и путь к форме на месте, текст не изменился.
=== hero-b-call-first — Звонок — главное действие
   Проверка пройдена: слоты подставлены, звонок и путь к форме на месте, текст не изменился.
=== final-dev1 — Desktop Hero с расширенной конверсией
   Проверка пройдена: слоты подставлены, звонок и путь к форме на месте, текст не изменился.
=== final-dev3 — Desktop Hero с расширенной конверсией
   Проверка пройдена: слоты подставлены, звонок и путь к форме на месте, текст не изменился.
=== final-dev4 — final-dev4: наследник final-dev3 с правками владельцев 2026-09-06
   Проверка пройдена: слоты подставлены, звонок и путь к форме на месте, текст не изменился.
```

### `python -B scripts/build-action-bar.py`

Exit 1.

```text
Traceback (most recent call last):
  File "I:\GIT\gambaryan-family-law\scripts\build-action-bar.py", line 430, in <module>
    raise SystemExit(main())
                     ~~~~^^
  File "I:\GIT\gambaryan-family-law\scripts\build-action-bar.py", line 412, in main
    height, state_heights, demo_results = measure_and_pin(dest)
                                          ~~~~~~~~~~~~~~~^^^^^^
  File "I:\GIT\gambaryan-family-law\scripts\build-action-bar.py", line 63, in measure_and_pin
    with sync_playwright() as playwright:
         ~~~~~~~~~~~~~~~^^
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\sync_api\_context_manager.py", line 77, in __enter__
    dispatcher_fiber.switch()
    ~~~~~~~~~~~~~~~~~~~~~~~^^
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\sync_api\_context_manager.py", line 56, in greenlet_main
    self._loop.run_until_complete(self._connection.run_as_sync())
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\base_events.py", line 725, in run_until_complete
    return future.result()
           ~~~~~~~~~~~~~^^
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_connection.py", line 303, in run_as_sync
    await self.run()
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_connection.py", line 312, in run
    await self._transport.connect()
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_transport.py", line 133, in connect
    raise exc
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_transport.py", line 120, in connect
    self._proc = await asyncio.create_subprocess_exec(
                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<9 lines>...
    )
    ^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\subprocess.py", line 224, in create_subprocess_exec
    transport, protocol = await loop.subprocess_exec(
                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<3 lines>...
        stderr=stderr, **kwds)
        ^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\base_events.py", line 1812, in subprocess_exec
    transport = await self._make_subprocess_transport(
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        protocol, popen_args, False, stdin, stdout, stderr,
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        bufsize, **kwargs)
        ^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_events.py", line 401, in _make_subprocess_transport
    transp = _WindowsSubprocessTransport(self, protocol, args, shell,
                                         stdin, stdout, stderr, bufsize,
                                         waiter=waiter, extra=extra,
                                         **kwargs)
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\base_subprocess.py", line 40, in __init__
    self._start(args=args, shell=shell, stdin=stdin, stdout=stdout,
    ~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                stderr=stderr, bufsize=bufsize, **kwargs)
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_events.py", line 882, in _start
    self._proc = windows_utils.Popen(
                 ~~~~~~~~~~~~~~~~~~~^
        args, shell=shell, stdin=stdin, stdout=stdout, stderr=stderr,
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        bufsize=bufsize, **kwargs)
        ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_utils.py", line 144, in __init__
    stdin_rh, stdin_wh = pipe(overlapped=(False, True), duplex=True)
                         ~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_utils.py", line 70, in pipe
    h2 = _winapi.CreateFile(
        address, access, 0, _winapi.NULL, _winapi.OPEN_EXISTING,
        flags_and_attribs, _winapi.NULL)
PermissionError: [WinError 5] Access is denied
Future exception was never retrieved
future: <Future finished exception=PermissionError(13, 'Access is denied', None, 5, None)>
Traceback (most recent call last):
  File "I:\GIT\gambaryan-family-law\scripts\build-action-bar.py", line 430, in <module>
    raise SystemExit(main())
                     ^^^^^^
  File "I:\GIT\gambaryan-family-law\scripts\build-action-bar.py", line 412, in main
    height, state_heights, demo_results = measure_and_pin(dest)
                                          ^^^^^^^^^^^^^^^^^^^^^
  File "I:\GIT\gambaryan-family-law\scripts\build-action-bar.py", line 63, in measure_and_pin
    with sync_playwright() as playwright:
         ^^^^^^^^^^^^^^^^^
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\sync_api\_context_manager.py", line 77, in __enter__
    dispatcher_fiber.switch()
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\sync_api\_context_manager.py", line 56, in greenlet_main
    self._loop.run_until_complete(self._connection.run_as_sync())
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\base_events.py", line 725, in run_until_complete
    return future.result()
           ^^^^^^^^^^^^^^^
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_connection.py", line 303, in run_as_sync
    await self.run()
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_connection.py", line 312, in run
    await self._transport.connect()
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_transport.py", line 133, in connect
    raise exc
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_transport.py", line 120, in connect
    self._proc = await asyncio.create_subprocess_exec(
                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<9 lines>...
    )
    ^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\subprocess.py", line 224, in create_subprocess_exec
    transport, protocol = await loop.subprocess_exec(
                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<3 lines>...
        stderr=stderr, **kwds)
        ^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\base_events.py", line 1812, in subprocess_exec
    transport = await self._make_subprocess_transport(
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        protocol, popen_args, False, stdin, stdout, stderr,
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        bufsize, **kwargs)
        ^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_events.py", line 401, in _make_subprocess_transport
    transp = _WindowsSubprocessTransport(self, protocol, args, shell,
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<2 lines>...
                                         **kwargs)
                                         ^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\base_subprocess.py", line 40, in __init__
    self._start(args=args, shell=shell, stdin=stdin, stdout=stdout,
                stderr=stderr, bufsize=bufsize, **kwargs)
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_events.py", line 882, in _start
    self._proc = windows_utils.Popen(
                 ^^^^^^^^^^^^^^^^^^^^
        args, shell=shell, stdin=stdin, stdout=stdout, stderr=stderr,
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        bufsize=bufsize, **kwargs)
        ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_utils.py", line 144, in __init__
    stdin_rh, stdin_wh = pipe(overlapped=(False, True), duplex=True)
                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_utils.py", line 70, in pipe
    h2 = _winapi.CreateFile(
         ^^^^^^^^^^^^^^^^^^^
        address, access, 0, _winapi.NULL, _winapi.OPEN_EXISTING,
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        flags_and_attribs, _winapi.NULL)
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
PermissionError: [WinError 5] Access is denied
```

### `python -B scripts/build-review-numbered.py`

Exit 0.

```text
Собрано: build\variants\review-numbered
Использованных утверждённых номеров: client=18, owner=18
Проверка пройдена: 36 уникальных номеров, noindex и Action Bar сохранены.
```

### `python -B scripts/verify-client-copy.py`

Exit 0.

```text
PASS CLIENT-COPY-VERIFIER v1.1.0 | 2026-09-07: 26 HTML targets, 24 unique files, client-copy allowlist 45 IDs, owner-approved 18 block; contract v1.4.1 | 2026-09-07; source SHA256 5234CC5D9A3A4DF991827EF02E8DA46AE9C8B46D33C84CC33671E4B0465FA18E
```

### `python -B scripts/verify-client-previews.py`

Exit 1.

```text
ПРОВЕРКА НЕ ПРОЙДЕНА:
  ✗ v1-playfair-onest: action-bar.css не скопирован в клиентскую сборку
  ✗ v1-playfair-onest: action-bar.js не скопирован в клиентскую сборку
  ✗ v1-playfair-onest: client-preview.css не скопирован в клиентскую сборку
  ✗ v1-playfair-onest: в клиентском Preview должен быть один favicon
  ✗ v1-playfair-onest: Action Bar должен быть в разметке ровно один раз
  ✗ v1-playfair-onest: в клиентском viewport нет viewport-fit=cover
  ✗ v1-playfair-onest: в HTML/CSS/JS нужны единые версия и дата ACTION-BAR-SPEC
  ✗ v1-playfair-onest: нет ресинхронизации после мгновенного якорного перехода
  ✗ v1-playfair-onest: карта рабочего времени вс–чт 09:00–18:00 неполна
  ✗ v1-playfair-onest: Action Bar должен начинать с одного pending business-state
  ✗ v1-playfair-onest: телефон должен быть единственным business-only действием
  ✗ v1-playfair-onest: не найдено действие «Записаться»
  ✗ v1-playfair-onest: не найден переключаемый label WhatsApp
  ✗ v1-playfair-onest: нужен один скрытый до инициализации demo-switch
  ✗ v1-playfair-onest: demo-control должен быть доступным переключателем
  ✗ v1-playfair-onest: demo-switch должен иметь стабильное доступное имя
  ✗ v1-playfair-onest: не найден видимый статус Авто/Демо
  ✗ v1-playfair-onest: не найден видимый статус рабочего/нерабочего времени
  ✗ v1-playfair-onest: нет точного нерабочего label «Написать в WhatsApp»
  ✗ v1-playfair-onest: demo-switch не управляет обоими состояниями панели
  ✗ v1-playfair-onest: нерабочее состояние должно иметь две равные колонки
  ✗ v1-playfair-onest: скрытый телефон должен удаляться из layout
  ✗ v1-playfair-onest: demo-switch должен показываться только на mobile Preview
  ✗ v1-playfair-onest: demo-switch должен оставаться доступным в landscape
```

### `node scripts/verify-lead-hook.mjs`

Exit 0.

```text
Lead hook 2.0.0 (2026-08-11): contract/static/runtime PASS
```

### `git diff --check`

Exit 0.

```text
warning: in the working copy of 'scripts/final_dev4_contract.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/tests/test_verify_client_copy.py', LF will be replaced by CRLF the next time Git touches it
```

### `python -m unittest discover -s scripts/tests`

Exit 0. Окружение: `TEMP/TMP=I:\GIT\gambaryan-family-law\build\stage4-tmp`.

```text
..................
----------------------------------------------------------------------
Ran 18 tests in 0.705s

OK
```

### `python scripts/verify-business-hours.py http://127.0.0.1:8098/build/variants/final-dev4/`

Exit 1.

```text
{"type": "error", "error": "[WinError 5] Access is denied"}
{"type": "summary", "gate": "BUSINESS-HOURS-GATE v1.0.0", "status": "FAIL", "passed": 0, "total": 2}
Future exception was never retrieved
future: <Future finished exception=PermissionError(13, 'Access is denied', None, 5, None)>
Traceback (most recent call last):
  File "I:\GIT\gambaryan-family-law\scripts\verify-business-hours.py", line 70, in main
    with sync_playwright() as playwright:
         ~~~~~~~~~~~~~~~^^
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\sync_api\_context_manager.py", line 77, in __enter__
    dispatcher_fiber.switch()
    ~~~~~~~~~~~~~~~~~~~~~~~^^
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\sync_api\_context_manager.py", line 56, in greenlet_main
    self._loop.run_until_complete(self._connection.run_as_sync())
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\base_events.py", line 725, in run_until_complete
    return future.result()
           ~~~~~~~~~~~~~^^
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_connection.py", line 303, in run_as_sync
    await self.run()
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_connection.py", line 312, in run
    await self._transport.connect()
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_transport.py", line 133, in connect
    raise exc
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_transport.py", line 120, in connect
    self._proc = await asyncio.create_subprocess_exec(
                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<9 lines>...
    )
    ^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\subprocess.py", line 224, in create_subprocess_exec
    transport, protocol = await loop.subprocess_exec(
                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<3 lines>...
        stderr=stderr, **kwds)
        ^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\base_events.py", line 1812, in subprocess_exec
    transport = await self._make_subprocess_transport(
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        protocol, popen_args, False, stdin, stdout, stderr,
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        bufsize, **kwargs)
        ^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_events.py", line 401, in _make_subprocess_transport
    transp = _WindowsSubprocessTransport(self, protocol, args, shell,
                                         stdin, stdout, stderr, bufsize,
                                         waiter=waiter, extra=extra,
                                         **kwargs)
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\base_subprocess.py", line 40, in __init__
    self._start(args=args, shell=shell, stdin=stdin, stdout=stdout,
    ~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                stderr=stderr, bufsize=bufsize, **kwargs)
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_events.py", line 882, in _start
    self._proc = windows_utils.Popen(
                 ~~~~~~~~~~~~~~~~~~~^
        args, shell=shell, stdin=stdin, stdout=stdout, stderr=stderr,
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        bufsize=bufsize, **kwargs)
        ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_utils.py", line 144, in __init__
    stdin_rh, stdin_wh = pipe(overlapped=(False, True), duplex=True)
                         ~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_utils.py", line 70, in pipe
    h2 = _winapi.CreateFile(
        address, access, 0, _winapi.NULL, _winapi.OPEN_EXISTING,
        flags_and_attribs, _winapi.NULL)
PermissionError: [WinError 5] Access is denied
```

### `python scripts/verify-address-links.py http://127.0.0.1:8098/build/variants/final-dev4/`

Exit 1.

```text
{"type": "error", "error": "[WinError 5] Access is denied"}
{"type": "summary", "gate": "ADDRESS-LINKS-GATE v1.0.0", "status": "FAIL", "passed": 0, "total": 2}
Future exception was never retrieved
future: <Future finished exception=PermissionError(13, 'Access is denied', None, 5, None)>
Traceback (most recent call last):
  File "I:\GIT\gambaryan-family-law\scripts\verify-address-links.py", line 120, in main
    with sync_playwright() as playwright:
         ~~~~~~~~~~~~~~~^^
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\sync_api\_context_manager.py", line 77, in __enter__
    dispatcher_fiber.switch()
    ~~~~~~~~~~~~~~~~~~~~~~~^^
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\sync_api\_context_manager.py", line 56, in greenlet_main
    self._loop.run_until_complete(self._connection.run_as_sync())
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\base_events.py", line 725, in run_until_complete
    return future.result()
           ~~~~~~~~~~~~~^^
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_connection.py", line 303, in run_as_sync
    await self.run()
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_connection.py", line 312, in run
    await self._transport.connect()
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_transport.py", line 133, in connect
    raise exc
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_transport.py", line 120, in connect
    self._proc = await asyncio.create_subprocess_exec(
                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<9 lines>...
    )
    ^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\subprocess.py", line 224, in create_subprocess_exec
    transport, protocol = await loop.subprocess_exec(
                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<3 lines>...
        stderr=stderr, **kwds)
        ^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\base_events.py", line 1812, in subprocess_exec
    transport = await self._make_subprocess_transport(
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        protocol, popen_args, False, stdin, stdout, stderr,
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        bufsize, **kwargs)
        ^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_events.py", line 401, in _make_subprocess_transport
    transp = _WindowsSubprocessTransport(self, protocol, args, shell,
                                         stdin, stdout, stderr, bufsize,
                                         waiter=waiter, extra=extra,
                                         **kwargs)
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\base_subprocess.py", line 40, in __init__
    self._start(args=args, shell=shell, stdin=stdin, stdout=stdout,
    ~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                stderr=stderr, bufsize=bufsize, **kwargs)
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_events.py", line 882, in _start
    self._proc = windows_utils.Popen(
                 ~~~~~~~~~~~~~~~~~~~^
        args, shell=shell, stdin=stdin, stdout=stdout, stderr=stderr,
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        bufsize=bufsize, **kwargs)
        ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_utils.py", line 144, in __init__
    stdin_rh, stdin_wh = pipe(overlapped=(False, True), duplex=True)
                         ~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_utils.py", line 70, in pipe
    h2 = _winapi.CreateFile(
        address, access, 0, _winapi.NULL, _winapi.OPEN_EXISTING,
        flags_and_attribs, _winapi.NULL)
PermissionError: [WinError 5] Access is denied
```

### `python scripts/qa-browser-matrix.py http://127.0.0.1:8098/build/variants/final-dev4/ --target-name final-dev4`

Exit 1.

```text
{"error": "PermissionError:[WinError 5] Access is denied", "runner_version": "1.4.3", "status": "FAIL", "type": "fatal"}
Future exception was never retrieved
future: <Future finished exception=PermissionError(13, 'Access is denied', None, 5, None)>
Traceback (most recent call last):
  File "I:\GIT\gambaryan-family-law\scripts\qa-browser-matrix.py", line 1193, in main
    with sync_playwright() as playwright:
         ~~~~~~~~~~~~~~~^^
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\sync_api\_context_manager.py", line 77, in __enter__
    dispatcher_fiber.switch()
    ~~~~~~~~~~~~~~~~~~~~~~~^^
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\sync_api\_context_manager.py", line 56, in greenlet_main
    self._loop.run_until_complete(self._connection.run_as_sync())
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\base_events.py", line 725, in run_until_complete
    return future.result()
           ~~~~~~~~~~~~~^^
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_connection.py", line 303, in run_as_sync
    await self.run()
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_connection.py", line 312, in run
    await self._transport.connect()
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_transport.py", line 133, in connect
    raise exc
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_transport.py", line 120, in connect
    self._proc = await asyncio.create_subprocess_exec(
                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<9 lines>...
    )
    ^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\subprocess.py", line 224, in create_subprocess_exec
    transport, protocol = await loop.subprocess_exec(
                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<3 lines>...
        stderr=stderr, **kwds)
        ^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\base_events.py", line 1812, in subprocess_exec
    transport = await self._make_subprocess_transport(
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        protocol, popen_args, False, stdin, stdout, stderr,
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        bufsize, **kwargs)
        ^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_events.py", line 401, in _make_subprocess_transport
    transp = _WindowsSubprocessTransport(self, protocol, args, shell,
                                         stdin, stdout, stderr, bufsize,
                                         waiter=waiter, extra=extra,
                                         **kwargs)
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\base_subprocess.py", line 40, in __init__
    self._start(args=args, shell=shell, stdin=stdin, stdout=stdout,
    ~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                stderr=stderr, bufsize=bufsize, **kwargs)
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_events.py", line 882, in _start
    self._proc = windows_utils.Popen(
                 ~~~~~~~~~~~~~~~~~~~^
        args, shell=shell, stdin=stdin, stdout=stdout, stderr=stderr,
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        bufsize=bufsize, **kwargs)
        ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_utils.py", line 144, in __init__
    stdin_rh, stdin_wh = pipe(overlapped=(False, True), duplex=True)
                         ~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_utils.py", line 70, in pipe
    h2 = _winapi.CreateFile(
        address, access, 0, _winapi.NULL, _winapi.OPEN_EXISTING,
        flags_and_attribs, _winapi.NULL)
PermissionError: [WinError 5] Access is denied
```

### `python scripts/qa-browser-matrix.py http://127.0.0.1:8098/ --all-previews`

Exit 1.

```text
{"error": "PermissionError:[WinError 5] Access is denied", "runner_version": "1.4.3", "status": "FAIL", "type": "fatal"}
Future exception was never retrieved
future: <Future finished exception=PermissionError(13, 'Access is denied', None, 5, None)>
Traceback (most recent call last):
  File "I:\GIT\gambaryan-family-law\scripts\qa-browser-matrix.py", line 1193, in main
    with sync_playwright() as playwright:
         ~~~~~~~~~~~~~~~^^
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\sync_api\_context_manager.py", line 77, in __enter__
    dispatcher_fiber.switch()
    ~~~~~~~~~~~~~~~~~~~~~~~^^
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\sync_api\_context_manager.py", line 56, in greenlet_main
    self._loop.run_until_complete(self._connection.run_as_sync())
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\base_events.py", line 725, in run_until_complete
    return future.result()
           ~~~~~~~~~~~~~^^
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_connection.py", line 303, in run_as_sync
    await self.run()
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_connection.py", line 312, in run
    await self._transport.connect()
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_transport.py", line 133, in connect
    raise exc
  File "C:\Users\alext\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\LocalCache\local-packages\Python313\site-packages\playwright\_impl\_transport.py", line 120, in connect
    self._proc = await asyncio.create_subprocess_exec(
                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<9 lines>...
    )
    ^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\subprocess.py", line 224, in create_subprocess_exec
    transport, protocol = await loop.subprocess_exec(
                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    ...<3 lines>...
        stderr=stderr, **kwds)
        ^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\base_events.py", line 1812, in subprocess_exec
    transport = await self._make_subprocess_transport(
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        protocol, popen_args, False, stdin, stdout, stderr,
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        bufsize, **kwargs)
        ^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_events.py", line 401, in _make_subprocess_transport
    transp = _WindowsSubprocessTransport(self, protocol, args, shell,
                                         stdin, stdout, stderr, bufsize,
                                         waiter=waiter, extra=extra,
                                         **kwargs)
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\base_subprocess.py", line 40, in __init__
    self._start(args=args, shell=shell, stdin=stdin, stdout=stdout,
    ~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                stderr=stderr, bufsize=bufsize, **kwargs)
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_events.py", line 882, in _start
    self._proc = windows_utils.Popen(
                 ~~~~~~~~~~~~~~~~~~~^
        args, shell=shell, stdin=stdin, stdout=stdout, stderr=stderr,
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        bufsize=bufsize, **kwargs)
        ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_utils.py", line 144, in __init__
    stdin_rh, stdin_wh = pipe(overlapped=(False, True), duplex=True)
                         ~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Program Files\WindowsApps\PythonSoftwareFoundation.Python.3.13_3.13.3824.0_x64__qbz5n2kfra8p0\Lib\asyncio\windows_utils.py", line 70, in pipe
    h2 = _winapi.CreateFile(
        address, access, 0, _winapi.NULL, _winapi.OPEN_EXISTING,
        flags_and_attribs, _winapi.NULL)
PermissionError: [WinError 5] Access is denied
```

## Related

- [Карточка этапа](../tasks/codex/2026-09-06-final-dev4-stage-4.md)
- [Решение №25](../tasks/2026-09-06-final-dev4-spec.md)
- [Тексты владельца](../CONTENT-OWNER-REVISIONS-2026-09-06.md)
- [QA checklist](../FINAL-QA-CHECKLIST.md)


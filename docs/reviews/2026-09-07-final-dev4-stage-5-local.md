# Этап 5 final-dev4: локальная проверка

**Версия:** `FINAL-DEV4-STAGE-5-LOCAL v1.0.0`

**Дата:** `2026-09-07`

**Статус:** `SOURCE PASS / ALL-PREVIEWS + BROWSER BLOCKED / LIVE PENDING`

## Основание и границы

Ветка `codex/final-dev4-s5-facts`, база `a09f923`. Выполнено по карточке этапа 5 и UTF-8 заданию `codex-facts.md` из scratchpad владельца. Позднее задание отменяет зависимость от этапа 4, создание ветки/PR и деплой. Onest уже принят отдельной работой. Требуется один коммит `feat(final-dev4): fact cards title, rule, subtitle; section heading removed` и push.

Предпосылки проверены по git log и исполняемым контрактам: этапы 1–3 в истории (`93043e8`, `07f1143`, `de8b19e`); contract 1.3.1, 16 owner; final-dev4 есть в карте; NBSP_EXPECTED — per-alias словарь.

## Изменение

Строка 7: сняты надстрочник, H2 и линия секции; aria-label оставлен. Строки 8–10: три owner-карточки title → notch → sub. Тексты сверены с исходными строками владельца и CopyHTMLParser. Удалён CSS/JS аккордеона; плашка фактов и соседняя разметка сохранены.

| Контракт | Было | Стало |
|---|---|---|
| Client Copy | 1.3.1 / 16 owner | 1.4.0 / 18 owner |
| Review Numbered | 2.1.1 | 2.2.0 |
| Live readback | 1.2.1 | 1.3.0 |
| Dark Fact Cards | 1.0.4 | 2.0.0 |
| Browser runner | 1.4.3 после Onest | 1.4.3, не менялся |

`fact-900-v1` снят из copy/review контракта и source. Единственное исполняемое упоминание осталось намеренно в FACT_CARD_FORBIDDEN: readback должен отвергать старую карточку.

## Проверено

- Source, standalone и final-dev4: `verify_html` возвращает `[]` для каждого файла.
- 18 client ID + 18 owner ID в source; review builder независимо подтверждает тот же счёт.
- Новые drift-тесты защищают два заголовка/подзаголовка и заглавную «В»; unit 17 OK.
- Readback проверен offline с подменой fetch: свежая сборка PASS; отсутствие/дублирование каждого owner-маркера, каждый запрещённый маркер и старый CSS дают ошибки.
- NBSP: source до/после 15; final-dev4 15; NBSP_EXPECTED final-dev4 15.
- HTML до секции фактов и начиная с facts-bar побайтно после нормализации EOL совпадает с базой; JS вне снятого блока совпадает; font-serif и section-pad неизменны.
- `node --check site/app.js` — exit 0, пустой вывод.
- `git diff --name-only -- docs/sources site-addons functions` — пусто.
- Frozen SHA256: `5234cc5d9a3a4df991827ef02e8da46ae9c8b46d33c84cc33671e4b0465fa18e`.
- Первые owner-бейджи фактов в review: `['2.6', '2.10', '2.14']`.

## Не проверено и причины

- Google Fonts: build-font-variants завершился curl 7; v1 неполон, v2–v4 содержат предыдущие тексты. Общие copy/preview gates не проходят на этих производных. Гейты не ослаблялись, build вручную не исправлялся.
- Action Bar builder и browser matrix: Playwright не может создать subprocess pipe, `PermissionError: [WinError 5] Access is denied`. Код Action Bar не менялся.
- Browser matrix final-dev4: попытка завершилась до запуска браузера. Полная матрица не запускалась. PNG v2.0.0, computed font-size, вертикальная геометрия и визуальный clipping не подтверждены. Прежние PNG сохранены.
- Unit-тесты сначала упали на временных каталогах `I:\Temp`; повтор с TEMP/TMP=`I:\GIT\gambaryan-family-law\build\stage5-tmp` прошёл. В отчёте ниже финальный успешный вывод unit.
- Live readback final-dev3/production: сеть отказала WinError 10061; актуальный live-state и SHA не подтверждены. Деплой не выполнялся, реальный лид не отправлялся.
- Точная общая команда build-hero-variants из задания также пересобрала локальный final-dev3. Его addon/source и опубликованный alias не изменялись; это явно отражено, а не заявлена локальная байтовая изоляция.

## Дословный вывод CopyHTMLParser

```text
[('owner:fact-30-v1', '30+ лет профессиональный опыт в юриспруденции'), ('owner:fact-precedent-v1', 'Создание прецедента в международной судебной практике возвращение похищенного ребёнка при незарегистрированных родительских правах.'), ('owner:fact-900-v2', 'Автор более 900 экспертных статей В области уголовного, семейного и миграционного права, основанных на многолетнем опыте адвокатской деятельности')]
```

## Дословные выводы гейтов

### `python -B scripts/build-preview.py site/gambarian-standalone.html --standalone`

Exit 0.

```text
site/gambarian-standalone.html: 3.79 MB
внешних ссылок: 3 -> ['https://www.google.com/maps/search/?api=1&amp;query=%D7%A7%D7%A8%D7%9C%D7%99%D7%91%D7%9A+10%2C+%D7%AA%D7%9C+%D7%90%D7%91%D7%99%D7%91', 'https://www.google.com/maps/search/?api=1&amp;query=%D7%A7%D7%A8%D7%9C%D7%99%D7%91%D7%9A+10%2C+%D7%AA%D7%9C+%D7%90%D7%91%D7%99%D7%91', 'https://www.google.com/maps/search/?api=1&amp;query=%D7%A7%D7%A8%D7%9C%D7%99%D7%91%D7%9A+10%2C+%D7%AA%D7%9C+%D7%90%D7%91%D7%99%D7%91']
```

### `python -B scripts/build-font-variants.py`

Exit 1. Полный вывод повторного запуска сохранён ниже в секции Google Fonts.

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

Exit 1.

```text
FAIL CLIENT-COPY-VERIFIER v1.1.0 | 2026-09-07: 36 ошибок
- I:\GIT\gambaryan-family-law\build\font-variants\v2-lora-inter\index.html: отсутствует data-owner-copy-id='fact-30-v1'
- I:\GIT\gambaryan-family-law\build\font-variants\v2-lora-inter\index.html: отсутствует data-owner-copy-id='fact-900-v2'
- I:\GIT\gambaryan-family-law\build\font-variants\v2-lora-inter\index.html: отсутствует data-owner-copy-id='fact-precedent-v1'
- I:\GIT\gambaryan-family-law\build\font-variants\v2-lora-inter\index.html: неизвестный data-copy-id='owner:fact-900-v1'
- I:\GIT\gambaryan-family-law\build\font-variants\v2-lora-inter\index.html: неизвестный текст вне data-copy-id: '30+ лет'
- I:\GIT\gambaryan-family-law\build\font-variants\v2-lora-inter\index.html: неизвестный текст вне data-copy-id: 'Профессиональный опыт в юриспруденции'
- I:\GIT\gambaryan-family-law\build\font-variants\v2-lora-inter\gambarian-standalone.html: отсутствует data-owner-copy-id='fact-30-v1'
- I:\GIT\gambaryan-family-law\build\font-variants\v2-lora-inter\gambarian-standalone.html: отсутствует data-owner-copy-id='fact-900-v2'
- I:\GIT\gambaryan-family-law\build\font-variants\v2-lora-inter\gambarian-standalone.html: отсутствует data-owner-copy-id='fact-precedent-v1'
- I:\GIT\gambaryan-family-law\build\font-variants\v2-lora-inter\gambarian-standalone.html: неизвестный data-copy-id='owner:fact-900-v1'
- I:\GIT\gambaryan-family-law\build\font-variants\v2-lora-inter\gambarian-standalone.html: неизвестный текст вне data-copy-id: '30+ лет'
- I:\GIT\gambaryan-family-law\build\font-variants\v2-lora-inter\gambarian-standalone.html: неизвестный текст вне data-copy-id: 'Профессиональный опыт в юриспруденции'
- I:\GIT\gambaryan-family-law\build\font-variants\v3-literata-manrope\index.html: отсутствует data-owner-copy-id='fact-30-v1'
- I:\GIT\gambaryan-family-law\build\font-variants\v3-literata-manrope\index.html: отсутствует data-owner-copy-id='fact-900-v2'
- I:\GIT\gambaryan-family-law\build\font-variants\v3-literata-manrope\index.html: отсутствует data-owner-copy-id='fact-precedent-v1'
- I:\GIT\gambaryan-family-law\build\font-variants\v3-literata-manrope\index.html: неизвестный data-copy-id='owner:fact-900-v1'
- I:\GIT\gambaryan-family-law\build\font-variants\v3-literata-manrope\index.html: неизвестный текст вне data-copy-id: '30+ лет'
- I:\GIT\gambaryan-family-law\build\font-variants\v3-literata-manrope\index.html: неизвестный текст вне data-copy-id: 'Профессиональный опыт в юриспруденции'
- I:\GIT\gambaryan-family-law\build\font-variants\v3-literata-manrope\gambarian-standalone.html: отсутствует data-owner-copy-id='fact-30-v1'
- I:\GIT\gambaryan-family-law\build\font-variants\v3-literata-manrope\gambarian-standalone.html: отсутствует data-owner-copy-id='fact-900-v2'
- I:\GIT\gambaryan-family-law\build\font-variants\v3-literata-manrope\gambarian-standalone.html: отсутствует data-owner-copy-id='fact-precedent-v1'
- I:\GIT\gambaryan-family-law\build\font-variants\v3-literata-manrope\gambarian-standalone.html: неизвестный data-copy-id='owner:fact-900-v1'
- I:\GIT\gambaryan-family-law\build\font-variants\v3-literata-manrope\gambarian-standalone.html: неизвестный текст вне data-copy-id: '30+ лет'
- I:\GIT\gambaryan-family-law\build\font-variants\v3-literata-manrope\gambarian-standalone.html: неизвестный текст вне data-copy-id: 'Профессиональный опыт в юриспруденции'
- I:\GIT\gambaryan-family-law\build\font-variants\v4-ptserif-golos\index.html: отсутствует data-owner-copy-id='fact-30-v1'
- I:\GIT\gambaryan-family-law\build\font-variants\v4-ptserif-golos\index.html: отсутствует data-owner-copy-id='fact-900-v2'
- I:\GIT\gambaryan-family-law\build\font-variants\v4-ptserif-golos\index.html: отсутствует data-owner-copy-id='fact-precedent-v1'
- I:\GIT\gambaryan-family-law\build\font-variants\v4-ptserif-golos\index.html: неизвестный data-copy-id='owner:fact-900-v1'
- I:\GIT\gambaryan-family-law\build\font-variants\v4-ptserif-golos\index.html: неизвестный текст вне data-copy-id: '30+ лет'
- I:\GIT\gambaryan-family-law\build\font-variants\v4-ptserif-golos\index.html: неизвестный текст вне data-copy-id: 'Профессиональный опыт в юриспруденции'
- I:\GIT\gambaryan-family-law\build\font-variants\v4-ptserif-golos\gambarian-standalone.html: отсутствует data-owner-copy-id='fact-30-v1'
- I:\GIT\gambaryan-family-law\build\font-variants\v4-ptserif-golos\gambarian-standalone.html: отсутствует data-owner-copy-id='fact-900-v2'
- I:\GIT\gambaryan-family-law\build\font-variants\v4-ptserif-golos\gambarian-standalone.html: отсутствует data-owner-copy-id='fact-precedent-v1'
- I:\GIT\gambaryan-family-law\build\font-variants\v4-ptserif-golos\gambarian-standalone.html: неизвестный data-copy-id='owner:fact-900-v1'
- I:\GIT\gambaryan-family-law\build\font-variants\v4-ptserif-golos\gambarian-standalone.html: неизвестный текст вне data-copy-id: '30+ лет'
- I:\GIT\gambaryan-family-law\build\font-variants\v4-ptserif-golos\gambarian-standalone.html: неизвестный текст вне data-copy-id: 'Профессиональный опыт в юриспруденции'
```

### `python -m unittest discover -s scripts/tests`

Exit 0.

```text
.................
----------------------------------------------------------------------
Ran 17 tests in 0.662s

OK
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
warning: in the working copy of 'scripts/client_copy_contract.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/review_numbered_contract.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/tests/test_verify_client_copy.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'scripts/verify-live-previews.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'site/app.js', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'site/index.html', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'site/styles.css', LF will be replaced by CRLF the next time Git touches it
```

## Google Fonts — полный вывод повторного запуска

Команда: `python -B scripts/build-font-variants.py`, exit 1.

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

## Browser matrix — результат запуска

Команда: `python scripts/qa-browser-matrix.py http://127.0.0.1:8098/build/variants/final-dev4/ --target-name final-dev4`.
Дословная JSON-строка результата (последующий traceback повторяет WinError 5):

```text
{"error": "PermissionError:[WinError 5] Access is denied", "runner_version": "1.4.3", "status": "FAIL", "type": "fatal"}
```

## Live readback — дословный вывод

Команда: `python -B scripts/verify-live-previews.py --only final-dev3`, exit 1.

```text
FAIL  final-dev3
        final-dev3: страница недоступна (<urlopen error [WinError 10061] No connection could be made because the target machine actively refused it>)
FAIL  production (не должен измениться)
        production: недоступен (<urlopen error [WinError 10061] No connection could be made because the target machine actively refused it>)

FAIL LIVE-PREVIEW-READBACK v1.3.0: 2 расхождений
```

## Git

Создание коммита заблокировано средой. `git add` выполнен, но команда
`git commit -m 'feat(final-dev4): fact cards title, rule, subtitle; section heading removed'`
вернула:

```text
fatal: Unable to create 'I:/GIT/gambaryan-family-law/.git/index.lock': Permission denied
```

Нового хэша коммита нет. Push не выполнен: публиковать прежний HEAD вместо
незакоммиченного результата было бы неверно. PR и деплой не выполнялись.
Изменения сохранены в рабочей копии и индексе для коммита владельцем.

## Related

- [Карточка этапа 5](../tasks/codex/2026-09-06-final-dev4-stage-5.md)
- [Точные тексты владельца](../CONTENT-OWNER-REVISIONS-2026-09-06.md)
- [Контракт карточек 2.0.0](../tasks/2026-08-13-dark-fact-cards.md)
- [Финальный QA](../FINAL-QA-CHECKLIST.md)

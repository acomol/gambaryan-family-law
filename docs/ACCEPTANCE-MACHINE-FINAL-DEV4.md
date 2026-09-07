# Машинная приёмка final-dev4

**Версия:** `ACCEPTANCE v1.0.0`

**Дата:** `2026-09-07`

**SHA проверяемого дерева Git:** `e7a87de257278f55bcd168e881d9e6623f5c0206`

**Базовый коммит:** `656b631a3f73437e99484d85af27efbee0e23cac`

**Preview:** https://final-dev4.gambarian-landing.pages.dev/

## Область и доказательства

44 номерных требования (строка 6 исключена первоисточником) и 11 проверок,
разворачивающих заметки 94 и 96: всего 55 строк. Номер решения анкеты не равен
номеру строки: решение №29 о шрифте не относится к тексту строки 29 об имуществе.

Статус «выполнено» обозначает наличие реализации в проверяемом дереве, а не
успешную браузерную приёмку. Ожидания таблицы — критерии следующего запуска;
они не выдаются за полученный вывод. Ширины браузерных проверок — 1440×900 и
390×844. Текст проверяется независимо от ширины; составная строка с текстом
и оформлением запускает обе проверки. Это чек-лист требований владельца,
не полная релизная матрица этапа 8 с дополнительными ширинами 960/961.

Проверено в этой сессии:

- Исходный список сопоставлен с реестром решений и карточками этапов 1–8;
  затем с `site/index.html`, `site/styles.css`, `site/app.js`, адаптером Hero
  и собранным `build/variants/final-dev4/index.html`.
- Живой HTML получен успешным `curl -fsS -A gambarian-readback` в файл,
  проверен ненулевой размер: 54 260 байт. В нём подтверждены новые тексты,
  три заголовка кубиков, три ссылки карты, отсутствие колонки «Связь»,
  старый порядок услуг и восемь отдельных блоков «Ведёт».
  SHA-256 HTML: `c93e0b0579c6ccf6555406598c69399621c08f75389b9ed1371295538ec3bf7f`.
  Локальный HTML совпал; это подтверждает HTML, но не загрузку CSS, JS и фото.
- История подтверждает этапы 1 (`93043e8`), 2 (`07f1143`), 3 (`de8b19e`),
  шрифтовую часть 7 (`a09f923`), 5 (`656b631`). Код рабочего времени ограничен
  Hero/Action Bar; общий адаптер этапа 4 отсутствует. Услуги сохраняют
  прежний порядок и переключают целые панели; кадры адвокатов остаются
  `alexander-card-v2` и `yulia-card`; общий отступ и запас прецедента не заменены.
  Этапы 4, 6, фото/отступы 7 и финальная приёмка 8 не закрыты.
- Дословная текстовая часть исполняемого примера проверена отдельно на build
  и загруженном живом HTML: 29 из 30 проверок успешны; ожидаемая ошибка —
  строка 54. Синтаксис Python и 25 встроенных JS-функций проверен без браузера.
- **Строка 54 — подтверждённое текстовое расхождение:** первоисточник содержит
  «ребенка», в source, build и живом HTML — «ребёнка». Конечная точка снята.
  Проверка полного текста должна завершаться ошибкой; строка требует
  повторной работы этапа 2. Нормализация ниже не заменяет е/ё.
- Решение №29 хранится в [журнале правок владельца](CONTENT-OWNER-EDITS.md):
  Onest для всех заголовков, включая непомеченные, без курсива. В spec v0.3.0
  этой записи ещё нет. Поэтому прежнее требование двух семейств и вопросы
  №1–2 о выборе семейства здесь заменены поздним решением владельца.

**Не проверено в этой сессии:** вычисленные стили, геометрия, клики и жесты.
Запуск Python Playwright остановился до открытия Chromium: `PermissionError:
[WinError 5] Access is denied`. Исторический замер Onest из журнала не закрывает
новую геометрию после этапа 5. Ни одному браузерному ожиданию ниже не присвоен
фактический успешный результат. Публикация и отправка настоящих заявок не выполнялись.

## Как запускать

Команды ниже — для Bash / Git Bash из корня репозитория; нужны Python,
BeautifulSoup, Playwright с Chromium и GNU grep. Используются уже описанные
в проекте зависимости. `A` читает исполняемый пример из этого документа:
отдельный проверочный файл в репозитории не создаётся.

Для живой страницы:

```bash
export URL='https://final-dev4.gambarian-landing.pages.dev/'
export PAGE="${TMPDIR:-/tmp}/gambarian-acceptance-page.html"
curl -fsS -A gambarian-readback "$URL" -o "$PAGE" && test -s "$PAGE"
```

Продолжать только после кода 0 предыдущей команды. При ошибке загрузки не
использовать оставшийся файл от предыдущего запуска. Никаких хэш-конвейеров.

Для существующей локальной сборки вместо загрузки:

```bash
export PAGE='build/variants/final-dev4/index.html'
test -s "$PAGE"
export URL='http://127.0.0.1:8098/build/variants/final-dev4/'
# В отдельном терминале из корня репозитория:
python -m http.server 8098 --bind 127.0.0.1
```

В основном терминале определить команду:

```bash
A() {
  python -B -c 'from pathlib import Path; s=Path("docs/ACCEPTANCE-MACHINE-FINAL-DEV4.md").read_text(encoding="utf-8"); exec(compile(s.split("\n<!-- acceptance-python -->\n",1)[1].split("```python",1)[1].split("```",1)[0], "acceptance-example", "exec"))' "$@"
}
```

`A <номер>` — одна команда строки таблицы. `TEXT <номер>` означает: `grep -Fxq`
нашёл полный новый текст и `grep -Fq` не нашёл старый в соответствующем блоке.
HTML-сущности декодируются, `<br>` и пробельная разметка приводятся к пробелу;
буквы, регистр, пунктуация сохраняются. Это сравнение текста, не HTML-байтов.
Удаления проверяются вместе с сохранённым контекстом. Составные строки печатают
`TEXT`, затем `OK <номер> 1440` и `OK <номер> 390`. Ошибка assertion/браузера/grep
даёт ненулевой код. `MEASURE` — замер для человека, `DEFERRED` — критерий ещё
не определён; ни то ни другое не означает приёмку, итоговый код 2.

## Таблица требований

| № строки | Требование одной фразой | Команда | Ожидание | Ширина | Этап | Статус |
|---|---|---|---|---|---|---|
| 2 | Первый заголовок: Onest, 700, без курсива | `A 2` | `OK 2 1440`, `OK 2 390`; код 0 | 1440 и 390 | 7 (шрифты: 7a) | выполнено |
| 7 | Снять заголовок фактов, поле сверху/снизу 32/20 px | `A 7` | `OK 7 1440`, `OK 7 390`; код 0 | 1440 и 390 | 5 | выполнено |
| 8 | Кубик 1: «30+ лет»; общая иерархия трёх кубиков | `A 8` | `TEXT 8`; `OK 8 1440`, `OK 8 390`; код 0 | 1440 и 390 | 5 | выполнено |
| 9 | Кубик 2: полный заголовок и подзаголовок с точкой | `A 9` | `TEXT 9`; `OK 9 1440`, `OK 9 390`; код 0 | 1440 и 390 | 5 | выполнено |
| 10 | Кубик 3: новый заголовок; подзаголовок с заглавной «В» | `A 10` | `TEXT 10`; `OK 10 1440`, `OK 10 390`; код 0 | 1440 и 390 | 5 | выполнено |
| 11 | Лицензия в плашке без точки | `A 11` | `TEXT 11`; код 0 | разметка | 2 | выполнено |
| 13 | Новое написание адреса в плашке и остальных местах | `A 13` | `TEXT 13`; `OK 13 1440`, `OK 13 390`; код 0 | 1440 и 390 | 2, 3 | выполнено |
| 15 | Новый заголовок услуг дословно, Onest 700 | `A 15` | `TEXT 15`; `OK 15 1440`, `OK 15 390`; код 0 | 1440 и 390 | 2, 7a | выполнено |
| 16 | Убрать строку о 30 годах и бейдж с сердцем | `A 16` | `TEXT 16`; код 0 | разметка | 2 | выполнено |
| 18 | «Бракоразводные процессы», Onest 600 | `A 18` | `TEXT 18`; `OK 18 1440`, `OK 18 390`; код 0 | 1440 и 390 | 2, 7a | выполнено |
| 19 | Новый абзац о разводе дословно | `A 19` | `TEXT 19`; код 0 | разметка | 2 | выполнено |
| 20 | «Алименты»: Onest 600 | `A 20` | `OK 20 1440`, `OK 20 390`; код 0 | 1440 и 390 | 7 (шрифты: 7a) | выполнено |
| 23 | Заголовок темы детей: Onest 600 | `A 23` | `OK 23 1440`, `OK 23 390`; код 0 | 1440 и 390 | 7 (шрифты: 7a) | выполнено |
| 24 | Новый абзац о детях, без точки в конце | `A 24` | `TEXT 24`; код 0 | разметка | 2 | выполнено |
| 26 | Заголовок отцовства: запятая, перенос перед тестом ДНК, Onest 600 | `A 26` | `TEXT 26`; `OK 26 1440`, `OK 26 390`; код 0 | 1440 и 390 | 2, 7a | выполнено |
| 27 | Новый абзац об отцовстве дословно | `A 27` | `TEXT 27`; код 0 | разметка | 2 | выполнено |
| 28 | «Раздел имущества»: Onest 600 | `A 28` | `OK 28 1440`, `OK 28 390`; код 0 | 1440 и 390 | 7 (шрифты: 7a) | выполнено |
| 29 | Новый абзац об имуществе дословно | `A 29` | `TEXT 29`; код 0 | разметка | 2 | выполнено |
| 31 | «Семейная медиация и соглашение»: Onest 600 | `A 31` | `OK 31 1440`, `OK 31 390`; код 0 | 1440 и 390 | 7 (шрифты: 7a) | выполнено |
| 32 | Новый абзац о медиации дословно | `A 32` | `TEXT 32`; код 0 | разметка | 2 | выполнено |
| 34 | Новый абзац о брачном договоре дословно | `A 34` | `TEXT 34`; код 0 | разметка | 2 | выполнено |
| 36 | «Защита при угрозах и насилии»: Onest 600 | `A 36` | `OK 36 1440`, `OK 36 390`; код 0 | 1440 и 390 | 7 (шрифты: 7a) | выполнено |
| 37 | Новый абзац о защите дословно | `A 37` | `TEXT 37`; код 0 | разметка | 2 | выполнено |
| 40 | Юлия ведёт согласованные темы услуг | `A 40` | `DEFERRED 40 …`, код 2; после ответа нужен новый критерий с данными Юлии | разметка | 6 | отложено (ждёт ответа владельца) |
| 41 | Лицензия в каждом блоке «Ведёт» без точки | `A 41` | `TEXT 41`; код 0 | разметка | 2 | выполнено |
| 42 | Новый абзац «Ведёт»: юридическая сфера и языки | `A 42` | `TEXT 42`; код 0 | разметка | 2 | выполнено |
| 43 | Равная высота окна, центрирование текста, неподвижные «Ведёт»/кнопка, стрелки сбоку | `A 43` | `OK 43 1440`, `OK 43 390`; код 0 | 1440 и 390 | 6 | ждёт этапа 6 |
| 45 | Новый заголовок прецедента с точкой, Onest 600 | `A 45` | `TEXT 45`; `OK 45 1440`, `OK 45 390`; код 0 | 1440 и 390 | 2, 7a | выполнено |
| 46 | Новый абзац прецедента дословно | `A 46` | `TEXT 46`; код 0 | разметка | 2 | выполнено |
| 50 | Убрать лишний заголовок над адвокатами, сохранить черту и имена | `A 50` | `TEXT 50`; код 0 | разметка | 2 | выполнено |
| 51 | Имя Александра: Onest 600 | `A 51` | `OK 51 1440`, `OK 51 390`; код 0 | 1440 и 390 | 7 (шрифты: 7a) | выполнено |
| 53 | Опыт Александра без конечной точки | `A 53` | `TEXT 53`; код 0 | разметка | 2 | выполнено |
| 54 | Прецедент в карточке Александра: «ребенка», без точки | `A 54` | `TEXT 54`; сейчас ошибка: «ребёнка» вместо «ребенка»; код 0 после исправления | разметка | 2 | ждёт этапа 2 |
| 55 | Лицензия в карточке Александра без точки | `A 55` | `TEXT 55`; код 0 | разметка | 2 | выполнено |
| 57 | Убрать адрес из карточки Александра | `A 57` | `TEXT 57`; код 0 | разметка | 2 | выполнено |
| 59 | Имя Юлии: Onest 600 | `A 59` | `OK 59 1440`, `OK 59 390`; код 0 | 1440 и 390 | 7 (шрифты: 7a) | выполнено |
| 61 | Новая строка об опыте Юлии дословно | `A 61` | `TEXT 61`; код 0 | разметка | 2 | выполнено |
| 62 | Удалить обе версии строки об образовании (решение №23) | `A 62` | `TEXT 62`; код 0 | разметка | 2 | выполнено |
| 64 | Новая строка о направлениях работы Юлии дословно | `A 64` | `TEXT 64`; код 0 | разметка | 2 | выполнено |
| 66 | Кнопка Юлии: «Записаться на консультацию» | `A 66` | `TEXT 66`; код 0 | разметка | 2 | выполнено |
| 67 | Новое примечание под адвокатами: весь абзац по центру и полужирный | `A 67` | `TEXT 67`; `OK 67 1440`, `OK 67 390`; код 0 | 1440 и 390 | 2 | выполнено |
| 69 | Заголовок консультации: Onest 700 | `A 69` | `OK 69 1440`, `OK 69 390`; код 0 | 1440 и 390 | 7 (шрифты: 7a) | выполнено |
| 75 | Весь адресный ряд с иконкой открывает Google Maps отдельно | `A 75` | `OK 75 1440`, `OK 75 390`; код 0 | 1440 и 390 | 3 | выполнено |
| 92 | Авторская строка отдельно под юридическим текстом | `A 92` | `OK 92 1440`, `OK 92 390`; код 0 | 1440 и 390 | 3 | выполнено |
| 94.1 | Одно семейство Onest и иерархия толщиной по позднему решению №29 | `A 94.1` | `OK 94.1 1440`, `OK 94.1 390`; код 0 | 1440 и 390 | 7 (шрифты: 7a) | выполнено |
| 94.2 | Одинаковые рамки фото; верх головы и масштаб лица — дополнительно глазами | `A 94.2` | `MEASURE 94.2 1440 …` и `MEASURE 94.2 390 …`; без ошибки числовой части, затем код 2: рамки сравнить; голова ≤3px и масштаб лица требуют отдельной оценки | 1440 и 390 | 7 (шрифты: 7a) | ждёт этапа 7 |
| 94.3 | В закрытом состоянии ни одной доступной телефонной ссылки, возврат при открытии | `A 94.3` | `OK 94.3 1440`, `OK 94.3 390`; код 0 | 1440 и 390 | 4 | ждёт этапа 4 |
| 94.4 | Сократить пустоты: измерить границы, проверить 80/48 и запас прецедента 80 | `A 94.4` | `MEASURE 94.4 1440 …` и `MEASURE 94.4 390 …`; без ошибки числовой части, затем код 2: полный визуальный/согласованный критерий пока не закрыт | 1440 и 390 | 7 (шрифты: 7a) | ждёт этапа 7 |
| 94.5 | Одинаковые отступы включая первый экран и подвал; величины этих двух открыты | `A 94.5` | `MEASURE 94.5 1440 …` и `MEASURE 94.5 390 …`; без ошибки числовой части, затем код 2: полный визуальный/согласованный критерий пока не закрыт | 1440 и 390 | 7 (шрифты: 7a) | отложено (ждёт ответа владельца) |
| 94.6 | Новый порядок восьми тем, точек и соответствующих панелей | `A 94.6` | `OK 94.6 1440`, `OK 94.6 390`; код 0 | 1440 и 390 | 6 | ждёт этапа 6 |
| 96.1 | Убрать пустую стрелку раскрытия факта о прецеденте | `A 96.1` | `OK 96.1 390`; код 0 | 390 | 5 | выполнено |
| 96.2 | На телефоне три кубика с одинаковой иерархией и разделителями | `A 96.2` | `OK 96.2 390`; код 0 | 390 | 5 | выполнено |
| 96.3 | Меню услуг в один прокручиваемый ряд, активная тема видима | `A 96.3` | `OK 96.3 390`; код 0 | 390 | 6 | ждёт этапа 6 |
| 96.4 | Свайп меняет тему, «Ведёт» и кнопка остаются на месте | `A 96.4` | `OK 96.4 390`; код 0 | 390 | 6 | ждёт этапа 6 |
| 96.5 | Убрать дублирование «Связь», контакты у формы сохранить | `A 96.5` | `OK 96.5 1440`, `OK 96.5 390`; код 0 | 1440 и 390 | 3 | выполнено |

**Сводка:** 55 строк: 45 выполнено, 8 ждут этапа (2: 1; 4: 1; 6: 4; 7: 2), 2 отложены до ответа владельца. На обеих ширинах — 29 строк; только 390 — 4; разметка — 22. По исходным 46 строкам/блокам: 41 выполнено, 4 ждут (43, 54, 94, 96), 1 отложена (40). Составной блок 94 или 96 не считается выполненным, пока не закрыты все его подпункты.

Для строк 94.2/94.4 машинная часть ограничена измерением; полный критерий есть в человеческом списке. «Выполнено» у геометрических строк требует последующего запуска браузерной команды: текущая сессия его не подтверждает.


## Исполняемый пример

Проверки будущих этапов намеренно требуют нового поведения и сейчас должны
падать. Они не заменяют отсутствие реализации проверкой её старого состояния.
Для геометрии используются DOMRect и getComputedStyle в Playwright.
Селекторы будущего окна услуг взяты из карточки этапа 6.

<!-- acceptance-python -->
```python
import json
import os
import subprocess
import sys
from pathlib import Path
from bs4 import BeautifulSoup

def norm(value):
    return ' '.join(value.split())

def text_of(node):
    return norm(node.get_text(' ', strip=True))

rows = {}
for line in Path('docs/CONTENT-OWNER-REVISIONS-2026-09-06.md').read_text(encoding='utf-8').splitlines():
    cells = line.split('|')
    if len(cells) > 4 and cells[1].strip().isdigit():
        rows[int(cells[1])] = [cell.strip() for cell in cells[2:5]]

key = sys.argv[1]
page_file = Path(os.environ['PAGE'])
assert page_file.stat().st_size > 0, 'empty HTML'
soup = BeautifulSoup(page_file.read_text(encoding='utf-8'), 'html.parser')
assert soup.select_one('body.page--final-dev4'), 'wrong page / soft 404'

selectors = {
    11: '.facts-bar__item:first-child > span',
    13: '.facts-bar .map-link > span',
    15: '#services h2', 18: '#svc-panel-1 .svc-title',
    19: '#svc-panel-1 .svc-lead', 24: '#svc-panel-3 .svc-lead',
    26: '#svc-panel-4 .svc-title', 27: '#svc-panel-4 .svc-lead',
    29: '#svc-panel-5 .svc-lead', 32: '#svc-panel-6 .svc-lead',
    34: '#svc-panel-7 .svc-lead', 37: '#svc-panel-8 .svc-lead',
    41: '.svc-media__license', 42: '.svc-media > p',
    45: '.precedent-card__title', 46: '.precedent-card__text > p',
    53: '.attorney-card:first-child li:nth-child(1)',
    54: '.attorney-card:first-child li:nth-child(2)',
    55: '.attorney-card:first-child li:nth-child(3)',
    61: '.attorney-card:nth-child(2) li:first-child',
    64: '.attorney-card:nth-child(2) li:nth-child(3)',
    66: '.attorney-card:nth-child(2) a[href="#contact"]',
    67: '.attorneys__note',
}
# Панели адресуются по текущим ID; после этапа 6 — по названию вкладки.
topics = {18:'Развод',19:'Развод',24:'Дети',26:'Отцовство',27:'Отцовство',
          29:'Раздел имущества',32:'Медиация',34:'Брачный договор',37:'Защита при угрозах'}
for n, topic in topics.items():
    tab = next(t for t in soup.select('.svc-tab') if text_of(t) == topic)
    selectors[n] = '#' + tab['aria-controls'] + ' ' + selectors[n].split(' ', 1)[1]

def grep(pattern, actual, *, exact=False, absent=False):
    result = subprocess.run(['grep', '-Fxq' if exact else '-Fq', '--', pattern],
                            input=actual + '\n', encoding='utf-8')
    assert result.returncode in (0, 1), 'grep failed'
    assert result.returncode == (1 if absent else 0), repr(pattern)

def check_text(n):
    old, new, _ = rows[n]
    if n in (8, 9, 10):
        card = soup.select('.fact-card')[n - 8]
        parts = [norm(x) for x in new.replace('Заголовок:', '').replace('Подзаголовок:', '').split('<br>') if norm(x)]
        for css, wanted in zip(('.fact-card__title', '.fact-card__sub'), parts):
            grep(wanted, text_of(card.select_one(css)), exact=True)
        assert len(parts) == 2
        assert not card.select('.fact-card__head,.fact-card__num,.fact-card__unit,p')
        grep(norm(old), text_of(card), absent=True)
    elif n in (16, 50, 57, 62):
        if n == 16:
            assert not soup.select('.svc-eyebrow')
            scope = soup.select_one('#services')
            assert len(scope.select('.svc-title')) == 8
            # Исходник записал бейдж прописными: исключаем оба регистра.
            grep(norm(old).casefold(), text_of(scope).casefold(), absent=True)
        elif n == 50:
            assert not soup.select('#attorney .section-title')
            assert soup.select_one('#attorney .rule')
            assert len(soup.select('.attorney-card__name')) == 2
        elif n == 57:
            scope = soup.select_one('.attorney-card:first-child')
            for part in old.split('<br>'):
                grep(norm(part), text_of(scope), absent=True)
            assert scope.select_one('.attorney-card__name')
        else:
            scope = soup.select_one('.attorney-card:nth-child(2)')
            for phrase in (old, new):
                grep(norm(phrase), text_of(scope), absent=True)
            assert len(scope.select('li')) == 4
    else:
        new = old.removesuffix('.') if n in (53, 54, 55) else new
        old = norm(BeautifulSoup(old, 'html.parser').get_text(' '))
        new = norm(BeautifulSoup(new, 'html.parser').get_text(' '))
        nodes = soup.select(selectors[n])
        assert len(nodes) == (8 if n in (41, 42) and len(soup.select('.svc-media')) == 8 else 1)
        for node in nodes:
            actual = text_of(node)
            grep(new, actual, exact=True)
            grep(old, actual, absent=True)
    print('TEXT', n, flush=True)

fonts = {
    '2': ('.hero__title', '700'), '15': ('#services h2', '700'),
    '18': (selectors[18], '600'), '20': ('#svc-panel-2 .svc-title', '600'),
    '23': (selectors[24].replace('.svc-lead', '.svc-title'), '600'),
    '26': (selectors[26], '600'), '28': (selectors[29].replace('.svc-lead', '.svc-title'), '600'),
    '31': (selectors[32].replace('.svc-lead', '.svc-title'), '600'),
    '36': (selectors[37].replace('.svc-lead', '.svc-title'), '600'),
    '45': ('.precedent-card__title', '600'),
    '51': ('.attorney-card:first-child .attorney-card__name', '600'),
    '59': ('.attorney-card:nth-child(2) .attorney-card__name', '600'),
    '69': ('#contact h2', '700'),
}

text_keys = set(selectors) | {8, 9, 10, 16, 50, 57, 62}
if key.isdigit() and int(key) in text_keys:
    check_text(int(key))

browser_keys = set(fonts) | {'7','8','9','10','13','26','43','67','75','92',
                            '94.1','94.2','94.3','94.4','94.5','94.6',
                            '96.1','96.2','96.3','96.4','96.5'}
if key == '40':
    print('DEFERRED 40: нужны темы, лицензия, подпись и абзац Юлии; текущие персоны:',
          [text_of(e) for e in soup.select('.svc-media__name')])
    sys.exit(2)
if key not in browser_keys:
    assert key.isdigit() and int(key) in text_keys, 'unknown requirement'
    sys.exit(0)

from playwright.sync_api import sync_playwright

FACTS = '''() => {
 const cards=[...document.querySelectorAll('.fact-card')];
 if(cards.length!==3) return false;
 const sizes=[];
 for(const c of cards){
  const [t,n,s]=c.children;
  if(c.children.length!==3 || !t.matches('.fact-card__title') || !n.matches('.notch') || !s.matches('.fact-card__sub')) return false;
  const a=t.getBoundingClientRect(),b=n.getBoundingClientRect(),d=s.getBoundingClientRect();
  const x=getComputedStyle(t),y=getComputedStyle(s);
  if(!(a.bottom<=b.top && b.bottom<=d.top && b.height>=1 && b.width>0 && parseFloat(x.fontSize)>parseFloat(y.fontSize))) return false;
  if(x.whiteSpace==='nowrap' || c.scrollWidth>c.clientWidth || c.scrollHeight>c.clientHeight) return false;
  sizes.push([x.fontSize,y.fontSize]);
 }
 return new Set(sizes.map(x=>x[0])).size===1 && new Set(sizes.map(x=>x[1])).size===1 && !document.querySelector('.fact-card__toggle,.fact-card__chevron');
}'''

def rect(page, css):
    return page.locator(css).evaluate('e=>{const r=e.getBoundingClientRect();return [r.x+scrollX,r.y+scrollY,r.width,r.height]}')

def fixed(a, b, tolerance=1):
    assert all(abs(x-y)<=tolerance for x,y in zip(a,b)), (a,b)

def select_topic(page, index):
    page.locator('.svc-tab').nth(index).click()

def check_font(page, css, weight):
    node = page.locator(css)
    assert node.count() == 1
    panel = node.evaluate('e=>e.closest(".svc-card")?.id || null')
    if panel:
        page.locator('.svc-tab[aria-controls="' + panel + '"]').click()
    assert node.is_visible()
    node.scroll_into_view_if_needed()
    value = node.evaluate('e=>{const s=getComputedStyle(e);return [s.fontFamily,s.fontWeight,s.fontStyle,e.scrollWidth<=e.clientWidth]}')
    assert value[0].split(',')[0].strip('"\' ') == 'Onest' and value[1:] == [weight,'normal',True], value
    cdp = page.context.new_cdp_session(page)
    cdp.send('DOM.enable'); cdp.send('CSS.enable')
    root = cdp.send('DOM.getDocument')['root']['nodeId']
    nid = cdp.send('DOM.querySelector', {'nodeId':root,'selector':css})['nodeId']
    physical = cdp.send('CSS.getPlatformFontsForNode', {'nodeId':nid})['fonts']
    used = [f for f in physical if f['glyphCount']>0]
    assert used and all(f['isCustomFont'] and 'Onest' in f['familyName'] for f in used), used
    cdp.detach()

measurement = key in ('94.2','94.4','94.5')
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    try:
        for width in ([390] if key.startswith('96.') and key != '96.5' else [1440,390]):
            context = browser.new_context(viewport={'width':width,'height':900 if width==1440 else 844},
                                          has_touch=width==390, reduced_motion='reduce',
                                          user_agent='gambarian-readback')
            # Любая попытка отправки формы остаётся внутри браузерного мока.
            context.route('**/api/lead', lambda route: route.fulfill(status=503, content_type='application/json', body='{"ok":false}'))
            page = context.new_page()
            response = page.goto(os.environ['URL'], wait_until='networkidle')
            assert response and response.ok and page.locator('body.page--final-dev4').count()==1
            page.evaluate('document.fonts.ready')
            if key in fonts:
                check_font(page, *fonts[key])
            if key in ('8','9','10','96.1','96.2'):
                assert page.evaluate(FACTS)
            if key == '7':
                assert page.locator('.facts h2,.facts .eyebrow,.facts .rule').count()==0
                f,g,b = (rect(page,x) for x in ('.facts','.facts-grid','.facts-bar'))
                pad = 32 if width==1440 else 20
                assert abs(g[1]-f[1]-pad)<=1 and abs(f[1]+f[3]-b[1]-b[3]-pad)<=1
            if key in ('13','75','92','96.5'):
                # Реально существующий гейт: три ссылки, computed underline,
                # JSON-LD, удаление Связи и Range-перенос copyright.
                import importlib.util
                spec = importlib.util.spec_from_file_location('address_gate','scripts/verify-address-links.py')
                mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
                failures = page.evaluate(mod.DOM_CHECK, {'url':mod.MAP_URL,'label':mod.ARIA_LABEL})
                assert not failures, failures
                if key == '92':
                    grep(norm(rows[92][0]), norm(page.locator('.site-footer__legal').inner_text()), exact=True)
                if key == '13':
                    for link in page.locator('a.map-link').all():
                        actual=norm(link.inner_text())
                        for wanted in ('Прием — Тель-Авив / онлайн','Карлибах, 10'):
                            grep(wanted,actual)
                        for old in ('Приём — Тель-Авив / онлайн','Карлибах 10'):
                            grep(old,actual,absent=True)
                if key in ('13','75'):
                    for link in page.locator('a.map-link').all():
                        link.scroll_into_view_if_needed()
                        with page.expect_popup() as opened:
                            link.click()
                        popup = opened.value
                        popup.wait_for_url('https://www.google.com/maps**', wait_until='commit')
                        popup.close()
            if key == '26':
                assert page.locator(selectors[26]+' br').count()==1
                assert page.locator(selectors[26]).evaluate('e=>{const b=e.querySelector("br"),r=document.createRange();r.selectNodeContents(e);const a=[...r.getClientRects()].filter(x=>x.width>0);return !!b && new Set(a.map(x=>Math.round(x.top))).size>=2}')
            if key == '67':
                assert page.locator('.attorneys__note').evaluate('e=>{const s=getComputedStyle(e);return s.textAlign==="center" && +s.fontWeight>=700 && [...e.querySelectorAll("*")].every(x=>+getComputedStyle(x).fontWeight>=700)}')
            if key == '94.1':
                for css, weight in fonts.values():
                    check_font(page, css, weight)
                check_font(page, selectors[34].replace('.svc-lead','.svc-title'), '600')
                check_font(page, '.svc-card:not([hidden]) .svc-media__name' if page.locator('.svc-media').count()>1 else '.svc-media__name', '600')
                # Непомеченный заголовок успеха открывается только ответом мока.
                context.unroute('**/api/lead')
                context.route('**/api/lead', lambda route: route.fulfill(status=200, content_type='application/json', body='{"ok":true}'))
                page.locator('#lead-name').fill('Тест приёмки')
                page.locator('#lead-phone').fill('+972500000000')
                page.locator('.lead-form__submit').click()
                page.locator('.form-success').wait_for(state='visible')
                check_font(page,'.form-success__title','600')
                # Все реально отрисованные текстовые узлы, включая кубики/основной текст.
                cdp=context.new_cdp_session(page); cdp.send('DOM.enable'); cdp.send('CSS.enable')
                root=cdp.send('DOM.getDocument')['root']['nodeId']
                used=[]
                for nid in cdp.send('DOM.querySelectorAll',{'nodeId':root,'selector':'body *'})['nodeIds']:
                    used += [f for f in cdp.send('CSS.getPlatformFontsForNode',{'nodeId':nid})['fonts'] if f['glyphCount']>0]
                assert used and all(f['isCustomFont'] and 'Onest' in f['familyName'] for f in used)
                assert page.evaluate('()=>[...document.querySelectorAll("body *")].filter(e=>e.getClientRects().length).every(e=>getComputedStyle(e).fontStyle!=="italic")')
                cdp.detach()
            if key == '94.2':
                photos=page.locator('.attorney-photo')
                assert photos.count()==2
                measurements=[]
                for i, photo in enumerate(photos.all()):
                    photo.scroll_into_view_if_needed()
                    photo.evaluate('e=>e.decode()')
                    measurements.append(photo.evaluate('e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height,fit:getComputedStyle(e).objectFit,position:getComputedStyle(e).objectPosition,src:e.currentSrc}}'))
                assert abs(measurements[0]['width']-measurements[1]['width'])<=1
                assert abs(measurements[0]['height']-measurements[1]['height'])<=1
                print('MEASURE',key,width,json.dumps(measurements,ensure_ascii=False))
                # Равенство рамок НЕ доказывает равенство головы и масштаба лица.
            if key in ('94.4','94.5'):
                gaps=page.evaluate('()=>[...document.querySelectorAll("main > section,footer")].map(e=>{const r=e.getBoundingClientRect(),c=e.querySelector(".container")||e.firstElementChild,s=getComputedStyle(e),t=c?getComputedStyle(c):null;return {section:e.id||e.className,top:r.top+scrollY,height:r.height,padding:[s.paddingTop,s.paddingBottom],innerPadding:t?[t.paddingTop,t.paddingBottom]:null}})')
                print('MEASURE',key,width,json.dumps(gaps,ensure_ascii=False))
                if key=='94.4':
                    expect=80 if width==1440 else 48
                    for css in ('#services > .container','#attorney > .container','#contact > .container'):
                        assert page.locator(css).evaluate('(e,n)=>{const s=getComputedStyle(e);return Math.abs(parseFloat(s.paddingTop)-n)<=4 && Math.abs(parseFloat(s.paddingBottom)-n)<=4}',expect)
                    if width==1440:
                        assert page.locator('.precedent-card').evaluate('e=>Math.abs(parseFloat(getComputedStyle(e).marginTop)-80)<=4')
                # Hero/footer и субъективная оценка пустот требуют решения/глаз.
            if key == '94.6':
                wanted=['Развод','Алименты','Раздел имущества','Дети','Отцовство','Медиация','Брачный договор','Защита при угрозах']
                assert [norm(t) for t in page.locator('.svc-tab').all_text_contents()]==wanted
                assert page.locator('.svc-dot').evaluate_all('(es)=>es.map(e=>e.getAttribute("aria-label"))')==wanted
                for i,topic in enumerate(wanted):
                    select_topic(page,i)
                    panel_id=page.locator('.svc-tab').nth(i).get_attribute('aria-controls')
                    panel=page.locator('#'+panel_id)
                    assert panel.is_visible() and panel.get_attribute('aria-labelledby')==page.locator('.svc-tab').nth(i).get_attribute('id')
                    expected_titles=[rows[18][1],rows[20][0],rows[28][0],rows[23][0],norm(rows[26][1].replace('<br>',' ')),rows[31][0],rows[33][0],rows[36][0]]
                    assert norm(panel.locator('.svc-title').inner_text())==expected_titles[i]
                assert page.locator('.svc-tab').evaluate_all('(es)=>es.every((e,i)=>!i || e.getBoundingClientRect().top>es[i-1].getBoundingClientRect().top || e.getBoundingClientRect().left>es[i-1].getBoundingClientRect().left)')
            if key in ('43','96.3','96.4'):
                assert page.locator('.svc-stage').count()==1
                assert page.locator('.svc-media').count()==1 and page.locator('.svc-card__cta').count()==1
                media=rect(page,'.svc-media'); cta=rect(page,'.svc-card__cta')
                heights=[]
                for i in range(8):
                    select_topic(page,i)
                    fixed(media,rect(page,'.svc-media')); fixed(cta,rect(page,'.svc-card__cta'))
                    panel_id=page.locator('.svc-tab').nth(i).get_attribute('aria-controls')
                    heights.append(rect(page,'#'+panel_id)[3])
                    if width==390:
                        assert page.locator('.svc-tab').nth(i).evaluate('e=>{const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return r.left>=p.left-1 && r.right<=p.right+1}')
                assert max(heights)-min(heights)<=1
                if key=='43':
                    for i in range(8):
                        select_topic(page,i)
                        a=rect(page,'.svc-stage'); b=rect(page,'.svc-card:not([hidden]) .svc-card__main')
                        assert abs(a[1]+a[3]/2-b[1]-b[3]/2)<=2
                    prev=rect(page,'.svc-arrow[data-dir="prev"]'); nxt=rect(page,'.svc-arrow[data-dir="next"]')
                    assert min(prev[2:]+nxt[2:])>=44
                    if width==1440:
                        frame=rect(page,'.svc-frame')
                        assert prev[0]+prev[2]<=frame[0] and nxt[0]>=frame[0]+frame[2]
                        assert abs(prev[1]+prev[3]/2-frame[1]-frame[3]/2)<=2
                        assert abs(nxt[1]+nxt[3]/2-frame[1]-frame[3]/2)<=2
                    else:
                        title=rect(page,'.svc-card:not([hidden]) .svc-title')
                        frame=rect(page,'.svc-frame')
                        for arrow in (prev,nxt):
                            assert arrow[0]>=title[0]+title[2]-1 and arrow[0]+arrow[2]<=frame[0]+frame[2]+1
                            assert arrow[1]<title[1]+title[3] and arrow[1]+arrow[3]>title[1]
                if key=='96.3':
                    assert page.locator('.svc-tabs').evaluate('e=>{const a=[...e.querySelectorAll(".svc-tab")],s=getComputedStyle(e);return new Set(a.map(t=>Math.round(t.getBoundingClientRect().top))).size===1 && e.scrollWidth>e.clientWidth && ["auto","scroll"].includes(s.overflowX) && s.maskImage!=="none"}')
                    assert rect(page,'#services')[3]<=1220
                if key=='96.4':
                    select_topic(page,0)
                    assert page.locator('.svc-stage').evaluate('e=>getComputedStyle(e).touchAction')=='pan-y'
                    def swipe(dx,dy=0):
                        page.locator('.svc-stage').evaluate('(e,d)=>{const o={bubbles:true,pointerId:1,pointerType:"touch",isPrimary:true,clientX:200,clientY:200};e.dispatchEvent(new PointerEvent("pointerdown",o));e.dispatchEvent(new PointerEvent("pointermove",{...o,clientX:200+d[0],clientY:200+d[1]}));e.dispatchEvent(new PointerEvent("pointerup",{...o,clientX:200+d[0],clientY:200+d[1]}));}',[dx,dy])
                        fixed(media,rect(page,'.svc-media')); fixed(cta,rect(page,'.svc-card__cta'))
                        return page.locator('.svc-tab').evaluate_all('(es)=>es.findIndex(e=>e.getAttribute("aria-selected")==="true")')
                    result=[swipe(-80),swipe(80),swipe(80),swipe(0,100),swipe(-20)]
                    select_topic(page,7); result.append(swipe(-80))
                    assert result==[1,0,0,0,0,7], result
                    # Это обработчики Pointer Events, нативный жест проверяет владелец.
            if key=='94.3':
                toggle=page.locator('[data-business-demo]')
                assert toggle.count()==1
                def business(state):
                    if page.locator('.mobile-bar').get_attribute('data-business-state')!=state:
                        toggle.evaluate('e=>e.click()')
                    page.wait_for_function('(s)=>document.querySelector(".mobile-bar").dataset.businessState===s',arg=state)
                business('open')
                if width==390:
                    page.locator('.nav-burger').click()
                page.locator('#lead-name').fill('Тест приёмки')
                page.locator('#lead-phone').fill('+972500000000')
                # Открытое меню закрываем только для нажатия кнопки формы.
                if width==390 and page.locator('.nav-burger').get_attribute('aria-expanded')=='true':
                    page.locator('.nav-burger').click()
                page.locator('.lead-form__submit').click()
                page.locator('.lead-form__error-contact').wait_for(state='visible')
                if width==390:
                    page.locator('.nav-burger').click()
                css='a[href^="tel:"], .lead-form__error-contact'
                before=page.locator(css).evaluate_all('(es)=>es.map(e=>e.outerHTML)')
                business('closed')
                assert page.locator('a[href^="tel:"]').evaluate_all('(es)=>es.filter(e=>!e.closest("[hidden]") && e.getClientRects().length && getComputedStyle(e).visibility!=="hidden").length')==0
                assert page.locator('a[href^="tel:"]').evaluate_all('(es)=>es.filter(e=>!e.closest("[hidden]")).length')==0
                assert page.locator('.lead-form__error-contact').inner_text().find('позвоните')<0
                assert page.locator('.lead-form__error-contact a[href*="wa.me"]').count()>=1
                business('open')
                assert page.locator(css).evaluate_all('(es)=>es.map(e=>e.outerHTML)')==before
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'horizontal overflow'
            if not measurement:
                print('OK',key,width,flush=True)
            context.close()
    finally:
        browser.close()
if measurement:
    print('DEFERRED',key,'требуется визуальная оценка или решение владельца')
    sys.exit(2)
```

## Ограничения покрытия

- 94.2: DOMRect измеряет рамки фотографий, но не верх головы и масштаб лица.
  Приёмка головы ≤3px требует отдельного измерения по самим изображениям;
  владелец оценивает одинаковость кадров и масштаба. Вывод `MEASURE` не закрывает строку.
- 94.4: числовая часть проверяет согласованные умолчания 80/48 и запас 80,
  но «лишние пустоты» внутри каждого блока оцениваются глазами. Поэтому
  даже после успешных числовых assertions команда не выдаёт полный успех.
- 94.5: для включения первого экрана и подвала нет согласованных величин.
  Команда только измеряет; исключение этих секций не равно выполнению требования.
- 40: невозможно определить темы, лицензию и подпись Юлии командой или по фото
  без ответа владельца. Само требование покрыто отложенным пунктом обоих списков.
- 96.4: синтетический PointerEvent проверяет обработчик и неподвижность, но
  не доказывает удобство настоящего свайпа и вертикальной прокрутки на телефоне.
- Все 46 исходных строк/блоков имеют маршрут проверки. Непокрытых ничем строк нет;
  машинные ограничения выше закрываются человеческой проверкой либо явно
  отложенным решением, а не фиктивной отметкой «выполнено».

## Related

- [Дословные правки владельца](CONTENT-OWNER-REVISIONS-2026-09-06.md)
- [Спецификация и решения](tasks/2026-09-06-final-dev4-spec.md)
- [Позднее решение об Onest](CONTENT-OWNER-EDITS.md)
- [Карточки этапов](tasks/codex/README.md)
- [Черновая матрица — историческая заготовка](reviews/codex-loop/2026-09-07-acceptance-matrix-draft.md)
- [Чек-лист владельца](ACCEPTANCE-OWNER-FINAL-DEV4.md)

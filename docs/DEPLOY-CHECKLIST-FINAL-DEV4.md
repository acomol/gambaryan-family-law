# Чек-лист публикации final-dev4

**Версия:** `DEPLOY-CHECKLIST v1.0.0` · **Дата:** `2026-09-07`

Применяется к каждой публикации Preview в цикле final-dev4. Задача одна: выложить `final-dev4`
и доказать, что `final-dev3` и боевой адрес не изменились.

Эталонные значения на 2026-09-07 09:51, сняты до первой публикации цикла:

| Адрес | SHA-256 (начало) | Размер |
|---|---|---|
| `final-dev3.gambarian-landing.pages.dev` | `525f19125b12b216` | 58 592 байта |
| `gambarian-landing.pages.dev` (боевой) | `656cbcd063595289` | 52 872 байта |
| `final-dev4.gambarian-landing.pages.dev` | не существует до первой публикации | — |

## 1. До публикации

| # | Проверка | Команда | Ожидание |
|---|---|---|---|
| 1.1 | Ветка запушена | `git ls-remote --heads origin <ветка>` | одна строка с SHA |
| 1.2 | CI на этой ветке зелёный | `gh run list --branch <ветка> --limit 1` | `completed success` на том же SHA |
| 1.3 | Рабочее дерево чистое | `git status --porcelain` | пусто |
| 1.4 | Эталон снят заново | команда из раздела 4 для dev3 и боевого | хэши совпадают с таблицей выше |

Если 1.4 не совпал — **не публиковать**: значит адрес уже кто-то менял, и после публикации
доказать неизменность будет нечем.

## 2. Запуск

Actions → **Deploy Previews** → Run workflow:

| Поле | Значение | Почему именно так |
|---|---|---|
| Use workflow from | ветка этапа, например `codex/final-dev4-s1-s3-texts` | сборка и гейты берутся из неё |
| `only` | `final-dev4` | **пустое поле публикует все двенадцать адресов и перезапишет `final-dev3`** |

Файл workflow всегда берётся из `main` — это требование `workflow_dispatch`, на выбор ветки сборки
не влияет.

Сразу после запуска убедиться, что прогон появился и поле передано:

```
gh run list --workflow "Deploy Previews" --limit 1
gh run view <id> --json displayTitle,event,status
```

Прогона нет в списке — значит workflow не стартовал. Частые причины: не нажата кнопка Run,
выбрана не та ветка, нет прав на запуск.

## 3. Во время прогона

```
gh run watch <id>
gh run view <id> --log | grep -A3 "Live readback"
```

Шаг `Check token scope` или `Verify before publishing` упал — **стоп**, лог в отчёт, ничего не
перезапускать вслепую.

## 4. После публикации — доказательство

Ключевая деталь: `curl … | sha256sum` **не годится**. Если адрес недоступен, curl отдаёт пустой
поток, sha256sum считает хэш пустоты `e3b0c442…b855`, конвейер завершается нулём, и два таких
«совпавших» хэша не доказывают ничего. Проверено на закрытом порту.

Правильная форма — с `-f` и проверкой непустого файла:

```
curl -fsS -A gambarian-readback https://final-dev3.gambarian-landing.pages.dev/ -o dev3.after && test -s dev3.after && sha256sum dev3.after
curl -fsS -A gambarian-readback https://gambarian-landing.pages.dev/ -o prod.after && test -s prod.after && sha256sum prod.after
curl -fsS -A gambarian-readback https://final-dev4.gambarian-landing.pages.dev/ -o dev4.after && test -s dev4.after && sha256sum dev4.after
```

| # | Проверка | Ожидание |
|---|---|---|
| 4.1 | Хэш `final-dev3` | равен `525f1912…`, размер 58 592 |
| 4.2 | Хэш боевого адреса | равен `656cbcd0…`, размер 52 872 |
| 4.3 | `final-dev4` отвечает | HTTP 200, `text/html`, непустой файл |
| 4.4 | Хэш `final-dev4` равен локальной сборке | `sha256sum build/variants/final-dev4/index.html` совпадает |
| 4.5 | Адрес закрыт от индексации | `grep -c 'content="noindex"' dev4.after` → ≥1 |
| 4.6 | Маркер версии на месте | `grep -c 'FINAL-DEV4-DESIGN v' dev4.after` → 1 |
| 4.7 | Класс варианта на месте | `grep -c 'page--final-dev4' dev4.after` → 1 |
| 4.8 | Общий гейт живых Preview | `python -B scripts/verify-live-previews.py --only final-dev4` → PASS |

Пункты 4.6 и 4.7 обязательны: без них содержимое `final-dev3`, выложенное по адресу `final-dev4`,
прошло бы все остальные проверки.

## 5. Содержательная проверка правок этапов 1–3

| # | Что смотрим | Команда по `dev4.after` | Ожидание |
|---|---|---|---|
| 5.1 | Новый текст услуг | `grep -c 'Развод по взаимному согласию и представительство'` | 1 |
| 5.2 | Новый текст панели «Развод» | `grep -c 'Когда соглашение между супругами невозможно'` | 1 |
| 5.3 | Адрес с запятой | `grep -c 'Карлибах,'` | ≥1 |
| 5.4 | Старая форма адреса ушла | `grep -c 'Карлибах 10'` | 0 |
| 5.5 | Лицензия без точки | `grep -c 'лицензия № 30178\.'` | 0 |
| 5.6 | Ссылки на карту | `grep -c 'data-action="map_click"'` | 3 |
| 5.7 | Колонка «Связь» убрана из подвала | `grep -c 'site-footer__label">Связь'` | 0 |
| 5.8 | Защищённые тире | `grep -o '&nbsp;—' dev4.after \| wc -l` | совпадает с `NBSP_EXPECTED['final-dev4']` |

## 6. Если dev3 или боевой адрес изменились

1. Остановиться, ничего больше не публиковать.
2. Зафиксировать: id прогона, значение поля `only`, новые хэши.
3. Восстановление: опубликовать прежний коммит на тот же адрес тем же workflow с `only` для
   пострадавшего алиаса. Содержимое `final-dev3` берётся из git, отдельной копии дерева нет.
4. Записать инцидент в `docs/reviews/` — иначе причина забудется к следующему циклу.

## Related

- [Модель работы с Codex](CODEX-WORKING-MODEL.md)
- [Публикация Preview](DEPLOY.md)
- [Цикл проверок на Codex](CODEX-VERIFICATION-LOOP.md)
- [Карточки этапов](tasks/codex/README.md)

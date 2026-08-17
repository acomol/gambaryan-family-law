# Куда публикуется сайт

**Версия документа:** `1.4.0`
**Обновлено:** `2026-08-16`

Читать **до** любых попыток развернуть проект. Отдельная площадка не
заводится: если развёртывание уже существует — обновляется оно.

## Боевая площадка

| | |
|---|---|
| Временный адрес | **https://gambarian-landing.pages.dev/** |
| Платформа | Cloudflare Pages |
| Что публикуется | папка `site/` + корневая `functions/` (`/api/lead`) |
| Боевой домен клиента | www.gambarian.com — **ещё не подключён** |

Пока сайт живёт на `pages.dev`, в `site/index.html` стоит
`<meta name="robots" content="noindex">`: боевой домен продвигается по
SEO, и индексация временного адреса создала бы дубль контента. **Снять
noindex только при переезде на настоящий домен.**

## Как обновить

Площадка **не** подключена к этому репозиторию: папки `site/` в ветке
`main` нет, значит Cloudflare не собирает её из git — публикация идёт
прямой загрузкой. Merge pull request сайт **не** обновляет.

Обновление — одной командой на своей машине, из корня репозитория.

### Albato lead hook

`functions/api/lead.js` читает URL только из encrypted secret
`ALBATO_WEBHOOK_URL`. Значение не хранится в репозитории и не должно попадать
в HTML/JS. В Cloudflare Pages добавить **разные** значения в Production и
Preview: Settings → Variables and Secrets → Add → Encrypt. Для локального
`wrangler pages dev site` используется `.dev.vars`; файл игнорируется Git.

После изменения secret нужен новый deployment. Технический readback маршрута:
`GET /api/lead` возвращает `405` и `Allow: POST`. Полная приёмка требует
контрольный POST, Albato Automation Log и readback конечной записи; контракт и
версия описаны в `docs/LEAD-WEBHOOK-CONTRACT.md`.

**Windows / PowerShell** (основной путь у владельца):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\deploy-pages.ps1
```

Скрипт берёт токен из `C:\Users\alext\credentials\cf-adfix-token.txt`,
проверяет его на ASCII и на активность, **сам находит нужный аккаунт**
среди двух и отказывается работать, если проекта там нет (чтобы не
создать дубликат). После публикации читает живой адрес дважды подряд —
первый запрос может попасть на старый эдж.

**macOS / Linux:**

```bash
bash scripts/deploy-pages.sh
```

Эта версия входит через браузер (`wrangler login`), токен не нужен.

⚠️ В PowerShell `curl` — это псевдоним `Invoke-WebRequest`, он не
понимает флаги настоящего curl (`-H`, `-sS`). Либо `Invoke-RestMethod`
с `-Headers @{Authorization="Bearer $t"}`, либо явно `curl.exe`.

Если удобнее вручную:

```bash
npx wrangler login                                    # один раз
npx --yes wrangler@4.120.0 pages deploy site \
  --project-name=gambarian-landing \
  --branch=main
```

`--branch` обязателен: без него Wrangler берёт текущую Git-ветку и вместо
production может молча создать Preview. Если production branch проекта
изменится с `main`, сначала получить новое значение через Cloudflare API и
обновить команду.

В автоматической среде вместо входа через браузер — токен с правом
«Cloudflare Pages: Edit» в `CLOUDFLARE_API_TOKEN` и `CLOUDFLARE_ACCOUNT_ID`.

## Preview: все одиннадцать одной командой

Боевой адрес и Preview публикуются разными командами. `deploy-pages.ps1`
и `deploy-pages.sh` умеют только боевой (`--branch=main`). Для Preview:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\deploy-previews.ps1
```

```bash
bash scripts/deploy-previews.sh          # macOS/Linux, или Windows с WSL
```

Один адрес: `-Only final-dev3` (PowerShell) или `final-dev3` аргументом (bash).

Alias и каталоги берутся из `scripts/client-preview-map.json`, а не из
памяти: опечатка в alias создаёт лишний живой адрес. Перед публикацией
скрипт проверяет, что все каталоги собраны — `build/` не в git, и пустой
каталог уехал бы на живой адрес как пустой сайт.

После публикации — обязательный readback (exit code wrangler за
доказательство не принимается, см. OPEN в `docs/FINAL-QA-CHECKLIST.md`):

```bash
python -B scripts/verify-live-previews.py
```

Он читает байты, которые реально отдаёт Cloudflare, по каждому из 11
адресов и отдельно проверяет, что боевой адрес **не** изменился.

### Аккаунтов два — не перепутать

Из runbook соседнего проекта (`clients/luxemed/New Lending/docs/
RUNBOOK-CLOUDFLARE-DEPLOY.md` в ADFIX OS, коммит `38ff6919`; ловушка
срабатывала дважды — 2026-05-13 и 2026-07-27):

| Назначение | Account ID | Логин | Файл с токеном (машина владельца) |
|---|---|---|---|
| Клиентские лендинги | `4799e9f76c607e036c430a148d06a80b` | `alex@adfix.co.il` | `C:\Users\alext\credentials\cf-adfix-token.txt` |
| Отчёты клиентам | `b2ca16eaaad2ec903cb8da6798a165bc` | `alex@digitalhook.co.il` | `C:\Users\alext\credentials\cf-digitalhook-reports-token.txt` |

🔴 Переменная окружения `CLOUDFLARE_API_TOKEN` на машине владельца
указывает на аккаунт **отчётов**, не на лендинги. Взять её «по
умолчанию» — значит диагностировать не тот токен: 401/403 от чужого
аккаунта выглядят точно так же, как «токен протух».

`gambarian-landing` подтверждён живым API 2026-08-13 в аккаунте клиентских
лендингов `4799e9f7…`; project — Direct Upload, production branch — `main`.
Перед каждым новым deploy всё равно повторять read-only проверку:

```bash
curl -sS "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/pages/projects" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | grep -o '"name":"[^"]*"'
```

Не создавать проект вслепую: при неверном аккаунте wrangler молча
заводит дубликат, не привязанный к домену (инцидент 2026-05-13).

### Ограничение по IP — самая незаметная причина отказа

Проверено 2026-08-04 живым API. Токен из
`C:\Users\alext\credentials\cf-adfix-token.txt` имеет **Client IP
Address Filtering**: он действителен только из сети владельца.

Как это выглядит из облачной сессии:

| Запрос | Ответ |
|---|---|
| `/user/tokens/verify` | `success: true`, `status: active` — **токен выглядит рабочим** |
| `/accounts` | `Cannot use the access token from location: <IP>` |
| `/accounts/<id>/pages/projects` | просто `Authentication error` (код 10000) |

🔴 Ловушка: на большинстве эндпоинтов ограничение по IP отдаётся как
безликий `Authentication error` — неотличимо от «нет прав» и от
«протух». Настоящая причина видна **только** на `/accounts`. Поэтому при
любом `Authentication error` первым делом дёргать `/accounts` и читать
текст ошибки целиком, а не гадать по симптому.

Следствие: этим токеном можно публиковать **только с машины владельца**.
Чтобы агент публиковал из облачных сессий, нужен токен, у которого поле
Client IP оставлено пустым (как и предписывает runbook Assuta).

### Почему у Assuta деплой из контейнера работает, а здесь нет

Вопрос возникает регулярно, поэтому ответ здесь.

Проект `assuta-dev` **подключён к репозиторию** `digitalhook-os-`: Cloudflare
сам собирает каждую ветку после push, ключи в контейнере не нужны вообще
(`clients/luxemed/New Lending/README.md`: «push в ветку → CF Pages собирает →
live ~60 сек»). Проверено 2026-08-16: коммит `74a6d80`, отправленный из
облачной сессии, собрался там автоматически.

`gambarian-landing` создан как **Direct Upload**, и это не переключается:

> Currently, you cannot add Git integration to existing Pages applications.
> If you have already deployed your application, you need to create a new
> Pages application in order to add Git integration to it.
> — [Cloudflare Pages docs](https://developers.cloudflare.com/pages/configuration/git-integration/)

Следствие — два варианта, третьего нет:

| | Что делать | Цена |
|---|---|---|
| **A. Токен** | Pages:Edit на аккаунт лендингов, Client IP пустой, в GitHub Secrets | все 11 адресов сохраняются; один разовый шаг владельца |
| **B. Новый git-проект** | создать новый Pages-проект с подключением к `gambaryan-family-law` | деплой навсегда автоматический и без ключей, но адреса меняются; 11 вариантов удобнее отдавать подпутями одного адреса, а не поддоменами |

**Статус:** ВЕРИФИЦИРОВАНО (официальная документация + наблюдаемое поведение
`assuta-dev`).

### Почему агент может задеплоить не из всякой сессии

Раньше публикация выполнялась агентом напрямую: сессии шли **на машине
владельца**, где `CLOUDFLARE_API_TOKEN` задан как пользовательская
переменная Windows (след — `clients/vika_med/linkcare-mvp-kp/
ERRORS-AND-LESSONS.md` в репозитории ADFIX OS, там разбирается случай с
кириллическими символами внутри этого токена).

Сессии Claude Code on the web идут **в облачном контейнере**: окружение
создаётся с нуля при старте, переменных пользователя в нём нет
(`env | grep -i cloudflare` → пусто), сохранённой сессии wrangler тоже
(`wrangler whoami` → «You are not authenticated»). Поэтому из такой
сессии деплой в аккаунт владельца невозможен — это не отказ агента, а
отсутствие ключа.

Чтобы агент снова мог публиковать сам из облачных сессий, достаточно
добавить `CLOUDFLARE_API_TOKEN` и `CLOUDFLARE_ACCOUNT_ID` в переменные
окружения среды Claude Code (настройки environment, не в репозиторий —
в git токены не коммитить).

Мастер-снимок `site/assets/hero-duo-2623w.*.jpg` — вход для скриптов
обработки фото, в браузере он не нужен. При желании его можно исключить
из загрузки, но на вес площадки он влияет незначительно.

## Вся страница одним файлом

`site/gambarian-standalone.html` — тот же лендинг, собранный в один
самодостаточный документ: картинки, шрифты, стили и скрипт вшиты как
data-URI, внешних запросов 0. Нужен там, где нет сборки из папки: показать
страницу ссылкой, открыть двойным кликом, приложить к письму.

```bash
python scripts/build-preview.py site/gambarian-standalone.html --standalone
```

Без `--standalone` скрипт отдаёт **фрагмент** без `doctype`/`head`/`body` —
такой формат ждёт смотрелка artifact, она сама оборачивает содержимое в
скелет документа. Живое превью в этом формате:
https://claude.ai/code/artifact/f6f44336-a84c-4122-a74b-65c47e53b0c0

Файл — производный от `site/`; менять его руками нельзя, только
пересобирать после правок исходников.

## Проверка после публикации («сделано» = доказано)

`scripts/deploy-pages.sh` проверяет живой адрес сам: читает страницу и
сверяет шесть признаков свежей версии (цифра опыта, шрифт Onest,
мобильный кроп hero, новый портрет, отсутствие старой цифры и сломанных
тегов).

Плюс глазами на реальном телефоне: первый экран (обе кнопки видны),
карточки фактов раскрываются по тапу, шрифт один и тот же во всей
странице.

## Временное превью без доступа к аккаунту

Если нужен живой адрес, а токена под рукой нет, wrangler умеет
разворачивать на временный аккаунт — отдельный одноразовый адрес,
аккаунт владельца не затрагивается:

```bash
mkdir -p /tmp/dep && cp -r site /tmp/dep/site
cat > /tmp/dep/wrangler.jsonc <<'EOF'
{ "name": "gambaryan-preview", "compatibility_date": "2026-08-01",
  "assets": { "directory": "./site" } }
EOF
cd /tmp/dep && npx wrangler deploy --temporary
```

Ограничения, которые надо знать заранее:

- адрес **временный**, живёт недолго — для показа и проверки, не для
  клиента;
- на такие адреса Cloudflare вешает антибот-проверку, поэтому `curl` и
  headless-браузер получают HTTP 403 `cf-mitigated: challenge`.
  Автоматический live-readback по нему невозможен — проверять руками
  из обычного браузера.

## Чего здесь нет

Vercel и GitHub Pages для этого проекта **не используются**. Оба
рассматривались 2026-08-04 и отброшены: площадка уже была. См.
`docs/ERRORS.md`, раздел «Пошёл разворачивать заново вместо существующей
площадки».

<!-- AUTO-GENERATED from AGENTS.md — do not edit directly.
     Run `bash scripts/sync-agent-rules.sh` to regenerate. -->

# Gambarian Family Law Landing Page

**Версия правил:** `PROJECT-AGENT-RULES v1.3.0`

**Обновлено:** `2026-09-06`

## What This Is

Статичный лендинг адвокатского бюро «Гамбарян и партнёры». Боевой источник
находится в `site/`; клиентские варианты всегда генерируются из него скриптами,
а не редактируются внутри `build/` вручную. Production и Preview aliases из
исполняемой карты публикуются в существующий Cloudflare Pages project
`gambarian-landing`.

## Tech Stack

- **Runtime:** статичные HTML/CSS/JavaScript в `site/`.
- **Preview builders:** Python; производные попадают в `build/variants/*` и
  `build/font-variants/*`.
- **Общая мобильная панель:** versioned addon в `site-addons/action-bar/`,
  который каждый builder устанавливает из единственного источника.
- **Lead API:** Cloudflare Pages Function `functions/api/lead.js`; webhook URL
  читается только из encrypted secret `ALBATO_WEBHOOK_URL`.
- **Deployment:** Cloudflare Pages project `gambarian-landing`; для production
  используется явный `--branch=main`, для Preview — явный branch alias.

В репозитории сохранён унаследованный Next.js 16 / React 19 / Tailwind каркас.
Он проходит `npm run check`, но не является production-сборкой лендинга и не
публикуется в Cloudflare Pages.

## Commands

- `python -m pip install -r requirements-build.txt` — установить зависимости
  генераторов и browser QA.
- `python -m playwright install chromium` — установить Chromium для Playwright.
- `python -B scripts/build-hero-variants.py` — собрать Hero-варианты, включая
  отдельный `final-dev1`.
- `python -B scripts/build-font-variants.py` — собрать четыре шрифтовых Preview.
- `python -B scripts/build-action-bar.py` — собрать канонический Action Bar
  artifact (`final-dev` и `action-bar` используют один каталог).
- `python -B scripts/build-review-numbered.py` — собрать вариант с нумерацией
  клиентских текстов.
- `python -B scripts/verify-client-previews.py` — проверить все собранные
  Preview из исполняемой карты.
- `python -B scripts/verify-client-copy.py` — проверить frozen-копию
  клиентского документа, каждый использованный client/owner-approved блок и
  разрешённый служебный текст в source и всех Preview; полный coverage `45/45`
  не требуется.
- `node scripts/verify-lead-hook.mjs` — проверить browser/Function contract
  формы без реальной отправки в Albato.
- `python scripts/qa-browser-matrix.py <base-url>` — прогнать responsive/browser
  матрицу по локальному или живому URL.
- `npm run check` — проверить унаследованный Next.js-каркас (lint, typecheck,
  build); это CI-gate, а не production build.
- `powershell -ExecutionPolicy Bypass -File scripts/deploy-pages.ps1` — ручной
  production deploy `site/ + functions/`; запускать только после решения
  владельца и readback по `docs/DEPLOY.md`.

## Code Style

- Менять канонические файлы в `site/`, `site-addons/` и `functions/`, затем
  пересобирать производные; не исправлять копии в `build/`.
- Сохранять существующие HTML/CSS/JavaScript и Python conventions; не
  рефакторить соседний код без требования задачи.
- Любое изменение versioned-контракта сопровождается новой SemVer, датой и
  синхронизацией marker во всех его источниках.
- Тире в видимом тексте — только длинное (U+2014) и только с неразрывным
  пробелом перед ним: `слово&nbsp;— слово`. В JS-строках вместо сущности
  ставится литеральный U+00A0. НЕ ставить `&nbsp;` в JSON-LD (сущности там не
  декодируются) и в `<head>`-мета. Полное правило и гейты —
  `docs/TYPOGRAPHY-DASHES.md`.
- Responsive-проверки включают обе стороны границы `960/961px`, короткий
  portrait и desktop; отсутствие horizontal overflow обязательно.

## Design Principles

- **Утверждённый контент** — клиентские тексты и факты не переписывать по
  предположению; явные поздние правки владельца имеют приоритет.
- **Production isolation** — Preview builders и deploy не должны молча менять
  `site/` или production alias.
- **Mobile conversion** — CTA, Action Bar, форма, ошибки и autofill должны быть
  читаемыми, доступными и полностью помещаться на целевых viewport.
- **Проверяемость** — завершение подтверждается статическими гейтами, browser
  matrix и live readback, соответствующими реальному контуру изменения.

## Project Structure
```
site/                       # канонический production source
site-addons/action-bar/     # единственный источник мобильной Action Bar
functions/api/lead.js       # Cloudflare Pages lead endpoint
scripts/build-*.py          # генераторы клиентских вариантов
scripts/client-preview-map.json
                            # branch -> build directory + версии контрактов
scripts/client_copy_contract.py
                            # exact copy contract для 45 клиентских блоков
docs/sources/client-copy-short-v1.0.0.txt
                            # immutable byte-for-byte frozen source клиента
build/variants/             # производные Hero/Action Bar/review (не править)
build/font-variants/        # производные шрифтовые Preview (не править)
docs/                       # задания, контракты, QA, deploy и handoff
src/                        # унаследованный Next.js-каркас, не production
```

## Что обязательно сохранять в репозиторий

Сессия работает в эфемерном контейнере, а контекст диалога сжимается по ходу
работы. Всё, что осталось только в переписке или в артефакте-ссылке, **пропадает**
и восстановлению не подлежит. Поэтому: результат работы существует, только если он
закоммичен.

Коммитить **до конца задачи**, не «потом»:

| Что | Куда |
| --- | --- |
| Исследование, сравнение вариантов, замеры рынка | `docs/<TEMA>.md` |
| Тексты и правки, присланные клиентом | `docs/CONTENT-*.md` |
| Принятое решение и его обоснование | `docs/<TEMA>.md`, секция «Рекомендация» |
| Задание исполнителю, критерии приёмки | `docs/tasks/<дата>-<тема>.md` |
| Разобранный дефект и его причина | `docs/ERRORS.md` |
| Ссылки на внешние источники (артефакты, макеты, ревью-страницы) | тот же документ темы |

Правила:

1. **Артефакт в чате — не хранилище.** Если создан артефакт с разбором, его
   содержание переносится в `docs/` тем же ходом. Ссылку на артефакт сохранять
   рядом, но полагаться только на неё нельзя.
2. **Присланный клиентом текст фиксируется дословно** — до того, как начнётся
   перенос в вёрстку. Иначе потом нечем доказать, что на сайте только
   утверждённое.
3. **Внешняя страница может исчезнуть.** Если работа опирается на чужой URL
   (страница ревью, макет, прайс), из него вытаскивается и сохраняется то, что
   нужно для работы.
4. **Один документ — одна задача.** Не смешивать разбор, отчёт и список
   недостающего в одном файле: их читают в разных ситуациях.
5. Каждый новый файл в `docs/` получает секцию `## Related` со ссылками на
   связанные документы.

## Публикация

Деплой ведёт агент `cf-preview-deployer` (`.claude/agents/`): он сам
определяет доступный путь публикации, проверяет, куда смотрит токен, и
доказывает результат чтением живых адресов.

Три правила, которые не обходятся:

1. **Preview по умолчанию, боевой — только по явному решению владельца** в
   текущем разговоре.
2. **Exit code wrangler не доказательство.** На части предупреждений он
   выходит с нулём. Доказательство — `python -B scripts/verify-live-previews.py`.
3. **`status: active` не значит «нужный аккаунт».** Токен чужого аккаунта
   заставит wrangler молча создать дубликат проекта без привязки к домену.
   Перед публикацией убедиться, что токен видит `gambarian-landing`.

Из облачной сессии Claude Code ключей Cloudflare нет — это свойство среды,
а не отказ агента. Рабочие пути: переменные окружения на машине владельца
либо секреты GitHub Actions (`.github/workflows/deploy-previews.yml`).

## Цикл final-dev4: исполнитель Codex CLI

Версия `final-dev4` реализуется по этапам Codex CLI на машине владельца;
ТЗ, карточки этапов и приёмку ведёт архитектор (Claude). Модель работы —
`docs/CODEX-WORKING-MODEL.md`; задание с реестром решений владельца —
`docs/tasks/2026-09-06-final-dev4-spec.md`; карточки этапов —
`docs/tasks/codex/`. Исполнитель любого этапа:

1. читает `AGENTS.md` → `docs/RESUME.md` → `docs/CODEX-WORKING-MODEL.md` →
   карточку этапа, и только потом код;
2. работает в ветке `codex/final-dev4-s<N>-<slug>` и открывает draft PR в
   `main` с proof-блоком (хэш, diff, вывод гейтов, «Проверено / Не проверено»);
3. берёт тексты только из колонки «Правка»
   `docs/CONTENT-OWNER-REVISIONS-2026-09-06.md` дословно;
4. не реализует открытые вопросы без явного «по умолчанию» и не трогает
   `final-dev3`, production и frozen source;
5. деплой делает владелец: `Deploy Previews` из ветки этапа с `only=final-dev4`.

## MOST IMPORTANT NOTES
- Before changing code or documentation, read `docs/RESUME.md` and the relevant
  task's `Приёмка` section. Treat older handoff files as history.
- When launching Claude Code agent teams, ALWAYS have each teammate work in their own worktree branch and merge everyone's work at the end, resolving any merge conflicts smartly since you are basically serving the orchestrator role and have full context to our goals, work given, work achieved, and desired outcomes.
- After editing `AGENTS.md`, run `bash scripts/sync-agent-rules.sh` to regenerate platform-specific instruction files.
- Do not edit generated files in `build/` by hand. Rebuild them from `site/`.
- Do not deploy production or send a real Albato lead without explicit owner
  approval. The generic `docs/research/INSPECTION_GUIDE.md` is historical
  reference, not the workflow entry point for this project.

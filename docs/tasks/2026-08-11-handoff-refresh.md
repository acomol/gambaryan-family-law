# Задание: привести handoff-поверхности к фактическому состоянию

> Исполнитель: Codex. Приёмка: ведущий агент сессии.
> Ветка: `claude/website-development-kb0fu0`. База: `ef4f301`.
> Основание: read-only проверка Codex 2026-08-11 («пока не передавать»),
> подтверждена независимой сверкой ведущего агента по всем шести пунктам.
> Код сайта, Preview и production НЕ трогать — задание только про
> документацию, манифест зависимостей и QA-runner.

## Что подтверждено сверкой (не трогать, уже PASS)

- HEAD `ef4f301`, расхождение local/remote 0/0;
- CI `31471472711` — success;
- 10/10 Preview: HTTP 200, `ACTION-BAR-SPEC v2.3.1`,
  `CLIENT-PREVIEW-MOBILE v1.0.0` (маркер в `client-preview.css`,
  не в `styles.css`), `/api/lead` → 405;
- production без маркеров, `noindex` на месте.

## Исправления

### 1. `docs/FINAL-QA-CHECKLIST.md` — внутреннее противоречие

Строка 40 уже говорит `98374c1` / Action Bar `2.3.1`, но ниже остались
устаревшие утверждения:

- `:77` — «Preview опубликованы из `8ccc820`, final-dev1 из `51e9b82`» →
  фактически все десять из `98374c1`;
- `:80` — «опережает `origin/main` на 75 коммитов» → фактически **78**
  (проверено `git rev-list --count origin/main..origin/claude/website-development-kb0fu0`
  и полем `commits` PR #2);
- `:493–496` и далее вся таблица деплоев — commit `8ccc820`/`51e9b82` →
  актуальные deployment id и commit `98374c1`. Deployment id взять из
  Cloudflare (wrangler `pages deployment list`), не выдумывать.

Число «78» после этого коммита снова изменится — в тексте писать не сырое
число, а число + SHA, на котором оно посчитано, либо посчитать после
финального коммита этого задания.

### 2. `AGENTS.md` — описывает чужой проект

Шапка называет репозиторий «Website Reverse-Engineer Template» (Next.js 16,
shadcn/ui, деплой Vercel, `/clone-website`). Реальный контур: статичный
`site/`, производные `build/variants/*` через `scripts/build-*.py`,
Cloudflare Pages `gambarian-landing`, десять Preview, Action Bar addon,
`functions/api/lead.js`.

- Переписать секции «What This Is», «Tech Stack», «Commands»,
  «Project Structure» под фактический контур. Next.js-блок можно оставить
  одним абзацем как «наследие шаблона, в прод не собирается» — решение о
  полном удалении за владельцем.
- **Не редактировать копии руками.** После правки `AGENTS.md` выполнить
  `bash scripts/sync-agent-rules.sh` — он регенерирует
  `.github/copilot-instructions.md`, `.clinerules` и остальные
  платформенные файлы (правило из MOST IMPORTANT NOTES).

### 3. `docs/tasks/2026-08-06-session-handoff.md` — SUPERSEDED

Добавить в самое начало файла блок:

```markdown
> **SUPERSEDED 2026-08-11.** Документ описывает состояние на 2026-08-06
> (Action Bar v1, ручной wrangler-деплой, 9 адресов). Актуальная точка
> входа — `docs/RESUME.md`. Читать этот файл только как историю.
```

Содержимое ниже не менять — это исторический документ.

### 4. Новый `docs/RESUME.md` — актуальная точка входа

Один файл, с которого начинает любой новый агент. Обязательное содержимое:

- ветка, актуальный HEAD и PR #2 (draft);
- контур: `site/` → генераторы `scripts/build-*.py` → `build/variants/*` →
  wrangler pages deploy, проект `gambarian-landing`, договорённость
  `--branch=main` для боевого;
- таблица 10 живых Preview + production, с версиями контрактов
  (Action Bar `2.3.1`, `CLIENT-PREVIEW-MOBILE v1.0.0`, Hero final-dev1
  `v1.3.0`);
- статические гейты: `python -B scripts/verify-client-previews.py`
  (требует ВСЕ 10 собранных каталогов), `node scripts/verify-lead-hook.mjs`;
- установка зависимостей: `python -m pip install -r requirements-build.txt`
  + `python -m playwright install chromium`;
- ловушка Cloudflare soft-404: отсутствующий ассет отдаёт 200 c
  `content-type: text/html` — судить только по content-type/телу;
- карта ключевых docs (boards, FINAL-QA-CHECKLIST, ERRORS, DEPLOY);
- открытые решения владельца (production cutover, GTM/GA4, Albato secret,
  privacy notice).
- Секция `## Related` — обязательна (правило репозитория).

### 5. Восстановить `requirements-build.txt`

Удалён в `e3bfaa0` вместе с build-social-preview.py, но зависимости нужны
до сих пор: `build-font-variants.py` (fontTools), QA-прогоны (playwright).

```
# BUILD-TOOLS v1.1.0 | 2026-08-11
fonttools==4.59.2
playwright==1.58.0
brotli==1.1.0
```

Плюс строка установки в RESUME.md (см. п.4). Проверить, что после
`pip install -r` на чистом окружении собирается `build-hero-variants.py dev1`
и `build-font-variants.py`.

### 6. Сохранить QA matrix-runner

Чек-лист заявляет «100/100 + 50/50 + 6/6», но исполняемого скрипта в
`scripts/` нет — результат невоспроизводим. Положить runner, которым
гонялась матрица (или восстановить эквивалент), как
`scripts/qa-browser-matrix.py`:

- вход: базовый URL (живой или локальный);
- матрица размеров из `docs/FINAL-QA-CHECKLIST.md`;
- машинный вывод PASS/FAIL по ячейке + итоговый счёт;
- README-шапка в самом файле: как запустить и что означает счёт.

## Приёмка

1. `git diff -- site site-addons functions` — пусто; `git status --porcelain`
   по этим путям — пусто (production-контур не тронут).
2. `grep -rn "8ccc820\|на 75 коммитов" docs/FINAL-QA-CHECKLIST.md` — 0 строк
   с устаревшими утверждениями о текущем состоянии (в историческом контексте
   baseline-строки `:9-13` остаются).
3. `grep -c "Reverse-Engineer Template" AGENTS.md .github/copilot-instructions.md .clinerules`
   — 0 после sync-скрипта, и все копии регенерированы им, не руками.
4. `head -5 docs/tasks/2026-08-06-session-handoff.md` содержит SUPERSEDED.
5. `docs/RESUME.md` существует, все пункты списка из п.4 присутствуют.
6. `pip install -r requirements-build.txt` на чистом venv проходит,
   `python -B scripts/build-hero-variants.py dev1` собирается.
7. `python scripts/qa-browser-matrix.py http://127.0.0.1:<port>/` на любом
   локально собранном варианте выдаёт машинный счёт.
8. CI зелёный на новом HEAD.

PR body #2 обновляет ведущий агент ПОСЛЕ merge-готовности этих правок —
в теле нужен финальный SHA, который появится только после пуша. Codex PR
не трогает.

## Related

- `docs/FINAL-QA-CHECKLIST.md` — предмет п.1
- `docs/tasks/2026-08-06-session-handoff.md` — предмет п.3
- `docs/reviews/2026-08-10-action-bar-v2-acceptance.md` — предыдущая приёмка
- `docs/reviews/2026-08-11-final-dev1-v1.4.0-spec-validation.md` — разбор ТЗ v1.4.0

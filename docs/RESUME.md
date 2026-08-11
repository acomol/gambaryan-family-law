# Актуальная точка входа в проект

**Версия:** `HANDOFF-RESUME v1.0.0`

**Обновлено:** `2026-08-11`

## Git и границы работы

- Репозиторий: `acomol/gambaryan-family-law`.
- Рабочая ветка: `claude/website-development-kb0fu0`; в `main` напрямую не
  коммитить.
- Handoff task/base: `e48bd08a66d5e38be7dae9105333f080d0e3c4d1`;
  GitHub Actions run `31473373506` — `success`.
- GitHub PR: [#2](https://github.com/acomol/gambaryan-family-law/pull/2),
  статус `draft`. Тело PR обновляет ведущий агент после появления финального SHA.
- Клиентский Preview release: `98374c133f91a7c47112561f86debbcec2129f6c`;
  документационный HEAD не означает новый Cloudflare deployment.
- `site/`, `functions/` и `site-addons/` не менять в рамках handoff-refresh.
  Production не обновлялся вместе с последним Preview release.

Перед продолжением сверить фактическое состояние:

```powershell
git fetch origin --prune
git status --short
git rev-parse HEAD
git rev-parse origin/claude/website-development-kb0fu0
git rev-list --left-right --count origin/main...HEAD
```

Перед передачей `HEAD` должен совпадать с
`origin/claude/website-development-kb0fu0`; не подменять текущий HEAD значением
task/base или функционального release.

## Контур сборки и публикации

```text
site/ (канонический источник)
  -> scripts/build-*.py
  -> build/variants/* и build/font-variants/*
  -> wrangler pages deploy
  -> Cloudflare Pages project gambarian-landing
```

- `site-addons/action-bar/` — единственный источник Action Bar; генераторы
  устанавливают addon после собственных преобразований.
- `functions/api/lead.js` публикуется вместе с Pages artifact, если Wrangler
  запускается из корня репозитория через `--cwd`.
- Preview публикуются с явным `--branch=<preview-slug>` по карте
  `scripts/client-preview-map.json`.
- Текущий production-runbook публикует `site/ + functions/` с явным
  `--branch=main`; будущий production artifact ещё выбирает владелец. Без его
  решения production deploy не выполнять.
- `build/` — производный каталог: не редактировать вручную и не считать старую
  локальную сборку доказательством.

Шаблон ручной Preview-публикации:

```powershell
npx --yes wrangler@4.120.0 pages deploy "<directory>" `
  --cwd "<repo-root>" `
  --project-name=gambarian-landing `
  --branch="<preview-slug>" `
  --commit-dirty=true
```

## Живые адреса и версии контрактов

Все десять Preview ниже опубликованы из commit `98374c1`, имеют Action Bar
`2.3.1` и `CLIENT-PREVIEW-MOBILE v1.0.0`. У `final-dev1` дополнительно
подтверждён Hero `1.3.0` и Precedent Copy `1.0.0`.

| Контур | URL | Deployment | Контракты |
|---|---|---:|---|
| `final-dev` | https://final-dev.gambarian-landing.pages.dev/ | `76d3778a-46b9-4996-ba2d-7d3c4f7d95ec` | Action Bar `2.3.1`; mobile `1.0.0` |
| `final-dev1` | https://final-dev1.gambarian-landing.pages.dev/ | `69fa4640-c137-4cf9-afd8-37bfd4462c5d` | Hero `1.3.0`; Precedent Copy `1.0.0`; Action Bar `2.3.1`; mobile `1.0.0` |
| `v1-playfair-onest` | https://v1-playfair-onest.gambarian-landing.pages.dev/ | `d402e2ca-cc8c-485d-ae04-653d9b77bc95` | Playfair Display + Onest; Action Bar `2.3.1`; mobile `1.0.0` |
| `v2-lora-inter` | https://v2-lora-inter.gambarian-landing.pages.dev/ | `308cad66-555e-4b94-af50-89469b6061bd` | Lora + Inter; Action Bar `2.3.1`; mobile `1.0.0` |
| `v3-literata-manrope` | https://v3-literata-manrope.gambarian-landing.pages.dev/ | `8a182caa-e22c-41f9-9a67-6005a68eb344` | Literata + Manrope; Action Bar `2.3.1`; mobile `1.0.0` |
| `v4-ptserif-golos` | https://v4-ptserif-golos.gambarian-landing.pages.dev/ | `80ba9adf-b5e8-4c4f-9277-8502acaf1d88` | PT Serif + Golos Text; Action Bar `2.3.1`; mobile `1.0.0` |
| `hero-a-actions-first` | https://hero-a-actions-first.gambarian-landing.pages.dev/ | `930f558c-0755-4dfb-a3d9-9f73feee2056` | Hero A; Action Bar `2.3.1`; mobile `1.0.0` |
| `hero-b-call-first` | https://hero-b-call-first.gambarian-landing.pages.dev/ | `b4e3c1de-b801-4c97-a70c-0d5903eed5b0` | Hero B; Action Bar `2.3.1`; mobile `1.0.0` |
| `action-bar` | https://action-bar.gambarian-landing.pages.dev/ | `f5b76f77-4212-4754-b590-b0d9387df083` | эталон Action Bar `2.3.1`; mobile `1.0.0` |
| `review-numbered` | https://review-numbered.gambarian-landing.pages.dev/ | `aaa2e734-486f-4433-82b3-34fdadb3a683` | 102 подписи; Action Bar `2.3.1`; mobile `1.0.0` |
| Production | https://gambarian-landing.pages.dev/ | `af10299b-1257-4f65-b66d-4b1e3041bf74` | commit `cb9135c`; `noindex`; Action Bar/client-preview markers отсутствуют |

Production HTML до и после Preview release имел SHA-256
`656cbcd0635952899e79b847d5c262724979d21f548ca66e13fe3a7d2ec13e22`.
Не переносить Preview PASS на production без отдельного deploy и readback.

## Чистая установка и пересборка

Инструменты закреплены как `BUILD-TOOLS v1.1.1 | 2026-08-11`; browser-runner —
`PREVIEW-BROWSER-QA-RUNNER v1.0.2 | 2026-08-11`.

```powershell
python -m venv .venv-handoff
.\.venv-handoff\Scripts\Activate.ps1
$env:PYTHONUTF8='1'
python -m pip install -r requirements-build.txt
python -m playwright install chromium
python -B scripts/build-hero-variants.py dev1
python -B scripts/build-font-variants.py
```

`PYTHONUTF8` обязателен в Windows PowerShell: системный stdout может быть
`cp1252`, а font builder печатает кириллицу. Локальное окружение и browser
binaries не коммитить.

## Статические и browser-гейты

После сборки **всех десяти** каталогов выполнить:

```powershell
python -B scripts/verify-client-previews.py
node scripts/verify-lead-hook.mjs
node --check site-addons/action-bar/action-bar.js
npm run check
git diff --check
```

`verify-client-previews.py` требует присутствия всех десяти каталогов из
`scripts/client-preview-map.json`; частичная сборка закономерно завершится
ошибкой. `verify-lead-hook.mjs` проверяет контракт без реального POST в Albato.

Responsive/browser matrix для одного локального или живого варианта:

```powershell
python scripts/qa-browser-matrix.py http://127.0.0.1:<port>/
```

Полная локальная карта, если корень репозитория отдан тем же HTTP server:

```powershell
python scripts/qa-browser-matrix.py http://127.0.0.1:<port>/ --all-previews
```

Без `--all-previews` счёт runner относится только к переданному URL. Полный
режим использует десять путей и дополнительные группы из
`docs/FINAL-QA-CHECKLIST.md`, чтобы воспроизвести `100/100 + 50/50 + 6/6`.

## Ловушка Cloudflare soft-404

Cloudflare Pages может вернуть HTTP `200` для отсутствующего asset, отдав
fallback HTML с `content-type: text/html`. Поэтому наличие CSS/JS/font/image
нельзя подтверждать только статусом: проверять ожидаемый `content-type`, marker
версии и тело ответа. HTML вместо ожидаемого asset — FAIL.

## Решения владельца и незакрытые внешние шаги

Подтверждено владельцем `2026-08-11`: будущий отдельный `final-dev3` должен
соединить базу `final-dev1`, Playfair Display + Onest, текущие тексты и Action
Bar `2.3.1`. Входы зафиксированы; вариант ещё не собран и не опубликован.
Разработка начинается только после завершения этого handoff.

До production-ready остаются решения/действия владельца:

- выбрать production artifact и явно разрешить cutover;
- подключить GTM/GA4 и утвердить карту событий;
- установить отдельный Cloudflare encrypted secret `ALBATO_WEBHOOK_URL`,
  выполнить Catch, destination dedup и контрольный readback конечной записи;
- утвердить privacy notice/policy рядом с формой;
- согласовать production host/canonical/OG и момент снятия `noindex`.

Не утверждать, что заявка доставляется в CRM, пока нет реального Albato
Automation Log и readback конечной записи.

## Карта ключевой документации

- [Карта клиентских URL](boards/2026-08-06-versions-links.md) — стабильные
  Preview aliases, назначение вариантов и конверсионный путь.
- [Финальный QA-чек-лист](FINAL-QA-CHECKLIST.md) — единая матрица требований,
  PASS/OPEN/BLOCKER и regression gates.
- [Журнал ошибок](ERRORS.md) — подтверждённые дефекты и постоянные проверки.
- [Deployment runbook](DEPLOY.md) — Cloudflare account, production-команда,
  token/IP traps и обязательный readback.
- [Live release report](reviews/2026-08-11-client-preview-live-release.md) —
  deployment IDs, contracts, browser smoke и production isolation.

## Related

- [Клиентский handoff](CLIENT-PREVIEW-HANDOFF.md)
- [Локальный browser QA](reviews/2026-08-11-client-preview-local-qa.md)
- [Задание handoff-refresh](tasks/2026-08-11-handoff-refresh.md)
- [Контракт lead webhook](LEAD-WEBHOOK-CONTRACT.md)

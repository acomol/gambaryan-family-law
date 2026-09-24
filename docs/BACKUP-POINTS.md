# Точки восстановления

**Версия:** `BACKUP-POINTS v1.0.0 | 2026-09-17`

Каждая точка фиксирует одно и то же состояние тремя независимыми способами: метка в git,
неизменяемый деплой Cloudflare Pages и отдельный адрес-копия. Любого из трёх достаточно,
чтобы вернуть сайт.

## 2026-09-19 — запуск lp.gambarian.com (основная версия)

| Что | Значение |
|---|---|
| Прежняя основная версия (ветка `main`) | деплой `af10299b-1257-4f65-b66d-4b1e3041bf74` от 2026-08-10 — старая сборка |
| Новая основная версия | деплой `6d3c48d9` → https://6d3c48d9.gambarian-landing.pages.dev — `build/production` из коммита `d1ace3e` (`scripts/build-production.py`) |

Вернуть: Cloudflare Pages → `gambarian-landing` → Deployments → Production → `af10299b` → Rollback.
Снять адрес: убрать `lp.gambarian.com` из Custom domains или запись `lp` у DNS-администратора.

## 2026-09-17 — final-dev5 до пересборки фона первого экрана

Все правки владельца от 2026-09-16 и 2026-09-17, опубликованные на `final-dev5`.

| Способ | Значение |
|---|---|
| Метка git | `backup/final-dev5-2026-09-17-before-hero-bg` → коммит `a7b7df2` (на origin) |
| Деплой Cloudflare (неизменяемый) | `b218a4e8-6daa-44bf-806e-67ca19511c69` → https://b218a4e8.gambarian-landing.pages.dev |
| Адрес-копия | https://backup-dev5-0917.gambarian-landing.pages.dev (деплой `85b4b9d4`) |
| Проверка | HTML копии, живого `final-dev5` и сборки совпадают: sha256 `69765d321281…` |

### Как вернуть

**Быстро, без сборки** — в Cloudflare Pages открыть проект `gambarian-landing`, деплой
`b218a4e8` и выполнить Rollback для ветки `final-dev5`. Или опубликовать тот же набор
файлов заново:

```bash
git -C I:/GIT/gambaryan-family-law checkout backup/final-dev5-2026-09-17-before-hero-bg
```

```bash
env -u CLOUDFLARE_API_TOKEN -u CLOUDFLARE_ACCOUNT_ID bash scripts/deploy-previews.sh final-dev5
```

Перед публикацией после `checkout` пересобрать варианты тем же порядком, что обычно:
`build-preview.py --standalone` → `build-font-variants.py` → `build-hero-variants.py` →
`build-action-bar.py` → `build-review-numbered.py`.

**Вернуть только код, оставив историю** — `git revert` коммитов после `a7b7df2` на ветке
`codex/final-dev5`; метку не трогать.

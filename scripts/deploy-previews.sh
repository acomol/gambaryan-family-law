#!/usr/bin/env bash
# Публикация ВСЕХ клиентских Preview из scripts/client-preview-map.json
# в Cloudflare Pages (проект gambarian-landing). Боевой адрес не трогает.
#
# Запускать на машине владельца из корня репозитория:
#   bash scripts/deploy-previews.sh
#
# Один Preview:
#   bash scripts/deploy-previews.sh final-dev3
#
# Почему отдельный скрипт: deploy-pages.sh публикует только site/ на боевой
# (--branch=main). Preview-адресов одиннадцать, у каждого свой branch alias и
# свой каталог сборки. Одиннадцать команд руками — одиннадцать шансов
# опечататься в alias и создать лишний адрес. Источник истины — карта, а не
# память. Подробности: docs/DEPLOY.md
#
# ВАЖНО (docs/FINAL-QA-CHECKLIST.md, OPEN): wrangler на части предупреждений
# завершается с кодом 0. Поэтому успех здесь определяется не только exit code,
# но и чтением живого адреса после публикации.

set -euo pipefail

PROJECT="${CF_PAGES_PROJECT:-gambarian-landing}"
MAP="scripts/client-preview-map.json"
ONLY="${1:-}"

[ -f "$MAP" ] || { echo "Ошибка: $MAP не найден. Запускать из корня репозитория." >&2; exit 1; }
command -v npx >/dev/null 2>&1 || { echo "Ошибка: не найден npx. Установите Node.js." >&2; exit 1; }

WRANGLER="wrangler@$(python3 -c "import json;print(json.load(open('$MAP'))['wrangler_version'])")"

echo "Проект:   $PROJECT"
echo "Wrangler: $WRANGLER"
echo "Коммит:   $(git rev-parse --short HEAD 2>/dev/null || echo '—')"
echo "Ветка:    $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '—')"
echo

# Сборки обязаны существовать до публикации: build/ не в git, и пустой
# каталог уехал бы на живой адрес как пустой сайт.
MISSING=0
while IFS=$'\t' read -r branch dir; do
  [ -n "$ONLY" ] && [ "$branch" != "$ONLY" ] && continue
  if [ ! -f "$dir/index.html" ]; then
    echo "  НЕТ СБОРКИ  $branch -> $dir" >&2
    MISSING=1
  fi
done < <(python3 -c "
import json
for p in json.load(open('$MAP'))['previews']:
    print(p['branch'], p['directory'], sep='\t')
")
if [ "$MISSING" = "1" ]; then
  echo >&2
  echo "Сначала собрать варианты:" >&2
  echo "  python -B scripts/build-preview.py site/gambarian-standalone.html --standalone" >&2
  echo "  python -B scripts/build-hero-variants.py" >&2
  echo "  python -B scripts/build-font-variants.py" >&2
  echo "  python -B scripts/build-action-bar.py" >&2
  echo "  python -B scripts/build-review-numbered.py" >&2
  exit 1
fi

# В CI вход через браузер невозможен и повесил бы job: там авторизация идёт
# токеном из окружения. Логин предлагаем только когда токена нет.
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  if ! npx --yes "$WRANGLER" whoami >/dev/null 2>&1; then
    echo "Нужен вход в Cloudflare — откроется браузер."
    npx --yes "$WRANGLER" login
  fi
fi

FAILED=()
DONE=()
while IFS=$'\t' read -r branch dir; do
  [ -n "$ONLY" ] && [ "$branch" != "$ONLY" ] && continue
  echo "=== $branch  <-  $dir"
  # --branch обязателен: без него wrangler возьмёт имя текущей git-ветки и
  # создаст Preview с чужим alias.
  if npx --yes "$WRANGLER" pages deploy "$dir" \
       --project-name="$PROJECT" --branch="$branch" --commit-dirty=true; then
    DONE+=("$branch")
  else
    echo "  wrangler завершился с ошибкой" >&2
    FAILED+=("$branch")
  fi
  echo
done < <(python3 -c "
import json
for p in json.load(open('$MAP'))['previews']:
    print(p['branch'], p['directory'], sep='\t')
")

echo "Опубликовано: ${#DONE[@]}; с ошибкой: ${#FAILED[@]}"
[ ${#FAILED[@]} -gt 0 ] && printf '  ПРОВАЛ  %s\n' "${FAILED[@]}" >&2

echo
echo "Теперь readback живых адресов (exit code wrangler за доказательство не считается):"
echo "  python -B scripts/verify-live-previews.py"
[ ${#FAILED[@]} -eq 0 ]

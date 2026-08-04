#!/usr/bin/env bash
# Публикация папки site/ на Cloudflare Pages (проект gambarian-landing).
#
# Запускать на своей машине из корня репозитория:
#   bash scripts/deploy-pages.sh
#
# При первом запуске wrangler откроет браузер и попросит войти в
# Cloudflare — токен создавать не нужно. Подробности: docs/DEPLOY.md

set -euo pipefail

PROJECT="${CF_PAGES_PROJECT:-gambarian-landing}"
DIR="site"

if [ ! -f "$DIR/index.html" ]; then
  echo "Ошибка: $DIR/index.html не найден. Запускать из корня репозитория." >&2
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "Ошибка: не найден npx. Установите Node.js: https://nodejs.org" >&2
  exit 1
fi

echo "Ветка:  $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '—')"
echo "Коммит: $(git rev-parse --short HEAD 2>/dev/null || echo '—')"
echo "Проект: $PROJECT"
echo

# Вход: если сессии нет, wrangler откроет браузер.
if ! npx --yes wrangler@latest whoami >/dev/null 2>&1; then
  echo "Нужен вход в Cloudflare — откроется браузер."
  npx --yes wrangler@latest login
fi

npx --yes wrangler@latest pages deploy "$DIR" --project-name="$PROJECT"

echo
echo "Опубликовано. Проверяю, что уехала свежая версия..."
sleep 5

URL="https://gambarian-landing.pages.dev/"
PAGE="$(curl -sS -L --max-time 30 "$URL" || true)"

check() {  # check <строка> <должна быть: yes|no> <описание>
  if grep -qF -- "$1" <<<"$PAGE"; then found=yes; else found=no; fi
  if [ "$found" = "$2" ]; then echo "  OK      $3"; else echo "  ПРОВАЛ  $3"; FAILED=1; fi
}

FAILED=0
check "Более 30 лет практики" yes "цифра опыта — 30"
check "Более 24 лет"          no  "старой цифры 24 не осталось"
check "onest-normal"          yes "подключён шрифт Onest"
check "hero-duo-mob"          yes "мобильный кроп hero на месте"
check "alexander-card-v2"     yes "новый портрет Александра"
check "</figure>"             no  "сломанных тегов picture нет"

echo
if [ "$FAILED" = "0" ]; then
  echo "Свежая версия на живом адресе: $URL"
else
  echo "Часть проверок не прошла — возможно, кэш ещё не обновился."
  echo "Подождите минуту и откройте $URL в браузере."
fi

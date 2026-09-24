#!/usr/bin/env bash
# Быстрый цикл правки для final-dev5: сборка только нужного, публикация, проверка на живом адресе.
#
#   bash scripts/quick-dev5.sh                      # собрать и опубликовать
#   bash scripts/quick-dev5.sh ".hero__title"       # + снимок элемента на 1440 и 390
#   bash scripts/quick-dev5.sh "#contact" 1440@2,390@3
#
# Что пропускается ради скорости (запускать пакетом: bash scripts/full-checks.sh):
# standalone-файл, шрифтовые варианты, нумерованный ревью-вариант, текстовый контракт,
# unit-тесты, визуальный набор. Сборка dev5 и Action Bar остаются: без них адрес
# показал бы не то, что в site/.
set -euo pipefail
cd "$(dirname "$0")/.."
start=$(date +%s)

python -B scripts/build-hero-variants.py dev5 | tail -1
python -B scripts/build-action-bar.py | tail -1
env -u CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID=4799e9f76c607e036c430a148d06a80b \
  bash scripts/deploy-previews.sh final-dev5 2>&1 | grep -E "Опубликовано|ПРОВАЛ|ERROR"

# Живой адрес: сверить, что HTML совпадает со сборкой (CDN иногда отдаёт прежнюю копию)
live=$(mktemp)
for attempt in 1 2 3 4 5; do
  curl -fsS -A gambarian-readback -H "Cache-Control: no-cache" \
    "https://final-dev5.gambarian-landing.pages.dev/?nc=$(date +%s%N)" -o "$live"
  if [ -s "$live" ] && cmp -s "$live" build/variants/final-dev5/index.html; then
    echo "Живой адрес = сборка (попытка $attempt)"; break
  fi
  [ "$attempt" = 5 ] && echo "ВНИМАНИЕ: живой HTML не совпал со сборкой за 5 попыток" && exit 1
  sleep 3
done
rm -f "$live"

if [ -n "${1:-}" ]; then
  python -B scripts/shot.py "$1" --widths "${2:-1440,390}"
fi
echo "Готово за $(( $(date +%s) - start )) с"

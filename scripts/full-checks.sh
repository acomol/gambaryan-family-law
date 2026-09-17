#!/usr/bin/env bash
# Полные проверки пакетом — после серии быстрых правок, перед коммитом эталонов и сдачей.
#   bash scripts/full-checks.sh           # сборки + гейты
#   bash scripts/full-checks.sh --visual  # + визуальный набор с пересъёмкой эталонов
set -euo pipefail
cd "$(dirname "$0")/.."
start=$(date +%s)

python -B scripts/build-preview.py site/gambarian-standalone.html --standalone | head -1
python -B scripts/build-font-variants.py | tail -1
python -B scripts/build-hero-variants.py | tail -1
python -B scripts/build-action-bar.py | tail -1
python -B scripts/build-review-numbered.py | tail -1
python -B scripts/verify-client-copy.py | tail -1
python -m unittest discover -s scripts/tests 2>&1 | tail -1
node scripts/verify-lead-hook.mjs | tail -1
git diff --check && echo "git diff --check: чисто"

if [ "${1:-}" = "--visual" ]; then
  npm run test:visual:update 2>&1 | grep -E "passed|failed|skipped" || true
  npm run test:visual 2>&1 | grep -E "passed|failed|skipped|^\s+[0-9]+\) "
fi
echo "Полные проверки за $(( $(date +%s) - start )) с"

#!/usr/bin/env bash
# Запуск задачи Codex в отдельной рабочей копии одной командой.
#
#   bash scripts/codex-task.sh deck-b I:/path/brief.md            # исполнение (запись)
#   bash scripts/codex-task.sh deck-c I:/path/brief.md read-only  # ревью/исследование
#
# Копии: I:/GIT/gambaryan-deck-a|b|c (git worktree). Лог и отчёт — рядом с брифом.
# Бриф подаётся файлом: кириллица через stdin у Codex ломается.
set -euo pipefail
lane="${1:?укажите копию: deck-a | deck-b | deck-c}"
brief="${2:?укажите файл брифа}"
mode="${3:-workspace-write}"
dir="I:/GIT/gambaryan-$lane"
[ -d "$dir" ] || { echo "нет копии $dir; создать: git worktree add -B codex/$lane $dir codex/final-dev5" >&2; exit 1; }
[ -f "$brief" ] || { echo "нет брифа $brief" >&2; exit 1; }
report="${brief%.md}-report.md"
log="${brief%.md}.log"

cd "$dir"
git checkout -q -- site/gambarian-standalone.html 2>/dev/null || true
git merge -q --ff-only codex/final-dev5 2>/dev/null || echo "внимание: копия не догнала codex/final-dev5" >&2
[ -e node_modules ] || cmd //c "mklink /J $(cygpath -w "$dir")\\node_modules I:\\GIT\\gambaryan-family-law\\node_modules" >/dev/null

echo "Codex: $lane, режим $mode, бриф $(basename "$brief")"
echo "Read the file $brief as UTF-8 and follow it exactly. It is your full task brief." |
  powershell -NoProfile -Command "& 'C:\\Users\\alext\\AppData\\Roaming\\npm\\codex.ps1' exec --skip-git-repo-check --sandbox $mode --output-last-message '$report' -" > "$log" 2>&1 || true
echo "Готово. Отчёт: $report"
tail -c 1500 "$report" 2>/dev/null || tail -20 "$log"

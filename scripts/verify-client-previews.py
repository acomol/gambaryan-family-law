#!/usr/bin/env python3
"""Проверяет Action Bar во всех артефактах клиентской Preview-карты."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from action_bar_addon import SPEC_DATE, SPEC_VERSION, verify_action_bar_install


ROOT = Path(__file__).resolve().parent.parent
MAP_PATH = ROOT / "scripts" / "client-preview-map.json"


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")

    manifest = json.loads(MAP_PATH.read_text(encoding="utf-8"))
    problems: list[str] = []
    previews = manifest.get("previews", [])

    if manifest.get("version") != SPEC_VERSION:
        problems.append("версия Preview-карты не совпадает с Action Bar")
    if manifest.get("updated") != SPEC_DATE:
        problems.append("дата Preview-карты не совпадает с Action Bar")
    if len(previews) != 9:
        problems.append(f"в карте должно быть 9 Preview, найдено {len(previews)}")
    branches = [item.get("branch") for item in previews]
    if len(set(branches)) != len(branches):
        problems.append("в карте есть повторяющиеся Preview-ветки")

    for item in previews:
        branch = item.get("branch", "<без branch>")
        directory = item.get("directory")
        if not directory:
            problems.append(f"{branch}: не указана build directory")
            continue
        dest = ROOT / directory
        if not (dest / "index.html").exists():
            problems.append(f"{branch}: нет собранного {directory}/index.html")
            continue
        problems.extend(
            f"{branch}: {problem}" for problem in verify_action_bar_install(dest)
        )

    if problems:
        print("ПРОВЕРКА НЕ ПРОЙДЕНА:")
        for problem in problems:
            print("  ✗", problem)
        return 1

    print(
        f"PASS: Action Bar v{SPEC_VERSION} | {SPEC_DATE} присутствует "
        "во всех 9 клиентских Preview-артефактах."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

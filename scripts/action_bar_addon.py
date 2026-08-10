#!/usr/bin/env python3
"""Подключает единый Action Bar к клиентским Preview-сборкам.

Production-источник ``site/`` намеренно не меняется. Все сборщики вариантов
вызывают ``install_action_bar()`` после своих точечных преобразований, поэтому
шрифты, Hero и нумерация текста всегда проверяются вместе с одной и той же
мобильной панелью.
"""

from __future__ import annotations

import re
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
ADDON = ROOT / "site-addons" / "action-bar"
SPEC_VERSION = "2.1.0"
SPEC_DATE = "2026-08-10"
SPEC_MARKER_RE = re.compile(
    r"ACTION-BAR-SPEC\s+(v\d+\.\d+\.\d+)\s*\|\s*(\d{4}-\d{2}-\d{2})"
)


def install_action_bar(dest: Path) -> None:
    """Копирует и подключает Action Bar к уже собранной директории сайта."""
    html_path = dest / "index.html"
    html = html_path.read_text(encoding="utf-8")

    if re.search(r'class="[^"]*\bmobile-bar\b', html):
        raise SystemExit(f"{dest}: Action Bar уже присутствует в index.html")

    for name in ("action-bar.css", "action-bar.js"):
        shutil.copy(ADDON / name, dest / name)

    markup = (ADDON / "action-bar.html").read_text(encoding="utf-8").strip()
    stylesheet = '<link rel="stylesheet" href="styles.css">'
    if html.count(stylesheet) != 1:
        raise SystemExit(f"{dest}: ожидалась одна ссылка на styles.css")
    html = html.replace(
        stylesheet,
        stylesheet + '\n<link rel="stylesheet" href="action-bar.css">',
        1,
    )

    viewport = 'content="width=device-width, initial-scale=1"'
    if html.count(viewport) != 1:
        raise SystemExit(f"{dest}: исходный viewport не найден или задвоен")
    html = html.replace(
        viewport,
        'content="width=device-width, initial-scale=1, viewport-fit=cover"',
        1,
    )

    if html.count("</body>") != 1:
        raise SystemExit(f"{dest}: ожидался один закрывающий </body>")
    html = html.replace(
        "</body>",
        markup + '\n<script src="action-bar.js" defer></script>\n</body>',
        1,
    )
    html_path.write_text(html, encoding="utf-8")


def verify_action_bar_install(dest: Path) -> list[str]:
    """Проверяет общий контракт панели в любой клиентской сборке."""
    problems: list[str] = []
    html = (dest / "index.html").read_text(encoding="utf-8")
    sources = {"index.html": html}

    for name in ("action-bar.css", "action-bar.js"):
        path = dest / name
        if not path.exists():
            problems.append(f"{name} не скопирован в клиентскую сборку")
            continue
        sources[name] = path.read_text(encoding="utf-8")
        if path.read_bytes() != (ADDON / name).read_bytes():
            problems.append(f"{name} расходится с единым источником Action Bar")
        if html.count(f'href="{name}"') + html.count(f'src="{name}"') != 1:
            problems.append(f"{name} должен быть подключён ровно один раз")

    if len(re.findall(r'<nav\s+class="[^"]*\bmobile-bar\b[^"]*"', html)) != 1:
        problems.append("Action Bar должен быть в разметке ровно один раз")
    if "viewport-fit=cover" not in html:
        problems.append("в клиентском viewport нет viewport-fit=cover")

    expected = (f"v{SPEC_VERSION}", SPEC_DATE)
    markers = {name: SPEC_MARKER_RE.search(text) for name, text in sources.items()}
    if not all(markers.values()):
        problems.append("в HTML/CSS/JS нужны единые версия и дата ACTION-BAR-SPEC")
    elif {match.groups() for match in markers.values() if match} != {expected}:
        problems.append(
            f"ожидался ACTION-BAR-SPEC v{SPEC_VERSION} | {SPEC_DATE} во всех файлах"
        )

    js = sources.get("action-bar.js", "")
    if "scrollend" not in js or "hashchange" not in js:
        problems.append("нет ресинхронизации после мгновенного якорного перехода")

    return problems

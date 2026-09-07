"""Единый versioned-контракт кандидата final-dev4 поверх final-dev3."""

from __future__ import annotations

import re

from final_dev3_contract import BODY_CLASS as DEV3_BODY_CLASS, HTML_COMMENT as DEV3_HTML_COMMENT


VERSION = "1.0.0"
DATE = "2026-09-07"
MARKER = f"FINAL-DEV4-DESIGN v{VERSION} | {DATE}"
MARKER_RE = re.compile(r"FINAL-DEV4-DESIGN v(\d+\.\d+\.\d+) \| (\d{4}-\d{2}-\d{2})")
TASK_PATH = "docs/tasks/codex/README.md"
BOARD_PATH = "docs/boards/2026-08-06-versions-links.md"
BODY_CLASS = "page--final-dev4"
HTML_COMMENT = f"<!-- {MARKER} -->"
CSS_COMMENT = f"/* {MARKER} */"
# Класс dev3 сохраняет scoped latch общего Action Bar без изменения addon.
BODY_TAG = f'<body class="{DEV3_BODY_CLASS} {BODY_CLASS}">'
BODY_MARKER_SNIPPET = f"{BODY_TAG}\n{DEV3_HTML_COMMENT}\n{HTML_COMMENT}"
CSS_MARKER_SNIPPET = f"\n{CSS_COMMENT}\n"


def apply_html_contract(html: str) -> str:
    if MARKER in html or BODY_CLASS in html:
        raise ValueError("final-dev4 HTML contract уже применён")
    source = f'<body class="{DEV3_BODY_CLASS}">\n{DEV3_HTML_COMMENT}'
    if html.count(source) != 1:
        raise ValueError("final-dev4 применяется поверх final-dev3")
    return html.replace(source, BODY_MARKER_SNIPPET, 1)


def apply_css_contract(css: str) -> str:
    if MARKER in css:
        raise ValueError("final-dev4 CSS contract уже применён")
    return css + CSS_MARKER_SNIPPET

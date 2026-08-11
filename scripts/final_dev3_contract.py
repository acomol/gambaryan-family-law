"""Единый versioned-контракт отдельного кандидата final-dev3."""

from __future__ import annotations

import re


VERSION = "1.0.0"
DATE = "2026-08-11"
MARKER = f"FINAL-DEV3-DESIGN v{VERSION} | {DATE}"
MARKER_RE = re.compile(
    r"FINAL-DEV3-DESIGN v(\d+\.\d+\.\d+) \| (\d{4}-\d{2}-\d{2})"
)

TASK_PATH = "docs/tasks/2026-08-11-final-dev3-design-system.md"
BOARD_PATH = "docs/boards/2026-08-06-versions-links.md"

BODY_CLASS = "page--final-dev3"
HTML_COMMENT = f"<!-- {MARKER} -->"
CSS_COMMENT = f"/* {MARKER} */"
BODY_MARKER_SNIPPET = f'<body class="{BODY_CLASS}">\n{HTML_COMMENT}'
CSS_MARKER_SNIPPET = f"\n{CSS_COMMENT}"


def apply_html_contract(html: str) -> str:
    """Добавляет только scoped body-class и versioned HTML marker."""

    if html.count("<body>") != 1:
        raise ValueError("final-dev3 ожидает ровно один исходный <body>")
    if MARKER in html or BODY_CLASS in html:
        raise ValueError("final-dev3 HTML contract уже применён")
    return html.replace("<body>", BODY_MARKER_SNIPPET, 1)


def apply_css_contract(css: str) -> str:
    """Добавляет CSS marker без новых визуальных правил."""

    if MARKER in css:
        raise ValueError("final-dev3 CSS contract уже применён")
    return css + CSS_MARKER_SNIPPET


def normalize_html(html: str) -> str:
    """Удаляет только final-dev3 HTML contract для byte-level сверки с dev1."""

    return html.replace(BODY_MARKER_SNIPPET, "<body>", 1)


def normalize_css(css: str) -> str:
    """Удаляет только final-dev3 CSS marker для byte-level сверки с dev1."""

    return css.replace(CSS_MARKER_SNIPPET, "", 1)

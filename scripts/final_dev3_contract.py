"""Единый versioned-контракт отдельного кандидата final-dev3."""

from __future__ import annotations

import re


VERSION = "2.0.1"
DATE = "2026-08-13"
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
CSS_MARKER_SNIPPET = f"\n{CSS_COMMENT}\n"
HERO_BUSINESS_SCRIPT = "hero-business-hours.js"
ACTION_BAR_SCRIPT_TAG = '<script src="action-bar.js" defer></script>'
HERO_BUSINESS_SCRIPT_TAG = f'<script src="{HERO_BUSINESS_SCRIPT}" defer></script>'
HERO_BUSINESS_SCRIPT_SNIPPET = f"\n{HERO_BUSINESS_SCRIPT_TAG}"
ACTION_BAR_TOP_VISIBILITY_TOKENS = (
    "var finalDev3TopOnly = document.body.classList.contains('page--final-dev3');",
    "if (finalDev3TopOnly) return window.scrollY > 1;",
)


def apply_html_contract(html: str) -> str:
    """Добавляет только scoped body-class и versioned HTML marker."""

    if html.count("<body>") != 1:
        raise ValueError("final-dev3 ожидает ровно один исходный <body>")
    if MARKER in html or BODY_CLASS in html:
        raise ValueError("final-dev3 HTML contract уже применён")
    return html.replace("<body>", BODY_MARKER_SNIPPET, 1)


def apply_css_contract(css: str) -> str:
    """Добавляет только versioned CSS marker."""

    if MARKER in css:
        raise ValueError("final-dev3 CSS contract уже применён")
    return css + CSS_MARKER_SNIPPET


def apply_script_contract(html: str) -> str:
    """Подключает final-dev3 adapter строго после общего Action Bar."""

    if html.count(ACTION_BAR_SCRIPT_TAG) != 1:
        raise ValueError("final-dev3 ожидает ровно один action-bar.js")
    if HERO_BUSINESS_SCRIPT_TAG in html:
        raise ValueError("final-dev3 Hero business-hours contract уже применён")
    return html.replace(
        ACTION_BAR_SCRIPT_TAG,
        ACTION_BAR_SCRIPT_TAG + HERO_BUSINESS_SCRIPT_SNIPPET,
        1,
    )


def normalize_html(html: str) -> str:
    """Удаляет только final-dev3 HTML/script contract для сверки с dev1."""

    return html.replace(BODY_MARKER_SNIPPET, "<body>", 1).replace(
        HERO_BUSINESS_SCRIPT_SNIPPET,
        "",
        1,
    )


def normalize_css(css: str) -> str:
    """Удаляет только final-dev3 CSS contract для byte-level сверки с dev1."""

    return css.replace(CSS_MARKER_SNIPPET, "", 1)

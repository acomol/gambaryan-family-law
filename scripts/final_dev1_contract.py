"""Единый versioned-контракт layout/crop варианта final-dev1."""

from __future__ import annotations

import re


VERSION = "2.0.0"
DATE = "2026-08-11"
MARKER = f"FINAL-DEV1-HERO v{VERSION} | {DATE}"
MARKER_RE = re.compile(r"FINAL-DEV1-HERO v(\d+\.\d+\.\d+) \| (\d{4}-\d{2}-\d{2})")

REFERENCE_PATH = "docs/design-references/final-dev1-desktop-hero-v1.0.0.png"
REFERENCE_SHA256 = "1E07C0D348AC6C61754D8B05B1FFD1A3F31C8F03B34D85749559707398BC27AB"
REFERENCE_SIZE = (1293, 724)
TASK_PATH = "docs/tasks/2026-08-10-final-dev1-desktop-hero.md"
BOARD_PATH = "docs/boards/2026-08-06-versions-links.md"

MOBILE_FALLBACK_SNIPPETS = (
    "@media (max-width: 860px) and (min-height: 600px)",
    ".hero--final-dev1 .hero__body { padding-top: 4px; }",
    """.hero--final-dev1 .hero__title {
    margin-bottom: 8px;
    padding: 8px 0 10px;
  }""",
    ".hero--final-dev1 .hero__lede { margin-bottom: 6px; }",
    ".hero--final-dev1 .hero-media { margin-bottom: 10px; }",
    """.hero--final-dev1 .hero-photo {
    display: block;
    max-height: calc(100vh - 472px);
    max-height: calc(100dvh - 472px);
  }""",
    ".hero--final-dev1 .hero__actions { margin-bottom: 10px; }",
    "@media (max-width: 379px) and (min-height: 600px)",
    "max-height: calc(100dvh - 492px);",
    "@media (min-width: 420px) and (max-width: 659px) and (min-height: 600px)",
    "max-height: calc(100dvh - 424px);",
    "@media (min-width: 660px) and (max-width: 860px) and (min-height: 600px)",
    "max-height: calc(100dvh - 402px);",
)

MOBILE_CROP_SNIPPETS = (
    "@media (max-width: 860px)",
    ".hero--final-dev1 .hero-media { overflow: hidden; }",
    """.hero--final-dev1 .hero-photo {
    transform: translateX(-7%) scale(1.15);
    transform-origin: 50% 22%;
  }""",
)

DESKTOP_READABILITY_SNIPPETS = (
    "padding-bottom: 26px;",
    """.hero--final-dev1 .hero__contact-block {
    box-sizing: border-box;
    width: 100%;
    max-width: 560px;""",
    ".hero--final-dev1 .hero__call-num { font-size: 22px; }",
    """.hero--final-dev1 .hero__note {
    max-width: 640px;
    font-size: 13px;
    line-height: 1.5;""",
)

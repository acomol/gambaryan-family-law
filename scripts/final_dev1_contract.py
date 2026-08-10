"""Единый versioned-контракт desktop Hero варианта final-dev1."""

from __future__ import annotations

import re


VERSION = "1.2.0"
DATE = "2026-08-10"
MARKER = f"FINAL-DEV1-HERO v{VERSION} | {DATE}"
MARKER_RE = re.compile(r"FINAL-DEV1-HERO v(\d+\.\d+\.\d+) \| (\d{4}-\d{2}-\d{2})")

REFERENCE_PATH = "docs/design-references/final-dev1-desktop-hero-v1.0.0.png"
REFERENCE_SHA256 = "1E07C0D348AC6C61754D8B05B1FFD1A3F31C8F03B34D85749559707398BC27AB"
REFERENCE_SIZE = (1293, 724)
TASK_PATH = "docs/tasks/2026-08-10-final-dev1-desktop-hero.md"
BOARD_PATH = "docs/boards/2026-08-06-versions-links.md"

MOBILE_FALLBACK_SNIPPETS = (
    """.hero--final-dev1 .hero__proofs,
  .hero--final-dev1 .hero__call-label--desktop,
  .hero--final-dev1 .hero__call-help { display: none; }""",
    ".hero--final-dev1 .hero__call-label--compact { display: inline; }",
    """.hero--final-dev1 .hero__call-icon,
  .hero--final-dev1 .hero__call-copy { display: contents; }""",
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
    max-height: calc(100vh - 432px);
    max-height: calc(100dvh - 432px);
  }""",
    ".hero--final-dev1 .hero__actions { margin-bottom: 10px; }",
    "@media (min-width: 420px) and (max-width: 659px) and (min-height: 600px)",
    "max-height: calc(100dvh - 396px);",
    "@media (min-width: 660px) and (max-width: 860px) and (min-height: 600px)",
    "max-height: calc(100dvh - 374px);",
)

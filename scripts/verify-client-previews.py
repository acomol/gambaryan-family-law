#!/usr/bin/env python3
"""Проверяет Action Bar во всех артефактах клиентской Preview-карты."""

from __future__ import annotations

import hashlib
import json
import re
import struct
import sys
from pathlib import Path

from action_bar_addon import (
    CLIENT_PREVIEW_DATE,
    CLIENT_PREVIEW_VERSION,
    SPEC_DATE,
    SPEC_VERSION,
    verify_action_bar_install,
)
from final_dev1_contract import (
    BOARD_PATH,
    DATE as FINAL_DEV1_DATE,
    DESKTOP_READABILITY_SNIPPETS,
    MARKER as FINAL_DEV1_MARKER,
    MOBILE_CROP_SNIPPETS,
    MOBILE_FALLBACK_SNIPPETS,
    PRECEDENT_COPY_CSS_SNIPPET,
    PRECEDENT_COPY_DATE,
    PRECEDENT_COPY_MARKER,
    PRECEDENT_COPY_SNIPPETS,
    PRECEDENT_COPY_VERSION,
    REFERENCE_PATH,
    REFERENCE_SHA256,
    REFERENCE_SIZE,
    TASK_PATH,
    VERSION as FINAL_DEV1_VERSION,
)


ROOT = Path(__file__).resolve().parent.parent
MAP_PATH = ROOT / "scripts" / "client-preview-map.json"
MAP_VERSION = "2.3.0"
MAP_DATE = "2026-08-11"

EXPECTED_PREVIEWS = {
    "final-dev": "build/variants/action-bar",
    "final-dev1": "build/variants/final-dev1",
    "v1-playfair-onest": "build/font-variants/v1-playfair-onest",
    "v2-lora-inter": "build/font-variants/v2-lora-inter",
    "v3-literata-manrope": "build/font-variants/v3-literata-manrope",
    "v4-ptserif-golos": "build/font-variants/v4-ptserif-golos",
    "hero-a-actions-first": "build/variants/hero-a-actions-first",
    "hero-b-call-first": "build/variants/hero-b-call-first",
    "action-bar": "build/variants/action-bar",
    "review-numbered": "build/variants/review-numbered",
}


def verify_final_dev1(dest: Path) -> list[str]:
    """Проверяет отдельный desktop Hero-контракт final-dev1."""
    problems: list[str] = []
    html = (dest / "index.html").read_text(encoding="utf-8")
    css = (dest / "styles.css").read_text(encoding="utf-8")
    hero_match = re.search(r'<section[^>]*id="top".*?</section>', html, re.S)
    if not hero_match:
        return ["секция Hero не найдена"]
    hero = hero_match.group(0)
    marker = FINAL_DEV1_MARKER

    if marker not in hero or marker not in css:
        problems.append("version/date marker FINAL-DEV1-HERO расходится с контрактом")
    if 'class="hero hero--final-dev1"' not in hero:
        problems.append("Hero не изолирован классом hero--final-dev1")
    if 'class="site-header site-header--final-dev1"' not in html:
        problems.append("шапка final-dev1 не имеет изолирующего класса")
    if 'class="nav-call"' in html:
        problems.append("дублирующий desktop-телефон .nav-call остался в шапке")
    if 'class="nav-drawer__call"' not in html:
        problems.append("из мобильного меню пропал звонок")
    if html.count(PRECEDENT_COPY_MARKER) != 1:
        problems.append("version/date marker FINAL-DEV1-PRECEDENT-COPY отсутствует")
    for snippet in PRECEDENT_COPY_SNIPPETS:
        if html.count(snippet) != 1:
            problems.append("утверждённая редакция блока прецедента повреждена")
    if PRECEDENT_COPY_CSS_SNIPPET not in css:
        problems.append("mobile-переносы текста прецедента не защищены")
    hero_phone_count = len(re.findall(r'class="[^"]*\bhero__phone\b[^"]*"', hero))
    if hero_phone_count != 1 or hero.count('class="hero__phone hero__contact-block"') != 1:
        problems.append("должен быть ровно один sentinel .hero__phone")
    if hero.count('<li class="hero__proof">') != 3:
        problems.append("должно быть ровно три преимущества с иконками")
    order_tokens = (
        'class="hero__actions"',
        'class="hero__phone hero__contact-block"',
        'class="hero__proofs"',
        'class="hero__note"',
    )
    order_positions = [hero.find(token) for token in order_tokens]
    if any(position < 0 for position in order_positions) or order_positions != sorted(order_positions):
        problems.append("ожидался DOM-порядок CTA → звонок → иконки → пояснение")

    marker_text = f"/* {FINAL_DEV1_MARKER}"
    variant_css_position = css.rfind(marker_text)
    variant_css = css[variant_css_position:] if variant_css_position >= 0 else ""
    if (
        "@media (min-width: 961px)" not in variant_css
        or ".site-header--final-dev1 .site-header__bar" not in variant_css
    ):
        problems.append("desktop-композиция final-dev1 должна начинаться с 961px")
    if (
        "@media (max-width: 960px)" not in variant_css
        or any(
            snippet not in variant_css
            for snippet in (
                *MOBILE_FALLBACK_SNIPPETS,
                *MOBILE_CROP_SNIPPETS,
                *DESKTOP_READABILITY_SNIPPETS,
            )
        )
    ):
        problems.append("mobile crop, fallback или desktop readability final-dev1 неполны")
    return problems


def verify_final_dev1_sources() -> list[str]:
    """Связывает versioned reference и task с единым контрактом."""
    problems: list[str] = []
    task_path = ROOT / TASK_PATH
    board_path = ROOT / BOARD_PATH
    reference_path = ROOT / REFERENCE_PATH

    task_text = task_path.read_text(encoding="utf-8") if task_path.exists() else ""
    task_header = "\n".join(task_text.splitlines()[:12])
    if f"**Версия:** `FINAL-DEV1-HERO v{FINAL_DEV1_VERSION}`" not in task_header:
        problems.append("metadata версии final-dev1 task расходится с контрактом")
    if f"**Дата:** `{FINAL_DEV1_DATE}`" not in task_header:
        problems.append("metadata даты final-dev1 task расходится с контрактом")
    if f"`{PRECEDENT_COPY_MARKER}`" not in task_text:
        problems.append("metadata текста прецедента отсутствует в final-dev1 task")
    if REFERENCE_SHA256 not in task_text:
        problems.append("final-dev1 task не содержит SHA-256 текущего reference")
    if f"{REFERENCE_SIZE[0]}×{REFERENCE_SIZE[1]}" not in task_text:
        problems.append("final-dev1 task не содержит размер текущего reference")

    board_text = board_path.read_text(encoding="utf-8") if board_path.exists() else ""
    board_contract = (
        f"| Desktop Hero `final-dev1` | `{FINAL_DEV1_VERSION}` | {FINAL_DEV1_DATE} |"
    )
    if board_contract not in board_text:
        problems.append("карта Preview не содержит текущую версию/дату final-dev1")
    precedent_board_contract = (
        f"| Текст прецедента `final-dev1` | `{PRECEDENT_COPY_VERSION}` | "
        f"{PRECEDENT_COPY_DATE} |"
    )
    if precedent_board_contract not in board_text:
        problems.append("карта Preview не содержит версию/дату текста прецедента")
    if not reference_path.exists():
        return problems + ["versioned reference PNG final-dev1 не найден"]

    data = reference_path.read_bytes()
    digest = hashlib.sha256(data).hexdigest().upper()
    if digest != REFERENCE_SHA256:
        problems.append("SHA-256 reference PNG final-dev1 не совпадает с контрактом")
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n":
        problems.append("reference final-dev1 не является PNG")
    else:
        dimensions = struct.unpack(">II", data[16:24])
        if dimensions != REFERENCE_SIZE:
            problems.append(
                f"ожидался reference {REFERENCE_SIZE[0]}×{REFERENCE_SIZE[1]}, "
                f"получен {dimensions[0]}×{dimensions[1]}"
            )
    return problems


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")

    manifest = json.loads(MAP_PATH.read_text(encoding="utf-8"))
    problems: list[str] = []
    previews = manifest.get("previews", [])
    problems.extend(verify_final_dev1_sources())

    if manifest.get("version") != MAP_VERSION:
        problems.append(f"ожидалась Preview-карта v{MAP_VERSION}")
    if manifest.get("updated") != MAP_DATE:
        problems.append(f"ожидалась дата Preview-карты {MAP_DATE}")
    if manifest.get("action_bar_version") != SPEC_VERSION:
        problems.append("версия Action Bar в Preview-карте расходится с addon")
    if manifest.get("action_bar_updated") != SPEC_DATE:
        problems.append("дата Action Bar в Preview-карте расходится с addon")
    if manifest.get("client_preview_mobile_version") != CLIENT_PREVIEW_VERSION:
        problems.append("версия mobile-композиции расходится с addon")
    if manifest.get("client_preview_mobile_updated") != CLIENT_PREVIEW_DATE:
        problems.append("дата mobile-композиции расходится с addon")
    if len(previews) != len(EXPECTED_PREVIEWS):
        problems.append(
            f"в карте должно быть {len(EXPECTED_PREVIEWS)} Preview, найдено {len(previews)}"
        )
    branches = [item.get("branch") for item in previews]
    if len(set(branches)) != len(branches):
        problems.append("в карте есть повторяющиеся Preview-ветки")
    actual_previews = {item.get("branch"): item.get("directory") for item in previews}
    if actual_previews != EXPECTED_PREVIEWS:
        problems.append("набор branch → directory не совпадает с клиентским контрактом")

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
        html = (dest / "index.html").read_text(encoding="utf-8")
        styles = (dest / "styles.css").read_text(encoding="utf-8")
        if branch == "hero-a-actions-first" and 'class="hero hero--actions-first"' not in html:
            problems.append(f"{branch}: нет изолирующего класса Hero A")
        if branch == "hero-b-call-first" and 'class="hero hero--call-first"' not in html:
            problems.append(f"{branch}: нет изолирующего класса Hero B")
        if branch == "v2-lora-inter" and "FONT-VARIANT-V2-MOBILE v1.0.0 | 2026-08-11" not in styles:
            problems.append(f"{branch}: нет mobile overflow-fix")
        if branch == "review-numbered":
            labels = re.findall(r'data-rvn="([^"]+)"', html)
            if len(labels) != 102 or len(set(labels)) != 102:
                problems.append(f"{branch}: ожидалось 102 уникальных номера")
            if "REVIEW-NUMBERED v1.0.0 | 2026-08-11" not in styles:
                problems.append(f"{branch}: нет versioned mobile overflow-fix")
        if branch == "final-dev1":
            problems.extend(f"{branch}: {problem}" for problem in verify_final_dev1(dest))

    if problems:
        print("ПРОВЕРКА НЕ ПРОЙДЕНА:")
        for problem in problems:
            print("  ✗", problem)
        return 1

    print(
        f"PASS: Preview-карта v{MAP_VERSION} | {MAP_DATE}; Action Bar "
        f"v{SPEC_VERSION} | {SPEC_DATE}; Client Preview Mobile "
        f"v{CLIENT_PREVIEW_VERSION} | {CLIENT_PREVIEW_DATE} присутствуют во всех "
        f"{len(EXPECTED_PREVIEWS)} клиентских Preview-артефактах."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

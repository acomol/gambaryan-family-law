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
CLIENT_PREVIEW_ADDON = ROOT / "site-addons" / "client-preview"
SPEC_VERSION = "2.4.0"
SPEC_DATE = "2026-08-17"
CLIENT_PREVIEW_VERSION = "1.1.0"
CLIENT_PREVIEW_DATE = "2026-08-11"
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
    shutil.copy(CLIENT_PREVIEW_ADDON / "client-preview.css", dest / "client-preview.css")

    markup = (ADDON / "action-bar.html").read_text(encoding="utf-8").strip()
    stylesheet = '<link rel="stylesheet" href="styles.css">'
    if html.count(stylesheet) != 1:
        raise SystemExit(f"{dest}: ожидалась одна ссылка на styles.css")
    html = html.replace(
        stylesheet,
        stylesheet
        + '\n<link rel="stylesheet" href="client-preview.css">'
        + '\n<link rel="stylesheet" href="action-bar.css">',
        1,
    )

    if 'rel="icon"' not in html:
        html = html.replace(
            stylesheet,
            '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 64 64%27%3E%3Crect width=%2764%27 height=%2764%27 rx=%2712%27 fill=%27%23101214%27/%3E%3Cpath d=%27M12 32h40M32 12v40%27 stroke=%27%23f0ae1f%27 stroke-width=%276%27/%3E%3C/svg%3E">\n'
            + stylesheet,
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

    preview_css_path = dest / "client-preview.css"
    if not preview_css_path.exists():
        problems.append("client-preview.css не скопирован в клиентскую сборку")
    else:
        preview_css = preview_css_path.read_text(encoding="utf-8")
        if preview_css_path.read_bytes() != (CLIENT_PREVIEW_ADDON / "client-preview.css").read_bytes():
            problems.append("client-preview.css расходится с единым источником")
        preview_marker = f"CLIENT-PREVIEW-MOBILE v{CLIENT_PREVIEW_VERSION} | {CLIENT_PREVIEW_DATE}"
        if preview_marker not in preview_css:
            problems.append(f"в client-preview.css нет маркера {preview_marker}")
        if html.count('href="client-preview.css"') != 1:
            problems.append("client-preview.css должен быть подключён ровно один раз")

    if html.count('rel="icon"') != 1:
        problems.append("в клиентском Preview должен быть один favicon")

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

    schedule_tokens = (
        "timeZone: 'Asia/Jerusalem'",
        "openWeekdays: { Sun: true, Mon: true, Tue: true, Wed: true, Thu: true }",
        "openMinute: 9 * 60",
        "closeMinute: 18 * 60",
        "current.minute >= BUSINESS_HOURS.openMinute",
        "current.minute < BUSINESS_HOURS.closeMinute",
    )
    if any(token not in js for token in schedule_tokens):
        problems.append("карта рабочего времени вс–чт 09:00–18:00 неполна")
    if html.count('data-business-state="pending"') != 1:
        problems.append("Action Bar должен начинать с одного pending business-state")
    if html.count('data-business-action="phone"') != 1:
        problems.append("телефон должен быть единственным business-only действием")
    if html.count('data-business-action="booking"') != 1:
        problems.append("не найдено действие «Записаться»")
    if html.count('data-business-label="whatsapp"') != 1:
        problems.append("не найден переключаемый label WhatsApp")
    if "?text=" in html:
        problems.append("WhatsApp не должен содержать неутверждённый prefill")
    if len(re.findall(r'<button\b(?=[^>]*\bdata-business-demo(?:\s|=))(?=[^>]*\bhidden\b)[^>]*>', html)) != 1:
        problems.append("нужен один скрытый до инициализации demo-switch")
    if html.count('role="switch"') != 1:
        problems.append("demo-control должен быть доступным переключателем")
    if html.count('aria-label="Рабочее время"') != 1:
        problems.append("demo-switch должен иметь стабильное доступное имя")
    if html.count("data-business-demo-status") != 1:
        problems.append("не найден видимый статус Авто/Демо")
    if html.count("data-business-demo-state") != 1:
        problems.append("не найден видимый статус рабочего/нерабочего времени")
    if "Написать в WhatsApp" not in js:
        problems.append("нет точного нерабочего label «Написать в WhatsApp»")
    demo_tokens = (
        "var demoBusinessState = null",
        "demoBusinessState ||",
        "demoLabel: 'Рабочее время'",
        "demoLabel: 'Нерабочее время'",
        "demoStateLabel.textContent = businessState.demoLabel",
        "demoToggle.addEventListener('click'",
        "demoToggle.setAttribute('aria-checked'",
        "demoToggle.hidden = hidden",
    )
    if any(token not in js for token in demo_tokens):
        problems.append("demo-switch не управляет обоими состояниями панели")
    css = sources.get("action-bar.css", "")
    if 'data-business-state="closed"' not in css or "repeat(2, minmax(0, 1fr))" not in css:
        problems.append("нерабочее состояние должно иметь две равные колонки")
    if ".mobile-bar__item[hidden]" not in css:
        problems.append("скрытый телефон должен удаляться из layout")
    if ".mobile-bar-demo:not([hidden])" not in css:
        problems.append("demo-switch должен показываться только на mobile Preview")
    if not re.search(r"@media\s*\(max-width:\s*960px\)\s*and\s*\(max-height:\s*400px\)[\s\S]*?\.mobile-bar-demo:not\(\[hidden\]\)[\s\S]*?position:\s*static", css):
        problems.append("demo-switch должен оставаться доступным в landscape")

    return problems

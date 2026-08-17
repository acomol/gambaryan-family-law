#!/usr/bin/env python3
"""Читает ЖИВЫЕ Preview и доказывает, что на них уехал текущий релиз.

LIVE-PREVIEW-READBACK v1.0.0 | 2026-08-16

Зачем отдельно от verify-client-previews.py: тот проверяет собранные
каталоги на диске. Здесь проверяются байты, которые реально отдаёт
Cloudflare. Между «собрано» и «опубликовано» лежит деплой, а он молчаливо
проваливается: wrangler на части предупреждений выходит с кодом 0
(docs/FINAL-QA-CHECKLIST.md, OPEN), и отсутствующий ассет Cloudflare отдаёт
как 200 с ``content-type: text/html``.

Запуск:
    python -B scripts/verify-live-previews.py
    python -B scripts/verify-live-previews.py --only final-dev3

Выход 0 — все проверки прошли. Иначе 1 и перечень расхождений.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

READBACK_VERSION = "1.1.0"
ROOT = Path(__file__).resolve().parent.parent
MAP_PATH = ROOT / "scripts" / "client-preview-map.json"
HOST = "https://{branch}.gambarian-landing.pages.dev/"
PRODUCTION = "https://gambarian-landing.pages.dev/"
TIMEOUT = 30

# review-numbered снимает &nbsp; в H1: бейджи нумерации сужают колонку и
# заголовок утягивал CTA за первый экран. Обоснование — docs/TYPOGRAPHY-DASHES.md §7.
NBSP_EXPECTED = 23
NBSP_EXPECTED_REVIEW_NUMBERED = 22

FORBIDDEN_COPY = (
    "Специализация — миграционное",
    "защита прав людей и правовые решения",
)


def fetch(url: str) -> tuple[int, str, str]:
    """Возвращает (status, content-type, body). Сетевую ошибку не глотает."""

    request = urllib.request.Request(url, headers={"User-Agent": "gambarian-readback"})
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        body = response.read().decode("utf-8", "replace")
        return response.status, response.headers.get("content-type", ""), body


def nav_font_size(styles: str) -> str | None:
    block = re.search(r"\.nav-links\s*\{(.*?)\}", styles, re.S)
    if not block:
        return None
    size = re.search(r"font-size:\s*([\d.]+px)", block.group(1))
    return size.group(1) if size else None


def check_preview(branch: str) -> list[str]:
    url = HOST.format(branch=branch)
    problems: list[str] = []

    try:
        status, content_type, page = fetch(url)
    except (urllib.error.URLError, OSError) as error:  # сеть/DNS/таймаут
        return [f"{branch}: страница недоступна ({error})"]

    if status != 200:
        problems.append(f"{branch}: HTTP {status}")
    if "text/html" not in content_type:
        problems.append(f"{branch}: content-type {content_type!r}, ожидался text/html")
    if 'content="noindex"' not in page:
        problems.append(f"{branch}: пропал noindex — временный адрес уйдёт в индекс")

    # 1. Тире защищено от переноса.
    expected = (
        NBSP_EXPECTED_REVIEW_NUMBERED
        if branch == "review-numbered"
        else NBSP_EXPECTED
    )
    found = page.count("&nbsp;—")
    if found != expected:
        problems.append(f"{branch}: защищённых тире {found}, ожидалось {expected}")

    # 2. Служебные довески сняты.
    for phrase in FORBIDDEN_COPY:
        if phrase in page:
            problems.append(f"{branch}: на живой странице остался старый текст {phrase!r}")

    # 3. Стили: навигация и белое «прецедента».
    href = re.search(r'<link rel="stylesheet" href="([^"]*styles[^"]*\.css)"', page)
    if not href:
        problems.append(f"{branch}: в разметке нет ссылки на styles.css")
        return problems

    try:
        status, content_type, styles = fetch(url + href.group(1))
    except (urllib.error.URLError, OSError) as error:
        return problems + [f"{branch}: styles.css недоступен ({error})"]

    # Ловушка Cloudflare: отсутствующий ассет отдаётся как 200 с HTML.
    if "text/css" not in content_type:
        return problems + [
            f"{branch}: styles.css отдан с content-type {content_type!r} — soft-404"
        ]

    size = nav_font_size(styles)
    if size != "14px":
        problems.append(f"{branch}: .nav-links font-size {size}, ожидалось 14px")

    white = re.findall(
        r'data-copy-id="2\.10"\]\s*\.fact-card__unit\s*\{[^}]*color:\s*#fff',
        styles,
        re.S,
    )
    if len(white) != 2:
        problems.append(
            f"{branch}: белое «прецедента» найдено в {len(white)} медиаблоках из 2"
        )

    return problems


def check_production() -> list[str]:
    """Боевой адрес меняться не должен — релиз только на Preview."""

    try:
        status, _, page = fetch(PRODUCTION)
    except (urllib.error.URLError, OSError) as error:
        return [f"production: недоступен ({error})"]

    problems: list[str] = []
    if status != 200:
        problems.append(f"production: HTTP {status}")
    if 'content="noindex"' not in page:
        problems.append("production: пропал noindex")
    if "&nbsp;—" in page:
        problems.append("production: релиз уехал на боевой адрес — этого не заказывали")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", help="проверить один branch alias")
    args = parser.parse_args()

    previews = json.loads(MAP_PATH.read_text(encoding="utf-8"))["previews"]
    branches = [p["branch"] for p in previews]
    # final-dev и action-bar делят каталог, но это разные живые адреса.
    if args.only:
        if args.only not in branches:
            print(f"Неизвестный alias {args.only!r}. Известные: {', '.join(branches)}")
            return 2
        branches = [args.only]

    problems: list[str] = []
    for branch in branches:
        found = check_preview(branch)
        print(f"{'FAIL' if found else 'PASS'}  {branch}")
        for item in found:
            print(f"        {item}")
        problems.extend(found)

    # Боевой адрес проверяется ВСЕГДА, в том числе при --only. Раньше эта
    # проверка пропускалась именно в узком режиме — то есть страховка
    # отключалась там, где публикуют точечно и глазами не смотрят.
    found = check_production()
    print(f"{'FAIL' if found else 'PASS'}  production (не должен измениться)")
    for item in found:
        print(f"        {item}")
    problems.extend(found)

    print()
    if problems:
        print(f"FAIL LIVE-PREVIEW-READBACK v{READBACK_VERSION}: {len(problems)} расхождений")
        return 1
    print(
        f"PASS LIVE-PREVIEW-READBACK v{READBACK_VERSION}: "
        f"{len(branches)} Preview отдают текущий релиз; боевой адрес не изменён"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

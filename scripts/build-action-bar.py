#!/usr/bin/env python3
"""Собирает канонический клиентский вариант с мобильной панелью действий.

Панель — это надстройка: в site/ её нет и боевая версия остаётся нетронутой.
Сборка копирует site/, подкладывает три файла из site-addons/action-bar/ и
подключает их в index.html. Один полученный артефакт публикуется на Preview
ветки final-dev и action-bar; остальные генераторы используют тот же addon.

Фактическая высота панели замеряется в браузере и подставляется в CSS-токен
--mobile-bar-h: считать её из padding и кегля нельзя, потому что глобального
box-sizing: border-box в проекте намеренно нет.

    python scripts/build-action-bar.py
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

from action_bar_addon import (
    ADDON,
    SPEC_MARKER_RE,
    install_action_bar,
    verify_action_bar_install,
)

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
DEST = ROOT / "build" / "variants" / "action-bar"


def build() -> Path:
    if DEST.exists():
        shutil.rmtree(DEST)
    DEST.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(SITE, DEST)
    install_action_bar(DEST)

    html = (DEST / "index.html").read_text(encoding="utf-8")
    html = html.replace("<title>", "<!-- вариант: мобильная панель действий -->\n<title>", 1)
    (DEST / "index.html").write_text(html, encoding="utf-8")
    return DEST


def measure_and_pin(dest: Path) -> int:
    """Замеряет высоту панели в браузере и фиксирует её в CSS."""
    css = (dest / "action-bar.css").read_text(encoding="utf-8")
    if "--mobile-bar-h" not in css.split("@media", 1)[0]:
        raise SystemExit("--mobile-bar-h должен быть объявлен в исходном action-bar.css")

    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise SystemExit("для замера панели нужен Python Playwright") from exc

    srv = subprocess.Popen([sys.executable, "-m", "http.server", "8097"],
                           cwd=dest, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        with sync_playwright() as playwright:
            bundled_chrome = Path("/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
            launch_options = (
                {"executable_path": str(bundled_chrome)}
                if bundled_chrome.exists()
                else {"channel": "chrome"}
            )
            browser = playwright.chromium.launch(**launch_options)
            try:
                page = browser.new_page(viewport={"width": 390, "height": 844})
                page.goto("http://127.0.0.1:8097/", wait_until="networkidle", timeout=180_000)
                height = page.locator(".mobile-bar").evaluate(
                    "el => Math.round(el.getBoundingClientRect().height)"
                )
            finally:
                browser.close()
    finally:
        srv.terminate()
        try:
            srv.wait(timeout=5)
        except subprocess.TimeoutExpired:
            srv.kill()

    css = (dest / "action-bar.css").read_text(encoding="utf-8")
    pinned_css = re.sub(r"--mobile-bar-h:\s*\d+px;", f"--mobile-bar-h: {height}px;", css)
    if pinned_css != css:
        (dest / "action-bar.css").write_text(pinned_css, encoding="utf-8")
    return height


def verify(dest: Path, height: int) -> list[str]:
    problems = verify_action_bar_install(dest)
    html = (dest / "index.html").read_text(encoding="utf-8")
    css = (dest / "action-bar.css").read_text(encoding="utf-8")
    js = (dest / "action-bar.js").read_text(encoding="utf-8")
    source_css = (ADDON / "action-bar.css").read_text(encoding="utf-8")

    spec_sources = {
        "action-bar.html": html,
        "action-bar.css": css,
        "action-bar.js": js,
    }
    spec_markers = {name: SPEC_MARKER_RE.search(text) for name, text in spec_sources.items()}
    if not all(spec_markers.values()):
        problems.append("во всех файлах Action Bar нужны версия и дата ACTION-BAR-SPEC")
    elif len({match.groups() for match in spec_markers.values() if match}) != 1:
        problems.append("версия и дата ACTION-BAR-SPEC расходятся между HTML, CSS и JS")

    if len(re.findall(r'<nav\s+class="[^"]*\bmobile-bar\b[^"]*"', html)) != 1:
        problems.append("панель должна встречаться в разметке ровно один раз")
    if 'href="#contact"' not in html:
        problems.append("якорь #contact не найден в панели")
    if 'id="contact"' not in html:
        problems.append("на странице нет id=contact — кнопка «Записаться» никуда не ведёт")
    autofill_fields = {
        "name": ("text", "name"),
        "phone": ("tel", "tel"),
        "email": ("email", "email"),
    }
    for field_name, (field_type, autocomplete) in autofill_fields.items():
        autofill_pattern = (
            rf'<input\b(?=[^>]*\bname="{field_name}")'
            rf'(?=[^>]*\btype="{field_type}")'
            rf'(?=[^>]*\bautocomplete="{autocomplete}")[^>]*>'
        )
        if not re.search(autofill_pattern, html):
            problems.append(f"поле {field_name} не готово к автозаполнению")
    for name in ("action-bar.css", "action-bar.js"):
        if name not in html:
            problems.append(f"{name} не подключён в index.html")
        if not (dest / name).exists():
            problems.append(f"{name} не скопирован в сборку")
    if "wa.me/972545490623" not in html:
        problems.append("номер WhatsApp должен быть без плюса и пробелов")
    if "?text=" not in html:
        problems.append("у WhatsApp нет предзаполненного текста")
    if "tel:+972545490623" not in html:
        problems.append("телефон в tel: не найден")
    if "viewport-fit=cover" not in html:
        problems.append("в собранном viewport нет viewport-fit=cover")
    item_starts = [match.start() for match in re.finditer(r'<a class="[^"]*mobile-bar__item', html)]
    cta_position = html.find("mobile-bar__item--cta")
    if len(item_starts) != 3 or not item_starts[1] <= cta_position < item_starts[2]:
        problems.append("центральная ячейка панели должна быть CTA «Записаться»")
    if f"--mobile-bar-h: {height}px" not in css:
        problems.append("замеренная высота не подставлена в CSS")
    if not re.search(r":root\s*\{[^}]*--mobile-bar-h:\s*60px;", source_css, re.S):
        problems.append("--mobile-bar-h: 60px должен быть объявлен в исходном CSS")
    if "env(safe-area-inset-bottom)" not in css:
        problems.append("нет учёта жестовой полосы iPhone")
    if "scroll-padding-bottom" not in css:
        problems.append("нет scroll-padding-bottom для фокуса и якорей")
    if "visibility" not in css:
        problems.append("скрытое состояние не управляет visibility")
    if not re.search(r"@media\s*\(max-height:\s*400px\)[\s\S]*?position:\s*static", css):
        problems.append("нет статичной панели при высоте экрана до 400px")
    if "z-index: 40" not in css:
        problems.append("панель должна лежать ниже шапки (z-index 50)")
    if "max-width: 960px" not in css:
        problems.append("брейкпойнт должен совпадать с появлением бургера (960px)")
    if "pointer-events: none" not in css:
        problems.append("спрятанная панель обязана не принимать клики")
    if re.search(r"addEventListener\s*\(\s*['\"]scroll['\"]", js):
        problems.append("в JS не должно быть scroll-listener")
    if "scrollend" not in js or "hashchange" not in js:
        problems.append("нет ресинхронизации после мгновенного якорного перехода")
    if js.count("new IntersectionObserver") != 2:
        problems.append("в JS должно быть ровно два IntersectionObserver")
    if "inert" not in js:
        problems.append("скрытое состояние не управляет inert")
    return problems


def main() -> int:
    dest = build()
    height = measure_and_pin(dest)
    print(f"Панель собрана: {dest.relative_to(ROOT)}")
    print(f"Замеренная высота панели: {height}px (компенсация у body — столько же + safe-area)")
    problems = verify(dest, height)
    if problems:
        print("ПРОВЕРКА НЕ ПРОЙДЕНА:")
        for p in problems:
            print("  ✗", p)
        return 1
    print("Проверка пройдена: разметка, подключение, контакты, слои и защита кликов на месте.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

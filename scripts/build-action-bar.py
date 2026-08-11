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


def measure_and_pin(dest: Path) -> tuple[int, dict[str, int], dict[str, object]]:
    """Замеряет оба временных состояния панели и фиксирует максимальную высоту."""
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
                state_heights = page.locator(".mobile-bar").evaluate(
                    """el => {
                      const phone = el.querySelector('[data-business-action="phone"]');
                      const whatsapp = el.querySelector('[data-business-label="whatsapp"]');
                      const measure = (state, phoneVisible, label) => {
                        el.setAttribute('data-business-state', state);
                        phone.hidden = !phoneVisible;
                        whatsapp.textContent = label;
                        return Math.round(el.getBoundingClientRect().height);
                      };
                      return {
                        open: measure('open', true, 'WhatsApp'),
                        closed: measure('closed', false, 'Написать в WhatsApp')
                      };
                    }"""
                )

                page.goto(
                    "http://127.0.0.1:8097/?qa=demo-switch#services",
                    wait_until="networkidle",
                    timeout=180_000,
                )
                demo = page.locator("[data-business-demo]")
                demo.wait_for(state="visible", timeout=5_000)

                def read_demo(current_page) -> dict[str, object]:
                    return current_page.evaluate(
                        """() => {
                          const bar = document.querySelector('.mobile-bar');
                          const control = document.querySelector('[data-business-demo]');
                          return {
                            state: bar.dataset.businessState,
                            mode: control.dataset.demoMode,
                            checked: control.getAttribute('aria-checked'),
                            accessibleName: control.getAttribute('aria-label'),
                            statusLabel: control.querySelector('[data-business-demo-status]').textContent.trim(),
                            stateLabel: control.querySelector('[data-business-demo-state]').textContent.trim(),
                            url: location.href,
                            dataLayerLength: (window.dataLayer || []).length,
                            storage: JSON.stringify({
                              local: Object.entries(localStorage),
                              session: Object.entries(sessionStorage)
                            }),
                            targetHeight: Math.round(control.getBoundingClientRect().height)
                          };
                        }"""
                    )

                demo_initial = read_demo(page)
                demo.click()
                demo_first = read_demo(page)
                page.evaluate(
                    """() => {
                      window.dispatchEvent(new Event('focus'));
                      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
                    }"""
                )
                demo_after_lifecycle = read_demo(page)
                demo.click()
                demo_second = read_demo(page)
                page.reload(wait_until="networkidle", timeout=180_000)
                demo_after_reload = read_demo(page)

                def read_fixed_pair(instant: str) -> tuple[dict[str, object], dict[str, object]]:
                    fixed_page = browser.new_page(viewport={"width": 390, "height": 844})
                    try:
                        fixed_page.add_init_script(
                            script=f"""
                              (() => {{
                                const OriginalDate = Date;
                                const fixedNow = OriginalDate.parse('{instant}');
                                class FixedDate extends OriginalDate {{
                                  constructor(...args) {{
                                    super(...(args.length ? args : [fixedNow]));
                                  }}
                                  static now() {{ return fixedNow; }}
                                }}
                                window.Date = FixedDate;
                              }})();
                            """
                        )
                        fixed_page.goto(
                            "http://127.0.0.1:8097/?qa=demo-switch#services",
                            wait_until="networkidle",
                            timeout=180_000,
                        )
                        fixed_demo = fixed_page.locator("[data-business-demo]")
                        fixed_demo.wait_for(state="visible", timeout=5_000)
                        automatic = read_demo(fixed_page)
                        fixed_demo.click()
                        manual = read_demo(fixed_page)
                        return automatic, manual
                    finally:
                        fixed_page.close()

                auto_open, demo_closed = read_fixed_pair("2026-01-05T08:00:00Z")
                auto_closed, demo_open = read_fixed_pair("2026-01-09T08:00:00Z")
                demo_results = {
                    "initial": demo_initial,
                    "first": demo_first,
                    "after_lifecycle": demo_after_lifecycle,
                    "second": demo_second,
                    "after_reload": demo_after_reload,
                    "label_matrix": {
                        "auto_open": auto_open,
                        "auto_closed": auto_closed,
                        "demo_open": demo_open,
                        "demo_closed": demo_closed,
                    },
                }
            finally:
                browser.close()
    finally:
        srv.terminate()
        try:
            srv.wait(timeout=5)
        except subprocess.TimeoutExpired:
            srv.kill()

    height = max(state_heights.values())
    css = (dest / "action-bar.css").read_text(encoding="utf-8")
    pinned_css = re.sub(r"--mobile-bar-h:\s*\d+px;", f"--mobile-bar-h: {height}px;", css)
    if pinned_css != css:
        (dest / "action-bar.css").write_text(pinned_css, encoding="utf-8")
    return height, state_heights, demo_results


def verify(
    dest: Path,
    height: int,
    state_heights: dict[str, int],
    demo_results: dict[str, object],
) -> list[str]:
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
    if html.count('data-business-action="phone"') != 1:
        problems.append("телефон должен скрываться вне рабочего времени")
    if html.count('data-business-label="whatsapp"') != 1:
        problems.append("не найден label WhatsApp для нерабочего состояния")
    if len(re.findall(r'<button\b(?=[^>]*\bdata-business-demo(?:\s|=))(?=[^>]*\bhidden\b)[^>]*>', html)) != 1:
        problems.append("не найден preview demo-switch")
    if (
        html.count('aria-label="Рабочее время"') != 1
        or html.count("data-business-demo-status") != 1
        or html.count("data-business-demo-state") != 1
    ):
        problems.append("demo-switch должен иметь стабильное имя и статус Авто/Демо")
    business_label_tokens = (
        "demoLabel: 'Рабочее время'",
        "demoLabel: 'Нерабочее время'",
        "demoStateLabel.textContent = businessState.demoLabel",
    )
    if (
        "demoBusinessState" not in js
        or "aria-checked" not in js
        or any(token not in js for token in business_label_tokens)
    ):
        problems.append("demo-switch не переключает рабочее/нерабочее состояние")
    if ".mobile-bar-demo:not([hidden])" not in css:
        problems.append("demo-switch не ограничен мобильным Preview")
    if not re.search(r"@media\s*\(max-width:\s*960px\)\s*and\s*\(max-height:\s*400px\)[\s\S]*?\.mobile-bar-demo:not\(\[hidden\]\)[\s\S]*?position:\s*static", css):
        problems.append("demo-switch должен оставаться доступным в landscape")
    if 'data-business-state="closed"' not in css:
        problems.append("в CSS нет двухколоночного нерабочего состояния")
    if state_heights != {"open": 60, "closed": 60}:
        problems.append(
            "оба временных состояния должны иметь высоту 60px, получено "
            f"open={state_heights.get('open')}px, closed={state_heights.get('closed')}px"
        )
    demo_initial = demo_results["initial"]
    demo_first = demo_results["first"]
    demo_after_lifecycle = demo_results["after_lifecycle"]
    demo_second = demo_results["second"]
    demo_after_reload = demo_results["after_reload"]
    label_matrix = demo_results["label_matrix"]
    if demo_initial["mode"] != "auto" or demo_after_reload["mode"] != "auto":
        problems.append("demo-switch должен начинать с auto после загрузки/reload")
    if demo_first["mode"] != "manual" or demo_first["state"] == demo_initial["state"]:
        problems.append("первый клик demo-switch не включил противоположное ручное состояние")
    if demo_after_lifecycle["state"] != demo_first["state"] or demo_after_lifecycle["mode"] != "manual":
        problems.append("focus/pageshow не должны сбрасывать ручное demo-состояние")
    if demo_second["state"] != demo_initial["state"] or demo_second["mode"] != "manual":
        problems.append("повторный клик demo-switch не вернул второе состояние")
    for snapshot in (demo_initial, demo_first, demo_after_lifecycle, demo_second):
        expected_checked = str(snapshot["state"] == "open").lower()
        if snapshot["checked"] != expected_checked:
            problems.append(
                "aria-checked demo-switch не соответствует рабочему состоянию: "
                f"state={snapshot['state']}, checked={snapshot['checked']}, "
                f"ожидалось {expected_checked}"
            )
            break
        expected_label = "Рабочее время" if snapshot["state"] == "open" else "Нерабочее время"
        if snapshot["stateLabel"] != expected_label:
            problems.append(
                "видимый статус demo-switch не соответствует рабочему состоянию: "
                f"state={snapshot['state']}, label={snapshot['stateLabel']}, "
                f"ожидалось {expected_label}"
            )
            break
        expected_status = "Авто" if snapshot["mode"] == "auto" else "Демо"
        if snapshot["statusLabel"] != expected_status:
            problems.append(
                "видимый режим demo-switch не соответствует его состоянию: "
                f"mode={snapshot['mode']}, label={snapshot['statusLabel']}, "
                f"ожидалось {expected_status}"
            )
            break
        if snapshot["accessibleName"] != "Рабочее время":
            problems.append("доступное имя demo-switch должно оставаться «Рабочее время»")
            break

    expected_label_matrix = {
        "auto_open": ("auto", "open", "Авто", "Рабочее время", "true"),
        "auto_closed": ("auto", "closed", "Авто", "Нерабочее время", "false"),
        "demo_open": ("manual", "open", "Демо", "Рабочее время", "true"),
        "demo_closed": ("manual", "closed", "Демо", "Нерабочее время", "false"),
    }
    for matrix_name, expected in expected_label_matrix.items():
        snapshot = label_matrix[matrix_name]
        actual = (
            snapshot["mode"],
            snapshot["state"],
            snapshot["statusLabel"],
            snapshot["stateLabel"],
            snapshot["checked"],
        )
        if actual != expected:
            problems.append(
                f"demo-switch {matrix_name}: получено {actual}, ожидалось {expected}"
            )
        if snapshot["accessibleName"] != "Рабочее время":
            problems.append(f"demo-switch {matrix_name}: доступное имя изменилось")
    if len({snapshot["url"] for snapshot in (demo_initial, demo_first, demo_after_lifecycle, demo_second)}) != 1:
        problems.append("demo-switch не должен менять URL")
    if len({snapshot["dataLayerLength"] for snapshot in (demo_initial, demo_first, demo_after_lifecycle, demo_second)}) != 1:
        problems.append("demo-switch не должен отправлять аналитику")
    if len({snapshot["storage"] for snapshot in (demo_initial, demo_first, demo_after_lifecycle, demo_second)}) != 1:
        problems.append("demo-switch не должен менять localStorage/sessionStorage")
    for automatic_name, manual_name in (("auto_open", "demo_closed"), ("auto_closed", "demo_open")):
        automatic = label_matrix[automatic_name]
        manual = label_matrix[manual_name]
        if automatic["url"] != manual["url"]:
            problems.append(f"demo-switch {automatic_name}: клик изменил URL")
        if automatic["dataLayerLength"] != manual["dataLayerLength"]:
            problems.append(f"demo-switch {automatic_name}: клик отправил аналитику")
        if automatic["storage"] != manual["storage"]:
            problems.append(f"demo-switch {automatic_name}: клик изменил storage")
    if demo_initial["targetHeight"] < 44:
        problems.append("touch target demo-switch должен быть не ниже 44px")
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
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")

    dest = build()
    height, state_heights, demo_results = measure_and_pin(dest)
    print(f"Панель собрана: {dest.relative_to(ROOT)}")
    print(
        "Замеренная высота панели: "
        f"open={state_heights['open']}px, closed={state_heights['closed']}px "
        f"(компенсация у body — {height}px + safe-area)"
    )
    problems = verify(dest, height, state_heights, demo_results)
    if problems:
        print("ПРОВЕРКА НЕ ПРОЙДЕНА:")
        for p in problems:
            print("  ✗", p)
        return 1
    print("Проверка пройдена: разметка, подключение, контакты, слои и защита кликов на месте.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

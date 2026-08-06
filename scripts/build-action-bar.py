#!/usr/bin/env python3
"""Собирает вариант лендинга с мобильной панелью действий.

Панель — это надстройка: в site/ её нет и боевая версия остаётся нетронутой.
Сборка копирует site/, подкладывает три файла из site-addons/action-bar/ и
подключает их в index.html.

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

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
ADDON = ROOT / "site-addons" / "action-bar"
DEST = ROOT / "build" / "variants" / "action-bar"

MEASURE = """
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto(process.argv[2], { waitUntil: 'networkidle' });
const h = await p.evaluate(() => {
  const el = document.querySelector('.mobile-bar');
  el.classList.remove('is-hidden');
  return Math.round(el.getBoundingClientRect().height);
});
console.log(h);
await b.close();
"""


def build() -> Path:
    if DEST.exists():
        shutil.rmtree(DEST)
    DEST.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(SITE, DEST)

    for name in ("action-bar.css", "action-bar.js"):
        shutil.copy(ADDON / name, DEST / name)

    markup = (ADDON / "action-bar.html").read_text(encoding="utf-8").strip()
    html = (DEST / "index.html").read_text(encoding="utf-8")

    if "mobile-bar" in html:
        raise SystemExit("панель уже есть в index.html — сборка не нужна")

    html = html.replace(
        '<link rel="stylesheet" href="styles.css">',
        '<link rel="stylesheet" href="styles.css">\n<link rel="stylesheet" href="action-bar.css">',
        1,
    )
    html = html.replace("</body>", markup + '\n<script src="action-bar.js" defer></script>\n</body>', 1)
    html = html.replace("<title>", "<!-- вариант: мобильная панель действий -->\n<title>", 1)
    (DEST / "index.html").write_text(html, encoding="utf-8")
    return DEST


def measure_and_pin(dest: Path) -> int:
    """Замеряет высоту панели в браузере и фиксирует её в CSS."""
    (dest / "_measure.mjs").write_text(MEASURE, encoding="utf-8")
    # временное значение, чтобы страница отрисовалась
    css = (dest / "action-bar.css").read_text(encoding="utf-8")
    if "--mobile-bar-h" not in css.split("@media")[0]:
        css = css.replace(".mobile-bar {", ":root { --mobile-bar-h: 56px; }\n\n.mobile-bar {", 1)
        (dest / "action-bar.css").write_text(css, encoding="utf-8")

    srv = subprocess.Popen([sys.executable, "-m", "http.server", "8097"],
                           cwd=dest, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        subprocess.run(["node", "-e", "0"], check=True, capture_output=True)
        out = subprocess.run(
            ["node", str(dest / "_measure.mjs"), "http://localhost:8097/"],
            cwd=ROOT, capture_output=True, text=True, timeout=180,
        )
        if out.returncode != 0:
            raise SystemExit("замер не удался:\n" + out.stderr)
        height = int(out.stdout.strip().splitlines()[-1])
    finally:
        srv.terminate()
        (dest / "_measure.mjs").unlink(missing_ok=True)

    css = (dest / "action-bar.css").read_text(encoding="utf-8")
    css = re.sub(r"--mobile-bar-h:\s*\d+px;", f"--mobile-bar-h: {height}px;", css)
    (dest / "action-bar.css").write_text(css, encoding="utf-8")
    return height


def verify(dest: Path, height: int) -> list[str]:
    problems = []
    html = (dest / "index.html").read_text(encoding="utf-8")
    css = (dest / "action-bar.css").read_text(encoding="utf-8")
    js = (dest / "action-bar.js").read_text(encoding="utf-8")

    if html.count('class="mobile-bar"') != 1:
        problems.append("панель должна встречаться в разметке ровно один раз")
    if 'href="#contact"' not in html:
        problems.append("якорь #contact не найден в панели")
    if 'id="contact"' not in html:
        problems.append("на странице нет id=contact — кнопка «Записаться» никуда не ведёт")
    for name in ("action-bar.css", "action-bar.js"):
        if name not in html:
            problems.append(f"{name} не подключён в index.html")
        if not (dest / name).exists():
            problems.append(f"{name} не скопирован в сборку")
    if "wa.me/972545490623" not in html:
        problems.append("номер WhatsApp должен быть без плюса и пробелов")
    if "tel:+972545490623" not in html:
        problems.append("телефон в tel: не найден")
    if f"--mobile-bar-h: {height}px" not in css:
        problems.append("замеренная высота не подставлена в CSS")
    if "env(safe-area-inset-bottom)" not in css:
        problems.append("нет учёта жестовой полосы iPhone")
    if "z-index: 40" not in css:
        problems.append("панель должна лежать ниже шапки (z-index 50)")
    if "max-width: 960px" not in css:
        problems.append("брейкпойнт должен совпадать с появлением бургера (960px)")
    if "pointer-events: none" not in css:
        problems.append("спрятанная панель обязана не принимать клики")
    if "CLICK_GUARD" not in js:
        problems.append("нет защиты от клика сразу после появления панели")
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

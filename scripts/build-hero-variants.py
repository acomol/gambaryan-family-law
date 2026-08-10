#!/usr/bin/env python3
"""Собирает варианты компоновки первого экрана для сравнения вживую.

Каждый вариант — самостоятельная копия site/ с переставленной сеткой hero.
В site/ ничего не меняется: боевая версия остаётся текущей компоновкой,
которая служит точкой отсчёта.

Варианты отличаются ТОЛЬКО первым экраном. Всё остальное — текст, шрифты,
секции, контакты — идентично, чтобы сравнение было честным.

    python scripts/build-hero-variants.py          # все
    python scripts/build-hero-variants.py a b      # выборочно
"""

from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

from action_bar_addon import install_action_bar, verify_action_bar_install

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
OUT = ROOT / "build" / "variants"

MEDIA = re.compile(r'\n      <div class="hero-media">.*?</div>\n', re.S)
ACTIONS = re.compile(r'\n      <div class="hero__actions">.*?</div>\n', re.S)
PHONE = re.compile(r'\n      <p class="hero__phone">.*?</p>\n', re.S)
NOTE = re.compile(r'\n      <p class="hero__note">.*?</p>\n', re.S)

CALL_ICON = (
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 '
    '19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 '
    '2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 '
    '2.81.7A2 2 0 0 1 22 16.92z"></path></svg>'
)


def parts(html: str) -> dict:
    """Вырезает блоки hero и возвращает их вместе с очищенной разметкой."""
    got = {}
    for name, rx in (("media", MEDIA), ("actions", ACTIONS), ("phone", PHONE), ("note", NOTE)):
        m = rx.search(html)
        if not m:
            raise SystemExit(f"блок hero «{name}» не найден — разметка изменилась")
        got[name] = m.group(0)
        html = html.replace(m.group(0), f"\n<!--SLOT:{name}-->\n", 1)
    got["_html"] = html
    return got


def assemble(html: str, order: list[str], blocks: dict) -> str:
    """Собирает hero в заданном порядке, слоты подставляются по имени.

    Токены ищутся регулярным выражением с необязательными переводами строк:
    соседние блоки в исходной разметке делят один `\\n`, и после вырезания
    первого у следующего слота ведущего перевода строки уже нет.
    """
    placed = False
    for name in ("media", "actions", "phone", "note"):
        rx = re.compile(r"\n?<!--SLOT:%s-->\n?" % name)
        if not placed and name == order[0]:
            html = rx.sub(lambda _: "".join(blocks[n] for n in order), html, count=1)
            placed = True
        else:
            html = rx.sub("", html, count=1)
    if not placed:
        raise SystemExit("порядок должен начинаться с существующего блока")
    if "<!--SLOT:" in html:
        raise SystemExit("остались неподставленные слоты — проверьте порядок")
    return html


# --- Вариант A: действия сразу, фото ниже -----------------------------------

def variant_a(html: str) -> tuple[str, str]:
    b = parts(html)
    html = b["_html"]
    # Порядок сборки: слот media идёт первым в разметке, поэтому туда кладём
    # всю новую последовательность.
    html = assemble(html, ["actions", "phone", "note", "media"], b)
    css = """
/* === Вариант A: действия перед фотографией ================================
   Кадр в hero высокий: на 390px он занимает больше половины первого экрана,
   и кнопка оказывается за сгибом. Здесь действия подняты сразу под лид, а
   фотография уходит вниз — она работает как подтверждение, а не как ворота
   к кнопке. */
.hero-media { margin-top: 22px; }
@media (max-width: 860px) {
  .hero__actions { margin-top: 4px; }
  .hero-media { margin-top: 18px; margin-bottom: 0; }
}
"""
    return html, css


# --- Вариант B: звонок как главное действие ---------------------------------

def variant_b(html: str) -> tuple[str, str]:
    b = parts(html)
    # Кнопка становится звонком, запись на консультацию — строкой.
    b["actions"] = (
        '\n      <div class="hero__actions">\n'
        '        <a class="btn btn--wine hero__call-btn" href="tel:+972545490623" '
        'data-action="phone_click" aria-label="Позвонить: плюс 972 54 549 06 23">'
        f'{CALL_ICON}<span>Позвонить&nbsp;054-549-0623</span></a>\n'
        '      </div>\n'
    )
    b["phone"] = (
        '\n      <p class="hero__phone"><a class="hero__form-link" href="#contact" '
        'data-action="form_anchor_click">Или оставьте заявку — ответим в рабочее время</a></p>\n'
    )
    html = assemble(b["_html"], ["media", "actions", "phone", "note"], b)
    css = """
/* === Вариант B: звонок — главное действие =================================
   Приоритет обратный текущему: цель практики — телефонный звонок, поэтому
   доминантой сделан он, а форма уведена в текстовую строку. Номер стоит
   прямо в кнопке — приём koberg-law.co.il, где подпись кнопки есть сам
   номер: человек видит, куда звонит, ещё до нажатия. */
.hero__call-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  letter-spacing: 0.01em;
}
.hero__call-btn svg { flex: none; }
.hero__form-link {
  color: rgba(255, 255, 255, 0.72);
  text-decoration: underline;
  text-underline-offset: 4px;
  display: inline-block;
  padding: 10px 6px;
  margin: -10px -6px;
}
.hero__form-link:hover { color: #fff; }
@media (max-width: 860px) {
  .hero__call-btn { width: 100%; justify-content: center; font-size: 18px; }
}
"""
    return html, css


VARIANTS = {
    "a": ("hero-a-actions-first", "Действия перед фотографией", variant_a),
    "b": ("hero-b-call-first", "Звонок — главное действие", variant_b),
}


def build(key: str) -> Path:
    slug, name, fn = VARIANTS[key]
    dest = OUT / slug
    if dest.exists():
        shutil.rmtree(dest)
    OUT.mkdir(parents=True, exist_ok=True)
    shutil.copytree(SITE, dest)

    html = (dest / "index.html").read_text(encoding="utf-8")
    html, css = fn(html)
    html = html.replace("<title>", f"<!-- вариант hero: {name} -->\n<title>", 1)
    (dest / "index.html").write_text(html, encoding="utf-8")

    styles = (dest / "styles.css").read_text(encoding="utf-8")
    (dest / "styles.css").write_text(styles + "\n" + css, encoding="utf-8")
    install_action_bar(dest)
    return dest


def verify(dest: Path, key: str) -> list[str]:
    problems = []
    html = (dest / "index.html").read_text(encoding="utf-8")
    hero = re.search(r'<section[^>]*id="top".*?</section>', html, re.S)
    if not hero:
        return ["секция hero не найдена"]
    hero = hero.group(0)

    if "<!--SLOT:" in html:
        problems.append("в разметке остались неподставленные слоты")
    if hero.count("hero-media") < 1:
        problems.append("фотография пропала из hero")
    if "wa.me" in hero:
        problems.append("WhatsApp вернулся в hero — он должен быть выведен")
    if 'href="#contact"' not in hero:
        problems.append("из hero нет пути к форме")
    if "tel:+972545490623" not in hero:
        problems.append("из hero нет звонка")
    if html.count('id="contact"') != 1:
        problems.append("якорь формы повреждён")
    # текст первого экрана не должен меняться между вариантами
    for must in ("Адвокат по семейному праву в Израиле", "054-549-0623"):
        if must not in hero:
            problems.append(f"пропал текст «{must}»")
    problems.extend(verify_action_bar_install(dest))
    return problems


def main() -> int:
    keys = [k.lower() for k in sys.argv[1:]] or list(VARIANTS)
    bad = False
    for k in keys:
        if k not in VARIANTS:
            raise SystemExit(f"нет варианта «{k}», есть: {', '.join(VARIANTS)}")
        slug, name, _ = VARIANTS[k]
        dest = build(k)
        problems = verify(dest, k)
        print(f"=== {slug} — {name}")
        if problems:
            bad = True
            for p in problems:
                print("   ✗", p)
        else:
            print("   Проверка пройдена: слоты подставлены, звонок и путь к форме на месте, текст не изменился.")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())

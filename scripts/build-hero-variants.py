#!/usr/bin/env python3
"""Собирает варианты компоновки первого экрана для сравнения вживую.

Каждый вариант — самостоятельная копия site/ с переставленной сеткой hero.
В site/ ничего не меняется: боевая версия остаётся текущей компоновкой,
которая служит точкой отсчёта.

Варианты a/b отличаются только первым экраном. `dev1` дополнительно может
содержать явно versioned и проверяемые owner-overrides. `dev3` является
отдельным маркированным клоном `dev1`; общий `site/` при этом остаётся
неизменным. В `dev3` добавлен только scoped adapter, который синхронизирует
Hero с уже рассчитанным Action Bar состоянием рабочего времени.

    python scripts/build-hero-variants.py             # все
    python scripts/build-hero-variants.py a b dev1 dev3    # выборочно
"""

from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

from action_bar_addon import install_action_bar, verify_action_bar_install
from final_dev1_contract import (
    DATE as FINAL_DEV1_DATE,
    DESKTOP_READABILITY_SNIPPETS,
    MARKER_RE as FINAL_DEV1_MARKER_RE,
    MOBILE_CROP_SNIPPETS,
    MOBILE_FALLBACK_SNIPPETS,
    PRECEDENT_COPY_CSS_SNIPPET,
    PRECEDENT_COPY_MARKER,
    PRECEDENT_COPY_SNIPPETS,
    VERSION as FINAL_DEV1_VERSION,
)
from final_dev3_contract import (
    ACTION_BAR_SCRIPT_TAG as FINAL_DEV3_ACTION_BAR_SCRIPT_TAG,
    BODY_CLASS as FINAL_DEV3_BODY_CLASS,
    CSS_COMMENT as FINAL_DEV3_CSS_COMMENT,
    DATE as FINAL_DEV3_DATE,
    HERO_BUSINESS_SCRIPT as FINAL_DEV3_HERO_BUSINESS_SCRIPT,
    HERO_BUSINESS_SCRIPT_TAG as FINAL_DEV3_HERO_BUSINESS_SCRIPT_TAG,
    HTML_COMMENT as FINAL_DEV3_HTML_COMMENT,
    MARKER_RE as FINAL_DEV3_MARKER_RE,
    VERSION as FINAL_DEV3_VERSION,
    apply_css_contract as apply_final_dev3_css_contract,
    apply_html_contract as apply_final_dev3_html_contract,
    apply_script_contract as apply_final_dev3_script_contract,
)

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
OUT = ROOT / "build" / "variants"
FINAL_DEV3_ADDON = ROOT / "site-addons" / "final-dev3"

MEDIA = re.compile(r'\n      <div class="hero-media">.*?</div>\n', re.S)
ACTIONS = re.compile(r'\n      <div class="hero__actions">.*?</div>\n', re.S)
PHONE = re.compile(r'\n      <p class="hero__phone">.*?</p>\n', re.S)
NOTE = re.compile(r'\n      <p class="hero__note">.*?</p>\n', re.S)
NAV_CALL = re.compile(r'\n    <a class="nav-call".*?</a>\n', re.S)

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
    html = html.replace(
        '<section class="hero" id="top">',
        '<section class="hero hero--actions-first" id="top">',
        1,
    )
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
    html = html.replace(
        '<section class="hero" id="top">',
        '<section class="hero hero--call-first" id="top">',
        1,
    )
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


# --- Final Dev 1: расширенная desktop-конверсия ----------------------------

def variant_final_dev1(html: str) -> tuple[str, str]:
    """Добавляет подтверждённый владельцем desktop-блок под основным CTA.

    До 960px новый ряд преимуществ скрыт, а звонок сохраняет базовую
    компактную разметку. Это оставляет мобильный Hero и Action Bar без
    визуальных и поведенческих изменений.
    """
    b = parts(html)
    b["phone"] = f'''
      <!-- FINAL-DEV1-HERO v{FINAL_DEV1_VERSION} | {FINAL_DEV1_DATE} -->
      <div class="hero__phone hero__contact-block">
        <a class="hero__call hero__call--expanded" href="tel:+972545490623" data-action="phone_click" aria-label="Позвонить: плюс 972 54 549 06 23">
          <span class="hero__call-icon" aria-hidden="true">{CALL_ICON}</span>
          <span class="hero__call-copy">
            <span class="hero__call-label hero__call-label--desktop">Или позвоните сразу</span>
            <span class="hero__call-label hero__call-label--compact">Позвонить</span>
            <span class="hero__call-num nowrap-token">054-549-0623</span>
            <span class="hero__call-help">Срочный вопрос? Позвоните напрямую</span>
          </span>
        </a>
      </div>
      <ul class="hero__proofs" aria-label="Преимущества работы">
        <li class="hero__proof">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18M5 6h14M5 6l-3 6h6L5 6Zm14 0-3 6h6l-3-6ZM8 21h8"></path></svg>
          <span>Семейное право<br>во всех аспектах</span>
        </li>
        <li class="hero__proof">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
          <span>Конфиденциальность<br>и защита интересов</span>
        </li>
        <li class="hero__proof">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="7" r="3.5"></circle><path d="M5 21v-2a7 7 0 0 1 14 0v2"></path></svg>
          <span>Индивидуальный подход<br>к каждому делу</span>
        </li>
      </ul>
'''
    html = assemble(b["_html"], ["media", "actions", "phone", "note"], b)
    precedent_before = '''      <div class="precedent-card__text">
        <span class="precedent-card__eyebrow">Международный прецедент</span>
        <h3 class="precedent-card__title">Возвращение похищенного ребёнка при незарегистрированных родительских правах</h3>
        <p>Александр Гамбарян — автор международного судебного прецедента, связанного с возвращением похищенного ребёнка в ситуации, когда родительские права не были зарегистрированы. Опыт конкретного дела помогает видеть правовые и международные аспекты таких споров. Каждый новый случай оценивается отдельно.</p>
      </div>'''
    precedent_after = f'''      <div class="precedent-card__text">
        <!-- {PRECEDENT_COPY_MARKER} -->
        <span class="precedent-card__eyebrow">ВПЕРВЫЕ</span>
        <h3 class="precedent-card__title">СОЗДАН ПРЕЦЕДЕНТ <br class="precedent-copy__break">В МЕЖДУНАРОДНОЙ СУДЕБНОЙ ПРАКТИКЕ</h3>
        <p>Добились возвращения похищенного ребёнка, <br class="precedent-copy__break">несмотря на отсутствие официально <br class="precedent-copy__break">зарегистрированных родительских прав</p>
      </div>'''
    if html.count(precedent_before) != 1:
        raise SystemExit("исходный текст блока прецедента не найден ровно один раз")
    html = html.replace(precedent_before, precedent_after, 1)
    html = html.replace(
        '<section class="hero" id="top">',
        '<section class="hero hero--final-dev1" id="top">',
        1,
    )
    html, removed_nav_calls = NAV_CALL.subn("\n", html, count=1)
    if removed_nav_calls != 1:
        raise SystemExit("desktop-телефон .nav-call в шапке не найден")
    html = html.replace(
        '<header class="site-header">',
        '<header class="site-header site-header--final-dev1">',
        1,
    )
    css = f"""
/* FINAL-DEV1-HERO v{FINAL_DEV1_VERSION} | {FINAL_DEV1_DATE}
   Расширенная desktop-конверсия по утверждённому референсу. Все правила
   привязаны к варианту: site/, production и прежние Preview не меняются. */
.hero--final-dev1 .hero__call-label--compact {{ display: none; }}

{PRECEDENT_COPY_CSS_SNIPPET}

@media (min-width: 961px) {{
  .site-header--final-dev1 .site-header__bar {{
    display: grid;
    grid-template-columns: 1fr auto 1fr;
  }}
  .site-header--final-dev1 .logo {{ justify-self: start; }}
  .site-header--final-dev1 .nav-links {{ grid-column: 2; }}
  .hero--final-dev1 .hero__body {{
    padding-top: clamp(48px, 5vw, 68px);
    padding-bottom: 26px;
  }}
  .hero--final-dev1 .hero-row {{ margin-bottom: 16px; }}
  .hero--final-dev1 .hero__title {{
    margin-bottom: 18px;
    font-size: clamp(32px, 4.25vw, 56px);
  }}
  .hero--final-dev1 .hero__lede {{ margin-bottom: 20px; }}
  .hero--final-dev1 .hero__actions {{ margin-bottom: 20px; }}
  .hero--final-dev1 .hero__contact-block {{
    box-sizing: border-box;
    width: 100%;
    max-width: 560px;
    margin: 0 0 16px;
    padding-top: 14px;
    border-top: 1px solid rgba(240, 174, 31, 0.5);
  }}
  .hero--final-dev1 .hero__call--expanded {{
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 0;
    padding: 0;
  }}
  .hero--final-dev1 .hero__call-icon {{
    box-sizing: border-box;
    display: grid;
    width: 42px;
    height: 42px;
    flex: none;
    place-items: center;
    border: 1px solid var(--gold);
    border-radius: 50%;
  }}
  .hero--final-dev1 .hero__call-icon svg {{ width: 19px; height: 19px; }}
  .hero--final-dev1 .hero__call-copy {{
    display: grid;
    grid-template-columns: auto auto;
    column-gap: 14px;
    align-items: baseline;
  }}
  .hero--final-dev1 .hero__call-label--desktop {{
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 400;
    letter-spacing: 0;
    text-transform: none;
    color: rgba(255, 255, 255, 0.72);
  }}
  .hero--final-dev1 .hero__call-num {{ font-size: 22px; }}
  .hero--final-dev1 .hero__call-help {{
    grid-column: 1 / -1;
    margin-top: 3px;
    font-size: 12px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.64);
  }}
  .hero--final-dev1 .hero__proofs {{
    box-sizing: border-box;
    display: grid;
    width: 100%;
    max-width: 600px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin: 0 0 16px;
    padding: 0;
    list-style: none;
  }}
  .hero--final-dev1 .hero__proof {{
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 8px;
    padding: 0 8px;
    border-left: 1px solid rgba(240, 174, 31, 0.28);
  }}
  .hero--final-dev1 .hero__proof:first-child {{
    padding-left: 0;
    border-left: 0;
  }}
  .hero--final-dev1 .hero__proof svg {{
    width: 22px;
    height: 22px;
    flex: none;
    color: var(--gold);
  }}
  .hero--final-dev1 .hero__proof span {{
    font-size: 12px;
    line-height: 1.35;
    color: rgba(255, 255, 255, 0.82);
  }}
  .hero--final-dev1 .hero__note {{
    max-width: 640px;
    font-size: 13px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.64);
  }}
}}

@media (min-width: 1201px) {{
  .hero--final-dev1 .hero__contact-block {{ max-width: 580px; }}
  .hero--final-dev1 .hero__proofs {{ max-width: 640px; }}
  .hero--final-dev1 .hero__proof span {{ font-size: 13px; }}
  .hero--final-dev1 .hero__note {{
    font-size: 14px;
    color: rgba(255, 255, 255, 0.66);
  }}
}}

@media (max-width: 960px) {{
  .hero--final-dev1 .hero__proofs,
  .hero--final-dev1 .hero__call-label--desktop,
  .hero--final-dev1 .hero__call-help {{ display: none; }}
  .hero--final-dev1 .hero__call-label--compact {{ display: inline; }}
  .hero--final-dev1 .hero__call-icon,
  .hero--final-dev1 .hero__call-copy {{ display: contents; }}
}}

@media (max-width: 860px) {{
  .hero--final-dev1 .hero-media {{ overflow: hidden; }}
  .hero--final-dev1 .hero-photo {{
    transform: translateX(-7%) scale(1.15);
    transform-origin: 50% 22%;
  }}
}}

@media (max-width: 860px) and (min-height: 600px) {{
  /* Короткий мобильный viewport: поднимаем фото и обе CTA без изменения
     текста. Базовое окно 4:3 сохраняется; max-height режет только низ кадра
     на широких коротких экранах, оставляя воздух над головами. */
  .hero--final-dev1 .hero__body {{ padding-top: 4px; }}
  .hero--final-dev1 .hero__title {{
    margin-bottom: 8px;
    padding: 8px 0 10px;
  }}
  .hero--final-dev1 .hero__lede {{ margin-bottom: 6px; }}
  .hero--final-dev1 .hero-media {{ margin-bottom: 10px; }}
  .hero--final-dev1 .hero-photo {{
    display: block;
    max-height: calc(100vh - 432px);
    max-height: calc(100dvh - 432px);
  }}
  .hero--final-dev1 .hero__actions {{ margin-bottom: 10px; }}
}}

@media (min-width: 420px) and (max-width: 659px) and (min-height: 600px) {{
  .hero--final-dev1 .hero-photo {{
    max-height: calc(100vh - 396px);
    max-height: calc(100dvh - 396px);
  }}
}}

@media (min-width: 660px) and (max-width: 860px) and (min-height: 600px) {{
  .hero--final-dev1 .hero-photo {{
    max-height: calc(100vh - 374px);
    max-height: calc(100dvh - 374px);
  }}
}}
"""
    return html, css


def variant_final_dev3(html: str) -> tuple[str, str]:
    """Создаёт отдельный маркированный кандидат на базе final-dev1."""

    html, css = variant_final_dev1(html)
    return (
        apply_final_dev3_html_contract(html),
        apply_final_dev3_css_contract(css),
    )


VARIANTS = {
    "a": ("hero-a-actions-first", "Действия перед фотографией", variant_a),
    "b": ("hero-b-call-first", "Звонок — главное действие", variant_b),
    "dev1": ("final-dev1", "Desktop Hero с расширенной конверсией", variant_final_dev1),
    "dev3": ("final-dev3", "Desktop Hero с расширенной конверсией", variant_final_dev3),
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
    if key == "dev3":
        source = FINAL_DEV3_ADDON / FINAL_DEV3_HERO_BUSINESS_SCRIPT
        shutil.copy(source, dest / FINAL_DEV3_HERO_BUSINESS_SCRIPT)
        html_path = dest / "index.html"
        html = apply_final_dev3_script_contract(html_path.read_text(encoding="utf-8"))
        html_path.write_text(html, encoding="utf-8")
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

    if key == "a" and 'class="hero hero--actions-first"' not in hero:
        problems.append("Hero A не имеет изолирующего класса")
    if key == "b" and 'class="hero hero--call-first"' not in hero:
        problems.append("Hero B не имеет изолирующего класса")

    if key in {"dev1", "dev3"}:
        styles = (dest / "styles.css").read_text(encoding="utf-8")
        marker_text = f"/* FINAL-DEV1-HERO v{FINAL_DEV1_VERSION} | {FINAL_DEV1_DATE}"
        variant_css_position = styles.rfind(marker_text)
        variant_css = styles[variant_css_position:] if variant_css_position >= 0 else ""
        expected_marker = (FINAL_DEV1_VERSION, FINAL_DEV1_DATE)
        markers = [FINAL_DEV1_MARKER_RE.search(hero), FINAL_DEV1_MARKER_RE.search(styles)]
        if not all(markers) or {m.groups() for m in markers if m} != {expected_marker}:
            problems.append("FINAL-DEV1-HERO version/date должны совпадать в HTML и CSS")
        if 'class="hero hero--final-dev1"' not in hero:
            problems.append("Hero final-dev1 не имеет изолирующего класса")
        if 'class="site-header site-header--final-dev1"' not in html:
            problems.append("шапка final-dev1 не имеет изолирующего класса")
        if 'class="nav-call"' in html:
            problems.append("дублирующий desktop-телефон .nav-call остался в шапке")
        if 'class="nav-drawer__call"' not in html:
            problems.append("из мобильного меню пропал звонок")
        if hero.count('<li class="hero__proof">') != 3:
            problems.append("в final-dev1 должно быть ровно три преимущества с иконками")
        if html.count(PRECEDENT_COPY_MARKER) != 1:
            problems.append("FINAL-DEV1-PRECEDENT-COPY version/date marker отсутствует")
        for snippet in PRECEDENT_COPY_SNIPPETS:
            if html.count(snippet) != 1:
                problems.append("утверждённая редакция блока прецедента повреждена")
        if PRECEDENT_COPY_CSS_SNIPPET not in variant_css:
            problems.append("mobile-переносы текста прецедента не защищены")
        for must in (
            "Или позвоните сразу",
            "Срочный вопрос? Позвоните напрямую",
            "Семейное право",
            "Конфиденциальность",
            "Индивидуальный подход",
        ):
            if must not in hero:
                problems.append(f"в final-dev1 пропал текст «{must}»")
        hero_phone_count = len(
            re.findall(r'class="[^"]*\bhero__phone\b[^"]*"', hero)
        )
        if hero_phone_count != 1 or hero.count('class="hero__phone hero__contact-block"') != 1:
            problems.append("в final-dev1 должен остаться один sentinel .hero__phone")
        order_tokens = (
            'class="hero__actions"',
            'class="hero__phone hero__contact-block"',
            'class="hero__proofs"',
            'class="hero__note"',
        )
        order_positions = [hero.find(token) for token in order_tokens]
        if any(position < 0 for position in order_positions) or order_positions != sorted(order_positions):
            problems.append("ожидался DOM-порядок CTA → звонок → иконки → пояснение")
        if (
            "@media (min-width: 961px)" not in variant_css
            or ".hero--final-dev1" not in variant_css
            or ".site-header--final-dev1 .site-header__bar" not in variant_css
        ):
            problems.append("desktop-стили final-dev1 должны быть scoped и начинаться с 961px")
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
    if key == "dev3":
        styles = (dest / "styles.css").read_text(encoding="utf-8")
        script_path = dest / FINAL_DEV3_HERO_BUSINESS_SCRIPT
        script = script_path.read_text(encoding="utf-8") if script_path.exists() else ""
        expected_marker = (FINAL_DEV3_VERSION, FINAL_DEV3_DATE)
        html_markers = FINAL_DEV3_MARKER_RE.findall(html)
        css_markers = FINAL_DEV3_MARKER_RE.findall(styles)
        script_markers = FINAL_DEV3_MARKER_RE.findall(script)
        if (
            html_markers != [expected_marker]
            or css_markers != [expected_marker]
            or script_markers != [expected_marker]
        ):
            problems.append("FINAL-DEV3-DESIGN version/date должны совпадать в HTML/CSS/JS")
        if html.count(FINAL_DEV3_HTML_COMMENT) != 1:
            problems.append("final-dev3 HTML marker должен встречаться ровно один раз")
        if styles.count(FINAL_DEV3_CSS_COMMENT) != 1:
            problems.append("final-dev3 CSS marker должен встречаться ровно один раз")
        if html.count(f'<body class="{FINAL_DEV3_BODY_CLASS}">') != 1:
            problems.append("final-dev3 должен иметь отдельный scoped body class")
        if html.count(FINAL_DEV3_HERO_BUSINESS_SCRIPT_TAG) != 1:
            problems.append("final-dev3 Hero adapter должен быть подключён ровно один раз")
        elif html.find(FINAL_DEV3_HERO_BUSINESS_SCRIPT_TAG) < html.find(
            FINAL_DEV3_ACTION_BAR_SCRIPT_TAG
        ):
            problems.append("final-dev3 Hero adapter должен загружаться после action-bar.js")
        source_path = FINAL_DEV3_ADDON / FINAL_DEV3_HERO_BUSINESS_SCRIPT
        if not script_path.exists():
            problems.append("final-dev3 Hero adapter не скопирован")
        elif not source_path.exists() or script_path.read_bytes() != source_path.read_bytes():
            problems.append("final-dev3 Hero adapter расходится с единым источником")
        required_script_tokens = (
            ".mobile-bar[data-business-state]",
            ".hero--final-dev1 .hero__call--expanded",
            '[data-business-action="whatsapp"]',
            "Написать в WhatsApp",
            "data-action', 'whatsapp_click",
            "new MutationObserver(syncFromActionBar)",
            "attributeFilter: ['data-business-state']",
        )
        if any(token not in script for token in required_script_tokens):
            problems.append("final-dev3 Hero business-hours adapter неполон")
        forbidden_script_tokens = (
            "setTimeout(",
            "setInterval(",
            "DateTimeFormat(",
            "localStorage",
            "sessionStorage",
            "location.search",
            "URLSearchParams",
        )
        if any(token in script for token in forbidden_script_tokens):
            problems.append("final-dev3 Hero adapter не должен иметь второй источник состояния")
    problems.extend(verify_action_bar_install(dest))
    return problems


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")

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

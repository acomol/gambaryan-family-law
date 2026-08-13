#!/usr/bin/env python3
"""Собирает клиентскую копию с номерами утверждённых текстовых блоков.

Canonical ``site/index.html`` сам хранит стабильные ``data-copy-id``. Эта
сборка только показывает их как бейджи и поэтому не зависит от формулировок
текста или от структуры отдельных секций.

    python scripts/build-review-numbered.py
"""

from __future__ import annotations

import re
import shutil
from collections import Counter
from pathlib import Path

from action_bar_addon import install_action_bar, verify_action_bar_install
from client_copy_contract import APPROVED_COPY
from review_numbered_contract import (
    OWNER_REVIEW_IDS,
    REVIEW_NUMBERED_UPDATED,
    REVIEW_NUMBERED_VERSION,
)

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
DEST = ROOT / "build" / "variants" / "review-numbered"
# Эти строки относились к отменённым редакциям и не должны возвращаться в
# клиентскую копию. Проверка выполняется по HTML после установки Action Bar.
FORBIDDEN_TEXT = (
    'name="email"',
    'name="topic"',
    'type="email"',
    "name@example.com",
    ">Email<",
    ">EMAIL<",
    "Адвокат по семейному праву в Израиле",
    "Развод, раздел имущества, споры о детях. Более 30 лет практики, консультация на русском языке.",
    "Семейное, уголовное и миграционное право — от первой консультации до завершения дела.",
    "Коротко о практике",
    "Опыт, который подтверждается фактами",
    "Кто ведёт ваше дело",
    "Или позвоните сразу",
    "Срочный вопрос? Позвоните напрямую",
    "Семейное право<br>во всех аспектах",
    "Конфиденциальность<br>и защита интересов",
    "Индивидуальный подход<br>к каждому делу",
    "ВПЕРВЫЕ",
    "СОЗДАН ПРЕЦЕДЕНТ",
    "Добились возвращения похищенного ребёнка",
)

BODY_RE = re.compile(r"<body\b[^>]*>", re.IGNORECASE)
CLASS_RE = re.compile(r"\bclass=(?P<quote>['\"])(?P<value>[^'\"]*)(?P=quote)", re.IGNORECASE)
COPY_ID_RE = re.compile(r"\bdata-copy-id=(?P<quote>['\"])(?P<value>[^'\"]+)(?P=quote)")
REVIEW_ID_RE = re.compile(r"\bdata-review-id=(?P<quote>['\"])(?P<value>[^'\"]+)(?P=quote)")

BANNER = f"""
<!-- REVIEW-NUMBERED v{REVIEW_NUMBERED_VERSION} | {REVIEW_NUMBERED_UPDATED} -->
<div class="rvn-banner" role="note" aria-label="Служебная инструкция">
  <p><strong>Копия для согласования текста.</strong> Перед каждым утверждённым
  текстовым блоком показан его номер.</p>
  <p class="rvn-banner__note">Для правки укажите номер и новую формулировку,
  например: «3.12 — заменить текст на …».</p>
</div>
"""

BADGE_CSS = f"""
/* ===========================================================================
   REVIEW-NUMBERED v{REVIEW_NUMBERED_VERSION} | {REVIEW_NUMBERED_UPDATED}
   Служебные номера существуют только в клиентской копии.
   ========================================================================== */
.page--review-numbered [data-copy-id]::before,
.page--review-numbered [data-review-id]::before {{
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  min-height: 20px;
  padding: 2px 6px;
  margin-right: 7px;
  vertical-align: middle;
  font-family: "Onest", Helvetica, Arial, sans-serif;
  font-style: normal;
  font-weight: 700;
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.01em;
  color: #f0ae1f;
  background: #101214;
  border: 1px solid #f0ae1f;
  border-radius: 999px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  white-space: nowrap;
}}

.page--review-numbered [data-copy-id]::before {{ content: attr(data-copy-id); }}
.page--review-numbered [data-review-id]::before {{ content: attr(data-review-id); }}

.rvn-banner {{
  max-width: 720px;
  margin: 18px auto 0;
  padding: 14px 20px;
  background: #151b22;
  border: 1px solid rgba(240, 174, 31, 0.35);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.85);
  font-family: "Onest", Helvetica, Arial, sans-serif;
  font-size: 13.5px;
  line-height: 1.55;
}}
.rvn-banner p {{ margin: 0 0 6px; }}
.rvn-banner p:last-child {{ margin-bottom: 0; }}
.rvn-banner strong {{ color: #f0ae1f; }}
.rvn-banner__note {{ color: rgba(255, 255, 255, 0.66); font-size: 12.5px; }}
"""


def _source_copy_ids() -> tuple[str, ...]:
    html = (SITE / "index.html").read_text(encoding="utf-8")
    copy_ids = tuple(match.group("value") for match in COPY_ID_RE.finditer(html))
    counts = Counter(copy_ids)
    duplicates = sorted(copy_id for copy_id, count in counts.items() if count > 1)
    unknown = sorted(set(copy_ids) - set(APPROVED_COPY))
    if duplicates or unknown:
        details = []
        if duplicates:
            details.append("повторы: " + ", ".join(duplicates))
        if unknown:
            details.append("неизвестные ID: " + ", ".join(unknown))
        raise SystemExit("Сборка остановлена — " + "; ".join(details))
    return copy_ids


def _add_body_class(html: str) -> str:
    matches = list(BODY_RE.finditer(html))
    if len(matches) != 1:
        raise SystemExit(
            f"Сборка остановлена — ожидался один <body>, найдено {len(matches)}"
        )

    body = matches[0].group(0)
    class_match = CLASS_RE.search(body)
    if class_match:
        classes = class_match.group("value").split()
        if "page--review-numbered" not in classes:
            classes.append("page--review-numbered")
        replacement = (
            body[: class_match.start()]
            + f'class="{" ".join(classes)}"'
            + body[class_match.end() :]
        )
    else:
        replacement = body[:-1] + ' class="page--review-numbered">'

    return html[: matches[0].start()] + replacement + html[matches[0].end() :]


def _insert_banner(html: str) -> str:
    hero = re.search(
        r"<section\b(?=[^>]*\bid=(?:['\"])top(?:['\"]))[^>]*>",
        html,
        re.IGNORECASE,
    )
    if not hero:
        raise SystemExit("Сборка остановлена — Hero с id=top не найден")

    hero_end = html.find("</section>", hero.end())
    if hero_end < 0:
        raise SystemExit("Сборка остановлена — закрывающий тег Hero не найден")
    hero_end += len("</section>")
    return html[:hero_end] + "\n" + BANNER + html[hero_end:]


def _add_owner_review_ids(html: str) -> str:
    fact_token = 'data-owner-copy-id="fact-900-v1"'
    fact_label = '<span class="fact-card__unit">Автор</span>'
    fact_start = html.find(fact_token)
    fact_label_start = html.find(fact_label, fact_start)
    if fact_start < 0 or fact_label_start < 0:
        raise SystemExit("Сборка остановлена — OWNER-карточка fact-900-v1 не уникальна")
    fact_replacement = (
        '<span class="fact-card__unit" '
        f'data-review-id="{OWNER_REVIEW_IDS["fact-900-v1"]}">Автор</span>'
    )
    html = html[:fact_label_start] + fact_replacement + html[fact_label_start + len(fact_label) :]

    yulia_token = 'data-owner-copy-id="yulia-card-v1"'
    yulia_name = '<h3 class="attorney-card__name">Юлия Саакян</h3>'
    yulia_start = html.find(yulia_token)
    yulia_name_start = html.find(yulia_name, yulia_start)
    if yulia_start < 0 or yulia_name_start < 0:
        raise SystemExit("Сборка остановлена — OWNER-блок Юлии не найден")
    replacement = (
        '<h3 class="attorney-card__name" '
        f'data-review-id="{OWNER_REVIEW_IDS["yulia-card-v1"]}">Юлия Саакян</h3>'
    )
    return html[:yulia_name_start] + replacement + html[yulia_name_start + len(yulia_name) :]


def build() -> Path:
    if DEST.exists():
        shutil.rmtree(DEST)
    DEST.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(SITE, DEST)

    index_path = DEST / "index.html"
    html = index_path.read_text(encoding="utf-8")
    html = _add_body_class(html)
    html = _add_owner_review_ids(html)
    html = _insert_banner(html)
    index_path.write_text(html, encoding="utf-8")

    styles_path = DEST / "styles.css"
    styles = styles_path.read_text(encoding="utf-8")
    styles_path.write_text(styles + "\n" + BADGE_CSS, encoding="utf-8")

    install_action_bar(DEST)
    return DEST


def verify(dest: Path) -> list[str]:
    problems: list[str] = []
    html = (dest / "index.html").read_text(encoding="utf-8")
    css = (dest / "styles.css").read_text(encoding="utf-8")

    copy_ids = [match.group("value") for match in COPY_ID_RE.finditer(html)]
    review_ids = [match.group("value") for match in REVIEW_ID_RE.finditer(html)]
    counts = Counter(copy_ids)
    duplicates = sorted(copy_id for copy_id, count in counts.items() if count > 1)
    actual = set(copy_ids)
    expected_copy_ids = _source_copy_ids()
    expected = set(expected_copy_ids)
    missing = sorted(expected - actual)
    unexpected = sorted(actual - expected)

    if len(copy_ids) != len(expected_copy_ids):
        problems.append(
            f"атрибутов data-copy-id {len(copy_ids)}, ожидалось {len(expected_copy_ids)}"
        )
    if duplicates:
        problems.append("data-copy-id повторяются: " + ", ".join(duplicates))
    if missing:
        problems.append("не найдены data-copy-id: " + ", ".join(missing))
    if unexpected:
        problems.append("неожиданные data-copy-id: " + ", ".join(unexpected))
    expected_review_ids = list(OWNER_REVIEW_IDS.values())
    if review_ids != expected_review_ids:
        problems.append(
            "OWNER review ID должны быть "
            + ", ".join(expected_review_ids)
            + f"; получено: {review_ids}"
        )

    marker = f"REVIEW-NUMBERED v{REVIEW_NUMBERED_VERSION} | {REVIEW_NUMBERED_UPDATED}"
    if html.count(f"<!-- {marker} -->") != 1:
        problems.append(f"в index.html нет единственного маркера {marker}")
    if marker not in css:
        problems.append(f"в styles.css нет маркера {marker}")
    if (
        "[data-copy-id]::before" not in css
        or "content: attr(data-copy-id)" not in css
        or "[data-review-id]::before" not in css
        or "content: attr(data-review-id)" not in css
    ):
        problems.append("CSS-бейджи client/owner review ID не подключены")
    if html.count('class="rvn-banner"') != 1:
        problems.append("служебный баннер с инструкцией не вставлен")
    body_matches = list(BODY_RE.finditer(html))
    body_classes = (
        CLASS_RE.search(body_matches[0].group(0)).group("value").split()
        if len(body_matches) == 1 and CLASS_RE.search(body_matches[0].group(0))
        else []
    )
    if len(body_matches) != 1 or body_classes.count("page--review-numbered") != 1:
        problems.append("review-numbered не имеет единственного изолирующего body-класса")
    if 'name="robots" content="noindex"' not in html:
        problems.append("noindex пропал — эта копия не должна индексироваться")

    for forbidden in FORBIDDEN_TEXT:
        if forbidden in html:
            problems.append(f"найден отменённый текст/поле: {forbidden!r}")
    if re.search(r"\bemail\b", html, re.IGNORECASE):
        problems.append("найдено отменённое поле/упоминание Email")
    if re.search(r'\bname=["\']topic["\']', html, re.IGNORECASE):
        problems.append("найдено отменённое поле topic")

    problems.extend(verify_action_bar_install(dest))
    return problems


def main() -> int:
    dest = build()
    problems = verify(dest)
    copy_id_count = len(_source_copy_ids())
    owner_id_count = len(OWNER_REVIEW_IDS)
    print(f"Собрано: {dest.relative_to(ROOT)}")
    print(
        "Использованных утверждённых номеров: "
        f"client={copy_id_count}, owner={owner_id_count}"
    )
    if problems:
        print("ПРОВЕРКА НЕ ПРОЙДЕНА:")
        for problem in problems:
            print("  ✗", problem)
        return 1
    print(
        f"Проверка пройдена: {copy_id_count + owner_id_count} уникальных номеров, "
        "noindex и Action Bar сохранены."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

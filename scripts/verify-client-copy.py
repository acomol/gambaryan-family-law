#!/usr/bin/env python3
"""Проверяет точный клиентский текст в source и 11 Preview-артефактах.

CLIENT-COPY-VERIFIER v1.0.0 | 2026-08-11
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path

from client_copy_contract import (
    ALLOWED_DYNAMIC_UI_TEXT,
    ALLOWED_JSON_LD_TEXT,
    ALLOWED_OUTSIDE_COPY_TEXT,
    ALLOWED_TEXT_ATTRIBUTES,
    APPROVED_COPY,
    CONTRACT_DATE,
    CONTRACT_VERSION,
    FORBIDDEN_VISIBLE_COPY,
    OWNER_APPROVED_COPY,
    OWNER_APPROVED_HTML_TOKENS,
    OWNER_APPROVED_JSON_LD_PERSON,
    SOURCE_BYTES,
    SOURCE_REPO_PATH,
    SOURCE_SHA256,
)


VERIFIER_VERSION = "1.0.0"
VERIFIER_DATE = "2026-08-11"
EXPECTED_PREVIEW_ALIASES = 11
ROOT = Path(__file__).resolve().parent.parent
MAP_PATH = ROOT / "scripts" / "client-preview-map.json"
SKIPPED_TEXT_TAGS = {"script", "style"}
SOURCE_ID_RE = re.compile(r"\t(\d+\.\d+)")
CYRILLIC_RE = re.compile(r"[А-Яа-яЁё]")
TEXT_ATTRIBUTES = {"alt", "aria-label", "placeholder", "title"}
META_TEXT_KEYS = {
    "description",
    "og:site_name",
    "og:title",
    "og:description",
    "og:image:alt",
    "twitter:title",
    "twitter:description",
    "twitter:image:alt",
}
JS_STRING_RE = re.compile(r'''(["'`])((?:\\.|(?!\1).)*?)\1''', re.DOTALL)
DYNAMIC_UI_PATHS = (
    "site/app.js",
    "site/lead-contract.js",
    "site-addons/action-bar/action-bar.js",
    "site-addons/final-dev3/hero-business-hours.js",
)


def normalize_text(value: str) -> str:
    """Возвращает textContent с приведёнными к одному пробелу whitespace."""

    return re.sub(r"\s+", " ", value.replace("\u00a0", " ")).strip()


def normalize_source_text(value: str) -> str:
    """Убирает только маркеры списка из клиентского TXT."""

    without_bullets = "\n".join(
        re.sub(r"^\s*\*\s+", "", line) for line in value.splitlines()
    )
    return normalize_text(without_bullets)


def verify_frozen_source() -> list[str]:
    """Проверяет tracked TXT и выводит утверждённое значение каждого ID."""

    path = ROOT / SOURCE_REPO_PATH
    if not path.is_file():
        return [f"{path}: frozen client source не найден"]

    data = path.read_bytes()
    problems: list[str] = []
    digest = hashlib.sha256(data).hexdigest().upper()
    if len(data) != SOURCE_BYTES:
        problems.append(f"{path}: размер {len(data)}, ожидается {SOURCE_BYTES} bytes")
    if digest != SOURCE_SHA256:
        problems.append(f"{path}: SHA-256 {digest}, ожидается {SOURCE_SHA256}")

    try:
        lines = data.decode("utf-8-sig").splitlines()
    except UnicodeError as error:
        return problems + [f"{path}: source не читается как UTF-8: {error}"]

    id_rows = [
        (index, match.group(1))
        for index, line in enumerate(lines)
        if (match := SOURCE_ID_RE.fullmatch(line))
    ]
    source_copy: dict[str, str] = {}
    for position, (start, copy_id) in enumerate(id_rows):
        end = id_rows[position + 1][0] if position + 1 < len(id_rows) else len(lines)
        fields: list[list[str]] = []
        current: list[str] | None = None
        for line in lines[start + 1 : end]:
            if line.startswith("\t"):
                current = [line[1:]]
                fields.append(current)
            elif current is not None:
                current.append(line)
        if copy_id in source_copy:
            problems.append(f"{path}: повторяется ID {copy_id}")
            continue
        original = "\n".join(fields[0]) if fields else ""
        correction = "\n".join(fields[1]) if len(fields) > 1 else ""
        source_copy[copy_id] = normalize_source_text(
            correction if normalize_text(correction) else original
        )

    expected_ids = set(APPROVED_COPY)
    actual_ids = set(source_copy)
    if len(id_rows) != 45 or len(actual_ids) != 45:
        problems.append(
            f"{path}: найдено {len(id_rows)} строк ID / {len(actual_ids)} уникальных, "
            "ожидается 45/45"
        )
    for copy_id in sorted(expected_ids - actual_ids):
        problems.append(f"{path}: отсутствует утверждённый ID {copy_id}")
    for copy_id in sorted(actual_ids - expected_ids):
        problems.append(f"{path}: неизвестный ID {copy_id}")
    for copy_id in sorted(expected_ids & actual_ids):
        expected = normalize_text(APPROVED_COPY[copy_id])
        if source_copy[copy_id] != expected:
            problems.append(
                f"{path}: контракт расходится с клиентским ID {copy_id}\n"
                f"    документ:  {source_copy[copy_id]!r}\n"
                f"    контракт:  {expected!r}"
            )
    return problems


@dataclass
class CopyNode:
    copy_id: str
    tag: str
    chunks: list[str] = field(default_factory=list)

    @property
    def text(self) -> str:
        return normalize_text("".join(self.chunks))


class CopyHTMLParser(HTMLParser):
    """Собирает видимый текст и textContent элементов ``data-copy-id``."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.nodes: list[CopyNode] = []
        self._active_nodes: list[CopyNode] = []
        self._tag_stack: list[tuple[str, CopyNode | None]] = []
        self._skip_depth = 0
        self._visible_chunks: list[str] = []
        self._outside_copy_chunks: list[str] = []
        self._text_attributes: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        normalized_tag = tag.casefold()
        attr_map = {name.casefold(): value for name, value in attrs}
        for name in TEXT_ATTRIBUTES:
            value = attr_map.get(name)
            if value and CYRILLIC_RE.search(value):
                self._text_attributes.append(normalize_text(value))
        if normalized_tag == "meta":
            meta_key = (attr_map.get("name") or attr_map.get("property") or "").casefold()
            meta_value = attr_map.get("content")
            if meta_key in META_TEXT_KEYS and meta_value:
                self._text_attributes.append(normalize_text(meta_value))
        if normalized_tag in SKIPPED_TEXT_TAGS:
            self._skip_depth += 1

        copy_id = next((value for name, value in attrs if name == "data-copy-id"), None)
        owner_id = next(
            (value for name, value in attrs if name == "data-owner-copy-id"), None
        )
        node: CopyNode | None = None
        if copy_id is not None or owner_id is not None:
            node_id = copy_id.strip() if copy_id is not None else f"owner:{owner_id.strip()}"
            node = CopyNode(copy_id=node_id, tag=normalized_tag)
            self.nodes.append(node)
            self._active_nodes.append(node)
        self._tag_stack.append((normalized_tag, node))

    def handle_startendtag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        copy_id = next((value for name, value in attrs if name == "data-copy-id"), None)
        owner_id = next(
            (value for name, value in attrs if name == "data-owner-copy-id"), None
        )
        if copy_id is not None or owner_id is not None:
            node_id = copy_id.strip() if copy_id is not None else f"owner:{owner_id.strip()}"
            self.nodes.append(CopyNode(copy_id=node_id, tag=tag.casefold()))

    def handle_endtag(self, tag: str) -> None:
        normalized_tag = tag.casefold()
        if normalized_tag in SKIPPED_TEXT_TAGS and self._skip_depth:
            self._skip_depth -= 1

        open_tags = [open_tag for open_tag, _ in self._tag_stack]
        if normalized_tag in open_tags:
            reverse_index = open_tags[::-1].index(normalized_tag)
            start_index = len(self._tag_stack) - reverse_index - 1
            closed_frames = self._tag_stack[start_index:]
            self._tag_stack = self._tag_stack[:start_index]
            for _, closed_node in reversed(closed_frames):
                if closed_node is not None and closed_node in self._active_nodes:
                    self._active_nodes.remove(closed_node)

    def handle_data(self, data: str) -> None:
        if not self._skip_depth:
            self._visible_chunks.append(data)
            if not self._active_nodes:
                normalized = normalize_text(data)
                if normalized:
                    self._outside_copy_chunks.append(normalized)
        for node in self._active_nodes:
            node.chunks.append(data)

    @property
    def visible_text(self) -> str:
        return normalize_text("".join(self._visible_chunks))

    @property
    def outside_copy_text(self) -> tuple[str, ...]:
        return tuple(self._outside_copy_chunks)

    @property
    def text_attributes(self) -> tuple[str, ...]:
        return tuple(self._text_attributes)


def json_ld_text(html: str, path: Path) -> tuple[set[str], list[str]]:
    """Возвращает все Cyrillic strings из JSON-LD."""

    texts: set[str] = set()
    problems: list[str] = []
    blocks = re.findall(
        r'<script\s+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )

    def collect(value: object) -> None:
        if isinstance(value, str) and CYRILLIC_RE.search(value):
            texts.add(normalize_text(value))
        elif isinstance(value, dict):
            for child in value.values():
                collect(child)
        elif isinstance(value, list):
            for child in value:
                collect(child)

    for index, block in enumerate(blocks, start=1):
        try:
            collect(json.loads(block))
        except json.JSONDecodeError as error:
            problems.append(f"{path}: JSON-LD block {index} невалиден: {error}")
    return texts, problems


def owner_json_ld_count(html: str) -> int:
    """Считает точные OWNER-APPROVED Person objects в JSON-LD."""

    count = 0

    def visit(value: object) -> None:
        nonlocal count
        if isinstance(value, dict):
            if value == OWNER_APPROVED_JSON_LD_PERSON:
                count += 1
            for child in value.values():
                visit(child)
        elif isinstance(value, list):
            for child in value:
                visit(child)

    for block in re.findall(
        r'<script\s+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        flags=re.IGNORECASE | re.DOTALL,
    ):
        try:
            visit(json.loads(block))
        except json.JSONDecodeError:
            continue
    return count


def verify_dynamic_ui(paths: tuple[Path, ...] | None = None) -> list[str]:
    """Запрещает новый Cyrillic UI/claim в исполняемых JS-источниках."""

    targets = paths or tuple(ROOT / relative for relative in DYNAMIC_UI_PATHS)
    problems: list[str] = []
    for path in targets:
        if not path.is_file():
            problems.append(f"{path}: dynamic UI source не найден")
            continue
        source = path.read_text(encoding="utf-8")
        values = {
            match.group(2)
            for match in JS_STRING_RE.finditer(source)
            if CYRILLIC_RE.search(match.group(2))
        }
        for text in sorted(values - ALLOWED_DYNAMIC_UI_TEXT):
            problems.append(f"{path}: неизвестный динамический UI-текст: {text!r}")
    return problems


def _target_paths() -> tuple[list[tuple[str, Path]], list[str]]:
    problems: list[str] = []
    try:
        manifest = json.loads(MAP_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        return [], [f"{MAP_PATH}: карта Preview не читается: {error}"]

    previews = manifest.get("previews")
    if not isinstance(previews, list):
        return [], [f"{MAP_PATH}: поле previews должно быть массивом"]
    if len(previews) != EXPECTED_PREVIEW_ALIASES:
        problems.append(
            f"{MAP_PATH}: ожидалось {EXPECTED_PREVIEW_ALIASES} Preview aliases, "
            f"найдено {len(previews)}"
        )

    targets: list[tuple[str, Path]] = [
        ("source:index", ROOT / "site" / "index.html"),
        ("source:standalone", ROOT / "site" / "gambarian-standalone.html"),
    ]
    seen_aliases: set[str] = set()
    for index, preview in enumerate(previews, start=1):
        if not isinstance(preview, dict):
            problems.append(f"{MAP_PATH}: previews[{index}] должен быть объектом")
            continue
        branch = preview.get("branch")
        directory = preview.get("directory")
        if not isinstance(branch, str) or not branch:
            problems.append(f"{MAP_PATH}: previews[{index}].branch отсутствует")
            continue
        if branch in seen_aliases:
            problems.append(f"{MAP_PATH}: повторяется alias {branch!r}")
        seen_aliases.add(branch)
        if not isinstance(directory, str) or not directory:
            problems.append(f"{MAP_PATH}: alias {branch!r} не имеет directory")
            continue

        relative = Path(directory)
        if relative.is_absolute() or ".." in relative.parts:
            problems.append(f"{MAP_PATH}: alias {branch!r} имеет небезопасный directory")
            continue
        targets.append((f"preview:{branch}", ROOT / relative / "index.html"))
        targets.append(
            (
                f"preview:{branch}:standalone",
                ROOT / relative / "gambarian-standalone.html",
            )
        )

    return targets, problems


def _format_mismatch(path: Path, copy_id: str, expected: str, actual: str) -> str:
    return (
        f"{path}: data-copy-id={copy_id!r}: textContent не совпадает\n"
        f"    ожидается: {expected!r}\n"
        f"    получено:  {actual!r}"
    )


def verify_html(path: Path) -> list[str]:
    if not path.is_file():
        return [f"{path}: index.html не найден"]
    try:
        html = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        return [f"{path}: index.html не читается как UTF-8: {error}"]

    parser = CopyHTMLParser()
    try:
        parser.feed(html)
        parser.close()
    except Exception as error:  # HTMLParser может пробросить ошибку malformed input.
        return [f"{path}: HTML не разобран: {error}"]

    problems: list[str] = []
    counts = Counter(node.copy_id for node in parser.nodes)
    approved_ids = set(APPROVED_COPY)
    owner_expected = {f"owner:{copy_id}": text for copy_id, text in OWNER_APPROVED_COPY.items()}
    owner_ids = set(owner_expected)
    actual_ids = set(counts)

    for copy_id in sorted(owner_ids - actual_ids):
        problems.append(f"{path}: отсутствует data-owner-copy-id={copy_id.removeprefix('owner:')!r}")
    for copy_id in sorted(actual_ids - approved_ids - owner_ids):
        problems.append(f"{path}: неизвестный data-copy-id={copy_id!r}")
    for copy_id, count in sorted(counts.items()):
        if count != 1:
            problems.append(
                f"{path}: data-copy-id={copy_id!r} встречается {count} раз(а), ожидается 1"
            )

    for node in parser.nodes:
        expected = APPROVED_COPY.get(node.copy_id, owner_expected.get(node.copy_id))
        if expected is None or counts[node.copy_id] != 1:
            continue
        expected_normalized = normalize_text(expected)
        if node.text != expected_normalized:
            problems.append(_format_mismatch(path, node.copy_id, expected_normalized, node.text))

    for forbidden in FORBIDDEN_VISIBLE_COPY:
        forbidden_normalized = normalize_text(forbidden)
        if forbidden_normalized.casefold() in parser.visible_text.casefold():
            problems.append(
                f"{path}: запрещён старый текст: {forbidden_normalized!r}"
            )

    for field_name in ("email", "topic"):
        if re.search(rf'\bname=["\']{field_name}["\']', html, re.IGNORECASE):
            problems.append(f"{path}: запрещено поле формы name={field_name!r}")

    for token in OWNER_APPROVED_HTML_TOKENS:
        if path.name == "gambarian-standalone.html" and token.startswith(("src=", "srcset=")):
            continue
        if html.count(token) != 1:
            problems.append(
                f"{path}: OWNER-APPROVED структура Юлии требует 1× {token!r}"
            )
    if len(re.findall(r'class="attorney-card"(?:\s|>)', html)) != 2:
        problems.append(f"{path}: ожидаются ровно две карточки адвокатов")
    if owner_json_ld_count(html) != 1:
        problems.append(f"{path}: JSON-LD Юлии не совпадает с OWNER-APPROVED объектом")

    for text in sorted(set(parser.outside_copy_text) - ALLOWED_OUTSIDE_COPY_TEXT):
        problems.append(f"{path}: неизвестный текст вне data-copy-id: {text!r}")
    for text in sorted(set(parser.text_attributes) - ALLOWED_TEXT_ATTRIBUTES):
        problems.append(f"{path}: неизвестный текстовый атрибут/meta: {text!r}")
    structured_text, structured_problems = json_ld_text(html, path)
    problems.extend(structured_problems)
    for text in sorted(structured_text - ALLOWED_JSON_LD_TEXT):
        problems.append(f"{path}: неизвестный текст JSON-LD: {text!r}")

    return problems


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")

    problems = verify_frozen_source()
    problems.extend(verify_dynamic_ui())
    targets, target_problems = _target_paths()
    problems.extend(target_problems)
    checked: list[tuple[str, Path]] = []
    for label, path in targets:
        checked.append((label, path))
        problems.extend(verify_html(path))

    if problems:
        print(
            f"FAIL CLIENT-COPY-VERIFIER v{VERIFIER_VERSION} | {VERIFIER_DATE}: "
            f"{len(problems)} ошибок",
            file=sys.stderr,
        )
        for problem in problems:
            print(f"- {problem}", file=sys.stderr)
        return 1

    unique_files = len({path.resolve() for _, path in checked})
    print(
        f"PASS CLIENT-COPY-VERIFIER v{VERIFIER_VERSION} | {VERIFIER_DATE}: "
        f"{len(checked)} HTML targets, {unique_files} unique files, "
        f"client-copy allowlist {len(APPROVED_COPY)} IDs, "
        f"owner-approved {len(OWNER_APPROVED_COPY)} block; "
        f"contract v{CONTRACT_VERSION} | {CONTRACT_DATE}; source SHA256 {SOURCE_SHA256}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

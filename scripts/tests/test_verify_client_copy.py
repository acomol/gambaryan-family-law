from __future__ import annotations

import importlib.util
import re
import shutil
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

SPEC = importlib.util.spec_from_file_location(
    "verify_client_copy",
    ROOT / "scripts" / "verify-client-copy.py",
)
assert SPEC and SPEC.loader
verifier = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = verifier
SPEC.loader.exec_module(verifier)


class ClientCopyVerifierTests(unittest.TestCase):
    def setUp(self) -> None:
        self.source_html = (ROOT / "site" / "index.html").read_text(encoding="utf-8")

    def verify_temp_html(self, html: str) -> list[str]:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "index.html"
            path.write_text(html, encoding="utf-8")
            return verifier.verify_html(path)

    def test_current_source_passes(self) -> None:
        self.assertEqual(verifier.verify_html(ROOT / "site" / "index.html"), [])

    def test_unknown_visible_claim_fails(self) -> None:
        html = self.source_html.replace(
            "</main>",
            "<h2>Гарантируем победу в суде</h2></main>",
            1,
        )
        problems = self.verify_temp_html(html)
        self.assertTrue(any("неизвестный текст вне data-copy-id" in item for item in problems))

    def test_changed_approved_block_fails(self) -> None:
        html = self.source_html.replace(
            "Развод в Израиле? Адвокат по семейному праву — на русском языке</h1>",
            "Гарантируем развод без суда</h1>",
            1,
        )
        problems = self.verify_temp_html(html)
        self.assertTrue(any("data-copy-id='1.7'" in item for item in problems))

    def test_unused_approved_block_is_allowed(self) -> None:
        html = re.sub(
            r'<h1\b[^>]*data-copy-id="1\.7"[^>]*>.*?</h1>',
            "",
            self.source_html,
            count=1,
            flags=re.DOTALL,
        )
        self.assertEqual(self.verify_temp_html(html), [])

    def test_owner_approved_yulia_drift_fails(self) -> None:
        html = self.source_html.replace("Записаться к Юлии", "Связаться с Юлией", 1)
        problems = self.verify_temp_html(html)
        self.assertTrue(any("owner:yulia-card-v1" in item for item in problems))

    def test_owner_approved_fact_900_drift_fails(self) -> None:
        html = self.source_html.replace("экспертных статей", "экспертные статьи", 1)
        problems = self.verify_temp_html(html)
        self.assertTrue(any("owner:fact-900-v1" in item for item in problems))

    def test_frozen_client_block_2_14_remains_unchanged(self) -> None:
        self.assertEqual(
            verifier.APPROVED_COPY["2.14"],
            (
                "Автор более 900 опубликованных материалов, включая экспертные статьи "
                "в области уголовного, семейного и миграционного права, аналитические "
                "обзоры судебной практики и прецедентов, а также цикл юридических эссе, "
                "основанных  на многолетнем опыте адвокатской деятельности"
            ),
        )

    def test_owner_approved_yulia_structure_fails(self) -> None:
        mutations = (
            (
                'src="assets/yulia-card-760w.df9bd223.jpg"',
                'src="assets/alexander-card-v2-760w.681730d0.jpg"',
            ),
            ('alt="Адвокат Юлия Саакян"', 'alt="Адвокат Александр Гамбарян"'),
            (
                '''    {
      "@type": "Person",
      "name": "Юлия Саакян",
      "jobTitle": "Адвокат-партнёр · миграционное и семейное право"
    }''',
                "",
            ),
        )
        for old, new in mutations:
            with self.subTest(old=old):
                problems = self.verify_temp_html(self.source_html.replace(old, new, 1))
                self.assertTrue(any("OWNER-APPROVED" in item or "JSON-LD Юлии" in item for item in problems))

    def test_email_and_topic_fields_fail(self) -> None:
        for field_name in ("email", "topic"):
            with self.subTest(field_name=field_name):
                html = self.source_html.replace(
                    "</form>",
                    f'<input name="{field_name}"></form>',
                    1,
                )
                problems = self.verify_temp_html(html)
                self.assertTrue(any(f"name='{field_name}'" in item for item in problems))

    def test_unknown_text_attributes_and_json_ld_fail(self) -> None:
        replacements = (
            ("placeholder=\"Как к вам обращаться\"", "placeholder=\"Гарантируем победу в суде\""),
            ("aria-label=\"Меню\"", "aria-label=\"Гарантируем победу в суде\""),
            (
                'name="description" content="Адвокат Александр Гамбарян поможет понять, какие вопросы требуют решения сейчас и с чего начать — на русском языке."',
                'name="description" content="Гарантируем победу в суде"',
            ),
            (
                '"description": "Развод в Израиле? Адвокат по семейному праву — на русском языке"',
                '"description": "Гарантируем победу в суде"',
            ),
        )
        for old, new in replacements:
            with self.subTest(old=old):
                problems = self.verify_temp_html(self.source_html.replace(old, new, 1))
                self.assertTrue(any("Гарантируем победу" in item for item in problems))

    def test_changed_frozen_source_fails_hash(self) -> None:
        original_root = verifier.ROOT
        with tempfile.TemporaryDirectory() as directory:
            temp_root = Path(directory)
            target = temp_root / verifier.SOURCE_REPO_PATH
            target.parent.mkdir(parents=True)
            shutil.copyfile(ROOT / verifier.SOURCE_REPO_PATH, target)
            target.write_bytes(target.read_bytes() + b"x")
            verifier.ROOT = temp_root
            try:
                problems = verifier.verify_frozen_source()
            finally:
                verifier.ROOT = original_root
        self.assertTrue(any("SHA-256" in item for item in problems))

    def test_unknown_dynamic_ui_fails(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "dynamic.js"
            path.write_text('const claim = "Гарантируем победу в суде";', encoding="utf-8")
            problems = verifier.verify_dynamic_ui((path,))
        self.assertTrue(any("неизвестный динамический UI-текст" in item for item in problems))


if __name__ == "__main__":
    unittest.main()

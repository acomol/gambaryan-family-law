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

    def test_owner_review_ids_cover_owner_blocks(self) -> None:
        from review_numbered_contract import OWNER_REVIEW_IDS, OWNER_REVIEW_ANCHORS

        self.assertLessEqual(set(verifier.OWNER_APPROVED_COPY), set(OWNER_REVIEW_IDS))
        self.assertLessEqual(set(re.findall(r'data-owner-copy-id="([^"]+)"', self.source_html)), set(OWNER_REVIEW_IDS))
        self.assertLessEqual(set(OWNER_REVIEW_ANCHORS), set(OWNER_REVIEW_IDS))

    def test_current_source_passes(self) -> None:
        self.assertEqual(verifier.verify_html(ROOT / "site" / "index.html"), [])

    def test_business_hours_preserve_open_error_contact(self) -> None:
        expected = ('<span data-business-variant="open">Если ошибка повторяется, позвоните: '
                    '<a href="tel:+972545490623">054-549-0623</a> или напишите в '
                    '<a href="https://wa.me/972545490623" target="_blank" rel="noopener">WhatsApp</a>.</span>')
        self.assertIn(expected, self.source_html)
        self.assertIn('<span data-business-variant="closed" hidden>', self.source_html)

    def test_unknown_visible_claim_fails(self) -> None:
        html = self.source_html.replace(
            "</main>",
            "<h2>Гарантируем победу в суде</h2></main>",
            1,
        )
        problems = self.verify_temp_html(html)
        self.assertTrue(any("неизвестный текст вне data-copy-id" in item for item in problems))

    def test_changed_approved_block_fails(self) -> None:
        # Проверяем owner override заголовка консультации, номер ревью 7.4.
        # Счётчик подмены не даёт тесту молча превратиться в no-op.
        html, count = re.subn(
            r'(<h2\b[^>]*data-owner-copy-id="contact-h2-v1"[^>]*>).*?(</h2>)',
            r"\1Запись на консультацию\2",
            self.source_html,
            count=1,
            flags=re.DOTALL,
        )
        self.assertEqual(count, 1, "заголовок contact-h2-v1 не найден в разметке")
        problems = self.verify_temp_html(html)
        self.assertTrue(any("data-copy-id='owner:contact-h2-v1'" in item for item in problems))

    def test_missing_owner_approved_contact_heading_fails(self) -> None:
        html, count = re.subn(
            r'<h2\b[^>]*data-owner-copy-id="contact-h2-v1"[^>]*>.*?</h2>',
            "",
            self.source_html,
            count=1,
            flags=re.DOTALL,
        )
        self.assertEqual(count, 1, "заголовок contact-h2-v1 не найден в разметке")
        problems = self.verify_temp_html(html)
        self.assertTrue(any("отсутствует data-owner-copy-id='contact-h2-v1'" in item for item in problems), problems)

    def test_unused_approved_block_is_allowed(self) -> None:
        html, count = re.subn(
            r'<p\b[^>]*data-copy-id="7\.6"[^>]*>.*?</p>',
            "",
            self.source_html,
            count=1,
            flags=re.DOTALL,
        )
        self.assertEqual(count, 1, "клиентский блок 7.6 не найден в разметке")
        self.assertEqual(self.verify_temp_html(html), [])

    def test_old_contact_form_heading_fails(self) -> None:
        html, count = re.subn(
            r'(<h3\b[^>]*class="lead-form__title"[^>]*>).*?(</h3>)',
            r"\1Для ознакомительного разговора\2",
            self.source_html,
            count=1,
            flags=re.DOTALL,
        )
        self.assertEqual(count, 1, "заголовок формы не найден в разметке")
        problems = self.verify_temp_html(html)
        self.assertTrue(any("неизвестный текст вне data-copy-id: 'Для ознакомительного разговора'" in item for item in problems), problems)

    def test_old_hero_title_without_copy_id_fails(self) -> None:
        html, count = re.subn(
            r'<h1\b[^>]*>.*?</h1>',
            '<h1>Развод в Израиле? Адвокат по семейному праву&nbsp;— на русском языке</h1>',
            self.source_html,
            count=1,
            flags=re.DOTALL,
        )
        self.assertEqual(count, 1)
        problems = self.verify_temp_html(html)
        self.assertTrue(any("неизвестный текст вне data-copy-id" in item for item in problems))

    def test_old_hero_lede_without_copy_id_fails(self) -> None:
        html, count = re.subn(
            r'<p\b[^>]*class="hero__lede"[^>]*>.*?</p>',
            '<p class="hero__lede">Адвокат Александр Гамбарян поможет понять, какие вопросы требуют решения сейчас и с чего начать&nbsp;— на русском языке.</p>',
            self.source_html,
            count=1,
            flags=re.DOTALL,
        )
        self.assertEqual(count, 1)
        problems = self.verify_temp_html(html)
        self.assertTrue(any("неизвестный текст вне data-copy-id" in item for item in problems), problems)

    def test_owner_approved_yulia_v2_drift_fails(self) -> None:
        html = self.source_html.replace("Более 17 лет профессионального опыта в юриспруденции", "Более 17 лет опыта", 1)
        problems = self.verify_temp_html(html)
        self.assertTrue(any("owner:yulia-card-v2" in item for item in problems))

    def test_old_services_heading_fails_with_or_without_copy_id(self) -> None:
        old_heading = "Развод по взаимному согласию и представительство в бракоразводных спорах при отсутствии соглашения между супругами"
        for attribute in (' data-owner-copy-id="svc-h2-v1"', ''):
            with self.subTest(attribute=attribute):
                html, count = re.subn(
                    r'<h2\b[^>]*data-owner-copy-id="svc-h2-v2"[^>]*>.*?</h2>',
                    f'<h2{attribute}>{old_heading}</h2>',
                    self.source_html,
                    count=1,
                    flags=re.DOTALL,
                )
                self.assertEqual(count, 1, "заголовок svc-h2-v2 не найден в разметке")
                problems = self.verify_temp_html(html)
                expected = "неизвестный data-copy-id='owner:svc-h2-v1'" if attribute else "неизвестный текст вне data-copy-id"
                self.assertTrue(any(expected in item for item in problems), problems)

    def test_owner_approved_new_blocks_drift_fails(self) -> None:
        mutations = (
            ('hero-title-v2', 'праву</h1>', 'праву&nbsp;— на русском языке</h1>'),
            ('hero-lede-v2', 'с чего начать.</p>', 'с чего начать&nbsp;— на русском языке.</p>'),
            ('svc-h2-v2', 'защита ваших интересов', 'защита интересов'),
            ('svc-divorce-title-v1', 'Бракоразводные процессы</h3>', 'Развод</h3>'),
            ('svc-divorce-lead-v1', 'иных инстанциях', 'других инстанциях'),
            ('svc-children-lead-v1', 'незаконно удерживаемых', 'удерживаемых'),
            ('svc-paternity-title-v1', 'отцовства, <br>тест ДНК', 'отцовства и <br>тест ДНК'),
            ('svc-paternity-lead-v1', 'генетическая экспертиза', 'экспертиза'),
            ('svc-property-lead-v1', 'кредиты и иные обязательства', 'кредиты'),
            ('svc-mediation-lead-v1', 'оформляет договорённости', 'оформляет договоренности'),
            ('svc-prenup-lead-v1', 'Разработка брачного договора', 'Составление брачного договора'),
            ('svc-protection-lead-v1', 'не дожидаясь ответа через сайт', 'не ожидая ответа'),
            ('precedent-title-v2', 'разговору о разводе', 'беседе о разводе'),
            ('precedent-body-v3', 'Не принимайте решений без консультации с адвокатом', 'Не принимайте решений без адвоката'),
            ('precedent-note-v1', 'решение о разводе ещё не принято', 'решение ещё не принято'),
            ('alexander-card-v1', 'Более 30 лет профессионального опыта в юриспруденции</span>', 'Более 30 лет опыта</span>'),
            ('attorneys-note-v1', 'полное сопровождение, включающее', 'сопровождение, включающее'),
        )
        for owner_id, old, new in mutations:
            with self.subTest(owner_id=owner_id):
                self.assertIn(old, self.source_html)
                problems = self.verify_temp_html(self.source_html.replace(old, new, 1))
                self.assertTrue(any(f"owner:{owner_id}" in item for item in problems), problems)

    def test_owner_approved_fact_900_v3_drift_fails(self) -> None:
        self.assertIn("в области уголовного", self.source_html)
        html = self.source_html.replace("в области уголовного", "в сфере уголовного", 1)
        problems = self.verify_temp_html(html)
        self.assertTrue(any("owner:fact-900-v3" in item for item in problems), problems)

    def test_owner_approved_fact_cards_drift_fails(self) -> None:
        mutations = (
            ('fact-30-v1', 'профессиональный опыт в юриспруденции</div>', 'опыт в юриспруденции</div>'),
            ('fact-precedent-v1', 'в международной судебной практике', 'в судебной практике'),
        )
        for owner_id, old, new in mutations:
            with self.subTest(owner_id=owner_id):
                self.assertIn(old, self.source_html)
                problems = self.verify_temp_html(self.source_html.replace(old, new, 1))
                self.assertTrue(any(f"owner:{owner_id}" in item for item in problems), problems)

    def test_fact_cards_have_no_paragraphs(self) -> None:
        facts = self.source_html.split('class="facts"', 1)[1].split('<!-- УСЛУГИ -->', 1)[0]
        self.assertNotIn('<p', facts)

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
                'src="assets/yulia-card-v4-760w.e05bc5d6.jpg"',
                'src="assets/alexander-card-v4-760w.26c259cb.jpg"',
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

    def test_old_precedent_owner_id_fails(self) -> None:
        self.assertIn('data-owner-copy-id="precedent-body-v3"', self.source_html)
        html = self.source_html.replace('data-owner-copy-id="precedent-body-v3"', 'data-owner-copy-id="precedent-body-v2"', 1)
        problems = self.verify_temp_html(html)
        self.assertTrue(any("неизвестный data-copy-id='owner:precedent-body-v2'" in item for item in problems), problems)

    def test_topic_field_fails(self) -> None:
        for field_name in ("topic",):
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
            ("placeholder=\"Ваше имя\"", "placeholder=\"Гарантируем победу в суде\""),
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

    def test_json_ld_old_address_and_job_title_fail(self) -> None:
        mutations = (
            ('"streetAddress": "Карлибах, 10"', '"streetAddress": "Карлибах 10"'),
            ('"jobTitle": "Адвокат Израиля, лицензия № 30178"', '"jobTitle": "Адвокат Израиля, лицензия № 30178."'),
        )
        for old, new in mutations:
            with self.subTest(old=old):
                self.assertIn(old, self.source_html)
                problems = self.verify_temp_html(self.source_html.replace(old, new, 1))
                self.assertTrue(any("неизвестный текст JSON-LD" in item for item in problems), problems)

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

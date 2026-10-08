from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest

from PIL import Image, ImageDraw


SPEC = importlib.util.spec_from_file_location(
    "measure_head_top", Path(__file__).resolve().parents[1] / "measure-head-top.py")
assert SPEC and SPEC.loader
measurement = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(measurement)

CROP_SPEC = importlib.util.spec_from_file_location(
    "crop_attorney_cards", Path(__file__).resolve().parents[1] / "crop-attorney-cards.py")
assert CROP_SPEC and CROP_SPEC.loader
cropper = importlib.util.module_from_spec(CROP_SPEC)
CROP_SPEC.loader.exec_module(cropper)


class HeadTopTests(unittest.TestCase):
    def test_requires_four_rows_and_ignores_short_noise(self):
        image = Image.new("RGB", (100, 100), (150, 150, 150))
        draw = ImageDraw.Draw(image)
        draw.rectangle((45, 5, 55, 7), fill=(0, 0, 0))
        draw.rectangle((45, 20, 55, 99), fill=(0, 0, 0))
        self.assertEqual(measurement.head_top(image), 20)

    def test_no_foreground_fails_instead_of_returning_zero(self):
        with self.assertRaises(ValueError):
            measurement.head_top(Image.new("RGB", (100, 100), (150, 150, 150)))

    def test_background_patch_is_a_known_false_positive(self):
        image = Image.new("RGB", (100, 100), (150, 150, 150))
        draw = ImageDraw.Draw(image)
        draw.rectangle((40, 5, 60, 12), fill=(190, 190, 190))
        draw.rectangle((45, 30, 55, 99), fill=(0, 0, 0))
        # Reproduces the method defect: the true head starts at 30, but a
        # contrast threshold cannot distinguish it from the background patch.
        self.assertEqual(measurement.head_top(image), 5)


class AttorneyCropTests(unittest.TestCase):
    def setUp(self):
        self.alexander = Image.new("RGB", (1000, 1000), (150, 150, 150))
        self.yulia = Image.new("RGB", (400, 500), (150, 150, 150))
        ImageDraw.Draw(self.alexander).rectangle((450, 120, 550, 220), fill="black")
        ImageDraw.Draw(self.yulia).rectangle((180, 20, 220, 120), fill="black")
        self.faces = {"alexander": {"head_top": 120, "chin": 220, "center_x": 500},
                      "yulia": {"head_top": 20, "chin": 120}}

    def test_crop_aligns_head_and_face_scale(self):
        box, _ = cropper.crop_box(self.alexander, self.yulia, self.faces)
        self.assertEqual(box, (300, 100, 700, 600))
        self.assertEqual((120 - box[1]) / (box[3] - box[1]), 20 / 500)
        self.assertEqual(100 / (box[3] - box[1]), 100 / 500)

    def test_disagreement_with_visual_review_blocks_crop(self):
        self.faces["alexander"]["head_top"] = 140
        with self.assertRaisesRegex(ValueError, "detector needs correction"):
            cropper.crop_box(self.alexander, self.yulia, self.faces)

    def test_crop_outside_source_is_not_padded(self):
        self.faces["alexander"]["center_x"] = 100
        with self.assertRaisesRegex(ValueError, "exceeds source"):
            cropper.crop_box(self.alexander, self.yulia, self.faces)


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


SPEC = importlib.util.spec_from_file_location(
    'measure_section_gaps', Path(__file__).resolve().parents[1] / 'measure-section-gaps.py'
)
measure = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(measure)


class SectionGapGateTests(unittest.TestCase):
    def sample(self, gap=80, overlap=0):
        return {'horizontal_overflow': False, 'sections': [
            {'name': 'services', 'top_gap': gap, 'bottom_gap': gap},
            {'name': 'precedent', 'top_gap': 36, 'bottom_gap': 77,
             'photo_from_services': overlap},
        ]}

    def test_gate_rejects_old_spacing_and_accepts_new_scale(self):
        self.assertEqual(measure.violations(self.sample(), 80, {'precedent'}, 4), [])
        self.assertEqual(len(measure.violations(self.sample(96), 80, {'precedent'}, 4)), 2)

    def test_allow_never_suppresses_portrait_overlap(self):
        errors = measure.violations(self.sample(overlap=-0.5), None, {'precedent'}, 4)
        self.assertEqual(len(errors), 1)
        self.assertIn('overlaps services', errors[0])

    def test_raw_content_gap_is_not_replaced_by_padding(self):
        errors = measure.violations(self.sample(), 80, set(), 4)
        self.assertEqual(len(errors), 1)
        self.assertIn('precedent.top_gap', errors[0])

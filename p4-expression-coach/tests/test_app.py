import sys
import unittest
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_DIR))

from app import render_score_cards, render_sentence_notes  # noqa: E402


class AppViewTests(unittest.TestCase):
    def test_score_cards_render_all_dimensions(self):
        html = render_score_cards({"clarity": 80, "concision": 70, "structure": 60, "emotion": 90, "engagement": 75})

        self.assertIn("清晰度", html)
        self.assertIn("互动性", html)
        self.assertEqual(html.count("score-card"), 5)

    def test_sentence_notes_include_original_and_suggestion(self):
        notes = render_sentence_notes([{ "sentence": "其实我开心。", "issues": [{"message": "口头禅", "suggestion": "我开心。"}] }])

        self.assertIn("其实我开心", notes)
        self.assertIn("我开心", notes)


if __name__ == "__main__":
    unittest.main()

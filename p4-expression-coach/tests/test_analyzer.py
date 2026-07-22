import sys
import unittest
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_DIR))

from analyzer import ExpressionAnalyzer  # noqa: E402
from features import split_sentences  # noqa: E402
from lexicon import EmotionLexicon  # noqa: E402


def sample_lexicon():
    return EmotionLexicon.from_rows([
        {"word": "开心", "emotion": "PA", "intensity": 7, "polarity": 1},
        {"word": "焦虑", "emotion": "NI", "intensity": 6, "polarity": 2},
        {"word": "讨厌", "emotion": "ND", "intensity": 7, "polarity": 2},
    ])


class FeatureTests(unittest.TestCase):
    def test_split_sentences_handles_chinese_punctuation_and_newlines(self):
        self.assertEqual(split_sentences("第一句。第二句！\n第三句？"), ["第一句。", "第二句！", "第三句？"])


class AnalyzerTests(unittest.TestCase):
    def setUp(self):
        self.analyzer = ExpressionAnalyzer(sample_lexicon())

    def test_analyze_returns_five_bounded_scores_and_emotion_profile(self):
        report = self.analyzer.analyze(
            "你有没有这种感受？我以前很焦虑，但是找到方法后很开心。比如，我每天先写一句核心观点。"
        )

        self.assertEqual(set(report["scores"]), {"clarity", "concision", "structure", "emotion", "engagement"})
        self.assertTrue(all(0 <= score <= 100 for score in report["scores"].values()))
        self.assertEqual(report["emotion_profile"]["乐"]["count"], 1)
        self.assertEqual(report["emotion_profile"]["惧"]["count"], 1)

    def test_long_sentence_and_fillers_produce_evidence_based_feedback(self):
        text = "就是说其实我个人觉得这个事情怎么说呢它可能就是会让我们的内容在某种程度上产生一些比较明显但是又不太容易说明白的变化。"
        report = self.analyzer.analyze(text)

        issue_types = {issue["type"] for issue in report["sentence_feedback"][0]["issues"]}
        self.assertIn("long_sentence", issue_types)
        self.assertIn("filler", issue_types)
        self.assertLess(report["scores"]["clarity"], 80)
        self.assertLess(report["scores"]["concision"], 80)

    def test_empty_text_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "请输入"):
            self.analyzer.analyze("  ")


if __name__ == "__main__":
    unittest.main()

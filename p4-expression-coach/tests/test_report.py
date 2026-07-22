import sys
import unittest
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_DIR))

from llm_advisor import build_advisor_prompt  # noqa: E402
from report import to_markdown  # noqa: E402


class ReportTests(unittest.TestCase):
    def setUp(self):
        self.report = {
            "overall_score": 78.2,
            "scores": {"clarity": 80, "concision": 70, "structure": 75, "emotion": 85, "engagement": 81},
            "summary": ["减少口头禅"],
            "statistics": {"characters": 20, "sentences": 2, "paragraphs": 1, "average_sentence_length": 10},
            "emotion_profile": {"乐": {"count": 2, "intensity": 12}},
            "emotion_words": [{"word": "开心", "emotion": "乐", "intensity": 6}],
            "sentence_feedback": [{"sentence": "其实我很开心。", "issues": [{"type": "filler", "message": "删除其实", "suggestion": "我很开心。"}]}],
        }

    def test_markdown_contains_score_evidence_and_rewrite(self):
        markdown = to_markdown(self.report)

        self.assertIn("78.2", markdown)
        self.assertIn("开心", markdown)
        self.assertIn("我很开心", markdown)

    def test_llm_prompt_forbids_inventing_unobserved_metrics(self):
        prompt = build_advisor_prompt("原稿", self.report, "自媒体口播")

        self.assertIn("不得编造统计数据", prompt)
        self.assertIn("自媒体口播", prompt)
        self.assertIn("原稿", prompt)


if __name__ == "__main__":
    unittest.main()

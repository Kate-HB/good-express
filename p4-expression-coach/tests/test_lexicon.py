import csv
import sys
import tempfile
import unittest
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_DIR))

from lexicon import EmotionLexicon, load_lexicon, normalize_emotion  # noqa: E402


class LexiconTests(unittest.TestCase):
    def test_normalize_emotion_maps_small_category_to_major_category(self):
        self.assertEqual(normalize_emotion("PA"), "乐")
        self.assertEqual(normalize_emotion("ND"), "恶")
        self.assertEqual(normalize_emotion("未知"), "其他")

    def test_load_csv_accepts_official_chinese_headers(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "lexicon.csv"
            with path.open("w", encoding="utf-8-sig", newline="") as file:
                writer = csv.DictWriter(file, fieldnames=["词语", "词性种类", "情感分类", "强度", "极性"])
                writer.writeheader()
                writer.writerow({"词语": "开心", "词性种类": "形容词", "情感分类": "PA", "强度": "7", "极性": "1"})

            lexicon = load_lexicon(path)

            self.assertEqual(len(lexicon), 1)
            self.assertEqual(lexicon.entries[0].major_emotion, "乐")
            self.assertEqual(lexicon.entries[0].polarity, "positive")

    def test_match_prefers_longest_word_and_keeps_repeated_occurrences(self):
        lexicon = EmotionLexicon.from_rows([
            {"word": "高兴", "emotion": "PA", "intensity": 5, "polarity": 1},
            {"word": "非常高兴", "emotion": "PA", "intensity": 7, "polarity": 1},
        ])

        matches = lexicon.match("我非常高兴，也高兴。")

        self.assertEqual([item.word for item in matches], ["非常高兴", "高兴"])

    def test_load_xlsx_finds_header_after_a_title_row(self):
        from openpyxl import Workbook

        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "official.xlsx"
            workbook = Workbook()
            sheet = workbook.active
            sheet.append(["情感词汇本体（教学科研使用）"])
            sheet.append(["词语", "词性种类", "情感分类", "强度", "极性"])
            sheet.append(["焦虑", "形容词", "NI", 6, 2])
            workbook.save(path)

            lexicon = load_lexicon(path)

            self.assertEqual(lexicon.entries[0].word, "焦虑")
            self.assertEqual(lexicon.entries[0].major_emotion, "惧")


if __name__ == "__main__":
    unittest.main()

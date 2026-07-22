import sys
import tempfile
import unittest
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_DIR))

from cli import write_output  # noqa: E402


class CliTests(unittest.TestCase):
    def test_write_output_creates_parent_directory(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            target = Path(temp_dir) / "reports" / "feedback.md"

            write_output(target, "报告")

            self.assertEqual(target.read_text(encoding="utf-8"), "报告")


if __name__ == "__main__":
    unittest.main()

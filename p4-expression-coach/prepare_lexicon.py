"""把官方 CSV/XLSX 词典规范化为系统直接使用的 UTF-8 CSV。"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path

from lexicon import load_lexicon


def export_normalized(input_path: Path, output_path: Path) -> int:
    lexicon = load_lexicon(input_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=["word", "pos", "emotion", "major_emotion", "intensity", "polarity"],
        )
        writer.writeheader()
        for entry in lexicon.entries:
            writer.writerow({
                "word": entry.word,
                "pos": entry.pos,
                "emotion": entry.category,
                "major_emotion": entry.major_emotion,
                "intensity": entry.intensity,
                "polarity": entry.polarity,
            })
    return len(lexicon)


def main() -> None:
    parser = argparse.ArgumentParser(description="规范化大工情感词汇本体文件")
    parser.add_argument("input", type=Path, help="官方下载的 CSV/XLSX 文件")
    parser.add_argument("--output", type=Path, default=Path("data/lexicon_full.csv"))
    args = parser.parse_args()
    count = export_normalized(args.input, args.output)
    print(f"已导入 {count} 个不重复词条：{args.output}")


if __name__ == "__main__":
    main()

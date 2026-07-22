"""命令行入口：适合批处理、调试和保存报告。"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from analyzer import ExpressionAnalyzer
from lexicon import load_lexicon
from llm_advisor import advisor_from_environment
from report import to_markdown


PROJECT_DIR = Path(__file__).resolve().parent


def write_output(path: Path, content: str) -> None:
    """创建报告目录后写入，避免首次运行因 outputs 不存在而失败。"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="分析中文文稿的语言表达效果")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--text", help="直接输入文稿")
    source.add_argument("--file", type=Path, help="读取 UTF-8 文稿")
    parser.add_argument("--mode", default="自媒体口播", choices=["自媒体口播", "工作汇报", "演讲", "日常沟通"])
    parser.add_argument("--lexicon", type=Path, default=PROJECT_DIR / "data/lexicon_sample.csv")
    parser.add_argument("--format", choices=["markdown", "json"], default="markdown")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--llm", action="store_true", help="使用环境变量配置的 LLM 增强建议")
    args = parser.parse_args()

    text = args.text if args.text is not None else args.file.read_text(encoding="utf-8")
    report = ExpressionAnalyzer(load_lexicon(args.lexicon)).analyze(text, args.mode)
    rendered = json.dumps(report, ensure_ascii=False, indent=2) if args.format == "json" else to_markdown(report)
    if args.llm:
        advisor = advisor_from_environment()
        if advisor is None:
            raise RuntimeError("启用 --llm 需要设置 LLM_BASE_URL、LLM_API_KEY、LLM_MODEL")
        rendered += "\n\n## LLM 深度建议\n\n" + advisor.advise(text, report, args.mode)
    if args.output:
        write_output(args.output, rendered)
        print(f"报告已保存：{args.output}")
    else:
        print(rendered)


if __name__ == "__main__":
    main()

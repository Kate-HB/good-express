"""把结构化分析结果转换为便于保存和复习的 Markdown。"""

from __future__ import annotations

from analyzer import DIMENSION_LABELS


def to_markdown(report: dict) -> str:
    lines = [
        "# 语言表达反馈报告",
        "",
        f"- 场景：{report.get('mode', '未指定')}",
        f"- 综合分：**{report['overall_score']:.1f} / 100**",
        "",
        "## 五维评分",
        "",
        "| 维度 | 分数 |",
        "|---|---:|",
    ]
    lines.extend(
        f"| {DIMENSION_LABELS.get(name, name)} | {score:.1f} |"
        for name, score in report["scores"].items()
    )
    stats = report["statistics"]
    lines.extend([
        "",
        "## 统计证据",
        "",
        f"字符 {stats['characters']}；句子 {stats['sentences']}；段落 {stats['paragraphs']}；平均句长 {stats['average_sentence_length']}。",
        "",
        "## 优先修改",
        "",
    ])
    lines.extend(f"{index}. {item}" for index, item in enumerate(report["summary"], start=1))

    lines.extend(["", "## 情绪画像", ""])
    if report["emotion_profile"]:
        for emotion, values in sorted(report["emotion_profile"].items()):
            lines.append(f"- {emotion}：{values['count']} 次，累计强度 {values['intensity']:.1f}")
        words = "、".join(item["word"] for item in report["emotion_words"])
        lines.append(f"- 命中词：{words}")
    else:
        lines.append("未命中情感词。它不等于文本没有情绪，只表示当前词典未覆盖。")

    lines.extend(["", "## 逐句批注", ""])
    issue_number = 0
    for item in report["sentence_feedback"]:
        for issue in item["issues"]:
            issue_number += 1
            lines.extend([
                f"### {issue_number}. 原句",
                "",
                f"> {item['sentence']}",
                "",
                f"问题：{issue['message']}",
                "",
                f"建议：{issue['suggestion']}",
                "",
            ])
    if issue_number == 0:
        lines.append("规则层未发现明显句级问题；仍建议结合真实听众反馈判断效果。")
    lines.extend([
        "",
        "> 分数用于定位修改方向，不是对作者表达能力或人格的评价。",
    ])
    return "\n".join(lines)

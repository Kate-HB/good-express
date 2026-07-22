"""编辑部批注风格的 Gradio 语言表达教练。"""

from __future__ import annotations

import html
from pathlib import Path

from analyzer import DIMENSION_LABELS, ExpressionAnalyzer
from lexicon import load_lexicon
from llm_advisor import advisor_from_environment
from report import to_markdown


PROJECT_DIR = Path(__file__).resolve().parent
CSS = """
:root { --ink:#20201d; --paper:#f3efe4; --red:#b43a2f; --sage:#66745a; }
.gradio-container { background: radial-gradient(circle at 15% 10%, #fffdf5 0, var(--paper) 52%, #e8e0cf 100%); color:var(--ink); }
.hero { border-top:7px solid var(--ink); border-bottom:1px solid var(--ink); padding:28px 4px 22px; margin-bottom:18px; }
.hero .kicker { color:var(--red); letter-spacing:.28em; font-weight:700; font-size:.78rem; }
.hero h1 { font-family:STSong,SimSun,serif; font-size:clamp(2.2rem,6vw,4.7rem); line-height:.95; margin:10px 0; font-weight:900; }
.hero p { max-width:720px; font-family:KaiTi,serif; font-size:1.05rem; }
.score-grid { display:grid; grid-template-columns:repeat(5,minmax(110px,1fr)); gap:10px; margin:16px 0; }
.score-card { background:#fffdf6; border:1px solid #b8af9e; border-top:4px solid var(--sage); padding:15px 12px; box-shadow:3px 4px 0 #d4c9b6; }
.score-card b { display:block; font-family:STSong,serif; font-size:.92rem; }
.score-card span { font-size:1.8rem; font-weight:800; }
.score-card em { font-size:.7rem; color:#6d685e; font-style:normal; }
.editor-note { border-left:3px solid var(--red); padding:10px 14px; margin:12px 0; background:#fffaf0; }
.editor-note del { color:#777; } .editor-note strong { color:var(--red); }
footer { display:none!important; }
@media(max-width:780px){ .score-grid{grid-template-columns:repeat(2,1fr)} }
"""


def render_score_cards(scores: dict[str, float]) -> str:
    cards = []
    for name, score in scores.items():
        cards.append(
            f'<div class="score-card"><b>{DIMENSION_LABELS.get(name, html.escape(name))}</b>'
            f'<span>{float(score):.1f}</span><em>/ 100</em></div>'
        )
    return '<div class="score-grid">' + "".join(cards) + "</div>"


def render_sentence_notes(feedback: list[dict]) -> str:
    notes = []
    for item in feedback:
        for issue in item["issues"]:
            notes.append(
                '<div class="editor-note">'
                f'<del>{html.escape(item["sentence"])}</del><br>'
                f'<small>{html.escape(issue["message"])}</small><br>'
                f'<strong>→ {html.escape(issue["suggestion"])}</strong></div>'
            )
    return "".join(notes) or '<div class="editor-note">规则层未发现明显句级问题。</div>'


def create_app(lexicon_path: Path | None = None):
    import gradio as gr

    analyzer = ExpressionAnalyzer(load_lexicon(lexicon_path or PROJECT_DIR / "data/lexicon_sample.csv"))

    def analyze_handler(text: str, mode: str, use_llm: bool):
        try:
            result = analyzer.analyze(text, mode)
            markdown = to_markdown(result)
            if use_llm:
                advisor = advisor_from_environment()
                if advisor is None:
                    markdown += "\n\n> 未配置 LLM，当前仅展示可解释规则分析。"
                else:
                    markdown += "\n\n## LLM 深度建议\n\n" + advisor.advise(text, result, mode)
            return (
                f'<div class="hero"><div class="kicker">EDITORIAL DIAGNOSIS</div><h1>{result["overall_score"]:.1f}</h1><p>综合表达分 / 100</p></div>'
                + render_score_cards(result["scores"]),
                "\n".join(f"{index}. {item}" for index, item in enumerate(result["summary"], start=1)),
                result["emotion_profile"],
                render_sentence_notes(result["sentence_feedback"]),
                markdown,
            )
        except Exception as error:
            return f'<div class="editor-note"><strong>无法分析：</strong>{html.escape(str(error))}</div>', "", {}, "", ""

    with gr.Blocks(css=CSS, title="言析 · 中文表达教练") as demo:
        gr.HTML('<div class="hero"><div class="kicker">语言表达实验室</div><h1>言析</h1><p>把“感觉不顺”拆成能定位、能修改、能练习的语言证据。</p></div>')
        with gr.Row():
            with gr.Column(scale=3):
                manuscript = gr.Textbox(
                    label="原稿",
                    lines=14,
                    placeholder="粘贴口播稿、自媒体文案、汇报稿或演讲稿……",
                )
            with gr.Column(scale=1):
                mode = gr.Radio(["自媒体口播", "工作汇报", "演讲", "日常沟通"], value="自媒体口播", label="表达场景")
                use_llm = gr.Checkbox(label="启用 LLM 深度建议", value=False)
                analyze_button = gr.Button("开始批注", variant="primary")
                gr.Examples(
                    examples=[
                        ["你有没有这种感受？其实我以前一写内容就焦虑。但是我发现，先写一句核心观点，表达会清楚很多。"],
                        ["就是说我个人觉得这个事情可能在某种程度上还是比较重要的。"],
                    ],
                    inputs=manuscript,
                )
        score_cards = gr.HTML()
        with gr.Row():
            priorities = gr.Markdown(label="优先修改")
            emotions = gr.JSON(label="情绪画像")
        sentence_notes = gr.HTML()
        full_report = gr.Markdown(label="完整报告")
        analyze_button.click(
            analyze_handler,
            inputs=[manuscript, mode, use_llm],
            outputs=[score_cards, priorities, emotions, sentence_notes, full_report],
        )
    return demo


if __name__ == "__main__":
    create_app().launch()

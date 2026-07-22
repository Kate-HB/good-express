"""提取与表达效果直接相关、可回溯到原文的统计特征。"""

from __future__ import annotations

import re


FILLERS = (
    "就是说", "怎么说呢", "我个人觉得", "在某种程度上", "然后就是",
    "其实", "然后", "就是", "可能", "比较", "有点", "这个", "那个",
)
VAGUE_WORDS = ("一些", "某种", "可能", "大概", "基本上", "相对", "之类", "等等", "不太容易")
CONNECTORS = {
    "cause": ("因为", "所以", "因此", "由于"),
    "contrast": ("但是", "然而", "不过", "相反"),
    "sequence": ("首先", "其次", "最后", "第一", "第二"),
    "progression": ("而且", "并且", "更重要的是", "不仅", "还"),
    "summary": ("总之", "综上", "所以说", "核心是"),
}
EXAMPLE_MARKERS = ("例如", "比如", "举个例子", "具体来说")


def split_sentences(text: str) -> list[str]:
    """按中文终止符和换行切句，同时保留终止符便于展示原句。"""
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    return [
        match.group(0).strip()
        for match in re.finditer(r"[^。！？!?；;\n]+[。！？!?；;]?", normalized)
        if match.group(0).strip()
    ]


def _hits(text: str, vocabulary: tuple[str, ...]) -> list[dict[str, int | str]]:
    result = []
    for phrase in vocabulary:
        for match in re.finditer(re.escape(phrase), text):
            result.append({"word": phrase, "start": match.start(), "end": match.end()})
    return sorted(result, key=lambda item: int(item["start"]))


def extract_features(text: str) -> dict:
    sentences = split_sentences(text)
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n|\n", text) if part.strip()]
    clean_characters = re.findall(r"[\w\u4e00-\u9fff]", text, flags=re.UNICODE)
    sentence_lengths = [len(re.findall(r"[\w\u4e00-\u9fff]", sentence)) for sentence in sentences]
    connector_hits = {
        group: sum(text.count(word) for word in words)
        for group, words in CONNECTORS.items()
    }
    return {
        "characters": len(clean_characters),
        "sentences": sentences,
        "sentence_lengths": sentence_lengths,
        "paragraphs": max(1, len(paragraphs)),
        "average_sentence_length": sum(sentence_lengths) / max(1, len(sentence_lengths)),
        "long_sentence_indices": [index for index, length in enumerate(sentence_lengths) if length > 35],
        "filler_hits": _hits(text, FILLERS),
        "vague_hits": _hits(text, VAGUE_WORDS),
        "connector_hits": connector_hits,
        "connector_variety": sum(count > 0 for count in connector_hits.values()),
        "questions": len(re.findall(r"[？?]", text)),
        "second_person": len(re.findall(r"你|你们|大家", text)),
        "examples": sum(text.count(marker) for marker in EXAMPLE_MARKERS),
        "numbers": len(re.findall(r"\d+(?:\.\d+)?%?", text)),
        "repeated_punctuation": len(re.findall(r"([！？!?。])\1+", text)),
    }

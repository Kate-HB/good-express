"""组合词典和文本特征，生成可解释的五维表达反馈。"""

from __future__ import annotations

import re
from collections import defaultdict

from features import FILLERS, VAGUE_WORDS, extract_features
from lexicon import EmotionLexicon


DIMENSION_LABELS = {
    "clarity": "清晰度",
    "concision": "简洁度",
    "structure": "结构性",
    "emotion": "情绪表达",
    "engagement": "互动性",
}


def clamp(value: float) -> float:
    return round(max(0.0, min(100.0, value)), 1)


def _remove_phrases(sentence: str, phrases: tuple[str, ...]) -> str:
    result = sentence
    for phrase in sorted(phrases, key=len, reverse=True):
        result = result.replace(phrase, "")
    return re.sub(r"，{2,}", "，", result).strip("， ")


def _split_long_sentence(sentence: str) -> str:
    commas = [match.start() for match in re.finditer(r"，|,", sentence)]
    if commas:
        middle = len(sentence) / 2
        position = min(commas, key=lambda index: abs(index - middle))
        return sentence[:position].rstrip("，,") + "。" + sentence[position + 1 :].lstrip()
    position = len(sentence) // 2
    return sentence[:position] + "。" + sentence[position:]


class ExpressionAnalyzer:
    """规则分数用于定位可改之处，不用于评价作者能力或人格。"""

    def __init__(self, lexicon: EmotionLexicon):
        self.lexicon = lexicon

    def analyze(self, text: str, mode: str = "自媒体口播") -> dict:
        text = text.strip()
        if not text:
            raise ValueError("请输入需要分析的中文文稿")

        features = extract_features(text)
        matches = self.lexicon.match(text)
        characters = max(1, features["characters"])
        sentence_count = max(1, len(features["sentences"]))
        long_ratio = len(features["long_sentence_indices"]) / sentence_count
        filler_density = len(features["filler_hits"]) / characters
        vague_density = len(features["vague_hits"]) / characters

        clarity = clamp(
            100
            - max(0.0, features["average_sentence_length"] - 24) * 1.4
            - long_ratio * 28
            - vague_density * 280
        )
        concision = clamp(
            100
            - filler_density * 430
            - vague_density * 160
            - features["repeated_punctuation"] * 8
        )
        structure = clamp(
            42
            + (16 if sentence_count >= 3 else 0)
            + (12 if features["paragraphs"] >= 2 else 0)
            + min(24, features["connector_variety"] * 8)
            + (6 if features["connector_hits"]["summary"] else 0)
        )

        emotion_profile: dict[str, dict[str, float | int]] = defaultdict(lambda: {"count": 0, "intensity": 0.0})
        for match in matches:
            emotion_profile[match.emotion]["count"] += 1
            emotion_profile[match.emotion]["intensity"] += match.intensity
        emotion_diversity = len([name for name in emotion_profile if name != "其他"])
        emotion_density = len(matches) / characters
        dominance_penalty = 0.0
        if len(matches) >= 4:
            largest = max(float(item["count"]) for item in emotion_profile.values())
            dominance_penalty = max(0.0, largest / len(matches) - 0.75) * 40
        emotion_score = clamp(
            52 + min(24, emotion_density * 420) + min(20, emotion_diversity * 6) - dominance_penalty
        )
        engagement = clamp(
            40
            + min(20, features["questions"] * 12)
            + min(16, features["second_person"] * 4)
            + min(16, features["examples"] * 10)
            + min(8, features["numbers"] * 4)
        )
        scores = {
            "clarity": clarity,
            "concision": concision,
            "structure": structure,
            "emotion": emotion_score,
            "engagement": engagement,
        }

        sentence_feedback = []
        for index, sentence in enumerate(features["sentences"]):
            issues = []
            fillers = tuple(phrase for phrase in FILLERS if phrase in sentence)
            vague_words = tuple(word for word in VAGUE_WORDS if word in sentence)
            simplified = _remove_phrases(sentence, fillers)
            if fillers:
                issues.append({
                    "type": "filler",
                    "message": f"口头禅/缓冲词：{'、'.join(fillers)}",
                    "suggestion": simplified,
                })
            if index in features["long_sentence_indices"]:
                issues.append({
                    "type": "long_sentence",
                    "message": f"句长 {features['sentence_lengths'][index]} 字，口播时信息负担较高",
                    "suggestion": _split_long_sentence(simplified),
                })
            if vague_words:
                issues.append({
                    "type": "vague",
                    "message": f"模糊表达：{'、'.join(vague_words)}；可补充对象、范围或数字",
                    "suggestion": simplified,
                })
            if re.search(r"([！？!?。])\1+", sentence):
                issues.append({
                    "type": "repeated_punctuation",
                    "message": "连续标点会放大情绪但削弱正式感",
                    "suggestion": re.sub(r"([！？!?。])\1+", r"\1", simplified),
                })
            sentence_feedback.append({"sentence": sentence, "issues": issues})

        weakest = sorted(scores, key=scores.get)[:3]
        action_map = {
            "clarity": "优先拆分长句，并把“可能、一些”等模糊词替换为具体对象。",
            "concision": "删除口头禅和不承担信息的缓冲词，让每句只保留一个动作。",
            "structure": "补充“问题—原因—方法—结论”层级，并使用明确连接词。",
            "emotion": "增加具体感受和强度变化，避免全篇只有一种情绪色彩。",
            "engagement": "加入面向听众的问题、例子或数字，让观点更可感知。",
        }
        overall = round(sum(scores[name] * weight for name, weight in {
            "clarity": 0.25,
            "concision": 0.20,
            "structure": 0.25,
            "emotion": 0.15,
            "engagement": 0.15,
        }.items()), 1)

        return {
            "mode": mode,
            "overall_score": overall,
            "scores": scores,
            "summary": [action_map[name] for name in weakest],
            "statistics": {
                "characters": features["characters"],
                "sentences": sentence_count,
                "paragraphs": features["paragraphs"],
                "average_sentence_length": round(features["average_sentence_length"], 1),
                "fillers": len(features["filler_hits"]),
                "vague_words": len(features["vague_hits"]),
                "connectors": sum(features["connector_hits"].values()),
                "questions": features["questions"],
            },
            "emotion_profile": dict(emotion_profile),
            "emotion_words": [
                {
                    "word": item.word,
                    "emotion": item.emotion,
                    "category": item.category,
                    "intensity": item.intensity,
                    "polarity": item.polarity,
                    "start": item.start,
                }
                for item in matches
            ],
            "sentence_feedback": sentence_feedback,
        }

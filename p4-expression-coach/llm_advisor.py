"""可选 LLM 深度建议；核心评分不依赖外部服务。"""

from __future__ import annotations

import json
import os
import urllib.request


def build_advisor_prompt(text: str, report: dict, mode: str) -> str:
    evidence = {
        "scores": report["scores"],
        "statistics": report["statistics"],
        "emotion_profile": report["emotion_profile"],
        "rule_suggestions": report["summary"],
    }
    return (
        "你是中文语言表达教练。根据原稿和规则分析证据提供反馈。\n"
        "要求：不得编造统计数据；不评价人格；指出具体原句；给出一版保留原意的精简改写；"
        "若规则判断与语境冲突，以语境解释冲突。\n\n"
        f"使用场景：{mode}\n"
        f"原稿：\n{text}\n\n"
        f"已计算证据：\n{json.dumps(evidence, ensure_ascii=False, indent=2)}"
    )


class OpenAICompatibleAdvisor:
    def __init__(self, base_url: str, api_key: str, model: str, timeout: int = 90):
        self.url = base_url.rstrip("/") + "/chat/completions"
        self.api_key = api_key
        self.model = model
        self.timeout = timeout

    def advise(self, text: str, report: dict, mode: str) -> str:
        request = urllib.request.Request(
            self.url,
            data=json.dumps({
                "model": self.model,
                "messages": [{"role": "user", "content": build_advisor_prompt(text, report, mode)}],
                "temperature": 0.2,
            }).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.api_key}"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=self.timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
        return payload["choices"][0]["message"]["content"].strip()


def advisor_from_environment() -> OpenAICompatibleAdvisor | None:
    values = (os.getenv("LLM_BASE_URL"), os.getenv("LLM_API_KEY"), os.getenv("LLM_MODEL"))
    return OpenAICompatibleAdvisor(*values) if all(values) else None

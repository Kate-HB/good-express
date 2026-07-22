# P4 言析：中文语言表达教练

输入自媒体口播稿、汇报稿、演讲稿或日常沟通文本，输出五维表达评分、统计证据、情绪画像、逐句问题和可执行修改建议。

## 1. 系统解决什么问题

“不顺、啰嗦、没重点”是感受，不是修改动作。本项目将表达效果拆为可观察特征：

- 清晰度：平均句长、长句比例、模糊词。
- 简洁度：口头禅、缓冲词、连续标点。
- 结构性：段落、连接词、问题—方法—结论层级。
- 情绪表达：情绪类别、极性、强度、密度和多样性。
- 互动性：提问、第二人称、例子和数字。

系统评价文本特征，不评价作者人格。分数用于比较同一作者修改前后的变化，不是通用能力考试。

## 2. 方法流程

```text
中文文稿
  ├─ 规则特征：句长 / 口头禅 / 模糊词 / 连接词 / 互动信号
  ├─ 情感词典：最长词匹配 → 7 类情绪 / 极性 / 强度
  ├─ 评分引擎：五维分数 + 综合分 + 触发证据
  ├─ 逐句批注：原句 → 问题 → 修改动作 → 示例
  └─ 可选 LLM：在已有证据上补充语境级改写
```

## 3. 情感词库

项目兼容大连理工大学信息检索研究室的“情感词汇本体”。该资源描述词性、细分类、强度和极性，并将情绪组织为 7 大类、21 小类。[官方说明](https://ir.dlut.edu.cn/info/1013/1142.htm)注明附件仅供科研和教学使用，使用时应引用：徐琳宏等，《情感词汇本体的构造》，《情报学报》，2008。

仓库不重新分发完整附件：

- `data/lexicon_sample.csv`：50 条原创教学样例，保证系统开箱运行。
- `data/lexicon_full.csv`：用户导入的官方完整词典，已加入 `.gitignore`。

导入完整词典：

1. 从[官方下载页](https://ir.dlut.edu.cn/info/1013/1142.htm)下载附件。
2. 解压后执行：

```powershell
python prepare_lexicon.py "下载文件.xlsx" --output data/lexicon_full.csv
```

3. CLI 使用 `--lexicon data/lexicon_full.csv`；Gradio 可在 `create_app()` 中传入该路径。

兼容中文列名：`词语`、`词性种类`、`情感分类`、`强度`、`极性`；也兼容对应英文列名。

## 4. 安装与运行

在仓库根目录：

```powershell
python -m venv .venv-projects
.\.venv-projects\Scripts\Activate.ps1
python -m pip install -r projects/requirements.txt
```

### Gradio 页面

```powershell
cd projects/p4-expression-coach
python app.py
```

### CLI

```powershell
python cli.py --file examples/good_script.txt --output outputs/good_report.md
python cli.py --file examples/needs_revision.txt --format json
python cli.py --text "其实我个人觉得这个事情比较重要。" --mode 工作汇报
```

### 测试

```powershell
python -m unittest discover -s tests -v
```

## 5. 文件职责

- `lexicon.py`：词典导入、细分类映射、最长词匹配。
- `prepare_lexicon.py`：官方 CSV/XLSX 标准化。
- `features.py`：句子和篇章级统计。
- `analyzer.py`：五维评分、情绪画像和逐句反馈。
- `report.py`：Markdown 报告。
- `llm_advisor.py`：可选 OpenAI 兼容接口。
- `cli.py`：命令行和报告保存。
- `app.py`：编辑部批注风格 Gradio 页面。

## 6. 分数如何计算

所有维度限制在 0–100：

- 清晰度从 100 扣除超长句、平均句长过高和模糊词惩罚。
- 简洁度从 100 扣除口头禅、模糊表达和连续标点惩罚。
- 结构性从基础分增加多句、分段、连接词种类和总结信号。
- 情绪表达综合情绪词密度、多样性，并惩罚单一情绪过度占据。
- 互动性累加提问、第二人称、例子和数字信号。
- 综合分权重：清晰度 25%、简洁度 20%、结构性 25%、情绪 15%、互动 15%。

这些权重是教学启发式规则，应通过真实用户评分数据校准，不代表语言学标准答案。

## 7. 可选 LLM 深度建议

```powershell
$env:LLM_BASE_URL="https://服务地址/v1"
$env:LLM_API_KEY="密钥"
$env:LLM_MODEL="模型名"
python cli.py --file examples/good_script.txt --llm
```

LLM 只能读取规则层已经计算的证据，提示词明确禁止编造统计数据。没有 API 时，全部核心功能仍可离线运行。

## 8. 已知限制与改进

- 词典法无法识别反讽、否定范围、隐喻和上下文词义变化。
- 文字稿无法直接评价语速、停顿、重音和声音状态；需要后续语音转写与声学特征。
- “好表达”依赖场景，同一句话在短视频和正式汇报中的标准不同。
- 下一阶段应采集真人对文稿的多维评分，用相关性和一致性校准规则权重。

详细架构见 [design.md](design.md)。

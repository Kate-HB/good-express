# 言析 Good Express

Windows 本地实时中文表达训练应用。你对着麦克风讲话，应用离线转写；每句话结束后给出最多 3 个符合语境的替换词，结束后生成完整反馈报告。

## 功能

- 离线流式语音识别：默认使用 Sherpa-ONNX，中英混合模型无需上传音频。
- 自动推断表达目的：如分享讲解、表达观点、讲述经历、表达愿望。
- 即时替词：结合当前句、前文和表达目的排序，而不是机械查同义词。
- DLUT 情感词库：使用完整 CSV 提供情绪类别、强度和极性线索。
- 结束报告：亮点、不足、逐句改写、精准词表、语速和一个训练任务。
- 本地历史：默认只保存转写和报告，不保存录音；支持搜索、查看和删除。
- 安全下载：应用内下载模型，并校验固定体积与 SHA-256。
- 模型可替换：预留 Sherpa/云 ASR、OpenAI Compatible/Ollama 接口。

## Windows 安装

### 直接运行应用

`dist` 中提供两种 Windows x64 产物：

- `GoodExpress-Setup-1.0.0-x64.exe`：安装版，可选择安装目录。
- `GoodExpress-Portable-1.0.0-x64.exe`：免安装版。

首次打开后进入“设置”，点击模型目录右侧“下载”。模型约 488 MB，保存到当前 Windows 用户数据目录，安装版和便携版均不会把模型放入临时目录。

### 从源码运行

要求：Windows 10/11、Node.js 20 以上、PowerShell 5.1 以上。

```powershell
cd C:\Users\27729\Desktop\good-express
npm install
powershell -ExecutionPolicy Bypass -File .\scripts\download-model.ps1
npm start
```

启动后：

1. 点击右上角“设置”。
2. 应用会自动使用下载脚本解压出的模型；也可手动选择模型目录。
3. 保持“反馈模型”为“关闭”即可完全离线使用。
4. 点击“开始练习”并允许麦克风权限。

模型体积为数百 MB，不提交到 Git。下载失败时可从 Sherpa-ONNX ASR Models release 手动下载 `sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20` 并解压到 `models`。

构建 Windows 安装包：

```powershell
npm run dist:win
```

## 切换反馈大模型

设置页支持：

- `Ollama`：默认地址 `http://127.0.0.1:11434/v1`，例如模型 `qwen2.5:7b`。
- `OpenAI Compatible`：填写服务的 `/v1` 地址、模型名和 API Key。

API Key 使用 Electron `safeStorage` 调用 Windows 数据保护能力加密，配置文件和日志不保存明文。启用云模型表示文字上下文会发送到对应服务；音频仍由本地 ASR 处理。

## 反馈是怎样生成的

```text
麦克风音频
  → 16 kHz 单声道采样
  → Sherpa-ONNX 流式转写
  → 句末/停顿检测与去重
  → 推断整段表达目的
  → 精准词映射召回候选
  → DLUT 情绪强度提供特征
  → 规则或 LLM 结合上下文排序
  → 最多展示 3 个候选
```

例如“我想要先整理数据，再开始训练”中，“先/再/训练”与“说明计划”会提高“打算”的排序；“我想要明年考上研究生”中，“未来目标”会提高“希望”的排序。

DLUT 不是同义词库，因此它不能单独完成替词。本项目用 `data/precision-map.json` 补充“原词—候选词—语用标签”，再结合 DLUT 的情绪类别与强度做分析。详见 [算法说明](docs/ALGORITHM.md)。

## 测试

```powershell
npm test
```

测试覆盖词库加载、上下文目的、候选上限、不同语境排序、LLM 补充验证与超时降级、ASR 纠错、AudioWorklet、模型校验、历史、报告、安装配置和密钥加密。

下载真实模型后可验证实际推理：

```powershell
npm run verify:asr
npm run verify:electron
```

真人公开 WAV、Electron 界面和打包程序的实测记录见 [Windows 验收报告](docs/VALIDATION.md)。

## 目录

```text
good-express/
├─ main.js                         # Electron 主进程、IPC、模型/历史/练习编排
├─ preload.js                      # Renderer 安全 API 暴露
├─ package.json                    # 脚本、依赖、打包配置
├─ src/
│  ├─ index.html                   # 桌面端页面骨架
│  ├─ app.js                       # 录音、设置、历史、报告 UI 逻辑
│  ├─ audio-capture-worklet.js     # 音频线程降采样与分块
│  ├─ transcript-format.js         # 转写段落格式化与高亮
│  └─ styles.css                   # 页面样式
├─ lib/
│  ├─ orchestrator.js              # ASR、上下文、候选、排序、报告总管线
│  ├─ contracts.js                 # 运行时类型校验
│  ├─ stats.js                     # 语速统计
│  ├─ text-analysis.js             # 转写文本分析
│  ├─ window-options.js            # 窗口配置
│  ├─ asr/                         # Sherpa/云/Mock ASR 适配器与清洗
│  ├─ audio/                       # 音频重采样
│  ├─ context/                     # 会话拼接与表达目的推断
│  ├─ feedback/                    # 实时反馈
│  ├─ lexicon/                     # DLUT 读取、精准词候选召回
│  ├─ ranker/                      # 规则排序、LLM 重排、候选校验
│  ├─ llm/                         # Ollama 与 OpenAI Compatible 接口
│  ├─ report/                      # 最终报告、LLM 报告、证据与 Markdown 导出
│  ├─ storage/                     # 设置加密、本地历史索引
│  └─ models/                      # 模型清单、校验、下载命令
├─ data/
│  ├─ dlut-emotion-ontology.csv    # DLUT 情感词库
│  ├─ precision-map.json           # 核心模糊词到精准词映射
│  ├─ precision-additions.json     # 追加精准词映射
│  └─ precision-schema.json        # 精准词数据结构约束
├─ scripts/                        # 模型下载、真实 ASR、训练管线、UI 验证
├─ test/                           # Node 自动测试
├─ docs/                           # 架构、算法和验收文档
├─ models/                         # 本地离线模型目录，不提交 Git
└─ dist/                           # Windows 打包产物
```

## 数据许可

`data/dlut-emotion-ontology.csv` 来自 [yizhanmiao/DLUT-Emotionontology](https://github.com/yizhanmiao/DLUT-Emotionontology)。原始资源由大连理工大学信息检索研究室整理，可用于学术研究；商业使用须联系 `irlab@dlut.edu.cn`。

引用：徐琳宏, 林鸿飞, 潘宇, 等. 情感词汇本体的构造[J]. 情报学报, 2008, 27(2): 180-185.

## 当前边界

- 首版保证 Windows；未针对 macOS/Linux 完整验收。
- 默认规则排序可离线工作，但精准映射需要持续扩充。
- ASR 低置信度、反讽、否定范围和强依赖常识的语境仍可能判断错误。
- 系统评价表达证据，不评价人格或给出心理诊断。

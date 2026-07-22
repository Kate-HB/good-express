# Good Express Quality Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按优先级升级替词覆盖、ASR 纠错、报告、音频链路、历史记录和 Windows 发布能力。

**Architecture:** 保持现有 Electron Main/Renderer 分层。新增纯函数纠错、候选验证、报告证据和历史索引模块；Renderer 改用 AudioWorklet；Main 继续负责模型、密钥、文件和 IPC。所有新增行为先由 Node 内置测试定义，再接入界面。

**Tech Stack:** Electron 43、Node.js CommonJS、Sherpa-ONNX、DLUT Emotion Ontology、Web Audio AudioWorklet、electron-builder、Node `node:test`。

---

### Task 1: ASR 保守纠错

**Files:**
- Create: `lib/asr/conservative-cleaner.js`
- Test: `test/asr-cleaner.test.js`
- Modify: `lib/orchestrator.js`
- Modify: `lib/context/session.js`

- [ ] **Step 1: 写失败测试**

覆盖 `整理理数据`→`整理数据`、`在在开始`→`再开始`仅在计划线索充分时处理、`人人/看看/试试`保持不变，并断言输出 `{rawText, cleanText, edits}`。

```js
const result = cleanAsrText('我想要先整理理数据在在开始训练练');
assert.equal(result.cleanText, '我想要先整理数据再开始训练');
assert.ok(result.edits.every((edit) => edit.confidence >= 0.8));
```

- [ ] **Step 2: 运行 `node --test test/asr-cleaner.test.js`，确认模块缺失失败**
- [ ] **Step 3: 实现白名单叠词、重复片段检测、计划语境同音修正和标点补全**
- [ ] **Step 4: 会话同时保存原始句和清洗句，分析只读取 `cleanText`**
- [ ] **Step 5: 运行 `npm test` 并提交 `feat: add conservative ASR cleanup`**

### Task 2: 扩大本地替词覆盖

**Files:**
- Modify: `data/precision-map.json`
- Create: `data/precision-schema.json`
- Modify: `lib/lexicon/candidates.js`
- Test: `test/precision-coverage.test.js`

- [ ] **Step 1: 写失败测试**

定义至少 30 个高频模糊表达，覆盖动词、评价词、程度词和口头缓冲词；每项至少 3 个候选，并具有 `tone/intensity/formality/purposes/positiveExample/negativeExample/reason`。

```js
assert.ok(Object.keys(map).length >= 30);
for (const entries of Object.values(map)) assert.ok(entries.length >= 3);
```

- [ ] **Step 2: 运行测试并确认因覆盖不足失败**
- [ ] **Step 3: 扩充词表并实现启动时结构校验，错误条目给出精确路径**
- [ ] **Step 4: 召回器支持一句多处模糊词，按原句位置返回命中**
- [ ] **Step 5: 运行 `npm test` 并提交 `feat: expand precision vocabulary`**

### Task 3: 混合候选与 DLUT 一致性校验

**Files:**
- Create: `lib/ranker/candidate-validator.js`
- Modify: `lib/ranker/llm-ranker.js`
- Modify: `lib/ranker/rule-ranker.js`
- Modify: `lib/lexicon/dlut.js`
- Modify: `lib/llm/prompts.js`
- Test: `test/candidate-validator.test.js`
- Test: `test/ranker.test.js`

- [ ] **Step 1: 写失败测试**

验证 LLM 可补充本地列表外候选，但错误词性、情绪反向、无理由、重复词和不完整句必须丢弃；合格候选标记 `sourceType: 'llm-supplement'`。

```js
assert.deepEqual(validateCandidates(input, llmItems).map((x) => x.word), ['计划']);
```

- [ ] **Step 2: 运行测试确认缺少验证器**
- [ ] **Step 3: 建立 DLUT word Map，提供极性、类别与强度查询**
- [ ] **Step 4: 实现结构、词性近似、完整句、情绪方向和重复校验**
- [ ] **Step 5: 修改提示词，让模型输出候选来源、置信度和解释证据**
- [ ] **Step 6: 合并本地与模型候选，统一排序并截断为 3 项**
- [ ] **Step 7: 运行 `npm test` 并提交 `feat: validate hybrid replacement candidates`**

### Task 4: 证据驱动报告

**Files:**
- Create: `lib/report/evidence.js`
- Modify: `lib/report/generator.js`
- Modify: `lib/llm/prompts.js`
- Modify: `src/app.js`
- Test: `test/report-evidence.test.js`

- [ ] **Step 1: 写失败测试**

每个不足必须包含 `quote/evidence/impact/action/revised`，亮点必须引用真实原句；同一证据只出现一次；报告只有一个训练任务。

```js
assert.ok(report.weaknesses.every((x) => x.evidence && x.impact && x.action));
assert.equal(new Set(report.weaknesses.map((x) => x.quote)).size, report.weaknesses.length);
```

- [ ] **Step 2: 运行测试确认旧报告结构失败**
- [ ] **Step 3: 从建议、纠错、填充词、模糊词和 DLUT 情绪统计生成证据项**
- [ ] **Step 4: LLM 只能深化已有证据，返回值通过字段和引用校验**
- [ ] **Step 5: 更新报告界面为“证据—影响—改法”**
- [ ] **Step 6: 运行 `npm test` 并提交 `feat: generate evidence-driven reports`**

### Task 5: AudioWorklet 录音链路

**Files:**
- Create: `src/audio-capture-worklet.js`
- Create: `lib/audio/chunk-buffer.js`
- Modify: `src/app.js`
- Modify: `src/index.html`
- Test: `test/audio-worklet.test.js`

- [ ] **Step 1: 写失败测试**

用纯函数测试分块、顺序、停止冲刷和状态机；验证源码不再包含 `createScriptProcessor`。

```js
assert.deepEqual(buffer.flush().length, 1600);
assert.ok(!rendererSource.includes('createScriptProcessor'));
```

- [ ] **Step 2: 运行测试确认失败**
- [ ] **Step 3: Worklet 每累计约 100 ms 发送 Float32Array，主线程只转发块**
- [ ] **Step 4: 实现 idle/starting/recording/stopping/error 状态，重复点击不并发启动**
- [ ] **Step 5: 停止时等待最后 IPC 完成，再生成报告**
- [ ] **Step 6: 运行 `npm test` 和 Electron 麦克风烟雾测试，提交 `feat: move capture to AudioWorklet`**

### Task 6: 本地历史记录

**Files:**
- Modify: `lib/storage/sessions.js`
- Create: `lib/storage/history-index.js`
- Modify: `main.js`
- Modify: `preload.js`
- Modify: `src/index.html`
- Modify: `src/app.js`
- Modify: `src/styles.css`
- Test: `test/history.test.js`

- [ ] **Step 1: 写失败测试**

使用临时目录验证倒序列表、内容搜索、路径穿越防护、单次删除和清空；默认会话数据不得含音频路径。

```js
assert.equal(history.search('复习')[0].id, saved.id);
assert.throws(() => history.remove('../outside'), /非法会话/);
```

- [ ] **Step 2: 运行测试确认缺少历史索引**
- [ ] **Step 3: 会话使用随机 ID 和结构化 JSON，文件操作限制在 sessions 目录**
- [ ] **Step 4: 新增 list/search/get/remove/clear IPC，并只暴露必要 preload API**
- [ ] **Step 5: 增加历史抽屉、搜索、详情、删除和清空确认界面**
- [ ] **Step 6: 运行 `npm test` 与 UI 烟雾测试，提交 `feat: add private local practice history`**

### Task 7: 模型下载可靠性

**Files:**
- Create: `lib/models/model-manifest.js`
- Create: `lib/models/verify-model.js`
- Modify: `scripts/download-model.ps1`
- Modify: `main.js`
- Modify: `preload.js`
- Modify: `src/app.js`
- Test: `test/model-verification.test.js`

- [ ] **Step 1: 写失败测试**

固定模型 URL、Content-Length `511274346` 和 SHA-256；验证缺文件、大小错误和散列错误均拒绝启用。

- [ ] **Step 2: 运行测试确认模块缺失**
- [ ] **Step 3: 计算当前归档 SHA-256 并写入 manifest**
- [ ] **Step 4: 下载脚本先下载到 `.partial`，校验后原子改名并解压**
- [ ] **Step 5: 首次启动缺模型时显示引导和下载进度，失败可重试**
- [ ] **Step 6: 运行测试和一次真实模型校验，提交 `feat: verify downloaded ASR model`**

### Task 8: Windows 安装包与便携版

**Files:**
- Modify: `package.json`
- Create: `build/icon.ico`
- Create: `build/installer.nsh`
- Modify: `.gitignore`
- Modify: `README.md`
- Test: `test/package-config.test.js`

- [ ] **Step 1: 写失败测试**

解析 `package.json`，断言 electron-builder 包含 `nsis` 与 `portable` 目标、模型目录排除、DLUT 数据包含、产物名含版本与架构。

- [ ] **Step 2: 运行测试确认缺少 build 配置**
- [ ] **Step 3: 添加 electron-builder 并配置 Windows x64 安装包、便携版和中文安装选项**
- [ ] **Step 4: 生成应用图标，构建目录加入 Git，`dist/` 加入忽略**
- [ ] **Step 5: 执行 `npm run dist:win`，记录产物大小和 SHA-256**
- [ ] **Step 6: 在 README 写明源码、安装包、便携版三种启动方式**
- [ ] **Step 7: 运行测试并提交 `build: add Windows installer and portable release`**

### Task 9: 真人录音与最终验收

**Files:**
- Create: `docs/VALIDATION.md`
- Create: `validation/.gitkeep`
- Modify: `.gitignore`

- [ ] **Step 1: 准备 10 条不含个人隐私的验收脚本，覆盖五类表达目的**
- [ ] **Step 2: 使用真实麦克风或明确标记的真人公开 WAV，逐条记录原始转写、修正文、延迟和首选候选**
- [ ] **Step 3: 对失败案例先写回归测试，再修复规则；不得只改验收结果**
- [ ] **Step 4: 运行 `npm test`、`npm audit`、`npm run verify:asr`、`npm run verify:electron`、`npm run dist:win`**
- [ ] **Step 5: 检查 `git diff --check`、工作树、安装产物散列和 README 命令**
- [ ] **Step 6: 将真实结果与仍存在的限制写入 `docs/VALIDATION.md` 并提交 `docs: record Windows validation results`**

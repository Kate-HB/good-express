# 架构说明

## 进程边界

Renderer 只获取麦克风并展示结果。它不能读取文件、环境变量或 Node API。`preload.js` 只暴露设置、开始、音频、停止五类 IPC 调用。

Main Process 持有模型和会话状态。音频块进入 `PracticeOrchestrator` 后，依次经过 ASR、上下文、目的推断、候选排序。停止时根据完整转写与实时建议生成报告，并保存到 Electron 用户数据目录。

## 降级原则

- 没有 LLM：规则排序和本地报告继续运行。
- LLM 超过 1.5 秒：返回规则候选，不阻塞录音。
- ASR 置信度低于 0.55：显示字幕，但不据此推荐替词。
- 没有合适候选：保持安静，避免为了“有反馈”而制造错误建议。

## 扩展接口

新的 ASR 需实现 `start()`、`acceptAudio(Float32Array)`、`stop()`，并输出 `{text,isFinal,confidence,timestamp}`。新的反馈模型需实现 `rank(input)`，返回与 `lib/contracts.js` 一致的候选结构。

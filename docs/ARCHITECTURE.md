# 架构说明

## 进程边界

Renderer 只获取麦克风并展示结果。AudioWorklet 在音频线程完成 16 kHz 降采样，每约 100 ms 发送一块；主线程只负责串行转发。Renderer 不能读取文件、环境变量或 Node API，`preload.js` 只暴露设置、模型、历史和练习 IPC。

Main Process 持有模型和会话状态。音频块进入 `PracticeOrchestrator` 后，依次经过 ASR、保守纠错、上下文、目的推断、候选召回、规则/LLM 混合排序。停止时根据完整转写与实时建议生成证据报告，并把文字与报告保存到 Electron 用户数据目录；默认不保存音频。

模型下载由主进程启动隐藏 PowerShell 进程。脚本先写 `.partial` 文件，再验证 511274346 字节与固定 SHA-256，验证成功才改名和解压。安装版、便携版统一写入持久用户目录。

## 降级原则

- 没有 LLM：规则排序和本地报告继续运行。
- LLM 超过 1.5 秒：返回规则候选，不阻塞录音。
- ASR 置信度低于 0.55：显示字幕，但不据此推荐替词。
- 没有合适候选：保持安静，避免为了“有反馈”而制造错误建议。
- LLM 补充候选不满足结构、置信度、替换完整性或 DLUT 极性：拒绝补充，仅保留本地候选。

## 扩展接口

新的 ASR 需实现 `start()`、`acceptAudio(Float32Array)`、`stop()`，并输出 `{text,isFinal,confidence,timestamp}`。新的反馈模型需实现 `rank(input)`；若补充候选，还必须输出 `confidence/reason/rewritten`，并通过 `candidate-validator`。

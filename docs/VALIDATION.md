# Windows 验收报告

验收环境：Windows 11 x64、Node.js 24.13.0、Electron 43.2.0、Sherpa-ONNX Node 1.13.4、CPU 推理。

## 1. 自动测试

- Node 测试：40/40 通过。
- `npm audit --omit=dev`：0 个漏洞。
- Sherpa 原生模块：Node 与 Electron 运行时均成功加载。
- 模型归档：511274346 字节，SHA-256 为 `27FFBD9EE24AD186D99ACC2F6354D7992B27BCAB490812510665FA8F9389C5F8`。

## 2. 真人公开 WAV 批测

2026-07-23 使用 10 段公开真人中文或中英混合 WAV。样本只在临时验收目录使用，不随项目分发。来源：

- [Sherpa-ONNX 双语流式模型样本](https://github.com/k2-fsa/sherpa-onnx)：4 段。
- [FunASR 样本](https://github.com/modelscope/FunASR)：3 段。
- [Qwen3 ASR Rust 样本](https://github.com/second-state/qwen3_asr_rs)：1 段。
- [WeNet AISHELL 样本](https://github.com/wenet-e2e/wenet)：1 段。
- [PaddleSpeech 中文样本](https://github.com/PaddlePaddle/PaddleSpeech)：1 段。

所有音频统一转为 16 kHz 单声道，每 100 ms 输入一块，末尾补 3 秒静音以触发终句。

| 文件 | 时长/s | 耗时/ms | RTF | 目的 | 结果 |
|---|---:|---:|---:|---|---|
| funasr-example | 5.55 | 1672 | 0.301 | 自由表达 | 通过 |
| funasr-long | 8.00 | 1817 | 0.227 | 自由表达 | 通过 |
| funasr-mid | 4.99 | 1763 | 0.353 | 自由表达 | 通过 |
| paddle | 5.00 | 1680 | 0.336 | 表达观点 | 通过 |
| qwen | 5.60 | 1673 | 0.299 | 自由表达 | 通过 |
| sherpa-0 | 10.05 | 1854 | 0.184 | 讲述经历 | 通过 |
| sherpa-1 | 5.10 | 1602 | 0.314 | 分享讲解 | 通过 |
| sherpa-2 | 4.69 | 1583 | 0.338 | 自由表达 | 通过 |
| sherpa-3 | 8.83 | 1970 | 0.223 | 分享讲解 | 通过 |
| wenet-aishell | 4.28 | 1761 | 0.411 | 自由表达 | 通过 |

结果：10/10 产生非空终句，RTF 为 0.184–0.411，均快于音频实时播放。公开样本主要用于 ASR 声学链路，不专门包含模糊表达，因此只有 Paddle 样本触发替词候选；候选系统的语境差异由自动测试覆盖。

批测暴露并修复了一个真实问题：原规则可能误删正常叠词。现使用 ICU 中文词边界保护“爸爸、谢谢、星星”等词，并保留原始转写供追溯。

## 3. Electron 与打包程序

使用 Qwen 真人 WAV 作为 Chromium 假麦克风输入，分别验证源码 Electron 和 `dist/win-unpacked/言析.exe`：

1. AudioWorklet 成功获取并发送音频。
2. Sherpa 实时转写产生非空字幕。
3. 停止后生成“本次表达反馈”。
4. 报告写入本地历史，历史弹窗可读取。
5. 页面错误信息为空。
6. 打包程序内点击“下载”后，复用缓存归档、完成 SHA-256 校验，并把完整模型写入 `%APPDATA%\expression-trainer-desktop\models`。

Windows 构建产生：

- `GoodExpress-Setup-1.0.0-x64.exe`：NSIS 安装版。
- `GoodExpress-Portable-1.0.0-x64.exe`：便携版。

最终产物 SHA-256：

- 安装版：`7149237DA5FC43B6973042F710F86E5338A7EF7C0AFEF2873AA74BE9301E4382`
- 便携版：`C9E86565EAFA846E7F03A530CA7E7209545BDA499FAA15CCE4E98C2B95C8DF05`

二者均包含 Windows x64 Sherpa 原生 DLL/Node 模块，不内置 488 MB 模型。首次运行在设置页下载，模型写入持久用户目录。

## 4. 尚存边界

- 当前双语模型在专有名词、中英混说和噪声语音上仍会错字；保守纠错不能替代更强 ASR。
- 公开真人样本未完整覆盖“计划、愿望、请求、自媒体口播、工作汇报”五类自然长表达；这些类别已有文本级测试，仍需后续邀请真实用户盲测。
- 本地精准词表覆盖 30 个高频模糊表达，不等于开放域同义词库；LLM 补充可扩大覆盖，但结果仍需校验。
- 安装文件未配置商业代码签名证书，Windows 可能显示未知发布者。
- DLUT 原资源面向学术研究；公开商业使用前必须向大连理工大学信息检索研究室确认授权。

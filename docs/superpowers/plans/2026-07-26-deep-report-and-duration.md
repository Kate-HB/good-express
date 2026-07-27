# Deep Report and Audio Duration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce evidence-based reports with the depth of Expression Trainer while calculating uploaded-audio speed from real sample duration.

**Architecture:** Keep the current ASR and report compatibility fields. Add optional duration injection at the orchestrator boundary, enrich deterministic and LLM reports with score, positioning, behavior patterns, and structure analysis, then render/export those fields defensively.

**Tech Stack:** Node.js CommonJS, Electron IPC, Node test runner

---

### Task 1: Real Uploaded-Audio Duration

**Files:**
- Modify: `lib/orchestrator.js`
- Modify: `lib/audio/upload-analysis.js`
- Modify: `main.js`
- Modify: `test/orchestrator.test.js`
- Modify: `test/upload-audio.test.js`

- [x] Write tests proving `stop({ durationSeconds })` overrides wall-clock duration and uploaded samples pass `samples.length / sampleRate`.
- [x] Run the focused tests and confirm they fail for missing duration propagation.
- [x] Add the optional duration override to `PracticeOrchestrator.stop()`.
- [x] Pass source duration from `analyzeUploadedAudio()`.
- [x] Accumulate 16 kHz samples in the streaming upload IPC path and pass the calculated duration on stop.
- [x] Run focused tests and confirm they pass.

### Task 2: Deep Report Contract and Prompt

**Files:**
- Modify: `lib/report/generator.js`
- Modify: `lib/report/llm-report.js`
- Modify: `test/report.test.js`
- Modify: `test/llm-report.test.js`

- [x] Write tests for `score`, `positioning`, `behaviorPatterns`, `structureAnalysis`, and the ASR-evidence prompt boundary.
- [x] Run tests and confirm RED.
- [x] Add deterministic fallback fields without inventing facts.
- [x] Expand the strict JSON prompt to request total assessment, line editing, vocabulary, behavior, structure, metrics, and one exercise.
- [x] Merge validated LLM fields while retaining fallback fields for incomplete responses.
- [x] Run focused tests and confirm GREEN.

### Task 3: Rich UI and Markdown Export

**Files:**
- Modify: `src/app.js`
- Modify: `lib/report/markdown.js`
- Modify: `test/window.test.js`
- Modify: `test/markdown-export.test.js`

- [x] Write tests requiring total score, behavior pattern, structure analysis, and old-report compatibility.
- [x] Run tests and confirm RED.
- [x] Render new report cards only when fields exist.
- [x] Export the same sections in Markdown with safe fallbacks.
- [x] Run focused tests and confirm GREEN.

### Task 4: Verification

**Files:**
- Verify all changed files.

- [x] Run `npm test` and require zero failures.
- [x] Run `node --check` for changed JavaScript files.
- [x] Run `git diff --check`.
- [x] Run `npm run verify:asr` to confirm ASR remains unchanged.
- [x] Compare the generated schema against both supplied reports.

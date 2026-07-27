# Manual Report Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish transcription first and generate/save a report only after the user clicks “生成报告”.

**Architecture:** Split `PracticeOrchestrator.stop()` into reusable finish and report phases while retaining the wrapper for existing non-UI callers. Electron stores one pending finalized context and exposes a single manual generation IPC. Renderer shows a pending-report button for recording, upload, and pasted text.

**Tech Stack:** Node.js CommonJS, Electron IPC, HTML/CSS, Node test runner

---

### Task 1: Split Finalization from Report Generation

**Files:**
- Modify: `lib/orchestrator.js`
- Modify: `test/orchestrator.test.js`

- [ ] Add failing tests proving `finish()` flushes ASR without calling LLM and `generateReport()` calls it later.
- [ ] Implement idempotent `finish()` and `generateReport()`.
- [ ] Keep `stop()` as a compatibility wrapper.
- [ ] Run focused tests.

### Task 2: Prepare Pasted Text Without Generating

**Files:**
- Modify: `lib/text-analysis.js`
- Modify: `test/text-analysis.test.js`

- [ ] Add a failing test for `preparePastedText()`.
- [ ] Return a finalized orchestrator and transcript without saving history.
- [ ] Reuse it inside the existing compatibility helper.
- [ ] Run focused tests.

### Task 3: Pending Report IPC

**Files:**
- Modify: `main.js`
- Modify: `preload.js`
- Modify: `test/window.test.js`
- Modify: `test/upload-audio.test.js`

- [ ] Add source-contract tests for stop-without-report, unified generate IPC, retry preservation, and new-task discard.
- [ ] Store finalized recording/upload/text context in `pendingReport`.
- [ ] Generate and save only in `practice:generate-report`.
- [ ] Retain pending context when generation throws.
- [ ] Clear pending context when a new task starts.
- [ ] Expose `generateReport()` through preload.
- [ ] Run focused tests.

### Task 4: Manual Report UI

**Files:**
- Modify: `src/index.html`
- Modify: `src/app.js`
- Modify: `src/styles.css`
- Modify: `test/window.test.js`

- [ ] Add failing source-contract tests for the manual button and status flow.
- [ ] Add a hidden “生成报告” button.
- [ ] Show it after recording, upload, or pasted-text finalization.
- [ ] Disable it while generating; retain it on failure.
- [ ] Change recording copy from “结束并生成报告” to “结束录音”.
- [ ] Run focused tests.

### Task 5: Verification

- [ ] Run `npm test`.
- [ ] Run syntax checks and `git diff --check`.
- [ ] Run `npm run verify:asr`.

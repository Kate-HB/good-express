# Expression Trainer Feedback Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Good Express ASR infrastructure while matching Expression Trainer's final-sentence analysis, 30-character AI feedback trigger, and complete stop-time transcription.

**Architecture:** `PracticeOrchestrator` remains the single streaming coordinator. A focused realtime-feedback module owns the 30-character gate and short-coaching request; the renderer only displays the normalized update. The existing Sherpa adapter, AudioWorklet, conservative cleaner, report generator, history, upload, and model management remain unchanged.

**Tech Stack:** Node.js CommonJS, Electron IPC, Sherpa-ONNX, Node test runner

---

## File Structure

- Create `lib/feedback/realtime.js`: threshold state, prompt construction, timeout, and safe LLM fallback.
- Modify `lib/orchestrator.js`: run local final-sentence analysis and thresholded realtime feedback.
- Modify `main.js`: return final normalized transcripts after the stop-time recognizer flush.
- Modify `src/app.js`: display short AI feedback and replace partial text with the final flushed transcript.
- Modify `test/orchestrator.test.js`: cover threshold, partial suppression, deduplication, and failure fallback.
- Create `test/realtime-feedback.test.js`: cover prompt contract and threshold state.
- Modify `test/window.test.js`: check renderer consumption of final stop transcript and feedback.

### Task 1: Realtime Feedback Gate

**Files:**
- Create: `lib/feedback/realtime.js`
- Create: `test/realtime-feedback.test.js`

- [x] **Step 1: Write failing tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { RealtimeFeedbackGate, buildRealtimeMessages } = require('../lib/feedback/realtime');

test('requests feedback once each time final transcript grows by 30 characters', () => {
  const gate = new RealtimeFeedbackGate(30);
  assert.equal(gate.claim('甲'.repeat(29)), false);
  assert.equal(gate.claim('甲'.repeat(30)), true);
  assert.equal(gate.claim('甲'.repeat(59)), false);
  assert.equal(gate.claim('甲'.repeat(60)), true);
});

test('realtime prompt requests one short JSON feedback item', () => {
  const messages = buildRealtimeMessages('我先介绍背景，然后说明结论。');
  assert.match(messages[0].content, /feedback/);
  assert.match(messages[0].content, /不超过8个字/);
  assert.match(messages[1].content, /我先介绍背景/);
});
```

- [x] **Step 2: Run tests and verify RED**

Run: `node --test test/realtime-feedback.test.js`

Expected: FAIL because `lib/feedback/realtime.js` does not exist.

- [x] **Step 3: Implement the gate and safe request**

```js
class RealtimeFeedbackGate {
  constructor(threshold = 30) {
    this.threshold = threshold;
    this.claimedLength = 0;
  }

  claim(transcript) {
    if (transcript.length - this.claimedLength < this.threshold) return false;
    this.claimedLength = transcript.length;
    return true;
  }
}

function buildRealtimeMessages(transcript) {
  return [
    {
      role: 'system',
      content: '你是中文口语实时教练。输出严格 JSON：{"feedback":"提示"}。每次只给1条提示，不超过8个字；无提示时输出空字符串。优先检查重复、结论缺失、缺少例子、主题漂移和立场模糊，不纠正语音识别错误。'
    },
    { role: 'user', content: transcript.slice(-500) }
  ];
}

async function requestRealtimeFeedback({ transcript, llm, timeoutMs = 1500 }) {
  if (!llm) return '';
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs));
    const result = await Promise.race([llm.complete(buildRealtimeMessages(transcript)), timeout]);
    return typeof result?.feedback === 'string' ? result.feedback.trim().slice(0, 16) : '';
  } catch {
    return '';
  }
}

module.exports = { RealtimeFeedbackGate, buildRealtimeMessages, requestRealtimeFeedback };
```

- [x] **Step 4: Run tests and verify GREEN**

Run: `node --test test/realtime-feedback.test.js`

Expected: 2 tests pass.

### Task 2: Orchestrator Alignment

**Files:**
- Modify: `lib/orchestrator.js`
- Modify: `test/orchestrator.test.js`

- [x] **Step 1: Write failing behavior tests**

```js
test('only final text can trigger AI feedback after 30 new characters', async () => {
  let calls = 0;
  const llm = {
    rank: async (input) => input,
    complete: async () => { calls += 1; return { feedback: '先说结论' }; }
  };
  const app = new PracticeOrchestrator({ asr: { start: async () => {}, stop: async () => null }, llm, emotionRows: [] });
  await app.start();
  const partial = await app.processAsrEvent({ text: '甲'.repeat(35), isFinal: false, confidence: 1, timestamp: 1 });
  assert.equal(partial.realtimeFeedback, '');
  const final = await app.processAsrEvent({ text: '甲'.repeat(35), isFinal: true, confidence: 1, timestamp: 2 });
  assert.equal(final.realtimeFeedback, '先说结论');
  assert.equal(calls, 1);
});

test('does not repeat realtime request before another 30 characters and survives LLM failure', async () => {
  let calls = 0;
  const llm = {
    rank: async (input) => input,
    complete: async () => { calls += 1; throw new Error('offline'); }
  };
  const app = new PracticeOrchestrator({ asr: { start: async () => {}, stop: async () => null }, llm, emotionRows: [] });
  await app.start();
  const first = await app.processAsrEvent({ text: '甲'.repeat(30), isFinal: true, confidence: 1, timestamp: 1 });
  const second = await app.processAsrEvent({ text: '乙'.repeat(10), isFinal: true, confidence: 1, timestamp: 2 });
  assert.equal(first.realtimeFeedback, '');
  assert.equal(second.realtimeFeedback, '');
  assert.equal(calls, 1);
  assert.equal(app.session.transcript.length, 40);
});
```

- [x] **Step 2: Run tests and verify RED**

Run: `node --test test/orchestrator.test.js`

Expected: FAIL because updates do not expose `realtimeFeedback` and no 30-character gate exists.

- [x] **Step 3: Integrate minimal behavior**

Add imports:

```js
const { RealtimeFeedbackGate, requestRealtimeFeedback } = require('./feedback/realtime');
```

Initialize in the constructor:

```js
this.feedbackGate = new RealtimeFeedbackGate(30);
```

After final-sentence local analysis, request only when the accepted final expands the transcript enough:

```js
let realtimeFeedback = '';
if (accepted.shouldAnalyze && this.feedbackGate.claim(this.session.transcript)) {
  realtimeFeedback = await requestRealtimeFeedback({
    transcript: this.session.transcript,
    llm: this.llm,
    timeoutMs: this.rankTimeoutMs
  });
}
return {
  asr: normalizedAsr,
  transcript: this.session.transcript,
  rawTranscript: this.session.rawTranscript,
  partial: this.session.partial,
  purpose,
  emotions,
  suggestion,
  realtimeFeedback
};
```

- [x] **Step 4: Run tests and verify GREEN**

Run: `node --test test/orchestrator.test.js test/realtime-feedback.test.js`

Expected: all tests pass.

### Task 3: Stop-Time Transcript and Renderer Feedback

**Files:**
- Modify: `main.js`
- Modify: `src/app.js`
- Modify: `test/window.test.js`

- [x] **Step 1: Write failing source-contract test**

```js
test('renderer displays realtime feedback and replaces partial text with stop-flushed transcript', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8');
  const main = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  assert.match(source, /update\.realtimeFeedback/);
  assert.match(source, /result\.transcript/);
  assert.match(main, /transcript:\s*trainer\.session\.transcript/);
});
```

- [x] **Step 2: Run test and verify RED**

Run: `node --test test/window.test.js`

Expected: FAIL because realtime feedback and final transcript are not consumed.

- [x] **Step 3: Return the flushed transcript before clearing trainer**

Change the stop handler result:

```js
const result = {
  report,
  sessionId: record.id,
  transcript: trainer.session.transcript,
  rawTranscript: trainer.session.rawTranscript
};
trainer = null;
return result;
```

- [x] **Step 4: Render feedback and the final transcript**

Extend `renderUpdate`:

```js
if (update.realtimeFeedback) {
  byId('suggestions').innerHTML = `<article class="suggestion"><p>${escapeHtml(update.realtimeFeedback)}</p></article>${byId('suggestions').innerHTML}`;
}
```

Before rendering the report in `stopRecording`:

```js
if (result?.transcript) byId('transcript').textContent = result.transcript;
if (result) renderReport(result.report);
```

- [x] **Step 5: Run test and verify GREEN**

Run: `node --test test/window.test.js`

Expected: all tests pass.

### Task 4: Full Verification

**Files:**
- Verify all modified files.

- [x] **Step 1: Run complete automated tests**

Run: `npm test`

Expected: zero failures.

- [x] **Step 2: Run syntax and whitespace checks**

Run: `node --check lib/feedback/realtime.js`

Expected: exit 0.

Run: `node --check lib/orchestrator.js`

Expected: exit 0.

Run: `node --check src/app.js`

Expected: exit 0.

Run: `git diff --check`

Expected: no output.

- [x] **Step 3: Run the existing real ASR check**

Run: `npm run verify:asr`

Expected: a non-empty final transcript and exit 0.

- [x] **Step 4: Review scope**

Confirm the diff does not replace AudioWorklet, Sherpa model discovery, model verification, conservative cleaning, upload, history, or report persistence.

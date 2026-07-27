const test = require('node:test');
const assert = require('node:assert/strict');
const { PracticeOrchestrator } = require('../lib/orchestrator');
const { MockAsrAdapter } = require('../lib/asr/mock');

test('orchestrator turns final ASR text into purpose, suggestion and report', async () => {
  const app = new PracticeOrchestrator({
    asr: new MockAsrAdapter([{ text: '我想要分享学习方法，心里很期待。', isFinal: true }]),
    emotionRows: [{ word: '期待', category: 'PA', intensity: 5, polarity: 1 }]
  });
  await app.start();
  const update = await app.acceptAudio(new Float32Array([0]));
  assert.equal(update.purpose.label, '分享讲解');
  assert.equal(update.suggestion.source, '想要');
  assert.equal(update.emotions[0].word, '期待');
  const report = await app.stop();
  assert.ok(report.highlights.length);
  assert.equal(report.metrics.emotionWords, 1);
});

test('stop flushes the final ASR sentence before generating report', async () => {
  const asr = {
    start: async () => {},
    acceptAudio: async () => ({ text: '我想要完成项目', isFinal: false, confidence: 1, timestamp: Date.now() }),
    stop: async () => ({ text: '我想要完成项目。', isFinal: true, confidence: 1, timestamp: Date.now() })
  };
  const app = new PracticeOrchestrator({ asr, emotionRows: [] });
  await app.start();
  await app.acceptAudio(new Float32Array([0]));
  const report = await app.stop();
  assert.equal(app.session.transcript, '我想要完成项目。');
  assert.equal(report.rewrites[0].original, '我想要完成项目。');
});

test('only final text can trigger AI feedback after 30 new characters', async () => {
  const text = '今天我先介绍项目背景接着说明实施过程最后给出明确结论以及下一步具体行动计划';
  let calls = 0;
  const llm = {
    rank: async (input) => input,
    complete: async () => { calls += 1; return { feedback: '先说结论' }; }
  };
  const app = new PracticeOrchestrator({
    asr: { start: async () => {}, stop: async () => null },
    llm,
    emotionRows: []
  });
  await app.start();
  const partial = await app.processAsrEvent({ text, isFinal: false, confidence: 1, timestamp: 1 });
  assert.equal(partial.realtimeFeedback, '');
  const final = await app.processAsrEvent({ text, isFinal: true, confidence: 1, timestamp: 2 });
  assert.equal(final.realtimeFeedback, '先说结论');
  assert.equal(calls, 1);
});

test('does not repeat realtime request before another 30 characters and survives LLM failure', async () => {
  const firstText = '今天我先介绍项目背景接着说明实施过程最后给出明确结论以及下一步具体行动计划';
  const secondText = '补充一个具体例子';
  let calls = 0;
  const llm = {
    rank: async (input) => input,
    complete: async () => { calls += 1; throw new Error('offline'); }
  };
  const app = new PracticeOrchestrator({
    asr: { start: async () => {}, stop: async () => null },
    llm,
    emotionRows: []
  });
  await app.start();
  const first = await app.processAsrEvent({ text: firstText, isFinal: true, confidence: 1, timestamp: 1 });
  const second = await app.processAsrEvent({ text: secondText, isFinal: true, confidence: 1, timestamp: 2 });
  assert.equal(first.realtimeFeedback, '');
  assert.equal(second.realtimeFeedback, '');
  assert.equal(calls, 1);
  assert.equal(app.session.transcript, `${firstText}。${secondText}。`);
});

test('explicit audio duration overrides wall-clock duration in the report', async () => {
  const asr = new MockAsrAdapter([{ text: '这是十二秒的表达。', isFinal: true }]);
  const app = new PracticeOrchestrator({ asr, emotionRows: [] });
  await app.start();
  await app.acceptAudio(new Float32Array([0]));
  const report = await app.stop({ durationSeconds: 12 });
  assert.equal(report.metrics.durationSeconds, 12);
  assert.equal(report.metrics.charactersPerMinute, Math.round(report.metrics.characters * 5));
});

test('finish flushes transcription without generating a report until requested', async () => {
  let reportCalls = 0;
  const llm = {
    rank: async (input) => input,
    complete: async () => { reportCalls += 1; return { summary: '手动报告' }; }
  };
  const asr = new MockAsrAdapter([{ text: '这是清晰表达。', isFinal: true }]);
  const app = new PracticeOrchestrator({ asr, llm, emotionRows: [] });
  await app.start();
  await app.acceptAudio(new Float32Array([0]));
  const finished = await app.finish({ durationSeconds: 8 });
  assert.equal(finished.transcript, '这是清晰表达。');
  assert.equal(reportCalls, 0);
  const report = await app.generateReport({ trainingGoal: '先说结论' });
  assert.equal(report.summary, '手动报告');
  assert.equal(report.metrics.durationSeconds, 8);
  assert.equal(reportCalls, 1);
});

test('finish is idempotent and flushes ASR only once', async () => {
  let stopCalls = 0;
  const asr = {
    start: async () => {},
    stop: async () => {
      stopCalls += 1;
      return { text: '最后一句。', isFinal: true, confidence: 1, timestamp: Date.now() };
    }
  };
  const app = new PracticeOrchestrator({ asr, emotionRows: [] });
  await app.start();
  await app.finish({ durationSeconds: 5 });
  await app.finish({ durationSeconds: 5 });
  assert.equal(stopCalls, 1);
  assert.equal(app.session.transcript, '最后一句。');
});

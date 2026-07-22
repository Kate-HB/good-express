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

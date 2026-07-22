const test = require('node:test');
const assert = require('node:assert/strict');
const { validateSuggestion, validateAsrEvent } = require('../lib/contracts');

test('IPC contract accepts complete feedback and rejects more than three candidates', () => {
  const item = { word: '期待', tone: '积极', intensity: '中', reason: '更贴合愿望', rewritten: '我期待这次见面。' };
  assert.equal(validateSuggestion({ source: '想要', sentence: '我想要见面。', candidates: [item] }), true);
  assert.throws(() => validateSuggestion({ source: '想要', sentence: 'x', candidates: [item, item, item, item] }), /最多 3 个/);
});

test('IPC contract validates streaming ASR events', () => {
  assert.equal(validateAsrEvent({ text: '你好', isFinal: false, confidence: 0.9, timestamp: 12 }), true);
  assert.throws(() => validateAsrEvent({ text: '你好' }), /ASR/);
});

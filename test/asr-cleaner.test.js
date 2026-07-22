const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanAsrText } = require('../lib/asr/conservative-cleaner');
const { PracticeSession } = require('../lib/context/session');

test('removes high-confidence ASR duplicate tails and records edits', () => {
  const result = cleanAsrText('我想要先整理理数据在在开始训练练', { purpose: '说明计划' });
  assert.equal(result.cleanText, '我想要先整理数据再开始训练。');
  assert.equal(result.rawText, '我想要先整理理数据在在开始训练练');
  assert.ok(result.edits.length >= 3);
  assert.ok(result.edits.every((edit) => edit.rule && edit.confidence >= 0.8));
});

test('keeps common intentional reduplication', () => {
  const result = cleanAsrText('人人都可以看看，再慢慢试试。');
  assert.equal(result.cleanText, '人人都可以看看，再慢慢试试。');
  assert.equal(result.edits.length, 0);
});

test('session preserves raw transcript while analysis reads clean transcript', () => {
  const session = new PracticeSession();
  session.accept({ text: '训练练', cleanText: '训练。', isFinal: true });
  assert.equal(session.rawTranscript, '训练练');
  assert.equal(session.transcript, '训练。');
});

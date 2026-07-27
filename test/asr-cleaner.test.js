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

test('uses Chinese word boundaries instead of deleting valid repeated words', () => {
  const result = cleanAsrText('爸爸妈妈说谢谢，宝宝指着星星笑。');
  assert.equal(result.cleanText, '爸爸妈妈说谢谢，宝宝指着星星笑。');
  assert.equal(result.edits.length, 0);
});

test('collapses repeated ASR phrases', () => {
  const result = cleanAsrText('如果如果如果我们不团结起来我们不团结起来就会失败。');
  assert.equal(result.cleanText, '如果我们不团结起来就会失败。');
  assert.ok(result.edits.some((edit) => edit.rule === 'duplicate-phrase'));
});

test('collapses repeated discourse words and triple reduplications', () => {
  const result = cleanAsrText('所以如果如果我们不团结起来会一直处处处在尴尬的地位上');
  assert.equal(result.cleanText, '所以如果我们不团结起来会一直处在尴尬的地位上。');
  assert.ok(result.edits.some((edit) => edit.original === '如果如果'));
  assert.ok(result.edits.some((edit) => edit.original === '处处处'));
});

test('session preserves raw transcript while analysis reads clean transcript', () => {
  const session = new PracticeSession();
  session.accept({ text: '训练练', cleanText: '训练。', isFinal: true });
  assert.equal(session.rawTranscript, '训练练');
  assert.equal(session.transcript, '训练。');
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { PracticeSession } = require('../lib/context/session');
const { inferPurpose } = require('../lib/context/purpose');

test('final sentence triggers once and keeps context', () => {
  const session = new PracticeSession({ contextSize: 3 });
  assert.equal(session.accept({ text: '今天想分享学习方法。', isFinal: true }).shouldAnalyze, true);
  assert.equal(session.accept({ text: '今天想分享学习方法。', isFinal: true }).shouldAnalyze, false);
  session.accept({ text: '第一步是制定计划。', isFinal: true });
  assert.equal(session.transcript, '今天想分享学习方法。第一步是制定计划。');
});

test('infers and explains an expression purpose', () => {
  const result = inferPurpose('今天想分享三个复习方法，第一步是整理错题。');
  assert.equal(result.label, '分享讲解');
  assert.ok(result.reason.includes('分享'));
  assert.ok(result.confidence > 0.5);
});

test('action sequence outweighs 想要 and is inferred as a plan', () => {
  const result = inferPurpose('我想要先整理数据，再开始训练。');
  assert.equal(result.label, '说明计划');
  assert.ok(result.reason.includes('先'));
});

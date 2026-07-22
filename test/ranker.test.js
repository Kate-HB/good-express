const test = require('node:test');
const assert = require('node:assert/strict');
const { rankCandidates } = require('../lib/ranker/rule-ranker');
const { rankWithFallback } = require('../lib/ranker/llm-ranker');

test('ranks 想要 differently by purpose and context', () => {
  const wish = rankCandidates({ sentence: '我想要明年考上研究生。', context: '谈未来愿望', purpose: '表达愿望' });
  const plan = rankCandidates({ sentence: '我想要先整理数据，再开始训练。', context: '讲执行步骤', purpose: '说明计划' });
  assert.equal(wish.candidates[0].word, '希望');
  assert.equal(plan.candidates[0].word, '打算');
  assert.ok(wish.candidates.length <= 3);
  assert.ok(wish.candidates.every((item) => item.reason && item.rewritten));
});

test('falls back to rules when LLM times out', async () => {
  const never = { rank: () => new Promise(() => {}) };
  const result = await rankWithFallback({ sentence: '我想要完成项目。', context: '', purpose: '说明计划' }, never, 20);
  assert.equal(result.sourceType, 'rules');
  assert.equal(result.candidates[0].word, '打算');
});

test('LLM receives recalled candidates instead of inventing replacements', async () => {
  let received;
  const adapter = { rank: async (input) => { received = input; return { source: input.source, sentence: input.sentence, candidates: input.candidates.slice(0, 1) }; } };
  const result = await rankWithFallback({ sentence: '我想要完成项目。', context: '', purpose: '说明计划' }, adapter, 100);
  assert.equal(received.source, '想要');
  assert.ok(received.candidates.some((item) => item.word === '打算'));
  assert.equal(result.sourceType, 'llm');
});

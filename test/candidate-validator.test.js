const test = require('node:test');
const assert = require('node:assert/strict');
const { validateSupplementCandidates } = require('../lib/ranker/candidate-validator');

test('accepts an explainable LLM supplement and marks its source', () => {
  const items = validateSupplementCandidates({ sentence: '我想要完成项目。', source: '想要', localCandidates: [] }, [{
    word: '计划', tone: '明确', intensity: '中', reason: '适合已经形成安排的语境',
    rewritten: '我计划完成项目。', confidence: 0.88
  }]);
  assert.equal(items[0].word, '计划');
  assert.equal(items[0].sourceType, 'llm-supplement');
});

test('rejects incomplete, low-confidence and mechanically invalid supplements', () => {
  const items = validateSupplementCandidates({ sentence: '我想要完成项目。', source: '想要', localCandidates: [{ word: '希望' }] }, [
    { word: '希望', tone: '积极', intensity: '中', reason: '重复本地词', rewritten: '我希望完成项目。', confidence: 0.9 },
    { word: '瞎搞', tone: '随意', intensity: '强', reason: '', rewritten: '我瞎搞完成项目。', confidence: 0.9 },
    { word: '计划', tone: '明确', intensity: '中', reason: '证据不足', rewritten: '整句不含候选', confidence: 0.9 },
    { word: '准备', tone: '明确', intensity: '中', reason: '置信度太低', rewritten: '我准备完成项目。', confidence: 0.4 }
  ]);
  assert.deepEqual(items, []);
});

test('rejects opposite DLUT polarity when both words have emotion metadata', () => {
  const index = new Map([
    ['开心', { partOfSpeech: 'adj', polarity: 1 }],
    ['悲痛', { partOfSpeech: 'adj', polarity: 2 }]
  ]);
  const items = validateSupplementCandidates({ sentence: '我今天很开心。', source: '开心', localCandidates: [], dlutIndex: index }, [{
    word: '悲痛', tone: '消极', intensity: '强', reason: '错误反向', rewritten: '我今天很悲痛。', confidence: 0.9
  }]);
  assert.deepEqual(items, []);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadPrecisionMap, recallAllCandidates } = require('../lib/lexicon/candidates');

test('normalized precision lexicon covers at least thirty vague expressions', () => {
  const map = loadPrecisionMap();
  assert.ok(Object.keys(map).length >= 30, `当前仅覆盖 ${Object.keys(map).length} 个词`);
  for (const [source, items] of Object.entries(map)) {
    assert.ok(items.length >= 3, `${source} 的候选不足 3 个`);
    for (const item of items) {
      for (const field of ['word', 'tone', 'intensity', 'formality', 'purposes', 'positiveExample', 'negativeExample', 'reason']) {
        assert.ok(item[field], `${source}.${item.word} 缺少 ${field}`);
      }
    }
  }
});

test('recalls multiple vague expressions in sentence order', () => {
  const matches = recallAllCandidates('其实我觉得这个方法很好。');
  assert.deepEqual(matches.map((item) => item.source), ['其实', '觉得', '很好']);
  assert.ok(matches.every((item) => Number.isInteger(item.offset)));
});

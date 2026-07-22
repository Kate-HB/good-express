const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadDlut, findEmotionWords } = require('../lib/lexicon/dlut');
const { recallCandidates } = require('../lib/lexicon/candidates');

test('loads the complete DLUT emotion ontology', () => {
  const rows = loadDlut(path.join(__dirname, '../data/dlut-emotion-ontology.csv'));
  assert.ok(rows.length > 20000, `应为全量词库，实际 ${rows.length} 条`);
  assert.ok(rows.some((row) => row.word && row.category && Number.isFinite(row.intensity)));
  assert.ok(findEmotionWords('我今天很开心，也有一点担心。', rows).length >= 2);
});

test('recalls contextual precision candidates for 想要', () => {
  const result = recallCandidates('我想要以后成为一名老师。');
  assert.equal(result.source, '想要');
  assert.ok(result.candidates.some((item) => item.word === '希望'));
  assert.ok(result.candidates.every((item) => item.tone && item.intensity && item.tags.length));
});

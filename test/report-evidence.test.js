const test = require('node:test');
const assert = require('node:assert/strict');
const { generateReport } = require('../lib/report/generator');

test('every weakness contains evidence, impact, action and revision', () => {
  const report = generateReport({
    transcript: '嗯，我想要完成这个事情。', durationSeconds: 8,
    suggestions: [{ source: '想要', sentence: '我想要完成这个事情。', candidates: [{ word: '打算', reason: '行动意图更明确', rewritten: '我打算完成这个事情。' }] }]
  });
  assert.ok(report.weaknesses.length > 0);
  assert.ok(report.weaknesses.every((item) => item.quote && item.evidence && item.impact && item.action && item.revised));
  assert.equal(new Set(report.weaknesses.map((item) => item.quote)).size, report.weaknesses.length);
  assert.equal(typeof report.exercise, 'string');
});

test('report exposes conservative correction records separately', () => {
  const report = generateReport({ transcript: '我打算训练。', corrections: [{ original: '训练练', replacement: '训练', rule: 'duplicate-tail', confidence: 0.9 }] });
  assert.equal(report.corrections[0].original, '训练练');
  assert.match(report.corrections[0].explanation, /重复/);
});

test('report groups repeated suggestions instead of listing every sentence', () => {
  const suggestions = Array.from({ length: 8 }, (_, index) => ({
    source: '那个',
    sentence: `第${index}句，那个内容需要更清楚。`,
    candidates: [{ word: '这个要点', reason: '指代更明确', rewritten: `第${index}句，这个要点需要更清楚。` }]
  }));
  const report = generateReport({ transcript: suggestions.map((item) => item.sentence).join(''), suggestions });
  assert.equal(report.weaknesses.filter((item) => item.action.includes('那个')).length, 1);
  assert.ok(report.rewrites.length <= 5);
  assert.equal(report.vocabulary.length, 1);
});

test('report ignores candidates that do not actually rewrite text', () => {
  const report = generateReport({
    transcript: '我想要完成项目。',
    suggestions: [{ source: '想要', sentence: '我想要完成项目。', candidates: [{ word: '打算', reason: '更明确', rewritten: '我想要完成项目。' }] }]
  });
  assert.equal(report.rewrites.length, 0);
  assert.equal(report.vocabulary.length, 0);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { generateReport } = require('../lib/report/generator');

test('report contains evidence, rewrites, data and one exercise', () => {
  const report = generateReport({
    transcript: '嗯，我想要分享一个很好的方法。',
    durationSeconds: 10,
    suggestions: [{ source: '想要', sentence: '我想要分享一个方法。', candidates: [{ word: '打算', reason: '意图更明确', rewritten: '我打算分享一个方法。' }] }]
  });
  assert.ok(report.summary && report.highlights.length && report.weaknesses.length);
  assert.equal(report.rewrites.length, 1);
  assert.ok(report.metrics.characters > 0);
  assert.equal(typeof report.exercise, 'string');
});

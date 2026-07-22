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

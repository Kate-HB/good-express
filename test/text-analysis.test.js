const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzePastedText, preparePastedText } = require('../lib/text-analysis');

test('pasted text runs through suggestion and report pipeline', async () => {
  const records = [];
  const result = await analyzePastedText({
    text: '我想要完成项目。',
    saveRecord: (record) => { records.push(record); return { id: 'text-1' }; }
  });
  assert.equal(result.sessionId, 'text-1');
  assert.equal(records[0].sourceType, 'text');
  assert.ok(result.report.rewrites.length > 0);
});

test('pasted text can be finalized without generating or saving a report', async () => {
  let reportCalls = 0;
  const prepared = await preparePastedText({
    text: '我想要完成项目。',
    llm: { rank: async (input) => input, complete: async () => { reportCalls += 1; return {}; } }
  });
  assert.equal(prepared.transcript, '我想要完成项目。');
  assert.equal(prepared.orchestrator.finished, true);
  assert.equal(prepared.orchestrator.durationSeconds, 0);
  assert.equal(reportCalls, 0);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { RealtimeFeedbackGate, buildRealtimeMessages } = require('../lib/feedback/realtime');

test('requests feedback once each time final transcript grows by 30 characters', () => {
  const gate = new RealtimeFeedbackGate(30);
  assert.equal(gate.claim('甲'.repeat(29)), false);
  assert.equal(gate.claim('甲'.repeat(30)), true);
  assert.equal(gate.claim('甲'.repeat(59)), false);
  assert.equal(gate.claim('甲'.repeat(60)), true);
});

test('realtime prompt requests one short JSON feedback item', () => {
  const messages = buildRealtimeMessages('我先介绍背景，然后说明结论。');
  assert.match(messages[0].content, /feedback/);
  assert.match(messages[0].content, /不超过8个字/);
  assert.match(messages[1].content, /我先介绍背景/);
});

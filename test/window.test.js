const test = require('node:test');
const assert = require('node:assert/strict');
const { windowSizeFor } = require('../lib/window-options');

test('desktop window stays inside a small Windows work area', () => {
  const size = windowSizeFor({ width: 1220, height: 720 });
  assert.ok(size.width <= 1180);
  assert.ok(size.height <= 680);
  assert.ok(size.width >= 980);
});

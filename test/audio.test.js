const test = require('node:test');
const assert = require('node:assert/strict');
const { resampleTo16k } = require('../lib/audio/resample');

test('resamples 48 kHz mono audio to 16 kHz', () => {
  const input = Float32Array.from({ length: 480 }, (_, i) => Math.sin(i / 10));
  const output = resampleTo16k(input, 48000);
  assert.equal(output.length, 160);
  assert.ok(output.every(Number.isFinite));
});

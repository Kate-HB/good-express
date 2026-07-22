const test = require('node:test');
const assert = require('node:assert/strict');
const { MockAsrAdapter } = require('../lib/asr/mock');
const { resolveModelFiles } = require('../lib/asr/sherpa');

test('ASR adapter emits normalized streaming events', async () => {
  const asr = new MockAsrAdapter([{ text: '你好。', isFinal: true }]);
  await asr.start();
  const event = await asr.acceptAudio(new Float32Array([0]));
  assert.deepEqual(event.text, '你好。');
  assert.equal(event.isFinal, true);
  assert.ok(Number.isFinite(event.timestamp));
});

test('resolves downloaded Sherpa release filenames', () => {
  const names = [
    'encoder-epoch-99-avg-1.int8.onnx', 'decoder-epoch-99-avg-1.int8.onnx',
    'joiner-epoch-99-avg-1.int8.onnx', 'tokens.txt'
  ];
  const files = resolveModelFiles('C:\\model', () => names);
  assert.match(files.encoder, /encoder-epoch-99-avg-1\.int8\.onnx$/);
  assert.match(files.decoder, /decoder-epoch-99-avg-1\.int8\.onnx$/);
  assert.match(files.joiner, /joiner-epoch-99-avg-1\.int8\.onnx$/);
});

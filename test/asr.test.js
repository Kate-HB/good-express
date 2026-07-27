const test = require('node:test');
const assert = require('node:assert/strict');
const { MockAsrAdapter } = require('../lib/asr/mock');
const { resolveModelFiles, createOnlineRecognizerConfig } = require('../lib/asr/sherpa');

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

test('zipformer model config includes BPE vocabulary when available', () => {
  const config = createOnlineRecognizerConfig('C:\\model', () => [
    'encoder-epoch-99-avg-1.int8.onnx', 'decoder-epoch-99-avg-1.int8.onnx',
    'joiner-epoch-99-avg-1.int8.onnx', 'tokens.txt', 'bpe.vocab'
  ]);
  assert.equal(config.modelConfig.modelingUnit, 'bpe');
  assert.match(config.modelConfig.bpeVocab, /bpe\.vocab$/);
});

test('paraformer model config does not require joiner', () => {
  const config = createOnlineRecognizerConfig('C:\\model', () => [
    'encoder.int8.onnx', 'decoder.int8.onnx', 'tokens.txt'
  ]);
  assert.ok(config.modelConfig.paraformer);
  assert.equal(config.modelConfig.transducer, undefined);
});

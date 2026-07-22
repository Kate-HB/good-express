const MODEL_MANIFEST = Object.freeze({
  directory: 'sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20',
  url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20.tar.bz2',
  archiveBytes: 511274346,
  archiveSha256: '27ffbd9ee24ad186d99acc2f6354d7992b27bcab490812510665fa8f9389c5f8',
  requiredFiles: [
    'encoder-epoch-99-avg-1.int8.onnx',
    'decoder-epoch-99-avg-1.int8.onnx',
    'joiner-epoch-99-avg-1.int8.onnx',
    'tokens.txt'
  ]
});

module.exports = { MODEL_MANIFEST };

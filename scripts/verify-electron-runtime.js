const path = require('node:path');
const { SherpaOnnxAdapter } = require('../lib/asr/sherpa');

async function main() {
  const modelDir = path.join(__dirname, '../models/sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20');
  const adapter = new SherpaOnnxAdapter({ modelDir });
  await adapter.start();
  // 与正式应用一致：输入由 Web Audio 创建的普通 Float32Array。
  await adapter.acceptAudio(new Float32Array(1600));
  await adapter.stop();
  console.log('ELECTRON_SHERPA_OK: model loaded and JavaScript audio accepted');
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });

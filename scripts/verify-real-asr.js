const path = require('node:path');
const sherpa = require('sherpa-onnx-node');
const { SherpaOnnxAdapter } = require('../lib/asr/sherpa');

async function main() {
  const modelDir = process.argv[2] || path.join(__dirname, '../models/sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20');
  const wavPath = process.argv[3] || path.join(modelDir, 'test_wavs/0.wav');
  const wave = sherpa.readWave(wavPath);
  if (wave.sampleRate !== 16000) throw new Error(`验证音频必须为 16 kHz，实际 ${wave.sampleRate}`);

  const adapter = new SherpaOnnxAdapter({ modelDir });
  await adapter.start();
  let transcript = '';
  // 模拟麦克风每次送入 100 ms 音频，而不是一次性读取整段。
  for (let offset = 0; offset < wave.samples.length; offset += 1600) {
    const event = await adapter.acceptAudio(wave.samples.slice(offset, offset + 1600));
    if (event.text) transcript = event.text;
  }
  await adapter.stop();
  if (!transcript.trim()) throw new Error('真实模型未产生转写结果');
  console.log(`ASR_REAL_MODEL_OK: ${transcript}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

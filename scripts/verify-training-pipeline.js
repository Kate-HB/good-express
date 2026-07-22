const path = require('node:path');
const sherpa = require('sherpa-onnx-node');
const { SherpaOnnxAdapter } = require('../lib/asr/sherpa');
const { PracticeOrchestrator } = require('../lib/orchestrator');

async function main() {
  const modelDir = process.argv[2] || path.join(__dirname, '../models/sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20');
  const wavPath = process.argv[3];
  if (!wavPath) throw new Error('用法：npm run verify:training -- <模型目录> <16kHz WAV>');
  const wave = sherpa.readWave(wavPath);
  if (wave.sampleRate !== 16000) throw new Error(`测试音频必须为 16 kHz，实际 ${wave.sampleRate}`);

  const trainer = new PracticeOrchestrator({ asr: new SherpaOnnxAdapter({ modelDir }) });
  await trainer.start();
  let lastUpdate;
  const samples = new Float32Array(wave.samples.length + 16000 * 3);
  samples.set(wave.samples); // 末尾补 3 秒静音，真实触发句末检测。
  for (let offset = 0; offset < samples.length; offset += 1600) {
    const update = await trainer.acceptAudio(samples.slice(offset, offset + 1600));
    if (update.asr.text || update.suggestion) lastUpdate = update;
  }
  const report = await trainer.stop();
  if (!trainer.session.transcript) throw new Error(`未检测到终句。最后结果：${lastUpdate?.asr.text || '空'}`);
  if (!trainer.suggestions.length) throw new Error(`转写成功但未产生精准词建议：${trainer.session.transcript}`);
  console.log(JSON.stringify({ transcript: trainer.session.transcript, suggestion: trainer.suggestions[0], report }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

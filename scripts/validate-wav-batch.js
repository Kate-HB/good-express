const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const sherpa = require('sherpa-onnx-node');
const { SherpaOnnxAdapter } = require('../lib/asr/sherpa');
const { PracticeOrchestrator } = require('../lib/orchestrator');

async function validateOne(modelDir, wavPath) {
  const wave = sherpa.readWave(wavPath);
  if (wave.sampleRate !== 16000) throw new Error(`${path.basename(wavPath)} 不是 16 kHz`);
  const trainer = new PracticeOrchestrator({ asr: new SherpaOnnxAdapter({ modelDir }) });
  const started = performance.now();
  await trainer.start();

  // 按真实麦克风的 100 ms 数据块送入，并补静音触发句末检测。
  const samples = new Float32Array(wave.samples.length + 16000 * 3);
  samples.set(wave.samples);
  let lastPurpose = { label: '未识别' };
  for (let offset = 0; offset < samples.length; offset += 1600) {
    const update = await trainer.acceptAudio(samples.slice(offset, offset + 1600));
    if (update?.purpose) lastPurpose = update.purpose;
  }
  await trainer.stop();
  const elapsedMs = Math.round(performance.now() - started);
  const audioSeconds = Number((wave.samples.length / 16000).toFixed(2));
  const suggestion = trainer.suggestions.at(-1)?.candidates?.[0] || null;
  return {
    file: path.basename(wavPath),
    audioSeconds,
    elapsedMs,
    realTimeFactor: Number((elapsedMs / 1000 / audioSeconds).toFixed(3)),
    rawTranscript: trainer.session.rawTranscript,
    cleanTranscript: trainer.session.transcript,
    correctionCount: trainer.corrections.length,
    purpose: lastPurpose.label,
    topCandidate: suggestion?.word || '',
    passed: Boolean(trainer.session.transcript)
  };
}

async function main() {
  const modelDir = process.argv[2];
  const wavDir = process.argv[3];
  if (!modelDir || !wavDir) throw new Error('用法：node scripts/validate-wav-batch.js <模型目录> <WAV目录>');
  const files = fs.readdirSync(wavDir).filter((name) => name.endsWith('.wav') && !name.endsWith('.source.wav')).sort();
  const results = [];
  for (const file of files) results.push(await validateOne(modelDir, path.join(wavDir, file)));
  console.log(JSON.stringify({ total: results.length, passed: results.filter((item) => item.passed).length, results }, null, 2));
  if (results.length < 10 || results.some((item) => !item.passed)) process.exitCode = 1;
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

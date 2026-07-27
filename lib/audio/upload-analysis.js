const { resampleTo16k } = require('./resample');

async function analyzeUploadedAudio({ samples, sampleRate, createTrainer, saveRecord, chunkSize = 1600, startedAt = new Date().toISOString(), trainingGoal = '', onUpdate = null }) {
  if (!samples?.length) throw new Error('音频内容为空');
  const trainer = createTrainer();
  const input = samples instanceof Float32Array ? samples : Float32Array.from(samples);
  const durationSeconds = input.length / sampleRate;
  const pcm16k = resampleTo16k(input, sampleRate);
  await trainer.start();
  for (let offset = 0; offset < pcm16k.length; offset += chunkSize) {
    const update = await trainer.acceptAudio(pcm16k.slice(offset, offset + chunkSize));
    if (update && onUpdate) onUpdate(update);
  }
  const report = await trainer.stop({ trainingGoal, durationSeconds });
  const record = saveRecord({
    sourceType: 'upload',
    startedAt,
    rawTranscript: trainer.session.rawTranscript,
    transcript: trainer.session.transcript,
    corrections: trainer.corrections,
    suggestions: trainer.suggestions,
    report
  });
  return { report, sessionId: record.id, transcript: trainer.session.transcript, rawTranscript: trainer.session.rawTranscript };
}

module.exports = { analyzeUploadedAudio };

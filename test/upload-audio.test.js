const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeUploadedAudio } = require('../lib/audio/upload-analysis');
const { chunkUploadedAudioForAsr } = require('../lib/audio/upload-chunks');

test('uploaded audio is resampled, analyzed and saved', async () => {
  const chunks = [];
  let stopOptions;
  const trainer = {
    session: { rawTranscript: '我想要完成项目。', transcript: '我想要完成项目。' },
    corrections: [],
    suggestions: [{ source: '想要' }],
    start: async () => {},
    acceptAudio: async (samples) => { chunks.push(samples.length); },
    stop: async (options) => { stopOptions = options; return { summary: '报告', metrics: { characters: 8 } }; }
  };
  const records = [];
  const result = await analyzeUploadedAudio({
    samples: Float32Array.from({ length: 4800 }, (_, index) => index / 4800),
    sampleRate: 48000,
    createTrainer: () => trainer,
    saveRecord: (record) => { records.push(record); return { id: 'session-1' }; },
    chunkSize: 800
  });

  assert.deepEqual(chunks, [800, 800]);
  assert.equal(result.sessionId, 'session-1');
  assert.equal(records[0].sourceType, 'upload');
  assert.equal(records[0].report.summary, '报告');
  assert.equal(stopOptions.durationSeconds, 0.1);
});

test('uploaded audio streams realtime updates while analyzing', async () => {
  const updates = [];
  const trainer = {
    session: { rawTranscript: '我想要完成项目。', transcript: '我想要完成项目。' },
    corrections: [],
    suggestions: [],
    start: async () => {},
    acceptAudio: async () => ({ transcript: '我想要', partial: '', purpose: { label: '说明计划' }, suggestion: { candidates: [{ word: '打算' }] } }),
    stop: async () => ({ summary: '报告', metrics: { characters: 8 } })
  };
  await analyzeUploadedAudio({
    samples: Float32Array.from({ length: 3200 }, (_, index) => index / 3200),
    sampleRate: 16000,
    createTrainer: () => trainer,
    saveRecord: () => ({ id: 'session-2' }),
    onUpdate: (update) => updates.push(update),
    chunkSize: 1600
  });

  assert.equal(updates.length, 2);
  assert.equal(updates[0].suggestion.candidates[0].word, '打算');
});

test('uploaded audio chunks are resampled to 16 kHz before streaming IPC', () => {
  const chunks = chunkUploadedAudioForAsr(Float32Array.from({ length: 4800 }, (_, index) => index), 48000, 800);
  assert.deepEqual(chunks.map((item) => item.length), [800, 800]);
  assert.equal(chunks[0][0], 1);
});

test('streaming upload IPC tracks 16 kHz samples for report duration', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  assert.match(source, /uploadedSampleCount/);
  assert.match(source, /durationSeconds:\s*uploadedSampleCount\s*\/\s*16000/);
});

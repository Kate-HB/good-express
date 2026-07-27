const { resampleTo16k } = require('./resample');

function chunkUploadedAudioForAsr(samples, sampleRate, chunkSize = 1600) {
  const input = samples instanceof Float32Array ? samples : Float32Array.from(samples);
  const pcm16k = resampleTo16k(input, sampleRate);
  const chunks = [];
  for (let offset = 0; offset < pcm16k.length; offset += chunkSize) {
    chunks.push(pcm16k.slice(offset, offset + chunkSize));
  }
  return chunks;
}

module.exports = { chunkUploadedAudioForAsr };

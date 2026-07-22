function resampleTo16k(input, sourceRate) {
  if (sourceRate === 16000) return Float32Array.from(input);
  if (sourceRate < 16000) throw new RangeError('采样率不得低于 16 kHz');
  const ratio = sourceRate / 16000;
  const output = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < output.length; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j += 1) sum += input[j];
    output[i] = sum / Math.max(1, end - start);
  }
  return output;
}

module.exports = { resampleTo16k };

const path = require('node:path');
const fs = require('node:fs');
const { AsrAdapter } = require('./base');

function resolveModelFiles(modelDir, readDirectory = fs.readdirSync) {
  const names = readDirectory(modelDir);
  const choose = (prefix) => names.find((name) => new RegExp(`^${prefix}.*\\.int8\\.onnx$`).test(name))
    || names.find((name) => new RegExp(`^${prefix}.*\\.onnx$`).test(name));
  const selected = { encoder: choose('encoder'), decoder: choose('decoder'), joiner: choose('joiner'), tokens: names.find((name) => name === 'tokens.txt') };
  for (const [kind, name] of Object.entries(selected)) if (!name) throw new Error(`模型文件缺失：${kind}`);
  return Object.fromEntries(Object.entries(selected).map(([kind, name]) => [kind, path.join(modelDir, name)]));
}

class SherpaOnnxAdapter extends AsrAdapter {
  constructor({ modelDir, endpoint = {} } = {}) {
    super();
    this.modelDir = modelDir;
    this.endpoint = { trailingSilence: 1.2, utteranceSilence: 2.4, ...endpoint };
  }

  async start() {
    if (!this.modelDir || !fs.existsSync(this.modelDir)) {
      throw new Error('未找到离线模型，请先运行 scripts/download-model.ps1');
    }
    let sherpa;
    try { sherpa = require('sherpa-onnx-node'); } catch { throw new Error('sherpa-onnx-node 未安装'); }
    const files = resolveModelFiles(this.modelDir);
    this.recognizer = new sherpa.OnlineRecognizer({
      featConfig: { sampleRate: 16000, featureDim: 80 },
      modelConfig: {
        transducer: {
          encoder: files.encoder, decoder: files.decoder, joiner: files.joiner
        },
        tokens: files.tokens, numThreads: 2, provider: 'cpu', debug: 0
      },
      decodingMethod: 'greedy_search', enableEndpoint: 1,
      rule1MinTrailingSilence: this.endpoint.utteranceSilence,
      rule2MinTrailingSilence: this.endpoint.trailingSilence,
      rule3MinUtteranceLength: 20
    });
    this.stream = this.recognizer.createStream();
  }

  async acceptAudio(samples) {
    this.stream.acceptWaveform({ sampleRate: 16000, samples });
    while (this.recognizer.isReady(this.stream)) this.recognizer.decode(this.stream);
    const result = this.recognizer.getResult(this.stream);
    const isFinal = Boolean(this.recognizer.isEndpoint(this.stream));
    if (isFinal) this.recognizer.reset(this.stream);
    return { text: result.text || '', isFinal, confidence: 1, timestamp: Date.now() };
  }

  async stop() {
    if (!this.stream || !this.recognizer) return null;
    this.stream.inputFinished();
    while (this.recognizer.isReady(this.stream)) this.recognizer.decode(this.stream);
    const result = this.recognizer.getResult(this.stream);
    const event = result.text ? { text: result.text, isFinal: true, confidence: 1, timestamp: Date.now() } : null;
    this.stream = null; this.recognizer = null;
    return event;
  }
}

module.exports = { SherpaOnnxAdapter, resolveModelFiles };

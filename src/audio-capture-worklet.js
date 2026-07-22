class CaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.targetRate = options.processorOptions?.targetRate || 16000;
    this.chunkSize = options.processorOptions?.chunkSize || 1600;
    this.phase = 0; this.sum = 0; this.count = 0; this.chunk = []; this.stopped = false;
    this.port.onmessage = (event) => {
      if (event.data === 'stop') {
        this.flush(); this.stopped = true; this.port.postMessage({ type: 'stopped' });
      }
    };
  }

  flush() {
    if (!this.chunk.length) return;
    const samples = Float32Array.from(this.chunk);
    this.chunk = [];
    this.port.postMessage({ type: 'audio', samples }, [samples.buffer]);
  }

  process(inputs) {
    if (this.stopped) return false;
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    // 在音频线程内做平均降采样，Renderer 主线程不再逐样本循环。
    for (const sample of channel) {
      this.sum += sample; this.count += 1; this.phase += this.targetRate;
      if (this.phase >= sampleRate) {
        this.chunk.push(this.sum / this.count);
        this.phase -= sampleRate; this.sum = 0; this.count = 0;
        if (this.chunk.length >= this.chunkSize) this.flush();
      }
    }
    return true;
  }
}

registerProcessor('capture-processor', CaptureProcessor);

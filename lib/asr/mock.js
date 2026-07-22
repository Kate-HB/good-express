const { AsrAdapter } = require('./base');

class MockAsrAdapter extends AsrAdapter {
  constructor(events = []) { super(); this.events = [...events]; this.started = false; }
  async start() { this.started = true; }
  async acceptAudio() {
    if (!this.started) throw new Error('ASR 尚未启动');
    const event = this.events.shift() || { text: '', isFinal: false };
    return { confidence: 1, timestamp: Date.now(), ...event };
  }
  async stop() { this.started = false; }
}

module.exports = { MockAsrAdapter };

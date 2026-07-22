class AsrAdapter {
  async start() { throw new Error('ASR start() 未实现'); }
  async acceptAudio() { throw new Error('ASR acceptAudio() 未实现'); }
  async stop() {}
}

module.exports = { AsrAdapter };

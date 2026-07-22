const { AsrAdapter } = require('./base');

class CloudAsrAdapter extends AsrAdapter {
  constructor() { super(); this.message = '云 ASR 是扩展接口，请在设置中配置实现'; }
  async start() { throw new Error(this.message); }
}

module.exports = { CloudAsrAdapter };

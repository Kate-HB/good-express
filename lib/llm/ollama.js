const { OpenAICompatibleAdapter } = require('./openai-compatible');

class OllamaAdapter extends OpenAICompatibleAdapter {
  constructor({ baseUrl = 'http://127.0.0.1:11434/v1', model = 'qwen2.5:7b', fetchImpl } = {}) {
    super({ baseUrl, model, apiKey: 'ollama', fetchImpl });
  }
}

module.exports = { OllamaAdapter };

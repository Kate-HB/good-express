class OpenAICompatibleAdapter {
  constructor({ baseUrl, apiKey, model, fetchImpl = fetch }) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); this.apiKey = apiKey; this.model = model; this.fetch = fetchImpl;
  }

  async complete(messages) {
    const response = await this.fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, messages, temperature: 0.2, response_format: { type: 'json_object' } })
    });
    if (!response.ok) throw new Error(`LLM 请求失败：${response.status}`);
    return JSON.parse((await response.json()).choices[0].message.content);
  }

  rank(input) { return this.complete([{ role: 'system', content: require('./prompts').REALTIME_SYSTEM }, { role: 'user', content: JSON.stringify(input) }]); }
}

module.exports = { OpenAICompatibleAdapter };

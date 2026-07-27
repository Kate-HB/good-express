class OpenAICompatibleAdapter {
  constructor({ baseUrl, apiKey, model, fetchImpl = fetch }) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); this.apiKey = apiKey; this.model = model; this.fetch = fetchImpl;
  }

  async complete(messages, { maxTokens } = {}) {
    const response = await this.fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        ...(Number.isFinite(maxTokens) ? { max_tokens: maxTokens } : {})
      })
    });
    if (!response.ok) throw new Error(`LLM 请求失败：${response.status}`);
    return JSON.parse((await response.json()).choices[0].message.content);
  }

  async testConnection() {
    const result = await this.complete([
      { role: 'system', content: '只输出 JSON：{"ok":true}' },
      { role: 'user', content: 'ping' }
    ]);
    if (result?.ok !== true) throw new Error('模型响应格式异常');
    return { ok: true, message: '模型连接成功' };
  }

  rank(input) { return this.complete([{ role: 'system', content: require('./prompts').REALTIME_SYSTEM }, { role: 'user', content: JSON.stringify(input) }]); }
}

module.exports = { OpenAICompatibleAdapter };

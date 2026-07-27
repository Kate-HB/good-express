const test = require('node:test');
const assert = require('node:assert/strict');
const { OpenAICompatibleAdapter } = require('../lib/llm/openai-compatible');

test('LLM adapter verifies connection with a lightweight JSON request', async () => {
  let body;
  const adapter = new OpenAICompatibleAdapter({
    baseUrl: 'http://llm.local/v1',
    apiKey: 'secret',
    model: 'qwen',
    fetchImpl: async (_url, init) => {
      body = JSON.parse(init.body);
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }) };
    }
  });
  const result = await adapter.testConnection();
  assert.equal(result.ok, true);
  assert.equal(body.model, 'qwen');
  assert.match(body.messages.at(-1).content, /ping/);
});

test('LLM adapter forwards an explicit output token limit', async () => {
  let body;
  const adapter = new OpenAICompatibleAdapter({
    baseUrl: 'http://llm.local/v1',
    apiKey: 'secret',
    model: 'qwen',
    fetchImpl: async (_url, init) => {
      body = JSON.parse(init.body);
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{}' } }] }) };
    }
  });
  await adapter.complete([{ role: 'user', content: 'report' }], { maxTokens: 8192 });
  assert.equal(body.max_tokens, 8192);
});

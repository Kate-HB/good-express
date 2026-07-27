const test = require('node:test');
const assert = require('node:assert/strict');
const { applyProviderPreset } = require('../lib/llm/provider-presets');

test('provider presets fill OpenAI-compatible endpoint and model', () => {
  assert.deepEqual(applyProviderPreset({ llmProvider: 'deepseek' }), {
    llmProvider: 'deepseek',
    llmBaseUrl: 'https://api.deepseek.com/v1',
    llmModel: 'deepseek-chat'
  });
});

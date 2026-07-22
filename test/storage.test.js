const test = require('node:test');
const assert = require('node:assert/strict');
const { SettingsStore, redactSettings } = require('../lib/storage/settings');

test('settings store encrypts API key instead of writing plaintext', () => {
  let saved = '';
  const store = new SettingsStore({
    read: () => saved,
    write: (value) => { saved = value; },
    encrypt: (value) => Buffer.from(`encrypted:${value}`).toString('base64'),
    decrypt: (value) => Buffer.from(value, 'base64').toString().replace('encrypted:', '')
  });
  store.save({ asr: 'sherpa', apiKey: 'secret-key' });
  assert.ok(!saved.includes('secret-key'));
  assert.equal(store.load().apiKey, 'secret-key');
});

test('renderer settings never expose the decrypted API key', () => {
  assert.deepEqual(redactSettings({ apiKey: 'secret-key', llmProvider: 'openai-compatible' }), { hasApiKey: true, llmProvider: 'openai-compatible' });
});

test('settings store supplies safe defaults before first launch', () => {
  const store = new SettingsStore({ read: () => '', write: () => {}, encrypt: String, decrypt: String, defaults: { modelDir: 'models/default', llmProvider: 'none' } });
  assert.deepEqual(store.load(), { modelDir: 'models/default', llmProvider: 'none' });
});

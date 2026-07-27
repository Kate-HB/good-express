const PROVIDER_PRESETS = {
  deepseek: { llmBaseUrl: 'https://api.deepseek.com/v1', llmModel: 'deepseek-chat' },
  openai: { llmBaseUrl: 'https://api.openai.com/v1', llmModel: 'gpt-4o-mini' },
  ollama: { llmBaseUrl: 'http://127.0.0.1:11434/v1', llmModel: 'qwen2.5:7b' }
};

function applyProviderPreset(settings) {
  const preset = PROVIDER_PRESETS[settings.llmProvider];
  return preset ? { ...settings, ...preset } : { ...settings };
}

module.exports = { PROVIDER_PRESETS, applyProviderPreset };

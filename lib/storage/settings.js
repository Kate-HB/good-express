class SettingsStore {
  constructor({ read, write, encrypt, decrypt, defaults = {} }) {
    this.read = read; this.write = write; this.encrypt = encrypt; this.decrypt = decrypt; this.defaults = defaults;
  }
  load() {
    const raw = this.read();
    if (!raw) return { ...this.defaults };
    const data = { ...this.defaults, ...JSON.parse(raw) };
    if (data.apiKeyEncrypted) data.apiKey = this.decrypt(data.apiKeyEncrypted);
    delete data.apiKeyEncrypted;
    return data;
  }
  save(settings) {
    const data = { ...settings };
    if (data.apiKey) data.apiKeyEncrypted = this.encrypt(data.apiKey);
    delete data.apiKey;
    delete data.hasApiKey;
    this.write(JSON.stringify(data, null, 2));
  }
}

function redactSettings(settings) {
  const result = { ...settings, hasApiKey: Boolean(settings.apiKey) };
  delete result.apiKey;
  return result;
}

module.exports = { SettingsStore, redactSettings };

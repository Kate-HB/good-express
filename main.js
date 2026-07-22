const { app, BrowserWindow, ipcMain, dialog, safeStorage, screen, Menu } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { SettingsStore, redactSettings } = require('./lib/storage/settings');
const { HistoryStore } = require('./lib/storage/history-index');
const { SherpaOnnxAdapter } = require('./lib/asr/sherpa');
const { PracticeOrchestrator } = require('./lib/orchestrator');
const { OpenAICompatibleAdapter } = require('./lib/llm/openai-compatible');
const { OllamaAdapter } = require('./lib/llm/ollama');
const { windowSizeFor } = require('./lib/window-options');
const { MODEL_MANIFEST } = require('./lib/models/model-manifest');
const { verifyModelDirectory } = require('./lib/models/verify-model');
const { createModelDownloadCommand } = require('./lib/models/download-command');

let trainer = null;
let startedAt = null;
let modelDownloadPromise = null;

function historyStore() { return new HistoryStore(path.join(app.getPath('userData'), 'sessions')); }

function settingsStore() {
  const file = path.join(app.getPath('userData'), 'settings.json');
  // 安装版和便携版都写入持久用户目录，避免便携版退出后模型随临时目录消失。
  const modelRoot = app.isPackaged ? path.join(app.getPath('userData'), 'models') : path.join(__dirname, 'models');
  const bundledModel = path.join(modelRoot, MODEL_MANIFEST.directory);
  return new SettingsStore({
    read: () => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '',
    write: (value) => fs.writeFileSync(file, value, 'utf8'),
    encrypt: (value) => {
      if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows 安全存储当前不可用');
      return safeStorage.encryptString(value).toString('base64');
    },
    decrypt: (value) => safeStorage.decryptString(Buffer.from(value, 'base64')),
    defaults: { modelDir: bundledModel, llmProvider: 'none', llmBaseUrl: 'http://127.0.0.1:11434/v1', llmModel: 'qwen2.5:7b' }
  });
}

function createLlm(settings) {
  if (settings.llmProvider === 'ollama') return new OllamaAdapter({ baseUrl: settings.llmBaseUrl, model: settings.llmModel });
  if (settings.llmProvider === 'openai-compatible' && settings.apiKey) {
    return new OpenAICompatibleAdapter({ baseUrl: settings.llmBaseUrl, model: settings.llmModel, apiKey: settings.apiKey });
  }
  return null;
}

function createWindow() {
  const size = windowSizeFor(screen.getPrimaryDisplay().workAreaSize);
  const window = new BrowserWindow({
    ...size, minWidth: 980, minHeight: 640, show: false,
    backgroundColor: '#f4f0e8',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  window.loadFile(path.join(__dirname, 'src/index.html'));
  window.once('ready-to-show', () => { window.center(); window.show(); });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  ipcMain.handle('settings:get', () => redactSettings(settingsStore().load()));
  ipcMain.handle('settings:save', (_event, settings) => {
    const store = settingsStore();
    const existing = store.load();
    store.save({ ...existing, ...settings, apiKey: settings.apiKey || existing.apiKey });
    return true;
  });
  ipcMain.handle('settings:choose-model', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'], title: '选择 Sherpa-ONNX 模型目录' });
    return result.canceled ? '' : result.filePaths[0];
  });
  ipcMain.handle('models:status', () => verifyModelDirectory(settingsStore().load().modelDir, MODEL_MANIFEST));
  ipcMain.handle('models:download', async () => {
    if (modelDownloadPromise) return modelDownloadPromise;
    const modelRoot = app.isPackaged ? path.join(app.getPath('userData'), 'models') : path.join(__dirname, 'models');
    const scriptPath = path.join(app.isPackaged ? process.resourcesPath : __dirname, 'scripts', 'download-model.ps1');
    const command = createModelDownloadCommand(scriptPath, modelRoot);
    modelDownloadPromise = new Promise((resolve, reject) => {
      const child = spawn(command.executable, command.args, command.options);
      let errorText = '';
      child.stderr.on('data', (chunk) => { errorText += chunk.toString(); });
      child.once('error', reject);
      child.once('exit', (code) => {
        if (code !== 0) { reject(new Error(errorText.trim() || `模型下载失败，退出码 ${code}`)); return; }
        const modelDir = path.join(modelRoot, MODEL_MANIFEST.directory);
        const status = verifyModelDirectory(modelDir, MODEL_MANIFEST);
        if (!status.ok) { reject(new Error(`模型解压不完整：${status.missing.join('、')}`)); return; }
        const store = settingsStore(); store.save({ ...store.load(), modelDir });
        resolve(status);
      });
    }).finally(() => { modelDownloadPromise = null; });
    return modelDownloadPromise;
  });
  ipcMain.handle('history:list', (_event, query = '') => historyStore().search(query).map(({ id, createdAt, transcript, report }) => ({ id, createdAt, transcript, summary: report?.summary || '' })));
  ipcMain.handle('history:get', (_event, id) => historyStore().get(id));
  ipcMain.handle('history:remove', (_event, id) => historyStore().remove(id));
  ipcMain.handle('history:clear', () => historyStore().clear());
  ipcMain.handle('practice:start', async () => {
    const settings = settingsStore().load();
    const modelStatus = verifyModelDirectory(settings.modelDir, MODEL_MANIFEST);
    if (!modelStatus.ok) throw new Error(`离线模型不完整，缺少：${modelStatus.missing.join('、')}。请运行 scripts/download-model.ps1 或在设置中选择模型目录。`);
    trainer = new PracticeOrchestrator({ asr: new SherpaOnnxAdapter({ modelDir: settings.modelDir }), llm: createLlm(settings) });
    await trainer.start(); startedAt = new Date().toISOString(); return true;
  });
  ipcMain.handle('practice:audio', async (_event, samples) => trainer ? trainer.acceptAudio(Float32Array.from(samples)) : null);
  ipcMain.handle('practice:stop', async () => {
    if (!trainer) return null;
    const report = await trainer.stop();
    const record = historyStore().save({ startedAt, rawTranscript: trainer.session.rawTranscript, transcript: trainer.session.transcript, corrections: trainer.corrections, suggestions: trainer.suggestions, report });
    trainer = null; return { report, sessionId: record.id };
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

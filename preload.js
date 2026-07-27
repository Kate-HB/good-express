const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trainer', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  testLlm: (settings) => ipcRenderer.invoke('settings:test-llm', settings),
  chooseModel: () => ipcRenderer.invoke('settings:choose-model'),
  getModelStatus: () => ipcRenderer.invoke('models:status'),
  downloadModel: () => ipcRenderer.invoke('models:download'),
  listHistory: (query) => ipcRenderer.invoke('history:list', query),
  getHistory: (id) => ipcRenderer.invoke('history:get', id),
  removeHistory: (id) => ipcRenderer.invoke('history:remove', id),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  start: () => ipcRenderer.invoke('practice:start'),
  audio: (samples) => ipcRenderer.invoke('practice:audio', Array.from(samples)),
  startUpload: () => ipcRenderer.invoke('practice:upload-start'),
  uploadChunk: (samples) => ipcRenderer.invoke('practice:upload-audio', Array.from(samples)),
  stopUpload: (fileName) => ipcRenderer.invoke('practice:upload-stop', fileName),
  analyzeText: (text) => ipcRenderer.invoke('practice:text', text),
  generateReport: () => ipcRenderer.invoke('practice:generate-report'),
  saveReportMarkdown: (payload) => ipcRenderer.invoke('report:save-markdown', payload),
  stop: () => ipcRenderer.invoke('practice:stop')
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trainer', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  chooseModel: () => ipcRenderer.invoke('settings:choose-model'),
  listHistory: (query) => ipcRenderer.invoke('history:list', query),
  getHistory: (id) => ipcRenderer.invoke('history:get', id),
  removeHistory: (id) => ipcRenderer.invoke('history:remove', id),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  start: () => ipcRenderer.invoke('practice:start'),
  audio: (samples) => ipcRenderer.invoke('practice:audio', Array.from(samples)),
  stop: () => ipcRenderer.invoke('practice:stop')
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trainer', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  chooseModel: () => ipcRenderer.invoke('settings:choose-model'),
  start: () => ipcRenderer.invoke('practice:start'),
  audio: (samples) => ipcRenderer.invoke('practice:audio', Array.from(samples)),
  stop: () => ipcRenderer.invoke('practice:stop')
});

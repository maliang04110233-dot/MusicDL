const { contextBridge, ipcRenderer } = require('electron');

const SAFE_CHANNELS_SEND = new Set([
  'toggle-lyrics', 'nextSong', 'prevSong', 'playPause', 'exit',
  'minimize', 'maximize',
]);

const SAFE_CHANNELS_RECEIVE = new Set([
  'queue-updated', 'download-progress', 'download-finished', 'download-error',
  'search-results', 'play-queue-restored', 'update-available',
  'update-not-available', 'update-download-progress', 'update-downloaded', 'update-error',
]);

contextBridge.exposeInMainWorld('miniAPI', {
  send(channel) {
    if (SAFE_CHANNELS_SEND.has(channel)) {
      ipcRenderer.send(channel);
    }
  },
  on(channel, callback) {
    if (SAFE_CHANNELS_RECEIVE.has(channel)) {
      ipcRenderer.on(channel, (_, data) => callback(data));
    }
  },
});

// 更新专用 IPC 通道（供 renderer/updater.js 使用）
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(channel, callback) {
    if (SAFE_CHANNELS_RECEIVE.has(channel)) {
      ipcRenderer.on(channel, (_, data) => callback(data));
    }
  },
  invoke(channel, ...args) {
    return ipcRenderer.invoke(channel, ...args);
  },
});

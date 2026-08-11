/**
 * Mini player preload script — exposes safe IPC bridge only.
 * contextIsolation: true, nodeIntegration: false
 */
const { contextBridge, ipcRenderer } = require('electron');

const SAFE_CHANNELS_SEND = new Set([
  'mini-prev',
  'mini-toggle-play',
  'mini-next',
  'mini-close',
]);

const SAFE_CHANNELS_RECEIVE = new Set([
  'mini-player-update',
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

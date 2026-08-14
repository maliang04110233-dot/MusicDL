const { contextBridge, ipcRenderer } = require('electron');

const SAFE_CHANNELS_SEND = new Set([
  'toggle-lyrics', 'nextSong', 'prevSong', 'playPause', 'exit',
  'minimize', 'maximize',
]);

const SAFE_CHANNELS_RECEIVE = new Set([
  'queue-updated', 'download-progress', 'download-finished', 'download-error',
  'search-results', 'play-queue-restored', 'update-available',
  'update-not-available', 'update-download-progress', 'update-downloaded', 'update-error',
  'focus-search', 'sleep-timer',
]);

const SAFE_CHANNELS_INVOKE = new Set([
  // 搜索
  'search-music', 'search-album', 'search-singer',
  'get-singer-songs', 'get-singer-albums', 'get-album-songs',
  // 首页推荐
  'get-home-recommendations', 'get-home-section', 'get-playlist-songs',
  // 下载
  'get-download-url', 'add-to-queue', 'cancel-download', 'retry-download',
  'remove-queue-item', 'clear-finished-queue', 'clear-all-queue',
  // 歌词
  'get-lyrics',
  // Cookie / 本地
  'get-cookies', 'save-cookie', 'clear-cookie', 'verify-cookie',
  'open-login-window', 'scan-local-library', 'load-library-index',
  'read-local-metadata', 'read-local-lrc', 'update-id3-tags',
  'update-id3-cover', 'fetch-online-cover',
  // 文件
  'select-dir', 'get-default-dir', 'open-folder', 'open-external',
  // 设置
  'get-pref', 'set-pref',
  // 播放队列
  'save-play-queue', 'load-play-queue',
  // 历史
  'query-history', 'get-history-stats', 'clear-history',
  // 缓存 / 转换
  'get-cache-size', 'clear-play-cache', 'batch-fetch-lyrics',
  'write-local-lrc', 'check-local-exists', 'convert-audio',
  // 播放
  'proxy-play', 'add-playlist-to-queue',
  // 版本
  'get-version',
  // AI 音乐
  'ai-generate-music', 'ai-generate-lyrics', 'ai-add-to-playlist',
  // 云同步
  'export-all-data', 'import-all-data',
]);

// ── 核心 musicAPI（渲染层 → 主进程的 IPC 桥）────────────
contextBridge.exposeInMainWorld('musicAPI', {
  invoke(channel, ...args) {
    if (SAFE_CHANNELS_INVOKE.has(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    console.warn('[preload] 未授权的 IPC 通道:', channel);
  },
  get version() { return ipcRenderer.invoke('get-version'); },
  getHomeSection(section) { return ipcRenderer.invoke('get-home-section', section); },
  getHomeRecommendations() { return ipcRenderer.invoke('get-home-recommendations'); },
  getPlaylistSongs(platform, id, limit) { return ipcRenderer.invoke('get-playlist-songs', { platform, id, limit }); },
  searchMusic(keyword, source) { return ipcRenderer.invoke('search-music', keyword, source); },
  getDownloadUrl(song) { return ipcRenderer.invoke('get-download-url', song); },
  addToQueue(song) { return ipcRenderer.invoke('add-to-queue', song); },
  proxyPlay(song) { return ipcRenderer.invoke('proxy-play', song); },
  getLyrics(song) { return ipcRenderer.invoke('get-lyrics', song); },
  getCookies(platform) { return ipcRenderer.invoke('get-cookies', platform); },
  saveCookie(platform, cookie) { return ipcRenderer.invoke('save-cookie', platform, cookie); },
  clearCookie(platform) { return ipcRenderer.invoke('clear-cookie', platform); },
  verifyCookie(platform) { return ipcRenderer.invoke('verify-cookie', platform); },
  openLoginWindow(platform) { return ipcRenderer.invoke('open-login-window', platform); },
  getPref(key) { return ipcRenderer.invoke('get-pref', key); },
  setPref(key, val) { return ipcRenderer.invoke('set-pref', key, val); },
  selectDir(title) { return ipcRenderer.invoke('select-dir', title); },
  openFolder(path) { return ipcRenderer.invoke('open-folder', path); },
  openExternal(url) { return ipcRenderer.invoke('open-external', url); },
  getVersion() { return ipcRenderer.invoke('get-version'); },
  scanLocalLibrary(dir) { return ipcRenderer.invoke('scan-local-library', dir); },
  savePlayQueue(queue) { return ipcRenderer.invoke('save-play-queue', queue); },
  loadPlayQueue() { return ipcRenderer.invoke('load-play-queue'); },
  onQueueUpdated(callback) { ipcRenderer.on('queue-updated', (_, q) => callback(q)); },
  onDownloadProgress(callback) { ipcRenderer.on('download-progress', (_, d) => callback(d)); },
  checkForUpdate() { return ipcRenderer.invoke('check-for-update'); },
  restartAndInstall() { ipcRenderer.send('restart-and-install'); },
});

// ── ipcRenderer 向后兼容（供 updater.js / settings.js 使用）────────
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(channel, callback) {
    if (SAFE_CHANNELS_RECEIVE.has(channel)) {
      ipcRenderer.on(channel, (_, data) => callback(data));
    }
  },
  invoke(channel, ...args) {
    if (SAFE_CHANNELS_INVOKE.has(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    console.warn('[preload] 未授权的 IPC 通道:', channel);
  },
  send(channel) {
    ipcRenderer.send(channel);
  },
});

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

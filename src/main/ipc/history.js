/**
 * 下载历史 IPC
 *
 * 注册：query-history / history-stats / clear-history / flush-history
 */

const { ipcMain } = require('electron');
const history = require('../../utils/history');

function register() {
  ipcMain.handle('query-history', (_, opts) => history.query(opts || {}));
  ipcMain.handle('history-stats', () => history.stats());
  ipcMain.handle('clear-history', () => { history.clear(); return true; });
  ipcMain.handle('flush-history', () => { history.flush(); return true; });
}

module.exports = { register };

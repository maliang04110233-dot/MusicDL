/**
 * 下载路径模板 IPC
 *
 * 注册: get-download-templates / save-download-template /
 *       delete-download-template / set-active-template
 *
 * 模板格式: { artist } / { album } / { title } / { source } / { year }
 */

const { ipcMain } = require('electron');
const prefs = require('../../utils/prefs');

const TEMPLATE_KEY = 'downloadTemplates';
const ACTIVE_KEY = 'activeDownloadTemplate';

function register() {
  ipcMain.handle('get-download-templates', () => {
    const templates = prefs.get(TEMPLATE_KEY) || [];
    const active = prefs.get(ACTIVE_KEY) || null;
    return { templates, active };
  });

  ipcMain.handle('save-download-template', (_, template) => {
    if (!template || !template.name || !template.path) {
      return { success: false, error: '名称和路径不能为空' };
    }
    const templates = prefs.get(TEMPLATE_KEY) || [];
    const now = Date.now();

    if (template.id) {
      const idx = templates.findIndex(t => t.id === template.id);
      if (idx >= 0) {
        templates[idx] = { ...templates[idx], ...template, updatedAt: now };
        prefs.set(TEMPLATE_KEY, templates);
        return { success: true, template: templates[idx] };
      }
    }

    const newTpl = {
      id: 'tpl_' + now + '_' + Math.random().toString(36).slice(2, 6),
      name: template.name.trim(),
      path: template.path.trim(),
      createdAt: now,
      updatedAt: now,
    };
    templates.unshift(newTpl);
    prefs.set(TEMPLATE_KEY, templates);
    return { success: true, template: newTpl };
  });

  ipcMain.handle('delete-download-template', (_, templateId) => {
    if (!templateId) return { success: false, error: '缺少ID' };
    const templates = prefs.get(TEMPLATE_KEY) || [];
    const filtered = templates.filter(t => t.id !== templateId);
    if (filtered.length === templates.length) return { success: false, error: '模板不存在' };
    prefs.set(TEMPLATE_KEY, filtered);

    // 如果删除的是当前激活的，清除激活状态
    if (prefs.get(ACTIVE_KEY) === templateId) {
      prefs.set(ACTIVE_KEY, null);
    }
    return { success: true };
  });

  ipcMain.handle('set-active-template', (_, templateId) => {
    prefs.set(ACTIVE_KEY, templateId || null);
    return { success: true, active: templateId };
  });

  // 应用模板路径（替换变量）
  ipcMain.handle('apply-path-template', (_, { templateId, song }) => {
    const templates = prefs.get(TEMPLATE_KEY) || [];
    const tpl = templateId ? templates.find(t => t.id === templateId) : null;
    if (!tpl) return { path: null };

    const path = tpl.path
      .replace(/\{artist\}/gi, sanitizeFileName(song.artist || '未知艺术家'))
      .replace(/\{album\}/gi, sanitizeFileName(song.album || '未知专辑'))
      .replace(/\{title\}/gi, sanitizeFileName(song.title || '未知标题'))
      .replace(/\{source\}/gi, sanitizeFileName(song.source || ''))
      .replace(/\{year\}/gi, (song.year || '').toString().slice(0, 4))
      .replace(/\{track\}/gi, String(song.trackNumber || song.track || '').padStart(2, '0'));

    return { path, template: tpl };
  });
}

function sanitizeFileName(name) {
  return String(name).replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 80);
}

module.exports = { register };

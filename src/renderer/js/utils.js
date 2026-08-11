/**
 * MusicDL 通用工具函数
 * 
 * ES Module — export 供其他模块 import，同时保留 window 全局供 HTML onclick
 */

// ── HTML 转义 ────────────────────────────────────────
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/** 转义单引号（用于 inline onclick 属性） */
function escQ(s) { return (s || '').replace(/'/g, "\\'"); }

/** 转义用于 HTML 属性和 onclick 上下文的值（防 DOM XSS） */
function escAttr(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g, '&#39;');
}

// ── 时间格式化 ────────────────────────────────────────
function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function fmtDuration(ms) {
  if (!ms) return '--:--';
  return fmtTime(ms / 1000);
}

// ── 文件大小 ──────────────────────────────────────────
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B','KB','MB','GB'];
  let size = bytes, unit = 0;
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit++; }
  return size.toFixed(1) + ' ' + units[unit];
}

// ── 平台标签 ──────────────────────────────────────────
function srcLabel(s) {
  return { netease: '网易云', qq: 'QQ音乐', bilibili: 'B站', kugou: '酷狗' }[s] || s;
}

function statusLabel(s) {
  return { pending: '⏳ 等待', downloading: '⬇ 下载中', done: '✅ 完成', error: '❌ 失败' }[s] || s;
}

// ── 播放次数格式化 ────────────────────────────────────
function formatPlayCount(n) {
  if (n == null || n === 0) return '0';
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return String(n);
}

// ── 历史时间格式化 ────────────────────────────────────
function fmtHistoryTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  return Math.floor(diff / 86400000) + '天前';
}

// ── ES Module 导出 ──────────────────────────────────────
export {
  esc,
  escQ,
  escAttr,
  fmtTime,
  fmtDuration,
  formatBytes,
  srcLabel,
  statusLabel,
  formatPlayCount,
  fmtHistoryTime,
};

// ── 全局桥接（HTML onclick 兼容） ──────────────────────
window.esc = esc;
window.escQ = escQ;
window.escAttr = escAttr;
window.fmtTime = fmtTime;
window.fmtDuration = fmtDuration;
window.formatBytes = formatBytes;
window.srcLabel = srcLabel;
window.statusLabel = statusLabel;
window.formatPlayCount = formatPlayCount;
window.fmtHistoryTime = fmtHistoryTime;

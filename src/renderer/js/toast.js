/**
 * MusicDL Toast 通知系统
 *
 * 支持统一错误码渲染、多级类型、自动消失
 * 
 * ES Module — export 供其他模块 import，同时保留 window 全局供 HTML onclick
 */

// 尝试加载统一错误码（在非 Electron 开发模式用兜底）
let _uiLabel = (code) => code || '❓ 未知错误';
try {
  if (typeof ERR !== 'undefined') {
    _uiLabel = (code) => {
      const labels = {
        'NETWORK_TIMEOUT':     '⏱️ 网络超时',
        'NETWORK_ERROR':       '🌐 网络异常',
        'AUTH_EXPIRED':        '🔑 登录过期',
        'VIP_REQUIRED':        '💎 需要 VIP',
        'LOGIN_REQUIRED':      '🔐 需要登录',
        'COOKIE_INVALID':      '🍪 Cookie 无效',
        'PLATFORM_CHANGED':    '🔧 接口变更',
        'NO_AUDIO_STREAM':     '🔇 无音频流',
        'COPYRIGHT_RESTRICTED':'📜 版权限制',
        'VIP_SONG':            '💎 VIP 歌曲',
        'SONG_NOT_FOUND':      '🔍 未找到',
        'FILE_NOT_FOUND':      '📁 文件不存在',
        'IO_ERROR':            '💾 读写错误',
        'UNSUPPORTED_FORMAT':  '🎵 格式不支持',
        'UNKNOWN_ERROR':       '❓ 未知错误',
      };
      return labels[code] || code || '❓';
    };
  }
} catch (e) { /* ignore */ }

// ── Toast 类型映射 ───────────────────────────────────
const TYPE_CONFIG = {
  info:    { icon: 'ℹ️',  duration: 3000, className: 'toast-info' },
  success: { icon: '✅',  duration: 3000, className: 'toast-success' },
  warn:    { icon: '⚠️',  duration: 4000, className: 'toast-warn' },
  error:   { icon: '❌',  duration: 5000, className: 'toast-error' },
};

/**
 * 显示 Toast 通知
 * @param {string} msg - 消息内容
 * @param {string} [type='info'] - info | success | warn | error
 * @param {number} [duration] - 显示时长 ms（覆盖默认）
 */
function showToast(msg, type = 'info', duration) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `toast ${cfg.className}`;
  el.textContent = msg;
  container.appendChild(el);

  const dur = duration !== undefined ? duration : cfg.duration;
  setTimeout(() => {
    el.style.animation = 'toast-out .25s ease forwards';
    setTimeout(() => el.remove(), 250);
  }, dur);
}

/**
 * 用统一错误码显示错误 Toast
 * @param {string} code - 错误码
 * @param {string} [detail] - 附加详情
 * @param {number} [duration]
 */
function showErrorToast(code, detail, duration) {
  const label = _uiLabel(code);
  const msg = detail ? `${label}：${detail}` : label;
  showToast(msg, 'error', duration);
}

/**
 * 显示下载错误（根据 fatal 区分样式）
 */
function showDownloadError(title, error, fatal) {
  const prefix = fatal ? '🔒 无法下载' : '下载失败';
  showToast(`${prefix}：${title} - ${error}`, 'error', 5000);
}

// ── ES Module 导出 ──────────────────────────────────────
export { showToast, showErrorToast, showDownloadError };

// ── 全局桥接（HTML onclick 兼容） ──────────────────────
window.showToast = showToast;
window.showErrorToast = showErrorToast;
window.showDownloadError = showDownloadError;

/**
 * 文件命名模板
 *
 * 模板变量（用 ${var} 引用）：
 *   ${artist}  - 艺术家
 *   ${title}    - 歌曲名
 *   ${album}    - 专辑
 *   ${track}    - 曲目号（暂未启用）
 *   ${platform} - 来源平台
 *   ${quality}  - 音质
 *
 * 默认模板：${artist} - ${title}
 * 示例模板：${album}/${artist} - ${title}
 *
 * 安全：模板内路径分隔符会被 sanitize
 */

const DEFAULT_TEMPLATE = '${artist} - ${title}';

/**
 * 渲染模板
 * @param {string} tmpl - 模板字符串
 * @param {Object} vars - 变量对象
 * @returns {string}
 */
function render(tmpl, vars) {
  const safeTmpl = (tmpl && tmpl.trim()) || DEFAULT_TEMPLATE;
  let out = safeTmpl;
  for (const [k, v] of Object.entries(vars || {})) {
    const re = new RegExp('\\$\\{' + k + '\\}', 'g');
    out = out.replace(re, v == null ? '' : String(v));
  }
  // 移除残留的 ${...}（避免模板写错）
  out = out.replace(/\$\{[^}]+\}/g, '');
  return out;
}

/**
 * 清理文件名（去除非法字符，限制长度）
 * 与 main/index.js 中的 sanitizeFilename 等价
 */
function sanitizeFilename(name) {
  if (!name) return '_';
  return String(name)
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200) || '_';
}

module.exports = { render, sanitizeFilename, DEFAULT_TEMPLATE };

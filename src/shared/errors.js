/**
 * MusicDL 统一错误码系统
 *
 * 所有 API 层返回的错误都使用这些标准错误码。
 * 渲染层根据 code 展示不同的用户提示。
 *
 * 使用方式：
 *   const { AppError, ERROR_CODES } = require('../shared/errors');
 *   throw AppError.vipRequired('QQ音乐');
 *   return AppError.networkError('网易云');
 */

// ── 错误码定义 ──────────────────────────────────────────

const ERROR_CODES = {
  // 认证相关
  VIP_REQUIRED:       'VIP_REQUIRED',        // 需要 VIP 会员
  AUTH_EXPIRED:       'AUTH_EXPIRED',        // Cookie/鉴权过期
  LOGIN_REQUIRED:     'LOGIN_REQUIRED',      // 需要登录
  COOKIE_INVALID:     'COOKIE_INVALID',      // Cookie 无效

  // 版权/可用性
  COPYRIGHT_RESTRICTED: 'COPYRIGHT_RESTRICTED', // 版权限制
  UNAVAILABLE:        'UNAVAILABLE',          // 歌曲下架/不可用
  NO_AUDIO_STREAM:    'NO_AUDIO_STREAM',      // 无音频流

  // 平台相关
  PLATFORM_CHANGED:   'PLATFORM_CHANGED',    // 平台接口变更
  UNKNOWN_PLATFORM:   'UNKNOWN_PLATFORM',    // 未知平台
  CDN_EMPTY:          'CDN_EMPTY',           // CDN 地址为空

  // 网络相关
  NETWORK_TIMEOUT:    'NETWORK_TIMEOUT',     // 请求超时
  NETWORK_ERROR:      'NETWORK_ERROR',       // 网络错误

  // 搜索相关
  SEARCH_EMPTY:       'SEARCH_EMPTY',        // 搜索无结果
  KEYWORD_INVALID:    'KEYWORD_INVALID',     // 关键词无效

  // 内部错误
  INTERNAL_ERROR:     'INTERNAL_ERROR',      // 内部错误
};

// ── 用户友好消息映射 ──────────────────────────────────────

const ERROR_MESSAGES = {
  [ERROR_CODES.VIP_REQUIRED]:         (p) => `该歌曲需要 ${p || ''}VIP 会员，请在设置中填入已登录的 Cookie`,
  [ERROR_CODES.AUTH_EXPIRED]:         (p) => `${p || ''}鉴权已过期，请重新登录获取 Cookie`,
  [ERROR_CODES.LOGIN_REQUIRED]:       (p) => `${p || ''}需要登录才能获取，请在设置中登录`,
  [ERROR_CODES.COOKIE_INVALID]:       (p) => `${p || ''}Cookie 无效或已过期，请重新获取`,

  [ERROR_CODES.COPYRIGHT_RESTRICTED]: (p) => `该歌曲受版权限制，${p || ''}无法下载`,
  [ERROR_CODES.UNAVAILABLE]:          (p) => `该歌曲在 ${p || ''}已下架或不可用`,
  [ERROR_CODES.NO_AUDIO_STREAM]:      (p) => `${p || ''}无法获取音频流`,

  [ERROR_CODES.PLATFORM_CHANGED]:     (p) => `${p || ''}接口已变更，请等待更新`,
  [ERROR_CODES.UNKNOWN_PLATFORM]:     () =>  '未知平台',
  [ERROR_CODES.CDN_EMPTY]:            (p) => `${p || ''}CDN 地址为空`,

  [ERROR_CODES.NETWORK_TIMEOUT]:      (p) => `${p || ''}请求超时，请检查网络后重试`,
  [ERROR_CODES.NETWORK_ERROR]:        (p) => `${p || ''}网络错误，请检查网络连接`,

  [ERROR_CODES.SEARCH_EMPTY]:         (p) => `在 ${p || ''}未找到相关结果`,
  [ERROR_CODES.KEYWORD_INVALID]:      () =>  '搜索关键词不能为空',

  [ERROR_CODES.INTERNAL_ERROR]:       (p) => `${p || ''}内部错误，请重试`,
};

// ── 错误对象工厂 ──────────────────────────────────────────

/**
 * 创建标准化错误对象
 * @param {string} code - 错误码
 * @param {string} platform - 平台名称（可选）
 * @param {object} extra - 额外信息（可选）
 * @returns {{ error: string, code: string, fatal: boolean, platform?: string }}
 */
function createError(code, platform, extra = {}) {
  const msgFn = ERROR_MESSAGES[code];
  const message = msgFn ? msgFn(platform) : `${platform || ''}未知错误`;
  return {
    error: message,
    code,
    fatal: true,
    platform: platform || undefined,
    ...extra,
  };
}

/**
 * 创建可重试的错误（非 fatal）
 */
function createRetryableError(code, platform, extra = {}) {
  return { ...createError(code, platform, extra), fatal: false };
}

// ── 快捷工厂方法 ──────────────────────────────────────────

const AppError = {
  vipRequired:    (p) => createError(ERROR_CODES.VIP_REQUIRED, p),
  authExpired:    (p) => createError(ERROR_CODES.AUTH_EXPIRED, p),
  loginRequired:  (p) => createError(ERROR_CODES.LOGIN_REQUIRED, p),
  cookieInvalid:  (p) => createError(ERROR_CODES.COOKIE_INVALID, p),

  copyright:      (p) => createError(ERROR_CODES.COPYRIGHT_RESTRICTED, p),
  unavailable:    (p) => createError(ERROR_CODES.UNAVAILABLE, p),
  noAudioStream:  (p) => createError(ERROR_CODES.NO_AUDIO_STREAM, p),

  platformChanged:(p) => createError(ERROR_CODES.PLATFORM_CHANGED, p),
  unknownPlatform:(p) => createError(ERROR_CODES.UNKNOWN_PLATFORM, p),
  cdnEmpty:       (p) => createError(ERROR_CODES.CDN_EMPTY, p),

  networkTimeout: (p) => createRetryableError(ERROR_CODES.NETWORK_TIMEOUT, p),
  networkError:   (p) => createRetryableError(ERROR_CODES.NETWORK_ERROR, p),

  searchEmpty:    (p) => createRetryableError(ERROR_CODES.SEARCH_EMPTY, p),
  keywordInvalid:()  => createError(ERROR_CODES.KEYWORD_INVALID),

  internal:       (p, extra) => createError(ERROR_CODES.INTERNAL_ERROR, p, extra),
};

// ── 导出 ──────────────────────────────────────────────────

module.exports = {
  ERROR_CODES,
  ERROR_MESSAGES,
  createError,
  createRetryableError,
  AppError,
};

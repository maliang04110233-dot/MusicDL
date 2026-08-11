/**
 * 生产日志控制
 *
 * 开发环境：log / warn / error 全部输出
 * 生产环境（NODE_ENV === 'production'）：仅输出 error，log 和 warn 静默
 */

const _isProduction = process.env.NODE_ENV === 'production';

function log(...args) {
  if (!_isProduction) {
    console.log(...args);
  }
}

function warn(...args) {
  if (!_isProduction) {
    console.warn(...args);
  }
}

function error(...args) {
  console.error(...args);
}

module.exports = { log, warn, error };

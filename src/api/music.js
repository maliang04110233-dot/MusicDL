/**
 * ⚠️ 兼容 shim — 已拆分为 src/api/index.js + platforms/* + recommendations.js
 * 保留本文件仅用于兼容老代码中的 `require('../api/music')`。
 * 新代码请直接用 `require('../api')`。
 */

module.exports = require('./index');

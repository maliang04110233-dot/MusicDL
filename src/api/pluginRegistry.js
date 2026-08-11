/**
 * MusicDL 插件系统 — 标准化平台接口
 *
 * 架构：
 *   1. PluginRegistry: 插件注册中心
 *   2. PlatformPlugin: 标准化插件接口
 *   3. 自动发现: 扫描 platforms/ 目录自动注册
 *
 * 新平台 = 一个文件，实现接口即可自动被发现
 */

// ── 标准化插件接口 ──────────────────────────────────────

const logger = require('../utils/logger');

/**
 * 平台插件标准接口
 * 所有平台插件必须导出以下方法：
 *
 * @typedef {Object} PlatformPlugin
 * @property {string} id - 平台 ID（如 'qq', 'netease'）
 * @property {string} name - 显示名称（如 'QQ音乐'）
 * @property {string} icon - 图标（emoji 或 SVG 路径）
 * @property {Function} search - 搜索歌曲
 * @property {Function} getUrl - 获取播放 URL
 * @property {Function} getLyrics - 获取歌词（可选）
 * @property {Function} getAlbumSongs - 获取专辑歌曲（可选）
 * @property {Function} getSingerSongs - 获取歌手歌曲（可选）
 */

// ── 插件注册中心 ──────────────────────────────────────

class PluginRegistry {
  constructor() {
    this._plugins = new Map(); // id → plugin
    this._loadOrder = [];     // 加载顺序
  }

  /**
   * 注册插件
   * @param {PlatformPlugin} plugin
   */
  register(plugin) {
    if (!plugin || !plugin.id) {
      throw new Error('Plugin must have an id');
    }
    if (this._plugins.has(plugin.id)) {
      logger.warn(`[PluginRegistry] Plugin "${plugin.id}" already registered, overwriting`);
    }
    this._plugins.set(plugin.id, plugin);
    this._loadOrder.push(plugin.id);
    logger.log(`[PluginRegistry] Registered plugin: ${plugin.id} (${plugin.name})`);
  }

  /**
   * 获取插件
   * @param {string} id
   * @returns {PlatformPlugin|undefined}
   */
  get(id) {
    return this._plugins.get(id);
  }

  /**
   * 获取所有已注册的插件
   * @returns {PlatformPlugin[]}
   */
  getAll() {
    return this._loadOrder.map(id => this._plugins.get(id)).filter(Boolean);
  }

  /**
   * 获取所有插件 ID
   * @returns {string[]}
   */
  getIds() {
    return [...this._loadOrder];
  }

  /**
   * 获取插件数量
   * @returns {number}
   */
  get size() {
    return this._plugins.size;
  }

  /**
   * 检查插件是否已注册
   * @param {string} id
   * @returns {boolean}
   */
  has(id) {
    return this._plugins.has(id);
  }

  /**
   * 获取插件的搜索方法（带错误处理）
   * @param {string} id
   * @returns {Function|null}
   */
  getSearchFn(id) {
    const plugin = this._plugins.get(id);
    return plugin?.search || null;
  }

  /**
   * 获取插件的 URL 获取方法（带错误处理）
   * @param {string} id
   * @returns {Function|null}
   */
  getGetUrlFn(id) {
    const plugin = this._plugins.get(id);
    return plugin?.getUrl || null;
  }
}

// ── 插件加载器 ──────────────────────────────────────

/**
 * 自动加载 platforms/ 目录下的所有插件
 * @param {PluginRegistry} registry
 */
async function loadPlatformPlugins(registry) {
  const platformsDir = require('path').join(__dirname, 'platforms');

  try {
    const fs = require('fs');
    const files = fs.readdirSync(platformsDir).filter(f => f.endsWith('.js') && f !== 'index.js');

    for (const file of files) {
      try {
        const pluginPath = require('path').join(platformsDir, file);
        const pluginModule = require(pluginPath);

        // 检查是否是标准插件格式
        if (pluginModule.id && pluginModule.search) {
          registry.register(pluginModule);
        } else if (typeof pluginModule === 'function') {
          // 兼容旧格式：函数导出
          logger.warn(`[PluginRegistry] Old format plugin: ${file}, skipping auto-register`);
        }
      } catch (e) {
        logger.error(`[PluginRegistry] Failed to load plugin ${file}:`, e.message);
      }
    }
  } catch (e) {
    logger.error('[PluginRegistry] Failed to read platforms directory:', e.message);
  }
}

// ── 创建默认注册中心 ──────────────────────────────────────

const defaultRegistry = new PluginRegistry();

// ── 导出 ──────────────────────────────────────────────

module.exports = {
  PluginRegistry,
  loadPlatformPlugins,
  defaultRegistry,
};

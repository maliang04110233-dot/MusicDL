/**
 * MusicDL 播放队列持久化工具
 *
 * 注意：初始化逻辑已移至 app.js 的 init() 函数
 * 此文件仅保留播放队列持久化功能
 */

import { getState } from './state.js';

// ── 持久化播放队列 ─────────────────────────────────────
function persistPlayQueue() {
  const queue = getState('playQueue');
  const playIdx = getState('playIdx');
  const loopMode = getState('loopMode');
  const isShuffled = getState('isShuffled');
  api.savePlayQueue({ queue, playIdx, loopMode, isShuffled }).catch(() => {});
}

// ── ES Module 导出 ──────────────────────────────────────
export {
  persistPlayQueue,
}

// ── 全局桥接（HTML onclick 兼容） ──────────────────────
window.persistPlayQueue = persistPlayQueue;

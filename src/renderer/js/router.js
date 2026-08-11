/**
 * MusicDL 路由管理
 * Tab 激活时的回调
 * 
 * ES Module — export 供其他模块 import，同时保留 window 全局供 HTML onclick
 */

/**
 * Tab 激活时的回调
 * @param {string} tabName
 */
function onTabActivated(tabName) {
  switch (tabName) {
    case 'home': {
      if (typeof loadHomeRecommendations === 'function') {
        loadHomeRecommendations();
      }
      // 渲染最近播放
      if (typeof renderRecentlyPlayed === 'function') {
        renderRecentlyPlayed();
      }
      break;
    }
    case 'search': {
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.focus();
      break;
    }
    case 'download': {
      if (typeof renderQueue === 'function') {
        renderQueue(getState('queueSnapshot') || []);
      }
      break;
    }
    case 'local': {
      if (typeof scanLocalDir === 'function') {
        scanLocalDir();
      }
      break;
    }
    case 'ai-music': {
      if (typeof initAiMusic === 'function') {
        initAiMusic();
      }
      break;
    }
    case 'history': {
      if (typeof loadHistory === 'function') {
        loadHistory();
      }
      break;
    }
    case 'settings': {
      if (typeof openSettings === 'function') {
        openSettings();
      }
      break;
    }
    case 'playlist': {
      if (typeof initPlaylistView === 'function') {
        initPlaylistView();
      }
      break;
    }
  }
}

// ── ES Module 导出 ──────────────────────────────────────
export { onTabActivated };

// ── 全局桥接 ──────────────────────────────────────────
window.onTabActivated = onTabActivated;

/**
 * MusicDL 下载队列视图 + 筛选 + 批量操作
 */

// ── DOM 缓存 ──────────────────────────────────────────
const _dlDom = {
  queueList: null,
  queueBadge: null,
  dlSelectionBar: null,
  dlSelectionCount: null,
};

function _cacheDlDom() {
  _dlDom.queueList = document.getElementById('queueList');
  _dlDom.queueBadge = document.getElementById('queueBadge');
  _dlDom.dlSelectionBar = document.getElementById('dlSelectionBar');
  _dlDom.dlSelectionCount = document.getElementById('dlSelectionCount');
}

let _dlFilter = 'all';         // 'all' | 'active' | 'done' | 'error'
let _dlSelectionMode = false;
const _selectedDl = new Set(); // 存 taskId

// ── 筛选 ──────────────────────────────────────────────
function setDownloadFilter(f) {
  _dlFilter = f;
  document.querySelectorAll('#downloadFilterTabs .filter-tab').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.includes(
      f === 'all' ? '全部' : f === 'active' ? '下载中' : f === 'done' ? '已完成' : '失败'
    ));
  });
  const queue = getState('queueSnapshot') || [];
  renderQueue(queue);
}

// ── 选择模式 ─────────────────────────────────────────
function enterDlSelectionMode() {
  _dlSelectionMode = true;
  _selectedDl.clear();
  const queue = getState('queueSnapshot') || [];
  renderQueue(queue);
  updateDlSelectionBar();
}

function exitDlSelectionMode() {
  _dlSelectionMode = false;
  _selectedDl.clear();
  const queue = getState('queueSnapshot') || [];
  renderQueue(queue);
  updateDlSelectionBar();
}

function toggleDlSelect(taskId) {
  if (_selectedDl.has(taskId)) _selectedDl.delete(taskId);
  else _selectedDl.add(taskId);
  const queue = getState('queueSnapshot') || [];
  renderQueue(queue);
  updateDlSelectionBar();
}

function selectAllDl() {
  const queue = getState('queueSnapshot') || [];
  queue.forEach(s => _selectedDl.add(s.taskId));
  renderQueue(queue);
  updateDlSelectionBar();
}

function deselectAllDl() {
  _selectedDl.clear();
  const queue = getState('queueSnapshot') || [];
  renderQueue(queue);
  updateDlSelectionBar();
}

function updateDlSelectionBar() {
  if (!_dlDom.dlSelectionBar) return;
  const n = _selectedDl.size;
  if (!_dlSelectionMode) { _dlDom.dlSelectionBar.style.display = 'none'; return; }
  if (_dlDom.dlSelectionCount) _dlDom.dlSelectionCount.textContent = n;
  _dlDom.dlSelectionBar.style.display = 'flex';
}

// ── 批量操作 ─────────────────────────────────────────
async function batchRetryDl() {
  const queue = getState('queueSnapshot') || [];
  let ok = 0;
  for (const taskId of _selectedDl) {
    try {
      const s = queue.find(x => x.taskId === taskId);
      if (s && s.status === 'error') {
        const r = await api.retryDownload(taskId);
        if (r && r.ok) ok++;
      }
    } catch (e) {
      console.warn('[batchRetry] 重试失败:', taskId, e.message);
    }
  }
  showToast(`重试完成：${ok} 项已重新加入队列`, ok > 0 ? 'success' : 'warn', 3000);
  exitDlSelectionMode();
}

async function batchRemoveDl() {
  if (!_selectedDl.size) return;
  let removed = 0;
  for (const taskId of _selectedDl) {
    try {
      const r = await api.removeQueueItem(taskId);
      if (r && (r.removed !== undefined || r.ok !== undefined)) removed++;
    } catch (e) {
      console.warn('[batchRemove] 删除失败:', taskId, e.message);
    }
  }
  showToast(`已删除 ${removed} 项`, 'success', 2500);
  exitDlSelectionMode();
}

// ── 渲染 ──────────────────────────────────────────────
function renderQueue(queue) {
  if (!_dlDom.queueList || !_dlDom.queueBadge) return;
  const el = _dlDom.queueList;
  const badge = _dlDom.queueBadge;
  const active = queue.filter(s => s.status !== 'done');
  badge.textContent = active.length;
  state.set('queueSnapshot', queue);

  // 按筛选过滤
  let filtered = queue;
  if (_dlFilter === 'active') filtered = queue.filter(s => s.status === 'downloading' || s.status === 'pending');
  else if (_dlFilter === 'done') filtered = queue.filter(s => s.status === 'done');
  else if (_dlFilter === 'error') filtered = queue.filter(s => s.status === 'error');

  if (!filtered.length) {
    const emptyMsg = _dlFilter === 'all' ? '暂无下载任务' : _dlFilter === 'active' ? '暂无正在下载的任务' : _dlFilter === 'done' ? '暂无已完成的任务' : '暂无失败的任务';
    el.innerHTML = `<div class="queue-empty">${emptyMsg}</div>`;
    return;
  }

  // 最新在上
  el.innerHTML = filtered.slice(-50).reverse().map(s => {
    const selected = _selectedDl.has(s.taskId) && _dlSelectionMode;
    return `
    <div class="queue-item queue-status-${s.status}${selected && _dlSelectionMode ? ' selected' : ''}">
      ${_dlSelectionMode ? `
      <div class="queue-item-cb" onclick="event.stopPropagation();toggleDlSelect('${escAttr(s.taskId)}')">
        <input type="checkbox" id="dlcb_${escAttr(s.taskId)}" ${selected ? 'checked' : ''} onchange="event.stopPropagation();toggleDlSelect('${escAttr(s.taskId)}')">
      </div>` : ''}
      ${s.cover
        ? `<img class="queue-cover" src="${escAttr(s.cover)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : ''}
      <div class="queue-cover-ph" ${s.cover ? 'style="display:none"' : ''}>🎵</div>
      <div class="queue-info">
        <div class="queue-title">${esc(s.title || '未知')}</div>
        <div class="queue-status status-${s.status}">${statusLabel(s.status)}${s.error ? ': ' + esc(s.error) : ''}</div>
        ${s.status === 'downloading' ? `
        <div class="progress-bar-wrap"><div class="progress-bar" id="prog-${escAttr(s.taskId)}" style="width:${s.progress||0}%"></div></div>` : ''}
      </div>
      ${(!_dlSelectionMode && s.status === 'pending') ? `<button class="queue-cancel" onclick="event.stopPropagation();api.cancelDownload('${escAttr(s.taskId)}')" title="取消">✕</button>` : ''}
      ${(!_dlSelectionMode && s.status === 'done') ? `<button class="queue-cancel" style="color:var(--neon-green)" title="打开文件夹" onclick="event.stopPropagation();api.openFolder('${escAttr(getState('saveDir') || '')}')">📂</button>` : ''}
      ${(!_dlSelectionMode && s.status === 'done') ? `<button class="queue-cancel" style="color:var(--neon-cyan)" title="转换格式" onclick="event.stopPropagation();showConvertModal('${escAttr(s.savePath || '')}', '${escAttr(s.title || '')}')">🔄</button>` : ''}
      ${(!_dlSelectionMode && s.status === 'error') ? `
        <button class="queue-cancel" style="color:var(--neon-orange)" title="重试下载" onclick="event.stopPropagation();retryQueueItem('${escAttr(s.taskId)}')">🔄</button>
        <button class="queue-cancel" title="移除" onclick="event.stopPropagation();removeQueueItem('${escAttr(s.taskId)}')">✕</button>
      ` : ''}
    </div>`;
  }).join('');
}

// esc() 和 statusLabel() 已由 utils.js 全局导出，此处不再重复定义

// ── 单项操作 ─────────────────────────────────────────
async function retryQueueItem(taskId) {
  try {
    const r = await api.retryDownload(taskId);
    if (r && r.ok) { showToast('已加入重试队列', 'info', 2000); }
    else { showToast('重试失败：' + (r?.error || '未知错误'), 'error', 3000); }
  } catch (e) {
    showToast('重试失败：' + e.message, 'error', 3000);
  }
}

async function removeQueueItem(taskId) {
  try {
    await api.removeQueueItem(taskId);
  } catch (e) {
    showToast('删除失败：' + e.message, 'error', 3000);
  }
}

async function clearFinishedDownloads() {
  try {
    const r = await api.clearFinishedQueue();
    showToast(`已清空 ${r.removed} 个已完成任务`, 'success');
  } catch (e) {
    showToast('清空失败：' + e.message, 'error', 3000);
  }
}

async function clearAllDownloads() {
  if (!confirm('确认清空所有下载任务？正在进行的下载也会被取消。')) return;
  try {
    const r = await api.clearAllQueue();
    showToast(`已清空 ${r.removed} 个任务`, 'success');
  } catch (e) {
    showToast('清空失败：' + e.message, 'error', 3000);
  }
}

function openSaveDir() {
  const saveDir = getState('saveDir');
  if (saveDir) api.openFolder(saveDir);
  else showToast('尚未设置保存目录', 'warn');
}

async function exportCurrentPlaylist() {
  const queue = getState('queueSnapshot') || [];
  if (!queue.length) {
    showToast('当前没有下载任务', 'warn');
    return;
  }

  // 只导出已完成的歌曲
  const completedSongs = queue.filter(s => s.status === 'done' && s.filePath);
  if (!completedSongs.length) {
    showToast('没有已完成的歌曲可导出', 'warn');
    return;
  }

  try {
    const result = await api.exportPlaylist({
      songs: completedSongs.map(s => ({
        title: s.title,
        artist: s.artist,
        filePath: s.filePath,
        duration: s.duration || 0,
      })),
      format: 'm3u',
      name: 'MusicDL Playlist',
    });

    if (result.canceled) return;
    if (result.error) {
      showToast('导出失败: ' + result.error, 'error');
      return;
    }

    showToast(`✅ 已导出 ${completedSongs.length} 首歌曲`, 'success');
  } catch (e) {
    showToast('导出失败: ' + e.message, 'error');
  }
}

// ── 导出 ──────────────────────────────────────────────
// ── ES Module 导出 ──────────────────────────────────────
export {
  renderQueue,
  setDownloadFilter,
  enterDlSelectionMode,
  exitDlSelectionMode,
  toggleDlSelect,
  selectAllDl,
  deselectAllDl,
  batchRetryDl,
  batchRemoveDl,
  retryQueueItem,
  removeQueueItem,
  clearFinishedDownloads,
  clearAllDownloads,
  openSaveDir,
  exportCurrentPlaylist,
}

// ── 全局桥接（HTML onclick 兼容） ──────────────────────
window.renderQueue = renderQueue;
window.setDownloadFilter = setDownloadFilter;
window.enterDlSelectionMode = enterDlSelectionMode;
window.exitDlSelectionMode = exitDlSelectionMode;
window.toggleDlSelect = toggleDlSelect;
window.selectAllDl = selectAllDl;
window.deselectAllDl = deselectAllDl;
// ── 音频格式转换 ───────────────────────────────────────
let _convertTarget = { path: '', title: '' };

function showConvertModal(filePath, title) {
  _convertTarget = { path: filePath, title };
  document.getElementById('convertModalInfo').textContent = title ? `📄 ${title}` : '';
  document.getElementById('convertModal').classList.remove('hidden');
}
window.showConvertModal = showConvertModal;

function closeConvertModal() {
  document.getElementById('convertModal').classList.add('hidden');
  _convertTarget = { path: '', title: '' };
}
window.closeConvertModal = closeConvertModal;

async function doConvertAudio(outputFormat) {
  const { path: inputPath } = _convertTarget;
  if (!inputPath) { showToast('文件路径无效', 'error'); closeConvertModal(); return; }

  closeConvertModal();
  showToast(`🔄 开始转换 ${outputFormat.toUpperCase()}...`, 'info', 3000);

  try {
    const result = await api.convertAudio({ inputPath, outputFormat, bitrate: '320k' });
    if (result && result.canceled) {
      // 用户取消了保存对话框
    } else if (result && result.success) {
      showToast(`✅ 转换成功：${result.path}`, 'success', 4000);
    } else {
      showToast('❌ 转换失败：' + (result?.error || '未知错误'), 'error', 5000);
    }
  } catch (e) {
    showToast('❌ 转换异常：' + e.message, 'error', 5000);
  }
}
window.doConvertAudio = doConvertAudio;

window.batchRetryDl = batchRetryDl;
window.batchRemoveDl = batchRemoveDl;
window.retryQueueItem = retryQueueItem;
window.removeQueueItem = removeQueueItem;
window.clearFinishedDownloads = clearFinishedDownloads;
window.clearAllDownloads = clearAllDownloads;
window.openSaveDir = openSaveDir;
window.exportCurrentPlaylist = exportCurrentPlaylist;

// ── DOM 缓存初始化 ──────────────────────────────────
_cacheDlDom();
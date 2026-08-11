const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const mm = require('music-metadata');  // 多格式元数据 + 封面
const NodeID3 = require('node-id3');   // 仅用于 MP3 写回

const AUDIO_EXTS = new Set(['.mp3', '.flac', '.m4a', '.ogg', '.wav', '.wma']);

/**
 * 递归扫描目录，返回所有音频文件路径（异步，不阻塞 UI）
 *
 * 修复 P1-4：旧实现是同步递归 + 同步 statSync，5000+ 歌曲时会卡 UI 几秒
 *
 * @param {string} dirPath - 起始目录
 * @param {(progress: {scanned: number, currentDir: string}) => void} [onProgress] - 进度回调（每 50 个文件触发一次）
 * @returns {Promise<string[]>} 音频文件绝对路径数组
 */
async function scanDirectory(dirPath, onProgress) {
  const results = [];
  let scanned = 0;

  async function walk(dir) {
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch (e) {
      // 跳过无权限/不存在的目录
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (AUDIO_EXTS.has(ext)) {
          results.push(fullPath);
        }
        scanned++;
        // 节流：每 50 个文件回调一次，避免 IPC 风暴
        if (onProgress && scanned % 50 === 0) {
          try { onProgress({ scanned, currentDir: dir }); } catch {}
        }
      }
    }
  }

  await walk(dirPath);
  // 最后再回调一次（确保 < 50 个文件时也能收到）
  if (onProgress) {
    try { onProgress({ scanned, currentDir: dirPath, done: true }); } catch {}
  }
  return results;
}

/**
 * 把 music-metadata 返回的 picture 转 dataURL
 * 修复 C1：用 music-metadata 替代 NodeID3，支持 MP3/FLAC/M4A/OGG/WAV 全格式封面
 */
function _pictureToDataURL(pic) {
  if (!pic || !pic.data) return null;
  const mime = pic.format || 'image/jpeg';
  return `data:${mime};base64,${pic.data.toString('base64')}`;
}

/**
 * 读取音频文件的元数据 + 封面
 *
 * 修复 C1：旧实现只用 NodeID3.read()，对 FLAC/M4A/OGG 返回空封面（不读）
 * 现在用 music-metadata 7.x 库，支持几乎所有格式的元数据 + 封面提取
 * NodeID3 仅保留用于写回（仅 MP3 完整支持 ID3v2 写）
 */
async function readAudioMetadata(filePath) {
  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath, ext);

  let tags = {};
  let coverBase64 = null;
  let realDurationMs = 0;

  // 主路径：music-metadata（多格式支持）
  try {
    const meta = await mm.parseFile(filePath, { duration: true, skipCovers: false });
    const common = meta.common || {};
    const fmt = meta.format || {};

    tags = {
      title: common.title || '',
      artist: Array.isArray(common.artist) ? common.artist.join(' / ') : (common.artist || ''),
      album: common.album || '',
      year: common.year ? String(common.year) : '',
      genre: Array.isArray(common.genre) ? common.genre.join(' / ') : (common.genre || ''),
    };

    // 封面（music-metadata 通用 picture 接口）
    if (Array.isArray(common.picture) && common.picture.length > 0) {
      coverBase64 = _pictureToDataURL(common.picture[0]);
    }

    // 真实时长（秒 → 毫秒）
    if (fmt.duration) realDurationMs = Math.round(fmt.duration * 1000);
  } catch (e) {
    // music-metadata 失败时，MP3 兜底用 NodeID3
    if (ext === '.mp3') {
      try {
        const rawTags = NodeID3.read(filePath) || {};
        tags = {
          title: rawTags.title || '',
          artist: rawTags.artist || '',
          album: rawTags.album || '',
          year: rawTags.year || rawTags.recordingTime || '',
          genre: rawTags.genre || '',
        };
        if (rawTags.image) {
          const img = Array.isArray(rawTags.image) ? rawTags.image[0] : rawTags.image;
          if (img && img.imageBuffer) {
            const mime = img.mime || 'image/jpeg';
            coverBase64 = `data:${mime};base64,${img.imageBuffer.toString('base64')}`;
          }
        }
      } catch {}
    }
  }

  // 如果没有 ID3 标签，尝试从文件名推断
  if (!tags.title && !tags.artist) {
    const parsed = parseFilename(fileName);
    tags.title = parsed.title;
    tags.artist = parsed.artist;
  }
  if (!tags.title) tags.title = fileName;

  // 真实时长优先；解析不到再估算
  if (!realDurationMs) {
    realDurationMs = estimateDuration(filePath, ext, stat.size);
  }

  return {
    filePath,
    fileName: path.basename(filePath),
    ext,
    title: tags.title,
    artist: tags.artist,
    album: tags.album,
    year: tags.year || '',
    genre: tags.genre || '',
    cover: coverBase64,
    durationMs: realDurationMs,
    fileSize: stat.size,
  };
}

/**
 * 写入 ID3 标签（仅 MP3 完全支持，NodeID3 限制）
 */
async function writeAudioMetadata(filePath, { title, artist, album, year, genre } = {}) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.mp3') {
    return { success: false, error: '当前仅支持 MP3 文件写回（其他格式的元数据写回需专用库）' };
  }
  try {
    const tags = {};
    if (title !== undefined) tags.title = title;
    if (artist !== undefined) tags.artist = artist;
    if (album !== undefined) tags.album = album;
    if (year !== undefined) tags.year = String(year);
    if (genre !== undefined) tags.genre = genre;

    const result = NodeID3.update(tags, filePath);
    return { success: result === true || result === null };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * 写入封面图片（仅 MP3）
 */
async function writeAudioCover(filePath, imageBuffer) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.mp3') {
    return { success: false, error: '当前仅支持 MP3 文件写封面（FLAC/M4A 需 Vorbis/Atom 库）' };
  }
  try {
    const mime = guessMime(imageBuffer);
    const tags = {
      image: {
        mime,
        type: { id: 3, name: 'front cover' },
        description: 'Album Cover',
        imageBuffer,
      },
    };
    const result = NodeID3.update(tags, filePath);
    return { success: result === true || result === null };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * 从文件名推断艺术家和标题
 * 支持格式："艺术家 - 标题" 或 "艺术家-标题"
 */
function parseFilename(name) {
  const match = name.match(/^(.+?)\s*[-_]\s*(.+)$/);
  if (match) {
    return { artist: match[1].trim(), title: match[2].trim() };
  }
  return { artist: '', title: name };
}

/**
 * 粗略估算音频时长（毫秒）— 仅在 metadata.duration 不可用时降级使用
 */
function estimateDuration(filePath, ext, fileSize) {
  const bitrateMap = {
    '.mp3': 192000,
    '.flac': 800000,
    '.m4a': 256000,
    '.ogg': 192000,
    '.wav': 1411000,
    '.wma': 192000,
  };
  const bitrate = bitrateMap[ext] || 192000;
  return Math.round((fileSize * 8) / bitrate * 1000);
}

function guessMime(buffer) {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer.slice(1, 4).toString() === 'PNG') return 'image/png';
  return 'image/jpeg';
}

module.exports = {
  scanDirectory,
  readAudioMetadata,
  writeAudioMetadata,
  writeAudioCover,
  parseFilename,
  AUDIO_EXTS,
};

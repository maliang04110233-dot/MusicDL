// 测试 C2/L2/L3 + B-Local：文件夹封面兜底 + 嵌入歌词兜底 + 静态歌词模式
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os');
const iconv = require('iconv-lite');
const { readAudioMetadata, readEmbeddedLyrics, _findFolderCover, _guessMimeFromBuffer } = require('./src/utils/localLibrary');

let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) { pass++; console.log('  ✓', label); } else { fail++; console.log('  ✗', label); } };

(async () => {
  // ── C2: 文件夹封面兜底 ─────────────────────────────────
  console.log('\n── C2: 文件夹封面兜底（cover.jpg/folder.jpg/front.jpg/AlbumArt*）──');
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'folder-cover-'));
  // 写一个不带封面的假 MP3（copy of 真实 MP3 但去掉 ID3）
  const realMp3 = 'C:\\Users\\59443\\Music\\MusicDownloader\\Gareth.T - 玻璃.mp3';
  const noCoverMp3 = path.join(tmpDir, 'no-cover.mp3');
  try {
    await fsp.copyFile(realMp3, noCoverMp3);
    // 验证它本来有 cover
    const m1 = await readAudioMetadata(noCoverMp3);
    ok(!!m1.cover, `原始 MP3 自带 cover（${m1.cover ? m1.cover.length + ' 字符' : '无'}）`);

    // 现在删除 ID3 标签来模拟 "无嵌入封面"
    const NodeID3 = require('node-id3');
    NodeID3.removeTags(noCoverMp3);
    const m2 = await readAudioMetadata(noCoverMp3);
    ok(!m2.cover, '删除 ID3 后 cover 为空（模拟无嵌入封面）');

    // 放一张 cover.jpg 到同目录
    const coverJpg = path.join(tmpDir, 'cover.jpg');
    // 1x1 JPEG
    const tinyJpeg = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
      0x09, 0x0A, 0x0B, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F,
      0x00, 0x7B, 0x40, 0x1B, 0xFF, 0xD9,
    ]);
    await fsp.writeFile(coverJpg, tinyJpeg);

    // 现在再读：应该从 cover.jpg 找到封面
    const m3 = await readAudioMetadata(noCoverMp3);
    ok(!!m3.cover, '文件夹 cover.jpg 兜底成功');
    ok(m3.cover && m3.cover.startsWith('data:image/jpeg'), `cover MIME 正确 (${m3.cover ? m3.cover.substring(0, 30) : '无'})`);

    // 删 cover.jpg，换 folder.jpg
    await fsp.unlink(coverJpg);
    await fsp.writeFile(path.join(tmpDir, 'folder.jpg'), tinyJpeg);
    const m4 = await readAudioMetadata(noCoverMp3);
    ok(!!m4.cover, '文件夹 folder.jpg 兜底成功');

    // 删 folder.jpg，换 AlbumArtSmall.jpg
    await fsp.unlink(path.join(tmpDir, 'folder.jpg'));
    await fsp.writeFile(path.join(tmpDir, 'AlbumArtSmall.jpg'), tinyJpeg);
    const m5 = await readAudioMetadata(noCoverMp3);
    ok(!!m5.cover, '文件夹 AlbumArt*.jpg 通配兜底成功');

    // _findFolderCover 直接测
    const found = _findFolderCover(noCoverMp3, 'no-cover');
    ok(found && /AlbumArt/.test(found), '_findFolderCover 返回 AlbumArt 路径');
  } catch (e) {
    console.log('  ⚠ C2 测试异常:', e.message);
  }
  // 清理
  await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});

  // ── L2: readEmbeddedLyrics ─────────────────────────────
  console.log('\n── L2: readEmbeddedLyrics 嵌入歌词提取 ──');
  // 用 node-id3 写一个带 USLT 的 MP3
  const tmpDir2 = await fsp.mkdtemp(path.join(os.tmpdir(), 'embed-lrc-'));
  const lrcMp3 = path.join(tmpDir2, 'with-lrc.mp3');
  try {
    // 复制真实 MP3 作为底
    await fsp.copyFile(realMp3, lrcMp3);
    const NodeID3 = require('node-id3');
    const lrcText = '[00:00.00]测试嵌入歌词\n[00:05.00]第二行\n[00:10.00]第三行';
    NodeID3.update({
      title: 'LRC Test',
      artist: 'Test Artist',
      unsynchronisedLyrics: { language: 'chi', text: lrcText },
    }, lrcMp3);
    // 验证 node-id3 写进去了
    const raw = NodeID3.read(lrcMp3);
    ok(raw.unsynchronisedLyrics && raw.unsynchronisedLyrics.text === lrcText, 'node-id3 写 USLT 成功');

    // readEmbeddedLyrics 读出来
    const embedded = await readEmbeddedLyrics(lrcMp3);
    ok(embedded === lrcText, `readEmbeddedLyrics 还原 USLT (${embedded ? embedded.length : 0}/${lrcText.length} 字符)`);
  } catch (e) {
    console.log('  ⚠ L2 测试异常:', e.message);
  }
  await fsp.rm(tmpDir2, { recursive: true, force: true }).catch(() => {});

  // ── C3: _guessMimeFromBuffer 完整覆盖 ──────────────────
  console.log('\n── C3: _guessMimeFromBuffer 探测 ──');
  ok(_guessMimeFromBuffer(Buffer.from([0xFF, 0xD8, 0xFF])) === 'image/jpeg', 'JPEG magic → image/jpeg');
  ok(_guessMimeFromBuffer(Buffer.from([0x89, 0x50, 0x4E, 0x47])) === 'image/png', 'PNG magic → image/png');
  ok(_guessMimeFromBuffer(Buffer.from([0x47, 0x49, 0x46, 0x38])) === 'image/gif', 'GIF magic → image/gif');
  ok(_guessMimeFromBuffer(Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])) === 'image/webp', 'WebP magic → image/webp');
  ok(_guessMimeFromBuffer(Buffer.from([0x42, 0x4D, 0x00, 0x00])) === 'image/bmp', 'BMP magic → image/bmp');
  ok(_guessMimeFromBuffer(Buffer.from([0, 0, 0, 0])) === 'image/jpeg', '未知 → 兜底 image/jpeg');
  ok(_guessMimeFromBuffer(Buffer.alloc(0)) === 'image/jpeg', '空 buffer → image/jpeg');

  // ── B-Local: 验证 playQueue 修复（无法在 node 跑，但能验证逻辑存在） ──
  console.log('\n── B-Local: playLocalSong 修复（手动代码检查）──');
  const html = fs.readFileSync(path.join(__dirname, 'src/renderer/index.html'), 'utf8');
  ok(/playQueue\s*=\s*localFiltered\.slice\(\)/.test(html), 'playLocalSong 设置 playQueue');
  ok(/playIdx\s*=\s*idx/.test(html.split('async function playLocalSong')[1].substring(0, 500)), 'playLocalSong 设置 playIdx');
  ok(/showStaticLyrics/.test(html), 'showStaticLyrics 函数存在');
  ok(/showNoLyrics/.test(html), 'showNoLyrics 函数存在');
  ok(/lyric-line static/.test(html), 'showStaticLyrics 渲染静态行（lyric-line static 类）');

  // ── L3: parseLrc 自动判断（renderer） ──────────────────
  console.log('\n── L3: parseLrc 自动判断时间标签 ──');
  // 取整个 parseLrc 函数体（贪婪直到下一个 "function " 关键字）
  const parseLrcMatch = html.match(/function parseLrc\([\s\S]*?\n\}/);
  const parseLrcBody = parseLrcMatch ? parseLrcMatch[0] : '';
  ok(parseLrcBody.length > 100, `parseLrc 函数体提取成功（${parseLrcBody.length} 字符）`);
  ok(/showStaticLyrics\(lrc\)/.test(parseLrcBody), 'parseLrc 无时间标签时调用 showStaticLyrics');
  ok(/parsedLyrics\.length/.test(parseLrcBody), 'parseLrc 维护 parsedLyrics');
  ok(/lyric-line/.test(parseLrcBody), 'parseLrc 渲染 lyric-line');

  // ── 渲染层 readLocalLrc source 字段 ──────────────────
  console.log('\n── R1: 渲染层 readLocalLrc 使用 source 字段 ──');
  const playLocalSongBody = html.match(/async function playLocalSong[\s\S]{0,2000}?\n\}/)[0];
  ok(/r\.source\s*===\s*['"]embedded['"]/.test(playLocalSongBody), 'playLocalSong 检查 source==="embedded"');

  // ── IPC read-local-lrc 兜底逻辑 ──────────────────────
  console.log('\n── IPC: read-local-lrc 兜底嵌入歌词 ──');
  const indexJs = fs.readFileSync(path.join(__dirname, 'src/main/index.js'), 'utf8');
  const handlerBody = indexJs.match(/ipcMain\.handle\('read-local-lrc'[\s\S]{0,1500}?\}\);/)[0];
  ok(/readEmbeddedLyrics/.test(handlerBody), 'read-local-lrc 调用 readEmbeddedLyrics');
  ok(/source:\s*['"]embedded['"]/.test(handlerBody), 'read-local-lrc 返回 source="embedded"');
  ok(/source:\s*['"]sidecar['"]/.test(handlerBody), 'read-local-lrc 返回 source="sidecar"');

  console.log(`\n${'='.repeat(40)}\n通过 ${pass} / 失败 ${fail}`);
  process.exit(fail ? 1 : 0);
})();

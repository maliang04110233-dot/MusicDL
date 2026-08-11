// 测试 C1 (封面) + L1 (GBK 歌词) 修复
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const os = require('os');
const iconv = require('iconv-lite');
const { readAudioMetadata, parseFilename } = require('./src/utils/localLibrary');

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log('  ✓', label); }
  else { fail++; console.log('  ✗', label); }
}

(async () => {
  // ── C1: 封面提取（music-metadata）────────────────────────────────────
  console.log('\n── C1: music-metadata 封面 + 元数据提取 ──');

  // 找系统真实音频
  function findAudio(dir, depth = 0) {
    if (depth > 3) return null;
    try {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isFile() && /\.(mp3|flac|m4a)$/i.test(e.name)) return p;
        if (e.isDirectory()) { const r = findAudio(p, depth + 1); if (r) return r; }
      }
    } catch {}
    return null;
  }
  const testFile = findAudio('C:\\Users\\59443\\Music') || findAudio('D:\\Music');
  if (testFile) {
    console.log('  测试文件:', testFile);
    const m = await readAudioMetadata(testFile);
    ok(m.title && m.title.length > 0, `title="${m.title}"`);
    ok(m.artist && m.artist.length > 0, `artist="${m.artist}"`);
    ok(m.durationMs > 0, `durationMs=${m.durationMs} (> 0 真实时长)`);
    ok(m.cover && m.cover.startsWith('data:image/'), `cover 存在且是 dataURL (${m.cover ? m.cover.length + ' 字符' : '无'})`);
    if (m.cover) {
      const mb = Math.round(m.cover.length / 1024);
      ok(mb > 1, `cover base64 ≈ ${mb}KB（确认是真图不是占位）`);
    }
  } else {
    console.log('  ⚠ 未找到测试音频文件，跳过真机测试');
  }

  // ── C1.b: 合成带 ID3 的 mp3，验证 music-metadata 解析────────────────────
  console.log('\n── C1.b: 合成 MP3 + node-id3 + music-metadata 闭环 ──');
  const NodeID3 = require('node-id3');
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'cover-test-'));
  const tmpMp3 = path.join(tmpDir, 'test-song.mp3');
  // 用最小有效 mp3 frame（前 4 字节是 ID3 头）
  const fakeMp3 = Buffer.concat([
    Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), // ID3v2.3 header
    Buffer.alloc(100),  // 占位
  ]);
  await fsp.writeFile(tmpMp3, fakeMp3);

  // 写一个 1x1 JPEG
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
  const writeRes = NodeID3.update({
    title: '测试歌曲',
    artist: '测试艺术家',
    album: '测试专辑',
    year: '2026',
    image: {
      mime: 'image/jpeg',
      type: { id: 3, name: 'front cover' },
      description: 'Album Cover',
      imageBuffer: tinyJpeg,
    },
  }, tmpMp3);
  console.log('  写入 ID3:', writeRes);
  if (writeRes === true) {
    const meta = await readAudioMetadata(tmpMp3);
    ok(meta.title === '测试歌曲', `music-metadata 读 title: "${meta.title}"`);
    ok(meta.artist === '测试艺术家', `music-metadata 读 artist: "${meta.artist}"`);
    ok(meta.cover && meta.cover.startsWith('data:image/jpeg;base64,'), `music-metadata 读 cover (${meta.cover ? meta.cover.length + ' 字符' : '无'})`);
  } else {
    console.log('  ⚠ NodeID3.update 返回非真值，跳过 ID3 闭环测试');
  }

  // 清理
  await fsp.unlink(tmpMp3).catch(() => {});
  await fsp.rmdir(tmpDir).catch(() => {});

  // ── L1: LRC 编码智能解码────────────────────────────────────────────
  console.log('\n── L1: LRC 编码智能解码（GBK / UTF-8 / BOM）──');

  // 抽出来测试 _decodeLrcBuffer
  // 它是 index.js 内部函数，这里复制过来测逻辑（避免 require 启动 ipcMain）
  function _decodeLrcBuffer(buf) {
    if (buf[0] === 0xFF && buf[1] === 0xFE) return buf.slice(2).toString('utf16le');
    if (buf[0] === 0xFE && buf[1] === 0xFF) {
      const out = Buffer.alloc(buf.length - 2);
      for (let i = 2; i < buf.length; i += 2) {
        out[i - 2] = buf[i + 1] || 0;
        out[i - 1] = buf[i] || 0;
      }
      return out.toString('utf16le');
    }
    if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) return buf.slice(3).toString('utf8');
    const utf8Text = buf.toString('utf8');
    if (!/[�]/.test(utf8Text)) return utf8Text;
    try { return iconv.decode(buf, 'gbk'); } catch { return utf8Text; }
  }

  const sampleLrc = '[00:00.00]演唱：一首好听的中文歌\n[00:05.00]作词：测试\n[00:10.00]作曲：测试\n[00:15.00]歌曲名：本地歌词测试\n';

  // L1.1: GBK 编码（无 BOM）
  const gbkBuf = iconv.encode(sampleLrc, 'gbk');
  ok(gbkBuf[0] !== 0xFF && gbkBuf[0] !== 0xFE, 'GBK 缓冲无 BOM 头');
  const gbkDecoded = _decodeLrcBuffer(gbkBuf);
  ok(gbkDecoded === sampleLrc, `GBK 无 BOM → 正确解码 (长度 ${gbkDecoded.length}/${sampleLrc.length})`);

  // L1.2: UTF-8 无 BOM
  const utf8Buf = Buffer.from(sampleLrc, 'utf8');
  const utf8Decoded = _decodeLrcBuffer(utf8Buf);
  ok(utf8Decoded === sampleLrc, `UTF-8 无 BOM → 正确解码`);

  // L1.3: UTF-8 BOM
  const utf8BomBuf = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), utf8Buf]);
  const utf8BomDecoded = _decodeLrcBuffer(utf8BomBuf);
  ok(utf8BomDecoded === sampleLrc, `UTF-8 BOM → 正确解码`);

  // L1.4: UTF-16 LE BOM
  const utf16leBuf = Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from(sampleLrc, 'utf16le')]);
  const utf16leDecoded = _decodeLrcBuffer(utf16leBuf);
  ok(utf16leDecoded === sampleLrc, `UTF-16 LE BOM → 正确解码`);

  // L1.5: 纯英文 LRC
  const enLrc = '[00:00.00]English lyrics test\n';
  ok(_decodeLrcBuffer(Buffer.from(enLrc, 'utf8')) === enLrc, '纯英文 UTF-8 正常');

  // L1.6: 极端情况 - 混合中文 LRC（逐行不同编码）— 整文件统一编码才能正确处理，不在这里测
  // 实际场景：一份 LRC 文件通常统一编码

  // ── parseFilename 回归（无破坏）────────────────────────────────────
  console.log('\n── parseFilename 回归 ──');
  ok(JSON.stringify(parseFilename('Gareth.T - 玻璃')) === JSON.stringify({ artist: 'Gareth.T', title: '玻璃' }), '"Gareth.T - 玻璃" 解析正确');
  ok(JSON.stringify(parseFilename('标题')) === JSON.stringify({ artist: '', title: '标题' }), '单段文件名兜底');

  console.log(`\n${'='.repeat(40)}\n通过 ${pass} / 失败 ${fail}`);
  process.exit(fail ? 1 : 0);
})();

// 实测 m4a 封面/歌词/时长（修复 B-Local 关键验证）
const fs = require('fs');
const path = require('path');
const { readAudioMetadata, readEmbeddedLyrics } = require('./src/utils/localLibrary');

(async () => {
  // 找系统所有 m4a/flac
  function findAudio(dir, exts, maxDepth = 5, depth = 0) {
    if (depth > maxDepth) return [];
    let res = [];
    try {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) res = res.concat(findAudio(p, exts, maxDepth, depth + 1));
        else if (e.isFile() && exts.test(e.name)) res.push(p);
      }
    } catch {}
    return res;
  }
  const exts = /\.(flac|m4a|ogg|wav)$/i;
  const files = [
    ...findAudio('C:\\Users\\59443\\Music', exts),
    ...findAudio('D:\\Music', exts),
  ].slice(0, 5);

  if (!files.length) {
    console.log('⚠ 未找到非 MP3 音频文件，跳过');
    return;
  }

  for (const f of files) {
    console.log('\n' + '━'.repeat(60));
    console.log('文件:', path.basename(f));
    console.log('  大小:', Math.round(fs.statSync(f).size / 1024) + 'KB');
    try {
      const m = await readAudioMetadata(f);
      console.log('  title:        ', m.title || '(空)');
      console.log('  artist:       ', m.artist || '(空)');
      console.log('  album:        ', m.album || '(空)');
      console.log('  durationMs:   ', m.durationMs, '(', Math.round(m.durationMs / 1000), '秒)');
      console.log('  cover:        ', m.cover ? `dataURL ${m.cover.length} 字符` : '(无)');
      console.log('  embeddedLyrics:', m.embeddedLyrics ? `${m.embeddedLyrics.length} 字符 → "${m.embeddedLyrics.substring(0, 80)}..."` : '(无)');
      console.log('  source:       ', m._source);

      // 关键验证
      let pass = 0, fail = 0;
      const ok = (cond, label) => { if (cond) { pass++; console.log('  ✓', label); } else { fail++; console.log('  ✗', label); } };
      ok(m.title, 'title 不空');
      ok(m.durationMs > 0, 'durationMs > 0 (真实时长)');
      // cover 取决于文件本身有没有嵌入：B站下载的 m4a 通常不带 → 跳过严格断言
      ok(m._source === 'music-metadata', `解析器 = music-metadata（${m._source}）`);
      console.log('  ℹ cover 状态:', m.cover ? '有' : '无（文件本身没带封面，文件夹兜底也需手动加 cover.jpg）');
    } catch (e) {
      console.log('  ERR:', e.message);
    }
  }
})();

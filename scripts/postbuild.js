const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');

function copyDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.json')) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const dirs = [
  { from: path.join(src, 'api'), to: path.join(dist, 'api') },
  { from: path.join(src, 'utils'), to: path.join(dist, 'utils') },
  { from: path.join(src, 'main', 'ipc'), to: path.join(dist, 'main', 'ipc') },
];

// Copy all .js files from src/main/ except index.js and preload.js (already built by Vite)
let mainFiles = [];
try { mainFiles = fs.readdirSync(path.join(src, 'main')); } catch (_e) { /* src/main 不存在 */ }
for (const file of mainFiles) {
  if (file.endsWith('.js') && file !== 'index.js' && file !== 'preload.js') {
    const from = path.join(src, 'main', file);
    const to = path.join(dist, 'main', file);
    dirs.push({ from, to });
  }
}

for (const { from, to } of dirs) {
  if (fs.existsSync(from)) {
    if (fs.statSync(from).isDirectory()) {
      copyDir(from, to);
    } else {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
    console.log(`  copied: ${path.relative(root, from)} -> ${path.relative(root, to)}`);
  }
}

// Copy mini-player.html (Vite 不处理主进程动态 loadFile 的页面)
const miniPlayerSrc = path.join(src, 'renderer', 'mini-player.html');
const miniPlayerDst = path.join(dist, 'renderer', 'mini-player.html');
if (fs.existsSync(miniPlayerSrc)) {
  fs.mkdirSync(path.dirname(miniPlayerDst), { recursive: true });
  fs.copyFileSync(miniPlayerSrc, miniPlayerDst);
  console.log(`  copied: src/renderer/mini-player.html -> dist/renderer/mini-player.html`);
}

console.log('[postbuild] done');

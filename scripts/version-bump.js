#!/usr/bin/env node
/**
 * 自动递增版本号
 *
 * 每次 git commit 时 pre-commit hook 调用此脚本：
 * - 读取 package.json 当前 version
 * - bump patch 版本（1.0.0 → 1.0.1 → 1.0.2 ...）
 * - 写回 package.json 并 stage
 *
 * 用法：git 钩子自动调用，或手动 `node scripts/version-bump.js`
 * 环境变量 SKIP_VERSION_BUMP=1 可跳过（防止递归）
 */
const fs = require('fs');
const cp = require('child_process');

if (process.env.SKIP_VERSION_BUMP === '1') process.exit(0);

const pkgPath = require('path').join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const parts = pkg.version.split('.').map(Number);
if (parts.length !== 3) {
  console.error('Invalid version format:', pkg.version);
  process.exit(1);
}

// bump patch
parts[2] += 1;
const newVersion = parts.join('.');

if (newVersion === pkg.version) {
  console.log('[version-bump] version unchanged:', pkg.version);
  process.exit(0);
}

pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
cp.execFileSync('git', ['add', pkgPath], { stdio: 'inherit' });
console.log(`[version-bump] ${pkg.version} → ${newVersion}`);

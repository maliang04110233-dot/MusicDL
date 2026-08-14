/**
 * 自动给 HTML 添加 data-i18n 标记
 * 策略：扫描 HTML 中的纯文本节点，精确匹配 zh.json value，
 * 在父元素上添加 data-i18n="key" 属性
 */

const fs = require('fs');
const path = require('path');

const PROJECT = process.cwd();
const zh = require(path.join(PROJECT, 'src/renderer/js/lang/zh.json'));

// value → key 反向索引
const valueToKey = {};
for (const [k, v] of Object.entries(zh)) {
  if (!valueToKey[v]) valueToKey[v] = k;
}

const SKIP_TAGS = new Set(['script', 'style', 'template']);
const TARGET_TAGS = new Set(['span', 'button', 'a', 'label', 'option', 'h1', 'h2', 'h3', 'h4', 'p', 'div', 'li', 'td', 'th', 'strong']);

function processHtml(html) {
  const applied = new Set();

  for (const tag of TARGET_TAGS) {
    const pattern = new RegExp(
      `<(${tag})([^>]*?)>([^<{]{1,100})\\</${tag}>`,
      'gi'
    );
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const full = match[0];
      const opening = match[1];
      const attrs = match[2];
      const text = match[3].trim();

      if (attrs.includes('data-i18n')) continue;

      const key = valueToKey[text];
      if (key && !applied.has(key)) {
        applied.add(key);
        const newAttrs = attrs.trimEnd() + ` data-i18n="${key}"`;
        const newTag = `<${opening}${newAttrs}>${match[3]}</${tag}>`;
        html = html.replace(full, newTag, 1);
      }
    }
  }

  return { html, count: applied.size, keys: [...applied] };
}

const htmlFile = process.argv[2];
if (!htmlFile) {
  console.error('用法: mark-i18n.js <html-file>');
  process.exit(1);
}

const htmlPath = path.join(PROJECT, htmlFile);
const html = fs.readFileSync(htmlPath, 'utf8');
const { html: result, count, keys } = processHtml(html);

console.log(`已标记 ${count} 处 data-i18n`);
for (const k of keys) {
  console.log(`  + ${k}`);
}

const allKeys = new Set(Object.keys(zh));
const unmatched = [...allKeys].filter(k => !keys.includes(k));
if (unmatched.length) {
  console.log(`\n未匹配 ${unmatched.length} 个 key（HTML 结构复杂或文本不精确）`);
}

fs.writeFileSync(htmlPath, result, 'utf8');
console.log(`\n已更新: ${htmlPath}`);

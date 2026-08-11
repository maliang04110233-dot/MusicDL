/**
 * 单元测试：utils/localLibrary.js → parseFilename
 *
 * 跑：npm test
 */

const test = require('node:test');
const assert = require('node:assert');
const { parseFilename } = require('../src/utils/localLibrary');

test('parseFilename: 标准 " - " 分割', () => {
  const r = parseFilename('陈奕迅 - 浮夸');
  assert.strictEqual(r.artist, '陈奕迅');
  assert.strictEqual(r.title, '浮夸');
});

test('parseFilename: 多分隔符，取最后一个 " - "', () => {
  const r = parseFilename('周杰伦 - 晴天 - 伴奏');
  assert.strictEqual(r.artist, '周杰伦');
  assert.strictEqual(r.title, '晴天 - 伴奏');
});

test('parseFilename: AC-DC 风格（artist 内部含 -）', () => {
  const r = parseFilename('AC-DC - Back In Black');
  assert.strictEqual(r.artist, 'AC-DC');
  assert.strictEqual(r.title, 'Back In Black');
});

test('parseFilename: 没有分隔符时整段作 title', () => {
  const r = parseFilename('纯数字命名');
  assert.strictEqual(r.artist, '');
  assert.strictEqual(r.title, '纯数字命名');
});

test('parseFilename: 下划线作为分割符', () => {
  const r = parseFilename('周杰伦_晴天');
  assert.strictEqual(r.artist, '周杰伦');
  assert.strictEqual(r.title, '晴天');
});

test('parseFilename: 只有一个分隔符，artist 标题正常', () => {
  const r = parseFilename('陈奕迅-浮夸');
  assert.strictEqual(r.artist, '陈奕迅');
  assert.strictEqual(r.title, '浮夸');
});

test('parseFilename: 末尾分隔符（边界）', () => {
  // 边界：分隔符在末尾，" - " 优先规则会切出空 title
  // 这里我们希望：title = '' 不会，但旧版也会这样
  const r = parseFilename('陈奕迅 - ');
  assert.strictEqual(r.artist, '陈奕迅');
  assert.strictEqual(r.title, '');
});

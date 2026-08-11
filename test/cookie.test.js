/**
 * 单元测试：utils/cookie.js
 *
 * 跑：npm test
 */

const test = require('node:test');
const assert = require('node:assert');
const {
  pickCookieField,
  hasCookieField,
  hasCookieValue,
  extractQQUin,
  extractQQMusickey,
  normalizeQQCookie,
  detectQQCookieType,
} = require('../src/utils/cookie');

test('pickCookieField: 抽取第一个命中的字段', () => {
  const cookie = 'a=1; b=2; c=3';
  assert.strictEqual(pickCookieField(cookie, 'a'), '1');
  assert.strictEqual(pickCookieField(cookie, 'c'), '3');
  assert.strictEqual(pickCookieField(cookie, 'b', 'c'), '2');
  assert.strictEqual(pickCookieField(cookie, 'qm_keyst', 'qqmusic_key'), '');
});

test('pickCookieField: 跳过空格', () => {
  const cookie = 'a=1;  b=2 ;c=3';
  assert.strictEqual(pickCookieField(cookie, 'b'), '2');
});

test('pickCookieField: null/空安全', () => {
  assert.strictEqual(pickCookieField(null, 'a'), '');
  assert.strictEqual(pickCookieField('', 'a'), '');
  assert.strictEqual(pickCookieField(undefined, 'a'), '');
});

test('hasCookieField: 检测字段是否存在', () => {
  assert.strictEqual(hasCookieField('a=1; b=2', 'a'), true);
  assert.strictEqual(hasCookieField('a=1; b=2', 'c'), false);
});

test('hasCookieValue: 检测字段值是否等于给定字符串', () => {
  assert.strictEqual(hasCookieValue('tmeLoginType=1', 'tmeLoginType', '1'), true);
  assert.strictEqual(hasCookieValue('tmeLoginType=1', 'tmeLoginType', '2'), false);
});

test('extractQQUin: 支持 uin 和 wxuin', () => {
  assert.strictEqual(extractQQUin('uin=12345; other=1'), '12345');
  assert.strictEqual(extractQQUin('wxuin=o67890; other=1'), 'o67890');
  // uin 优先
  assert.strictEqual(extractQQUin('wxuin=o67890; uin=12345; x=1'), '12345');
  assert.strictEqual(extractQQUin('notfound=1'), '');
});

test('extractQQMusickey: qm_keyst 优先于 qqmusic_key', () => {
  const cookie1 = 'qm_keyst=key1; qqmusic_key=key2';
  assert.strictEqual(extractQQMusickey(cookie1), 'key1');
  const cookie2 = 'qqmusic_key=key2; other=1';
  assert.strictEqual(extractQQMusickey(cookie2), 'key2');
  assert.strictEqual(extractQQMusickey('notfound=1'), '');
});

test('normalizeQQCookie: wxuin → uin', () => {
  const input  = 'wxuin=12345; other=1';
  const output = 'uin=12345; other=1';
  assert.strictEqual(normalizeQQCookie(input), output);
});

test('detectQQCookieType: QQ 登录（tmeLoginType=1）', () => {
  const cookie = 'uin=12345; qqmusic_key=key1; tmeLoginType=1';
  const d = detectQQCookieType(cookie);
  assert.strictEqual(d.isQQLogin, true);
  assert.strictEqual(d.isWechatLogin, false);
  assert.strictEqual(d.uin, '12345');
  assert.deepStrictEqual(d.missing, []);
});

test('detectQQCookieType: 微信登录', () => {
  const cookie = 'wxuin=o12345; qqmusic_key=key1; login_type=2';
  const d = detectQQCookieType(cookie);
  assert.strictEqual(d.isQQLogin, false);
  assert.strictEqual(d.isWechatLogin, true);
});

test('detectQQCookieType: 缺关键字段时记入 missing', () => {
  const d = detectQQCookieType('foo=bar');
  assert.strictEqual(d.isQQLogin, false);
  assert.strictEqual(d.isWechatLogin, false);
  assert.ok(d.missing.includes('uin (或wxuin)'));
  assert.ok(d.missing.includes('qqmusic_key'));
});

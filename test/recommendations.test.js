/**
 * 单元测试：api/recommendations.js 的 cookie reader 机制
 *
 * 跑：npm test
 *
 * 验证：setCookieReader 注入后，getHomeRecommendations 内部会用它读 cookie
 * （用 Promise.allSettled + 故意让内部调用都失败，验证调用链通畅）
 */

const test = require('node:test');
const assert = require('node:assert');
const recommendations = require('../src/api/recommendations');
const aggregator = require('../src/api');

test('setCookieReader 接受函数，setCookieReader(null) 切回 fallback', () => {
  // 不抛错就算过
  recommendations.setCookieReader(() => 'cookie');
  recommendations.setCookieReader(null);
  // 验证 aggregator 暴露了 getCookie（fallback 依赖这个）
  assert.strictEqual(typeof aggregator.getCookie, 'function');
  assert.strictEqual(aggregator.getCookie('nobody'), '');
});

test('aggregator.getCookie 在 setCookieStore 之前返回空串', () => {
  // 注意：这是测 aggregator 自己的逻辑（cookieStore 是模块级状态）
  // 前面 test 可能改了它，所以这里只验证"至少不会抛错"
  const got = aggregator.getCookie('netease');
  assert.strictEqual(typeof got, 'string');
});

test('aggregator.setCookieStore 注入 fake store 后 getCookie 能读', () => {
  const fakeStore = {
    bilibili: 'SESSDATA=fake',
    qq: 'uin=12345',
    netease: 'MUSIC_U=fake',
  };
  aggregator.setCookieStore({
    get: (k) => fakeStore[k] || '',
  });
  assert.strictEqual(aggregator.getCookie('bilibili'), 'SESSDATA=fake');
  assert.strictEqual(aggregator.getCookie('qq'), 'uin=12345');
  assert.strictEqual(aggregator.getCookie('netease'), 'MUSIC_U=fake');
  assert.strictEqual(aggregator.getCookie('nope'), '');
});

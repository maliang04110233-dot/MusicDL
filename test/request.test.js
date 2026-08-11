/**
 * 单元测试：api/request.js 的重试逻辑
 *
 * 用本地 http server 模拟失败/成功，验证指数退避
 */

const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const request = require('../src/api/request');

function startServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

test('request: 成功响应直接返回解析后的 JSON', async () => {
  const { server, port } = await startServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  });
  try {
    const result = await request(`http://127.0.0.1:${port}/`, { retries: 0, timeout: 5000 });
    assert.deepStrictEqual(result, { ok: true });
  } finally {
    server.close();
  }
});

test('request: 网络错误重试到成功（重试 2 次后通）', async () => {
  let count = 0;
  const { server, port } = await startServer((req, res) => {
    count++;
    if (count < 3) {
      res.destroy();  // 模拟网络中断
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, attempts: count }));
  });
  try {
    const result = await request(`http://127.0.0.1:${port}/`, { retries: 3, retryDelay: 10, timeout: 5000 });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.attempts, 3);
  } finally {
    server.close();
  }
});

test('request: 超过重试次数后抛出', async () => {
  const { server, port } = await startServer((req, res) => {
    res.destroy();
  });
  try {
    await assert.rejects(
      () => request(`http://127.0.0.1:${port}/`, { retries: 1, retryDelay: 10, timeout: 2000 }),
      /Error|ECONNRESET|aborted|socket/i
    );
  } finally {
    server.close();
  }
});

test('request: 5xx 触发重试', async () => {
  let count = 0;
  const { server, port } = await startServer((req, res) => {
    count++;
    if (count < 2) {
      res.writeHead(503);  // 第一次 503
      res.end('upstream busy');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ recovered: true }));
  });
  try {
    const result = await request(`http://127.0.0.1:${port}/`, { retries: 2, retryDelay: 10, timeout: 5000 });
    assert.deepStrictEqual(result, { recovered: true });
  } finally {
    server.close();
  }
});

test('request: 4xx 客户端错误不重试（resolve 出 body 字符串，调用方按业务判断）', async () => {
  let count = 0;
  const { server, port } = await startServer((req, res) => {
    count++;
    res.writeHead(404);
    res.end('not found');
  });
  try {
    // 4xx 走 resolve，body 字符串透传
    const result = await request(`http://127.0.0.1:${port}/`, { retries: 3, retryDelay: 10, timeout: 5000 });
    assert.strictEqual(result, 'not found');
    assert.strictEqual(count, 1, '4xx 不应触发重试');
  } finally {
    server.close();
  }
});

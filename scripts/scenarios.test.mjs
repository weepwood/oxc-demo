import assert from 'node:assert/strict';
import { test } from 'node:test';
import scenarios from '../src/data/samples.json' with { type: 'json' };

const TOOLS = new Set(['lint', 'format', 'parser', 'transform', 'minify', 'resolver']);

test('六种工具各至少有三个可切换的案例', () => {
  for (const tool of TOOLS) {
    assert.ok(scenarios.filter((item) => item.tool === tool).length >= 3, tool);
  }
});

test('案例 ID 唯一，且输入符合本地执行接口', () => {
  const ids = scenarios.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const item of scenarios) {
    assert.match(item.id, /^[a-z0-9-]+$/);
    assert.ok(TOOLS.has(item.tool));
    assert.ok(item.code.length > 0);
    assert.ok(item.code.length <= 16_000);
    assert.match(item.filename, /^[a-zA-Z0-9_-]+\.(ts|tsx|js|jsx)$/);
    assert.ok(item.title && item.description && item.feature);
    assert.ok(Array.isArray(item.tags) && item.tags.length > 0);
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateInput } from './engine.mjs';

test('接受安全的 JavaScript/TypeScript 文件名', () => {
  const actual = validateInput({ tool: 'parser', filename: 'example.tsx', code: 'const x = 1' });
  assert.equal(actual.tool, 'parser');
  assert.equal(actual.specifier, 'react');
});

test('拒绝路径穿越', () => {
  assert.throws(() => validateInput({ tool: 'lint', filename: '../package.json', code: '' }), /文件名/);
});

test('拒绝未知工具', () => {
  assert.throws(() => validateInput({ tool: 'eval', filename: 'demo.js', code: '' }), /未知/);
});

test('拒绝超长代码', () => {
  assert.throws(() => validateInput({ tool: 'minify', filename: 'demo.js', code: 'x'.repeat(16_001) }), /16000/);
});

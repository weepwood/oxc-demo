import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareLines, getDiagnostics } from '../src/lib/inspect.ts';
import { runTool } from './engine.mjs';

test('识别 Oxc JSON 诊断', () => {
  const result = { output: JSON.stringify({ diagnostics: [{ message: 'unused', code: 'eslint(no-unused-vars)', severity: 'error', labels: [{ span: { line: 2, column: 3 } }] }] }) };
  assert.deepEqual(getDiagnostics(result), [{ message: 'unused', ruleId: 'eslint(no-unused-vars)', line: 2, column: 3, severity: 2 }]);
});

test('真实 Oxlint 输出可以解析', async () => {
  const result = await runTool({ tool: 'lint', filename: 'demo.js', code: 'const unused = 1;' });
  assert.equal(result.success, false);
  assert.ok(getDiagnostics(result).length > 0, result.output);
});

test('完整差异包含第 161 行之后的变更', () => {
  const before = Array.from({ length: 200 }, (_, i) => 'line ' + i);
  const after = [...before];
  after[190] = 'changed';
  const rows = compareLines(before.join('\n'), after.join('\n'));
  assert.ok(rows.some((row) => row.kind === 'added' && row.newLine === 191));
});

test('大型 AST 保持有效 JSON', async () => {
  const code = Array.from({ length: 300 }, (_, i) => 'const n' + i + ' = ' + i + ';').join('\n');
  const result = await runTool({ tool: 'parser', filename: 'demo.ts', code });
  assert.equal(result.success, true);
  assert.ok(JSON.parse(result.output).body.length === 300);
});

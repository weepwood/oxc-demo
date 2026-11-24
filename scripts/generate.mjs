import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import scenarios from '../src/data/samples.json' with { type: 'json' };
import { runTool } from './engine.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const results = {};
const ids = new Set();

for (const scenario of scenarios) {
  if (ids.has(scenario.id)) throw new Error(`重复示例 ID：${scenario.id}`);
  ids.add(scenario.id);
  const result = await runTool(scenario);
  if (!result.output) throw new Error(`示例 ${scenario.id} 未生成输出`);
  results[scenario.id] = result;
  console.log(`已生成 ${scenario.id}：${result.durationMs} ms`);
}

await mkdir(new URL('../public/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../public/showcase.json', import.meta.url),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      mode: 'build-snapshot',
      schemaVersion: 2,
      commit: process.env.GITHUB_SHA ?? null,
      scenarioCount: scenarios.length,
      results,
    },
    null,
    2,
  ),
);
console.log(`已生成 ${ids.size} 个 Oxc 真实案例快照：${root}public/showcase.json`);

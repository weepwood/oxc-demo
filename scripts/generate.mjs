import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import samples from '../src/data/samples.json' with { type: 'json' };
import { runTool } from './engine.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const results = {};

for (const sample of samples) {
  const result = await runTool(sample);
  if (!result.output) throw new Error(`工具 ${sample.tool} 未生成输出`);
  results[sample.tool] = result;
  console.log(`已生成 ${sample.tool}：${result.durationMs} ms`);
}

await mkdir(new URL('../public/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/showcase.json', import.meta.url), JSON.stringify({
  generatedAt: new Date().toISOString(),
  mode: 'build-snapshot',
  results,
}, null, 2));
console.log(`Oxc 示例快照生成完毕：${root}public/showcase.json`);

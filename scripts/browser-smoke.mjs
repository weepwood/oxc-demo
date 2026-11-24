import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const url = 'http://127.0.0.1:4173/oxc-demo/';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
  env: { ...process.env, GITHUB_PAGES: 'true' },
  stdio: 'inherit',
});
let browser;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { ready = (await fetch(url)).ok; } catch { /* wait for preview */ }
    if (ready) break;
    await delay(100);
  }
  assert.ok(ready, '生产站点未启动');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url + '#/parser/parser-types');
  await page.locator('.cm-content').fill('const browserMarker: number = 42;');
  await page.getByRole('button', { name: '运行', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.workbench-status')?.textContent?.includes('浏览器 WASM'), undefined, { timeout: 20_000 });
  await page.getByRole('tab', { name: '代码输出' }).click();
  assert.match(await page.locator('.inspector-body').innerText(), /browserMarker/);
  console.log('浏览器真实 WASM Parser 执行成功');
} finally {
  await browser?.close();
  server.kill();
}

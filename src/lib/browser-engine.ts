import type { RunResult } from './inspect';

export function runBrowserParser(filename: string, code: string, signal: AbortSignal): Promise<RunResult> {
  if (signal.aborted) return Promise.reject(new Error('已取消'));
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/parser.worker.ts', import.meta.url), { type: 'module' });
    const cleanup = () => { worker.terminate(); signal.removeEventListener('abort', cancel); };
    const cancel = () => { cleanup(); reject(new Error('已取消')); };
    signal.addEventListener('abort', cancel, { once: true });
    worker.onmessage = (event: MessageEvent<{ result?: RunResult; error?: string }>) => {
      cleanup();
      if (event.data.result) resolve(event.data.result);
      else reject(new Error(event.data.error ?? 'WASM 执行失败'));
    };
    worker.onerror = (event) => { cleanup(); reject(new Error(event.message || '无法加载 WASM 执行器')); };
    worker.postMessage({ filename, code });
  });
}

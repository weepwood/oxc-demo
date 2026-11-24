import * as wasm from '@oxc-parser/wasm';

interface ParserApi {
  default: () => Promise<unknown>;
  parseSync: (code: string, options: { sourceFilename: string; sourceType: 'module' }) => { program: unknown; errors?: unknown };
}

const api = wasm as unknown as ParserApi;

globalThis.addEventListener('message', (event: MessageEvent<{ filename: string; code: string }>) => {
  void (async () => {
    try {
      const { filename, code } = event.data;
      if (typeof code !== 'string' || code.length > 16_000) throw new Error('代码必须是 16000 字符以内的文本');
      await api.default();
      const start = performance.now();
      const parsed = api.parseSync(code, { sourceFilename: filename, sourceType: 'module' });
      const program: unknown = typeof parsed.program === 'string' ? JSON.parse(parsed.program) : parsed.program;
      const rawErrors: unknown = typeof parsed.errors === 'string' ? JSON.parse(parsed.errors) : parsed.errors;
      const errors = Array.isArray(rawErrors) ? rawErrors : [];
      if (!program || typeof program !== 'object' || !('type' in program)) throw new Error('WASM 未返回有效 AST');
      const output = JSON.stringify({ ...program, errors }, null, 2);
      if (output.length > 4_000_000) throw new Error('结构化结果超过安全限制，请缩短输入代码');
      globalThis.postMessage({ result: {
        output,
        durationMs: Math.round((performance.now() - start) * 100) / 100,
        inputBytes: new TextEncoder().encode(code).length,
        outputBytes: new TextEncoder().encode(output).length,
        diagnostics: errors.map((error: unknown) => typeof error === 'string' ? error : JSON.stringify(error)),
        success: errors.length === 0,
        truncated: false,
      } });
    } catch (error) {
      globalThis.postMessage({ error: error instanceof Error ? error.message : String(error) });
    }
  })();
});

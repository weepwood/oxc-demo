import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TOOLS = new Set(['lint', 'format', 'parser', 'transform', 'minify', 'resolver']);
const MAX_INPUT_LENGTH = 16_000;
const MAX_OUTPUT_LENGTH = 32_000;
const MAX_STRUCTURED_OUTPUT = 4_000_000;

export function validateInput(input) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError('请求必须是对象');
  }
  const { tool, filename, code, specifier } = input;
  if (!TOOLS.has(tool)) throw new TypeError('未知的工具类型');
  if (typeof code !== 'string' || code.length > MAX_INPUT_LENGTH) {
    throw new TypeError('代码必须是 16000 字符以内的文本');
  }
  if (
    typeof filename !== 'string' ||
    filename.length > 64 ||
    basename(filename) !== filename ||
    !/^[a-zA-Z0-9_-]+\.(?:ts|tsx|js|jsx)$/.test(filename)
  ) {
    throw new TypeError('文件名仅支持安全的 .js/.jsx/.ts/.tsx 格式');
  }
  if (
    specifier !== undefined &&
    (typeof specifier !== 'string' || specifier.length > 100 || !/^[a-zA-Z0-9@_./-]+$/.test(specifier))
  ) {
    throw new TypeError('模块名格式不正确');
  }
  return { tool, filename, code, specifier: specifier ?? 'react' };
}

function messages(items) {
  return (items ?? []).map((entry) => {
    if (typeof entry === 'string') return entry;
    return entry?.message ?? JSON.stringify(entry);
  });
}

async function lintCode(filename, code) {
  const temporaryDirectory = await mkdtemp(join(ROOT, '.oxc-run-'));
  const temporaryFile = join(temporaryDirectory, filename);
  try {
    await writeFile(temporaryFile, code, 'utf8');
    const command = join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'oxlint.cmd' : 'oxlint');
    const args = ['--no-ignore', '--config', join(ROOT, '.oxlintrc.json'), '-f', 'json', '-D', 'no-unused-vars', temporaryFile];

    const { stdout, stderr, exitCode } = await new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: ROOT,
        windowsHide: true,
        shell: process.platform === 'win32',
      });
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let overflow = false;
      const timeout = setTimeout(() => { timedOut = true; child.kill(); }, 7_000);
      child.stdout.on('data', (chunk) => {
        if (stdout.length + chunk.length > MAX_STRUCTURED_OUTPUT) { overflow = true; child.kill(); return; }
        stdout += String(chunk);
      });
      child.stderr.on('data', (chunk) => {
        if (stderr.length + chunk.length > MAX_STRUCTURED_OUTPUT) { overflow = true; child.kill(); return; }
        stderr += String(chunk);
      });
      child.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once('close', (exitCode) => {
        clearTimeout(timeout);
        if (timedOut || overflow) { reject(new Error(timedOut ? 'Oxlint 执行超时' : 'Oxlint 输出超过安全限制')); return; }
        resolve({ stdout, stderr, exitCode });
      });
    });

    return {
      output: stdout.trim() || stderr.trim() || '没有发现问题。',
      diagnostics: stderr ? [stderr.trim()] : [],
      success: exitCode === 0,
    };
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

export async function runTool(rawInput) {
  const { tool, filename, code, specifier } = validateInput(rawInput);
  const start = performance.now();
  let output = '';
  let diagnostics = [];
  let success = true;

  switch (tool) {
    case 'lint': {
      const result = await lintCode(filename, code);
      output = result.output;
      diagnostics = result.diagnostics;
      success = result.success;
      break;
    }
    case 'format': {
      const { format } = await import('oxfmt');
      const result = await format(filename, code, { semi: true, singleQuote: true });
      output = result.code;
      break;
    }
    case 'parser': {
      const { parseSync } = await import('oxc-parser');
      const result = parseSync(filename, code, { sourceType: 'module' });
      diagnostics = messages(result.errors);
      success = diagnostics.length === 0;
      output = JSON.stringify(
        { type: result.program.type, body: result.program.body, errors: result.errors },
        null,
        2,
      );
      break;
    }
    case 'transform': {
      const { transform } = await import('oxc-transform');
      const result = await transform(filename, code, { sourceType: 'module', sourcemap: false });
      diagnostics = messages(result.errors);
      success = diagnostics.length === 0;
      output = result.code;
      break;
    }
    case 'minify': {
      const { minifySync } = await import('oxc-minify');
      const result = minifySync(filename, code, {
        compress: { target: 'esnext' },
        mangle: { toplevel: false },
        codegen: { removeWhitespace: true },
      });
      diagnostics = messages(result.errors);
      success = diagnostics.length === 0;
      output = result.code;
      break;
    }
    case 'resolver': {
      const { ResolverFactory } = await import('oxc-resolver');
      const resolver = new ResolverFactory();
      const result = resolver.sync(ROOT, specifier);
      output = JSON.stringify({ specifier, resolution: result }, null, 2);
      success = Boolean(result?.path);
      break;
    }
  }

  const structured = ['lint', 'parser', 'resolver'].includes(tool);
  const limit = structured ? MAX_STRUCTURED_OUTPUT : MAX_OUTPUT_LENGTH;
  if (structured && output.length > limit) throw new Error('结构化结果超过安全限制，请缩短输入代码');
  const truncated = output.length > limit;
  const normalizedOutput = truncated ? output.slice(0, limit) : output;

  return {
    output: normalizedOutput,
    truncated,
    durationMs: Math.round((performance.now() - start) * 100) / 100,
    inputBytes: Buffer.byteLength(code, 'utf8'),
    outputBytes: Buffer.byteLength(output, 'utf8'),
    diagnostics,
    success,
  };
}

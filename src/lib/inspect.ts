export interface RunResult {
  output: string;
  durationMs: number;
  inputBytes: number;
  outputBytes: number;
  diagnostics: string[];
  success: boolean;
}

export interface Scenario {
  id: string;
  tool: 'lint' | 'format' | 'parser' | 'transform' | 'minify' | 'resolver';
  title: string;
  feature: string;
  filename: string;
  code: string;
  description: string;
  tags: string[];
  lesson: string;
  specifier?: string;
}

export interface Showcase {
  generatedAt: string;
  mode: 'build-snapshot';
  scenarioCount: number;
  results: Record<string, RunResult>;
}

export interface LintDiagnostic {
  message: string;
  ruleId: string;
  line: number;
  column: number;
  severity: number;
}

export interface DiffRow {
  kind: 'same' | 'removed' | 'added';
  value: string;
  oldLine?: number;
  newLine?: number;
}

export function formatBytes(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

export function reductionPercent(inputBytes: number, outputBytes: number): number {
  if (inputBytes <= 0) return 0;
  return Math.round((1 - outputBytes / inputBytes) * 100);
}

export function parseJson(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function getDiagnostics(result: RunResult): LintDiagnostic[] {
  const json = parseJson(result.output);
  if (!Array.isArray(json)) return [];
  const messages: LintDiagnostic[] = [];
  for (const file of json) {
    if (!file || typeof file !== 'object' || !('messages' in file)) continue;
    const items = (file as { messages?: unknown }).messages;
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const diagnostic = item as Record<string, unknown>;
      messages.push({
        message: typeof diagnostic.message === 'string' ? diagnostic.message : '未知诊断',
        ruleId: typeof diagnostic.ruleId === 'string' ? diagnostic.ruleId : 'unknown',
        line: typeof diagnostic.line === 'number' ? diagnostic.line : 0,
        column: typeof diagnostic.column === 'number' ? diagnostic.column : 0,
        severity: typeof diagnostic.severity === 'number' ? diagnostic.severity : 1,
      });
    }
  }
  return messages;
}

export function getAstNodeCounts(root: unknown): { type: string; count: number }[] {
  const counts = new Map<string, number>();
  const seen = new WeakSet<object>();
  function visit(node: unknown, depth: number) {
    if (depth > 70 || !node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1);
      return;
    }
    const record = node as Record<string, unknown>;
    if (typeof record.type === 'string') {
      counts.set(record.type, (counts.get(record.type) ?? 0) + 1);
    }
    for (const value of Object.values(record)) visit(value, depth + 1);
  }
  visit(root, 0);
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
}

export function compareLines(input: string, output: string): DiffRow[] {
  const before = input.replace(/\n$/, '').split('\n').slice(0, 160);
  const after = output.replace(/\n$/, '').split('\n').slice(0, 160);
  const rows = before.length;
  const cols = after.length;
  const lengths: number[][] = Array.from({ length: rows + 1 }, () => Array<number>(cols + 1).fill(0));
  for (let i = rows - 1; i >= 0; i--) {
    for (let j = cols - 1; j >= 0; j--) {
      lengths[i][j] = before[i] === after[j]
        ? lengths[i + 1][j + 1] + 1
        : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }
  const result: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < rows || j < cols) {
    if (i < rows && j < cols && before[i] === after[j]) {
      result.push({ kind: 'same', value: before[i], oldLine: i + 1, newLine: j + 1 });
      i += 1;
      j += 1;
    } else if (i < rows && (j === cols || lengths[i + 1][j] >= lengths[i][j + 1])) {
      result.push({ kind: 'removed', value: before[i], oldLine: i + 1 });
      i += 1;
    } else {
      result.push({ kind: 'added', value: after[j], newLine: j + 1 });
      j += 1;
    }
  }
  return result;
}

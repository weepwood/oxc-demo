import {
  AlertCircle,
  ArrowRight,
  Braces,
  CheckCircle2,
  ChevronRight,
  Code2,
  GitCompare,
  ListTree,
  PackageSearch,
  Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  compareLines,
  formatBytes,
  getAstNodeCounts,
  getDiagnostics,
  parseJson,
  reductionPercent,
  type RunResult,
} from '../lib/inspect';
import type { ToolId } from '../data/catalog';

export type InspectorTab = 'output' | 'diff' | 'ast' | 'diagnostics' | 'resolution';

const labels: Record<InspectorTab, string> = {
  output: '代码输出',
  diff: '变更对比',
  ast: 'AST 探索',
  diagnostics: '问题诊断',
  resolution: '解析详情',
};

function getTabs(tool: ToolId): InspectorTab[] {
  switch (tool) {
    case 'lint': return ['diagnostics', 'output'];
    case 'parser': return ['ast', 'output'];
    case 'resolver': return ['resolution', 'output'];
    default: return ['diff', 'output'];
  }
}

function CodeLines({ code }: { code: string }) {
  const lines = code.split('\n');
  return (
    <div className="code-lines" role="region" aria-label="代码文本" tabIndex={0}>
      {lines.map((line, index) => (
        <div className="code-line" key={index}>
          <span className="line-number" aria-hidden="true">{index + 1}</span>
          <span className="line-content">{line || ' '}</span>
        </div>
      ))}
    </div>
  );
}

function DiffPanel({ before, after }: { before: string; after: string }) {
  const rows = useMemo(() => compareLines(before, after), [before, after]);
  const additions = rows.filter((row) => row.kind === 'added').length;
  const removals = rows.filter((row) => row.kind === 'removed').length;
  return (
    <div className="diff-panel">
      <div className="diff-summary">
        <span><GitCompare size={15} /> 逐行比较</span>
        <span className="diff-added">+{additions}</span>
        <span className="diff-removed">−{removals}</span>
      </div>
      {additions === 0 && removals === 0 ? (
        <div className="inspector-empty"><CheckCircle2 size={24} /><strong>没有可见变化</strong><p>当前配置下，源代码无需调整。</p></div>
      ) : (
        <div className="diff-lines" role="region" aria-label="代码差异" tabIndex={0}>
          {rows.map((row, index) => (
            <div className={`diff-row ${row.kind}`} key={index}>
              <span className="diff-number">{row.oldLine ?? ''}</span>
              <span className="diff-number">{row.newLine ?? ''}</span>
              <span className="diff-marker">{row.kind === 'added' ? '+' : row.kind === 'removed' ? '−' : ' '}</span>
              <code>{row.value || ' '}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AstNode({ name, value, level = 0 }: { name: string; value: unknown; level?: number }) {
  if (value === null || typeof value !== 'object') {
    return <div className="ast-leaf"><span className="ast-key">{name}</span><span className="ast-separator">:</span><span className="ast-value">{JSON.stringify(value)}</span></div>;
  }
  if (level >= 12) return <div className="ast-leaf"><span className="ast-key">{name}</span><span className="ast-value">…</span></div>;

  const list = Array.isArray(value);
  const entries: [string, unknown][] = list
    ? value.map((item: unknown, index: number) => [String(index), item] as [string, unknown])
    : Object.entries(value);
  const type = !list && 'type' in value && typeof value.type === 'string' ? value.type : '';
  const preview = type || (list ? `${entries.length} 项` : `${entries.length} 个字段`);
  return (
    <details className="ast-node" open={level === 0}>
      <summary><ChevronRight size={13} /><span className="ast-key">{name}</span><span className="ast-preview">{preview}</span></summary>
      <div className="ast-children">
        {entries.slice(0, 80).map(([key, item]) => <AstNode key={key} name={key} value={item} level={level + 1} />)}
        {entries.length > 80 && <div className="ast-leaf">还有 {entries.length - 80} 个字段未展示</div>}
      </div>
    </details>
  );
}

function AstPanel({ result }: { result: RunResult }) {
  const ast = useMemo(() => parseJson(result.output), [result.output]);
  const [query, setQuery] = useState('');
  const histogram = useMemo(() => getAstNodeCounts(ast), [ast]);
  const filtered = histogram.filter((item) => item.type.toLowerCase().includes(query.toLowerCase()));
  const peak = Math.max(1, ...histogram.map((item) => item.count));
  const count = histogram.reduce((sum, item) => sum + item.count, 0);
  if (!ast) {
    return <div className="inspector-empty"><AlertCircle size={22} /><strong>结构化结果不可用</strong><p>查看「代码输出」获取原始内容，过长的 AST 可能已被截断。</p></div>;
  }
  return (
    <div className="ast-layout">
      <div className="ast-sidebar">
        <div className="ast-summary"><strong>{count}</strong><span>语法节点</span><span>{histogram.length} 种类型</span></div>
        <div className="ast-search"><Search size={14} /><input aria-label="搜索 AST 节点类型" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="筛选节点类型" /></div>
        <div className="ast-histogram">
          {filtered.map((item) => (
            <div className="ast-histogram-row" key={item.type} title={item.type}>
              <div className="ast-histogram-label"><span>{item.type}</span><b>{item.count}</b></div>
              <div className="ast-histogram-track"><span style={{ width: `${Math.max(3, item.count / peak * 100)}%` }} /></div>
            </div>
          ))}
          {filtered.length === 0 && <p className="muted">没有匹配的节点类型</p>}
        </div>
      </div>
      <div className="ast-tree" role="region" aria-label="可展开 AST 树" tabIndex={0}>
        <div className="ast-tree-header"><ListTree size={15} /> 点击节点展开结构</div>
        <AstNode name="Program" value={ast} />
      </div>
    </div>
  );
}

function DiagnosticsPanel({ result, onJump }: { result: RunResult; onJump: (line: number) => void }) {
  const diagnostics = useMemo(() => getDiagnostics(result), [result]);
  if (diagnostics.length === 0) {
    return (
      <div className="inspector-empty">{result.success ? <CheckCircle2 size={25} /> : <AlertCircle size={25} />}<strong>{result.success ? '没有发现问题' : '诊断结果无法解析'}</strong>
        <p>{result.success ? '当前代码通过了已启用的检查规则。' : '未能解析结构化诊断，请在「代码输出」中查看详细信息。'}</p>
      </div>
    );
  }
  const errors = diagnostics.filter((item) => item.severity === 2).length;
  return (
    <div className="diagnostic-panel">
      <div className="diagnostic-summary"><AlertCircle size={16} /> 检测到 {diagnostics.length} 项问题 <span>{errors} 错误 · {diagnostics.length - errors} 警告</span></div>
      {diagnostics.map((item, index) => (
        <button key={index} type="button" className="diagnostic-row" disabled={item.line <= 0} onClick={() => onJump(item.line)} title={item.line > 0 ? '定位到源代码' : '无源码位置'}>
          <span className={`diagnostic-severity ${item.severity === 2 ? 'error' : 'warning'}`}><AlertCircle size={16} /></span>
          <span className="diagnostic-text"><strong>{item.message}</strong><span>{item.ruleId}</span></span>
          <span className="diagnostic-location">{item.line > 0 ? `第 ${item.line} 行` : '无位置'} <ArrowRight size={13} /></span>
        </button>
      ))}
    </div>
  );
}

function ResolutionPanel({ result, specifier }: { result: RunResult; specifier: string }) {
  const data = parseJson(result.output);
  if (!data || typeof data !== 'object' || !('resolution' in data)) {
    return <div className="inspector-empty"><AlertCircle size={22} /><strong>无法显示解析详情</strong><p>请查看原始输出。</p></div>;
  }
  const resolution = (data as { resolution?: unknown }).resolution;
  const resolvedPath = resolution && typeof resolution === 'object' && 'path' in resolution && typeof resolution.path === 'string'
    ? resolution.path
    : '';
  return (
    <div className="resolution-panel">
      <div className="resolution-flow">
        <div><span>模块标识符</span><strong><PackageSearch size={17} />{specifier}</strong></div>
        <ArrowRight size={19} className="resolution-arrow" />
        <div><span>解析状态</span><strong className={result.success ? 'resolved' : 'unresolved'}>{result.success ? '已找到入口' : '未解析'}</strong></div>
      </div>
      <div className="resolution-path"><span>解析到的文件路径</span><code>{resolvedPath || '无有效路径'}</code></div>
      <p className="resolution-note">这是执行环境中的真实路径。在 GitHub Pages 上，它来自构建机器，不代表访客本地文件系统。</p>
    </div>
  );
}

export function Inspector({
  tool,
  source,
  result,
  loading,
  error,
  specifier,
  onJump,
}: {
  tool: ToolId;
  source: string;
  result: RunResult | null;
  loading: boolean;
  error: string;
  specifier: string;
  onJump: (line: number) => void;
}) {
  const tabs = getTabs(tool);
  const [tab, setTab] = useState<InspectorTab>(tabs[0]);
  return (
    <section className="inspector" aria-label="运行结果">
      <div className="inspector-heading">
        <div className="inspector-tabs" role="tablist" aria-label="查看结果方式">
          {tabs.map((item) => (
            <button key={item} type="button" role="tab" aria-selected={tab === item} className={`inspector-tab ${tab === item ? 'active' : ''}`} onClick={() => setTab(item)}>
              {item === 'diff' ? <GitCompare size={15} /> : item === 'ast' ? <Braces size={15} /> : item === 'resolution' ? <PackageSearch size={15} /> : <Code2 size={15} />}
              {labels[item]}
            </button>
          ))}
        </div>
        {result && <span className="inspector-meta">{formatBytes(result.outputBytes)}</span>}
      </div>
      <div className="inspector-body">
        {error ? (
          <div className="inspector-empty"><AlertCircle size={25} /><strong>运行失败</strong><p>{error}</p></div>
        ) : !result ? (
          <div className="inspector-empty">{loading ? <span className="loading-spinner" /> : <Code2 size={26} />}<strong>{loading ? '正在处理…' : '尚无结果'}</strong><p>{loading ? '工具正在分析代码' : '选择一个案例，或在本地编辑代码后点击运行。'}</p></div>
        ) : tab === 'diff' ? (
          result.truncated ? <div className="inspector-empty"><AlertCircle size={22} /><strong>输出已截断</strong><p>无法进行完整差异比较，请缩短输入代码。</p></div> : <DiffPanel before={source} after={result.output} />
        ) : tab === 'ast' ? (
          <AstPanel result={result} />
        ) : tab === 'diagnostics' ? (
          <DiagnosticsPanel result={result} onJump={onJump} />
        ) : tab === 'resolution' ? (
          <ResolutionPanel result={result} specifier={specifier} />
        ) : (
          <CodeLines code={result.output + (result.truncated ? '\n\n…结果已截断' : '')} />
        )}
      </div>
    </section>
  );
}

export function ResultMetrics({ tool, result, isLive }: { tool: ToolId; result: RunResult | null; isLive: boolean }) {
  if (!result) return null;
  const reduction = reductionPercent(result.inputBytes, result.outputBytes);
  return (
    <div className="metric-grid">
      <div><span>处理耗时</span><strong>{result.durationMs.toFixed(2)} <small>ms</small></strong></div>
      <div><span>输入大小</span><strong>{formatBytes(result.inputBytes)}</strong></div>
      <div><span>输出大小</span><strong>{formatBytes(result.outputBytes)}</strong></div>
      <div><span>{tool === 'minify' ? '体积变化' : '执行状态'}</span><strong>{tool === 'minify' ? `${reduction > 0 ? '−' : '+'}${Math.abs(reduction)}%` : result.success ? '已完成' : '有诊断'}</strong></div>
      {!isLive && <p>以上数据由构建时真实运行产生，不代表当前浏览器执行性能。</p>}
    </div>
  );
}

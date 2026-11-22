import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Braces,
  Check,
  ChevronDown,
  CircleAlert,
  Clipboard,
  Code2,
  Command,
  ExternalLink,
  FileCode2,
  FileJson2,
  FileSearch,
  Gauge,
  Github,
  Layers3,
  LoaderCircle,
  Menu,
  Play,
  RotateCcw,
  ScanSearch,
  Sparkles,
  Terminal,
  WandSparkles,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import samplesJson from './data/samples.json';

type ToolId = 'lint' | 'format' | 'parser' | 'transform' | 'minify' | 'resolver';

interface Sample {
  tool: ToolId;
  name: string;
  subtitle: string;
  filename: string;
  specifier: string;
  code: string;
  description: string;
  command: string;
  docs: string;
}

interface RunResult {
  output: string;
  durationMs: number;
  inputBytes: number;
  outputBytes: number;
  diagnostics: string[];
  success: boolean;
}

interface Showcase {
  generatedAt: string;
  mode: 'build-snapshot';
  results: Partial<Record<ToolId, RunResult>>;
}

const samples = samplesJson as Sample[];
const toolIcons: Record<ToolId, LucideIcon> = {
  lint: ScanSearch,
  format: WandSparkles,
  parser: Braces,
  transform: Layers3,
  minify: Gauge,
  resolver: FileSearch,
};
const liveMode = import.meta.env.DEV;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function getExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.') + 1).toUpperCase();
}

function toolLabel(tool: ToolId): string {
  return tool === 'parser' ? 'AST JSON' : tool === 'resolver' ? 'RESOLVE JSON' : tool === 'lint' ? 'DIAGNOSTICS' : 'OUTPUT';
}

function IconButton({
  icon: Icon,
  title,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button className="icon-button" type="button" onClick={onClick} disabled={disabled} title={title} aria-label={title}>
      <Icon size={16} strokeWidth={1.8} />
    </button>
  );
}

function ResultBanner({
  result,
  running,
  isLive,
}: {
  result: RunResult | null;
  running: boolean;
  isLive: boolean;
}) {
  return (
    <div className="result-banner">
      <span className={`result-indicator ${running ? 'working' : result?.success === false ? 'issue' : result ? 'ready' : ''}`} />
      <span>
        {running
          ? '正在执行工具'
          : !result
            ? isLive
              ? '等待运行'
              : '正在加载构建结果'
            : result.success
              ? '运行完成'
              : '检测到诊断或错误'}
      </span>
      <span className="result-mode">{isLive ? 'LOCAL / NODE.JS' : 'BUILD SNAPSHOT'}</span>
    </div>
  );
}

export default function App() {
  const [selected, setSelected] = useState<ToolId>('lint');
  const [source, setSource] = useState(samples[0].code);
  const [specifier, setSpecifier] = useState(samples[0].specifier);
  const [showcase, setShowcase] = useState<Showcase | null>(null);
  const [snapshotError, setSnapshotError] = useState('');
  const [liveResult, setLiveResult] = useState<RunResult | null>(null);
  const [runError, setRunError] = useState('');
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const requestCounter = useRef(0);
  const sample = useMemo(() => samples.find((entry) => entry.tool === selected)!, [selected]);
  const result = liveMode ? liveResult : (showcase?.results[selected] ?? null);
  const ToolIcon = toolIcons[selected];
  const output = result?.output ?? '';

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}showcase.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('无法读取构建快照');
        return response.json() as Promise<Showcase>;
      })
      .then((data) => setShowcase(data))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setSnapshotError(error instanceof Error ? error.message : '快照不可用');
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 2500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const chooseTool = (tool: ToolId) => {
    const next = samples.find((entry) => entry.tool === tool)!;
    requestCounter.current += 1;
    setSelected(tool);
    setSource(next.code);
    setSpecifier(next.specifier);
    setLiveResult(null);
    setRunError('');
    setRunning(false);
    setMobileMenu(false);
  };

  const reset = () => {
    requestCounter.current += 1;
    setSource(sample.code);
    setSpecifier(sample.specifier);
    setLiveResult(null);
    setRunError('');
    setRunning(false);
  };

  const run = useCallback(async () => {
    if (!liveMode || running) return;
    const requestId = ++requestCounter.current;
    setRunning(true);
    setRunError('');
    setLiveResult(null);
    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: selected, filename: sample.filename, code: source, specifier }),
      });
      const data: RunResult | { error: string } = await response.json();
      if (!response.ok) throw new Error('error' in data ? data.error : '执行失败');
      if (requestCounter.current === requestId) setLiveResult(data as RunResult);
    } catch (error) {
      if (requestCounter.current === requestId) {
        setRunError(error instanceof Error ? error.message : '执行失败');
      }
    } finally {
      if (requestCounter.current === requestId) setRunning(false);
    }
  }, [running, sample.filename, selected, source, specifier]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        void run();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [run]);

  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(message);
    } catch {
      setToast('复制失败，请检查浏览器权限');
    }
  };

  const download = () => {
    if (!result) return;
    const filename = selected === 'parser' || selected === 'resolver' || selected === 'lint'
      ? `${selected}-result.json`
      : `${sample.filename.replace(/\.[^.]+$/, '')}.output.js`;
    const blob = new Blob([result.output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const saved = selected === 'minify' && result
    ? Math.max(0, Math.round((1 - result.outputBytes / Math.max(result.inputBytes, 1)) * 100))
    : null;

  return (
    <div className="app-shell" data-tool={selected}>
      <header className="topbar">
        <div className="brand" aria-label="Oxc Demo 首页">
          <span className="brand-symbol"><Code2 size={20} strokeWidth={2.2} /></span>
          <span className="brand-name">oxc<span className="brand-suffix">/ demo</span></span>
        </div>
        <div className="topbar-center"><span className="topbar-divider" />JavaScript Toolchain Workbench</div>
        <div className="top-actions">
          <span className="top-version">VITE 8 · REACT 19</span>
          <a className="header-link" href="https://github.com/weepwood/oxc-demo" target="_blank" rel="noopener noreferrer"><Github size={16} /> <span>GitHub</span> <ExternalLink size={12} /></a>
          <button className="mobile-menu-button" onClick={() => setMobileMenu((value) => !value)} aria-label="切换工具导航" aria-expanded={mobileMenu} type="button">{mobileMenu ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </header>

      <div className="layout">
        <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
          <div className="sidebar-section-title">WORKSPACE <ChevronDown size={12} /></div>
          <div className="sidebar-home"><Activity size={17} /> 工具链概览 <span className="sidebar-count">06</span></div>
          <div className="sidebar-section-title tools-title">TOOLS <span className="sidebar-count">6 MODULES</span></div>
          <nav className="tool-nav" aria-label="Oxc 工具导航">
            {samples.map((entry, index) => {
              const Icon = toolIcons[entry.tool];
              return (
                <button
                  key={entry.tool}
                  className={`nav-item ${selected === entry.tool ? 'active' : ''}`}
                  onClick={() => chooseTool(entry.tool)}
                  type="button"
                  aria-current={selected === entry.tool ? 'page' : undefined}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span className="nav-item-copy"><strong>{entry.name}</strong><small>{entry.subtitle}</small></span>
                  <span className="nav-item-index">{String(index + 1).padStart(2, '0')}</span>
                </button>
              );
            })}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-note"><span className="note-dot" /> {liveMode ? 'Local workspace' : 'Static showcase'}</div>
            <p>{liveMode ? '所有处理均在本机 Node.js 进程完成，不会上传代码。' : '展示内容由 GitHub Actions 构建时调用真实 Oxc 工具生成。'}</p>
            <a href="https://oxc.rs/" target="_blank" rel="noopener noreferrer">Oxc 官方网站 <ArrowRight size={14} /></a>
          </div>
        </aside>

        <main className="main-content">
          <div className="breadcrumbs"><span>Workbench</span><ArrowRight size={13} /><span>Modules</span><ArrowRight size={13} /><strong>{sample.name}</strong></div>

          <section className="intro-section">
            <div className="intro-heading">
              <div className="module-icon"><ToolIcon size={26} strokeWidth={1.65} /></div>
              <div>
                <div className="eyebrow">MODULE {String(samples.findIndex((entry) => entry.tool === selected) + 1).padStart(2, '0')} / 06</div>
                <h1>{sample.name}<span className="subheading"> / {sample.subtitle}</span></h1>
              </div>
            </div>
            <p>{sample.description}</p>
            <div className="intro-links">
              <a href={sample.docs} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> 官方文档</a>
              <span className="intro-link-separator">·</span>
              <span><Terminal size={14} /> {sample.command}</span>
            </div>
          </section>

          <section className="workspace">
            <div className="workspace-heading">
              <div className="workspace-title"><Code2 size={18} /> Playground <span className="workspace-muted">/ {sample.filename}</span></div>
              <div className="workspace-actions">
                <span className={`mode-chip ${liveMode ? 'live' : ''}`}><span className="mode-dot" />{liveMode ? '实时运行' : '构建快照'}</span>
                <IconButton icon={RotateCcw} title="重置示例" onClick={reset} disabled={!liveMode} />
                <button className="run-button" type="button" onClick={() => void run()} disabled={!liveMode || running}>
                  {running ? <LoaderCircle size={16} className="spinner" /> : <Play size={15} fill="currentColor" />}
                  {running ? '运行中' : liveMode ? '运行代码' : '静态预览'}
                  {liveMode && <kbd><Command size={11} /> ↵</kbd>}
                </button>
              </div>
            </div>

            {!liveMode && (
              <div className="notice"><CircleAlert size={16} /><span>当前为 GitHub Pages 静态模式。下方展示构建阶段 Oxc 生成的真实输出；如需编辑并执行代码，请克隆仓库运行 <code>npm run dev</code>。</span></div>
            )}

            <div className="editor-grid">
              <section className="editor-panel" aria-label="输入代码">
                <div className="panel-top"><div className="panel-tab"><FileCode2 size={15} /><span>{sample.filename}</span><span className="panel-language">{getExtension(sample.filename)}</span></div><IconButton icon={Clipboard} title="复制输入代码" onClick={() => void copy(source, '源码已复制')} /></div>
                {selected === 'resolver' && <div className="specifier-row"><label htmlFor="specifier">解析模块</label><input id="specifier" value={specifier} onChange={(event) => setSpecifier(event.target.value)} readOnly={!liveMode} /></div>}
                <textarea
                  className="source-input"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  readOnly={!liveMode}
                  spellCheck={false}
                  aria-label="输入源代码"
                  wrap="off"
                />
                <div className="panel-bottom"><span><span className="status-dot" /> INPUT</span><span>{formatBytes(new TextEncoder().encode(source).length)} <span className="panel-counter-separator">·</span> {source.split('\n').length} lines</span></div>
              </section>

              <section className="editor-panel output-panel" aria-label="运行结果">
                <div className="panel-top"><div className="panel-tab"><FileJson2 size={15} /><span>{toolLabel(selected)}</span><span className="panel-language">READ ONLY</span></div><div className="output-actions"><IconButton icon={Clipboard} title="复制输出" onClick={() => void copy(output, '结果已复制')} disabled={!result} /><IconButton icon={ArrowDownToLine} title="下载输出" onClick={download} disabled={!result} /></div></div>
                <div className="output-body" tabIndex={0}>
                  {runError ? <div className="empty-output error"><CircleAlert size={20} /><strong>运行失败</strong><p>{runError}</p></div> : result ? <pre><code>{result.output}</code></pre> : <div className="empty-output"><Braces size={24} /><strong>{snapshotError || (liveMode ? '准备就绪' : '正在加载真实输出')}</strong><p>{liveMode ? '修改左侧代码，然后点击「运行代码」' : '结果会随构建生成，无需浏览器执行 Node 模块。'}</p></div>}
                </div>
                <div className="panel-bottom"><span><span className="status-dot" /> {toolLabel(selected)}</span><span>{result ? formatBytes(result.outputBytes) : '—'}</span></div>
              </section>
            </div>

            <div className="result-footer">
              <ResultBanner result={result} running={running} isLive={liveMode} />
              <div className="metrics">
                <span><span className="metric-label">DURATION</span><strong>{result ? `${result.durationMs.toFixed(2)} ms` : '—'}</strong></span>
                <span><span className="metric-label">OUTPUT</span><strong>{result ? formatBytes(result.outputBytes) : '—'}</strong></span>
                {saved !== null && <span><span className="metric-label">REDUCTION</span><strong>{saved}%</strong></span>}
              </div>
            </div>
          </section>

          <div className="lower-grid">
            <section className="info-card">
              <div className="info-card-title"><Sparkles size={17} /> 运行说明</div>
              <p>{selected === 'lint' ? 'Oxlint 会显示实际诊断；存在规则问题时，退出状态可能为非零，这不是执行器故障。' : selected === 'resolver' ? 'Resolver 查询 Node 模块解析结果，取决于实际安装的依赖与操作系统。' : selected === 'parser' ? 'Parser 输出语法树节点；输出过长时会截断显示，但原始 AST 仍由 Oxc 生成。' : '输出结果来自对应 Oxc 工具的真实 API；性能数字仅代表本次样例运行，不作为基准测试。'}</p>
              <div className="info-card-command"><Terminal size={15} /><code>{sample.command}</code><button onClick={() => void copy(sample.command, '命令已复制')} type="button" aria-label="复制命令"><Clipboard size={14} /></button></div>
            </section>
            <section className="info-card">
              <div className="info-card-title"><Check size={17} /> 工程集成</div>
              <p>项目同时集成了 Oxlint、Oxfmt、TypeScript 类型检查、Node 测试和 GitHub Actions。Vite 8 使用 Oxc 进行现代前端代码转换。</p>
              <div className="integration-row"><span><Check size={13} /> Lint</span><span><Check size={13} /> Format</span><span><Check size={13} /> CI</span><span><Check size={13} /> Pages</span></div>
            </section>
          </div>
          <footer className="page-footer"><span><span className="footer-mark">O</span> Built with Oxc ecosystem</span><span>Open source · <a href="https://github.com/oxc-project/oxc" target="_blank" rel="noopener noreferrer">oxc-project <ExternalLink size={11} /></a></span></footer>
        </main>
      </div>
      {toast && <div role="status" className="toast"><Check size={15} />{toast}</div>}
    </div>
  );
}

import {
  ArrowDownToLine,
  BookOpen,
  Braces,
  Check,
  CircleAlert,
  Clipboard,
  Code2,
  ExternalLink,
  FileCode2,
  FileJson2,
  FileSearch,
  Gauge,
  Github,
  Layers3,
  LoaderCircle,
  Menu,
  Monitor,
  Moon,
  Play,
  RotateCcw,
  ScanSearch,
  Sun,
  Terminal,
  WandSparkles,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import samplesJson from './data/samples.json';
import { useThemeMode, type ThemeMode } from './theme';

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
const themes: { value: ThemeMode; label: string; icon: LucideIcon }[] = [
  { value: 'system', label: '跟随系统', icon: Monitor },
  { value: 'light', label: '浅色主题', icon: Sun },
  { value: 'dark', label: '深色主题', icon: Moon },
];
const liveMode = import.meta.env.DEV;

function formatBytes(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

function toolLabel(tool: ToolId): string {
  if (tool === 'parser') return 'AST 结构';
  if (tool === 'resolver') return '模块解析结果';
  if (tool === 'lint') return '检查结果';
  return '输出结果';
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
      <Icon size={17} strokeWidth={1.8} />
    </button>
  );
}

function ResultStatus({ result, running, isLive }: {
  result: RunResult | null;
  running: boolean;
  isLive: boolean;
}) {
  const state = running ? 'working' : !result ? 'idle' : result.success ? 'ready' : 'issue';
  const label = running
    ? '正在运行'
    : !result
      ? isLive ? '等待运行' : '加载结果中'
      : result.success ? '运行完成' : '存在诊断信息';

  return <span className={`result-status ${state}`} role="status"><span className="status-light" />{label}</span>;
}

export default function App() {
  const { mode, changeMode } = useThemeMode();
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
  const selectedIndex = samples.findIndex((entry) => entry.tool === selected);
  const result = liveMode ? liveResult : (showcase?.results[selected] ?? null);
  const ToolIcon = toolIcons[selected];
  const output = result?.output ?? '';
  const navStyle = { '--selected-index': selectedIndex } as CSSProperties;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}showcase.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('无法读取构建快照');
        return response.json() as Promise<Showcase>;
      })
      .then(setShowcase)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setSnapshotError(error instanceof Error ? error.message : '快照不可用');
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!mobileMenu) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenu(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [mobileMenu]);

  const invalidateResult = () => {
    requestCounter.current += 1;
    setLiveResult(null);
    setRunError('');
    setRunning(false);
  };

  const chooseTool = (tool: ToolId) => {
    if (tool === selected) {
      setMobileMenu(false);
      return;
    }
    const next = samples.find((entry) => entry.tool === tool)!;
    invalidateResult();
    setSelected(tool);
    setSource(next.code);
    setSpecifier(next.specifier);
    setMobileMenu(false);
  };

  const reset = () => {
    invalidateResult();
    setSource(sample.code);
    setSpecifier(sample.specifier);
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
    const filename = selected === 'parser' || selected === 'resolver'
      ? `${selected}-result.json`
      : selected === 'lint'
        ? 'lint-result.txt'
        : `${sample.filename.replace(/\.[^.]+$/, '')}.output.js`;
    const blob = new Blob([result.output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const reduction = selected === 'minify' && result
    ? Math.max(0, Math.round((1 - result.outputBytes / Math.max(result.inputBytes, 1)) * 100))
    : null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="Oxc Demo">
          <span className="brand-mark"><Code2 size={20} strokeWidth={2} /></span>
          <span className="brand-name">oxc<span> / demo</span></span>
        </div>
        <div className="header-actions">
          <div className="theme-switch" role="group" aria-label="颜色主题">
            {themes.map(({ value, label, icon: Icon }) => (
              <button
                className={`theme-option ${mode === value ? 'selected' : ''}`}
                key={value}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={mode === value}
                onClick={() => changeMode(value)}
              ><Icon size={17} strokeWidth={1.8} /></button>
            ))}
          </div>
          <a className="github-link" href="https://github.com/weepwood/oxc-demo" target="_blank" rel="noopener noreferrer" aria-label="在 GitHub 查看源码"><Github size={18} /><span>GitHub</span></a>
          <button className="mobile-menu-button" type="button" onClick={() => setMobileMenu((value) => !value)} aria-label={mobileMenu ? '关闭工具导航' : '打开工具导航'} aria-expanded={mobileMenu} aria-controls="tool-sidebar">{mobileMenu ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </header>

      {mobileMenu && <button type="button" className="sidebar-backdrop" onClick={() => setMobileMenu(false)} aria-label="关闭导航菜单" />}

      <div className="layout">
        <aside id="tool-sidebar" className={`sidebar ${mobileMenu ? 'open' : ''}`}>
          <div className="sidebar-label">工具</div>
          <nav className="tool-nav" aria-label="Oxc 工具导航" style={navStyle}>
            <span className="nav-indicator" aria-hidden="true" />
            {samples.map((entry) => {
              const Icon = toolIcons[entry.tool];
              return (
                <button key={entry.tool} className={`nav-item ${selected === entry.tool ? 'active' : ''}`} type="button" onClick={() => chooseTool(entry.tool)} aria-current={selected === entry.tool ? 'page' : undefined}>
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{entry.name}</span>
                </button>
              );
            })}
          </nav>
          <div className="sidebar-bottom">
            <div className="mode-line"><span className="mode-light" />{liveMode ? '本地运行' : '在线预览'}</div>
            <a href="https://oxc.rs/" target="_blank" rel="noopener noreferrer"><BookOpen size={16} /> Oxc 官方文档 <ExternalLink size={13} /></a>
          </div>
        </aside>

        <main className="main-content" id="main-content">
          <div className="tool-view" key={selected}>
            <section className="intro-section">
              <div className="intro-heading">
                <span className="module-icon"><ToolIcon size={24} strokeWidth={1.7} /></span>
                <div className="intro-text"><h1>{sample.name}</h1><span>{sample.subtitle}</span></div>
                <a href={sample.docs} className="docs-link" target="_blank" rel="noopener noreferrer">查看文档 <ExternalLink size={14} /></a>
              </div>
              <p>{sample.description}</p>
            </section>

            <section className="workspace" aria-label="代码实验室">
              <div className="workspace-heading">
                <div className="workspace-title"><Code2 size={18} /> 代码实验室</div>
                <div className="workspace-actions">
                  {liveMode ? (
                    <>
                      <button className="subtle-button" type="button" onClick={reset} title="恢复当前示例"><RotateCcw size={16} /> 重置</button>
                      <button className="run-button" type="button" onClick={() => void run()} disabled={running}>
                        {running ? <LoaderCircle size={16} className="spinner" /> : <Play size={15} fill="currentColor" />}
                        {running ? '运行中' : '运行代码'}
                      </button>
                    </>
                  ) : <span className="snapshot-label"><span className="mode-light" /> 构建快照</span>}
                </div>
              </div>

              {!liveMode && <div className="snapshot-note"><CircleAlert size={16} />在线版展示 Oxc 构建时的真实运行结果。如需修改代码并执行，请在本地运行 <code>npm run dev</code>。</div>}

              <div className="editor-grid">
                <section className="editor-panel" aria-label="输入代码">
                  <div className="panel-top"><span className="panel-title"><FileCode2 size={16} />{sample.filename}</span><IconButton icon={Clipboard} title="复制输入代码" onClick={() => void copy(source, '源码已复制')} /></div>
                  {selected === 'resolver' && <div className="specifier-row"><label htmlFor="specifier">模块名称</label><input id="specifier" value={specifier} onChange={(event) => { invalidateResult(); setSpecifier(event.target.value); }} readOnly={!liveMode} /></div>}
                  <textarea
                    className="source-input"
                    value={source}
                    onChange={(event) => { invalidateResult(); setSource(event.target.value); }}
                    readOnly={!liveMode}
                    spellCheck={false}
                    aria-label="输入源代码"
                    wrap="off"
                  />
                  <div className="panel-bottom">{source.split('\n').length} 行 <span>·</span> {formatBytes(new TextEncoder().encode(source).length)}</div>
                </section>
                <section className="editor-panel output-panel" aria-label="运行结果">
                  <div className="panel-top"><span className="panel-title"><FileJson2 size={16} />{toolLabel(selected)}</span><div className="panel-actions"><IconButton icon={Clipboard} title="复制输出" onClick={() => void copy(output, '结果已复制')} disabled={!result} /><IconButton icon={ArrowDownToLine} title="下载输出" onClick={download} disabled={!result} /></div></div>
                  <div className="output-body" tabIndex={0} aria-label="输出内容">
                    {runError
                      ? <div className="empty-output error"><CircleAlert size={22} /><strong>运行失败</strong><p>{runError}</p></div>
                      : result
                        ? <pre className="output-code" key={`${selected}-${result.outputBytes}-${result.durationMs}`}><code>{result.output}</code></pre>
                        : <div className="empty-output">{running ? <LoaderCircle className="spinner" size={24} /> : <Code2 size={24} />}<strong>{snapshotError || (running ? '正在处理代码…' : liveMode ? '等待运行' : '正在加载结果')}</strong>{!running && <p>{liveMode ? '输入代码后，点击运行。' : '由 Oxc 在构建时生成。'}</p>}</div>}
                  </div>
                  <div className="panel-bottom">{result ? formatBytes(result.outputBytes) : '暂无输出'}</div>
                </section>
              </div>
              <div className="result-footer">
                <ResultStatus result={result} running={running} isLive={liveMode} />
                <div className="metrics">
                  {result && <><span>耗时 <strong>{result.durationMs.toFixed(2)} ms</strong></span><span>输出 <strong>{formatBytes(result.outputBytes)}</strong></span></>}
                  {reduction !== null && <span>压缩 <strong>{reduction}%</strong></span>}
                </div>
              </div>
            </section>

            <section className="usage-section">
              <div className="usage-copy"><strong><Terminal size={17} /> 快速使用</strong><p>复制命令或参考文档，在自己的项目中接入 {sample.name}。</p></div>
              <div className="command-field"><code>{sample.command}</code><IconButton icon={Clipboard} title="复制命令" onClick={() => void copy(sample.command, '命令已复制')} /></div>
            </section>
          </div>
          <footer className="page-footer">Oxc Demo · <a href="https://github.com/oxc-project/oxc" target="_blank" rel="noopener noreferrer">由 Oxc 驱动 <ExternalLink size={12} /></a></footer>
        </main>
      </div>
      {toast && <div key={toast} className="toast" role="status"><Check size={17} />{toast}</div>}
    </div>
  );
}

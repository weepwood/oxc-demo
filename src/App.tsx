import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clipboard,
  Code2,
  Command,
  ExternalLink,
  FileCode2,
  GitCompare,
  Github,
  Keyboard,
  Menu,
  Monitor,
  Moon,
  Play,
  RotateCcw,
  Share2,
  Sun,
  WrapText,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Inspector, ResultMetrics } from './components/Inspector';
import { getTool, tools, type ToolId } from './data/catalog';
import scenariosJson from './data/samples.json';
import { formatBytes, type RunResult, type Scenario, type Showcase } from './lib/inspect';
import { useThemeMode, type ThemeMode } from './theme';

type View = 'overview' | ToolId;

const scenarios = scenariosJson as Scenario[];
const themeChoices: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: 'system', label: '跟随系统', icon: Monitor },
  { id: 'light', label: '浅色主题', icon: Sun },
  { id: 'dark', label: '深色主题', icon: Moon },
];
const liveMode = import.meta.env.DEV;

function firstCase(tool: ToolId): Scenario {
  return scenarios.find((scenario) => scenario.tool === tool)!;
}

function readRoute(): { view: View; scenarioId: string } {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/');
  const tool = tools.find((item) => item.id === parts[0]);
  if (!tool) return { view: 'overview', scenarioId: firstCase('lint').id };
  const requested = scenarios.find((item) => item.id === parts[1] && item.tool === tool.id);
  return { view: tool.id, scenarioId: (requested ?? firstCase(tool.id)).id };
}

function navigate(view: View, scenarioId?: string) {
  const path = view === 'overview' ? 'overview' : `${view}/${scenarioId ?? firstCase(view).id}`;
  window.location.hash = `/${path}`;
}

function IconAction({ icon: Icon, label, disabled, onClick }: {
  icon: typeof Clipboard;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return <button type="button" className="icon-action" aria-label={label} title={label} disabled={disabled} onClick={onClick}><Icon size={17} strokeWidth={1.8} /></button>;
}

function Overview({ selectTool }: { selectTool: (tool: ToolId) => void }) {
  return (
    <div className="overview-page view-enter">
      <section className="overview-hero">
        <div className="hero-copy">
          <span className="hero-kicker"><span className="hero-kicker-dot" /> Oxc · 工具链实验室</span>
          <h1>看见代码处理的<span>每一步</span></h1>
          <p>从诊断、格式化到语法树、转换与压缩。用真实示例了解 Oxc 在现代 JavaScript 工程中的工作方式。</p>
          <div className="hero-actions">
            <button type="button" className="primary-action" onClick={() => selectTool('lint')}>开始探索 <ArrowRight size={17} /></button>
            <a className="text-action" href="https://oxc.rs/" target="_blank" rel="noopener noreferrer">了解 Oxc <ExternalLink size={15} /></a>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-editor-title"><span className="hero-code-dot" /><span className="hero-code-dot" /><span className="hero-code-dot" /><span>example.ts</span></div>
          <div className="hero-editor-lines">
            <div><span>01</span><code><em>type</em> Task = {'{'} done: boolean {'}'}</code></div>
            <div><span>02</span><code></code></div>
            <div><span>03</span><code><em>const</em> tasks: Task[] = [];</code></div>
            <div><span>04</span><code><em>export const</em> pending = () =&gt;</code></div>
            <div><span>05</span><code>&nbsp; tasks.filter(t =&gt; !t.done);</code></div>
          </div>
          <div className="hero-status"><Check size={16} /> 语法检查完成 <span>·</span> 0 errors</div>
        </div>
      </section>

      <div className="section-heading"><div><h2>探索六个核心工具</h2><p>每个模块提供三个真实案例与针对性的分析视图。</p></div><span>18 个交互案例</span></div>
      <div className="tool-grid">
        {tools.map((tool, index) => {
          const Icon = tool.icon;
          return <button type="button" className="tool-card" data-accent={tool.accent} key={tool.id} onClick={() => selectTool(tool.id)}>
            <div className="tool-card-top"><span className="tool-card-icon"><Icon size={24} strokeWidth={1.7} /></span><span className="card-index">{String(index + 1).padStart(2, '0')}</span></div>
            <h3>{tool.name}</h3><strong>{tool.headline}</strong><p>{tool.description}</p>
            <div className="tool-card-bottom"><span>{tool.category}</span><ArrowRight size={18} /></div>
          </button>;
        })}
      </div>

      <section className="workflow-section">
        <div><h2>不是一张静态截图</h2><p>切换案例即可查看构建时由真实 Oxc 工具生成的结果。运行本地开发服务器，还可以自由编辑源码和即时执行。</p></div>
        <div className="workflow-actions"><span><Check size={17} /> 诊断定位</span><span><GitCompare size={17} /> 代码差异</span><span><Code2 size={17} /> AST 探索</span></div>
      </section>
    </div>
  );
}

function SourceEditor({ value, onChange, fileName, readOnly, wrap, onToggleWrap, editorRef, onKeyDown }: {
  value: string;
  onChange: (next: string) => void;
  fileName: string;
  readOnly: boolean;
  wrap: boolean;
  onToggleWrap: () => void;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  onKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const lines = value.split('\n').length;
  return (
    <section className="source-pane" aria-label="输入代码">
      <div className="pane-heading"><span><FileCode2 size={17} />{fileName}</span><div className="pane-actions"><IconAction icon={WrapText} label={wrap ? '关闭自动折行' : '开启自动折行'} onClick={onToggleWrap} /></div></div>
      <div className="editor-inner">
        <div className="editor-gutter" aria-hidden="true" ref={gutterRef}>{Array.from({ length: lines }, (_, i) => <span key={i}>{i + 1}</span>)}</div>
        <textarea ref={editorRef} className="code-textarea" aria-label="源代码" value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={onKeyDown} onScroll={(event) => { if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop; }} readOnly={readOnly} spellCheck={false} wrap={wrap ? 'soft' : 'off'} />
      </div>
      <div className="pane-footer"><span>{readOnly ? '快照源码 · 只读' : '可编辑源码'}</span><span>{lines} 行 · {formatBytes(new TextEncoder().encode(value).length)}</span></div>
    </section>
  );
}

export default function App() {
  const { mode, changeMode } = useThemeMode();
  const [route, setRoute] = useState(readRoute);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [toast, setToast] = useState('');
  const [showcase, setShowcase] = useState<Showcase | null>(null);
  const [snapshotError, setSnapshotError] = useState('');
  const [liveResult, setLiveResult] = useState<RunResult | null>(null);
  const [runError, setRunError] = useState('');
  const [running, setRunning] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const requestCounter = useRef(0);
  const requestController = useRef<AbortController | null>(null);
  const scenario = useMemo(() => scenarios.find((item) => item.id === route.scenarioId) ?? firstCase('lint'), [route.scenarioId]);
  const [source, setSource] = useState(scenario.code);
  const [specifier, setSpecifier] = useState(scenario.specifier ?? 'react');
  const tool = route.view === 'overview' ? null : getTool(route.view);
  const activeIndex = route.view === 'overview' ? 0 : tools.findIndex((item) => item.id === route.view) + 1;
  const navStyle = { '--indicator-offset': `${activeIndex * 50}px` } as CSSProperties;
  const pristine = source === scenario.code && specifier === (scenario.specifier ?? 'react');
  const snapshot = showcase?.results[scenario.id] ?? null;
  const result = runError ? null : (liveMode ? (liveResult ?? (pristine ? snapshot : null)) : snapshot);
  const actuallyLive = Boolean(liveResult);
  const previewLabel = actuallyLive ? '实时运行' : '构建快照';

  useEffect(() => {
    const onHashChange = () => {
      const nextRoute = readRoute();
      const nextScenario = scenarios.find((item) => item.id === nextRoute.scenarioId) ?? firstCase('lint');
      requestController.current?.abort();
      requestCounter.current += 1;
      setLiveResult(null);
      setRunError('');
      setRunning(false);
      setSource(nextScenario.code);
      setSpecifier(nextScenario.specifier ?? 'react');
      setMobileMenu(false);
      setRoute(nextRoute);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}showcase.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('无法加载 Oxc 构建快照');
        return response.json() as Promise<Showcase>;
      })
      .then((data) => {
        if (data.mode !== 'build-snapshot' || !data.results) throw new Error('快照格式不正确');
        setShowcase(data);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setSnapshotError(error instanceof Error ? error.message : '快照加载失败');
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 2300);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!mobileMenu) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileMenu(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [mobileMenu]);

  const visit = (view: View, caseId?: string) => {
    setMobileMenu(false);
    navigate(view, caseId);
  };

  const invalidate = () => {
    requestController.current?.abort();
    requestCounter.current += 1;
    setLiveResult(null);
    setRunError('');
    setRunning(false);
  };

  const changeSource = (value: string) => {
    invalidate();
    setSource(value);
  };

  const changeSpecifier = (value: string) => {
    invalidate();
    setSpecifier(value);
  };

  const reset = () => {
    invalidate();
    setSource(scenario.code);
    setSpecifier(scenario.specifier ?? 'react');
  };

  const run = useCallback(async () => {
    if (!liveMode || running) return;
    const requestId = ++requestCounter.current;
    const controller = new AbortController();
    requestController.current?.abort();
    requestController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    setRunning(true);
    setRunError('');
    setLiveResult(null);
    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: scenario.tool, filename: scenario.filename, code: source, specifier }),
      });
      const data: RunResult | { error: string } = await response.json();
      if (!response.ok) throw new Error('error' in data ? data.error : '执行失败');
      if (requestCounter.current === requestId) setLiveResult(data as RunResult);
    } catch (error) {
      if (requestCounter.current === requestId) setRunError(controller.signal.aborted ? '请求超时或已取消' : error instanceof Error ? error.message : '执行失败');
    } finally {
      window.clearTimeout(timeout);
      if (requestCounter.current === requestId) setRunning(false);
    }
  }, [running, scenario.tool, scenario.filename, source, specifier]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && route.view !== 'overview') {
        event.preventDefault();
        void run();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run, route.view]);

  const handleEditorKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (!liveMode || event.key !== 'Tab') return;
    event.preventDefault();
    const el = event.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = source.slice(0, start) + '  ' + source.slice(end);
    changeSource(next);
    requestAnimationFrame(() => {
      if (!editorRef.current) return;
      editorRef.current.selectionStart = start + 2;
      editorRef.current.selectionEnd = start + 2;
    });
  };

  const jumpToLine = (line: number) => {
    const el = editorRef.current;
    if (!el || line <= 0) return;
    const lines = source.split('\n');
    const position = lines.slice(0, line - 1).reduce((total, text) => total + text.length + 1, 0);
    el.focus();
    el.setSelectionRange(position, position + (lines[line - 1]?.length ?? 0));
    el.scrollTop = Math.max(0, (line - 3) * 22.5);
  };

  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast(message);
    } catch {
      setToast('复制失败，请检查浏览器权限');
    }
  };

  const download = () => {
    if (!result || result.truncated) return;
    const extension = scenario.tool === 'parser' || scenario.tool === 'resolver' || scenario.tool === 'lint'
      ? 'json' : scenario.tool === 'format' ? scenario.filename.split('.').pop() ?? 'js' : 'js';
    const blob = new Blob([result.output], { type: 'text/plain;charset=utf-8' });
    const uri = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = uri;
    link.download = `${scenario.id}-output.${extension}`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(uri), 1000);
  };

  const share = () => void copy(window.location.href, '案例链接已复制');

  return (
    <div className="app-shell">
      <header className="topbar">
        <button type="button" className="brand" onClick={() => visit('overview')} aria-label="返回工具概览">
          <span className="brand-mark"><Code2 size={20} strokeWidth={2.1} /></span>
          <span className="brand-name">oxc<span> / lab</span></span>
        </button>
        <div className="header-location">{route.view === 'overview' ? '工具概览' : <><span>工具</span><ChevronRight size={15}/><strong>{tool?.name}</strong></>}</div>
        <div className="header-actions">
          <div className="theme-switch" role="group" aria-label="颜色主题">
            {themeChoices.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={`theme-option ${mode === id ? 'selected' : ''}`} title={label} aria-label={label} aria-pressed={mode === id} onClick={() => changeMode(id)}><Icon size={17}/></button>)}
          </div>
          <a className="github-link" href="https://github.com/weepwood/oxc-demo" target="_blank" rel="noopener noreferrer" title="GitHub 源码" aria-label="GitHub 源码"><Github size={19} /></a>
          <button className="mobile-menu-button" type="button" aria-label="切换导航" aria-controls="tool-sidebar" aria-expanded={mobileMenu} onClick={() => setMobileMenu((previous) => !previous)}>{mobileMenu ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </header>

      {mobileMenu && <button className="sidebar-backdrop" type="button" aria-label="关闭侧栏" onClick={() => setMobileMenu(false)} />}
      <div className="layout">
        <aside id="tool-sidebar" className={`sidebar ${mobileMenu ? 'open' : ''}`}>
          <div className="sidebar-label">工作台</div>
          <nav className="tool-nav" aria-label="工作台导航" style={navStyle}>
            <span className="nav-indicator" aria-hidden="true" />
            <button type="button" className={`nav-item ${route.view === 'overview' ? 'active' : ''}`} aria-current={route.view === 'overview' ? 'page' : undefined} onClick={() => visit('overview')}><Code2 size={18} />概览</button>
            {tools.map((entry) => {
              const Icon = entry.icon;
              return <button key={entry.id} type="button" className={`nav-item ${route.view === entry.id ? 'active' : ''}`} aria-current={route.view === entry.id ? 'page' : undefined} onClick={() => visit(entry.id)}><Icon size={18} />{entry.name}</button>;
            })}
          </nav>
          <div className="sidebar-bottom">
            <div className="mode-line"><span className="mode-light" />{liveMode ? '本地运行模式' : 'GitHub Pages · 快照模式'}</div>
            <a href="https://oxc.rs/" target="_blank" rel="noopener noreferrer"><BookOpen size={16} /> 官方文档 <ExternalLink size={13} /></a>
          </div>
        </aside>

        <main className="main-content" id="main-content">
          {route.view === 'overview' ? <Overview selectTool={(id) => visit(id)} /> : tool && (
            <div className="module-page view-enter" key={`${tool.id}-${scenario.id}`}>
              <section className="module-header" data-accent={tool.accent}>
                <span className="module-icon"><tool.icon size={24} strokeWidth={1.7}/></span>
                <div className="module-title"><span>{tool.category} · Oxc</span><h1>{tool.name}</h1><p>{tool.description}</p></div>
                <a href={tool.docs} target="_blank" rel="noopener noreferrer" className="module-docs">官方文档 <ExternalLink size={14} /></a>
              </section>

              <section className="scenario-section">
                <div className="section-heading compact"><div><h2>选择演示案例</h2><p>切换查看不同能力的实际处理结果。</p></div><span>{scenarios.filter((item) => item.tool === tool.id).length} 个案例</span></div>
                <div className="scenario-grid">
                  {scenarios.filter((item) => item.tool === tool.id).map((item) => (
                    <button type="button" key={item.id} className={`scenario-card ${scenario.id === item.id ? 'selected' : ''}`} aria-pressed={scenario.id === item.id} onClick={() => visit(item.tool, item.id)}>
                      <span className="scenario-card-title">{item.title}</span>
                      <span className="scenario-card-feature">{item.feature}</span>
                      <span className="scenario-card-arrow"><ArrowRight size={16}/></span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="workbench">
                <div className="workbench-toolbar">
                  <div className="workbench-heading"><h2>{scenario.title}</h2><span>{scenario.description}</span></div>
                  <div className="workbench-actions">
                    <IconAction icon={Share2} label="复制案例链接" onClick={share} />
                    {result && <><IconAction icon={Clipboard} label="复制结果" onClick={() => void copy(result.output, '结果已复制')} /><IconAction icon={ArrowDownToLine} label="下载结果" disabled={result.truncated} onClick={download} /></>}
                    {liveMode && <><IconAction icon={RotateCcw} label="恢复示例" onClick={reset} /><button className="run-button" type="button" disabled={running} title="Ctrl / ⌘ + Enter" onClick={() => void run()}><Play size={15} fill="currentColor"/>{running ? '运行中…' : '运行'}</button></>}
                    {!liveMode && <span className="snapshot-label"><span className="mode-light" />可查看结果</span>}
                  </div>
                </div>

                <div className="code-workspace">
                  <div className="source-stack">
                    {tool.id === 'resolver' && <div className="specifier-bar"><label htmlFor="specifier">模块标识符</label><input id="specifier" value={specifier} onChange={(event) => changeSpecifier(event.target.value)} readOnly={!liveMode} /><span>{liveMode ? '可修改' : '构建时解析'}</span></div>}
                    <SourceEditor value={source} onChange={changeSource} fileName={scenario.filename} readOnly={!liveMode} wrap={wrap} onToggleWrap={() => setWrap(!wrap)} editorRef={editorRef} onKeyDown={handleEditorKeyDown} />
                  </div>
                  <Inspector key={scenario.id} tool={tool.id} source={source} result={result} loading={running || (!showcase && !snapshotError)} error={runError || (result ? '' : snapshotError)} specifier={specifier} onJump={jumpToLine} />
                </div>
                <div className="workbench-status">
                  <span className={`run-status ${result ? result.success ? 'success' : 'warning' : 'idle'}`}><span />{running ? '处理中' : runError ? '运行失败' : result ? result.success ? '处理完成' : '存在诊断' : '等待结果'}</span>
                  <span>{previewLabel}{liveMode && !pristine && !liveResult && !runError ? ' · 修改后需运行' : ''}</span>
                  {liveMode && <span className="shortcut-hint"><Keyboard size={15} /> Ctrl / ⌘ + Enter</span>}
                </div>
              </section>

              <div className="under-workbench">
                <section className="insight-card">
                  <div className="insight-heading"><span>这个案例说明</span><span className="case-tags">{scenario.tags.map((tag) => <small key={tag}>{tag}</small>)}</span></div>
                  <p>{scenario.lesson}</p>
                  <div className="command-box"><Command size={16} /><code>{tool.command}</code><IconAction icon={Clipboard} label="复制集成命令" onClick={() => void copy(tool.command, '命令已复制')} /></div>
                </section>
                <ResultMetrics tool={tool.id} result={result} isLive={actuallyLive} />
              </div>
              {!liveMode && <div className="static-notice">当前为 GitHub Pages 静态站点。切换案例会显示 Oxc 在构建时生成的真实结果；如需任意修改源码并重新运行，请在本地执行 <code>npm run dev</code>。</div>}
            </div>
          )}
          <footer className="page-footer"><span>Oxc Demo · Open source</span><a href="https://github.com/oxc-project/oxc" target="_blank" rel="noopener noreferrer">Oxc 项目 <ExternalLink size={12}/></a></footer>
        </main>
      </div>
      {toast && <div key={toast} className="toast" role="status"><Check size={17}/>{toast}</div>}
    </div>
  );
}

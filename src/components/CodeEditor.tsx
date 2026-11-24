import { useEffect, useRef, type RefObject } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { basicSetup } from 'codemirror';
import { FileCode2, WrapText } from 'lucide-react';
import { formatBytes } from '../lib/inspect';

interface Props {
  value: string;
  onChange: (value: string) => void;
  fileName: string;
  readOnly: boolean;
  wrap: boolean;
  onToggleWrap: () => void;
  editorRef: RefObject<EditorView | null>;
}

const editorTheme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'var(--editor-bg)', color: 'var(--text)', fontSize: '12px' },
  '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', lineHeight: '22.5px', overflow: 'auto' },
  '.cm-content': { padding: '14px 0', caretColor: 'var(--text)' },
  '.cm-gutters': { backgroundColor: 'var(--page)', color: 'var(--text-soft)', borderRight: '1px solid var(--line)' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--hover)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-cursor': { borderLeftColor: 'var(--text)' },
});

export function CodeEditor({ value, onChange, fileName, readOnly, wrap, onToggleWrap, editorRef }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const initial = useRef(value);
  const callback = useRef(onChange);
  const readonlyCompartment = useRef(new Compartment());
  const wrapCompartment = useRef(new Compartment());

  useEffect(() => { callback.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!host.current) return;
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: initial.current,
        extensions: [
          basicSetup,
          javascript({ typescript: /\.tsx?$/.test(fileName), jsx: /\.[jt]sx$/.test(fileName) }),
          editorTheme,
          keymap.of([indentWithTab]),
          EditorView.contentAttributes.of({ 'aria-label': '源代码' }),
          readonlyCompartment.current.of([]),
          wrapCompartment.current.of([]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) callback.current(update.state.doc.toString());
          }),
        ],
      }),
    });
    editorRef.current = view;
    return () => { view.destroy(); if (editorRef.current === view) editorRef.current = null; };
  }, [fileName, editorRef]);

  useEffect(() => {
    const view = editorRef.current;
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    }
  }, [value, editorRef]);

  useEffect(() => {
    editorRef.current?.dispatch({ effects: readonlyCompartment.current.reconfigure([
      EditorState.readOnly.of(readOnly),
      EditorView.editable.of(!readOnly),
    ]) });
  }, [readOnly, editorRef]);

  useEffect(() => {
    editorRef.current?.dispatch({ effects: wrapCompartment.current.reconfigure(wrap ? EditorView.lineWrapping : []) });
  }, [wrap, editorRef]);

  return (
    <section className="source-pane" aria-label="输入代码">
      <div className="pane-heading">
        <span><FileCode2 size={17} />{fileName}</span>
        <div className="pane-actions">
          <button type="button" className="icon-action" aria-label={wrap ? '关闭自动折行' : '开启自动折行'} aria-pressed={wrap} onClick={onToggleWrap}><WrapText size={17} /></button>
        </div>
      </div>
      <div className="cm-host" ref={host} />
      <div className="pane-footer"><span>{readOnly ? '快照源码 · 只读' : '可编辑源码'}</span><span>{value.split('\n').length} 行 · {formatBytes(new TextEncoder().encode(value).length)}</span></div>
    </section>
  );
}

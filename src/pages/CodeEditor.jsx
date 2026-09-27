import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { FileCode2, Keyboard, Loader2, Play, Plus, Trash2, X } from 'lucide-react';
import { errorMessage, wsApi } from '../api/client.js';
import { useSocket } from '../context/SocketContext.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import useSocketEvent from '../hooks/useSocketEvent.js';
import Avatar from '../components/ui/Avatar.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import FullPageSpinner from '../components/ui/FullPageSpinner.jsx';
import { cx } from '../lib/utils.js';

// [id, label, extension] — the first seven compile/run on the server, the rest preview in the browser
const LANGUAGES = [
  ['javascript', 'JavaScript', '.js'],
  ['typescript', 'TypeScript', '.ts'],
  ['python', 'Python', '.py'],
  ['java', 'Java', '.java'],
  ['c', 'C', '.c'],
  ['cpp', 'C++', '.cpp'],
  ['sql', 'SQL (SQLite)', '.sql'],
  ['html', 'HTML', '.html'],
  ['css', 'CSS', '.css'],
  ['json', 'JSON', '.json'],
  ['markdown', 'Markdown', '.md'],
];
const PREVIEW_LANGUAGES = ['html', 'css', 'markdown', 'json'];
const LANG_COLOR = { javascript: '#f9ab00', typescript: '#1a73e8', python: '#188038', java: '#e37400', c: '#5f6368', cpp: '#9334e6', sql: '#007b83', html: '#d93025', css: '#9334e6', json: '#5f6368' };

// Starter code for new files, so compiled languages run straight away
const TEMPLATES = {
  javascript: "const name = 'TeamCollab';\nconsole.log(`Hello from ${name}!`);\n",
  typescript: "const add = (a: number, b: number): number => a + b;\nconsole.log(add(2, 3));\n",
  python: "def greet(name):\n    return f'Hello from {name}!'\n\nprint(greet('Python'))\n",
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java!");\n    }\n}\n',
  c: '#include <stdio.h>\n\nint main(void) {\n    printf("Hello from C!\\n");\n    return 0;\n}\n',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello from C++!" << endl;\n    return 0;\n}\n',
  sql: "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, role TEXT);\nINSERT INTO users (name, role) VALUES ('Ada', 'Admin'), ('Melvin', 'Member');\nSELECT * FROM users;\n",
  html: '<!doctype html>\n<html>\n  <body>\n    <h1>Hello TeamCollab</h1>\n  </body>\n</html>\n',
  css: 'h1 {\n  color: #1a73e8;\n  font-family: Roboto, sans-serif;\n}\n',
  json: '{\n  "project": "TeamCollab"\n}\n',
  markdown: '# Notes\n\n- **Bold** and *italic*\n- `inline code`\n',
};

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Minimal Markdown -> HTML for the preview pane (headings, lists, bold/italic, code, links)
function markdownToHtml(md) {
  const inline = (s) =>
    escapeHtml(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\*([^*]+)\*/g, '<i>$1</i>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  const blocks = md.split(/```/);
  return blocks
    .map((block, i) => {
      if (i % 2) return `<pre>${escapeHtml(block.replace(/^\w*\n/, ''))}</pre>`;
      let html = '';
      let inList = false;
      block.split('\n').forEach((line) => {
        const li = line.match(/^\s*[-*]\s+(.*)/);
        if (li && !inList) (html += '<ul>'), (inList = true);
        if (!li && inList) (html += '</ul>'), (inList = false);
        const h = line.match(/^(#{1,6})\s+(.*)/);
        if (h) html += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`;
        else if (li) html += `<li>${inline(li[1])}</li>`;
        else if (line.trim()) html += `<p>${inline(line)}</p>`;
      });
      return inList ? `${html}</ul>` : html;
    })
    .join('');
}

const PREVIEW_STYLE = '<style>body{font:14px/1.6 Roboto,sans-serif;color:#202124;margin:16px}code,pre{background:#f1f3f4;border-radius:4px;padding:2px 4px}pre{padding:10px}</style>';

// Browser-side "run" for markup languages
function previewFor(language, code) {
  if (language === 'html') return { kind: 'html', html: code };
  if (language === 'css') {
    return { kind: 'html', html: `<style>${code}</style><h1>Heading 1</h1><h2>Heading 2</h2><p>Paragraph with <a href="#">a link</a>.</p><button>Button</button><ul><li>List item</li></ul>` };
  }
  if (language === 'markdown') return { kind: 'html', html: PREVIEW_STYLE + markdownToHtml(code) };
  try {
    return { kind: 'console', ok: true, status: 'Valid JSON', stdout: JSON.stringify(JSON.parse(code), null, 2), stderr: '' };
  } catch (err) {
    return { kind: 'console', ok: false, status: 'Invalid JSON', stdout: '', stderr: err.message };
  }
}

function throttle(fn, ms) {
  let timer = null;
  let lastArgs;
  return (...args) => {
    lastArgs = args;
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      fn(...lastArgs);
    }, ms);
  };
}

// Inject one stylesheet rule-set per remote user for their cursor color + name tag
function ensureUserStyle(user) {
  const id = `rc-style-${user._id}`;
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  const name = user.name.replace(/["\\]/g, '');
  style.textContent = `
    .rc-${user._id}{position:relative;border-left:2px solid ${user.color};margin-left:-1px;}
    .rc-${user._id}::after{content:"${name}";position:absolute;left:-2px;top:-1.3em;background:${user.color};color:#fff;
      font:500 10px/1.3 Roboto,sans-serif;padding:0 4px;border-radius:3px 3px 3px 0;white-space:nowrap;pointer-events:none;z-index:5;}
    .rs-${user._id}{background:${user.color}33;}`;
  document.head.appendChild(style);
}

export default function CodeEditor() {
  const { socket } = useSocket();
  const { currentId, online } = useWorkspace();
  const toast = useToast();

  const [snippets, setSnippets] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newFile, setNewFile] = useState({ title: '', language: 'javascript' });
  const [remote, setRemote] = useState({}); // userId -> { user, snippetId, position, selection }
  const [output, setOutput] = useState(null); // null | { kind: 'console', ok, status, stdout, stderr } | { kind: 'html', html }
  const [panel, setPanel] = useState(null); // null | 'output' | 'input'
  const [stdin, setStdin] = useState('');
  const [running, setRunning] = useState(false);
  const runRef = useRef(null);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const applyingRemote = useRef(false);
  const decorations = useRef(null);

  const active = snippets?.find((s) => s._id === activeId) || null;

  useEffect(() => {
    if (!currentId) return;
    setSnippets(null);
    wsApi(currentId)
      .get('/snippets')
      .then((d) => {
        setSnippets(d.snippets);
        setActiveId((id) => (d.snippets.some((s) => s._id === id) ? id : d.snippets[0]?._id || null));
      });
  }, [currentId]);

  /* ------------------------------ model helpers ----------------------------- */
  const modelFor = (snippetId) => monacoRef.current?.editor.getModel(monacoRef.current.Uri.parse(snippetId));

  // Replace only the changed middle of the document so local cursors stay put
  const applyText = useCallback((model, next) => {
    const prev = model.getValue();
    if (prev === next) return;
    let start = 0;
    while (start < prev.length && start < next.length && prev[start] === next[start]) start += 1;
    let endPrev = prev.length;
    let endNext = next.length;
    while (endPrev > start && endNext > start && prev[endPrev - 1] === next[endNext - 1]) {
      endPrev -= 1;
      endNext -= 1;
    }
    const range = monacoRef.current.Range.fromPositions(model.getPositionAt(start), model.getPositionAt(endPrev));
    applyingRemote.current = true;
    try {
      model.applyEdits([{ range, text: next.slice(start, endNext) }]);
    } finally {
      applyingRemote.current = false;
    }
  }, []);

  /* --------------------------------- outgoing -------------------------------- */
  const emitCode = useMemo(
    () => throttle((snippetId, code) => socket?.emit('code_change', { workspaceId: currentId, snippetId, code }), 60),
    [socket, currentId]
  );
  const emitCursor = useMemo(
    () => throttle((payload) => socket?.emit('code_cursor', { workspaceId: currentId, ...payload }), 80),
    [socket, currentId]
  );

  const onChange = (value) => {
    if (applyingRemote.current || !activeId) return;
    setSnippets((list) => list.map((s) => (s._id === activeId ? { ...s, code: value } : s)));
    emitCode(activeId, value);
  };

  const onMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    decorations.current = editor.createDecorationsCollection([]);
    // Ctrl/Cmd + Enter runs the current file
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current?.());
    editor.onDidChangeCursorSelection((e) => {
      const model = editor.getModel();
      if (!model) return;
      emitCursor({ snippetId: model.uri.path.replace(/^\//, ''), position: e.selection.getPosition(), selection: e.selection });
    });
  };

  /* --------------------------------- incoming -------------------------------- */
  useSocketEvent('code_change', ({ snippetId, code }) => {
    setSnippets((list) => list?.map((s) => (s._id === snippetId ? { ...s, code } : s)));
    const model = modelFor(snippetId);
    if (model) applyText(model, code);
  });

  useSocketEvent('code_cursor', ({ snippetId, position, selection, user }) => {
    ensureUserStyle(user);
    setRemote((r) => ({ ...r, [user._id]: { user, snippetId, position, selection } }));
  });

  useSocketEvent('snippet_created', ({ workspaceId, snippet }) => {
    if (workspaceId !== currentId) return;
    setSnippets((list) => (list?.some((s) => s._id === snippet._id) ? list : [...(list || []), snippet]));
  });
  useSocketEvent('snippet_updated', ({ workspaceId, snippet }) => {
    if (workspaceId !== currentId) return;
    setSnippets((list) => list?.map((s) => (s._id === snippet._id ? { ...s, title: snippet.title, language: snippet.language } : s)));
  });
  useSocketEvent('snippet_deleted', ({ workspaceId, snippetId }) => {
    if (workspaceId !== currentId) return;
    setSnippets((list) => list?.filter((s) => s._id !== snippetId));
    setActiveId((id) => (id === snippetId ? null : id));
    modelFor(snippetId)?.dispose();
  });

  // Fall back to the first file when the active one disappears
  useEffect(() => {
    if (snippets && !active && snippets.length) setActiveId(snippets[0]._id);
  }, [snippets, active]);

  // Forget cursors of people who went offline
  useEffect(() => {
    const ids = new Set(online.map((u) => u._id));
    setRemote((r) => Object.fromEntries(Object.entries(r).filter(([id]) => ids.has(id))));
  }, [online]);

  // Paint remote cursors & selections for the open file
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco || !decorations.current) return;
    const decs = [];
    Object.values(remote)
      .filter((r) => r.snippetId === activeId && r.position)
      .forEach(({ user, position, selection }) => {
        const { lineNumber, column } = position;
        decs.push({
          range: new monaco.Range(lineNumber, column, lineNumber, column),
          options: { beforeContentClassName: `rc-${user._id}`, stickiness: 1, hoverMessage: { value: user.name } },
        });
        if (selection && (selection.startLineNumber !== selection.endLineNumber || selection.startColumn !== selection.endColumn)) {
          decs.push({
            range: new monaco.Range(selection.startLineNumber, selection.startColumn, selection.endLineNumber, selection.endColumn),
            options: { className: `rs-${user._id}`, stickiness: 1 },
          });
        }
      });
    decorations.current.set(decs);
  }, [remote, activeId, snippets]);

  /* --------------------------------- actions --------------------------------- */
  const api = wsApi(currentId);

  const createSnippet = async (e) => {
    e.preventDefault();
    try {
      const ext = LANGUAGES.find(([id]) => id === newFile.language)[2];
      const title = /\.\w+$/.test(newFile.title) ? newFile.title : `${newFile.title}${ext}`;
      const { snippet } = await api.post('/snippets', { title, language: newFile.language, code: TEMPLATES[newFile.language] || '' });
      setSnippets((list) => (list.some((s) => s._id === snippet._id) ? list : [...list, snippet]));
      setActiveId(snippet._id);
      setCreating(false);
      setNewFile({ title: '', language: 'javascript' });
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  };

  const setLanguage = async (language) => {
    setSnippets((list) => list.map((s) => (s._id === activeId ? { ...s, language } : s)));
    try {
      await api.patch(`/snippets/${activeId}`, { language });
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  };

  const removeSnippet = async (s) => {
    if (!window.confirm(`Delete ${s.title} for everyone?`)) return;
    try {
      await api.del(`/snippets/${s._id}`);
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  };

  const run = async () => {
    if (!active || running) return;
    setPanel('output');
    if (PREVIEW_LANGUAGES.includes(active.language)) return setOutput(previewFor(active.language, active.code));
    setRunning(true);
    setOutput({ kind: 'console', ok: true, status: 'Running…', stdout: '', stderr: '' });
    try {
      const r = await api.post('/run', { language: active.language, code: active.code, stdin });
      const secs = `${(r.time / 1000).toFixed(2)}s`;
      let status = `Exited with code ${r.exitCode} · ${secs}`;
      if (r.stage === 'compile') status = 'Compilation failed';
      else if (r.timedOut) status = 'Time limit exceeded';
      else if (r.missingTool) status = 'Compiler not installed';
      setOutput({ kind: 'console', ok: r.exitCode === 0, status, stdout: r.stdout, stderr: r.stderr });
    } catch (err) {
      setOutput({ kind: 'console', ok: false, status: 'Could not run', stdout: '', stderr: errorMessage(err) });
    } finally {
      setRunning(false);
    }
  };
  runRef.current = run;

  if (!snippets) return <FullPageSpinner />;

  const isPreview = active && PREVIEW_LANGUAGES.includes(active.language);
  const here = (id) => Object.values(remote).filter((r) => r.snippetId === id).map((r) => r.user);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-3 pt-6 sm:px-10">
        <div>
          <h1 className="text-[22px] font-normal text-ink">Code editor</h1>
          <p className="text-[13px] text-ink-4">Shared files · edits and cursors sync live</p>
        </div>
        <div className="flex items-center gap-2">
          {active && (
            <select className="field h-9 w-auto py-0" value={active.language} onChange={(e) => setLanguage(e.target.value)} aria-label="Language">
              {LANGUAGES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          )}
          {active && !isPreview && (
            <button
              type="button"
              className={cx('btn-outline px-3', panel === 'input' && 'bg-gblue-soft')}
              onClick={() => setPanel((p) => (p === 'input' ? null : 'input'))}
              title="Program input (stdin)"
            >
              <Keyboard size={15} /> Input
            </button>
          )}
          {active && (
            <button type="button" className="btn-primary" onClick={run} disabled={running} title="Run (Ctrl+Enter)">
              {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />} {isPreview ? 'Preview' : 'Run'}
            </button>
          )}
        </div>
      </div>

      <div className="mx-6 mb-6 flex min-h-0 flex-1 overflow-hidden rounded-xl border border-line sm:mx-10">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-surface md:flex">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="eyebrow text-ink-4">Files</span>
            <button type="button" className="icon-btn h-7 w-7" onClick={() => setCreating(true)} aria-label="New file"><Plus size={16} /></button>
          </div>
          <ul className="flex-1 overflow-auto pb-2">
            {snippets.map((s) => (
              <li key={s._id}>
                <button
                  type="button"
                  onClick={() => setActiveId(s._id)}
                  className={cx('group flex w-full items-center gap-2 py-2 pl-4 pr-2 text-left text-[13px]', s._id === activeId ? 'bg-gblue-soft font-medium text-gblue-dark' : 'text-ink-2 hover:bg-black/5')}
                >
                  <FileCode2 size={15} style={{ color: LANG_COLOR[s.language] || '#5f6368' }} />
                  <span className="flex-1 truncate">{s.title}</span>
                  <span className="flex -space-x-1">
                    {here(s._id).slice(0, 3).map((u) => <span key={u._id} className="h-2 w-2 rounded-full ring-1 ring-white" style={{ background: u.color }} />)}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); removeSnippet(s); }}
                    onKeyDown={(e) => e.key === 'Enter' && removeSnippet(s)}
                    className="hidden rounded p-1 text-ink-4 hover:text-gred group-hover:inline-flex"
                    aria-label={`Delete ${s.title}`}
                  >
                    <Trash2 size={13} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-4 py-3">
            <div className="eyebrow mb-2 text-ink-4">In this file</div>
            <div className="flex flex-wrap gap-1.5">
              {active && here(active._id).map((u) => <Avatar key={u._id} user={u} size={24} />)}
              {active && here(active._id).length === 0 && <span className="text-xs text-ink-4">Just you</span>}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* mobile file picker */}
          <div className="flex items-center gap-2 border-b border-line px-3 py-2 md:hidden">
            <select className="field h-8 py-0" value={activeId || ''} onChange={(e) => setActiveId(e.target.value)}>
              {snippets.map((s) => <option key={s._id} value={s._id}>{s.title}</option>)}
            </select>
            <button type="button" className="icon-btn h-8 w-8" onClick={() => setCreating(true)} aria-label="New file"><Plus size={16} /></button>
          </div>

          {active ? (
            <div className="min-h-0 flex-1">
              <Editor
                path={active._id}
                defaultValue={active.code}
                language={active.language}
                onChange={onChange}
                onMount={onMount}
                options={{
                  fontSize: 14,
                  fontFamily: '"Roboto Mono", monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  padding: { top: 16 },
                  automaticLayout: true,
                  tabSize: 2,
                }}
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-ink-4">
              <button type="button" className="btn-outline" onClick={() => setCreating(true)}><Plus size={16} /> Create a file</button>
            </div>
          )}

          {panel && (
            <div className="flex h-44 shrink-0 flex-col border-t border-line bg-white">
              <div className="flex items-center gap-1 border-b border-line px-2">
                {['output', 'input'].filter((t) => t === 'output' || !isPreview).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPanel(t)}
                    className={cx('border-b-2 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider', panel === t ? 'border-gblue text-gblue' : 'border-transparent text-ink-4 hover:text-ink-2')}
                  >
                    {t === 'output' ? (output?.kind === 'html' ? 'Preview' : 'Output') : 'Input'}
                  </button>
                ))}
                <div className="flex-1" />
                {panel === 'output' && output?.status && (
                  <span className={cx('chip mr-1', running ? 'bg-surface text-ink-3' : output.ok ? 'bg-ggreen-soft text-ggreen' : 'bg-gred-soft text-gred')}>{output.status}</span>
                )}
                <button type="button" className="icon-btn h-7 w-7" onClick={() => setPanel(null)} aria-label="Close panel"><X size={14} /></button>
              </div>
              {panel === 'input' ? (
                <textarea
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  placeholder="Text typed here is passed to the program's standard input (input(), Scanner, cin, scanf …)"
                  className="flex-1 resize-none px-4 py-2 font-mono text-xs outline-none placeholder:text-ink-5"
                  spellCheck={false}
                />
              ) : output?.kind === 'html' ? (
                <iframe title="Preview" sandbox="allow-scripts" srcDoc={output.html} className="w-full flex-1" />
              ) : (
                <pre className="flex-1 overflow-auto whitespace-pre-wrap px-4 py-2 font-mono text-xs leading-relaxed">
                  {output?.stdout && <span className="text-ink">{output.stdout}</span>}
                  {output?.stderr && <span className="text-gred">{output.stderr}</span>}
                  {!running && output && !output.stdout && !output.stderr && <span className="text-ink-4">(no output)</span>}
                  {!output && <span className="text-ink-4">Press Run or Ctrl+Enter.</span>}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="New file">
        <form onSubmit={createSnippet} className="space-y-4">
          <div>
            <label className="label" htmlFor="f-title">File name</label>
            <input id="f-title" className="field" value={newFile.title} onChange={(e) => setNewFile((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. api.js" autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="f-lang">Language</label>
            <select id="f-lang" className="field" value={newFile.language} onChange={(e) => setNewFile((f) => ({ ...f, language: e.target.value }))}>
              {LANGUAGES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-text" onClick={() => setCreating(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!newFile.title.trim()}>Create</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

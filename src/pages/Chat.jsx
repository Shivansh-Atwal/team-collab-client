import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FileText, Loader2, Paperclip, Send, X } from 'lucide-react';
import { errorMessage, wsApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import useSocketEvent from '../hooks/useSocketEvent.js';
import Avatar from '../components/ui/Avatar.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { ChatArt } from '../components/illustrations/Illustrations.jsx';
import { attachmentName, cx, dayLabel, formatTime, isImage, pageLabel } from '../lib/utils.js';

const GROUP_WINDOW = 5 * 60 * 1000;

function Attachment({ url }) {
  const name = attachmentName(url);
  if (isImage(name)) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-1 block">
        <img src={url} alt={name} className="max-h-60 max-w-xs rounded-lg border border-line object-cover" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" download className="mt-1 inline-flex max-w-xs items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink-2 hover:bg-surface">
      <FileText size={16} className="shrink-0 text-gblue" />
      <span className="truncate">{name}</span>
    </a>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { currentId, current, online } = useWorkspace();
  const toast = useToast();

  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [pending, setPending] = useState([]); // uploaded attachment URLs
  const [uploading, setUploading] = useState(false);
  const [typers, setTypers] = useState({}); // userId -> { name, until }

  const listRef = useRef(null);
  const stickToBottom = useRef(true);
  const typingTimer = useRef(null);
  const isTyping = useRef(false);
  const fileInput = useRef(null);

  useEffect(() => {
    if (!currentId) return;
    setLoading(true);
    wsApi(currentId)
      .get('/messages?limit=50')
      .then((d) => {
        setMessages(d.messages);
        setHasMore(d.hasMore);
        stickToBottom.current = true;
      })
      .finally(() => setLoading(false));
  }, [currentId]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, typers]);

  const onScroll = () => {
    const el = listRef.current;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const loadOlder = async () => {
    const el = listRef.current;
    const prevHeight = el.scrollHeight;
    const d = await wsApi(currentId).get(`/messages?limit=50&before=${encodeURIComponent(messages[0].timestamp)}`);
    stickToBottom.current = false;
    setMessages((m) => [...d.messages, ...m]);
    setHasMore(d.hasMore);
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight - prevHeight;
    });
  };

  useSocketEvent('receive_message', (msg) => {
    if (msg.workspace !== currentId) return;
    setMessages((m) => (m.some((x) => x._id === msg._id) ? m : [...m, msg]));
    setTypers((t) => {
      const next = { ...t };
      delete next[msg.sender._id];
      return next;
    });
  });

  useSocketEvent('typing', ({ workspaceId, user: u, isTyping: typing }) => {
    if (workspaceId !== currentId) return;
    setTypers((t) => {
      const next = { ...t };
      if (typing) next[u._id] = { name: u.name, until: Date.now() + 4000 };
      else delete next[u._id];
      return next;
    });
  });

  // Expire stale typing indicators (e.g. a teammate closed their tab mid-sentence)
  useEffect(() => {
    const id = setInterval(() => {
      setTypers((t) => {
        const now = Date.now();
        const entries = Object.entries(t).filter(([, v]) => v.until > now);
        return entries.length === Object.keys(t).length ? t : Object.fromEntries(entries);
      });
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const setTyping = (value) => {
    if (!socket || isTyping.current === value) return;
    isTyping.current = value;
    socket.emit('typing', { workspaceId: currentId, isTyping: value });
  };

  const onChange = (e) => {
    setText(e.target.value);
    setTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 2000);
  };

  const send = (e) => {
    e?.preventDefault();
    if (!socket || (!text.trim() && pending.length === 0)) return;
    const payload = { workspaceId: currentId, text, attachments: pending };
    stickToBottom.current = true;
    setText('');
    setPending([]);
    clearTimeout(typingTimer.current);
    setTyping(false);
    socket.emit('send_message', payload, (res) => {
      if (!res?.ok) {
        toast(res?.error || 'Message failed to send', { error: true });
        setText(payload.text);
        setPending(payload.attachments);
      }
    });
  };

  const onPickFiles = async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    try {
      for (const f of files) {
        const body = new FormData();
        body.append('file', f);
        const { file } = await wsApi(currentId).post('/files', body);
        setPending((p) => [...p, file.fileUrl]);
      }
    } catch (err) {
      toast(errorMessage(err), { error: true });
    } finally {
      setUploading(false);
    }
  };

  const typingNames = Object.values(typers).map((t) => t.name);

  return (
    <div className="flex h-full">
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-6 pb-3 pt-6 sm:px-10">
          <div>
            <h1 className="text-[22px] font-normal text-ink"># {current?.name?.toLowerCase().replace(/\s+/g, '-')}</h1>
            <p className="text-[13px] text-ink-4">{current?.members.length} members · {online.length} online</p>
          </div>
        </div>
        <div className="mx-6 border-b border-line sm:mx-10" />

        <div ref={listRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-6 py-4 sm:px-10">
          {hasMore && (
            <div className="mb-4 text-center">
              <button type="button" className="btn-text" onClick={loadOlder}>Load earlier messages</button>
            </div>
          )}
          {!loading && messages.length === 0 && (
            <EmptyState art={ChatArt} title="Say hello to your team" body="Messages sent here are delivered live to everyone in this workspace." />
          )}
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const newDay = !prev || new Date(prev.timestamp).toDateString() !== new Date(m.timestamp).toDateString();
            const grouped = !newDay && prev.sender._id === m.sender._id && new Date(m.timestamp) - new Date(prev.timestamp) < GROUP_WINDOW;
            const own = m.sender._id === user._id;
            return (
              <Fragment key={m._id}>
                {newDay && (
                  <div className="my-5 flex items-center gap-4">
                    <div className="h-px flex-1 bg-line" />
                    <span className="eyebrow text-ink-4">{dayLabel(m.timestamp)}</span>
                    <div className="h-px flex-1 bg-line" />
                  </div>
                )}
                <div className={cx('group flex gap-3 rounded-lg px-2 hover:bg-surface', grouped ? 'py-0.5' : 'mt-3 pt-1.5 pb-0.5')}>
                  <div className="w-9 shrink-0">{!grouped && <Avatar user={m.sender} size={36} />}</div>
                  <div className="min-w-0 flex-1">
                    {!grouped && (
                      <div className="flex items-baseline gap-2">
                        <span className={cx('text-sm font-medium', own ? 'text-gblue' : 'text-ink')}>{own ? 'You' : m.sender.name}</span>
                        <span className="text-[11px] text-ink-4">{formatTime(m.timestamp)}</span>
                      </div>
                    )}
                    {m.text && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-2">{m.text}</p>}
                    {m.attachments?.map((a) => <Attachment key={a} url={a} />)}
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>

        <div className="h-6 px-10 text-xs text-ink-4">
          {typingNames.length > 0 && (
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex gap-0.5">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-4" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-4" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-4" />
              </span>
              {typingNames.length === 1 ? `${typingNames[0]} is typing…` : `${typingNames.slice(0, 2).join(' and ')}${typingNames.length > 2 ? ' and others' : ''} are typing…`}
            </span>
          )}
        </div>

        <form onSubmit={send} className="px-6 pb-6 sm:px-10">
          <div className="rounded-3xl border border-line bg-white px-2 py-1.5 shadow-sm focus-within:border-gblue focus-within:shadow-card">
            {pending.length > 0 && (
              <div className="flex flex-wrap gap-2 px-3 pb-1 pt-2">
                {pending.map((p) => (
                  <span key={p} className="chip bg-gblue-soft text-gblue-dark">
                    {attachmentName(p)}
                    <button type="button" onClick={() => setPending((x) => x.filter((y) => y !== p))} aria-label="Remove attachment">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-end gap-1">
              <button type="button" className="icon-btn" onClick={() => fileInput.current.click()} aria-label="Attach files" disabled={uploading}>
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
              </button>
              <input ref={fileInput} type="file" multiple hidden onChange={onPickFiles} />
              <textarea
                rows={1}
                value={text}
                onChange={onChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) send(e);
                }}
                placeholder={`Message ${current?.name || ''}`}
                className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent py-2.5 text-sm outline-none placeholder:text-ink-5"
              />
              <button
                type="submit"
                className={cx('icon-btn', (text.trim() || pending.length) && 'text-gblue')}
                disabled={!text.trim() && pending.length === 0}
                aria-label="Send"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </form>
      </section>

      <aside className="hidden w-64 shrink-0 border-l border-line px-5 py-6 xl:block">
        <div className="eyebrow mb-3 text-ink-4">Members</div>
        <ul className="space-y-3">
          {current?.members.map((m) => {
            const presence = online.find((o) => o._id === m._id);
            const isOnline = !!presence;
            return (
              <li key={m._id} className="flex items-center gap-3">
                <Avatar user={m} size={30} online={isOnline} />
                <div className="min-w-0">
                  <div className="truncate text-sm text-ink">{m.name}{m._id === user._id && ' (you)'}</div>
                  <div className="text-[11px] text-ink-4">{isOnline ? `On ${pageLabel(presence.page)}` : 'Offline'} · {m.workspaceRole}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}

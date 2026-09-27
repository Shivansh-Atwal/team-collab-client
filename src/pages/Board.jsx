import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarClock, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { errorMessage, wsApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import useSocketEvent from '../hooks/useSocketEvent.js';
import PageHeader from '../components/PageHeader.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import Modal from '../components/ui/Modal.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { cx, formatDate } from '../lib/utils.js';

export const STATUSES = ['To Do', 'In Progress', 'Completed'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const COLUMN_STYLE = {
  'To Do': { bar: 'bg-ink-5', dot: 'bg-ink-5' },
  'In Progress': { bar: 'bg-gorange', dot: 'bg-gorange' },
  Completed: { bar: 'bg-gblue', dot: 'bg-gblue' },
};
const PRIORITY_STYLE = {
  High: 'bg-gred-soft text-gred',
  Medium: 'bg-gyellow-soft text-[#b06000]',
  Low: 'bg-ggreen-soft text-ggreen',
};

export function PriorityChip({ priority }) {
  return <span className={cx('chip', PRIORITY_STYLE[priority])}>{priority}</span>;
}

const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

function TaskModal({ open, task, initialStatus, members, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      title: task?.title || '',
      description: task?.description || '',
      assignee: task?.assignee?._id || '',
      priority: task?.priority || 'Medium',
      status: task?.status || initialStatus || 'To Do',
      dueDate: toDateInput(task?.dueDate),
    });
  }, [open, task, initialStatus]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      await onSave({ ...form, assignee: form.assignee || null, dueDate: form.dueDate || null });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={task ? 'Edit task' : 'New task'}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="t-title">Title</label>
          <input id="t-title" className="field" value={form.title || ''} onChange={set('title')} autoFocus placeholder="What needs to be done?" />
        </div>
        <div>
          <label className="label" htmlFor="t-desc">Description</label>
          <textarea id="t-desc" rows={3} className="field resize-none" value={form.description || ''} onChange={set('description')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="t-assignee">Assignee</label>
            <select id="t-assignee" className="field" value={form.assignee || ''} onChange={set('assignee')}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="t-due">Due date</label>
            <input id="t-due" type="date" className="field" value={form.dueDate || ''} onChange={set('dueDate')} />
          </div>
          <div>
            <label className="label" htmlFor="t-priority">Priority</label>
            <select id="t-priority" className="field" value={form.priority} onChange={set('priority')}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="t-status">Status</label>
            <select id="t-status" className="field" value={form.status} onChange={set('status')}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          {task ? (
            <button type="button" className="btn-text text-gred hover:bg-gred-soft" onClick={() => onDelete(task).then(onClose)}>
              <Trash2 size={16} /> Delete
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" className="btn-text" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={busy || !form.title?.trim()}>{task ? 'Save' : 'Create task'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function TaskCard({ task, onOpen, onDragStart, onMove }) {
  const overdue = task.dueDate && task.status !== 'Completed' && new Date(task.dueDate) < new Date(new Date().toDateString());
  // One-tap status change: works on touch screens where drag-and-drop is unavailable
  const next = task.status === 'Completed' ? 'To Do' : STATUSES[STATUSES.indexOf(task.status) + 1];
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(task)}
      className="group block w-full cursor-grab rounded-lg border border-line bg-white p-4 text-left transition-shadow hover:shadow-lift active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={cx('text-sm font-medium leading-snug text-ink', task.status === 'Completed' && 'text-ink-4 line-through')}>{task.title}</h3>
        <PriorityChip priority={task.priority} />
      </div>
      {task.description && <p className="mt-1.5 line-clamp-2 text-xs text-ink-4">{task.description}</p>}
      <div className="mt-4 flex items-center justify-between">
        {task.dueDate ? (
          <span className={cx('inline-flex items-center gap-1 text-xs', overdue ? 'font-medium text-gred' : 'text-ink-4')}>
            <CalendarClock size={13} /> {formatDate(task.dueDate, { month: 'short', day: 'numeric' })}
          </span>
        ) : <span />}
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMove(task._id, next);
            }}
            className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-3 hover:border-gblue hover:text-gblue md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
            title={`Move to ${next}`}
          >
            {next === 'To Do' ? <RotateCcw size={11} /> : <ArrowRight size={11} />} {next === 'To Do' ? 'Reopen' : next}
          </button>
          {task.assignee ? <Avatar user={task.assignee} size={24} /> : <span className="text-[11px] text-ink-5">Unassigned</span>}
        </span>
      </div>
    </div>
  );
}

export default function Board() {
  const { user } = useAuth();
  const { currentId, current } = useWorkspace();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState({ open: false });
  const [dragOver, setDragOver] = useState(null);
  const query = params.get('q') || '';

  useEffect(() => {
    if (currentId) wsApi(currentId).get('/tasks').then((d) => setTasks(d.tasks));
  }, [currentId]);

  // Applied both for our own REST responses and for teammates' socket broadcasts (idempotent)
  const apply = ({ action, task, taskId }) =>
    setTasks((list) => {
      if (action === 'deleted') return list.filter((t) => t._id !== taskId);
      const exists = list.some((t) => t._id === task._id);
      return exists ? list.map((t) => (t._id === task._id ? task : t)) : [task, ...list];
    });

  useSocketEvent('task_updated', (payload) => {
    if (payload.workspaceId === currentId) apply(payload);
  });

  const api = wsApi(currentId);
  const save = async (data) => {
    try {
      const { task } = modal.task ? await api.patch(`/tasks/${modal.task._id}`, data) : await api.post('/tasks', data);
      apply({ action: 'upsert', task });
    } catch (err) {
      toast(errorMessage(err), { error: true });
      throw err;
    }
  };
  const remove = async (task) => {
    try {
      await api.del(`/tasks/${task._id}`);
      apply({ action: 'deleted', taskId: task._id });
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  };

  const moveTo = async (taskId, status) => {
    const task = tasks.find((t) => t._id === taskId);
    if (!task || task.status === status) return;
    setTasks((list) => list.map((t) => (t._id === taskId ? { ...t, status } : t))); // optimistic
    try {
      await api.patch(`/tasks/${taskId}`, { status });
    } catch (err) {
      setTasks((list) => list.map((t) => (t._id === taskId ? task : t)));
      toast(errorMessage(err), { error: true });
    }
  };

  const visible = useMemo(() => {
    const q = query.toLowerCase();
    return tasks.filter((t) => {
      if (filter === 'mine' && t.assignee?._id !== user._id) return false;
      if (filter !== 'all' && filter !== 'mine' && t.assignee?._id !== filter) return false;
      return !q || t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
    });
  }, [tasks, filter, query, user._id]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Task board" sub="Drag cards, or tap the move button — changes sync live">
        <select className="field h-9 w-auto py-0" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by assignee">
          <option value="all">Everyone</option>
          <option value="mine">Assigned to me</option>
          {current?.members.filter((m) => m._id !== user._id).map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
        </select>
        <button type="button" className="btn-primary" onClick={() => setModal({ open: true })}>
          <Plus size={16} /> New task
        </button>
      </PageHeader>

      {query && (
        <div className="mx-6 mb-3 flex items-center gap-2 text-sm text-ink-3 sm:mx-10">
          <Search size={14} /> Showing results for “{query}”
          <button type="button" className="icon-btn h-7 w-7" onClick={() => setParams({})} aria-label="Clear search"><X size={14} /></button>
        </div>
      )}

      {/* Phones: swipe between columns. Tablets/desktop: three columns side by side */}
      <div className="flex min-h-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 sm:px-10 md:grid md:grid-cols-3 md:gap-5 md:overflow-x-visible md:pb-8">
        {STATUSES.map((status) => {
          const col = visible.filter((t) => t.status === status);
          return (
            <section
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(status);
              }}
              onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                moveTo(e.dataTransfer.getData('text/plain'), status);
              }}
              className={cx('flex min-h-0 w-[86%] shrink-0 snap-center flex-col rounded-xl bg-surface transition-colors sm:w-[60%] md:w-auto', dragOver === status && 'bg-gblue-soft ring-2 ring-gblue/40')}
            >
              <div className={cx('h-1 rounded-t-xl', COLUMN_STYLE[status].bar)} />
              <header className="flex items-center justify-between px-4 py-3">
                <h2 className="flex items-center gap-2 text-sm font-medium text-ink">
                  <span className={cx('h-2 w-2 rounded-full', COLUMN_STYLE[status].dot)} /> {status}
                  <span className="text-ink-4">{col.length}</span>
                </h2>
                <button type="button" className="icon-btn h-8 w-8" onClick={() => setModal({ open: true, status })} aria-label={`Add task to ${status}`}>
                  <Plus size={16} />
                </button>
              </header>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-4">
                {col.map((t) => (
                  <TaskCard
                    key={t._id}
                    task={t}
                    onOpen={(task) => setModal({ open: true, task })}
                    onMove={moveTo}
                    onDragStart={(e, task) => {
                      e.dataTransfer.setData('text/plain', task._id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                  />
                ))}
                {col.length === 0 && <p className="rounded-lg border border-dashed border-line py-8 text-center text-xs text-ink-4">Drop tasks here</p>}
              </div>
            </section>
          );
        })}
      </div>

      <TaskModal
        open={modal.open}
        task={modal.task}
        initialStatus={modal.status}
        members={current?.members || []}
        onClose={() => setModal({ open: false })}
        onSave={save}
        onDelete={remove}
      />
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Code2, FolderOpen, Home, KanbanSquare, LayoutDashboard, MessageSquare, PenTool, Plus, Users } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { AvatarStack } from '../ui/Avatar.jsx';
import TeamActivity from '../TeamActivity.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import CreateWorkspaceModal from '../CreateWorkspaceModal.jsx';
import { cx } from '../../lib/utils.js';

export const NAV = [
  { to: '', key: 'overview', label: 'Overview', icon: Home, end: true },
  { to: 'chat', label: 'Chat', icon: MessageSquare },
  { to: 'board', label: 'Task board', icon: KanbanSquare },
  { to: 'files', label: 'Files', icon: FolderOpen },
  { to: 'canvas', label: 'Design canvas', icon: PenTool },
  { to: 'code', label: 'Code editor', icon: Code2 },
  { to: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: 'members', label: 'Members', icon: Users },
];

function WorkspaceSwitcher() {
  const { workspaces, current } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="relative px-3" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-left hover:bg-surface"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gblue text-sm font-medium text-white">
          {(current?.name || '?')[0].toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{current?.name || 'Select workspace'}</span>
          <span className="block text-[11px] text-ink-4">{current ? `${current.members.length} members · ${current.myRole}` : 'No workspace'}</span>
        </span>
        <ChevronDown size={16} className="text-ink-4" />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full z-40 mt-1 rounded-lg border border-line bg-white py-2 shadow-float">
          <div className="px-4 pb-1 pt-1 eyebrow text-ink-4">Workspaces</div>
          <div className="max-h-64 overflow-auto">
            {workspaces.map((w) => (
              <button
                key={w._id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate(`/w/${w._id}`);
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-surface"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded bg-gblue-soft text-xs font-medium text-gblue">{w.name[0].toUpperCase()}</span>
                <span className="flex-1 truncate">{w.name}</span>
                {w._id === current?._id && <Check size={16} className="text-gblue" />}
              </button>
            ))}
          </div>
          <div className="mt-1 border-t border-line pt-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setCreating(true);
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gblue hover:bg-gblue-soft/50"
            >
              <Plus size={16} /> New workspace
            </button>
          </div>
        </div>
      )}
      <CreateWorkspaceModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

export default function Sidebar({ open, onClose }) {
  const { currentId, online } = useWorkspace();
  const { user } = useAuth();
  // Teammates (not you) on each page, shown as tiny avatars next to the nav item
  const onPage = (key) => online.filter((u) => u._id !== user._id && u.page === key);

  return (
    <>
      {open && <div className="fixed inset-0 z-20 bg-black/20 lg:hidden" onClick={onClose} />}
      <aside
        className={cx(
          'z-30 flex w-64 shrink-0 flex-col bg-white py-4 transition-all duration-200',
          'fixed bottom-0 left-0 top-16 lg:static',
          open ? 'translate-x-0 shadow-float lg:shadow-none' : '-translate-x-full lg:-ml-64'
        )}
      >
        <WorkspaceSwitcher />
        {currentId && (
          <nav className="mt-4 flex-1 space-y-0.5 overflow-auto pr-3">
            {NAV.map(({ to, key, label, icon: Icon, end }) => (
              <NavLink
                key={label}
                to={`/w/${currentId}${to ? `/${to}` : ''}`}
                end={end}
                className={({ isActive }) =>
                  cx(
                    'flex h-10 items-center gap-4 rounded-r-full pl-6 text-sm transition-colors',
                    isActive ? 'bg-gblue-soft font-medium text-gblue-dark' : 'text-ink-2 hover:bg-surface'
                  )
                }
              >
                <Icon size={18} strokeWidth={1.8} />
                <span className="flex-1">{label}</span>
                {onPage(key || to).length > 0 && (
                  <span className="mr-3" title={onPage(key || to).map((u) => u.name).join(', ')}>
                    <AvatarStack users={onPage(key || to)} max={3} size={18} />
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        )}
        {currentId && online.length > 0 && (
          <div className="mx-3 mt-3 border-t border-line pt-3">
            <div className="eyebrow mb-1 px-2 text-ink-4">{online.length} online · where they are</div>
            <div className="max-h-48 overflow-y-auto">
              <TeamActivity compact />
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

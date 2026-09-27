import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, LogOut, Menu, Search, Settings } from 'lucide-react';
import Logo from '../ui/Logo.jsx';
import Avatar from '../ui/Avatar.jsx';
import Modal from '../ui/Modal.jsx';
import CallButton from '../call/CallButton.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useSocket } from '../../context/SocketContext.jsx';

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const { currentId } = useWorkspace();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const onSearch = (e) => {
    e.preventDefault();
    if (!currentId) return;
    navigate(`/w/${currentId}/board${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`);
  };

  return (
    <header className="relative z-30 shrink-0 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center gap-2 px-3 sm:px-5">
        <button type="button" className="icon-btn" onClick={onMenu} aria-label="Toggle navigation">
          <Menu size={20} />
        </button>
        <div className="ml-1 sm:ml-3">
          <Logo to={currentId ? `/w/${currentId}` : '/'} />
        </div>

        <div className="flex-1" />

        {currentId && (
          <form onSubmit={onSearch} className="hidden items-center gap-2 text-ink-4 md:flex">
            <Search size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks"
              className="w-44 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-5 lg:w-56"
            />
          </form>
        )}

        <CallButton />
        <span
          className={`hidden h-2 w-2 rounded-full sm:inline-block ${connected ? 'bg-ggreen-light' : 'bg-gyellow'}`}
          title={connected ? 'Live: connected' : 'Reconnecting…'}
        />
        {currentId && (
          <button type="button" className="icon-btn" onClick={() => navigate(`/w/${currentId}/members`)} aria-label="Workspace settings">
            <Settings size={19} />
          </button>
        )}
        <button type="button" className="icon-btn" onClick={() => setHelpOpen(true)} aria-label="Help">
          <HelpCircle size={19} />
        </button>

        <div className="relative" ref={menuRef}>
          <button type="button" onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-3 rounded-full py-1 pl-3 pr-1 hover:bg-black/5">
            <span className="hidden text-[13px] font-medium text-ink-2 sm:inline">{user?.name}</span>
            <Avatar user={user} size={32} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 w-72 rounded-2xl border border-line bg-white p-4 shadow-float">
              <div className="flex flex-col items-center gap-2 pb-4 text-center">
                <Avatar user={user} size={64} />
                <div className="text-base text-ink">{user?.name}</div>
                <div className="text-xs text-ink-3">{user?.email}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="btn-outline w-full"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="mx-5 border-b border-line sm:mx-14" />

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="TeamCollab help">
        <ul className="space-y-3 text-sm text-ink-2">
          <li><b>Chat</b> — messages sync live for everyone in the workspace. Attach files with the clip icon.</li>
          <li><b>Board</b> — drag cards between columns to change status. Changes appear instantly for teammates.</li>
          <li><b>Canvas</b> — pick a shape tool and click to place it. Use the connector tool, then click two shapes to link them. Double-click to edit labels, Delete to remove.</li>
          <li><b>Code</b> — every workspace member edits the same files live; colored cursors show where others are.</li>
          <li><b>Video call</b> — the camera button in the top bar starts a call and everyone in the team gets a pop-up to join. Dock the call to the side (or float it) and keep working on any page.</li>
          <li><b>Settings</b> (gear icon) — invite teammates by email and set Admin / Member roles.</li>
        </ul>
      </Modal>
    </header>
  );
}

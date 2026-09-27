import { Link } from 'react-router-dom';
import { Video } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { useCall } from '../context/CallContext.jsx';
import Avatar from './ui/Avatar.jsx';
import { cx, pageLabel } from '../lib/utils.js';

// Who is online right now, which page they are working on, and whether they are in the call
export default function TeamActivity({ compact = false, className = '' }) {
  const { user } = useAuth();
  const { online, currentId } = useWorkspace();
  const { callStates } = useCall();
  const inCall = new Set((callStates[currentId]?.participants || []).map((p) => p.user._id));
  const people = [...online].sort((a, b) => (a._id === user._id ? -1 : b._id === user._id ? 1 : a.name.localeCompare(b.name)));

  if (!people.length) return <p className={cx('text-xs text-ink-4', className)}>Nobody else is online.</p>;

  return (
    <ul className={cx(compact ? 'space-y-1' : 'divide-y divide-line', className)}>
      {people.map((p) => {
        const me = p._id === user._id;
        return (
          <li key={p._id}>
            <Link
              to={`/w/${currentId}${p.page && p.page !== 'overview' ? `/${p.page}` : ''}`}
              className={cx('flex items-center gap-3 rounded-lg hover:bg-surface', compact ? 'px-2 py-1.5' : 'px-4 py-2.5')}
              title={me ? 'You' : `Go to ${pageLabel(p.page)}`}
            >
              <Avatar user={p} size={compact ? 26 : 32} online />
              <span className="min-w-0 flex-1">
                <span className={cx('block truncate text-ink', compact ? 'text-[13px]' : 'text-sm')}>{me ? `${p.name} (you)` : p.name}</span>
                <span className="block truncate text-[11px] text-ink-4">
                  on <span className="text-ink-3">{pageLabel(p.page)}</span>
                </span>
              </span>
              {inCall.has(p._id) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-ggreen-soft px-1.5 py-0.5 text-[10px] font-medium text-ggreen" title="In the video call">
                  <Video size={11} /> {!compact && 'In call'}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

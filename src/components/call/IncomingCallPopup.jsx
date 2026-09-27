import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, Loader2, Video, X } from 'lucide-react';
import { useCall } from '../../context/CallContext.jsx';
import Avatar from '../ui/Avatar.jsx';
import { timeAgo } from '../../lib/utils.js';

// Pop-up delivered over Socket.IO to every member of the team when a call starts
export default function IncomingCallPopup() {
  const { invites, join, joining, dismissInvite } = useCall();
  const navigate = useNavigate();
  const [notifPerm, setNotifPerm] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'));

  if (!invites.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-[60] flex flex-col gap-3 sm:inset-x-auto sm:right-5 sm:top-20 sm:w-[380px]" role="alert">
      {invites.map((inv) => (
        <div key={inv.workspaceId} className="pointer-events-auto overflow-hidden rounded-2xl border border-line bg-white shadow-float">
          <div className="h-1 w-full bg-gradient-to-r from-[#4285f4] via-[#34a853] to-[#fbbc04]" />
          <div className="flex items-start gap-3 p-4">
            <span className="relative mt-0.5 flex shrink-0">
              <span className="absolute inset-0 animate-ping rounded-full bg-ggreen-light/40" />
              <Avatar user={inv.from} size={44} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">
                <b className="font-medium">{inv.from?.name}</b> {inv.quiet ? 'is in a video call' : 'started a video call'}
              </p>
              <p className="mt-0.5 truncate text-xs text-ink-4">
                {inv.workspaceName} · {timeAgo(inv.startedAt)}
              </p>
            </div>
            <button type="button" className="icon-btn -mr-2 -mt-2 h-8 w-8" onClick={() => dismissInvite(inv.workspaceId)} aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center justify-between gap-2 px-4 pb-4">
            {notifPerm === 'default' ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-gblue hover:underline"
                onClick={() => Notification.requestPermission().then(setNotifPerm)}
              >
                <BellRing size={13} /> Alert me in other tabs
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" className="btn-text text-ink-3" onClick={() => dismissInvite(inv.workspaceId)}>
                Not now
              </button>
              <button
                type="button"
                className="btn bg-ggreen text-white hover:bg-[#137333]"
                disabled={joining}
                onClick={() => {
                  navigate(`/w/${inv.workspaceId}`);
                  join(inv.workspaceId);
                }}
              >
                {joining ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />} Join
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

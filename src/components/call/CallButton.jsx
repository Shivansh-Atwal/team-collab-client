import { Loader2, Video } from 'lucide-react';
import { useCall } from '../../context/CallContext.jsx';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import useMediaQuery from '../../hooks/useMediaQuery.js';
import { AvatarStack } from '../ui/Avatar.jsx';

// Top-bar entry point: start a call, join the running one, or bring your call back into view
export default function CallButton() {
  const { currentId } = useWorkspace();
  const { call, callStates, join, joining, view, setView } = useCall();
  const desktop = useMediaQuery('(min-width: 1024px)');
  if (!currentId) return null;

  if (call) {
    return (
      <button
        type="button"
        onClick={() => setView(view === 'full' ? (desktop ? 'docked' : 'floating') : desktop && view === 'floating' ? 'docked' : 'full')}
        className="inline-flex h-9 items-center gap-2 rounded-full bg-ggreen-soft px-3 text-[13px] font-medium text-ggreen hover:bg-[#ceead6]"
        title="Show call"
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-ggreen" />
        <span className="hidden sm:inline">In call</span>
      </button>
    );
  }

  const state = callStates[currentId];
  if (state?.active) {
    return (
      <button type="button" onClick={() => join(currentId)} disabled={joining} className="inline-flex h-9 items-center gap-2 rounded-full bg-ggreen px-3 text-[13px] font-medium text-white hover:bg-[#137333]">
        {joining ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
        <span className="hidden sm:inline">Join call</span>
        <span className="hidden md:block">
          <AvatarStack users={state.participants.map((p) => p.user)} max={3} size={20} />
        </span>
      </button>
    );
  }

  return (
    <button type="button" className="icon-btn" onClick={() => join(currentId)} disabled={joining} aria-label="Start a video call" title="Start a video call with your team">
      {joining ? <Loader2 size={19} className="animate-spin" /> : <Video size={20} />}
    </button>
  );
}

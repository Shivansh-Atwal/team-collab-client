import { useEffect, useRef, useState } from 'react';
import { Maximize2, Mic, MicOff, Minimize2, MonitorUp, PanelRight, PhoneOff, PictureInPicture2, Users, Video, VideoOff } from 'lucide-react';
import { useCall } from '../../context/CallContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import useMediaQuery from '../../hooks/useMediaQuery.js';
import VideoTile from './VideoTile.jsx';
import { cx } from '../../lib/utils.js';

function useElapsed(startedAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - (startedAt || now)) / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Plays every remote participant's audio, independent of which tiles are visible
export function CallAudio() {
  const { peers } = useCall();
  return (
    <div className="hidden">
      {peers.map((p) => (
        <PeerAudio key={p.socketId} stream={p.stream} />
      ))}
    </div>
  );
}
function PeerAudio({ stream }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay />;
}

function useTiles() {
  const { user } = useAuth();
  const { media, selfStream, peers } = useCall();
  const self = {
    id: 'self',
    stream: selfStream,
    user,
    label: media.screen ? 'You (presenting)' : 'You',
    videoOn: media.video || media.screen,
    audioOn: media.audio,
    mirrored: !media.screen,
    presenting: media.screen,
  };
  const others = peers.map((p) => ({
    id: p.socketId,
    stream: p.stream,
    user: p.user,
    label: p.user?.name,
    videoOn: p.video || p.screen,
    audioOn: p.audio,
    presenting: p.screen,
    connecting: p.state !== 'connected',
  }));
  // Spotlight: whoever presents, else the first other person, else yourself
  const spotlight = others.find((t) => t.presenting) || (self.presenting ? self : others[0]) || self;
  return { self, others, all: [self, ...others], spotlight };
}

function Controls({ size = 'md', extra = null }) {
  const { media, toggleMic, toggleCam, toggleScreen, leave } = useCall();
  const btn = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  const icon = size === 'sm' ? 16 : 20;
  const round = (on, danger) =>
    cx('inline-flex items-center justify-center rounded-full transition-colors disabled:opacity-40', btn, danger ? 'bg-[#ea4335] text-white hover:bg-[#d93025]' : on ? 'bg-[#3c4043] text-white hover:bg-[#4a4e51]' : 'bg-[#f28b82] text-[#202124] hover:bg-[#f6aea9]');
  return (
    <div className="flex items-center justify-center gap-2">
      <button type="button" className={round(media.audio)} onClick={toggleMic} disabled={!media.hasAudio} aria-label={media.audio ? 'Mute microphone' : 'Unmute microphone'} title={media.hasAudio ? 'Microphone' : 'No microphone'}>
        {media.audio ? <Mic size={icon} /> : <MicOff size={icon} />}
      </button>
      <button type="button" className={round(media.video)} onClick={toggleCam} disabled={!media.hasVideo} aria-label={media.video ? 'Turn camera off' : 'Turn camera on'} title={media.hasVideo ? 'Camera' : 'No camera'}>
        {media.video ? <Video size={icon} /> : <VideoOff size={icon} />}
      </button>
      <button
        type="button"
        className={cx(round(true), 'hidden sm:inline-flex', media.screen && '!bg-[#8ab4f8] !text-[#202124]')}
        onClick={toggleScreen}
        aria-label={media.screen ? 'Stop presenting' : 'Present screen'}
        title={media.screen ? 'Stop presenting' : 'Present your screen'}
      >
        <MonitorUp size={icon} />
      </button>
      {extra}
      <button type="button" className={cx(round(true, true), size === 'sm' ? 'w-12' : 'w-14')} onClick={leave} aria-label="Leave call" title="Leave call">
        <PhoneOff size={icon} />
      </button>
    </div>
  );
}

function HeaderButton({ onClick, label, children }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#e8eaed] hover:bg-white/10" aria-label={label} title={label}>
      {children}
    </button>
  );
}

/* ------------------------------ docked (side) ------------------------------ */
function Docked() {
  const { call, setView } = useCall();
  const { all } = useTiles();
  const elapsed = useElapsed(call.startedAt);
  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-l border-line bg-[#202124] text-white xl:w-[360px]">
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#34a853]" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{call.workspaceName}</div>
          <div className="text-[11px] text-[#9aa0a6]">{elapsed} · {all.length} in call</div>
        </div>
        <HeaderButton onClick={() => setView('floating')} label="Pop out (floating)"><PictureInPicture2 size={16} /></HeaderButton>
        <HeaderButton onClick={() => setView('full')} label="Full screen"><Maximize2 size={16} /></HeaderButton>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {all.map((t) => (
          <VideoTile key={t.id} {...t} className="aspect-video w-full" />
        ))}
      </div>
      <div className="border-t border-white/10 px-3 py-3">
        <Controls />
      </div>
    </aside>
  );
}

/* -------------------------------- floating -------------------------------- */
function Floating({ canDock }) {
  const { call, setView } = useCall();
  const { self, others, all, spotlight } = useTiles();
  const elapsed = useElapsed(call.startedAt);
  const [pos, setPos] = useState(null); // { x, y } from top-left; null = default corner
  const drag = useRef(null);
  const box = useRef(null);

  const onPointerDown = (e) => {
    if (e.target.closest('button')) return;
    const r = box.current.getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const r = box.current.getBoundingClientRect();
    setPos({
      x: Math.min(Math.max(8, e.clientX - drag.current.dx), window.innerWidth - r.width - 8),
      y: Math.min(Math.max(8, e.clientY - drag.current.dy), window.innerHeight - r.height - 8),
    });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div
      ref={box}
      className="fixed z-40 w-[220px] overflow-hidden rounded-2xl bg-[#202124] text-white shadow-float sm:w-[300px]"
      style={pos ? { left: pos.x, top: pos.y } : { right: 16, bottom: 16 }}
    >
      <div className="flex cursor-move touch-none items-center gap-1.5 px-3 py-2 select-none" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#34a853]" />
        <span className="flex-1 truncate text-xs">{elapsed}</span>
        <span className="inline-flex items-center gap-1 text-[11px] text-[#9aa0a6]"><Users size={12} /> {all.length}</span>
        {canDock && <HeaderButton onClick={() => setView('docked')} label="Dock to the side"><PanelRight size={15} /></HeaderButton>}
        <HeaderButton onClick={() => setView('full')} label="Full screen"><Maximize2 size={15} /></HeaderButton>
      </div>
      <div className="relative px-2">
        <VideoTile {...spotlight} compact className="aspect-video w-full" />
        {spotlight.id !== 'self' && (
          <div className="absolute bottom-2 right-4 w-[34%] overflow-hidden rounded-lg border border-[#202124] shadow-lg">
            <VideoTile {...self} compact label="You" className="aspect-video w-full" />
          </div>
        )}
      </div>
      {others.length > 1 && <div className="px-3 pt-1.5 text-[11px] text-[#9aa0a6]">+{others.length - 1} more · expand to see everyone</div>}
      <div className="px-2 py-2.5">
        <Controls size="sm" />
      </div>
    </div>
  );
}

/* ------------------------------- full screen ------------------------------- */
function Full({ canDock }) {
  const { call, setView } = useCall();
  const { all } = useTiles();
  const elapsed = useElapsed(call.startedAt);
  const cols = all.length <= 1 ? 'grid-cols-1' : all.length <= 4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 lg:grid-cols-3';
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#202124] text-white">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#34a853]" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-base">{call.workspaceName}</div>
          <div className="text-xs text-[#9aa0a6]">{elapsed} · {all.length} in call</div>
        </div>
        <button type="button" className="btn border border-white/20 text-white hover:bg-white/10" onClick={() => setView(canDock ? 'docked' : 'floating')}>
          <Minimize2 size={16} /> <span className="hidden sm:inline">Keep working</span>
        </button>
      </div>
      <div className={cx('grid min-h-0 flex-1 auto-rows-fr gap-2 overflow-auto px-2 sm:gap-3 sm:px-6', cols)}>
        {all.map((t) => (
          <VideoTile key={t.id} {...t} className="min-h-[140px] w-full" />
        ))}
      </div>
      <div className="px-4 py-4 sm:py-5">
        <Controls />
      </div>
    </div>
  );
}

// Rendered inside the layout's content row so the docked panel sits next to the page
export function CallDock() {
  const { call, view } = useCall();
  const desktop = useMediaQuery('(min-width: 1024px)');
  if (!call || view !== 'docked' || !desktop) return null;
  return <Docked />;
}

export function CallOverlay() {
  const { call, view } = useCall();
  const desktop = useMediaQuery('(min-width: 1024px)');
  if (!call) return null;
  if (view === 'full') return <Full canDock={desktop} />;
  if (view === 'floating' || !desktop) return <Floating canDock={desktop} />;
  return null;
}

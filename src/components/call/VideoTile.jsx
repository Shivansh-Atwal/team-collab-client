import { useEffect, useRef } from 'react';
import { Loader2, MicOff, MonitorUp } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import { cx } from '../../lib/utils.js';

// One participant. Video is always muted here: audio plays through <CallAudio/> so it
// keeps working even when a tile is not on screen (floating mode shows only one tile).
export default function VideoTile({ stream, user, label, videoOn, audioOn, mirrored, presenting, connecting, compact = false, className = '' }) {
  const ref = useRef(null);
  const hasVideo = videoOn && stream?.getVideoTracks().some((t) => t.readyState === 'live');

  useEffect(() => {
    const el = ref.current;
    if (el && el.srcObject !== stream) el.srcObject = stream || null;
  }, [stream, hasVideo]);

  return (
    <div className={cx('relative overflow-hidden rounded-xl bg-[#3c4043]', className)}>
      <video
        ref={ref}
        autoPlay
        playsInline
        muted
        className={cx('h-full w-full', presenting ? 'object-contain bg-black' : 'object-cover', mirrored && 'scale-x-[-1]', !hasVideo && 'invisible')}
      />
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Avatar user={user} size={compact ? 40 : 64} />
        </div>
      )}
      {connecting && (
        <div className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white" title="Connecting…">
          <Loader2 size={14} className="animate-spin" />
        </div>
      )}
      <div className="absolute bottom-1.5 left-1.5 flex max-w-[calc(100%-12px)] items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] text-white">
        {!audioOn && <MicOff size={12} className="shrink-0 text-[#f28b82]" />}
        {presenting && <MonitorUp size={12} className="shrink-0" />}
        <span className="truncate">{label}</span>
      </div>
    </div>
  );
}

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSocket } from './SocketContext.jsx';
import { useAuth } from './AuthContext.jsx';
import { useWorkspace } from './WorkspaceContext.jsx';
import useSocketEvent from '../hooks/useSocketEvent.js';
import { useToast } from '../components/ui/Toast.jsx';

const CallContext = createContext(null);

const ICE_SERVERS = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
if (import.meta.env.VITE_TURN_URL) {
  ICE_SERVERS.push({ urls: import.meta.env.VITE_TURN_URL, username: import.meta.env.VITE_TURN_USERNAME, credential: import.meta.env.VITE_TURN_CREDENTIAL });
}
const INVITE_TTL = 45000;

// Short two-tone ring using Web Audio (no asset needed)
function ring() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = t ? 660 : 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.32);
    });
    setTimeout(() => ctx.close(), 1000);
  } catch {
    /* audio unavailable */
  }
}

async function getLocalMedia() {
  if (!navigator.mediaDevices?.getUserMedia) return { stream: null, reason: 'insecure' };
  const attempts = [{ audio: true, video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } }, { audio: true }, { video: true }];
  for (const constraints of attempts) {
    try {
      return { stream: await navigator.mediaDevices.getUserMedia(constraints) };
    } catch (err) {
      if (err.name === 'NotAllowedError') return { stream: null, reason: 'denied' };
    }
  }
  return { stream: null, reason: 'none' };
}

export function CallProvider({ children }) {
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  const { workspaces } = useWorkspace();
  const toast = useToast();

  const [call, setCall] = useState(null); // { workspaceId, workspaceName, startedAt }
  const [joining, setJoining] = useState(false);
  const [callStates, setCallStates] = useState({}); // workspaceId -> { active, participants, startedAt }
  const [invites, setInvites] = useState([]);
  const [view, setView] = useState(() => (window.innerWidth >= 1024 ? 'docked' : 'floating'));
  const [media, setMedia] = useState({ audio: false, video: false, screen: false, hasAudio: false, hasVideo: false });
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  const localStream = useRef(null); // camera + mic
  const screenTrack = useRef(null);
  const screenStream = useRef(null); // stable stream object for the local screen preview
  const peers = useRef(new Map()); // socketId -> { pc, stream, user, audio, video, screen, chain }
  const callRef = useRef(null);
  callRef.current = call;

  /* ------------------------------- WebRTC core ------------------------------ */
  const currentTrack = (kind) => {
    if (kind === 'video' && screenTrack.current) return screenTrack.current;
    return localStream.current?.getTracks().find((t) => t.kind === kind) || null;
  };

  const signal = useCallback((to, data) => socket?.emit('call:signal', { to, data }), [socket]);

  const closePeer = useCallback(
    (socketId) => {
      const p = peers.current.get(socketId);
      if (!p) return;
      p.pc.close();
      peers.current.delete(socketId);
      bump();
    },
    [bump]
  );

  const createPeer = useCallback(
    (socketId, meta, initiator) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const entry = { pc, stream: new MediaStream(), chain: Promise.resolve(), audio: true, video: true, screen: false, ...meta, state: 'connecting' };
      peers.current.set(socketId, entry);

      pc.onicecandidate = (e) => e.candidate && signal(socketId, { candidate: e.candidate });
      pc.ontrack = (e) => {
        entry.stream.getTracks().filter((t) => t.kind === e.track.kind).forEach((t) => entry.stream.removeTrack(t));
        entry.stream.addTrack(e.track);
        // new MediaStream object so <video>/<audio> elements re-bind
        entry.stream = new MediaStream(entry.stream.getTracks());
        bump();
      };
      pc.onconnectionstatechange = () => {
        entry.state = pc.connectionState;
        if (pc.connectionState === 'failed') pc.restartIce?.();
        bump();
      };

      if (initiator) {
        // Always negotiate both kinds (sendrecv) so tracks can be swapped later without renegotiation
        const msid = localStream.current || new MediaStream();
        ['audio', 'video'].forEach((kind) => pc.addTransceiver(currentTrack(kind) || kind, { direction: 'sendrecv', streams: [msid] }));
        entry.chain = entry.chain.then(async () => {
          await pc.setLocalDescription(await pc.createOffer());
          signal(socketId, { sdp: pc.localDescription });
        });
      }
      bump();
      return entry;
    },
    [signal, bump]
  );

  const handleSignal = useCallback(
    ({ from, user: u, data }) => {
      if (!callRef.current) return;
      const entry = peers.current.get(from) || createPeer(from, { user: u }, false);
      const { pc } = entry;
      // Serialise per peer so candidates never race ahead of the remote description
      entry.chain = entry.chain
        .then(async () => {
          if (data.sdp) {
            await pc.setRemoteDescription(data.sdp);
            if (data.sdp.type === 'offer') {
              await Promise.all(
                pc.getTransceivers().map((t) => {
                  t.direction = 'sendrecv';
                  return t.sender.replaceTrack(currentTrack(t.receiver.track.kind));
                })
              );
              await pc.setLocalDescription(await pc.createAnswer());
              signal(from, { sdp: pc.localDescription });
            }
          } else if (data.candidate) {
            await pc.addIceCandidate(data.candidate).catch(() => {});
          }
        })
        .catch((err) => console.warn('Call signalling error', err));
    },
    [createPeer, signal]
  );

  const replaceVideoEverywhere = (track) =>
    Promise.all(
      [...peers.current.values()].flatMap(({ pc }) =>
        pc.getTransceivers().filter((t) => t.receiver.track.kind === 'video').map((t) => t.sender.replaceTrack(track))
      )
    );

  const announce = useCallback((state) => socket?.emit('call:media', state), [socket]);

  /* --------------------------------- actions -------------------------------- */
  const teardown = useCallback(() => {
    peers.current.forEach(({ pc }) => pc.close());
    peers.current.clear();
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    screenTrack.current?.stop();
    screenTrack.current = null;
    screenStream.current = null;
    setMedia({ audio: false, video: false, screen: false, hasAudio: false, hasVideo: false });
    setCall(null);
  }, []);

  const leave = useCallback(() => {
    socket?.emit('call:leave');
    teardown();
  }, [socket, teardown]);

  const join = useCallback(
    async (workspaceId) => {
      if (!socket || joining) return;
      if (callRef.current?.workspaceId === workspaceId) return;
      if (callRef.current) leave();
      setJoining(true);
      setInvites((list) => list.filter((i) => i.workspaceId !== workspaceId));

      const { stream, reason } = await getLocalMedia();
      if (reason === 'insecure') toast('Camera and mic need HTTPS (or localhost). Joining to watch and listen only.', { error: true, duration: 6000 });
      if (reason === 'denied') toast('Camera/mic permission denied — you can still see and hear others.', { error: true, duration: 6000 });
      localStream.current = stream;
      const hasAudio = !!stream?.getAudioTracks().length;
      const hasVideo = !!stream?.getVideoTracks().length;

      socket.emit('call:join', { workspaceId, audio: hasAudio, video: hasVideo }, (res) => {
        setJoining(false);
        if (!res?.ok) {
          stream?.getTracks().forEach((t) => t.stop());
          localStream.current = null;
          toast(res?.error || 'Could not join the call', { error: true });
          return;
        }
        const ws = workspaces.find((w) => w._id === workspaceId);
        setCall({ workspaceId, workspaceName: ws?.name || 'Team call', startedAt: res.startedAt });
        setMedia({ audio: hasAudio, video: hasVideo, screen: false, hasAudio, hasVideo });
        callRef.current = { workspaceId };
        // We are the newcomer: open a connection to everybody already in the call
        res.peers.forEach((p) => createPeer(p.socketId, { user: p.user, audio: p.audio, video: p.video, screen: p.screen }, true));
      });
    },
    [socket, joining, leave, toast, workspaces, createPeer]
  );

  const toggleMic = useCallback(() => {
    const track = localStream.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMedia((m) => ({ ...m, audio: track.enabled }));
    announce({ audio: track.enabled });
  }, [announce]);

  const toggleCam = useCallback(() => {
    const track = localStream.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMedia((m) => ({ ...m, video: track.enabled }));
    announce({ video: track.enabled });
  }, [announce]);

  const stopScreen = useCallback(async () => {
    screenTrack.current?.stop();
    screenTrack.current = null;
    screenStream.current = null;
    await replaceVideoEverywhere(currentTrack('video'));
    setMedia((m) => ({ ...m, screen: false }));
    announce({ screen: false });
  }, [announce]);

  const toggleScreen = useCallback(async () => {
    if (screenTrack.current) return stopScreen();
    if (!navigator.mediaDevices?.getDisplayMedia) return toast('Screen sharing is not supported on this device', { error: true });
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const [track] = stream.getVideoTracks();
      screenTrack.current = track;
      screenStream.current = stream;
      track.onended = () => stopScreen();
      await replaceVideoEverywhere(track);
      setMedia((m) => ({ ...m, screen: true }));
      announce({ screen: true });
    } catch {
      /* user cancelled the picker */
    }
  }, [announce, stopScreen, toast]);

  const dismissInvite = useCallback((workspaceId) => setInvites((list) => list.filter((i) => i.workspaceId !== workspaceId)), []);

  /* ------------------------------ socket events ------------------------------ */
  useSocketEvent('call:signal', handleSignal);
  useSocketEvent('call:peer-joined', ({ socketId, ...meta }) => {
    if (!callRef.current) return;
    // The newcomer sends us an offer; create the (answering) connection now so their tile shows immediately
    const existing = peers.current.get(socketId);
    if (existing) Object.assign(existing, meta);
    else createPeer(socketId, meta, false);
    bump();
  });
  useSocketEvent('call:peer-left', ({ socketId }) => closePeer(socketId));
  useSocketEvent('call:media', ({ socketId, ...state }) => {
    const p = peers.current.get(socketId);
    if (p) Object.assign(p, state);
    bump();
  });

  useSocketEvent('call:state', (state) => {
    setCallStates((s) => ({ ...s, [state.workspaceId]: state }));
    if (!state.active) setInvites((list) => list.filter((i) => i.workspaceId !== state.workspaceId));
  });

  const addInvite = useCallback(
    (invite) => {
      if (invite.from?._id === user?._id || callRef.current?.workspaceId === invite.workspaceId) return;
      setInvites((list) => [...list.filter((i) => i.workspaceId !== invite.workspaceId), { ...invite, at: Date.now() }]);
      ring();
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`${invite.from.name} started a video call`, { body: `${invite.workspaceName} · click to open TeamCollab`, icon: '/logo.svg' });
        } catch {
          /* notifications unsupported */
        }
      }
    },
    [user]
  );
  useSocketEvent('call:incoming', addInvite);

  // Learn about calls already running (e.g. after login or reconnect) and invite the user to them
  useEffect(() => {
    if (!socket || !connected) return;
    workspaces.forEach((w) =>
      socket.emit('call:status', { workspaceId: w._id }, (state) => {
        if (!state) return;
        setCallStates((s) => ({ ...s, [w._id]: state }));
        if (state.active && !state.participants.some((p) => p.user._id === user?._id)) {
          addInvite({ workspaceId: w._id, workspaceName: w.name, from: state.startedBy, startedAt: state.startedAt, quiet: true });
        }
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, connected, workspaces.length]);

  // Server drops us from the call when the socket disconnects
  useEffect(() => {
    if (!connected && callRef.current) {
      teardown();
      toast('Connection lost — you left the call', { error: true });
    }
  }, [connected, teardown, toast]);

  // Expire unanswered invites
  useEffect(() => {
    if (!invites.length) return undefined;
    const t = setInterval(() => setInvites((list) => list.filter((i) => Date.now() - i.at < INVITE_TTL)), 3000);
    return () => clearInterval(t);
  }, [invites.length]);

  // Leave the call cleanly when the tab closes
  useEffect(() => {
    const onUnload = () => callRef.current && socket?.emit('call:leave');
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [socket]);

  const remotePeers = [...peers.current.entries()].map(([socketId, p]) => ({ socketId, ...p }));

  // Rebuilt every render on purpose: peer state lives in refs and `bump` triggers renders
  const value = {
    call,
    joining,
    callStates,
    invites,
    view,
    setView,
    media,
    localStream: localStream.current,
    selfStream: screenStream.current || localStream.current,
    peers: remotePeers,
    join,
    leave,
    toggleMic,
    toggleCam,
    toggleScreen,
    dismissInvite,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export const useCall = () => useContext(CallContext);

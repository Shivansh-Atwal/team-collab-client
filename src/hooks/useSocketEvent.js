import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext.jsx';

// Subscribe to a Socket.IO event; the latest handler is always used without re-subscribing.
export default function useSocketEvent(event, handler) {
  const { socket } = useSocket();
  const saved = useRef(handler);
  saved.current = handler;

  useEffect(() => {
    if (!socket) return undefined;
    const fn = (...args) => saved.current(...args);
    socket.on(event, fn);
    return () => socket.off(event, fn);
  }, [socket, event]);
}

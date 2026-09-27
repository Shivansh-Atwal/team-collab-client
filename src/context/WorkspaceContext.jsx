import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useSocket } from './SocketContext.jsx';
import { useAuth } from './AuthContext.jsx';
import useSocketEvent from '../hooks/useSocketEvent.js';
import { useToast } from '../components/ui/Toast.jsx';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState([]);

  const currentId = matchPath('/w/:workspaceId/*', pathname)?.params.workspaceId || null;
  // Which tool the user is on (reported to teammates via presence)
  const page = matchPath('/w/:workspaceId/:page/*', pathname)?.params.page || 'overview';
  const current = useMemo(() => workspaces.find((w) => w._id === currentId) || null, [workspaces, currentId]);

  const refresh = useCallback(async () => {
    const { data } = await api.get('/workspaces');
    setWorkspaces(data.workspaces);
    return data.workspaces;
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refresh]);

  const upsert = useCallback((ws) => {
    setWorkspaces((list) => {
      const idx = list.findIndex((w) => w._id === ws._id);
      if (idx === -1) return [ws, ...list];
      const next = [...list];
      // Server broadcasts omit myRole; keep ours
      next[idx] = { ...ws, myRole: ws.myRole ?? list[idx].myRole };
      return next;
    });
  }, []);

  const createWorkspace = useCallback(
    async (name, description) => {
      const { data } = await api.post('/workspaces', { name, description });
      upsert(data.workspace);
      return data.workspace;
    },
    [upsert]
  );

  // Join the socket room for the workspace in the URL (and re-join after reconnects)
  useEffect(() => {
    if (!socket || !connected || !currentId) {
      setOnline([]);
      return undefined;
    }
    socket.emit('join_workspace', { workspaceId: currentId, page }, (res) => {
      if (res?.ok) setOnline(res.online);
    });
    return undefined;
    // page changes are reported separately below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, connected, currentId]);

  useEffect(() => {
    if (socket && connected && currentId) socket.emit('presence_page', { workspaceId: currentId, page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useSocketEvent('presence_update', ({ workspaceId, online: list }) => {
    if (workspaceId === currentId) setOnline(list);
  });

  useSocketEvent('members_updated', ({ workspace }) => {
    if (!workspace) return;
    // Our own role may have changed: recompute it from the members list
    const myRole = workspace.members.find((m) => m._id === user?._id)?.workspaceRole;
    setWorkspaces((list) => list.map((w) => (w._id === workspace._id ? { ...workspace, myRole: myRole || w.myRole } : w)));
  });

  useSocketEvent('workspace_invited', ({ workspace, by }) => {
    upsert(workspace);
    toast(`${by} added you to “${workspace.name}”`);
  });

  const dropWorkspace = useCallback(
    (workspaceId, message) => {
      setWorkspaces((list) => list.filter((w) => w._id !== workspaceId));
      if (workspaceId === currentId) {
        toast(message);
        navigate('/', { replace: true });
      }
    },
    [currentId, navigate, toast]
  );

  useSocketEvent('workspace_removed', ({ workspaceId }) => dropWorkspace(workspaceId, 'You were removed from this workspace'));
  useSocketEvent('workspace_deleted', ({ workspaceId }) => dropWorkspace(workspaceId, 'This workspace was deleted'));

  const value = useMemo(
    () => ({
      workspaces,
      loading,
      current,
      currentId,
      online,
      page,
      isAdmin: current?.myRole === 'Owner' || current?.myRole === 'Admin',
      refresh,
      upsert,
      createWorkspace,
      removeLocal: (id) => setWorkspaces((list) => list.filter((w) => w._id !== id)),
    }),
    [workspaces, loading, current, currentId, online, page, refresh, upsert, createWorkspace]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export const useWorkspace = () => useContext(WorkspaceContext);

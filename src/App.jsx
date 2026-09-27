import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { WorkspaceProvider } from './context/WorkspaceContext.jsx';
import { CallProvider } from './context/CallContext.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import FullPageSpinner from './components/ui/FullPageSpinner.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Landing from './pages/Landing.jsx';
import Home from './pages/Home.jsx';
import Chat from './pages/Chat.jsx';
import Board from './pages/Board.jsx';
import Files from './pages/Files.jsx';
// Heavy pages (Konva, Monaco, Recharts) load on demand to keep the first load light on phones
const CanvasPage = lazy(() => import('./pages/Canvas.jsx'));
const CodeEditor = lazy(() => import('./pages/CodeEditor.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
import Members from './pages/Members.jsx';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  return user ? children : <Navigate to="/login" replace />;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
      <Route
        element={
          <RequireAuth>
            <WorkspaceProvider>
              <CallProvider>
                <AppLayout />
              </CallProvider>
            </WorkspaceProvider>
          </RequireAuth>
        }
      >
        <Route path="/" element={<Landing />} />
        <Route path="/w/:workspaceId" element={<Home />} />
        <Route path="/w/:workspaceId/chat" element={<Chat />} />
        <Route path="/w/:workspaceId/board" element={<Board />} />
        <Route path="/w/:workspaceId/files" element={<Files />} />
        <Route path="/w/:workspaceId/canvas" element={<CanvasPage />} />
        <Route path="/w/:workspaceId/code" element={<CodeEditor />} />
        <Route path="/w/:workspaceId/dashboard" element={<Dashboard />} />
        <Route path="/w/:workspaceId/members" element={<Members />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

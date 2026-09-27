import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Topbar from './Topbar.jsx';
import Sidebar from './Sidebar.jsx';
import { CallAudio, CallDock, CallOverlay } from '../call/CallPanel.jsx';
import IncomingCallPopup from '../call/IncomingCallPopup.jsx';
import FullPageSpinner from '../ui/FullPageSpinner.jsx';

export default function AppLayout() {
  const [open, setOpen] = useState(() => window.innerWidth >= 1024);
  const { pathname } = useLocation();

  // On small screens the sidebar is an overlay: close it after navigating
  useEffect(() => {
    if (window.innerWidth < 1024) setOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-full flex-col bg-white">
      <Topbar onMenu={() => setOpen((o) => !o)} />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <main className="relative min-w-0 flex-1 overflow-auto">
          <Suspense fallback={<FullPageSpinner />}>
            <Outlet />
          </Suspense>
        </main>
        {/* Docked call sits beside the page so you can keep working */}
        <CallDock />
      </div>
      <CallOverlay />
      <CallAudio />
      <IncomingCallPopup />
    </div>
  );
}

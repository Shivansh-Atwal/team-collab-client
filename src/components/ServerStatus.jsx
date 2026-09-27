import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import api, { errorMessage } from '../api/client.js';
import { BACKEND_URL, backendConfigProblem } from '../config.js';

// Shown on the auth pages: tells the user right away whether the backend is reachable,
// still waking up (free hosting), or misconfigured — instead of a login button that hangs.
export default function ServerStatus() {
  const [problem] = useState(backendConfigProblem);
  const [state, setState] = useState({ status: 'checking', slow: false, error: '' });

  const check = useCallback(() => {
    setState({ status: 'checking', slow: false, error: '' });
    const slowTimer = setTimeout(() => setState((s) => (s.status === 'checking' ? { ...s, slow: true } : s)), 4000);
    api
      .get('/health')
      .then(() => setState({ status: 'online', slow: false, error: '' }))
      .catch((err) => setState({ status: 'offline', slow: false, error: errorMessage(err) }))
      .finally(() => clearTimeout(slowTimer));
    return () => clearTimeout(slowTimer);
  }, []);

  useEffect(() => (problem ? undefined : check()), [problem, check]);

  if (problem) {
    return (
      <div className="mb-6 flex gap-2 rounded-lg bg-gred-soft px-3 py-2.5 text-xs text-gred">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <span>{problem}</span>
      </div>
    );
  }
  if (state.status === 'online') {
    return (
      <div className="mb-6 flex items-center gap-2 text-xs text-ink-4">
        <span className="h-2 w-2 rounded-full bg-ggreen-light" /> Server online
      </div>
    );
  }
  if (state.status === 'checking') {
    return (
      <div className="mb-6 flex items-start gap-2 text-xs text-ink-3">
        <Loader2 size={14} className="mt-0.5 shrink-0 animate-spin text-gblue" />
        <span>{state.slow ? 'Waking up the server — free hosting can take up to a minute on the first request…' : 'Connecting to server…'}</span>
      </div>
    );
  }
  return (
    <div className="mb-6 rounded-lg bg-gred-soft px-3 py-2.5 text-xs text-gred">
      <div className="flex gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <span>{state.error}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 pl-6">
        <span className="truncate text-[11px] opacity-80">Backend: {BACKEND_URL || window.location.origin}</span>
        <button type="button" onClick={check} className="inline-flex shrink-0 items-center gap-1 font-medium hover:underline">
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    </div>
  );
}

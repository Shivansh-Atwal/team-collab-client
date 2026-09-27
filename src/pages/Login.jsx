import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import ServerStatus from '../components/ServerStatus.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../api/client.js';
import { greeting } from '../lib/utils.js';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthShell heading={`${greeting()}.`} sub="Sign in to pick up where your team left off.">
      <h2 className="text-2xl text-ink">Sign in</h2>
      <p className="mt-1 text-sm text-ink-3">to continue to TeamCollab</p>
      <div className="mt-6">
        <ServerStatus />
      </div>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        {error && <p className="text-sm text-gred">{error}</p>}
        <div className="flex items-center justify-between pt-2">
          <Link to="/signup" className="text-sm font-medium text-gblue hover:underline">Create account</Link>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Next'}</button>
        </div>
      </form>
    </AuthShell>
  );
}

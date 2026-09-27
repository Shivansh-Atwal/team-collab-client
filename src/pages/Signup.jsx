import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../api/client.js';

export default function Signup() {
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Use 6 characters or more for your password');
    setBusy(true);
    try {
      await signup(form.name, form.email, form.password);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthShell heading="Welcome to TeamCollab." sub="One workspace for your whole team.">
      <h2 className="text-2xl text-ink">Create your account</h2>
      <p className="mt-1 text-sm text-ink-3">It takes less than a minute</p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" className="field" value={form.name} onChange={set('name')} autoComplete="name" required autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="field" value={form.email} onChange={set('email')} autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="field" value={form.password} onChange={set('password')} autoComplete="new-password" required />
          <p className="mt-1.5 text-xs text-ink-4">At least 6 characters</p>
        </div>
        {error && <p className="text-sm text-gred">{error}</p>}
        <div className="flex items-center justify-between pt-2">
          <Link to="/login" className="text-sm font-medium text-gblue hover:underline">Sign in instead</Link>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        </div>
      </form>
    </AuthShell>
  );
}

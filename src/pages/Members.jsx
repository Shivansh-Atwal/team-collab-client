import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Mail, Trash2, UserPlus } from 'lucide-react';
import api, { errorMessage, wsApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { cx, pageLabel } from '../lib/utils.js';

const ROLE_STYLE = { Owner: 'bg-gblue-soft text-gblue-dark', Admin: 'bg-ggreen-soft text-ggreen', Member: 'bg-surface text-ink-3' };

export default function Members() {
  const { user } = useAuth();
  const { current, currentId, isAdmin, online, upsert, removeLocal } = useWorkspace();
  const toast = useToast();
  const navigate = useNavigate();
  const [invite, setInvite] = useState({ email: '', role: 'Member' });
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState({ name: '', description: '' });

  useEffect(() => {
    if (current) setDetails({ name: current.name, description: current.description || '' });
  }, [current?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null;
  const ws = wsApi(currentId);

  const run = async (fn, success) => {
    setBusy(true);
    try {
      const res = await fn();
      if (res?.workspace) upsert(res.workspace);
      if (success) toast(success);
      return res;
    } catch (err) {
      toast(errorMessage(err), { error: true });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    const res = await run(() => ws.post('/members', invite), `Added ${invite.email} to ${current.name}`);
    if (res) setInvite({ email: '', role: 'Member' });
  };

  const leave = async () => {
    if (!window.confirm(`Leave ${current.name}?`)) return;
    const res = await run(() => ws.del(`/members/${user._id}`));
    if (res) {
      removeLocal(currentId);
      navigate('/');
    }
  };

  const destroy = async () => {
    if (window.prompt(`This deletes all tasks, messages, files and diagrams.\nType the workspace name to confirm: ${current.name}`) !== current.name) return;
    const res = await run(() => api.delete(`/workspaces/${currentId}`));
    if (res) {
      removeLocal(currentId);
      navigate('/');
    }
  };

  return (
    <div className="pb-12">
      <PageHeader title="Members & settings" sub={`${current.members.length} people in ${current.name}`} />

      <div className="grid gap-6 px-6 sm:px-10 xl:grid-cols-[1fr_360px]">
        <section className="overflow-hidden rounded-xl border border-line bg-white">
          <ul className="divide-y divide-line">
            {current.members.map((m) => {
              const presence = online.find((o) => o._id === m._id);
              const isOnline = !!presence;
              const editable = isAdmin && m.workspaceRole !== 'Owner' && m._id !== user._id;
              return (
                <li key={m._id} className="flex items-center gap-4 px-5 py-3.5">
                  <Avatar user={m} size={38} online={isOnline} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-ink">
                      {m.name} {m._id === user._id && <span className="text-ink-4">(you)</span>}
                    </div>
                    <div className="truncate text-xs text-ink-4">
                      {isOnline ? <span className="text-ggreen">● on {pageLabel(presence.page)}</span> : 'Offline'} · {m.email}
                    </div>
                  </div>
                  {editable ? (
                    <select
                      className="field h-8 w-28 py-0 text-xs"
                      value={m.workspaceRole}
                      disabled={busy}
                      onChange={(e) => run(() => ws.patch(`/members/${m._id}`, { role: e.target.value }), `${m.name} is now ${e.target.value === 'Admin' ? 'an Admin' : 'a Member'}`)}
                      aria-label={`Role for ${m.name}`}
                    >
                      <option>Admin</option>
                      <option>Member</option>
                    </select>
                  ) : (
                    <span className={cx('chip', ROLE_STYLE[m.workspaceRole])}>{m.workspaceRole}</span>
                  )}
                  {editable && (
                    <button
                      type="button"
                      className="icon-btn h-8 w-8 hover:text-gred"
                      onClick={() => window.confirm(`Remove ${m.name} from ${current.name}?`) && run(() => ws.del(`/members/${m._id}`), `${m.name} was removed`)}
                      aria-label={`Remove ${m.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="space-y-6">
          {isAdmin && (
            <section className="rounded-xl border border-line bg-white p-5">
              <h2 className="flex items-center gap-2 text-base text-ink"><UserPlus size={18} className="text-gblue" /> Invite a teammate</h2>
              <p className="mt-1 text-xs text-ink-4">They need a TeamCollab account with this email.</p>
              <form onSubmit={sendInvite} className="mt-4 space-y-3">
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
                  <input type="email" required className="field pl-9" placeholder="teammate@example.com" value={invite.email} onChange={(e) => setInvite((i) => ({ ...i, email: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <select className="field flex-1" value={invite.role} onChange={(e) => setInvite((i) => ({ ...i, role: e.target.value }))} aria-label="Role">
                    <option>Member</option>
                    <option>Admin</option>
                  </select>
                  <button type="submit" className="btn-primary" disabled={busy}>Invite</button>
                </div>
              </form>
            </section>
          )}

          {isAdmin && (
            <section className="rounded-xl border border-line bg-white p-5">
              <h2 className="text-base text-ink">Workspace details</h2>
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(() => ws.patch('', details), 'Workspace updated');
                }}
              >
                <input className="field" value={details.name} onChange={(e) => setDetails((d) => ({ ...d, name: e.target.value }))} aria-label="Workspace name" />
                <textarea rows={3} className="field resize-none" value={details.description} onChange={(e) => setDetails((d) => ({ ...d, description: e.target.value }))} placeholder="Description" aria-label="Description" />
                <div className="flex justify-end"><button type="submit" className="btn-outline" disabled={busy}>Save</button></div>
              </form>
            </section>
          )}

          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="text-base text-ink">Danger zone</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {current.myRole !== 'Owner' && (
                <button type="button" className="btn-outline text-gred" onClick={leave}><LogOut size={16} /> Leave workspace</button>
              )}
              {current.myRole === 'Owner' && (
                <button type="button" className="btn-danger" onClick={destroy}><Trash2 size={16} /> Delete workspace</button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

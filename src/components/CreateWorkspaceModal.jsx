import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './ui/Modal.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { useToast } from './ui/Toast.jsx';
import { errorMessage } from '../api/client.js';

export function CreateWorkspaceForm({ onDone, submitLabel = 'Create workspace' }) {
  const { createWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const ws = await createWorkspace(name.trim(), description.trim());
      onDone?.();
      navigate(`/w/${ws._id}`);
    } catch (err) {
      toast(errorMessage(err), { error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="ws-name">Workspace name</label>
        <input id="ws-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Minor Project Team" autoFocus />
      </div>
      <div>
        <label className="label" htmlFor="ws-desc">Description (optional)</label>
        <textarea id="ws-desc" rows={3} className="field resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this team working on?" />
      </div>
      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={busy || !name.trim()}>
          {busy ? 'Creating…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function CreateWorkspaceModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Create a workspace">
      <CreateWorkspaceForm onDone={onClose} />
    </Modal>
  );
}

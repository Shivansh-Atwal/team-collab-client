import { useEffect, useRef, useState } from 'react';
import { Download, File as FileIcon, FileArchive, FileCode, FileImage, FileSpreadsheet, FileText, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { errorMessage, wsApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import useSocketEvent from '../hooks/useSocketEvent.js';
import PageHeader from '../components/PageHeader.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { FilesArt } from '../components/illustrations/Illustrations.jsx';
import { cx, formatBytes, formatDate, plural } from '../lib/utils.js';

function iconFor(file) {
  const t = `${file.fileType} ${file.fileName}`.toLowerCase();
  if (/image\//.test(t)) return [FileImage, 'text-gred'];
  if (/pdf|word|document|text\/plain|\.md\b/.test(t)) return [FileText, 'text-gblue'];
  if (/sheet|excel|csv/.test(t)) return [FileSpreadsheet, 'text-ggreen'];
  if (/zip|rar|7z|tar|gzip/.test(t)) return [FileArchive, 'text-[#b06000]'];
  if (/javascript|json|html|css|python|\.jsx?\b|\.py\b|\.java\b/.test(t)) return [FileCode, 'text-[#9334e6]'];
  return [FileIcon, 'text-ink-4'];
}

export default function Files() {
  const { user } = useAuth();
  const { currentId, isAdmin } = useWorkspace();
  const toast = useToast();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(0);
  const [dragging, setDragging] = useState(false);
  const input = useRef(null);

  useEffect(() => {
    if (!currentId) return;
    setLoading(true);
    wsApi(currentId).get('/files').then((d) => setFiles(d.files)).finally(() => setLoading(false));
  }, [currentId]);

  const addFile = (file) => setFiles((list) => (list.some((f) => f._id === file._id) ? list : [file, ...list]));
  useSocketEvent('file_uploaded', ({ workspaceId, file }) => workspaceId === currentId && addFile(file));
  useSocketEvent('file_deleted', ({ workspaceId, fileId }) => workspaceId === currentId && setFiles((l) => l.filter((f) => f._id !== fileId)));

  const upload = async (list) => {
    const picked = [...list];
    if (!picked.length) return;
    setUploading((n) => n + picked.length);
    await Promise.all(
      picked.map(async (f) => {
        const body = new FormData();
        body.append('file', f);
        try {
          const { file } = await wsApi(currentId).post('/files', body);
          addFile(file);
        } catch (err) {
          toast(`${f.name}: ${errorMessage(err)}`, { error: true });
        } finally {
          setUploading((n) => n - 1);
        }
      })
    );
  };

  const remove = async (file) => {
    if (!window.confirm(`Delete “${file.fileName}” for everyone?`)) return;
    try {
      await wsApi(currentId).del(`/files/${file._id}`);
      setFiles((l) => l.filter((f) => f._id !== file._id));
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  };

  const totalSize = files.reduce((s, f) => s + (f.fileSize || 0), 0);

  return (
    <div
      className="min-h-full pb-10"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        upload(e.dataTransfer.files);
      }}
    >
      <PageHeader title="Files" sub={`${plural(files.length, 'file')} · ${formatBytes(totalSize)} shared in this workspace`}>
        <button type="button" className="btn-primary" onClick={() => input.current.click()}>
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
          {uploading ? `Uploading ${uploading}…` : 'Upload'}
        </button>
        <input ref={input} type="file" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
      </PageHeader>

      <div className="px-6 sm:px-10">
        <button
          type="button"
          onClick={() => input.current.click()}
          className={cx(
            'mb-6 flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed py-8 text-sm transition-colors',
            dragging ? 'border-gblue bg-gblue-soft text-gblue' : 'border-line text-ink-4 hover:border-ink-5'
          )}
        >
          <UploadCloud size={26} />
          <span><span className="font-medium text-gblue">Choose files</span> or drag them here</span>
          <span className="text-xs">Up to 25 MB each</span>
        </button>

        {!loading && files.length === 0 ? (
          <EmptyState art={FilesArt} title="No files yet" body="Upload specs, designs and documents so the whole team can find them." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface text-xs text-ink-3">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">Uploaded by</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Date</th>
                  <th className="hidden px-5 py-3 text-right font-medium sm:table-cell">Size</th>
                  <th className="w-24 px-3 py-3 sm:w-28 sm:px-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {files.map((f) => {
                  const [Icon, color] = iconFor(f);
                  const canDelete = isAdmin || f.uploadedBy?._id === user._id;
                  return (
                    <tr key={f._id} className="group hover:bg-surface/70">
                      <td className="max-w-0 px-4 py-3 sm:px-5">
                        <a href={f.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-ink hover:text-gblue">
                          <Icon size={20} className={cx('shrink-0', color)} />
                          <span className="min-w-0">
                            <span className="block truncate">{f.fileName}</span>
                            {/* phones: details under the name instead of extra columns */}
                            <span className="block truncate text-xs text-ink-4 sm:hidden">
                              {formatBytes(f.fileSize)} · {f.uploadedBy?._id === user._id ? 'You' : f.uploadedBy?.name} · {formatDate(f.createdAt, { month: 'short', day: 'numeric' })}
                            </span>
                          </span>
                        </a>
                      </td>
                      <td className="hidden px-5 py-3 sm:table-cell">
                        <span className="flex items-center gap-2 whitespace-nowrap text-ink-2">
                          <Avatar user={f.uploadedBy} size={24} /> {f.uploadedBy?._id === user._id ? 'You' : f.uploadedBy?.name}
                        </span>
                      </td>
                      <td className="hidden whitespace-nowrap px-5 py-3 text-ink-3 md:table-cell">{formatDate(f.createdAt)}</td>
                      <td className="hidden whitespace-nowrap px-5 py-3 text-right tabular-nums text-ink-3 sm:table-cell">{formatBytes(f.fileSize)}</td>
                      <td className="px-3 py-3 sm:px-5">
                        <div className="flex justify-end gap-1">
                          <a href={f.fileUrl} download={f.fileName} className="icon-btn h-8 w-8" aria-label={`Download ${f.fileName}`}>
                            <Download size={16} />
                          </a>
                          {canDelete && (
                            <button type="button" className="icon-btn h-8 w-8 hover:text-gred" onClick={() => remove(f)} aria-label={`Delete ${f.fileName}`}>
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

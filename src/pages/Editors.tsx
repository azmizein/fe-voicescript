import { useEffect, useState } from 'react';
import { api, Editor } from '../api/client';
import { useToast } from '../components/Toast';

export default function Editors() {
  const [editors, setEditors] = useState<Editor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [flatFee, setFlatFee] = useState('75000');
  const [saving, setSaving] = useState(false);
  const [deleteEditorObj, setDeleteEditorObj] = useState<Editor | null>(null);

  const toast = useToast();

  async function load() {
    try {
      setEditors(await api.editors.list());
    } catch {
      toast('Failed to load editors data', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast('Name is required', 'warning');
      return;
    }
    setSaving(true);
    try {
      await api.editors.create({ name: name.trim(), flatFee: Number(flatFee) });
      setName('');
      setFlatFee('75000');
      setShowForm(false);
      toast('Editor added successfully!', 'success');
      load();
    } catch (e: any) {
      toast(e.message || 'Failed to create editor', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteEditor(id: number) {
    try {
      await api.editors.delete(id);
      setEditors(es => es.filter(e => e.id !== id));
      toast('Editor deleted successfully!', 'success');
    } catch (e: any) {
      toast(e.message || 'Failed to delete editor', 'error');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Editors</h1>
          <p className="page-subtitle">{editors.length} transcript editors / scopers</p>
        </div>
        <button id="add-editor-btn" className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add Editor'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-4" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>New Editor</div>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div className="form-group">
              <label htmlFor="edit-name">Name</label>
              <input id="edit-name" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" required />
            </div>
            <div className="form-group">
              <label htmlFor="edit-fee">Flat Fee (IDR)</label>
              <input id="edit-fee" type="number" value={flatFee} onChange={e => setFlatFee(e.target.value)} min={0} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '⏳' : '✓ Add'}
            </button>
          </form>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Flat Fee</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="loading">Loading editors...</td></tr>}
            {!loading && editors.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <div className="empty-state">
                    <div className="empty-state-icon">✏️</div>
                    <div>No editors registered yet</div>
                  </div>
                </td>
              </tr>
            )}
            {editors.map(e => (
              <tr key={e.id}>
                <td style={{ fontWeight: 600 }}>{e.name}</td>
                <td>
                  <span style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                    🖋️ Transcript Scoper
                  </span>
                </td>
                <td style={{ fontWeight: 500 }}>Rp {e.flat_fee.toLocaleString('id-ID')}</td>
                <td>
                  <button
                    id={`delete-editor-${e.id}`}
                    className="btn btn-sm btn-danger"
                    onClick={() => setDeleteEditorObj(e)}
                  >
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteEditorObj && (
        <div className="modal-overlay" onClick={() => setDeleteEditorObj(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                ⚠️ Delete Editor
              </div>
              <button className="modal-close" onClick={() => setDeleteEditorObj(null)}>✕</button>
            </div>
            
            <div style={{ color: 'var(--text-primary)', marginBottom: 24, fontSize: 14.5 }}>
              Are you sure you want to permanently delete this editor?<br />
              <strong style={{ color: 'var(--accent-light)', display: 'inline-block', marginTop: 6 }}>{deleteEditorObj.name}</strong>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.4 }}>
                This action is permanent and will prevent this editor from being assigned to any new jobs.
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteEditorObj(null)}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  confirmDeleteEditor(deleteEditorObj.id);
                  setDeleteEditorObj(null);
                }}
              >
                🗑️ Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

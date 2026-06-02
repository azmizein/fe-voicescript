import { useState } from 'react';
import { api, Job, Reporter, Editor } from '../api/client';

interface Props {
  job: Job;
  reporters: Reporter[];
  editors: Editor[];
  onClose: () => void;
  onUpdated: (job: Job) => void;
}

export function AssignModal({ job, reporters, editors, onClose, onUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sort reporters: available + same city first
  const sorted = [...reporters].sort((a, b) => {
    if (a.is_available !== b.is_available) return b.is_available - a.is_available;
    if (job.location_type === 'physical' && job.city) {
      const am = a.city === job.city ? 1 : 0;
      const bm = b.city === job.city ? 1 : 0;
      if (am !== bm) return bm - am;
    }
    return 0;
  });

  async function assignReporter(reporterId: number) {
    setLoading(true); setError('');
    try {
      const updated = await api.jobs.assignReporter(job.id, reporterId);
      onUpdated(updated);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function assignEditor(editorId: number) {
    setLoading(true); setError('');
    try {
      const updated = await api.jobs.assignEditor(job.id, editorId);
      onUpdated(updated);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function autoPickReporter() {
    setLoading(true); setError('');
    try {
      const result = await api.jobs.autoAssignReporter(job.id);
      onUpdated(result.data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function autoPickEditor() {
    setLoading(true); setError('');
    try {
      const result = await api.jobs.autoAssignEditor(job.id);
      onUpdated(result.data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const canAssignReporter = ['NEW', 'ASSIGNED'].includes(job.status);
  const canAssignEditor = ['ASSIGNED', 'TRANSCRIBED', 'REVIEWED'].includes(job.status);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Assign Staff</div>
            <div className="text-muted mt-1">{job.case_name}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-msg mb-4">{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Reporter section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--text-muted)' }}>
                🎙️ Assign Reporter {job.reporter_name && <span style={{ color: 'var(--accent-light)', marginLeft: 6 }}>→ {job.reporter_name}</span>}
              </div>
              {canAssignReporter && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: '#818cf8',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    padding: '3px 8px',
                    fontSize: '11px',
                  }}
                  onClick={autoPickReporter}
                  disabled={loading}
                >
                  ⚡ Auto Pick
                </button>
              )}
            </div>
            {!canAssignReporter && (
              <div className="text-muted" style={{ fontSize: 13 }}>Reporter can only be assigned for NEW or ASSIGNED jobs.</div>
            )}
            {canAssignReporter && sorted.map(r => (
              <div
                key={r.id}
                className={`reporter-suggestion ${!r.is_available ? 'unavailable' : ''}`}
                onClick={() => r.is_available && !loading && assignReporter(r.id)}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                  <div className="text-muted">{r.city} · Rp {r.rate_per_minute.toLocaleString('id-ID')}/mnt</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {job.location_type === 'physical' && job.city === r.city && (
                    <span className="city-match">✓ Same city</span>
                  )}
                  <span className={`badge ${r.is_available ? 'badge-available' : 'badge-unavailable'}`}>
                    {r.is_available ? 'Available' : 'Busy'}
                  </span>
                  {job.reporter_id === r.id && <span style={{ color: 'var(--accent-light)', fontSize: 12 }}>✓ Current</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Editor section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'var(--text-muted)' }}>
                ✏️ Assign Editor {job.editor_name && <span style={{ color: 'var(--accent-light)', marginLeft: 6 }}>→ {job.editor_name}</span>}
              </div>
              {canAssignEditor && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: '#818cf8',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    padding: '3px 8px',
                    fontSize: '11px',
                  }}
                  onClick={autoPickEditor}
                  disabled={loading}
                >
                  ⚡ Auto Pick
                </button>
              )}
            </div>
            {!canAssignEditor && (
              <div className="text-muted" style={{ fontSize: 13 }}>Editor can be assigned after job is ASSIGNED.</div>
            )}
            {canAssignEditor && editors.map(e => (
              <div
                key={e.id}
                className="reporter-suggestion"
                onClick={() => !loading && assignEditor(e.id)}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{e.name}</div>
                  <div className="text-muted">Flat fee: Rp {e.flat_fee.toLocaleString('id-ID')}</div>
                </div>
                {job.editor_id === e.id && <span style={{ color: 'var(--accent-light)', fontSize: 12 }}>✓ Current</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}


import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Job, Reporter, Editor, JobStatus } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { CreateJobModal } from '../components/CreateJobModal';
import { AssignModal } from '../components/AssignModal';
import { useToast } from '../components/Toast';

const NEXT_STATUS: Record<string, string> = {
  NEW: 'ASSIGNED', ASSIGNED: 'TRANSCRIBED', TRANSCRIBED: 'REVIEWED', REVIEWED: 'COMPLETED',
};

const FILTER_OPTIONS: Array<JobStatus | 'ALL'> = ['ALL', 'NEW', 'ASSIGNED', 'TRANSCRIBED', 'REVIEWED', 'COMPLETED'];

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reporters, setReporters] = useState<Reporter[]>([]);
  const [editors, setEditors] = useState<Editor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [assignJob, setAssignJob] = useState<Job | null>(null);
  const [filter, setFilter] = useState<JobStatus | 'ALL'>('ALL');
  const [advancing, setAdvancing] = useState<number | null>(null);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [deleteJobObj, setDeleteJobObj] = useState<Job | null>(null);
  const [viewingTranscriptJob, setViewingTranscriptJob] = useState<Job | null>(null);

  const navigate = useNavigate();
  const toast = useToast();

  async function loadAll(silent = false) {
    if (!silent) setLoading(true);
    try {
      const [j, r, e] = await Promise.all([api.jobs.list(), api.reporters.list(), api.editors.list()]);
      setJobs(j); setReporters(r); setEditors(e);
    } catch {
      toast('Failed to load jobs and staff data', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    const interval = setInterval(() => {
      loadAll(true);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  async function advanceStatus(job: Job) {
    setAdvancing(job.id);
    try {
      const updated = await api.jobs.advanceStatus(job.id);
      setJobs(js => js.map(j => j.id === updated.id ? { ...j, ...updated } : j));
      
      if (updated.status === 'COMPLETED') {
        toast(`🎉 Job completed! Payment calculated automatically.`, 'success');
      } else {
        toast(`Status advanced to ${updated.status}!`, 'success');
      }
    } catch (e: any) {
      toast(e.message || 'Failed to update status', 'error');
    } finally {
      setAdvancing(null);
    }
  }

  async function handleAutoAssign(job: Job) {
    setAssigning(job.id);
    try {
      if (job.status === 'NEW' || job.status === 'ASSIGNED') {
        const result = await api.jobs.autoAssignReporter(job.id);
        setJobs(js => js.map(j => j.id === job.id ? { ...j, ...result.data } : j));
        toast(result.message || 'Reporter auto-assigned successfully!', 'success');
      } else if (job.status === 'TRANSCRIBED' || job.status === 'REVIEWED') {
        const result = await api.jobs.autoAssignEditor(job.id);
        setJobs(js => js.map(j => j.id === job.id ? { ...j, ...result.data } : j));
        toast(result.message || 'Editor auto-assigned successfully!', 'success');
      } else {
        toast('Cannot auto-assign for this job status.', 'warning');
      }
    } catch (e: any) {
      toast(e.message || 'Failed to auto-assign', 'error');
    } finally {
      setAssigning(null);
    }
  }

  async function bulkAutoAssign() {
    setBulkLoading(true);
    try {
      const res = await api.jobs.batchAutoAssign();
      await loadAll(true);
      const reportersAssigned = res.data.filter(r => r.role === 'reporter' && r.status === 'assigned').length;
      const editorsAssigned = res.data.filter(r => r.role === 'editor' && r.status === 'assigned').length;
      const totalAssigned = reportersAssigned + editorsAssigned;
      
      if (totalAssigned > 0) {
        toast(`⚡ Bulk Auto Assign: assigned ${reportersAssigned} reporters and ${editorsAssigned} editors!`, 'success');
      } else {
        toast('No jobs were auto-assigned during bulk run.', 'info');
      }
    } catch (e: any) {
      toast(e.message || 'Bulk auto assign failed', 'error');
    } finally {
      setBulkLoading(false);
    }
  }

  async function confirmDeleteJob(id: number) {
    try {
      await api.jobs.delete(id);
      setJobs(js => js.filter(j => j.id !== id));
      toast('Job deleted successfully!', 'success');
    } catch (e: any) {
      toast(e.message || 'Failed to delete job', 'error');
    }
  }


  const bulkReporterCount = jobs.filter(j => j.status === 'NEW' && !j.reporter_id).length;
  const bulkEditorCount = jobs.filter(j => ['ASSIGNED', 'TRANSCRIBED', 'REVIEWED'].includes(j.status) && !j.editor_id).length;
  const totalBulkCount = bulkReporterCount + bulkEditorCount;

  const filtered = filter === 'ALL' ? jobs : jobs.filter(j => j.status === filter);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Jobs</h1>
          <p className="page-subtitle">{jobs.length} total jobs</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            id="bulk-auto-assign-btn"
            className="btn btn-secondary"
            style={{
              background: 'rgba(99, 102, 241, 0.12)',
              color: '#818cf8',
              border: '1px solid rgba(99, 102, 241, 0.25)',
            }}
            onClick={bulkAutoAssign}
            disabled={bulkLoading || totalBulkCount === 0}
          >
            {bulkLoading ? '⏳ Assigning...' : `⚡ Bulk Auto Assign (${totalBulkCount})`}
          </button>
          <button id="create-job-btn" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Job
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTER_OPTIONS.map(f => (
          <button
            key={f}
            id={`filter-${f.toLowerCase()}`}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f)}
          >
            {f} {f !== 'ALL' && <span style={{ opacity: 0.7 }}>({jobs.filter(j => j.status === f).length})</span>}
          </button>
        ))}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Case</th>
              <th>Duration</th>
              <th>Location</th>
              <th>Status</th>
              <th>Reporter</th>
              <th>Editor</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="loading">Loading jobs...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <div className="empty-state-text">No jobs found</div>
                  </div>
                </td>
              </tr>
            )}
            {filtered.map(job => (
              <tr key={job.id}>
                <td>
                  <div
                    onClick={() => setViewingTranscriptJob(job)}
                    style={{
                      fontWeight: 600,
                      fontSize: 13.5,
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      transition: 'all 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--accent-light)';
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-primary)';
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    {job.case_name}
                    {job.transcript && (
                      <span style={{ fontSize: 11, opacity: 0.8 }} title="AI Draft Transcript Available">
                        📄
                      </span>
                    )}
                  </div>
                  <div className="text-muted" style={{ fontSize: 12 }}>#{job.id}</div>
                </td>
                <td>
                  <span style={{ fontWeight: 600 }}>{job.duration}</span>
                  <span className="text-muted"> min</span>
                </td>
                <td>
                  <span className={`badge ${job.location_type === 'physical' ? 'badge-physical' : 'badge-remote'}`}>
                    {job.location_type === 'physical' ? '📍' : '🌐'} {job.location_type}
                  </span>
                  {job.city && <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>{job.city}</div>}
                </td>
                <td><StatusBadge status={job.status} /></td>
                <td>
                  {job.reporter_name
                    ? <><div style={{ fontWeight: 500 }}>{job.reporter_name}</div><div className="text-muted" style={{ fontSize: 12 }}>{job.reporter_city}</div></>
                    : <span className="text-muted">—</span>}
                </td>
                <td>
                  {job.editor_name ? <div style={{ fontWeight: 500 }}>{job.editor_name}</div> : <span className="text-muted">—</span>}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      id={`assign-job-${job.id}`}
                      className="btn btn-secondary btn-sm"
                      onClick={() => setAssignJob(job)}
                      disabled={job.status === 'COMPLETED'}
                    >
                      👤 Assign
                    </button>
                    {job.status !== 'COMPLETED' && (
                      <button
                        id={`auto-assign-job-${job.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{
                          background: 'rgba(99, 102, 241, 0.1)',
                          color: '#818cf8',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                        }}
                        onClick={() => handleAutoAssign(job)}
                        disabled={assigning === job.id || advancing === job.id}
                      >
                        {assigning === job.id ? '⏳' : '⚡ Auto'}
                      </button>
                    )}
                    {job.status !== 'COMPLETED' && (
                      <button
                        id={`advance-job-${job.id}`}
                        className="btn btn-sm btn-success"
                        onClick={() => advanceStatus(job)}
                        disabled={advancing === job.id || assigning === job.id}
                      >
                        {advancing === job.id ? '⏳' : `→ ${NEXT_STATUS[job.status]}`}
                      </button>
                    )}
                    <button
                      id={`delete-job-${job.id}`}
                      className="btn btn-sm btn-danger"
                      style={{ padding: '5px 8px' }}
                      onClick={() => setDeleteJobObj(job)}
                      disabled={advancing === job.id || assigning === job.id}
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateJobModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            loadAll(true);
            toast('Job created successfully!', 'success');
          }}
        />
      )}
      {assignJob && (
        <AssignModal
          job={assignJob}
          reporters={reporters}
          editors={editors}
          onClose={() => setAssignJob(null)}
          onUpdated={(updated) => {
            setJobs(js => js.map(j => j.id === updated.id ? { ...j, ...updated } : j));
            setAssignJob(updated);
          }}
        />
      )}
      {deleteJobObj && (
        <div className="modal-overlay" onClick={() => setDeleteJobObj(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                ⚠️ Delete Job
              </div>
              <button className="modal-close" onClick={() => setDeleteJobObj(null)}>✕</button>
            </div>
            
            <div style={{ color: 'var(--text-primary)', marginBottom: 24, fontSize: 14.5 }}>
              Are you sure you want to permanently delete this job?<br />
              <strong style={{ color: 'var(--accent-light)', display: 'inline-block', marginTop: 6 }}>{deleteJobObj.case_name}</strong>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.4 }}>
                This action is permanent and will also clean up any related payout records in the system.
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteJobObj(null)}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  confirmDeleteJob(deleteJobObj.id);
                  setDeleteJobObj(null);
                }}
              >
                🗑️ Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingTranscriptJob && (
        <div className="modal-overlay" onClick={() => setViewingTranscriptJob(null)}>
          <div
            className="modal"
            style={{
              maxWidth: 700,
              width: '90%',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
              borderRadius: 'var(--radius-lg)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}>
                📄 Case Transcript Details
              </div>
              <button className="modal-close" onClick={() => setViewingTranscriptJob(null)}>✕</button>
            </div>

            <div style={{ padding: '20px 0' }}>
              {/* Metadata Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 12,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  marginBottom: 20,
                  fontSize: 13
                }}
              >
                <div>
                  <span className="text-muted">Case Name:</span>{' '}
                  <strong style={{ color: 'var(--accent-light)' }}>{viewingTranscriptJob.case_name}</strong>
                </div>
                <div>
                  <span className="text-muted">Duration:</span>{' '}
                  <strong>{viewingTranscriptJob.duration} mins</strong>
                </div>
                <div>
                  <span className="text-muted">Location:</span>{' '}
                  <span className={`badge ${viewingTranscriptJob.location_type === 'physical' ? 'badge-physical' : 'badge-remote'}`} style={{ fontSize: 11 }}>
                    {viewingTranscriptJob.location_type === 'physical' ? '📍' : '🌐'} {viewingTranscriptJob.location_type}
                  </span>
                </div>
                <div>
                  <span className="text-muted">Status:</span>{' '}
                  <StatusBadge status={viewingTranscriptJob.status} />
                </div>
                <div>
                  <span className="text-muted">Reporter:</span>{' '}
                  <strong>{viewingTranscriptJob.reporter_name || 'Unassigned'}</strong>
                </div>
                <div>
                  <span className="text-muted">Editor:</span>{' '}
                  <strong>{viewingTranscriptJob.editor_name || 'Unassigned'}</strong>
                </div>
              </div>

              {/* Transcript Box */}
              {viewingTranscriptJob.transcript ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      📜 Transcript Excerpt (Scoper Ready)
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      onClick={() => {
                        navigator.clipboard.writeText(viewingTranscriptJob.transcript || '');
                        toast('📋 Transcript copied to clipboard!', 'success');
                      }}
                    >
                      📋 Copy Transcript
                    </button>
                  </div>
                  <pre
                    style={{
                      maxHeight: 320,
                      overflowY: 'auto',
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 16,
                      fontSize: 13,
                      lineHeight: '1.6',
                      fontFamily: "'Courier New', Courier, monospace",
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap',
                      margin: 0,
                      boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {viewingTranscriptJob.transcript}
                  </pre>
                </div>
              ) : (
                /* Unprepared / Empty State */
                <div
                  style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    background: 'var(--bg-elevated)',
                    border: '1px dashed var(--border)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  <div style={{ fontSize: 32 }}>🤖</div>
                  <div>
                    <h4 style={{ fontWeight: 700, margin: '0 0 6px 0', fontSize: 14.5 }}>No Transcript Available Yet</h4>
                    <p className="text-muted" style={{ fontSize: 12.5, maxWidth: 360, margin: '0 auto', lineHeight: 1.5 }}>
                      This case has not been transcribed yet. Go to the AutoScript workstation to generate a quick AI draft or upload recording audio.
                    </p>
                  </div>
                  {viewingTranscriptJob.status !== 'NEW' ? (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setViewingTranscriptJob(null);
                        navigate(`/autoscript?jobId=${viewingTranscriptJob.id}`);
                      }}
                      style={{ marginTop: 6 }}
                    >
                      ⚡ Open AutoScript Workstation
                    </button>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                      ⚠️ Please assign a reporter first to record/scope this job.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 0 }}>
              <button className="btn btn-secondary" onClick={() => setViewingTranscriptJob(null)}>
                Close
              </button>
              {viewingTranscriptJob.transcript && viewingTranscriptJob.status !== 'COMPLETED' && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setViewingTranscriptJob(null);
                    navigate(`/autoscript?jobId=${viewingTranscriptJob.id}`);
                  }}
                >
                  ✏️ Scope in Workstation
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, Job, JobStatus } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';

export default function Transcriptions() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [text, setText] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [searchParams] = useSearchParams();
  const urlJobId = searchParams.get('jobId');

  const toast = useToast();

  async function loadJobs(silent = false) {
    if (!silent) setLoading(true);
    try {
      // Filter out NEW jobs since they haven't been assigned a reporter to record yet
      const allJobs = await api.jobs.list();
      const eligible = allJobs.filter(j => j.status !== 'NEW');
      setJobs(eligible);

      // Re-sync selected job if it is currently selected
      if (selectedJob) {
        const fresh = eligible.find(j => j.id === selectedJob.id);
        if (fresh) {
          setSelectedJob(fresh);
          setText(fresh.transcript || '');
        }
      }
      return eligible;
    } catch {
      toast('Failed to load jobs data', 'error');
      return [];
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    async function init() {
      const eligible = await loadJobs();
      if (urlJobId) {
        const target = eligible.find(j => j.id === parseInt(urlJobId, 10));
        if (target) {
          setSelectedJob(target);
          setText(target.transcript || '');
          setEditMode(false);
          setAudioFile(null);
        }
      }
    }
    init();
  }, [urlJobId]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadJobs(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedJob?.id]);

  function selectJob(job: Job) {
    setSelectedJob(job);
    setText(job.transcript || '');
    setEditMode(false);
    setAudioFile(null);
  }

  async function handleQuickDraft() {
    if (!selectedJob) return;
    setActionLoading(true);
    try {
      const res = await api.jobs.generateTranscript(selectedJob.id);
      setSelectedJob(res.data);
      setText(res.data.transcript || '');
      setJobs(js => js.map(j => j.id === res.data.id ? res.data : j));
      toast(res.message || 'AI Legal Draft generated successfully!', 'success');
    } catch (e: any) {
      toast(e.message || 'Failed to generate AI draft', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAudioTranscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedJob || !audioFile) return;
    setActionLoading(true);
    try {
      const res = await api.jobs.transcribeAudio(selectedJob.id, audioFile);
      setSelectedJob(res.data);
      setText(res.data.transcript || '');
      setAudioFile(null);
      setJobs(js => js.map(j => j.id === res.data.id ? res.data : j));
      toast(res.message || 'Audio transcribed successfully!', 'success');
    } catch (e: any) {
      toast(e.message || 'Transcription failed', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAudioTranscribeReupload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!selectedJob || !file) return;
    setActionLoading(true);
    try {
      const res = await api.jobs.transcribeAudio(selectedJob.id, file);
      setSelectedJob(res.data);
      setText(res.data.transcript || '');
      setJobs(js => js.map(j => j.id === res.data.id ? res.data : j));
      toast(res.message || 'Audio transcribed successfully!', 'success');
    } catch (e: any) {
      toast(e.message || 'Transcription failed', 'error');
    } finally {
      setActionLoading(false);
      e.target.value = ''; // Reset input
    }
  }

  async function handleSaveEdits() {
    if (!selectedJob) return;
    setActionLoading(true);
    try {
      const updated = await api.jobs.updateTranscript(selectedJob.id, text);
      setSelectedJob(updated);
      setEditMode(false);
      setJobs(js => js.map(j => j.id === updated.id ? updated : j));
      toast('Transcript scoping saved successfully!', 'success');
    } catch (e: any) {
      toast(e.message || 'Failed to save changes', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAdvanceStatus() {
    if (!selectedJob) return;
    setActionLoading(true);
    try {
      const updated = await api.jobs.advanceStatus(selectedJob.id);
      setSelectedJob(updated);
      setJobs(js => js.map(j => j.id === updated.id ? updated : j));
      if (updated.status === 'COMPLETED') {
        toast('🎉 Job completed successfully! Payout has been auto-calculated.', 'success');
      } else {
        toast(`Status successfully advanced to ${updated.status}!`, 'success');
      }
    } catch (e: any) {
      toast(e.message || 'Failed to advance job status', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', margin: '-32px', background: 'var(--bg-base)' }}>
      
      {/* Left Sidebar Pane - Job Selection */}
      <div style={{
        width: 320,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0
      }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>🎙️ AutoScript Console</div>
          <div className="text-muted mt-1" style={{ fontSize: 12 }}>{jobs.length} active legal cases</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading && jobs.length === 0 && <div className="loading" style={{ padding: 24 }}>Loading cases...</div>}
          {!loading && jobs.length === 0 && (
            <div className="empty-state" style={{ padding: 24, fontSize: 13 }}>
              <div className="empty-state-icon" style={{ fontSize: 24 }}>⚖️</div>
              <div className="empty-state-text">No active jobs found.<br/>Assign a reporter first.</div>
            </div>
          )}
          {jobs.map(job => {
            const isSelected = selectedJob?.id === job.id;
            return (
              <div
                key={job.id}
                onClick={() => selectJob(job)}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                  border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                className="job-pane-item"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: isSelected ? '#fff' : 'var(--text-primary)', lineHeight: 1.4 }}>
                    {job.case_name}
                  </div>
                  <StatusBadge status={job.status} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 11, color: 'var(--text-secondary)' }}>
                  <span>⏱️ {job.duration} mins</span>
                  <span>{job.transcript ? '✅ AI Drafted' : '🔴 Unprepared'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Content Pane - Workspace */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-base)' }}>
        {!selectedJob ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', gap: 16 }}>
            <div style={{ fontSize: 64 }}>🤖</div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>AutoScript Workstation</h2>
              <p className="text-muted" style={{ fontSize: 13, maxWidth: 360, lineHeight: 1.5 }}>
                Select a court reporting case from the left panel to generate AI draf transcripts or perform scoping edits.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Case Workspace Header */}
            <div style={{
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border)',
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                  ⚖️ {selectedJob.case_name}
                </h2>
                <div className="text-muted mt-1" style={{ fontSize: 12, display: 'flex', gap: 12 }}>
                  <span>Job: #{selectedJob.id}</span>
                  <span>·</span>
                  <span>Reporter: {selectedJob.reporter_name || '—'}</span>
                  <span>·</span>
                  <span>Editor: {selectedJob.editor_name || '—'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {/* Re-upload Audio */}
                {selectedJob.transcript && !editMode && (
                  <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                    <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleAudioTranscribeReupload} disabled={actionLoading} />
                    {actionLoading ? '⏳ Uploading...' : '🔄 Re-upload Audio'}
                  </label>
                )}

                {/* Submit for Review (TRANSCRIBED -> REVIEWED) */}
                {selectedJob.status === 'TRANSCRIBED' && selectedJob.transcript && (
                  <button
                    className="btn btn-sm btn-success"
                    onClick={handleAdvanceStatus}
                    disabled={actionLoading}
                  >
                    {actionLoading ? '⏳ Submitting...' : '→ Submit for Review'}
                  </button>
                )}

                {/* Mark as Completed (REVIEWED -> COMPLETED) */}
                {selectedJob.status === 'REVIEWED' && selectedJob.transcript && !editMode && (
                  <button
                    className="btn btn-sm btn-success"
                    onClick={handleAdvanceStatus}
                    disabled={actionLoading}
                  >
                    {actionLoading ? '⏳ Completing...' : '✓ Mark as Completed'}
                  </button>
                )}

                {/* Edit & Scope - only available in REVIEWED status */}
                {selectedJob.transcript && selectedJob.status === 'REVIEWED' && (
                  <button
                    className={`btn btn-sm ${editMode ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => setEditMode(!editMode)}
                    disabled={actionLoading}
                  >
                    {editMode ? '✕ Cancel' : '✏️ Edit & Scope'}
                  </button>
                )}
                {editMode && (
                  <button className="btn btn-sm btn-success" onClick={handleSaveEdits} disabled={actionLoading}>
                    {actionLoading ? '⏳ Saving...' : '✓ Save Changes'}
                  </button>
                )}
              </div>
            </div>

            {/* Main Editor/Workspace Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 28, display: 'flex', flexDirection: 'column' }}>
              
              {/* Case has NO transcript yet */}
              {!selectedJob.transcript ? (
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 40,
                  maxWidth: 600,
                  margin: '0 auto',
                  textAlign: 'center',
                  gap: 24
                }}>
                  <div style={{ fontSize: 54 }}>🤖</div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Generate Legal Transcript Draft</h3>
                    <p className="text-muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
                      AutoScript is ready for this case. You can instantly generate an AI mock legal Q&A draft using Llama 3, or upload a real audio recording for Whisper-large-v3 transcription.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 380, marginTop: 10 }}>
                    {/* Llama Quick Draft */}
                    <button
                      className="btn btn-primary"
                      style={{
                        background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
                        padding: '14px 20px',
                        justifyContent: 'center',
                        fontSize: 14,
                        boxShadow: 'var(--shadow-glow)'
                      }}
                      onClick={handleQuickDraft}
                      disabled={actionLoading}
                    >
                      {actionLoading ? '⏳ Generating AI Draft...' : '⚡ Quick AI Legal Draft (Llama 3)'}
                    </button>

                    <div style={{ color: 'var(--text-muted)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
                      <span>OR UPLOAD AUDIO RECORDING</span>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
                    </div>

                    {/* Whisper Audio Upload */}
                    <form onSubmit={handleAudioTranscribe} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{
                        border: '2px dashed var(--border)',
                        borderRadius: 12,
                        padding: '24px 16px',
                        cursor: 'pointer',
                        background: 'var(--bg-elevated)',
                        transition: 'all 0.15s ease',
                        position: 'relative'
                      }}>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            opacity: 0,
                            cursor: 'pointer'
                          }}
                          required
                        />
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🎙️</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {audioFile ? audioFile.name : 'Choose or Drag Audio File'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                          Supports .mp3, .wav, .m4a (Max 25MB)
                        </div>
                      </div>

                      {audioFile && (
                        <button
                          type="submit"
                          className="btn btn-success"
                          style={{ justifyContent: 'center', padding: '12px', fontSize: 13.5 }}
                          disabled={actionLoading}
                        >
                          {actionLoading ? '⏳ Transcribing with Whisper...' : '✓ Transcribe Audio (Groq Whisper)'}
                        </button>
                      )}
                    </form>
                  </div>
                </div>
              ) : (
                /* Case HAS transcript - Render Workspace Editor */
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', gap: 16 }}>
                  
                  {/* Status ribbon */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    padding: '12px 18px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12.5
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--accent-light)' }}>
                      ✨ AutoScript AI Draft Prepared
                    </span>
                    <span className="badge badge-transcribed" style={{ fontSize: 11 }}>
                      Status: {selectedJob.status}
                    </span>
                  </div>

                  {/* Document Box */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 400 }}>
                    {editMode ? (
                      <textarea
                        style={{
                          flex: 1,
                          width: '100%',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-lg)',
                          color: 'var(--text-primary)',
                          padding: '24px',
                          fontFamily: "'Courier New', Courier, monospace",
                          fontSize: '14px',
                          lineHeight: '1.7',
                          resize: 'none',
                          outline: 'none'
                        }}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Start typing/scoping legal text here..."
                      />
                    ) : (
                      <pre style={{
                        flex: 1,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        color: 'var(--text-primary)',
                        padding: '28px',
                        fontFamily: "'Courier New', Courier, monospace",
                        fontSize: '14px',
                        lineHeight: '1.7',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        margin: 0,
                        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)'
                      }}>
                        {text}
                      </pre>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

    </div>
  );
}

import { useEffect, useState } from 'react';
import { api, Job, JobStatus, formatIDR } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';

interface StatusCount { status: JobStatus; count: number; }

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [summary, setSummary] = useState({ total_reporter: 0, total_editor: 0, grand_total: 0, job_count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.jobs.list(), api.payments.summary()]).then(([j, s]) => {
      setJobs(j);
      setSummary(s);
    }).finally(() => setLoading(false));
  }, []);

  const statusCounts = (['NEW', 'ASSIGNED', 'TRANSCRIBED', 'REVIEWED', 'COMPLETED'] as JobStatus[]).map(s => ({
    status: s,
    count: jobs.filter(j => j.status === s).length,
  }));

  const recentJobs = [...jobs].slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Court Reporting Workflow Overview</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Total Jobs</div>
          <div className="stat-card-value">{jobs.length}</div>
          <div className="stat-card-icon">📋</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Completed</div>
          <div className="stat-card-value">{jobs.filter(j => j.status === 'COMPLETED').length}</div>
          <div className="stat-card-icon">✅</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">In Progress</div>
          <div className="stat-card-value">{jobs.filter(j => !['NEW', 'COMPLETED'].includes(j.status)).length}</div>
          <div className="stat-card-icon">⚙️</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Unassigned</div>
          <div className="stat-card-value">{jobs.filter(j => !j.reporter_id).length}</div>
          <div className="stat-card-icon">🔴</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Payout</div>
          <div className="stat-card-value" style={{ fontSize: 20 }}>{formatIDR(summary.grand_total)}</div>
          <div className="stat-card-icon">💰</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Paid Jobs</div>
          <div className="stat-card-value">{summary.job_count}</div>
          <div className="stat-card-icon">🧾</div>
        </div>
      </div>

      {/* Status breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>📊 Jobs by Status</div>
          {statusCounts.map(({ status, count }) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <StatusBadge status={status} />
              <span style={{ fontWeight: 700, fontSize: 16 }}>{count}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>💳 Payment Summary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Reporter Payouts', value: summary.total_reporter, icon: '🎙️' },
              { label: 'Editor Payouts', value: summary.total_editor, icon: '✏️' },
              { label: 'Grand Total', value: summary.grand_total, icon: '💰', highlight: true },
            ].map(({ label, value, icon, highlight }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', borderRadius: 8,
                background: highlight ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                border: `1px solid ${highlight ? 'rgba(99,102,241,0.2)' : 'var(--border)'}`,
              }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{icon} {label}</span>
                <span style={{ fontWeight: 700, color: highlight ? 'var(--accent-light)' : 'var(--text-primary)' }}>
                  {formatIDR(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent jobs */}
      <div className="table-container">
        <div className="table-header">
          <span className="table-title">🕐 Recent Jobs</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Case</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Reporter</th>
              <th>Editor</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="loading">Loading...</td></tr>}
            {!loading && recentJobs.map(job => (
              <tr key={job.id}>
                <td style={{ fontWeight: 500 }}>{job.case_name}</td>
                <td>{job.duration} min</td>
                <td><StatusBadge status={job.status} /></td>
                <td>{job.reporter_name ?? <span className="text-muted">—</span>}</td>
                <td>{job.editor_name ?? <span className="text-muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

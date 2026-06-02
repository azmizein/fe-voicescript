import { useEffect, useState } from 'react';
import { api, Payment, formatIDR } from '../api/client';

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState({ total_reporter: 0, total_editor: 0, grand_total: 0, job_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [p, s] = await Promise.all([api.payments.list(), api.payments.summary()]);
      setPayments(p); setSummary(s);
    } catch { setError('Failed to load payments'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Payment records for all completed jobs</p>
        </div>
      </div>

      {error && <div className="error-msg mb-4">{error}</div>}

      {/* Summary cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-label">Paid Jobs</div>
          <div className="stat-card-value">{summary.job_count}</div>
          <div className="stat-card-icon">🧾</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Reporter Total</div>
          <div className="stat-card-value" style={{ fontSize: 20 }}>{formatIDR(summary.total_reporter)}</div>
          <div className="stat-card-icon">🎙️</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Editor Total</div>
          <div className="stat-card-value" style={{ fontSize: 20 }}>{formatIDR(summary.total_editor)}</div>
          <div className="stat-card-icon">✏️</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Grand Total</div>
          <div className="stat-card-value" style={{ fontSize: 20, color: 'var(--accent-light)' }}>{formatIDR(summary.grand_total)}</div>
          <div className="stat-card-icon">💰</div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <span className="table-title">💳 Payment Records</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Case</th>
              <th>Duration</th>
              <th>Reporter</th>
              <th>Rate/min</th>
              <th>Reporter Pay</th>
              <th>Editor</th>
              <th>Editor Pay</th>
              <th>Total</th>
              <th>Calculated</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="loading">Loading...</td></tr>}
            {!loading && payments.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <div className="empty-state">
                    <div className="empty-state-icon">💳</div>
                    <div className="empty-state-text">No payment records yet. Calculate payments from the Jobs page.</div>
                  </div>
                </td>
              </tr>
            )}
            {payments.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 500, maxWidth: 200 }}>{p.case_name}</td>
                <td>{p.duration} min</td>
                <td>{p.reporter_name ?? <span className="text-muted">—</span>}</td>
                <td className="text-muted">Rp {p.rate_per_minute.toLocaleString('id-ID')}</td>
                <td style={{ color: '#67c2f8', fontWeight: 600 }}>{formatIDR(p.reporter_payout)}</td>
                <td>{p.editor_name ?? <span className="text-muted">—</span>}</td>
                <td style={{ color: '#a8d46f', fontWeight: 600 }}>{formatIDR(p.editor_payout)}</td>
                <td style={{ color: 'var(--accent-light)', fontWeight: 700 }}>{formatIDR(p.total_payout)}</td>
                <td className="text-muted" style={{ fontSize: 12 }}>
                  {new Date(p.calculated_at).toLocaleDateString('id-ID')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

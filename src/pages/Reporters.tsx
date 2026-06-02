import { useEffect, useState } from 'react';
import { api, Reporter } from '../api/client';

export default function Reporters() {
  const [reporters, setReporters] = useState<Reporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [rate, setRate] = useState('2000');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      setReporters(await api.reporters.list());
    } catch { setError('Failed to load reporters'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !city) { setError('Name and city are required'); return; }
    setSaving(true); setError('');
    try {
      await api.reporters.create({ name, city, ratePerMinute: Number(rate) });
      setName(''); setCity(''); setRate('2000');
      setShowForm(false);
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function toggleAvailability(r: Reporter) {
    try {
      const updated = await api.reporters.update(r.id, { isAvailable: !r.is_available } as any);
      setReporters(rs => rs.map(rep => rep.id === updated.id ? updated : rep));
    } catch (e: any) { setError(e.message); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this reporter?')) return;
    try {
      await api.reporters.delete(id);
      setReporters(rs => rs.filter(r => r.id !== id));
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reporters</h1>
          <p className="page-subtitle">{reporters.length} court reporters</p>
        </div>
        <button id="add-reporter-btn" className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add Reporter'}
        </button>
      </div>

      {error && <div className="error-msg mb-4">{error}</div>}

      {showForm && (
        <div className="card mb-4" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>New Reporter</div>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div className="form-group">
              <label htmlFor="rep-name">Name</label>
              <input id="rep-name" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" required />
            </div>
            <div className="form-group">
              <label htmlFor="rep-city">City</label>
              <input id="rep-city" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Jakarta" required />
            </div>
            <div className="form-group">
              <label htmlFor="rep-rate">Rate (IDR/min)</label>
              <input id="rep-rate" type="number" value={rate} onChange={e => setRate(e.target.value)} min={0} />
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
              <th>City</th>
              <th>Rate/min</th>
              <th>Availability</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="loading">Loading...</td></tr>}
            {!loading && reporters.length === 0 && (
              <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-icon">🎙️</div><div>No reporters yet</div></div></td></tr>
            )}
            {reporters.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                <td>
                  <span style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 6, fontSize: 13 }}>
                    📍 {r.city}
                  </span>
                </td>
                <td>Rp {r.rate_per_minute.toLocaleString('id-ID')}/mnt</td>
                <td>
                  <span className={`badge ${r.is_available ? 'badge-available' : 'badge-unavailable'}`}>
                    {r.is_available ? '● Available' : '○ Busy'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      id={`toggle-reporter-${r.id}`}
                      className={`btn btn-sm ${r.is_available ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => toggleAvailability(r)}
                    >
                      {r.is_available ? 'Set Busy' : 'Set Available'}
                    </button>
                    <button
                      id={`delete-reporter-${r.id}`}
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(r.id)}
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
    </div>
  );
}

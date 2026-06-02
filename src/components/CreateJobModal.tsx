import { useState } from 'react';
import { api, LocationType } from '../api/client';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateJobModal({ onClose, onCreated }: Props) {
  const [caseName, setCaseName] = useState('');
  const [duration, setDuration] = useState('');
  const [locationType, setLocationType] = useState<LocationType>('physical');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!caseName.trim() || !duration) { setError('All fields are required'); return; }
    if (locationType === 'physical' && !city.trim()) { setError('City is required for physical jobs'); return; }

    setLoading(true); setError('');
    try {
      await api.jobs.create({
        caseName: caseName.trim(),
        duration: Number(duration),
        locationType,
        city: locationType === 'physical' ? city.trim() : undefined,
      });
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">📋 Create New Job</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}

          <div className="form-group">
            <label htmlFor="case-name">Case Name</label>
            <input
              id="case-name"
              type="text"
              placeholder="e.g. Perkara Perdata No. 123/2024"
              value={caseName}
              onChange={e => setCaseName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="duration">Duration (minutes)</label>
            <input
              id="duration"
              type="number"
              min={1}
              placeholder="e.g. 90"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="location-type">Location Type</label>
            <select
              id="location-type"
              value={locationType}
              onChange={e => setLocationType(e.target.value as LocationType)}
            >
              <option value="physical">📍 Physical</option>
              <option value="remote">🌐 Remote</option>
            </select>
          </div>

          {locationType === 'physical' && (
            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                id="city"
                type="text"
                placeholder="e.g. Jakarta"
                value={city}
                onChange={e => setCity(e.target.value)}
                required
              />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Creating...' : '✓ Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

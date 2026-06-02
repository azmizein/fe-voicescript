import { JobStatus, STATUS_ORDER } from '../api/client';

const STATUS_EMOJI: Record<JobStatus, string> = {
  NEW: '🆕',
  ASSIGNED: '👤',
  TRANSCRIBED: '📝',
  REVIEWED: '🔍',
  COMPLETED: '✅',
};

const STATUS_CLASS: Record<JobStatus, string> = {
  NEW: 'badge-new',
  ASSIGNED: 'badge-assigned',
  TRANSCRIBED: 'badge-transcribed',
  REVIEWED: 'badge-reviewed',
  COMPLETED: 'badge-completed',
};

interface Props {
  status: JobStatus;
  showFlow?: boolean;
}

export function StatusBadge({ status, showFlow }: Props) {
  if (!showFlow) {
    return (
      <span className={`badge ${STATUS_CLASS[status]}`}>
        {STATUS_EMOJI[status]} {status}
      </span>
    );
  }

  return (
    <div className="status-flow">
      {STATUS_ORDER.map((s, i) => {
        const idx = STATUS_ORDER.indexOf(status);
        const isDone = i < idx;
        const isCurrent = s === status;
        return (
          <>
            {i > 0 && <span className="status-arrow">›</span>}
            <span key={s} className={`status-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
              {s}
            </span>
          </>
        );
      })}
    </div>
  );
}

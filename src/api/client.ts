// Typed API client — all fetch calls in one place

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Request failed');
  return json.data ?? json;
}

/** Returns the full response body (not just .data) */
async function requestFull<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Request failed');
  return json as T;
}

// ── Types ──────────────────────────────────────────────────────────────────
export type JobStatus = 'NEW' | 'ASSIGNED' | 'TRANSCRIBED' | 'REVIEWED' | 'COMPLETED';
export type LocationType = 'physical' | 'remote';

export interface Job {
  id: number;
  case_name: string;
  duration: number;
  location_type: LocationType;
  city: string | null;
  status: JobStatus;
  reporter_id: number | null;
  editor_id: number | null;
  transcript: string | null;
  created_at: string;
  updated_at: string;
  reporter_name?: string | null;
  reporter_city?: string | null;
  editor_name?: string | null;
}

export interface Reporter {
  id: number;
  name: string;
  city: string;
  is_available: number;
  rate_per_minute: number;
  created_at: string;
}

export interface Editor {
  id: number;
  name: string;
  flat_fee: number;
  created_at: string;
}

export interface Payment {
  id: number;
  job_id: number;
  case_name: string;
  duration: number;
  reporter_payout: number;
  editor_payout: number;
  total_payout: number;
  rate_per_minute: number;
  calculated_at: string;
  reporter_name: string | null;
  editor_name: string | null;
}

export interface AutoAssignResult {
  data: Job;
  message: string;
  assignedReporter?: { id: number; name: string; city: string };
  assignedEditor?: { id: number; name: string; flatFee: number };
}

export interface BatchAssignResult {
  data: Array<{
    jobId: number;
    caseName: string;
    role?: 'reporter' | 'editor';
    status: 'assigned' | 'skipped';
    reason?: string;
    reporter?: { id: number; name: string; city: string };
    editor?: { id: number; name: string; flatFee: number };
  }>;
  message: string;
}

export interface PaymentSummary {
  total_reporter: number;
  total_editor: number;
  grand_total: number;
  job_count: number;
}

// ── Jobs API ───────────────────────────────────────────────────────────────
export const api = {
  jobs: {
    list: () => request<Job[]>('/jobs'),
    get: (id: number) => request<Job>(`/jobs/${id}`),
    create: (data: { caseName: string; duration: number; locationType: LocationType; city?: string }) =>
      request<Job>('/jobs', { method: 'POST', body: JSON.stringify(data) }),
    advanceStatus: (id: number) =>
      request<Job>(`/jobs/${id}/status`, { method: 'PATCH' }),
    assignReporter: (jobId: number, reporterId: number) =>
      request<Job>(`/jobs/${jobId}/assign-reporter`, {
        method: 'POST', body: JSON.stringify({ reporterId }),
      }),
    assignEditor: (jobId: number, editorId: number) =>
      request<Job>(`/jobs/${jobId}/assign-editor`, {
        method: 'POST', body: JSON.stringify({ editorId }),
      }),
    autoAssignReporter: (jobId: number) =>
      requestFull<AutoAssignResult>(`/jobs/${jobId}/auto-assign-reporter`, { method: 'POST' }),
    autoAssignEditor: (jobId: number) =>
      requestFull<AutoAssignResult>(`/jobs/${jobId}/auto-assign-editor`, { method: 'POST' }),
    batchAutoAssign: () =>
      requestFull<BatchAssignResult>('/jobs/batch/auto-assign', { method: 'POST' }),
    suggestedReporters: (jobId: number) =>
      request<Reporter[]>(`/jobs/${jobId}/reporters/suggested`),
    delete: (id: number) =>
      request<{ message: string }>(`/jobs/${id}`, { method: 'DELETE' }),
    generateTranscript: (id: number) =>
      requestFull<AutoAssignResult>(`/jobs/${id}/generate-transcript`, { method: 'POST' }),
    updateTranscript: (id: number, transcript: string) =>
      request<Job>(`/jobs/${id}/transcript`, { method: 'PATCH', body: JSON.stringify({ transcript }) }),
    transcribeAudio: async (jobId: number, audioFile: File): Promise<AutoAssignResult> => {
      const formData = new FormData();
      formData.append('audio', audioFile);
      const res = await fetch(`/api/jobs/${jobId}/transcribe-audio`, {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Audio transcription failed');
      return json as AutoAssignResult;
    },
  },

  reporters: {
    list: () => request<Reporter[]>('/reporters'),
    create: (data: { name: string; city: string; ratePerMinute?: number }) =>
      request<Reporter>('/reporters', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Reporter>) =>
      request<Reporter>(`/reporters/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ message: string }>(`/reporters/${id}`, { method: 'DELETE' }),
  },

  editors: {
    list: () => request<Editor[]>('/editors'),
    create: (data: { name: string; flatFee?: number }) =>
      request<Editor>('/editors', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Editor>) =>
      request<Editor>(`/editors/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ message: string }>(`/editors/${id}`, { method: 'DELETE' }),
  },

  payments: {
    list: () => request<Payment[]>('/payments'),
    summary: () => request<PaymentSummary>('/payments/summary'),
    calculate: (jobId: number) =>
      request<Payment>(`/payments/calculate/${jobId}`, { method: 'POST' }),
  },
};

// ── Formatters ─────────────────────────────────────────────────────────────
export const formatIDR = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);

export const STATUS_ORDER: JobStatus[] = ['NEW', 'ASSIGNED', 'TRANSCRIBED', 'REVIEWED', 'COMPLETED'];

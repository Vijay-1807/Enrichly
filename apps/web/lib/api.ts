export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:5000';

export type Job = {
  id: string; name: string; description?: string | null; type: string;
  url: string; method: string; headersJson?: string | null; body?: string | null;
  scheduleMode: string; intervalSeconds?: number | null; enabled: boolean;
  maxRetries: number; timeoutSeconds: number;
  lastRunAt?: string | null; nextRunAt?: string | null;
  createdAt: string; updatedAt: string; rowVersion?: string | null;
  lastStatus?: string | null; totalExecutions: number; failedExecutions: number;
  successRate?: number | null;
};

export type ExecutionSummary = {
  id: string; jobId: string; jobName: string; status: string; attempt: number;
  workerId?: string | null; responseStatus?: number | null; durationMs?: number | null;
  errorMessage?: string | null; trigger: string;
  startedAt?: string | null; completedAt?: string | null; createdAt: string;
};

export type ExecutionDetail = ExecutionSummary & {
  parentExecutionId?: string | null; nextRetryAt?: string | null;
  attempts: { attemptNumber: number; status: string; startedAt: string; completedAt?: string | null; responseStatus?: number | null; responseBody?: string | null; durationMs?: number | null; errorMessage?: string | null }[];
  logs: { level: string; message: string; createdAt: string }[];
};

function token() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('enrichly_token');
}

async function req<T>(path: string, init: RequestInit = {}, idempotencyKey?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...((init.headers as any) || {}) };
  const t = token();
  if (t) headers['Authorization'] = `Bearer ${t}`;
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    localStorage.removeItem('enrichly_token');
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as any)?.error || `Request failed (${res.status})`);
  return body as T;
}

export const api = {
  register: (email: string, password: string) =>
    req<{ id: string; email: string; token: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    req<{ id: string; email: string; token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  stats: () => req<{ totalJobs: number; activeJobs: number; runningExecutions: number; failedLast24h: number; successRateLast24h: number; executionsLast24h: number; recentExecutions: ExecutionSummary[] }>('/api/dashboard/stats'),
  listJobs: (params: Record<string, string | number> = {}) => {
    const q = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    return req<{ items: Job[]; total: number; page: number; pageSize: number }>(`/api/jobs?${q}`);
  },
  getJob: (id: string) => req<Job>(`/api/jobs/${id}`),
  createJob: (payload: any) => req<Job>('/api/jobs', { method: 'POST', body: JSON.stringify(payload) }),
  updateJob: (id: string, payload: any) => req<Job>(`/api/jobs/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteJob: (id: string) => req<void>(`/api/jobs/${id}`, { method: 'DELETE' }),
  runJob: (id: string) =>
    req<{ execution: ExecutionSummary; deduplicated: boolean }>(`/api/jobs/${id}/run`, { method: 'POST' }, crypto.randomUUID()),
  jobExecutions: (id: string, params: Record<string, string | number> = {}) => {
    const q = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    return req<{ items: ExecutionSummary[]; total: number }>(`/api/jobs/${id}/executions?${q}`);
  },
  getExecution: (id: string) => req<ExecutionDetail>(`/api/executions/${id}`),
  retryExecution: (id: string) => req<{ executionId: string }>(`/api/executions/${id}/retry`, { method: 'POST' }),
  cancelExecution: (id: string) => req<{ status: string }>(`/api/executions/${id}/cancel`, { method: 'POST' }),
  health: () => req<any>('/api/health'),
};

export function statusColor(s?: string | null) {
  switch ((s || '').toLowerCase()) {
    case 'success': return 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200';
    case 'failed': return 'bg-red-100 text-red-900 ring-1 ring-red-200';
    case 'running': return 'bg-sky-100 text-sky-900 ring-1 ring-sky-200';
    case 'queued': return 'bg-amber-100 text-amber-900 ring-1 ring-amber-300';
    case 'cancelled': return 'bg-stone-200 text-stone-600 ring-1 ring-stone-300';
    default: return 'bg-stone-100 text-stone-500 ring-1 ring-stone-200';
  }
}

export function isLiveStatus(s?: string | null) {
  const v = (s || '').toLowerCase();
  return v === 'running' || v === 'queued';
}

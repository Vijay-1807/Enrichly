import { statusColor } from '@/lib/api';

export function StatusBadge({ status }: { status?: string | null }) {
  return <span className={`badge ${statusColor(status)}`}>{status || '—'}</span>;
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card text-center text-slate-500">
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-sm">{hint}</p>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p className="font-medium">Something went wrong</p>
      <p className="mt-1">{message}</p>
      {onRetry && <button onClick={onRetry} className="btn-secondary mt-3">Retry</button>}
    </div>
  );
}

export function timeAgo(iso?: string | null) {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleString();
}

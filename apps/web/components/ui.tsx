import { isLiveStatus, statusColor } from '@/lib/api';

export function StatusBadge({ status }: { status?: string | null }) {
  const live = isLiveStatus(status);
  const dotTone =
    (status || '').toLowerCase() === 'success' ? 'bg-emerald-500 text-emerald-500'
    : (status || '').toLowerCase() === 'failed' ? 'bg-red-500 text-red-500'
    : (status || '').toLowerCase() === 'running' ? 'bg-sky-500 text-sky-500'
    : (status || '').toLowerCase() === 'queued' ? 'bg-amber-500 text-amber-500'
    : 'bg-stone-400 text-stone-400';
  return (
    <span className={`badge ${statusColor(status)}`}>
      <span className={`dot ${dotTone} ${live ? 'dot-live' : ''}`} />
      {status || '—'}
    </span>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="card animate-fade border-dashed text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 text-2xl shadow-inner">
        📭
      </div>
      <p className="mt-3 font-bold text-stone-800">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="animate-pop rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-900">
      <p className="font-bold">Something went wrong</p>
      <p className="mt-1">{message}</p>
      {onRetry && <button onClick={onRetry} className="btn-secondary mt-3">Try again</button>}
    </div>
  );
}

export function SkeletonRows({ n = 3 }: { n?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="skeleton h-12 w-full" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  );
}

export function timeAgo(iso?: string | null) {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleString();
}

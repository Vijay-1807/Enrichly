import { isLiveStatus } from '@/lib/api';

/* Minimal line icons — no emoji, like the reference */
export function LineIcon({ d, className = 'h-5 w-5' }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}

export const ICONS = {
  box: 'M21 8.5v7a2 2 0 0 1-1 1.73l-6 3.5a2 2 0 0 1-2 0l-6-3.5A2 2 0 0 1 5 15.5v-7a2 2 0 0 1 1-1.73l6-3.5a2 2 0 0 1 2 0l6 3.5A2 2 0 0 1 21 8.5ZM5.3 7.2 12 11l6.7-3.8M12 22v-9',
  bolt: 'M13 2 4 14h6l-1 8 9-12h-6l1-8Z',
  layers: 'm12 2 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  code: 'm8 8-5 4 5 4m8-8 5 4-5 4M14 4l-4 16',
  chip: 'M9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 3h8v8H8V8Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2',
  check: 'm4 12.5 5 5L20 6.5',
  arrow: 'M7 17 17 7M8 7h9v9',
  search: 'm21 21-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z',
  play: 'M8 5v14l11-7L8 5Z',
};

const DOT_TONE: Record<string, string> = {
  success: 'bg-emerald-600 text-emerald-600',
  failed: 'bg-red-500 text-red-500',
  running: 'bg-sky-600 text-sky-600',
  queued: 'bg-amber-500 text-amber-500',
};

export function StatusBadge({ status }: { status?: string | null }) {
  const key = (status || '').toLowerCase();
  const live = isLiveStatus(status);
  return (
    <span className="pill">
      <span className={`dot ${DOT_TONE[key] || 'bg-stone-400 text-stone-400'} ${live ? 'dot-live' : ''}`} />
      {status || '—'}
    </span>
  );
}

export function SectionLabel({ index, title, aside }: { index: string; title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between">
      <p className="eyebrow">{index} /&nbsp;&nbsp;{title}</p>
      {aside}
    </div>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="card animate-fade border-dashed p-10 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf1e8] text-[#1d4a38]">
        <LineIcon d={ICONS.box} />
      </div>
      <p className="mt-3 font-semibold">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="animate-fade rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-900">
      <p className="font-semibold">Something went wrong</p>
      <p className="mt-1">{message}</p>
      {onRetry && <button onClick={onRetry} className="btn-outline mt-3">Try again</button>}
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

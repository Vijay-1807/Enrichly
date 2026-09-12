import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthBar } from '@/components/AuthBar';
import { LineIcon, ICONS } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Enrichly · Job Automation',
  description: 'Create, schedule, run, and observe automated jobs with reliable workers.',
};

const STRIP = ['HTTP jobs', 'Interval scheduler', 'Parallel workers', 'Smart retries', 'Full history'];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-20 border-b bg-[#f7f5f0]/90 backdrop-blur" style={{ borderColor: 'var(--line)' }}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#15201a] text-[#f7f5f0]">
                <LineIcon d={ICONS.layers} className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[19px] font-bold tracking-tight">
                enrichly<span className="text-[#2e7d5b]">.</span>
                <span className="ml-2 hidden text-[13px] font-medium text-stone-400 sm:inline">job automation</span>
              </span>
            </Link>
            <nav className="mx-auto hidden items-center gap-7 text-[14px] font-medium text-stone-500 md:flex">
              <Link href="/" className="text-[#15201a] underline decoration-[#2e7d5b] decoration-2 underline-offset-8">Overview</Link>
              <Link href="/jobs/new" className="transition hover:text-[#15201a]">New job</Link>
            </nav>
            <div className="ml-auto flex items-center gap-3 md:ml-0">
              <span className="hidden items-center gap-1.5 text-xs text-stone-500 lg:flex">
                <span className="dot bg-emerald-600 text-emerald-600 dot-live" /> Open for runs
              </span>
              <Link href="/jobs/new" className="btn-primary !rounded-lg px-4 py-2">
                New job <LineIcon d={ICONS.arrow} className="h-4 w-4" />
              </Link>
              <AuthBar />
            </div>
          </div>
          <div className="hidden border-t md:block" style={{ borderColor: 'var(--line)' }}>
            <div className="mx-auto flex max-w-6xl items-center gap-5 overflow-x-auto px-6 py-2 text-xs text-stone-500">
              {STRIP.map((s, i) => (
                <span key={s} className="flex items-center gap-5 whitespace-nowrap">
                  <span className="font-medium">{s}</span>
                  {i < STRIP.length - 1 && <span className="text-stone-300">+</span>}
                </span>
              ))}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">{children}</main>
        <footer className="border-t" style={{ borderColor: 'var(--line)' }}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-6 py-6 text-xs text-stone-400">
            <span className="font-bold text-stone-600">enrichly.</span>
            <span>Job automation · PostgreSQL is the source of truth · atomic claims · exponential backoff</span>
          </div>
        </footer>
      </body>
    </html>
  );
}

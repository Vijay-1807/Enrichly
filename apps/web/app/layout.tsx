import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthBar } from '@/components/AuthBar';

export const metadata: Metadata = {
  title: 'Enrichly · Job Automation',
  description: 'Create, schedule, run, and observe automated jobs with reliable workers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-lg text-white shadow-sm">⚙️</span>
              <span className="leading-tight">
                <span className="block text-[15px] font-extrabold tracking-tight">Enrichly Jobs</span>
                <span className="block text-[11px] font-medium text-slate-400">automation platform</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1.5 text-sm font-medium">
              <Link href="/" className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900">Dashboard</Link>
              <Link href="/jobs/new" className="rounded-lg bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700">+ New job</Link>
              <AuthBar />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-slate-400">
          Enrichly HR · Full Stack Intern assignment · PostgreSQL is the source of truth · atomic claims via FOR UPDATE SKIP LOCKED · exponential backoff retries
        </footer>
      </body>
    </html>
  );
}

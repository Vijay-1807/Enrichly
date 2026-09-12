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
        <header className="sticky top-0 z-20 border-b border-orange-100 bg-[#FFFBF3]/90 shadow-[0_1px_12px_-6px_rgba(120,53,15,0.25)] backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
            <Link href="/" className="group flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-lg text-white shadow-[0_4px_12px_-4px_rgba(234,88,12,0.7)] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-105">⚙️</span>
              <span className="leading-tight">
                <span className="block text-[15px] font-extrabold tracking-tight text-stone-900">Enrichly Jobs</span>
                <span className="hidden text-[11px] font-medium text-stone-400 sm:block">automation platform</span>
              </span>
            </Link>
            <nav className="ml-auto flex items-center gap-1.5 text-sm font-medium">
              <Link href="/" className="hidden rounded-lg px-3 py-1.5 text-stone-600 transition hover:bg-orange-100 hover:text-orange-900 min-[420px]:inline">Dashboard</Link>
              <Link href="/jobs/new" className="btn-primary px-3 py-1.5">+ New job</Link>
              <AuthBar />
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 text-center text-xs text-stone-400 sm:text-left">
          Enrichly HR · Full Stack Intern assignment · PostgreSQL is the source of truth · atomic claims via FOR UPDATE SKIP LOCKED · exponential backoff retries
        </footer>
      </body>
    </html>
  );
}

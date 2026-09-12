'use client';
import { useEffect, useState } from 'react';

export function AuthBar() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    setEmail(localStorage.getItem('enrichly_email'));
    const onStorage = () => setEmail(localStorage.getItem('enrichly_email'));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  if (!email) return <a href="/login" className="btn-secondary px-3 py-1.5">Sign in</a>;
  return (
    <span className="flex items-center gap-2">
      <span className="hidden max-w-[160px] truncate text-stone-500 md:inline" title={email}>{email}</span>
      <span className="hidden h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-orange-300 text-xs font-extrabold text-orange-900 sm:flex">
        {email[0]?.toUpperCase()}
      </span>
      <button
        className="btn-secondary px-3 py-1.5"
        onClick={() => {
          localStorage.removeItem('enrichly_token');
          localStorage.removeItem('enrichly_email');
          window.location.href = '/login';
        }}
      >
        Logout
      </button>
    </span>
  );
}

export function useRequireAuth() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem('enrichly_token')) window.location.href = '/login';
    else setReady(true);
  }, []);
  return ready;
}

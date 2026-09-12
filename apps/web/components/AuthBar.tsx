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
  if (!email) return <a href="/login" className="btn-quiet px-3 py-1.5">Sign in</a>;
  return (
    <span className="flex items-center gap-2">
      <span className="hidden max-w-[150px] truncate text-[13px] text-stone-500 xl:inline" title={email}>{email}</span>
      <button
        className="btn-quiet px-2.5 py-1.5 text-[13px]"
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

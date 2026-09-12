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
      <span className="hidden text-slate-500 sm:inline">{email}</span>
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

'use client';
import { JobForm } from '@/components/JobForm';
import { useRequireAuth } from '@/components/AuthBar';
import { api } from '@/lib/api';

export default function NewJob() {
  const ready = useRequireAuth();
  if (!ready) return null;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">New job</h1>
      <JobForm submitLabel="Create job" onSubmit={async (p) => {
        const j = await api.createJob(p);
        window.location.href = `/jobs/${j.id}`;
      }} />
    </div>
  );
}

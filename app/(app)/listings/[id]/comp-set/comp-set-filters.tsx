'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export function CompSetFilters({
  id,
  radiusKm,
  limit,
}: {
  id: string;
  radiusKm: number;
  limit: number;
}) {
  const router = useRouter();
  const [r, setR] = useState(String(radiusKm));
  const [l, setL] = useState(String(limit));
  const [pending, startTransition] = useTransition();

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams();
    sp.set('radius_km', r);
    sp.set('limit', l);
    startTransition(() => {
      router.push(`/listings/${id}/comp-set?${sp.toString()}`);
    });
  }

  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={apply}>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-wide muted">Radius (km)</span>
        <input
          className="input w-28"
          type="number"
          min="0.5"
          max="50"
          step="0.5"
          value={r}
          onChange={(e) => setR(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-wide muted">Limit</span>
        <input
          className="input w-24"
          type="number"
          min="1"
          max="100"
          step="1"
          value={l}
          onChange={(e) => setL(e.target.value)}
        />
      </label>
      <button type="submit" className="btn btn-ghost" disabled={pending}>
        {pending ? 'Loading…' : 'Apply'}
      </button>
    </form>
  );
}

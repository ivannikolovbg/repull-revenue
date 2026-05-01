'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function PricingFilters({
  listingId,
  startDate,
  endDate,
}: {
  listingId: string;
  startDate: string;
  endDate: string;
}) {
  const router = useRouter();
  const [s, setS] = useState(startDate);
  const [e, setE] = useState(endDate);

  function apply(ev: React.FormEvent) {
    ev.preventDefault();
    const sp = new URLSearchParams();
    sp.set('startDate', s);
    sp.set('endDate', e);
    router.push(`/listings/${listingId}/pricing?${sp.toString()}`);
  }

  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={apply}>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-wide muted">Start</span>
        <input className="input w-40" type="date" value={s} onChange={(ev) => setS(ev.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-wide muted">End</span>
        <input className="input w-40" type="date" value={e} onChange={(ev) => setE(ev.target.value)} />
      </label>
      <button type="submit" className="btn btn-ghost">Apply</button>
    </form>
  );
}

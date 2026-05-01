'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, ExternalLink, Star } from 'lucide-react';

interface Comp {
  id: number;
  name: string | null;
  city: string | null;
  bedrooms: number | null;
  rating: number | null;
  reviewCount: number | null;
  currentNightlyRate: number | null;
  distanceKm: number | null;
  thumbnail: string | null;
  platformUrl: string | null;
}

const PAGE_SIZE = 20;

export function TopComps({
  city,
  comps,
  page,
  total,
  baseCurrency,
}: {
  city: string;
  comps: Comp[];
  page: number;
  total: number;
  baseCurrency: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function goto(p: number) {
    const sp = new URLSearchParams(searchParams.toString());
    if (p <= 1) sp.delete('compsPage');
    else sp.set('compsPage', String(p));
    router.push(`/markets/${encodeURIComponent(city)}${sp.toString() ? `?${sp.toString()}` : ''}`);
  }

  return (
    <section>
      <header className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-medium">Top comps · proximity-sorted</h2>
          <p className="text-[11px] muted">
            Page {page} of {totalPages} · {total.toLocaleString()} comps
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn btn-ghost text-xs"
            disabled={page <= 1}
            onClick={() => goto(page - 1)}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="btn btn-ghost text-xs"
            disabled={page >= totalPages}
            onClick={() => goto(page + 1)}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>
      <div className="card overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] text-[11px] uppercase tracking-wide muted border-b border-white/[0.06] bg-white/[0.02]">
          <div className="px-3 py-2">Listing</div>
          <div className="px-3 py-2 text-right">Bedrooms</div>
          <div className="px-3 py-2 text-right">Rating</div>
          <div className="px-3 py-2 text-right">Distance</div>
          <div className="px-3 py-2 text-right">Rate</div>
          <div className="px-3 py-2"></div>
        </div>
        {comps.map((c) => (
          <div
            key={c.id}
            className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] text-sm border-b border-white/[0.04] hover:bg-white/[0.04]"
          >
            <div className="px-3 py-3 truncate">{c.name ?? `Comp #${c.id}`}</div>
            <div className="px-3 py-3 text-right">{c.bedrooms ?? '—'}</div>
            <div className="px-3 py-3 text-right inline-flex items-center justify-end gap-1">
              {c.rating != null ? (
                <>
                  <Star className="w-3 h-3 text-amber-300 fill-current" />
                  {c.rating.toFixed(2)}
                  {c.reviewCount ? <span className="muted text-[11px]"> ({c.reviewCount})</span> : null}
                </>
              ) : (
                '—'
              )}
            </div>
            <div className="px-3 py-3 text-right muted">
              {c.distanceKm != null ? `${c.distanceKm.toFixed(2)} km` : '—'}
            </div>
            <div className="px-3 py-3 text-right font-mono text-xs">
              {c.currentNightlyRate != null
                ? `${baseCurrency} ${Math.round(c.currentNightlyRate).toLocaleString()}`
                : '—'}
            </div>
            <div className="px-3 py-3">
              {c.platformUrl ? (
                <Link
                  href={c.platformUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="muted hover:text-white"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

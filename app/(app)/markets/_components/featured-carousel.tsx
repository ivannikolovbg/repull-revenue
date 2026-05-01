'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { cn } from '@/core/lib/cn';

export interface FeaturedMarket {
  city: string;
  country: string | null;
  listings: number;
  avg_adr: number | null;
}

interface Props {
  markets: FeaturedMarket[];
  baseCurrency: string;
}

/**
 * Horizontally scrollable strip of the top-N featured markets. Buttons nudge
 * the scroll container by one card-width so it works without a touchpad.
 */
export function FeaturedCarousel({ markets, baseCurrency }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  function nudge(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    // Card width ~ 220px + 12px gap → 232; scroll one card at a time.
    el.scrollBy({ left: dir * 232 * 2, behavior: 'smooth' });
  }

  if (markets.length === 0) {
    return (
      <div className="card p-6 text-sm muted">
        No featured markets available right now.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-end gap-1 mb-2">
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label="Scroll featured markets left"
          className="p-1.5 rounded border border-white/[0.08] hover:bg-white/[0.04] transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label="Scroll featured markets right"
          className="p-1.5 rounded border border-white/[0.08] hover:bg-white/[0.04] transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div
        ref={scrollerRef}
        className={cn(
          'flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory',
          'scrollbar-thin',
        )}
        style={{ scrollbarWidth: 'thin' }}
      >
        {markets.map((m) => (
          <Link
            key={`${m.city}-${m.country ?? ''}`}
            href={`/markets/${encodeURIComponent(m.city)}`}
            className={cn(
              'card shrink-0 w-[220px] p-4 snap-start hover:bg-white/[0.04] transition',
              'flex flex-col gap-2',
            )}
          >
            <div className="flex items-center gap-1.5 text-[11px] muted">
              <MapPin className="w-3 h-3" />
              <span>{m.country ?? 'Unknown'}</span>
            </div>
            <div className="text-base font-medium truncate">{m.city}</div>
            <div className="mt-auto pt-2 flex items-baseline justify-between text-xs muted">
              <div>{m.listings.toLocaleString()} comps</div>
              {m.avg_adr != null ? (
                <div className="font-mono text-white/70">
                  {baseCurrency} {Math.round(m.avg_adr).toLocaleString()}
                </div>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

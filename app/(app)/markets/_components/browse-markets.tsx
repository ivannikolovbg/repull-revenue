'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import type { BrowseMarket } from '@repull/types';

interface Props {
  markets: BrowseMarket[];
}

export function BrowseMarkets({ markets }: Props) {
  const [open, setOpen] = useState(false);
  const visible = open ? markets : markets.slice(0, 12);
  return (
    <section>
      <header className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-medium">Browse new markets</h2>
          <p className="text-xs muted mt-0.5">
            Cities Atlas tracks (5+ comps) where you don&apos;t yet operate.
          </p>
        </div>
        {markets.length > 12 ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs muted hover:text-white inline-flex items-center gap-1"
          >
            {open ? 'Show less' : `Show all ${markets.length}`}
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        ) : null}
      </header>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {visible.map((m) => (
          <Link
            key={m.city}
            href={`/markets/${encodeURIComponent(m.city)}`}
            className="card px-3 py-2 hover:bg-white/[0.04] transition flex items-center justify-between text-sm"
          >
            <div className="truncate">
              <div className="font-medium truncate">{m.city}</div>
              <div className="text-[11px] muted">{m.listings.toLocaleString()} comps</div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 muted shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  );
}

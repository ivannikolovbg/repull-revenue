'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/core/lib/cn';
import type { MarketSummary } from '@repull/types';

type SortKey =
  | 'city'
  | 'myListings'
  | 'totalListings'
  | 'marketSharePct'
  | 'myAvgAdr'
  | 'marketAvgAdr'
  | 'priceDiffPct'
  | 'myOccupancyPct'
  | 'marketOccupancyPct';

interface Props {
  markets: MarketSummary[];
  baseCurrency: string;
}

export function MarketsTable({ markets, baseCurrency }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('myListings');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    const copy = [...markets];
    copy.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      if (av === bv) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [markets, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(k);
      setSortDir('desc');
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-[2fr_repeat(7,minmax(0,1fr))] text-[11px] uppercase tracking-wide muted border-b border-white/[0.06] bg-white/[0.02]">
        <Th k="city" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort}>City</Th>
        <Th k="myListings" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right">Mine</Th>
        <Th k="totalListings" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right">Total</Th>
        <Th k="marketSharePct" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right">Share</Th>
        <Th k="myAvgAdr" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right">My ADR</Th>
        <Th k="marketAvgAdr" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right">Market ADR</Th>
        <Th k="priceDiffPct" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right">Diff</Th>
        <Th k="myOccupancyPct" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right">My occ%</Th>
      </div>
      {sorted.map((m) => (
        <Link
          key={m.city}
          href={`/markets/${encodeURIComponent(m.city)}`}
          className="grid grid-cols-[2fr_repeat(7,minmax(0,1fr))] text-sm border-b border-white/[0.04] hover:bg-white/[0.04] transition"
        >
          <div className="px-3 py-3 font-medium truncate">{m.city}</div>
          <div className="px-3 py-3 text-right">{m.myListings}</div>
          <div className="px-3 py-3 text-right muted">
            {m.totalListings ? m.totalListings.toLocaleString() : '—'}
          </div>
          <div className="px-3 py-3 text-right">
            {m.marketSharePct != null ? `${m.marketSharePct}%` : '—'}
          </div>
          <div className="px-3 py-3 text-right font-mono text-xs">
            {fmtCurrency(m.myAvgAdr, baseCurrency)}
          </div>
          <div className="px-3 py-3 text-right font-mono text-xs muted">
            {fmtCurrency(m.marketAvgAdr, baseCurrency)}
          </div>
          <div className="px-3 py-3 text-right">
            <DiffPill pct={m.priceDiffPct} />
          </div>
          <div className="px-3 py-3 text-right">
            {m.myOccupancyPct != null ? `${m.myOccupancyPct.toFixed(0)}%` : '—'}
            {m.marketOccupancyPct != null ? (
              <span className="muted text-[11px]"> / {m.marketOccupancyPct.toFixed(0)}%</span>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}

function Th({
  children,
  k,
  sortKey,
  sortDir,
  onClick,
  align = 'left',
}: {
  children: React.ReactNode;
  k: SortKey;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  onClick: (k: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = k === sortKey;
  const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => onClick(k)}
      className={cn(
        'px-3 py-2 flex items-center gap-1 hover:text-white',
        align === 'right' ? 'justify-end' : 'justify-start',
        active ? 'text-white' : '',
      )}
    >
      {align === 'right' ? null : <Icon className="w-3 h-3" />}
      <span>{children}</span>
      {align === 'right' ? <Icon className="w-3 h-3" /> : null}
    </button>
  );
}

function DiffPill({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="muted">—</span>;
  const up = pct > 0;
  const flat = pct === 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium border',
        flat
          ? 'bg-white/[0.04] text-white/70 border-white/[0.1]'
          : up
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            : 'bg-red-500/10 text-red-300 border-red-500/30',
      )}
    >
      {flat ? '·' : up ? '+' : ''}
      {pct}%
    </span>
  );
}

function fmtCurrency(v: number | null, currency: string): string {
  if (v == null) return '—';
  return `${currency} ${Math.round(v).toLocaleString()}`;
}

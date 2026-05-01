'use client';

import { cn } from '@/core/lib/cn';

interface Props {
  marketPosition: {
    adrPercentile: number | null;
    ratingPercentile: number | null;
    customerAdr: number | null;
    marketAvgAdr: number | null;
  } | null;
  capacityGap: { small: number; medium: number; large: number } | null;
  baseCurrency: string;
}

export function MarketKpis({ marketPosition, capacityGap, baseCurrency }: Props) {
  const cards: Array<{ label: string; value: string; hint?: string; tone?: 'good' | 'bad' | 'flat' }> = [];

  if (marketPosition?.adrPercentile != null) {
    const p = marketPosition.adrPercentile;
    cards.push({
      label: 'Your ADR percentile',
      value: `${Math.round(p)}th`,
      hint:
        marketPosition.customerAdr && marketPosition.marketAvgAdr
          ? `${baseCurrency} ${Math.round(marketPosition.customerAdr).toLocaleString()} vs market ${baseCurrency} ${Math.round(marketPosition.marketAvgAdr).toLocaleString()}`
          : undefined,
      tone: p >= 60 ? 'good' : p <= 30 ? 'bad' : 'flat',
    });
  }

  if (marketPosition?.ratingPercentile != null) {
    cards.push({
      label: 'Your rating percentile',
      value: `${Math.round(marketPosition.ratingPercentile)}th`,
      tone: marketPosition.ratingPercentile >= 60 ? 'good' : 'flat',
    });
  }

  if (capacityGap) {
    const total = capacityGap.small + capacityGap.medium + capacityGap.large;
    cards.push({
      label: 'Supply mix',
      value: `${capacityGap.small} S · ${capacityGap.medium} M · ${capacityGap.large} L`,
      hint: total > 0 ? `${total.toLocaleString()} comps tracked` : undefined,
    });
  }

  if (cards.length === 0) return null;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={cn(
            'card p-4',
            c.tone === 'good'
              ? 'border-emerald-500/20'
              : c.tone === 'bad'
                ? 'border-red-500/20'
                : '',
          )}
        >
          <div className="text-xs uppercase tracking-wide muted">{c.label}</div>
          <div className="text-2xl font-semibold mt-2">{c.value}</div>
          {c.hint ? <div className="text-[11px] muted mt-1">{c.hint}</div> : null}
        </div>
      ))}
    </section>
  );
}

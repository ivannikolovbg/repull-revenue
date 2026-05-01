'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, ChevronLeft, ChevronRight, Music, Trophy, X } from 'lucide-react';
import { cn } from '@/core/lib/cn';
import type { MarketCalendarDay } from './page';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  city: string;
  days: MarketCalendarDay[];
  baseCurrency: string;
  startDate: string;
  endDate: string;
}

export function MarketCalendarGrid({ city, days, baseCurrency, startDate }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Anchor the visible month on the startDate.
  const [monthOffset, setMonthOffset] = useState(0);
  const [selected, setSelected] = useState<MarketCalendarDay | null>(null);

  const dayMap = useMemo(() => {
    const m = new Map<string, MarketCalendarDay>();
    for (const d of days) m.set(d.date, d);
    return m;
  }, [days]);

  const anchorMonth = useMemo(() => {
    const [y, mm] = startDate.split('-').map(Number);
    const base = new Date(Date.UTC(y, mm - 1, 1));
    base.setUTCMonth(base.getUTCMonth() + monthOffset);
    return { y: base.getUTCFullYear(), m: base.getUTCMonth() + 1 };
  }, [startDate, monthOffset]);

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(anchorMonth.y, anchorMonth.m - 1, 1));
    const lead = first.getUTCDay();
    const lastDay = new Date(Date.UTC(anchorMonth.y, anchorMonth.m, 0)).getUTCDate();
    const out: Array<{ date: string | null }> = [];
    for (let i = 0; i < lead; i++) out.push({ date: null });
    for (let d = 1; d <= lastDay; d++) {
      const iso = `${anchorMonth.y}-${String(anchorMonth.m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      out.push({ date: iso });
    }
    return out;
  }, [anchorMonth]);

  const monthLabel = useMemo(() => {
    const d = new Date(Date.UTC(anchorMonth.y, anchorMonth.m - 1, 1));
    return d.toLocaleString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }, [anchorMonth]);

  function shiftMonth(delta: number) {
    setMonthOffset((m) => m + delta);
  }

  function jumpToToday() {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete('startDate');
    sp.delete('endDate');
    router.replace(
      `/markets/${encodeURIComponent(city)}/calendar${sp.toString() ? `?${sp.toString()}` : ''}`,
      { scroll: false },
    );
    setMonthOffset(0);
  }

  // Compute price quartiles for color bands.
  const priceStats = useMemo(() => {
    const prices = days.map((d) => d.marketAvgRate).filter((p): p is number => p != null && p > 0);
    if (prices.length < 4) return null;
    const sorted = [...prices].sort((a, b) => a - b);
    const q = (p: number) => sorted[Math.floor(sorted.length * p)] ?? sorted[sorted.length - 1];
    return { q25: q(0.25), q50: q(0.5), q75: q(0.75) };
  }, [days]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{monthLabel}</h2>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <button type="button" className="btn btn-ghost" onClick={jumpToToday}>
            Today
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => shiftMonth(1)}>
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-white/[0.06] bg-white/[0.02]">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-3 py-2 text-xs uppercase tracking-wide muted">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            if (!cell.date) {
              return (
                <div
                  key={`pad-${i}`}
                  className="aspect-[7/6] border-r border-b border-white/[0.04] bg-white/[0.01]"
                />
              );
            }
            const day = dayMap.get(cell.date);
            const tone = pickPriceTone(day?.marketAvgRate ?? null, priceStats);
            const occPct = day?.occupancyPct ?? null;
            const events = day?.events ?? [];
            const wheelhouseDemandTone = pickDemandTone(day?.wheelhouseOccupancy ?? null);
            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => setSelected(day ?? null)}
                className={cn(
                  'aspect-[7/6] border-r border-b border-white/[0.04] p-2 text-left hover:bg-white/[0.04] relative',
                  tone === 'high'
                    ? 'bg-emerald-500/[0.06]'
                    : tone === 'low'
                      ? 'bg-red-500/[0.04]'
                      : '',
                )}
              >
                <div className="flex items-start justify-between text-xs">
                  <span className="font-medium">{cell.date.slice(-2)}</span>
                  {wheelhouseDemandTone ? (
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full mt-1',
                        wheelhouseDemandTone === 'high'
                          ? 'bg-emerald-400'
                          : wheelhouseDemandTone === 'med'
                            ? 'bg-amber-400'
                            : 'bg-white/30',
                      )}
                      title={`Demand index: ${wheelhouseDemandTone}`}
                    />
                  ) : null}
                </div>
                {day?.marketAvgRate != null ? (
                  <div className="text-[11px] mt-0.5 font-mono">
                    {baseCurrency} {Math.round(day.marketAvgRate).toLocaleString()}
                  </div>
                ) : null}
                {occPct != null ? (
                  <div className="text-[10px] muted mt-0.5">
                    {Math.round(occPct)}% occ
                  </div>
                ) : null}
                {events.length > 0 ? (
                  <div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-0.5">
                    {events.slice(0, 2).map((e, idx) => {
                      const Icon = pickEventIcon(e.category);
                      return (
                        <span
                          key={`${e.title}-${idx}`}
                          className="inline-flex items-center gap-0.5 text-[9px] px-1 rounded-full bg-amber-500/15 text-amber-200 border border-amber-500/20 truncate max-w-full"
                          title={e.title}
                        >
                          <Icon className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{e.title.slice(0, 10)}</span>
                        </span>
                      );
                    })}
                    {events.length > 2 ? (
                      <span className="text-[9px] muted">+{events.length - 2}</span>
                    ) : null}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <Legend baseCurrency={baseCurrency} priceStats={priceStats} />

      {selected ? (
        <DayDrawer
          day={selected}
          baseCurrency={baseCurrency}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}

function Legend({
  baseCurrency,
  priceStats,
}: {
  baseCurrency: string;
  priceStats: { q25: number; q50: number; q75: number } | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[11px] muted">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> high demand
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> medium
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full bg-white/30" /> soft
      </span>
      {priceStats ? (
        <span>
          ADR bands: low &lt; {baseCurrency} {Math.round(priceStats.q25).toLocaleString()} · high &gt;{' '}
          {baseCurrency} {Math.round(priceStats.q75).toLocaleString()}
        </span>
      ) : null}
    </div>
  );
}

function DayDrawer({
  day,
  baseCurrency,
  onClose,
}: {
  day: MarketCalendarDay;
  baseCurrency: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div className="card p-5 max-w-md w-full m-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs uppercase tracking-wide muted">Market day</div>
            <div className="text-lg font-semibold mt-1">{day.date}</div>
          </div>
          <button
            type="button"
            className="muted hover:text-white"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <Stat label="Market avg ADR" value={day.marketAvgRate} prefix={`${baseCurrency} `} />
          <Stat label="Market min" value={day.marketMinRate} prefix={`${baseCurrency} `} />
          <Stat label="Market max" value={day.marketMaxRate} prefix={`${baseCurrency} `} />
          <Stat label="Comp occupancy" value={day.occupancyPct} suffix="%" />
          <Stat label="Demand-index occ" value={day.wheelhouseOccupancy} suffix="%" />
          <Stat label="Demand-index ADR" value={day.wheelhouseAdr} prefix={`${baseCurrency} `} />
        </div>
        {day.myPrice != null || day.myAvailable != null ? (
          <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-3 text-xs">
            <Stat label="My price" value={day.myPrice ?? null} prefix={`${baseCurrency} `} />
            <div>
              <div className="text-[10px] uppercase tracking-wide muted">My availability</div>
              <div className="font-mono mt-1">
                {day.myAvailable == null ? '—' : day.myAvailable ? 'Available' : 'Booked / Blocked'}
              </div>
            </div>
          </div>
        ) : null}
        {day.events && day.events.length > 0 ? (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <div className="text-[10px] uppercase tracking-wide muted mb-2">Events</div>
            <ul className="space-y-1">
              {day.events.map((e, i) => (
                <li key={`${e.title}-${i}`} className="text-xs">
                  <span className="font-medium">{e.title}</span>
                  {e.category ? <span className="muted"> · {e.category}</span> : null}
                  {e.attendance ? (
                    <span className="muted"> · {e.attendance.toLocaleString()} attendees</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  prefix,
  suffix,
}: {
  label: string;
  value: number | null;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide muted">{label}</div>
      <div className="font-mono mt-1">
        {value == null
          ? '—'
          : `${prefix ?? ''}${Math.round(value).toLocaleString()}${suffix ?? ''}`}
      </div>
    </div>
  );
}

function pickPriceTone(
  rate: number | null,
  stats: { q25: number; q50: number; q75: number } | null,
): 'high' | 'low' | null {
  if (rate == null || stats == null) return null;
  if (rate >= stats.q75) return 'high';
  if (rate <= stats.q25) return 'low';
  return null;
}

function pickDemandTone(occ: number | null): 'high' | 'med' | 'low' | null {
  if (occ == null) return null;
  if (occ >= 0.7) return 'high';
  if (occ >= 0.4) return 'med';
  return 'low';
}

function pickEventIcon(category: string | null) {
  const c = (category ?? '').toLowerCase();
  if (c.includes('sport')) return Trophy;
  if (c.includes('music') || c.includes('concert') || c.includes('festival')) return Music;
  return Calendar;
}

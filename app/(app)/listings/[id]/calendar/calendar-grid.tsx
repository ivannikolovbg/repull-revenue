'use client';

/**
 * Listing calendar grid.
 *
 * Mirrors the channel-manager calendar pattern:
 *   /home/ivan/work/repull-channel-manager/app/(app)/listings/[id]/calendar/calendar-grid.tsx
 * Stripped to the recommendation-only path (no inventory toggling — this app
 * is read-only against the channel calendar).
 */

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { cn } from '@/core/lib/cn';
import type { PricingRecommendation } from '@repull/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  listingId: string;
  monthIso: string;
  recommendations: PricingRecommendation[];
  currency: string;
}

export function ListingCalendarGrid({ listingId, monthIso, recommendations, currency }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busyDate, setBusyDate] = useState<string | null>(null);
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();

  const recMap = useMemo(() => {
    const m = new Map<string, PricingRecommendation>();
    for (const r of recommendations) m.set(r.date, r);
    return m;
  }, [recommendations]);

  const cells = useMemo(() => {
    const [yyyy, mm] = monthIso.split('-').map(Number);
    const first = new Date(Date.UTC(yyyy, mm - 1, 1));
    const lead = first.getUTCDay();
    const lastDay = new Date(Date.UTC(yyyy, mm, 0)).getUTCDate();
    const out: Array<{ date: string | null }> = [];
    for (let i = 0; i < lead; i++) out.push({ date: null });
    for (let d = 1; d <= lastDay; d++) {
      const iso = `${yyyy}-${String(mm).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      out.push({ date: iso });
    }
    return out;
  }, [monthIso]);

  function navigate(deltaMonths: number) {
    const [yyyy, mm] = monthIso.split('-').map(Number);
    const next = new Date(Date.UTC(yyyy, mm - 1 + deltaMonths, 1));
    const target = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('month', target);
    router.push(`?${sp.toString()}`);
  }

  async function actionRec(date: string, action: 'apply' | 'decline') {
    setBusyDate(date);
    setError(null);
    try {
      const res = await fetch(`/api/listings/${listingId}/pricing`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dates: [date], action }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? `${res.status}`);
      setHidden((s) => {
        const n = new Set(s);
        n.add(date);
        return n;
      });
      setOpenDate(null);
      startTransition(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyDate(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{prettyMonth(monthIso)}</h2>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <button className="btn btn-ghost" onClick={() => navigate(1)}>
            Next <ChevronRight className="w-4 h-4" />
          </button>
          <Link
            href={`/listings/${listingId}/pricing`}
            className="btn btn-ghost"
          >
            Recommendations &rarr;
          </Link>
        </div>
      </div>

      {error ? (
        <div className="card p-3 border-red-500/20 bg-red-500/[0.04] text-xs text-red-300 font-mono whitespace-pre-wrap">
          {error}
        </div>
      ) : null}

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
            const rec = !hidden.has(cell.date) ? recMap.get(cell.date) : undefined;
            const baseline = rec?.currentPrice ?? null;
            const recDeltaPct =
              rec && baseline != null && baseline > 0
                ? Math.round(((rec.recommendedPrice - baseline) / baseline) * 100)
                : null;
            const recIsUp = recDeltaPct != null && recDeltaPct > 0;
            const recIsFlat = recDeltaPct === 0;
            return (
              <div
                key={cell.date}
                className={cn('aspect-[7/6] border-r border-b border-white/[0.04] relative', pending ? 'opacity-70' : '')}
              >
                <div className="block w-full h-full p-2">
                  <div className="flex items-start justify-between text-xs">
                    <span className="font-medium">{cell.date.slice(-2)}</span>
                  </div>
                  {rec ? (
                    <button
                      type="button"
                      className={cn(
                        'mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium border',
                        recIsUp
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                          : recIsFlat
                            ? 'bg-white/[0.04] text-white/70 border-white/[0.1] hover:bg-white/[0.08]'
                            : 'bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/20',
                      )}
                      onClick={() => setOpenDate(cell.date)}
                      title={`Atlas recommends ${rec.currency ?? currency} ${Math.round(rec.recommendedPrice).toLocaleString()}`}
                    >
                      <span aria-hidden="true">{recIsUp ? '↑' : recIsFlat ? '·' : '↓'}</span>
                      <span>
                        {rec.currency ?? currency} {Math.round(rec.recommendedPrice).toLocaleString()}
                      </span>
                      {recDeltaPct != null && !recIsFlat ? (
                        <span className="opacity-80">
                          {recDeltaPct >= 0 ? '+' : ''}
                          {recDeltaPct}%
                        </span>
                      ) : null}
                    </button>
                  ) : null}
                  {baseline != null ? (
                    <div className="text-[10px] muted mt-1 font-mono">
                      {currency} {Math.round(baseline).toLocaleString()}
                    </div>
                  ) : null}
                </div>
                {rec && openDate === cell.date ? (
                  <RecPopover
                    rec={rec}
                    baseline={baseline}
                    deltaPct={recDeltaPct}
                    fallbackCurrency={currency}
                    busy={busyDate === cell.date}
                    onClose={() => setOpenDate(null)}
                    onApply={() => actionRec(cell.date as string, 'apply')}
                    onDecline={() => actionRec(cell.date as string, 'decline')}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px] muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-300/80" /> rec uplift
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-red-300/80" /> rec drop
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-white/30" /> flat
        </span>
      </div>
    </div>
  );
}

function RecPopover(props: {
  rec: PricingRecommendation;
  baseline: number | null;
  deltaPct: number | null;
  fallbackCurrency: string;
  busy: boolean;
  onClose: () => void;
  onApply: () => void;
  onDecline: () => void;
}) {
  const { rec } = props;
  const currency = rec.currency ?? props.fallbackCurrency;
  const factorEntries = Object.entries(rec.factors ?? {})
    .filter(([, v]) => v != null && v !== false)
    .slice(0, 6);
  return (
    <>
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 z-40 cursor-default"
        onClick={(e) => {
          e.stopPropagation();
          props.onClose();
        }}
      />
      <div
        className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1 w-64 card p-3 text-xs space-y-2 shadow-xl"
        style={{ background: '#0d0d0d' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-wide muted">Atlas recommendation</div>
            <div className="text-sm font-semibold mt-0.5">{rec.date}</div>
          </div>
          <button
            type="button"
            className="text-white/40 hover:text-white"
            onClick={props.onClose}
            aria-label="Close popover"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <div className="text-[10px] muted uppercase tracking-wide">Current</div>
            <div className="font-mono text-sm">
              {props.baseline != null
                ? `${currency} ${Math.round(props.baseline).toLocaleString()}`
                : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] muted uppercase tracking-wide">Recommended</div>
            <div className="font-mono text-sm">
              {currency} {Math.round(rec.recommendedPrice).toLocaleString()}
              {props.deltaPct != null && props.deltaPct !== 0 ? (
                <span
                  className={cn(
                    'ml-1.5 text-[10px]',
                    props.deltaPct > 0 ? 'text-emerald-300' : 'text-red-300',
                  )}
                >
                  {props.deltaPct > 0 ? '+' : ''}
                  {props.deltaPct}%
                </span>
              ) : null}
            </div>
          </div>
        </div>
        {Number.isFinite(rec.confidence) ? (
          <div className="text-[10px] muted">Confidence {Math.round(rec.confidence * 100)}%</div>
        ) : null}
        {factorEntries.length > 0 ? (
          <div>
            <div className="text-[10px] muted uppercase tracking-wide mb-1">Factors</div>
            <ul className="flex flex-wrap gap-1">
              {factorEntries.map(([k, v]) => (
                <li
                  key={k}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08]"
                  title={`${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`}
                >
                  {humaniseFactor(k, v)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            className="btn btn-ghost text-xs"
            disabled={props.busy}
            onClick={props.onDecline}
          >
            {props.busy ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Decline'}
          </button>
          <button
            type="button"
            className="btn btn-primary text-xs"
            disabled={props.busy}
            onClick={props.onApply}
          >
            {props.busy ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Apply'}
          </button>
        </div>
      </div>
    </>
  );
}

function humaniseFactor(key: string, value: unknown): string {
  if (key === 'event' && typeof value === 'string') return value;
  if (key === 'demand' && typeof value === 'string') return `${capitaliseFirst(value)} demand`;
  if (key === 'season' && typeof value === 'string') return capitaliseFirst(value);
  if (key === 'weekend' && value === true) return 'Weekend';
  if (key === 'holiday' && (typeof value === 'string' || value === true)) {
    return typeof value === 'string' ? value : 'Holiday';
  }
  if (key === 'compShift' && typeof value === 'number') {
    return `Comp ${value > 0 ? '+' : ''}${value}%`;
  }
  if (typeof value === 'string') return capitaliseFirst(value);
  if (typeof value === 'number') return `${capitaliseFirst(key)} ${value}`;
  return capitaliseFirst(key);
}

function capitaliseFirst(s: string): string {
  if (!s) return s;
  return s[0]!.toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

function prettyMonth(iso: string) {
  const [y, m] = iso.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

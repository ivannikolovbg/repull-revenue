'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, X } from 'lucide-react';
import { cn } from '@/core/lib/cn';
import type { PricingRecommendation } from '@repull/types';

interface Props {
  listingId: string;
  recommendations: PricingRecommendation[];
  baseCurrency: string;
}

export function RecommendationsTable({ listingId, recommendations, baseCurrency }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pending_recs = useMemo(
    () => recommendations.filter((r) => r.status === 'pending'),
    [recommendations],
  );

  function toggle(date: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(date)) n.delete(date);
      else n.add(date);
      return n;
    });
  }

  function selectAllPending() {
    setSelected(new Set(pending_recs.map((r) => r.date)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function actionOne(date: string, action: 'apply' | 'decline') {
    setBusy(`${date}:${action}`);
    setError(null);
    try {
      const res = await fetch(`/api/listings/${listingId}/pricing`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dates: [date], action }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? `${res.status}`);
      startTransition(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function actionBulk(action: 'apply' | 'decline') {
    if (selected.size === 0) return;
    setBulkBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/listings/${listingId}/pricing`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dates: Array.from(selected), action }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? `${res.status}`);
      setSelected(new Set());
      startTransition(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="card p-3 border-red-500/20 bg-red-500/[0.04] text-xs text-red-300 font-mono whitespace-pre-wrap">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div className="text-xs muted">
          {selected.size > 0
            ? `${selected.size} selected`
            : `${pending_recs.length} pending recommendation${pending_recs.length === 1 ? '' : 's'}`}
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <>
              <button
                type="button"
                className="btn btn-ghost text-xs"
                disabled={bulkBusy}
                onClick={() => actionBulk('decline')}
              >
                {bulkBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                Decline {selected.size}
              </button>
              <button
                type="button"
                className="btn btn-primary text-xs"
                disabled={bulkBusy}
                onClick={() => actionBulk('apply')}
              >
                {bulkBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Apply {selected.size}
              </button>
              <button type="button" className="btn btn-ghost text-xs" onClick={clearSelection}>
                Clear
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-ghost text-xs" onClick={selectAllPending}>
              Select all pending
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-[auto_1.2fr_1fr_1fr_1fr_1fr_2fr_auto] text-[11px] uppercase tracking-wide muted border-b border-white/[0.06] bg-white/[0.02]">
          <div className="px-3 py-2"></div>
          <div className="px-3 py-2">Date</div>
          <div className="px-3 py-2 text-right">Current</div>
          <div className="px-3 py-2 text-right">Recommended</div>
          <div className="px-3 py-2 text-right">Conf.</div>
          <div className="px-3 py-2">Status</div>
          <div className="px-3 py-2">Factors</div>
          <div className="px-3 py-2 text-right">Action</div>
        </div>
        {recommendations.map((r) => {
          const baseline = r.currentPrice;
          const deltaPct =
            baseline != null && baseline > 0
              ? Math.round(((r.recommendedPrice - baseline) / baseline) * 100)
              : null;
          const factorEntries = Object.entries(r.factors ?? {})
            .filter(([, v]) => v != null && v !== false)
            .slice(0, 4);
          const isPending = r.status === 'pending';
          const isSelected = selected.has(r.date);
          return (
            <div
              key={r.date}
              className={cn(
                'grid grid-cols-[auto_1.2fr_1fr_1fr_1fr_1fr_2fr_auto] text-sm border-b border-white/[0.04]',
                isSelected ? 'bg-white/[0.04]' : '',
                pending ? 'opacity-70' : '',
              )}
            >
              <div className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={!isPending}
                  onChange={() => toggle(r.date)}
                />
              </div>
              <div className="px-3 py-3 font-mono text-xs">{r.date}</div>
              <div className="px-3 py-3 text-right font-mono text-xs muted">
                {baseline != null
                  ? `${r.currency ?? baseCurrency} ${Math.round(baseline).toLocaleString()}`
                  : '—'}
              </div>
              <div className="px-3 py-3 text-right font-mono text-xs">
                {r.currency ?? baseCurrency} {Math.round(r.recommendedPrice).toLocaleString()}
                {deltaPct != null ? (
                  <span
                    className={cn(
                      'ml-1.5 text-[10px]',
                      deltaPct > 0
                        ? 'text-emerald-300'
                        : deltaPct < 0
                          ? 'text-red-300'
                          : 'muted',
                    )}
                  >
                    {deltaPct > 0 ? '+' : ''}
                    {deltaPct}%
                  </span>
                ) : null}
              </div>
              <div className="px-3 py-3 text-right text-xs">
                {Number.isFinite(r.confidence) ? `${Math.round(r.confidence * 100)}%` : '—'}
              </div>
              <div className="px-3 py-3"><StatusPill status={r.status} /></div>
              <div className="px-3 py-3">
                <div className="flex flex-wrap gap-1">
                  {factorEntries.map(([k, v]) => (
                    <span
                      key={k}
                      className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08]"
                      title={`${k}: ${formatFactorValue(v)}`}
                    >
                      {humaniseFactor(k, v)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="px-3 py-3 text-right">
                {isPending ? (
                  <div className="inline-flex gap-1">
                    <button
                      type="button"
                      className="btn btn-ghost text-xs"
                      disabled={busy != null}
                      onClick={() => actionOne(r.date, 'decline')}
                    >
                      {busy === `${r.date}:decline` ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary text-xs"
                      disabled={busy != null}
                      onClick={() => actionOne(r.date, 'apply')}
                    >
                      {busy === `${r.date}:apply` ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'applied'
      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
      : status === 'declined'
        ? 'bg-white/[0.04] text-white/70 border-white/[0.1]'
        : status === 'expired'
          ? 'bg-red-500/10 text-red-300 border-red-500/30'
          : 'bg-amber-500/10 text-amber-200 border-amber-500/30';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border', tone)}>
      {status}
    </span>
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

function formatFactorValue(v: unknown): string {
  if (typeof v === 'object' && v != null) {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

function capitaliseFirst(s: string): string {
  if (!s) return s;
  return s[0]!.toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, Loader2, X } from 'lucide-react';
import { cn } from '@/core/lib/cn';

interface Row {
  listingId: number;
  listingName: string | null;
  city: string | null;
  bedrooms: number | null;
  pendingDates: string[];
  pendingCount: number;
  estimatedDelta: number | null;
  currency: string | null;
}

interface BulkResultPayload {
  ok: boolean;
  processed?: number;
  succeeded?: number;
  failed?: Array<{ listing_id: number; dates: string[]; error_code: string; error: string }>;
  error?: string;
}

export function BulkApply({ rows, baseCurrency }: { rows: Row[]; baseCurrency: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [confirm, setConfirm] = useState<null | { action: 'apply' | 'decline' }>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BulkResultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const eligible = useMemo(() => rows.filter((r) => r.pendingCount > 0), [rows]);

  const totals = useMemo(() => {
    const sel = eligible.filter((r) => selected.has(r.listingId));
    const totalDates = sel.reduce((s, r) => s + r.pendingCount, 0);
    const totalDelta = sel.reduce((s, r) => s + (r.estimatedDelta ?? 0), 0);
    return { listings: sel.length, dates: totalDates, delta: totalDelta };
  }, [eligible, selected]);

  function toggle(id: number) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function selectAll() {
    setSelected(new Set(eligible.map((r) => r.listingId)));
  }

  function clear() {
    setSelected(new Set());
  }

  async function execute(action: 'apply' | 'decline') {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const items = eligible
        .filter((r) => selected.has(r.listingId))
        .map((r) => ({ listing_id: r.listingId, dates: r.pendingDates }));
      const res = await fetch('/api/listings/pricing/bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, items }),
      });
      const j = (await res.json().catch(() => ({}))) as BulkResultPayload;
      if (!res.ok) throw new Error(j.error ?? `${res.status}`);
      setResult(j);
      setSelected(new Set());
      setConfirm(null);
      startTransition(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="card p-3 border-red-500/20 bg-red-500/[0.04] text-xs text-red-300 font-mono whitespace-pre-wrap">
          {error}
        </div>
      ) : null}

      {result ? (
        <div
          className={cn(
            'card p-3 text-xs',
            (result.failed?.length ?? 0) > 0
              ? 'border-amber-500/20 bg-amber-500/[0.04] text-amber-200'
              : 'border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-200',
          )}
        >
          <div className="font-medium">
            Processed {result.processed ?? 0} dates · succeeded {result.succeeded ?? 0}
            {result.failed && result.failed.length > 0 ? ` · failed ${result.failed.length}` : ''}
          </div>
          {result.failed && result.failed.length > 0 ? (
            <ul className="mt-2 space-y-1 text-[11px]">
              {result.failed.slice(0, 5).map((f, i) => (
                <li key={i} className="font-mono">
                  Listing #{f.listing_id} · {f.error_code} · {f.error}
                </li>
              ))}
              {result.failed.length > 5 ? (
                <li className="muted">…and {result.failed.length - 5} more</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs muted">
          {selected.size > 0
            ? `${totals.listings} listing${totals.listings === 1 ? '' : 's'} · ${totals.dates} date${totals.dates === 1 ? '' : 's'} · est. ${baseCurrency} ${formatDelta(totals.delta)}`
            : `${eligible.length} listing${eligible.length === 1 ? '' : 's'} have pending recommendations`}
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <>
              <button
                type="button"
                className="btn btn-ghost text-xs"
                disabled={busy}
                onClick={() => setConfirm({ action: 'decline' })}
              >
                <X className="w-3 h-3" /> Decline {totals.listings}
              </button>
              <button
                type="button"
                className="btn btn-primary text-xs"
                disabled={busy}
                onClick={() => setConfirm({ action: 'apply' })}
              >
                <Check className="w-3 h-3" /> Apply {totals.listings}
              </button>
              <button type="button" className="btn btn-ghost text-xs" onClick={clear}>
                Clear
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-ghost text-xs"
              disabled={eligible.length === 0}
              onClick={selectAll}
            >
              Select all eligible
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-[auto_2fr_1.5fr_1fr_1fr_1fr] text-[11px] uppercase tracking-wide muted border-b border-white/[0.06] bg-white/[0.02]">
          <div className="px-3 py-2"></div>
          <div className="px-3 py-2">Listing</div>
          <div className="px-3 py-2">City</div>
          <div className="px-3 py-2 text-right">Bedrooms</div>
          <div className="px-3 py-2 text-right">Pending</div>
          <div className="px-3 py-2 text-right">Est. delta</div>
        </div>
        {rows.length === 0 ? (
          <div className="px-3 py-6 text-sm muted text-center">
            No active listings found.
          </div>
        ) : (
          rows.map((r) => {
            const isEligible = r.pendingCount > 0;
            const isSelected = selected.has(r.listingId);
            return (
              <div
                key={r.listingId}
                className={cn(
                  'grid grid-cols-[auto_2fr_1.5fr_1fr_1fr_1fr] text-sm border-b border-white/[0.04]',
                  isSelected ? 'bg-white/[0.04]' : '',
                  !isEligible ? 'opacity-50' : '',
                )}
              >
                <div className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={!isEligible || busy}
                    onChange={() => toggle(r.listingId)}
                  />
                </div>
                <div className="px-3 py-3 truncate font-medium">
                  {r.listingName ?? `Listing #${r.listingId}`}
                </div>
                <div className="px-3 py-3 truncate muted">{r.city ?? '—'}</div>
                <div className="px-3 py-3 text-right">{r.bedrooms ?? '—'}</div>
                <div className="px-3 py-3 text-right">{r.pendingCount}</div>
                <div className="px-3 py-3 text-right font-mono text-xs">
                  {r.estimatedDelta != null
                    ? `${r.currency ?? baseCurrency} ${formatDelta(r.estimatedDelta)}`
                    : '—'}
                </div>
              </div>
            );
          })
        )}
      </div>

      {confirm ? (
        <ConfirmDialog
          action={confirm.action}
          listings={totals.listings}
          dates={totals.dates}
          delta={totals.delta}
          currency={baseCurrency}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => execute(confirm.action)}
        />
      ) : null}
    </div>
  );
}

function ConfirmDialog({
  action,
  listings,
  dates,
  delta,
  currency,
  busy,
  onCancel,
  onConfirm,
}: {
  action: 'apply' | 'decline';
  listings: number;
  dates: number;
  delta: number;
  currency: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onCancel}
    >
      <div className="card p-5 max-w-md w-full m-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'rounded-md p-2 shrink-0',
              action === 'apply'
                ? 'bg-repull/10 text-repull'
                : 'bg-amber-500/10 text-amber-300',
            )}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold">
              {action === 'apply' ? 'Apply pricing in bulk?' : 'Decline recommendations in bulk?'}
            </h3>
            <p className="text-xs muted mt-1">
              {action === 'apply' ? (
                <>
                  This will push the recommended price for{' '}
                  <strong className="text-white">{dates}</strong> date
                  {dates === 1 ? '' : 's'} across{' '}
                  <strong className="text-white">{listings}</strong> listing
                  {listings === 1 ? '' : 's'} to the channel calendar (Airbnb / Booking).
                  Estimated revenue delta:{' '}
                  <strong className={delta >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                    {currency} {formatDelta(delta)}
                  </strong>
                  . Manual host overrides on individual dates will be replaced.
                </>
              ) : (
                <>
                  This will mark <strong className="text-white">{dates}</strong> recommendation
                  {dates === 1 ? '' : 's'} across{' '}
                  <strong className="text-white">{listings}</strong> listing
                  {listings === 1 ? '' : 's'} as declined. Current prices stay in place.
                </>
              )}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={
              action === 'apply'
                ? 'btn btn-primary'
                : 'btn btn-ghost border border-amber-500/30 text-amber-200 hover:bg-amber-500/10'
            }
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {action === 'apply' ? `Apply ${dates}` : `Decline ${dates}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDelta(d: number): string {
  return `${d >= 0 ? '+' : ''}${d.toLocaleString()}`;
}

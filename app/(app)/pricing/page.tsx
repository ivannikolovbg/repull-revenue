import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRight, LineChart } from 'lucide-react';
import { requireSessionWorkspace } from '@/core/lib/session';
import { repullFetch, RepullFetchError } from '@/core/services/repull-fetch';
import type { PricingResponse } from '@repull/types';

export const dynamic = 'force-dynamic';

interface ListingRow {
  id: number;
  name: string | null;
  city: string | null;
}

interface ListingsResponse {
  data: ListingRow[];
  pagination: { next_cursor: string | null; has_more: boolean };
}

interface ListingPricingSummary {
  listing: ListingRow;
  pendingCount: number;
  appliedCount: number;
  declinedCount: number;
  estimatedDelta: number;
  currency: string | null;
  error?: string;
}

async function PricingContent() {
  const ctx = await requireSessionWorkspace();
  if (!ctx.workspace.hasApiKey) return <NoKey />;

  let listings: ListingRow[] = [];
  let listError: string | null = null;
  try {
    const lr = await repullFetch<ListingsResponse>(ctx.workspace.id, 'GET', '/v1/listings', {
      query: { limit: 25, status: 'active' },
    });
    listings = lr.data ?? [];
  } catch (err) {
    listError =
      err instanceof RepullFetchError
        ? err.message
        : `Unexpected error: ${(err as Error).message}`;
  }

  const today = new Date();
  const startDate = today.toISOString().slice(0, 10);
  const endDate = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);

  const summaries: ListingPricingSummary[] = await Promise.all(
    listings.map(async (l): Promise<ListingPricingSummary> => {
      try {
        const p = await repullFetch<PricingResponse>(
          ctx.workspace.id,
          'GET',
          `/v1/listings/${l.id}/pricing`,
          { query: { startDate, endDate } },
        );
        const recs = p.recommendations ?? [];
        const pending = recs.filter((r) => r.status === 'pending');
        const applied = recs.filter((r) => r.status === 'applied');
        const declined = recs.filter((r) => r.status === 'declined');
        const delta = pending.reduce(
          (s, r) => s + (r.currentPrice != null ? r.recommendedPrice - r.currentPrice : 0),
          0,
        );
        return {
          listing: l,
          pendingCount: pending.length,
          appliedCount: applied.length,
          declinedCount: declined.length,
          estimatedDelta: Math.round(delta),
          currency: p.listing?.currency ?? null,
        };
      } catch (err) {
        return {
          listing: l,
          pendingCount: 0,
          appliedCount: 0,
          declinedCount: 0,
          estimatedDelta: 0,
          currency: null,
          error: (err as Error).message,
        };
      }
    }),
  );

  const totals = summaries.reduce(
    (acc, s) => ({
      pending: acc.pending + s.pendingCount,
      applied: acc.applied + s.appliedCount,
      declined: acc.declined + s.declinedCount,
      delta: acc.delta + s.estimatedDelta,
    }),
    { pending: 0, applied: 0, declined: 0, delta: 0 },
  );

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <LineChart className="w-5 h-5" /> Pricing
          </h1>
          <p className="text-sm muted mt-1">
            Workspace-wide pricing snapshot for the next 30 days. Drill into a listing for the full
            calendar + history, or use bulk apply to action many at once.
          </p>
        </div>
        <Link href="/pricing/bulk" className="btn btn-primary">
          Bulk apply <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Pending" value={totals.pending} tone="amber" />
        <Stat label="Applied" value={totals.applied} tone="emerald" />
        <Stat label="Declined" value={totals.declined} tone="muted" />
        <Stat
          label="Est. revenue delta (next 30d)"
          value={`${ctx.workspace.baseCurrency} ${totals.delta >= 0 ? '+' : ''}${totals.delta.toLocaleString()}`}
          tone={totals.delta >= 0 ? 'emerald' : 'red'}
        />
      </section>

      {listError ? (
        <div className="card p-6 border-red-500/20 bg-red-500/[0.04]">
          <p className="text-sm text-red-300 font-mono whitespace-pre-wrap">{listError}</p>
        </div>
      ) : summaries.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm">No active listings.</p>
          <p className="muted text-xs mt-2">Connect a channel via Repull to start.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr] text-[11px] uppercase tracking-wide muted border-b border-white/[0.06] bg-white/[0.02]">
            <div className="px-3 py-2">Listing</div>
            <div className="px-3 py-2">City</div>
            <div className="px-3 py-2 text-right">Pending</div>
            <div className="px-3 py-2 text-right">Applied</div>
            <div className="px-3 py-2 text-right">Declined</div>
            <div className="px-3 py-2 text-right">Est. delta</div>
          </div>
          {summaries.map((s) => (
            <Link
              key={s.listing.id}
              href={`/listings/${s.listing.id}/pricing`}
              className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr] text-sm border-b border-white/[0.04] hover:bg-white/[0.04]"
            >
              <div className="px-3 py-3 truncate font-medium">
                {s.listing.name ?? `Listing #${s.listing.id}`}
              </div>
              <div className="px-3 py-3 truncate muted">{s.listing.city ?? '—'}</div>
              <div className="px-3 py-3 text-right">
                {s.pendingCount > 0 ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] bg-amber-500/10 text-amber-200 border border-amber-500/30">
                    {s.pendingCount}
                  </span>
                ) : (
                  '—'
                )}
              </div>
              <div className="px-3 py-3 text-right muted">{s.appliedCount}</div>
              <div className="px-3 py-3 text-right muted">{s.declinedCount}</div>
              <div className="px-3 py-3 text-right font-mono text-xs">
                {s.estimatedDelta !== 0
                  ? `${s.currency ?? ctx.workspace.baseCurrency} ${s.estimatedDelta >= 0 ? '+' : ''}${s.estimatedDelta.toLocaleString()}`
                  : '—'}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: 'emerald' | 'amber' | 'red' | 'muted';
}) {
  const colorMap = {
    emerald: 'text-emerald-300',
    amber: 'text-amber-300',
    red: 'text-red-300',
    muted: 'text-white/70',
  } as const;
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase tracking-wide muted">{label}</div>
      <div className={`text-2xl font-semibold mt-1 font-mono ${colorMap[tone]}`}>{value}</div>
    </div>
  );
}

function NoKey() {
  return (
    <div className="card p-8 text-center max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold">Pricing</h1>
      <p className="muted mt-2 text-sm">
        Pricing recommendations need a Repull API key.
      </p>
      <Link href="/settings" className="btn btn-primary mt-4 inline-flex">
        Configure your Repull API key in Settings &rarr;
      </Link>
    </div>
  );
}

function PricingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-7 w-32 bg-white/[0.06] rounded" />
      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-20" />
        ))}
      </div>
      <div className="card overflow-hidden">
        <div className="h-10 border-b border-white/[0.06] bg-white/[0.02]" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 border-b border-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<PricingSkeleton />}>
      <PricingContent />
    </Suspense>
  );
}

import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft, ArrowRight, LineChart } from 'lucide-react';
import { requireSessionWorkspace } from '@/core/lib/session';
import { repullFetch, RepullFetchError } from '@/core/services/repull-fetch';
import type { PricingResponse } from '@repull/types';
import { BulkApply } from './bulk-apply';

export const dynamic = 'force-dynamic';

interface ListingRow {
  id: number;
  name: string | null;
  city: string | null;
  bedrooms: number | null;
  status: string | null;
}

interface ListingsResponse {
  data: ListingRow[];
  pagination: { next_cursor: string | null; has_more: boolean };
}

interface PricingByListing {
  listingId: number;
  listingName: string | null;
  city: string | null;
  bedrooms: number | null;
  pendingDates: string[];
  pendingCount: number;
  estimatedDelta: number | null;
  currency: string | null;
}

async function BulkContent({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const ctx = await requireSessionWorkspace();
  if (!ctx.workspace.hasApiKey) return <NoKey />;

  // Pull a window of listings (cap at 50 for the bulk surface — power users
  // beyond that should script the API directly).
  let listings: ListingRow[] = [];
  let listError: string | null = null;
  try {
    const lr = await repullFetch<ListingsResponse>(ctx.workspace.id, 'GET', '/v1/listings', {
      query: { limit: 50, status: 'active' },
    });
    listings = lr.data ?? [];
  } catch (err) {
    listError =
      err instanceof RepullFetchError
        ? err.message
        : `Unexpected error: ${(err as Error).message}`;
  }

  // Fetch pending recommendations per listing in parallel. Bounded — listings
  // is capped above. Each call has its own timeout.
  const perListing: PricingByListing[] = await Promise.all(
    listings.map(async (l): Promise<PricingByListing> => {
      try {
        const p = await repullFetch<PricingResponse>(
          ctx.workspace.id,
          'GET',
          `/v1/listings/${l.id}/pricing`,
          { query: { startDate, endDate } },
        );
        const pending = (p.recommendations ?? []).filter((r) => r.status === 'pending');
        const estimatedDelta = pending.reduce((s, r) => {
          if (r.currentPrice == null) return s;
          return s + (r.recommendedPrice - r.currentPrice);
        }, 0);
        return {
          listingId: l.id,
          listingName: l.name,
          city: l.city,
          bedrooms: l.bedrooms,
          pendingDates: pending.map((r) => r.date),
          pendingCount: pending.length,
          estimatedDelta: pending.length > 0 ? Math.round(estimatedDelta) : null,
          currency: p.listing?.currency ?? null,
        };
      } catch {
        return {
          listingId: l.id,
          listingName: l.name,
          city: l.city,
          bedrooms: l.bedrooms,
          pendingDates: [],
          pendingCount: 0,
          estimatedDelta: null,
          currency: null,
        };
      }
    }),
  );

  return (
    <div className="space-y-5">
      <Crumbs />
      <Header />
      <Filters startDate={startDate} endDate={endDate} />
      {listError ? (
        <div className="card p-6 border-red-500/20 bg-red-500/[0.04]">
          <p className="text-sm text-red-300 font-mono whitespace-pre-wrap">{listError}</p>
        </div>
      ) : (
        <BulkApply
          rows={perListing}
          baseCurrency={ctx.workspace.baseCurrency}
        />
      )}
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <LineChart className="w-5 h-5" /> Bulk pricing apply
        </h1>
        <p className="text-sm muted mt-1">
          Apply or decline pending Atlas recommendations across many listings at once. Power users:
          this counts as one Repull API call regardless of selection size.
        </p>
      </div>
      <Link href="/pricing" className="btn btn-ghost">
        Single listing pricing <ArrowRight className="w-3 h-3" />
      </Link>
    </header>
  );
}

function Filters({ startDate, endDate }: { startDate: string; endDate: string }) {
  return (
    <form action="/pricing/bulk" method="get" className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-wide muted">Start</span>
        <input className="input w-40" type="date" name="startDate" defaultValue={startDate} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-wide muted">End</span>
        <input className="input w-40" type="date" name="endDate" defaultValue={endDate} />
      </label>
      <button type="submit" className="btn btn-ghost">Apply</button>
    </form>
  );
}

function Crumbs() {
  return (
    <nav className="text-xs muted">
      <Link href="/pricing" className="inline-flex items-center gap-1 hover:text-white">
        <ArrowLeft className="w-3 h-3" /> Pricing
      </Link>
      <span className="mx-2">·</span>
      <span className="text-white/70">Bulk apply</span>
    </nav>
  );
}

function NoKey() {
  return (
    <div className="space-y-4">
      <Crumbs />
      <div className="card p-8 text-center max-w-2xl mx-auto">
        <p className="muted text-sm">Bulk pricing requires a Repull API key.</p>
        <Link href="/settings" className="btn btn-primary mt-4 inline-flex">
          Configure your Repull API key in Settings &rarr;
        </Link>
      </div>
    </div>
  );
}

function BulkSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-4 w-48 bg-white/[0.06] rounded" />
      <div className="h-7 w-72 bg-white/[0.06] rounded" />
      <div className="h-10 w-full bg-white/[0.04] rounded" />
      <div className="card overflow-hidden">
        <div className="h-10 border-b border-white/[0.06] bg-white/[0.02]" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 border-b border-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}

export default async function BulkPage(props: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const sp = await props.searchParams;
  const today = new Date();
  const defaultStart = today.toISOString().slice(0, 10);
  const defaultEnd = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  return (
    <Suspense fallback={<BulkSkeleton />}>
      <BulkContent startDate={sp.startDate ?? defaultStart} endDate={sp.endDate ?? defaultEnd} />
    </Suspense>
  );
}

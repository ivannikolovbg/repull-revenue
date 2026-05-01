import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { requireSessionWorkspace } from '@/core/lib/session';
import { repullFetch, RepullFetchError } from '@/core/services/repull-fetch';
import type { PricingResponse } from '@repull/types';
import { ListingTabs } from '../_components/listing-tabs';
import { RecommendationsTable } from './recommendations-table';
import { PricingFilters } from './pricing-filters';

export const dynamic = 'force-dynamic';

async function PricingContent({
  id,
  startDate,
  endDate,
}: {
  id: string;
  startDate: string;
  endDate: string;
}) {
  const ctx = await requireSessionWorkspace();
  if (!ctx.workspace.hasApiKey) return <NoKey id={id} />;

  let data: PricingResponse | null = null;
  let error: string | null = null;
  try {
    data = await repullFetch<PricingResponse>(
      ctx.workspace.id,
      'GET',
      `/v1/listings/${id}/pricing`,
      { query: { startDate, endDate } },
    );
  } catch (err) {
    error =
      err instanceof RepullFetchError
        ? err.message
        : `Unexpected error: ${(err as Error).message}`;
  }

  const recs = data?.recommendations ?? [];
  const baseCurrency =
    data?.listing?.currency ?? ctx.workspace.baseCurrency;
  const compSummary = data?.compSummary ?? null;

  return (
    <div className="space-y-5">
      <Crumbs id={id} />
      <Header />
      <ListingTabs id={id} active="pricing" />
      <PricingFilters startDate={startDate} endDate={endDate} listingId={id} />

      {error ? (
        <div className="card p-6 border-red-500/20 bg-red-500/[0.04]">
          <p className="text-sm text-red-300 font-mono whitespace-pre-wrap">{error}</p>
        </div>
      ) : (
        <>
          {compSummary ? (
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCard label="Comps" value={String(compSummary.compCount)} />
              <SummaryCard
                label="Comp avg"
                value={
                  compSummary.compAvg != null
                    ? `${baseCurrency} ${Math.round(compSummary.compAvg).toLocaleString()}`
                    : '—'
                }
              />
              <SummaryCard
                label="Comp min"
                value={
                  compSummary.compMin != null
                    ? `${baseCurrency} ${Math.round(compSummary.compMin).toLocaleString()}`
                    : '—'
                }
              />
              <SummaryCard
                label="Comp max"
                value={
                  compSummary.compMax != null
                    ? `${baseCurrency} ${Math.round(compSummary.compMax).toLocaleString()}`
                    : '—'
                }
              />
            </section>
          ) : null}
          {recs.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm">No recommendations yet.</p>
              <p className="muted text-xs mt-2">
                Atlas will publish recommendations for this listing once it has comp coverage and a
                base price. Try widening the date range.
              </p>
            </div>
          ) : (
            <RecommendationsTable
              listingId={id}
              recommendations={recs}
              baseCurrency={baseCurrency}
            />
          )}
        </>
      )}
    </div>
  );
}

function Header() {
  return (
    <header>
      <h1 className="text-xl font-semibold">Pricing recommendations</h1>
      <p className="text-sm muted mt-1">
        Per-night Atlas recommendations with confidence + factor chips. Apply pushes back to the
        channel; decline keeps your current price.
      </p>
    </header>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <div className="text-[10px] uppercase tracking-wide muted">{label}</div>
      <div className="text-base font-medium mt-1 font-mono">{value}</div>
    </div>
  );
}

function Crumbs({ id }: { id: string }) {
  return (
    <nav className="text-xs muted">
      <Link href="/listings" className="inline-flex items-center gap-1 hover:text-white">
        <ArrowLeft className="w-3 h-3" /> Listings
      </Link>
      <span className="mx-2">·</span>
      <Link href={`/listings/${id}`} className="hover:text-white">#{id}</Link>
      <span className="mx-2">·</span>
      <span className="text-white/70">pricing</span>
    </nav>
  );
}

function NoKey({ id }: { id: string }) {
  return (
    <div className="space-y-4">
      <Crumbs id={id} />
      <div className="card p-8 text-center max-w-2xl mx-auto">
        <p className="muted text-sm">Pricing requires a Repull API key.</p>
        <Link href="/settings" className="btn btn-primary mt-4 inline-flex">
          Configure your Repull API key in Settings &rarr;
        </Link>
      </div>
    </div>
  );
}

function PricingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-4 w-48 bg-white/[0.06] rounded" />
      <div className="space-y-2">
        <div className="h-7 w-72 bg-white/[0.06] rounded" />
      </div>
      <div className="h-10 w-full bg-white/[0.04] rounded" />
      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-16" />
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

export default async function PricingPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const today = new Date();
  const defaultStart = today.toISOString().slice(0, 10);
  const defaultEnd = new Date(today.getTime() + 90 * 86400000).toISOString().slice(0, 10);
  return (
    <Suspense fallback={<PricingSkeleton />}>
      <PricingContent
        id={id}
        startDate={sp.startDate ?? defaultStart}
        endDate={sp.endDate ?? defaultEnd}
      />
    </Suspense>
  );
}

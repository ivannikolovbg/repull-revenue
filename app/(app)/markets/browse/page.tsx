import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { requireSessionWorkspace } from '@/core/lib/session';
import { repullFetch, RepullFetchError } from '@/core/services/repull-fetch';
import { BrowseCatalog } from './_components/browse-catalog';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Browse markets · Repull Revenue',
};

interface MarketsLandingResponse {
  // We only need country categories from the landing endpoint here.
  browse?: {
    total_available?: number;
    categories?: Array<{ country: string; count: number }>;
  };
}

async function BrowseContent() {
  const ctx = await requireSessionWorkspace();
  if (!ctx.workspace.hasApiKey) return <NoKey />;

  // Pull country categories + total count from the landing endpoint. This is
  // a small, cached payload — no need to load the heavy `markets` slice.
  let categories: Array<{ country: string; count: number }> = [];
  let totalAvailable = 0;
  try {
    const meta = await repullFetch<MarketsLandingResponse>(
      ctx.workspace.id,
      'GET',
      '/v1/markets',
      { timeoutMs: 20_000 },
    );
    categories = meta.browse?.categories ?? [];
    totalAvailable = meta.browse?.total_available ?? 0;
  } catch (err) {
    // Graceful: if the landing endpoint hasn't shipped the new shape yet
    // we still render the catalog without country pills.
    if (!(err instanceof RepullFetchError)) {
      // surface unexpected errors but don't block the page
      console.error('markets/browse landing meta error', err);
    }
  }

  return (
    <div className="space-y-5">
      <Crumbs />
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Browse markets</h1>
          <p className="text-sm muted mt-1">
            {totalAvailable > 0
              ? `Search ${totalAvailable.toLocaleString()} markets tracked by Atlas.`
              : 'Search every market tracked by Atlas.'}
          </p>
        </div>
      </header>
      <BrowseCatalog countries={categories} baseCurrency={ctx.workspace.baseCurrency} />
    </div>
  );
}

function Crumbs() {
  return (
    <nav className="text-xs muted">
      <Link href="/markets" className="inline-flex items-center gap-1 hover:text-white">
        <ArrowLeft className="w-3 h-3" /> All markets
      </Link>
      <span className="mx-2">·</span>
      <span className="text-white/70">Browse</span>
    </nav>
  );
}

function NoKey() {
  return (
    <div className="card p-8 text-center max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold">Browse markets</h1>
      <p className="muted mt-2 text-sm">
        Browsing the market catalog needs a Repull API key.
      </p>
      <Link href="/settings" className="btn btn-primary mt-4 inline-flex">
        Configure your Repull API key in Settings &rarr;
      </Link>
    </div>
  );
}

function BrowseSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-3 w-32 bg-white/[0.06] rounded" />
      <div className="space-y-2">
        <div className="h-7 w-56 bg-white/[0.06] rounded" />
        <div className="h-4 w-72 bg-white/[0.04] rounded" />
      </div>
      <div className="h-12 card" />
      <div className="card overflow-hidden">
        <div className="h-9 border-b border-white/[0.06] bg-white/[0.02]" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-white/[0.04] last:border-b-0" />
        ))}
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<BrowseSkeleton />}>
      <BrowseContent />
    </Suspense>
  );
}

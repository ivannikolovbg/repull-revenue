import Link from 'next/link';
import { Suspense } from 'react';
import { requireSessionWorkspace } from '@/core/lib/session';
import { repullFetch, RepullFetchError } from '@/core/services/repull-fetch';
import type { MarketsResponse } from '@repull/types';
import { MarketsTable } from './_components/markets-table';
import { BrowseMarkets } from './_components/browse-markets';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Markets · Repull Revenue',
};

async function MarketsContent() {
  const ctx = await requireSessionWorkspace();

  if (!ctx.workspace.hasApiKey) {
    return <NoKeyState />;
  }

  let data: MarketsResponse | null = null;
  let error: string | null = null;
  try {
    // SDK gap: `repull.markets.list()` exists in @repull/sdk@0.1.0-alpha but
    // the SDK is dynamic-imported in repull-client.ts (which returns
    // `unknown`), so we go raw here for type safety. Switch to
    // `(await getRepullForWorkspace(ws.id)).markets.list()` once the SDK is on
    // npm and repull-client.ts uses a static import.
    data = await repullFetch<MarketsResponse>(ctx.workspace.id, 'GET', '/v1/markets');
  } catch (err) {
    error =
      err instanceof RepullFetchError
        ? `${err.status === 401 ? 'Auth: ' : ''}${err.message}`
        : `Unexpected error: ${(err as Error).message}`;
  }

  if (error) {
    return <ErrorState error={error} />;
  }
  if (!data || data.markets.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Markets</h1>
        <p className="text-sm muted mt-1">
          Per-city KPIs across {data.totals.markets} market
          {data.totals.markets === 1 ? '' : 's'} ·{' '}
          {data.totals.myListings} of your listing
          {data.totals.myListings === 1 ? '' : 's'}
          {typeof data.totals.totalCompetitors === 'number'
            ? ` · ${data.totals.totalCompetitors.toLocaleString()} competitor listings tracked by Atlas`
            : ''}
        </p>
      </header>

      <MarketsTable markets={data.markets} baseCurrency={ctx.workspace.baseCurrency} />

      {data.browseMarkets && data.browseMarkets.length > 0 ? (
        <BrowseMarkets markets={data.browseMarkets} />
      ) : null}
    </div>
  );
}

function NoKeyState() {
  return (
    <div className="card p-8 text-center max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold">Markets</h1>
      <p className="muted mt-2 text-sm">
        Markets need a Repull API key to fetch your competitor + market intelligence.
      </p>
      <Link href="/settings" className="btn btn-primary mt-4 inline-flex">
        Configure your Repull API key in Settings &rarr;
      </Link>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="card p-6 max-w-3xl mx-auto border-red-500/20 bg-red-500/[0.04]">
      <h1 className="text-xl font-semibold">Markets unavailable</h1>
      <p className="text-sm text-red-300 mt-2 font-mono whitespace-pre-wrap">{error}</p>
      <p className="text-xs muted mt-3">
        Check your API key in <Link href="/settings" className="underline decoration-dotted">Settings</Link>.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card p-8 text-center max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold">No markets yet</h1>
      <p className="muted mt-2 text-sm">
        We&apos;ll show your markets here once Repull syncs your first listings.
      </p>
    </div>
  );
}

function MarketsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-32 bg-white/[0.06] rounded" />
        <div className="h-4 w-72 bg-white/[0.04] rounded" />
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

export default function MarketsPage() {
  return (
    <Suspense fallback={<MarketsSkeleton />}>
      <MarketsContent />
    </Suspense>
  );
}

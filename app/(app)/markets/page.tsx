import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRight } from 'lucide-react';
import { requireSessionWorkspace } from '@/core/lib/session';
import { repullFetch, RepullFetchError } from '@/core/services/repull-fetch';
import type { MarketsResponse } from '@repull/types';
import { MarketsTable } from './_components/markets-table';
import { BrowseSearch } from './_components/browse-search';
import { FeaturedCarousel, type FeaturedMarket } from './_components/featured-carousel';
import { CountryFilter, type CountryCategory } from './_components/country-filter';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Markets · Repull Revenue',
};

/**
 * Local extension of the upstream `MarketsResponse` to model the new
 * search-first browse contract:
 *
 *   browse: {
 *     featured: [...top 50 by listings],
 *     total_available: number,
 *     categories: [{ country, count }]
 *   }
 *
 * The Repull API rollout is in progress — until the backend ships this
 * shape, `browse` is undefined and the page falls back to the legacy
 * `browseMarkets` array (rendered as a slimmed featured strip). We never
 * fetch all 200K browseMarkets entries here — that timeout is exactly what
 * this UX is replacing.
 */
interface MarketsResponseExtended extends MarketsResponse {
  browse?: {
    featured?: FeaturedMarket[];
    total_available?: number;
    categories?: CountryCategory[];
  };
}

async function MarketsContent() {
  const ctx = await requireSessionWorkspace();

  if (!ctx.workspace.hasApiKey) {
    return <NoKeyState />;
  }

  let data: MarketsResponseExtended | null = null;
  let error: string | null = null;
  try {
    // SDK gap: `repull.markets.list()` exists in @repull/sdk@0.1.0-alpha but
    // the SDK is dynamic-imported in repull-client.ts (which returns
    // `unknown`), so we go raw here for type safety. Switch to
    // `(await getRepullForWorkspace(ws.id)).markets.list()` once the SDK is
    // on npm and repull-client.ts uses a static import.
    data = await repullFetch<MarketsResponseExtended>(
      ctx.workspace.id,
      'GET',
      '/v1/markets',
      // Landing endpoint is now a small payload (no more 200K browseMarkets);
      // 30s ceiling is plenty even on cold cache.
      { timeoutMs: 30_000 },
    );
  } catch (err) {
    error =
      err instanceof RepullFetchError
        ? `${err.status === 401 ? 'Auth: ' : ''}${err.message}`
        : `Unexpected error: ${(err as Error).message}`;
  }

  if (error) {
    return <ErrorState error={error} />;
  }
  if (!data) {
    return <EmptyState />;
  }

  // Resolve browse content with backward compatibility: prefer the new
  // `browse.*` fields, fall back to the legacy `browseMarkets` array (which
  // doesn't include country / avg ADR — we render best-effort).
  const featured: FeaturedMarket[] =
    data.browse?.featured && data.browse.featured.length > 0
      ? data.browse.featured
      : (data.browseMarkets ?? []).slice(0, 50).map((b) => ({
          city: b.city,
          country: null,
          listings: b.listings,
          avg_adr: null,
        }));
  const totalAvailable =
    data.browse?.total_available ??
    (data.browseMarkets?.length ?? featured.length);
  const categories: CountryCategory[] = data.browse?.categories ?? [];

  return (
    <div className="space-y-8">
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

      {/* Section 1: Your markets */}
      <section className="space-y-3">
        <header>
          <h2 className="text-sm font-medium">Your markets</h2>
          <p className="text-xs muted mt-0.5">
            Cities where you operate, with side-by-side comp benchmarks.
          </p>
        </header>
        {data.markets.length > 0 ? (
          <MarketsTable markets={data.markets} baseCurrency={ctx.workspace.baseCurrency} />
        ) : (
          <div className="card p-6 text-sm muted">
            No owned markets yet. Browse the catalog below to find your first
            expansion target.
          </div>
        )}
      </section>

      {/* Section 2: Browse markets — search-first */}
      <section className="space-y-4">
        <header className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-medium">Browse markets</h2>
            <p className="text-xs muted mt-0.5">
              {totalAvailable > 0
                ? `Search the full catalog of ${totalAvailable.toLocaleString()} markets tracked by Atlas.`
                : 'Search the full catalog of markets tracked by Atlas.'}
            </p>
          </div>
          <Link
            href="/markets/browse"
            className="text-xs inline-flex items-center gap-1 muted hover:text-white"
          >
            Browse all{totalAvailable > 0 ? ` ${totalAvailable.toLocaleString()}` : ''} markets
            <ArrowRight className="w-3 h-3" />
          </Link>
        </header>

        <BrowseSearch
          totalAvailable={totalAvailable}
          baseCurrency={ctx.workspace.baseCurrency}
        />

        {categories.length > 0 ? (
          <CountryFilter categories={categories} limit={12} />
        ) : null}

        {featured.length > 0 ? (
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-wide muted">
              Featured · top {Math.min(featured.length, 50)} by listing volume
            </div>
            <FeaturedCarousel
              markets={featured.slice(0, 50)}
              baseCurrency={ctx.workspace.baseCurrency}
            />
          </div>
        ) : null}
      </section>
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
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-32 bg-white/[0.06] rounded" />
        <div className="h-4 w-72 bg-white/[0.04] rounded" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-40 bg-white/[0.06] rounded" />
        <div className="card overflow-hidden">
          <div className="h-10 border-b border-white/[0.06] bg-white/[0.02]" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 border-b border-white/[0.04]" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-4 w-40 bg-white/[0.06] rounded" />
        <div className="h-10 card" />
        <div className="h-32 card" />
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

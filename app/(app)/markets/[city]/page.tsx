import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { requireSessionWorkspace } from '@/core/lib/session';
import { repullFetch, RepullFetchError } from '@/core/services/repull-fetch';
import { DistributionCharts } from './_components/distribution-charts';
import { TopComps } from './_components/top-comps';
import { MarketEvents } from './_components/market-events';
import { MarketKpis } from './_components/market-kpis';

export const dynamic = 'force-dynamic';

interface CityDetail {
  city: string;
  marketPosition?: {
    adrPercentile: number | null;
    ratingPercentile: number | null;
    customerAdr: number | null;
    marketAvgAdr: number | null;
  } | null;
  capacityGap?: { small: number; medium: number; large: number } | null;
  supplyTrend?: Array<{ month: string; newComps: number }> | null;
  priceDistribution?: Array<{ bucket: string; count: number }> | null;
  bedroomBreakdown?: Array<{ bedrooms: number; count: number }> | null;
  propertyTypeMix?: Array<{ type: string; count: number }> | null;
  events?: Array<{
    title: string;
    category: string | null;
    rank: number | null;
    attendance: number | null;
    startDate?: string | null;
    endDate?: string | null;
  }> | null;
  topComps?: {
    data: Array<{
      id: number;
      name: string | null;
      city: string | null;
      bedrooms: number | null;
      rating: number | null;
      reviewCount: number | null;
      currentNightlyRate: number | null;
      distanceKm: number | null;
      thumbnail: string | null;
      platformUrl: string | null;
    }>;
    pagination?: { page: number; pageSize: number; total: number };
  } | null;
  benchmarks?: unknown;
  wheelhouseTrends?: unknown;
  healthSummary?: unknown;
  [key: string]: unknown;
}

async function CityContent({ city, page }: { city: string; page: number }) {
  const ctx = await requireSessionWorkspace();
  if (!ctx.workspace.hasApiKey) return <NoKey city={city} />;

  let data: CityDetail | null = null;
  let error: string | null = null;
  try {
    // SDK gap: no `markets.get(city)` method — raw fetch until SDK regen.
    data = await repullFetch<CityDetail>(
      ctx.workspace.id,
      'GET',
      `/v1/markets/${encodeURIComponent(city)}`,
      { query: { compsPage: page } },
    );
  } catch (err) {
    error =
      err instanceof RepullFetchError
        ? err.message
        : `Unexpected error: ${(err as Error).message}`;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Crumbs city={city} />
        <div className="card p-6 border-red-500/20 bg-red-500/[0.04]">
          <p className="text-sm text-red-300 font-mono whitespace-pre-wrap">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Crumbs city={city} />
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{city}</h1>
          <p className="text-sm muted mt-1">
            Market deep dive: distributions, events, top comps, supply trend.
          </p>
        </div>
        <Link
          href={`/markets/${encodeURIComponent(city)}/calendar`}
          className="btn btn-ghost"
        >
          365-day calendar &rarr;
        </Link>
      </header>

      <MarketKpis
        marketPosition={data?.marketPosition ?? null}
        capacityGap={data?.capacityGap ?? null}
        baseCurrency={ctx.workspace.baseCurrency}
      />

      <DistributionCharts
        priceDistribution={data?.priceDistribution ?? null}
        bedroomBreakdown={data?.bedroomBreakdown ?? null}
        propertyTypeMix={data?.propertyTypeMix ?? null}
        baseCurrency={ctx.workspace.baseCurrency}
      />

      {data?.supplyTrend && data.supplyTrend.length > 0 ? (
        <SupplyTrend trend={data.supplyTrend} />
      ) : null}

      {data?.events && data.events.length > 0 ? (
        <MarketEvents events={data.events.slice(0, 12)} />
      ) : null}

      {data?.topComps && data.topComps.data.length > 0 ? (
        <TopComps
          city={city}
          comps={data.topComps.data}
          page={data.topComps.pagination?.page ?? page}
          total={data.topComps.pagination?.total ?? data.topComps.data.length}
          baseCurrency={ctx.workspace.baseCurrency}
        />
      ) : null}
    </div>
  );
}

function Crumbs({ city }: { city: string }) {
  return (
    <nav className="text-xs muted">
      <Link href="/markets" className="inline-flex items-center gap-1 hover:text-white">
        <ArrowLeft className="w-3 h-3" /> All markets
      </Link>
      <span className="mx-2">·</span>
      <span className="text-white/70">{city}</span>
    </nav>
  );
}

function SupplyTrend({ trend }: { trend: Array<{ month: string; newComps: number }> }) {
  const max = Math.max(1, ...trend.map((t) => t.newComps));
  return (
    <section>
      <h2 className="text-sm font-medium mb-2">New supply (last 6 months)</h2>
      <div className="card p-4">
        <div className="grid grid-cols-6 gap-2 items-end h-24">
          {trend.map((t) => (
            <div key={t.month} className="flex flex-col items-center gap-1">
              <div
                className="w-full bg-repull/40 rounded-t"
                style={{ height: `${Math.round((t.newComps / max) * 100)}%` }}
              />
              <div className="text-[10px] muted">{t.month}</div>
              <div className="text-[10px]">{t.newComps}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NoKey({ city }: { city: string }) {
  return (
    <div className="space-y-4">
      <Crumbs city={city} />
      <div className="card p-8 text-center max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold">{city}</h1>
        <p className="muted mt-2 text-sm">
          Market deep-dives need a Repull API key.
        </p>
        <Link href="/settings" className="btn btn-primary mt-4 inline-flex">
          Configure your Repull API key in Settings &rarr;
        </Link>
      </div>
    </div>
  );
}

function CitySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-48 bg-white/[0.06] rounded" />
      <div className="space-y-2">
        <div className="h-7 w-72 bg-white/[0.06] rounded" />
        <div className="h-4 w-96 bg-white/[0.04] rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-28" />
        ))}
      </div>
      <div className="card h-64" />
    </div>
  );
}

export default async function CityDetailPage(props: {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ compsPage?: string }>;
}) {
  const { city } = await props.params;
  const { compsPage } = await props.searchParams;
  const page = compsPage ? Math.max(1, parseInt(compsPage, 10) || 1) : 1;
  return (
    <Suspense fallback={<CitySkeleton />}>
      <CityContent city={decodeURIComponent(city)} page={page} />
    </Suspense>
  );
}

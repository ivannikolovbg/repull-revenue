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

/**
 * Raw `/v1/markets/{city}` response shape from the upstream Repull API.
 *
 * Snake_case + numeric-strings echoed verbatim from Postgres. Anything that
 * actually renders against this MUST go through `normalizeCityDetail()` —
 * never read these fields directly from the JSX. A single missing/renamed
 * field on the upstream side previously crashed the whole route (server 500
 * + JS TypeError "Cannot read properties of undefined").
 */
interface RawCityDetail {
  city?: string;
  marketPosition?: {
    myAdr?: number | null;
    myRating?: number | null;
    adrPercentile?: number | null;
    ratingPercentile?: number | null;
  } | null;
  capacityGap?: {
    myAvgGuests?: number | null;
    marketAvgGuests?: number | null;
    distribution?: { small?: number; medium?: number; large?: number } | null;
  } | null;
  supplyTrend?: Array<{ month?: string; new_listings?: number | string | null }> | null;
  priceDistribution?: Array<{
    label?: string;
    count?: number | string | null;
  }> | null;
  bedroomBreakdown?: Array<{
    bedrooms?: number | null;
    count?: number | string | null;
  }> | null;
  propertyTypeMix?: Array<{
    property_type?: string | null;
    count?: number | string | null;
  }> | null;
  events?: Array<{
    title?: string | null;
    category?: string | null;
    rank?: number | null;
    attendance?: number | null;
    start_date?: string | null;
    end_date?: string | null;
  }> | null;
  topComps?: {
    items?: Array<{
      id?: number | string;
      title?: string | null;
      bedrooms?: number | null;
      rating?: number | string | null;
      review_count?: number | null;
      current_nightly_rate?: number | string | null;
      distance_km?: number | string | null;
      thumbnail_url?: string | null;
      url?: string | null;
    }>;
    page?: number;
    pageSize?: number;
    total?: number;
  } | null;
  [key: string]: unknown;
}

interface CityDetail {
  city: string;
  marketPosition: {
    adrPercentile: number | null;
    ratingPercentile: number | null;
    customerAdr: number | null;
    marketAvgAdr: number | null;
  } | null;
  capacityGap: { small: number; medium: number; large: number } | null;
  supplyTrend: Array<{ month: string; newComps: number }>;
  priceDistribution: Array<{ bucket: string; count: number }>;
  bedroomBreakdown: Array<{ bedrooms: number; count: number }>;
  propertyTypeMix: Array<{ type: string; count: number }>;
  events: Array<{
    title: string;
    category: string | null;
    rank: number | null;
    attendance: number | null;
    startDate: string | null;
    endDate: string | null;
  }>;
  topComps: {
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
    pagination: { page: number; pageSize: number; total: number };
  };
}

function toNumber(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeCityDetail(raw: RawCityDetail | null, fallbackCity: string): CityDetail {
  const r = raw ?? {};
  const dist = r.capacityGap?.distribution;
  return {
    city: r.city ?? fallbackCity,
    marketPosition: r.marketPosition
      ? {
          adrPercentile: toNumber(r.marketPosition.adrPercentile),
          ratingPercentile: toNumber(r.marketPosition.ratingPercentile),
          customerAdr: toNumber(r.marketPosition.myAdr),
          // Upstream doesn't expose a market-average ADR alongside the
          // percentile yet — leave null and the KPI hint hides itself.
          marketAvgAdr: null,
        }
      : null,
    capacityGap: dist
      ? {
          small: toNumber(dist.small) ?? 0,
          medium: toNumber(dist.medium) ?? 0,
          large: toNumber(dist.large) ?? 0,
        }
      : null,
    supplyTrend: Array.isArray(r.supplyTrend)
      ? r.supplyTrend
          .map((t) => ({
            month: t?.month ?? '',
            newComps: toNumber(t?.new_listings) ?? 0,
          }))
          .filter((t) => t.month)
      : [],
    priceDistribution: Array.isArray(r.priceDistribution)
      ? r.priceDistribution
          .map((p) => ({
            bucket: p?.label ?? '',
            count: toNumber(p?.count) ?? 0,
          }))
          .filter((p) => p.bucket)
      : [],
    bedroomBreakdown: Array.isArray(r.bedroomBreakdown)
      ? r.bedroomBreakdown
          .map((b) => ({
            bedrooms: toNumber(b?.bedrooms) ?? 0,
            count: toNumber(b?.count) ?? 0,
          }))
          // Drop the "-1" bucket Atlas emits for unknown-bedroom listings.
          .filter((b) => b.bedrooms >= 0)
      : [],
    propertyTypeMix: Array.isArray(r.propertyTypeMix)
      ? r.propertyTypeMix
          .map((p) => ({
            type: p?.property_type ?? '',
            count: toNumber(p?.count) ?? 0,
          }))
          .filter((p) => p.type)
      : [],
    events: Array.isArray(r.events)
      ? r.events
          .filter((e) => e?.title)
          .map((e) => ({
            title: e.title ?? '',
            category: e?.category ?? null,
            rank: toNumber(e?.rank),
            attendance: toNumber(e?.attendance),
            startDate: e?.start_date ?? null,
            endDate: e?.end_date ?? null,
          }))
      : [],
    topComps: {
      data: Array.isArray(r.topComps?.items)
        ? r.topComps!.items!.map((c) => ({
            id: toNumber(c?.id) ?? 0,
            name: c?.title ?? null,
            city: null,
            bedrooms: toNumber(c?.bedrooms),
            rating: toNumber(c?.rating),
            reviewCount: toNumber(c?.review_count),
            currentNightlyRate: toNumber(c?.current_nightly_rate),
            distanceKm: toNumber(c?.distance_km),
            thumbnail: c?.thumbnail_url ?? null,
            platformUrl: c?.url ?? null,
          }))
        : [],
      pagination: {
        page: toNumber(r.topComps?.page) ?? 1,
        pageSize: toNumber(r.topComps?.pageSize) ?? 20,
        total: toNumber(r.topComps?.total) ?? 0,
      },
    },
  };
}

async function CityContent({ city, page }: { city: string; page: number }) {
  const ctx = await requireSessionWorkspace();
  if (!ctx.workspace.hasApiKey) return <NoKey city={city} />;

  let data: CityDetail | null = null;
  let error: string | null = null;
  try {
    // SDK gap: no `markets.get(city)` method — raw fetch until SDK regen.
    // The upstream response is snake_case + numeric-strings; normalize at the
    // boundary so individual sub-components don't need to know about the
    // transport shape (and so a missing field can't crash the route).
    const raw = await repullFetch<RawCityDetail>(
      ctx.workspace.id,
      'GET',
      `/v1/markets/${encodeURIComponent(city)}`,
      { query: { compsPage: page } },
    );
    data = normalizeCityDetail(raw, city);
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

      {data && data.supplyTrend.length > 0 ? (
        <SupplyTrend trend={data.supplyTrend} />
      ) : null}

      {data && data.events.length > 0 ? (
        <MarketEvents events={data.events.slice(0, 12)} />
      ) : null}

      {data && data.topComps.data.length > 0 ? (
        <TopComps
          city={city}
          comps={data.topComps.data}
          page={data.topComps.pagination.page || page}
          total={data.topComps.pagination.total || data.topComps.data.length}
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

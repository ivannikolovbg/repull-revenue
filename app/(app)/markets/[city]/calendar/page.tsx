import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { requireSessionWorkspace } from '@/core/lib/session';
import { repullFetch, RepullFetchError } from '@/core/services/repull-fetch';
import { MarketCalendarGrid } from './market-calendar-grid';

export const dynamic = 'force-dynamic';

export interface MarketCalendarDay {
  date: string;
  marketAvgRate: number | null;
  marketMinRate: number | null;
  marketMaxRate: number | null;
  pricedListings: number | null;
  totalListings: number | null;
  occupancyPct: number | null;
  wheelhouseOccupancy: number | null;
  wheelhouseAdr: number | null;
  events?: Array<{
    title: string;
    category: string | null;
    rank: number | null;
    attendance: number | null;
  }> | null;
  myPrice?: number | null;
  myAvailable?: boolean | null;
}

interface CalendarResponse {
  city: string;
  startDate?: string;
  endDate?: string;
  days: MarketCalendarDay[];
}

async function CalendarContent({ city, startDate, endDate }: { city: string; startDate: string; endDate: string }) {
  const ctx = await requireSessionWorkspace();
  if (!ctx.workspace.hasApiKey) return <NoKey city={city} />;

  let data: CalendarResponse | null = null;
  let error: string | null = null;
  try {
    // SDK gap: no `markets.calendar(city)` method yet — raw fetch.
    data = await repullFetch<CalendarResponse>(
      ctx.workspace.id,
      'GET',
      `/v1/markets/${encodeURIComponent(city)}/calendar`,
      { query: { startDate, endDate }, timeoutMs: 60_000 },
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
    <div className="space-y-4">
      <Crumbs city={city} />
      <header>
        <h1 className="text-2xl font-semibold">{city} · 365-day calendar</h1>
        <p className="text-sm muted mt-1">
          Per-date market ADR, comp occupancy, demand index, and event overlay (concerts /
          sports / festivals).
        </p>
      </header>
      <MarketCalendarGrid
        city={city}
        days={data?.days ?? []}
        baseCurrency={ctx.workspace.baseCurrency}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}

function Crumbs({ city }: { city: string }) {
  return (
    <nav className="text-xs muted">
      <Link href="/markets" className="inline-flex items-center gap-1 hover:text-white">
        <ArrowLeft className="w-3 h-3" /> Markets
      </Link>
      <span className="mx-2">·</span>
      <Link
        href={`/markets/${encodeURIComponent(city)}`}
        className="hover:text-white"
      >
        {city}
      </Link>
      <span className="mx-2">·</span>
      <span className="text-white/70">calendar</span>
    </nav>
  );
}

function NoKey({ city }: { city: string }) {
  return (
    <div className="space-y-4">
      <Crumbs city={city} />
      <div className="card p-8 text-center max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold">{city}</h1>
        <p className="muted mt-2 text-sm">Calendar requires a Repull API key.</p>
        <Link href="/settings" className="btn btn-primary mt-4 inline-flex">
          Configure your Repull API key in Settings &rarr;
        </Link>
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 w-48 bg-white/[0.06] rounded" />
      <div className="space-y-2">
        <div className="h-7 w-96 bg-white/[0.06] rounded" />
      </div>
      <div className="card h-[600px]" />
    </div>
  );
}

export default async function MarketCalendarPage(props: {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const { city } = await props.params;
  const sp = await props.searchParams;
  const today = new Date();
  const defaultStart = today.toISOString().slice(0, 10);
  const defaultEnd = new Date(today.getTime() + 365 * 86400000).toISOString().slice(0, 10);
  const startDate = sp.startDate ?? defaultStart;
  const endDate = sp.endDate ?? defaultEnd;
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarContent city={decodeURIComponent(city)} startDate={startDate} endDate={endDate} />
    </Suspense>
  );
}

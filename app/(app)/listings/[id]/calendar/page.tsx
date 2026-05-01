import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { requireSessionWorkspace } from '@/core/lib/session';
import { repullFetch, RepullFetchError } from '@/core/services/repull-fetch';
import type { PricingResponse } from '@repull/types';
import { ListingTabs } from '../_components/listing-tabs';
import { ListingCalendarGrid } from './calendar-grid';

export const dynamic = 'force-dynamic';

async function CalendarContent({ id, monthIso }: { id: string; monthIso: string }) {
  const ctx = await requireSessionWorkspace();
  if (!ctx.workspace.hasApiKey) return <NoKey id={id} />;

  const [yyyy, mm] = monthIso.split('-').map(Number);
  const monthStart = new Date(Date.UTC(yyyy, mm - 1, 1));
  const monthEnd = new Date(Date.UTC(yyyy, mm, 0));
  const startStr = monthStart.toISOString().slice(0, 10);
  const endStr = monthEnd.toISOString().slice(0, 10);

  let pricing: PricingResponse | null = null;
  let error: string | null = null;
  try {
    pricing = await repullFetch<PricingResponse>(
      ctx.workspace.id,
      'GET',
      `/v1/listings/${id}/pricing`,
      { query: { startDate: startStr, endDate: endStr } },
    );
  } catch (err) {
    error =
      err instanceof RepullFetchError
        ? err.message
        : `Unexpected error: ${(err as Error).message}`;
  }

  const baseCurrency = pricing?.listing?.currency ?? ctx.workspace.baseCurrency;

  return (
    <div className="space-y-5">
      <Crumbs id={id} />
      <Header />
      <ListingTabs id={id} active="calendar" />
      {error ? (
        <div className="card p-6 border-red-500/20 bg-red-500/[0.04]">
          <p className="text-sm text-red-300 font-mono whitespace-pre-wrap">{error}</p>
        </div>
      ) : (
        <ListingCalendarGrid
          listingId={id}
          monthIso={monthIso}
          recommendations={pricing?.recommendations ?? []}
          currency={baseCurrency}
        />
      )}
    </div>
  );
}

function Header() {
  return (
    <header>
      <h1 className="text-xl font-semibold">Calendar</h1>
      <p className="text-sm muted mt-1">
        Month grid with Atlas recommendation badges. Click a badge to inspect factors and
        apply / decline.
      </p>
    </header>
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
      <span className="text-white/70">calendar</span>
    </nav>
  );
}

function NoKey({ id }: { id: string }) {
  return (
    <div className="space-y-4">
      <Crumbs id={id} />
      <div className="card p-8 text-center max-w-2xl mx-auto">
        <p className="muted text-sm">Calendar requires a Repull API key.</p>
        <Link href="/settings" className="btn btn-primary mt-4 inline-flex">
          Configure your Repull API key in Settings &rarr;
        </Link>
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-4 w-48 bg-white/[0.06] rounded" />
      <div className="space-y-2">
        <div className="h-7 w-72 bg-white/[0.06] rounded" />
      </div>
      <div className="h-10 w-full bg-white/[0.04] rounded" />
      <div className="card h-[480px]" />
    </div>
  );
}

export default async function ListingCalendarPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const today = new Date();
  const m =
    sp.month ??
    `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`;
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarContent id={id} monthIso={m} />
    </Suspense>
  );
}

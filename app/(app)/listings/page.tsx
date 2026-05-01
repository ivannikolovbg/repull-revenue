import Link from 'next/link';
import { Suspense } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, LayoutGrid } from 'lucide-react';
import { requireSessionWorkspace } from '@/core/lib/session';
import { repullFetch, RepullFetchError } from '@/core/services/repull-fetch';

export const dynamic = 'force-dynamic';

interface ListingRow {
  id: number;
  name: string | null;
  city: string | null;
  country: string | null;
  bedrooms: number | null;
  status: string | null;
  channel?: string | null;
  thumbnail?: string | null;
  defaultDailyPrice?: number | null;
  currency?: string | null;
  externalId?: string | null;
  // The upstream may use snake_case — be defensive.
  default_daily_price?: number | null;
  external_id?: string | null;
}

interface ListingsListResponse {
  data: ListingRow[];
  pagination: {
    next_cursor: string | null;
    has_more: boolean;
  };
}

const LIMIT = 25;

async function ListingsContent({
  cursor,
  q,
  status,
}: {
  cursor: string | null;
  q: string;
  status: string;
}) {
  const ctx = await requireSessionWorkspace();
  if (!ctx.workspace.hasApiKey) return <NoKey />;

  let data: ListingsListResponse | null = null;
  let error: string | null = null;
  try {
    data = await repullFetch<ListingsListResponse>(ctx.workspace.id, 'GET', '/v1/listings', {
      query: {
        limit: LIMIT,
        cursor: cursor || undefined,
        q: q || undefined,
        status: status || undefined,
      },
    });
  } catch (err) {
    error =
      err instanceof RepullFetchError
        ? err.message
        : `Unexpected error: ${(err as Error).message}`;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Header />
        <div className="card p-6 border-red-500/20 bg-red-500/[0.04]">
          <p className="text-sm text-red-300 font-mono whitespace-pre-wrap">{error}</p>
        </div>
      </div>
    );
  }

  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <Header />
      <Filters q={q} status={status} />
      {rows.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm">No listings yet.</p>
          <p className="muted text-xs mt-2">
            Connect Airbnb / Booking.com on Repull and listings will appear here.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] text-[11px] uppercase tracking-wide muted border-b border-white/[0.06] bg-white/[0.02]">
            <div className="px-3 py-2">Listing</div>
            <div className="px-3 py-2">Location</div>
            <div className="px-3 py-2 text-right">Bedrooms</div>
            <div className="px-3 py-2">Status</div>
            <div className="px-3 py-2 text-right">Default rate</div>
            <div className="px-3 py-2"></div>
          </div>
          {rows.map((l) => {
            const dp = l.defaultDailyPrice ?? l.default_daily_price ?? null;
            const cur = l.currency ?? ctx.workspace.baseCurrency;
            return (
              <Link
                key={l.id}
                href={`/listings/${l.id}`}
                className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] text-sm border-b border-white/[0.04] hover:bg-white/[0.04]"
              >
                <div className="px-3 py-3 truncate font-medium">{l.name ?? `Listing #${l.id}`}</div>
                <div className="px-3 py-3 truncate muted">
                  {[l.city, l.country].filter(Boolean).join(', ') || '—'}
                </div>
                <div className="px-3 py-3 text-right">{l.bedrooms ?? '—'}</div>
                <div className="px-3 py-3"><StatusPill status={l.status} /></div>
                <div className="px-3 py-3 text-right font-mono text-xs">
                  {dp != null ? `${cur} ${Math.round(Number(dp)).toLocaleString()}` : '—'}
                </div>
                <div className="px-3 py-3 muted">
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Paginator cursor={cursor} hasMore={data?.pagination?.has_more ?? false} nextCursor={data?.pagination?.next_cursor ?? null} q={q} status={status} />
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <LayoutGrid className="w-5 h-5" /> Listings
        </h1>
        <p className="text-sm muted mt-1">
          Your properties under management. Click a listing to see comp set, recommendations,
          calendar, and history.
        </p>
      </div>
      <Link href="/pricing/bulk" className="btn btn-ghost">
        Bulk apply pricing &rarr;
      </Link>
    </header>
  );
}

function Filters({ q, status }: { q: string; status: string }) {
  return (
    <form className="flex flex-wrap gap-3 items-center" action="/listings" method="get">
      <input
        name="q"
        defaultValue={q}
        placeholder="Search by name…"
        className="input max-w-xs"
      />
      <select name="status" defaultValue={status} className="input max-w-[160px]">
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="archived">Archived</option>
      </select>
      <button type="submit" className="btn btn-ghost">Filter</button>
    </form>
  );
}

function StatusPill({ status }: { status: string | null }) {
  if (!status) return <span className="muted">—</span>;
  const s = status.toLowerCase();
  const tone = s === 'active' ? 'good' : s === 'archived' ? 'bad' : 'flat';
  return (
    <span
      className={
        tone === 'good'
          ? 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
          : tone === 'bad'
            ? 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-red-500/10 text-red-300 border border-red-500/30'
            : 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-white/[0.04] text-white/70 border border-white/[0.1]'
      }
    >
      {status}
    </span>
  );
}

function Paginator({
  cursor,
  hasMore,
  nextCursor,
  q,
  status,
}: {
  cursor: string | null;
  hasMore: boolean;
  nextCursor: string | null;
  q: string;
  status: string;
}) {
  function build(c: string | null) {
    const sp = new URLSearchParams();
    if (c) sp.set('cursor', c);
    if (q) sp.set('q', q);
    if (status) sp.set('status', status);
    return `/listings${sp.toString() ? `?${sp.toString()}` : ''}`;
  }
  return (
    <div className="flex items-center justify-between text-xs muted">
      <div>
        {cursor ? `Cursor ${cursor.slice(0, 16)}…` : 'First page'}
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={build(null)}
          className={cursor ? 'btn btn-ghost text-xs' : 'btn btn-ghost text-xs opacity-40 pointer-events-none'}
        >
          <ChevronLeft className="w-3 h-3" /> Reset
        </Link>
        <Link
          href={hasMore && nextCursor ? build(nextCursor) : '#'}
          className={hasMore && nextCursor ? 'btn btn-ghost text-xs' : 'btn btn-ghost text-xs opacity-40 pointer-events-none'}
        >
          Next <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

function NoKey() {
  return (
    <div className="space-y-4">
      <Header />
      <div className="card p-8 text-center max-w-2xl mx-auto">
        <p className="muted text-sm">
          Listings need a Repull API key to sync from your channels.
        </p>
        <Link href="/settings" className="btn btn-primary mt-4 inline-flex">
          Configure your Repull API key in Settings &rarr;
        </Link>
      </div>
    </div>
  );
}

function ListingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-32 bg-white/[0.06] rounded" />
        <div className="h-4 w-72 bg-white/[0.04] rounded" />
      </div>
      <div className="h-10 w-96 bg-white/[0.04] rounded" />
      <div className="card overflow-hidden">
        <div className="h-10 border-b border-white/[0.06] bg-white/[0.02]" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 border-b border-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}

export default async function ListingsPage(props: {
  searchParams: Promise<{ cursor?: string; q?: string; status?: string }>;
}) {
  const sp = await props.searchParams;
  return (
    <Suspense fallback={<ListingsSkeleton />}>
      <ListingsContent
        cursor={sp.cursor ?? null}
        q={sp.q ?? ''}
        status={sp.status ?? ''}
      />
    </Suspense>
  );
}

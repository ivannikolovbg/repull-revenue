import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { requireSessionWorkspace } from '@/core/lib/session';
import { repullFetch, RepullFetchError } from '@/core/services/repull-fetch';
import { ListingTabs } from '../../_components/listing-tabs';
import { cn } from '@/core/lib/cn';

export const dynamic = 'force-dynamic';

interface HistoryRow {
  date: string;
  recommended_rate: number | null;
  applied_rate: number | null;
  status: 'applied' | 'declined' | 'pending' | 'overridden' | string;
  recommendation_factors: Record<string, unknown> | null;
  applied_at: string | null;
  applied_by: string | null;
}

interface HistoryResponse {
  data: HistoryRow[];
  pagination: { next_cursor: string | null; has_more: boolean };
}

async function HistoryContent({
  id,
  cursor,
  startDate,
  endDate,
}: {
  id: string;
  cursor: string | null;
  startDate: string;
  endDate: string;
}) {
  const ctx = await requireSessionWorkspace();
  if (!ctx.workspace.hasApiKey) return <NoKey id={id} />;

  let data: HistoryResponse | null = null;
  let error: string | null = null;
  try {
    data = await repullFetch<HistoryResponse>(
      ctx.workspace.id,
      'GET',
      `/v1/listings/${id}/pricing/history`,
      {
        query: {
          start_date: startDate,
          end_date: endDate,
          limit: 100,
          cursor: cursor || undefined,
        },
      },
    );
  } catch (err) {
    error =
      err instanceof RepullFetchError
        ? err.message
        : `Unexpected error: ${(err as Error).message}`;
  }

  return (
    <div className="space-y-5">
      <Crumbs id={id} />
      <Header />
      <ListingTabs id={id} active="history" />

      <Filters id={id} startDate={startDate} endDate={endDate} />

      {error ? (
        <div className="card p-6 border-red-500/20 bg-red-500/[0.04]">
          <p className="text-sm text-red-300 font-mono whitespace-pre-wrap">{error}</p>
        </div>
      ) : (data?.data ?? []).length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm">No pricing history in this window.</p>
          <p className="muted text-xs mt-2">Try widening the date range above.</p>
        </div>
      ) : (
        <HistoryTable
          rows={data!.data}
          baseCurrency={ctx.workspace.baseCurrency}
        />
      )}

      <Paginator
        id={id}
        cursor={cursor}
        hasMore={data?.pagination?.has_more ?? false}
        nextCursor={data?.pagination?.next_cursor ?? null}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}

function Header() {
  return (
    <header>
      <h1 className="text-xl font-semibold">Pricing history</h1>
      <p className="text-sm muted mt-1">
        Audit trail of past Atlas recommendations vs the price that was actually applied. Filter by
        date, paginate forward.
      </p>
    </header>
  );
}

function HistoryTable({
  rows,
  baseCurrency,
}: {
  rows: HistoryRow[];
  baseCurrency: string;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_2fr] text-[11px] uppercase tracking-wide muted border-b border-white/[0.06] bg-white/[0.02]">
        <div className="px-3 py-2">Date</div>
        <div className="px-3 py-2 text-right">Recommended</div>
        <div className="px-3 py-2 text-right">Applied</div>
        <div className="px-3 py-2">Status</div>
        <div className="px-3 py-2">By / At</div>
        <div className="px-3 py-2">Factors</div>
      </div>
      {rows.map((r) => {
        const factors = Object.entries(r.recommendation_factors ?? {})
          .filter(([, v]) => v != null && v !== false)
          .slice(0, 4);
        return (
          <div
            key={`${r.date}-${r.applied_at ?? 'na'}`}
            className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_2fr] text-sm border-b border-white/[0.04] hover:bg-white/[0.04]"
          >
            <div className="px-3 py-3 font-mono text-xs">{r.date}</div>
            <div className="px-3 py-3 text-right font-mono text-xs">
              {r.recommended_rate != null
                ? `${baseCurrency} ${Math.round(r.recommended_rate).toLocaleString()}`
                : '—'}
            </div>
            <div className="px-3 py-3 text-right font-mono text-xs">
              {r.applied_rate != null
                ? `${baseCurrency} ${Math.round(r.applied_rate).toLocaleString()}`
                : '—'}
            </div>
            <div className="px-3 py-3"><StatusPill status={r.status} /></div>
            <div className="px-3 py-3 text-xs">
              <div>{r.applied_by ?? '—'}</div>
              {r.applied_at ? (
                <div className="muted text-[11px]">
                  {new Date(r.applied_at).toLocaleString()}
                </div>
              ) : null}
            </div>
            <div className="px-3 py-3">
              <div className="flex flex-wrap gap-1">
                {factors.map(([k, v]) => (
                  <span
                    key={k}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08]"
                  >
                    {humanise(k, v)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'applied'
      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
      : status === 'declined'
        ? 'bg-white/[0.04] text-white/70 border-white/[0.1]'
        : status === 'overridden'
          ? 'bg-amber-500/10 text-amber-200 border-amber-500/30'
          : 'bg-white/[0.04] text-white/60 border-white/[0.1]';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border', tone)}>
      {status}
    </span>
  );
}

function Filters({ id, startDate, endDate }: { id: string; startDate: string; endDate: string }) {
  return (
    <form className="flex flex-wrap items-end gap-3" action={`/listings/${id}/pricing/history`} method="get">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-wide muted">Start</span>
        <input className="input w-40" type="date" name="start_date" defaultValue={startDate} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-wide muted">End</span>
        <input className="input w-40" type="date" name="end_date" defaultValue={endDate} />
      </label>
      <button type="submit" className="btn btn-ghost">Apply</button>
    </form>
  );
}

function Paginator({
  id,
  cursor,
  hasMore,
  nextCursor,
  startDate,
  endDate,
}: {
  id: string;
  cursor: string | null;
  hasMore: boolean;
  nextCursor: string | null;
  startDate: string;
  endDate: string;
}) {
  function build(c: string | null) {
    const sp = new URLSearchParams();
    sp.set('start_date', startDate);
    sp.set('end_date', endDate);
    if (c) sp.set('cursor', c);
    return `/listings/${id}/pricing/history?${sp.toString()}`;
  }
  return (
    <div className="flex items-center justify-between text-xs muted">
      <div>{cursor ? `Cursor ${cursor.slice(0, 16)}…` : 'First page'}</div>
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

function Crumbs({ id }: { id: string }) {
  return (
    <nav className="text-xs muted">
      <Link href="/listings" className="inline-flex items-center gap-1 hover:text-white">
        <ArrowLeft className="w-3 h-3" /> Listings
      </Link>
      <span className="mx-2">·</span>
      <Link href={`/listings/${id}`} className="hover:text-white">#{id}</Link>
      <span className="mx-2">·</span>
      <span className="text-white/70">history</span>
    </nav>
  );
}

function NoKey({ id }: { id: string }) {
  return (
    <div className="space-y-4">
      <Crumbs id={id} />
      <div className="card p-8 text-center max-w-2xl mx-auto">
        <p className="muted text-sm">History requires a Repull API key.</p>
        <Link href="/settings" className="btn btn-primary mt-4 inline-flex">
          Configure your Repull API key in Settings &rarr;
        </Link>
      </div>
    </div>
  );
}

function HistorySkeleton() {
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

function humanise(key: string, value: unknown): string {
  if (key === 'event' && typeof value === 'string') return value;
  if (key === 'demand' && typeof value === 'string') return `${value} demand`;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return `${key} ${value}`;
  return key;
}

export default async function HistoryPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cursor?: string; start_date?: string; end_date?: string }>;
}) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const today = new Date();
  const defaultStart = new Date(today.getTime() - 90 * 86400000).toISOString().slice(0, 10);
  const defaultEnd = new Date(today.getTime() + 90 * 86400000).toISOString().slice(0, 10);
  return (
    <Suspense fallback={<HistorySkeleton />}>
      <HistoryContent
        id={id}
        cursor={sp.cursor ?? null}
        startDate={sp.start_date ?? defaultStart}
        endDate={sp.end_date ?? defaultEnd}
      />
    </Suspense>
  );
}

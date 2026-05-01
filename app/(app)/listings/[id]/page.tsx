import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { requireSessionWorkspace } from '@/core/lib/session';
import { repullFetch, RepullFetchError } from '@/core/services/repull-fetch';
import { ListingTabs } from './_components/listing-tabs';
export const dynamic = 'force-dynamic';

interface ListingDetail {
  id: number | string;
  name?: string | null;
  city?: string | null;
  country?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  personCapacity?: number | null;
  maxGuests?: number | null;
  defaultDailyPrice?: number | null;
  default_daily_price?: number | null;
  currency?: string | null;
  status?: string | null;
  thumbnail?: string | null;
  channels?: Array<{ provider: string; status: string; externalId?: string | null }>;
  [key: string]: unknown;
}

async function DetailContent({ id }: { id: string }) {
  const ctx = await requireSessionWorkspace();
  if (!ctx.workspace.hasApiKey) return <NoKey id={id} />;

  let listing: ListingDetail | null = null;
  let error: string | null = null;
  try {
    // Use SDK shape — `properties.get` returns a `Property`. We accept the
    // looser `ListingDetail` union here to bridge upstream field-name drift.
    listing = await repullFetch<ListingDetail>(ctx.workspace.id, 'GET', `/v1/properties/${id}`);
  } catch (err) {
    error =
      err instanceof RepullFetchError
        ? err.message
        : `Unexpected error: ${(err as Error).message}`;
  }

  if (error || !listing) {
    return (
      <div className="space-y-4">
        <Crumbs id={id} />
        <div className="card p-6 border-red-500/20 bg-red-500/[0.04]">
          <p className="text-sm text-red-300 font-mono whitespace-pre-wrap">
            {error ?? 'Listing not found'}
          </p>
        </div>
      </div>
    );
  }

  const dp = listing.defaultDailyPrice ?? listing.default_daily_price ?? null;
  const cur = listing.currency ?? ctx.workspace.baseCurrency;

  return (
    <div className="space-y-5">
      <Crumbs id={id} />
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{listing.name ?? `Listing #${id}`}</h1>
          <p className="text-sm muted mt-1">
            {[listing.city, listing.country].filter(Boolean).join(', ') || '—'}
            {listing.bedrooms != null ? ` · ${listing.bedrooms} BR` : ''}
            {listing.bathrooms != null ? ` · ${listing.bathrooms} bath` : ''}
            {listing.maxGuests != null || listing.personCapacity != null
              ? ` · sleeps ${listing.maxGuests ?? listing.personCapacity}`
              : ''}
          </p>
        </div>
        <div className="text-right">
          {dp != null ? (
            <div className="font-mono text-sm">
              <span className="muted text-xs uppercase tracking-wide">Default rate</span>{' '}
              {cur} {Math.round(Number(dp)).toLocaleString()}
            </div>
          ) : null}
        </div>
      </header>

      <ListingTabs id={String(id)} active="overview" />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card label="Status" value={String(listing.status ?? '—')} />
        <Card label="Currency" value={String(cur)} />
        <Card label="Bedrooms" value={listing.bedrooms != null ? String(listing.bedrooms) : '—'} />
      </section>

      <section className="card p-5">
        <div className="text-sm font-medium mb-2">Channels</div>
        {listing.channels && listing.channels.length > 0 ? (
          <ul className="space-y-2">
            {listing.channels.map((c, i) => (
              <li key={`${c.provider}-${i}`} className="text-sm flex items-center justify-between">
                <span className="font-medium">{c.provider}</span>
                <span className="muted text-xs">
                  {c.status}
                  {c.externalId ? ` · ${c.externalId}` : ''}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted text-xs">No channel info on this listing yet.</p>
        )}
      </section>
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
      <span className="text-white/70">#{id}</span>
    </nav>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide muted">{label}</div>
      <div className="text-lg font-medium mt-1">{value}</div>
    </div>
  );
}

function NoKey({ id }: { id: string }) {
  return (
    <div className="space-y-4">
      <Crumbs id={id} />
      <div className="card p-8 text-center max-w-2xl mx-auto">
        <p className="muted text-sm">Listing details need a Repull API key.</p>
        <Link href="/settings" className="btn btn-primary mt-4 inline-flex">
          Configure your Repull API key in Settings &rarr;
        </Link>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-4 w-48 bg-white/[0.06] rounded" />
      <div className="space-y-2">
        <div className="h-7 w-72 bg-white/[0.06] rounded" />
        <div className="h-4 w-96 bg-white/[0.04] rounded" />
      </div>
      <div className="h-10 w-full bg-white/[0.04] rounded" />
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-20" />
        ))}
      </div>
    </div>
  );
}

export default async function ListingDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <DetailContent id={id} />
    </Suspense>
  );
}

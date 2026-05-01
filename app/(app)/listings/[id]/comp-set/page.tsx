import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft, ExternalLink, Star } from 'lucide-react';
import { requireSessionWorkspace } from '@/core/lib/session';
import { repullFetch, RepullFetchError } from '@/core/services/repull-fetch';
import { ListingTabs } from '../_components/listing-tabs';
import { CompSetFilters } from './comp-set-filters';

export const dynamic = 'force-dynamic';

interface CompRow {
  id: number;
  name: string | null;
  city: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  rating: number | null;
  reviewCount: number | null;
  currentNightlyRate: number | null;
  distanceKm: number | null;
  thumbnail: string | null;
  platformUrl: string | null;
  lat?: number | null;
  lng?: number | null;
  // Optional per-day series — defensive shape, may be { date, rate, available }.
  daily?: Array<{ date: string; rate: number | null; available: boolean | null }>;
}

interface CompsResponse {
  listingId: number;
  total: number;
  data: CompRow[];
}

async function CompContent({
  id,
  radiusKm,
  limit,
}: {
  id: string;
  radiusKm: number;
  limit: number;
}) {
  const ctx = await requireSessionWorkspace();
  if (!ctx.workspace.hasApiKey) return <NoKey id={id} />;

  let data: CompsResponse | null = null;
  let error: string | null = null;
  try {
    // SDK gap: `listings.comps()` not yet on @repull/sdk — raw fetch.
    // Endpoint shipped at vanio-repull-api 0e946bb.
    data = await repullFetch<CompsResponse>(
      ctx.workspace.id,
      'GET',
      `/v1/listings/${id}/comps`,
      { query: { radius_km: radiusKm, limit } },
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
      <Header id={id} />
      <ListingTabs id={id} active="comp-set" />
      <CompSetFilters id={id} radiusKm={radiusKm} limit={limit} />

      {error ? (
        <div className="card p-6 border-red-500/20 bg-red-500/[0.04]">
          <p className="text-sm text-red-300 font-mono whitespace-pre-wrap">{error}</p>
        </div>
      ) : data && data.data.length > 0 ? (
        <CompTable comps={data.data} total={data.total} baseCurrency={ctx.workspace.baseCurrency} />
      ) : (
        <div className="card p-8 text-center">
          <p className="text-sm">No comps within the selected radius.</p>
          <p className="muted text-xs mt-2">Try widening the radius from the filter above.</p>
        </div>
      )}
    </div>
  );
}

function Header({ id }: { id: string }) {
  return (
    <header>
      <h1 className="text-xl font-semibold">Comp set</h1>
      <p className="text-sm muted mt-1">
        Closest competing listings with distance, rating, current nightly rate, and a link to the
        live platform page. Powered by Atlas.
      </p>
    </header>
  );
}

function CompTable({
  comps,
  total,
  baseCurrency,
}: {
  comps: CompRow[];
  total: number;
  baseCurrency: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs muted">
        {total.toLocaleString()} comp{total === 1 ? '' : 's'} match the current radius.
      </p>
      <div className="card overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] text-[11px] uppercase tracking-wide muted border-b border-white/[0.06] bg-white/[0.02]">
          <div className="px-3 py-2">Listing</div>
          <div className="px-3 py-2 text-right">Bedrooms</div>
          <div className="px-3 py-2 text-right">Rating</div>
          <div className="px-3 py-2 text-right">Distance</div>
          <div className="px-3 py-2 text-right">Rate</div>
          <div className="px-3 py-2"></div>
        </div>
        {comps.map((c) => (
          <div
            key={c.id}
            className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] text-sm border-b border-white/[0.04] hover:bg-white/[0.04]"
          >
            <div className="px-3 py-3 truncate">
              <div className="font-medium truncate">{c.name ?? `Comp #${c.id}`}</div>
              {c.city ? <div className="text-[11px] muted truncate">{c.city}</div> : null}
            </div>
            <div className="px-3 py-3 text-right">
              {c.bedrooms ?? '—'}
              {c.bathrooms != null ? <span className="muted text-[11px]"> / {c.bathrooms}</span> : null}
            </div>
            <div className="px-3 py-3 text-right inline-flex items-center justify-end gap-1">
              {c.rating != null ? (
                <>
                  <Star className="w-3 h-3 text-amber-300 fill-current" />
                  {c.rating.toFixed(2)}
                  {c.reviewCount ? <span className="muted text-[11px]"> ({c.reviewCount})</span> : null}
                </>
              ) : (
                '—'
              )}
            </div>
            <div className="px-3 py-3 text-right muted">
              {c.distanceKm != null ? `${c.distanceKm.toFixed(2)} km` : '—'}
            </div>
            <div className="px-3 py-3 text-right font-mono text-xs">
              {c.currentNightlyRate != null
                ? `${baseCurrency} ${Math.round(c.currentNightlyRate).toLocaleString()}`
                : '—'}
            </div>
            <div className="px-3 py-3">
              {c.platformUrl ? (
                <Link
                  href={c.platformUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="muted hover:text-white"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              ) : null}
            </div>
          </div>
        ))}
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
      <Link href={`/listings/${id}`} className="hover:text-white">
        #{id}
      </Link>
      <span className="mx-2">·</span>
      <span className="text-white/70">comp set</span>
    </nav>
  );
}

function NoKey({ id }: { id: string }) {
  return (
    <div className="space-y-4">
      <Crumbs id={id} />
      <div className="card p-8 text-center max-w-2xl mx-auto">
        <p className="muted text-sm">Comp set requires a Repull API key.</p>
        <Link href="/settings" className="btn btn-primary mt-4 inline-flex">
          Configure your Repull API key in Settings &rarr;
        </Link>
      </div>
    </div>
  );
}

function CompSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-4 w-48 bg-white/[0.06] rounded" />
      <div className="space-y-2">
        <div className="h-7 w-72 bg-white/[0.06] rounded" />
        <div className="h-4 w-96 bg-white/[0.04] rounded" />
      </div>
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

export default async function CompSetPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ radius_km?: string; limit?: string }>;
}) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const radiusKm = clampNumber(parseFloat(sp.radius_km ?? '5'), 0.5, 50, 5);
  const limit = clampNumber(parseInt(sp.limit ?? '20', 10), 1, 100, 20);
  return (
    <Suspense fallback={<CompSkeleton />}>
      <CompContent id={id} radiusKm={radiusKm} limit={limit} />
    </Suspense>
  );
}

function clampNumber(v: number, min: number, max: number, fallback: number): number {
  if (Number.isNaN(v) || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

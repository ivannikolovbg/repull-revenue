import Link from 'next/link';
import { Suspense } from 'react';
import { Sparkles } from 'lucide-react';
import { requireSessionWorkspace } from '@/core/lib/session';
import { repullFetch, RepullFetchError } from '@/core/services/repull-fetch';
import { StrategyEditor } from './strategy-editor';

export const dynamic = 'force-dynamic';

interface ListingRow {
  id: number;
  name: string | null;
  city: string | null;
}

interface ListingsResponse {
  data: ListingRow[];
  pagination: { next_cursor: string | null; has_more: boolean };
}

interface StrategyResponse {
  mode?: 'recommend' | 'auto' | string;
  minPrice?: number | null;
  maxPrice?: number | null;
  maxDailyChangePct?: number | null;
  weekendMarkupPct?: number | null;
  dayOfWeekMultipliers?: Record<string, number> | null;
  targetOccupancyPct?: number | null;
  targetMonthlyRevenue?: number | null;
  ownerMinMonthlyPayout?: number | null;
  compPositionTarget?: 'below' | 'match' | 'above' | string | null;
  compAdjustPct?: number | null;
  eventBoostEnabled?: boolean | null;
  eventBoostMaxPct?: number | null;
  [key: string]: unknown;
}

async function StrategyContent({ listingId }: { listingId: string | null }) {
  const ctx = await requireSessionWorkspace();
  if (!ctx.workspace.hasApiKey) return <NoKey />;

  // Always pull listings so the editor has a picker.
  let listings: ListingRow[] = [];
  let listError: string | null = null;
  try {
    const lr = await repullFetch<ListingsResponse>(ctx.workspace.id, 'GET', '/v1/listings', {
      query: { limit: 50, status: 'active' },
    });
    listings = lr.data ?? [];
  } catch (err) {
    listError =
      err instanceof RepullFetchError
        ? err.message
        : `Unexpected error: ${(err as Error).message}`;
  }

  // Resolve which strategy to load: explicit listing or workspace default.
  let initial: StrategyResponse | null = null;
  let loadError: string | null = null;

  if (listingId) {
    try {
      initial = await repullFetch<StrategyResponse>(
        ctx.workspace.id,
        'GET',
        `/v1/listings/${listingId}/pricing/strategy`,
      );
    } catch (err) {
      loadError =
        err instanceof RepullFetchError
          ? err.message
          : `Unexpected error: ${(err as Error).message}`;
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> Pricing strategy
          </h1>
          <p className="text-sm muted mt-1">
            Tune how Atlas prices a listing. Pick a listing to edit its strategy, or stay on the
            workspace default to see the global behaviour.
          </p>
        </div>
      </header>

      {listError ? (
        <div className="card p-3 border-red-500/20 bg-red-500/[0.04] text-xs text-red-300 font-mono whitespace-pre-wrap">
          {listError}
        </div>
      ) : null}

      <StrategyEditor
        listings={listings}
        initialListingId={listingId}
        initial={initial}
        baseCurrency={ctx.workspace.baseCurrency}
        autoApplyPricing={ctx.workspace.autoApplyPricing}
        loadError={loadError}
      />
    </div>
  );
}

function NoKey() {
  return (
    <div className="card p-8 text-center max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold">Strategy</h1>
      <p className="muted mt-2 text-sm">Strategy editor needs a Repull API key.</p>
      <Link href="/settings" className="btn btn-primary mt-4 inline-flex">
        Configure your Repull API key in Settings &rarr;
      </Link>
    </div>
  );
}

function StrategySkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-7 w-32 bg-white/[0.06] rounded" />
      <div className="card h-12" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-32" />
        ))}
      </div>
    </div>
  );
}

export default async function StrategyPage(props: {
  searchParams: Promise<{ listingId?: string }>;
}) {
  const sp = await props.searchParams;
  return (
    <Suspense fallback={<StrategySkeleton />}>
      <StrategyContent listingId={sp.listingId ?? null} />
    </Suspense>
  );
}

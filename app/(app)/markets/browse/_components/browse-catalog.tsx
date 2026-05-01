'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Filter,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/core/lib/cn';

interface BrowseRow {
  city: string;
  country: string | null;
  listings: number;
  avg_adr: number | null;
  subscribed?: boolean;
}

interface BrowseResponse {
  data: BrowseRow[];
  pagination: {
    next_cursor: string | null;
    has_more: boolean;
    total_in_filter: number;
  };
}

interface CountryCategory {
  country: string;
  count: number;
}

interface Props {
  /** Country pills to render in the sticky filter bar (from `/v1/markets`). */
  countries: CountryCategory[];
  baseCurrency: string;
}

type SortOption = 'listings_desc' | 'listings_asc' | 'city_asc' | 'avg_adr_desc';

const SORT_LABELS: Record<SortOption, string> = {
  listings_desc: 'Most comps',
  listings_asc: 'Fewest comps',
  city_asc: 'City A→Z',
  avg_adr_desc: 'Highest ADR',
};

/**
 * Full paginated catalog page contents. URL state is the source of truth so
 * the page is shareable / bookmarkable. Cursor-based pagination matches the
 * `/v1/markets/browse` contract; "Previous" rewinds through a local stack so
 * the back button works without re-fetching every prior page.
 */
export function BrowseCatalog({ countries, baseCurrency }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const urlQ = sp.get('q') ?? '';
  const urlCountry = sp.get('country') ?? '';
  const urlMinListings = sp.get('min_listings') ?? '';
  const urlSort = (sp.get('sort') as SortOption) ?? 'listings_desc';
  const urlCursor = sp.get('cursor') ?? '';

  // Local controlled state for the search box (debounce → URL update).
  const [searchInput, setSearchInput] = useState(urlQ);
  const [debouncedQ, setDebouncedQ] = useState(urlQ);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Push debounced search term into URL so it joins the rest of the
  // bookmarkable filter state.
  useEffect(() => {
    if (debouncedQ === urlQ) return;
    const next = new URLSearchParams(sp.toString());
    if (debouncedQ) next.set('q', debouncedQ);
    else next.delete('q');
    next.delete('cursor'); // changing query resets pagination
    router.replace(`/markets/browse?${next.toString()}`, { scroll: false });
  }, [debouncedQ, urlQ, router, sp]);

  // Cursor history for "Previous" — only stores cursors leading TO the
  // current page. `[]` means we're on page 1.
  const cursorStackRef = useRef<string[]>([]);
  // Reset the stack whenever a non-cursor filter changes — pagination
  // fundamentally restarts.
  const filterKey = `${urlQ}|${urlCountry}|${urlMinListings}|${urlSort}`;
  const lastFilterKeyRef = useRef(filterKey);
  if (lastFilterKeyRef.current !== filterKey) {
    cursorStackRef.current = [];
    lastFilterKeyRef.current = filterKey;
  }

  // Fetch state.
  const [data, setData] = useState<BrowseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrowse = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (urlQ) params.set('q', urlQ);
    if (urlCountry) params.set('country', urlCountry);
    if (urlMinListings) params.set('min_listings', urlMinListings);
    if (urlSort) params.set('sort', urlSort);
    if (urlCursor) params.set('cursor', urlCursor);
    params.set('limit', '30');
    try {
      const res = await fetch(`/api/markets/browse?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? `Browse unavailable (${res.status})`);
        setData(null);
        return;
      }
      const body = (await res.json()) as BrowseResponse;
      setData(body);
    } catch (err) {
      setError((err as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [urlQ, urlCountry, urlMinListings, urlSort, urlCursor]);

  useEffect(() => {
    void fetchBrowse();
  }, [fetchBrowse]);

  function setUrlParam(name: string, value: string | null) {
    const next = new URLSearchParams(sp.toString());
    if (value && value.length > 0) next.set(name, value);
    else next.delete(name);
    next.delete('cursor');
    router.replace(`/markets/browse?${next.toString()}`, { scroll: false });
  }

  function goNext() {
    const nextCursor = data?.pagination.next_cursor;
    if (!nextCursor) return;
    cursorStackRef.current = [...cursorStackRef.current, urlCursor];
    const next = new URLSearchParams(sp.toString());
    next.set('cursor', nextCursor);
    router.replace(`/markets/browse?${next.toString()}`, { scroll: false });
  }

  function goPrev() {
    const stack = cursorStackRef.current;
    if (stack.length === 0) return;
    const prev = stack[stack.length - 1];
    cursorStackRef.current = stack.slice(0, -1);
    const next = new URLSearchParams(sp.toString());
    if (prev) next.set('cursor', prev);
    else next.delete('cursor');
    router.replace(`/markets/browse?${next.toString()}`, { scroll: false });
  }

  const totalInFilter = data?.pagination.total_in_filter;
  const onPage = data?.data.length ?? 0;
  const hasMore = data?.pagination.has_more ?? false;
  const canPrev = cursorStackRef.current.length > 0;

  const sortOptions = useMemo(
    () => Object.entries(SORT_LABELS) as Array<[SortOption, string]>,
    [],
  );

  return (
    <div className="space-y-4">
      {/* Sticky filter bar */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-[#0a0a0a]/90 backdrop-blur border-b border-white/[0.06]">
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <div className="relative flex-1 min-w-0 md:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 muted pointer-events-none" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search city or country…"
              aria-label="Search markets"
              className="input pl-9"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              aria-label="Country filter"
              value={urlCountry}
              onChange={(e) => setUrlParam('country', e.target.value || null)}
              className="input w-auto"
            >
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c.country} value={c.country}>
                  {c.country} ({c.count.toLocaleString()})
                </option>
              ))}
            </select>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Min comps"
              aria-label="Minimum listings"
              value={urlMinListings}
              onChange={(e) => setUrlParam('min_listings', e.target.value || null)}
              className="input w-32"
            />
            <select
              aria-label="Sort"
              value={urlSort}
              onChange={(e) => setUrlParam('sort', e.target.value)}
              className="input w-auto"
            >
              {sortOptions.map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
            {(urlQ || urlCountry || urlMinListings) ? (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  router.replace('/markets/browse', { scroll: false });
                }}
                className="text-xs muted hover:text-white inline-flex items-center gap-1 px-2 py-1.5"
              >
                <Filter className="w-3 h-3" /> Clear
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-2 text-xs muted">
          {loading ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading…
            </span>
          ) : error ? (
            <span className="text-red-300">{error}</span>
          ) : totalInFilter != null ? (
            <span>
              {totalInFilter.toLocaleString()} market
              {totalInFilter === 1 ? '' : 's'} match · showing {onPage}
            </span>
          ) : null}
        </div>
      </div>

      {/* Results */}
      {loading && data == null ? (
        <CatalogSkeleton />
      ) : error ? (
        <div className="card p-6 border-red-500/20 bg-red-500/[0.04]">
          <p className="text-sm text-red-300 font-mono whitespace-pre-wrap">{error}</p>
          <p className="text-xs muted mt-3">
            If this is a fresh deploy of the Repull API, the new browse
            endpoint may still be rolling out. Refresh in a minute.
          </p>
        </div>
      ) : data && data.data.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm muted">No markets match your filters.</p>
        </div>
      ) : data ? (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] text-[11px] uppercase tracking-wide muted border-b border-white/[0.06] bg-white/[0.02] px-3 py-2">
            <div>City</div>
            <div className="text-right">Country</div>
            <div className="text-right">Comps</div>
            <div className="text-right">Avg ADR</div>
            <div className="w-6" />
          </div>
          {data.data.map((row) => (
            <Link
              key={`${row.city}-${row.country ?? ''}`}
              href={`/markets/${encodeURIComponent(row.city)}`}
              className={cn(
                'grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center text-sm',
                'border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.04] transition px-3 py-2.5',
              )}
            >
              <div className="font-medium truncate">{row.city}</div>
              <div className="text-right muted text-xs">{row.country ?? '—'}</div>
              <div className="text-right">{row.listings.toLocaleString()}</div>
              <div className="text-right font-mono text-xs muted">
                {row.avg_adr != null
                  ? `${baseCurrency} ${Math.round(row.avg_adr).toLocaleString()}`
                  : '—'}
              </div>
              <div className="w-6 flex justify-end">
                <ArrowRight className="w-3.5 h-3.5 muted" />
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      {/* Pagination */}
      {data && data.data.length > 0 ? (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goPrev}
            disabled={!canPrev || loading}
            className={cn(
              'btn btn-ghost text-xs',
              (!canPrev || loading) && 'opacity-40 cursor-not-allowed',
            )}
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Previous
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!hasMore || loading}
            className={cn(
              'btn btn-ghost text-xs',
              (!hasMore || loading) && 'opacity-40 cursor-not-allowed',
            )}
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="h-9 border-b border-white/[0.06] bg-white/[0.02]" />
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-12 border-b border-white/[0.04] last:border-b-0" />
      ))}
    </div>
  );
}

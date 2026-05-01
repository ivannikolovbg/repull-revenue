'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Search, Loader2, ArrowRight, X } from 'lucide-react';
import { cn } from '@/core/lib/cn';

interface BrowseRow {
  city: string;
  country: string | null;
  listings: number;
  avg_adr: number | null;
}

interface Props {
  /** Total number of markets across the catalog (drives the placeholder copy + CTA). */
  totalAvailable: number;
  /** Currency code for ADR display in the dropdown rows (workspace base currency). */
  baseCurrency: string;
}

/**
 * Debounced search box that hits `/api/markets/browse` on the local proxy
 * route so we keep the workspace API key server-side. Renders a floating
 * dropdown of matching markets, each linking into the city deep dive.
 *
 * Empty query collapses the dropdown — we don't pre-fetch a default list
 * because the featured carousel below already serves that role.
 */
export function BrowseSearch({ totalAvailable, baseCurrency }: Props) {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [results, setResults] = useState<BrowseRow[] | null>(null);
  const [totalInFilter, setTotalInFilter] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 300ms debounce on the search term.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Fetch when the debounced term changes. Empty query clears results.
  useEffect(() => {
    if (debouncedQ.length === 0) {
      setResults(null);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    startTransition(() => {
      void (async () => {
        try {
          const url = `/api/markets/browse?q=${encodeURIComponent(debouncedQ)}&limit=8`;
          const res = await fetch(url, { signal: ctrl.signal });
          if (!res.ok) {
            const body = (await res.json().catch(() => null)) as
              | { error?: string }
              | null;
            setResults([]);
            setTotalInFilter(0);
            setError(body?.error ?? `Search unavailable (${res.status})`);
            return;
          }
          const body = (await res.json()) as {
            data: BrowseRow[];
            pagination: { total_in_filter: number };
          };
          setResults(body.data);
          setTotalInFilter(body.pagination?.total_in_filter ?? body.data.length);
          setError(null);
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
          setError((err as Error).message);
          setResults([]);
        }
      })();
    });
    return () => ctrl.abort();
  }, [debouncedQ]);

  const open = q.length > 0;
  const placeholder =
    totalAvailable > 0
      ? `Search ${totalAvailable.toLocaleString()} markets…`
      : 'Search markets…';

  return (
    <div className="relative">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 muted pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          aria-label="Search markets"
          className="input pl-9 pr-9"
        />
        {q ? (
          <button
            type="button"
            onClick={() => {
              setQ('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 muted hover:text-white p-1"
          >
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          role="listbox"
          className="absolute z-20 mt-1.5 w-full card bg-[#0e0e0e] border-white/[0.1] shadow-2xl max-h-[420px] overflow-auto"
        >
          {pending && results == null ? (
            <SearchSkeleton />
          ) : error ? (
            <div className="px-3 py-4 text-sm text-red-300">{error}</div>
          ) : results == null || results.length === 0 ? (
            <div className="px-3 py-4 text-sm muted">
              No markets match &ldquo;{debouncedQ}&rdquo;.
            </div>
          ) : (
            <>
              {results.map((row) => (
                <Link
                  key={`${row.city}-${row.country ?? ''}`}
                  href={`/markets/${encodeURIComponent(row.city)}`}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.04] transition"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{row.city}</div>
                    <div className="text-[11px] muted">
                      {row.country ? `${row.country} · ` : ''}
                      {row.listings.toLocaleString()} comps
                      {row.avg_adr != null
                        ? ` · ${baseCurrency} ${Math.round(row.avg_adr).toLocaleString()} avg ADR`
                        : ''}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 muted shrink-0" />
                </Link>
              ))}
              {totalInFilter > results.length ? (
                <Link
                  href={`/markets/browse?q=${encodeURIComponent(debouncedQ)}`}
                  className={cn(
                    'block px-3 py-2.5 text-xs muted hover:text-white hover:bg-white/[0.04] transition border-t border-white/[0.06]',
                  )}
                >
                  See all {totalInFilter.toLocaleString()} matches &rarr;
                </Link>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="p-2 space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between gap-3 px-2 py-2">
          <div className="flex-1">
            <div className="h-3.5 w-32 bg-white/[0.06] rounded animate-pulse" />
            <div className="h-3 w-48 bg-white/[0.04] rounded mt-1.5 animate-pulse" />
          </div>
          <div className="h-3 w-3 bg-white/[0.06] rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

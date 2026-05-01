'use client';

import Link from 'next/link';
import { Globe } from 'lucide-react';
import { cn } from '@/core/lib/cn';

export interface CountryCategory {
  country: string;
  count: number;
}

interface Props {
  categories: CountryCategory[];
  /** Currently-selected country, or null when "All" is active. */
  active?: string | null;
  /** Render up to N country pills before truncating (defaults to all). */
  limit?: number;
}

/**
 * Pill row of countries with comp counts. Pills are real links into
 * `/markets/browse?country=XX` so they're shareable + work without JS.
 *
 * For a richer in-place filter (no navigation) the `/markets/browse` page
 * uses a controlled variant — this one is the read-only summary that lives
 * on the markets landing page.
 */
export function CountryFilter({ categories, active, limit }: Props) {
  if (categories.length === 0) return null;
  const visible = limit ? categories.slice(0, limit) : categories;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-[11px] muted pr-1">
        <Globe className="w-3 h-3" />
        <span>Filter by country</span>
      </div>
      <Link
        href="/markets/browse"
        className={cn(
          'px-2.5 py-1 rounded-full border text-xs transition',
          active == null
            ? 'border-white/40 bg-white/[0.08] text-white'
            : 'border-white/[0.1] muted hover:bg-white/[0.04] hover:text-white',
        )}
      >
        All
      </Link>
      {visible.map((c) => {
        const isActive = active === c.country;
        return (
          <Link
            key={c.country}
            href={`/markets/browse?country=${encodeURIComponent(c.country)}`}
            className={cn(
              'px-2.5 py-1 rounded-full border text-xs transition inline-flex items-center gap-1.5',
              isActive
                ? 'border-white/40 bg-white/[0.08] text-white'
                : 'border-white/[0.1] muted hover:bg-white/[0.04] hover:text-white',
            )}
          >
            <span className="font-medium">{c.country}</span>
            <span className="text-[10px] opacity-70">
              {c.count.toLocaleString()}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

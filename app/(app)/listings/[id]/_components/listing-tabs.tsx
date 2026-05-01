'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/core/lib/cn';

interface Tab {
  href: string;
  label: string;
  matches: (pathname: string, base: string) => boolean;
}

export type ListingTabKey = 'overview' | 'comp-set' | 'pricing' | 'calendar' | 'history';

export function ListingTabs({ id, active }: { id: string; active?: ListingTabKey }) {
  const pathname = usePathname() ?? '';
  const base = `/listings/${id}`;
  const tabs: Tab[] = [
    {
      href: base,
      label: 'Overview',
      matches: (p, b) => p === b,
    },
    {
      href: `${base}/comp-set`,
      label: 'Comp set',
      matches: (p, b) => p.startsWith(`${b}/comp-set`),
    },
    {
      href: `${base}/pricing`,
      label: 'Pricing',
      matches: (p, b) => p === `${b}/pricing` || p.startsWith(`${b}/pricing/recommendations`),
    },
    {
      href: `${base}/calendar`,
      label: 'Calendar',
      matches: (p, b) => p.startsWith(`${b}/calendar`),
    },
    {
      href: `${base}/pricing/history`,
      label: 'History',
      matches: (p, b) => p.startsWith(`${b}/pricing/history`),
    },
  ];
  return (
    <nav className="flex items-center gap-1 border-b border-white/[0.06]">
      {tabs.map((t) => {
        const isActive = active
          ? (active === 'overview' && t.href === base) ||
            (active === 'comp-set' && t.href.endsWith('/comp-set')) ||
            (active === 'pricing' && t.href.endsWith('/pricing')) ||
            (active === 'calendar' && t.href.endsWith('/calendar')) ||
            (active === 'history' && t.href.endsWith('/history'))
          : t.matches(pathname, base);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              'px-3 py-2 text-sm border-b-2 -mb-px transition',
              isActive
                ? 'border-repull text-white'
                : 'border-transparent text-white/60 hover:text-white',
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Cog,
  Home,
  LayoutGrid,
  LineChart,
  Map,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/core/lib/cn';

interface NavItem {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}

export function Sidebar({ workspaceName }: { workspaceName: string }) {
  const pathname = usePathname();
  const NAV: NavItem[] = [
    { href: '/dashboard', label: 'Overview', Icon: Home },
    { href: '/markets', label: 'Markets', Icon: Map },
    { href: '/listings', label: 'Listings', Icon: LayoutGrid },
    { href: '/pricing', label: 'Pricing', Icon: LineChart },
    { href: '/strategy', label: 'Strategy', Icon: Sparkles },
    { href: '/settings', label: 'Settings', Icon: Cog },
  ];
  return (
    <aside className="w-60 shrink-0 border-r border-white/[0.06] flex flex-col">
      <div className="px-4 py-4 border-b border-white/[0.06]">
        <div className="text-xs uppercase tracking-[0.2em]" style={{ color: '#ff7a2b' }}>
          repull · revenue
        </div>
        <div className="text-sm font-medium mt-1 truncate">{workspaceName}</div>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm',
                active
                  ? 'bg-repull/10 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.04]',
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/[0.06] text-xs muted leading-relaxed">
        <div>
          Powered by{' '}
          <a
            className="underline decoration-dotted hover:text-white"
            href="https://repull.dev"
            target="_blank"
            rel="noopener noreferrer"
          >
            Repull
          </a>
        </div>
        <div className="mt-1">
          Pricing models tuned by{' '}
          <a
            className="underline decoration-dotted hover:text-white"
            href="https://vanio.ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vanio AI
          </a>
        </div>
        <div className="mt-1">
          <a
            className="underline decoration-dotted hover:text-white"
            href="https://github.com/ivannikolovbg/repull-revenue/blob/main/LICENSE.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            Repull Community License
          </a>
        </div>
      </div>
    </aside>
  );
}

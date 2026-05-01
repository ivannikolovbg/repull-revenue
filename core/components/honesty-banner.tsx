'use client';

/**
 * Sticky bottom-right honesty banner.
 *
 * Repull Revenue is alpha — the pricing models are still in active fine-tuning
 * against real customer data. We do NOT pretend to be a finished AirDNA /
 * PriceLabs replacement yet. Manual host overrides always win, and this banner
 * makes that contract explicit on every page.
 *
 * Dismissible per-session via sessionStorage so it doesn't get in the way once
 * the user has acknowledged it during a working session.
 */

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/core/lib/cn';

const STORAGE_KEY = 'repull-revenue:honesty-dismissed';

export function HonestyBanner() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // Private mode, etc. — render anyway.
    }
    setHidden(false);
  }, []);

  if (hidden) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setHidden(true);
  }

  return (
    <div
      className={cn(
        'fixed bottom-3 right-3 z-50 max-w-sm',
        'rounded-lg border border-amber-500/20 bg-amber-500/[0.08] backdrop-blur',
        'px-4 py-3 text-[12px] leading-relaxed text-amber-100 shadow-lg',
      )}
      role="status"
    >
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="absolute top-2 right-2 text-amber-200/70 hover:text-amber-100"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="pr-6">
        <strong className="text-amber-50">Models in active fine-tuning.</strong>{' '}
        Manual override always wins.{' '}
        <a
          href="https://github.com/ivannikolovbg/repull-revenue#benchmarks"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-dotted hover:text-amber-50"
        >
          View benchmarks &rarr;
        </a>
      </div>
    </div>
  );
}

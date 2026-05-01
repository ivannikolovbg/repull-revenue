/**
 * Shared footer rendered on every authenticated page (in `app/(app)/layout.tsx`)
 * and the marketing landing page. Surfaces the upstream brand, the Repull
 * Community License, and a cross-link to the sister channel-manager template.
 */

const LICENSE_URL =
  'https://github.com/ivannikolovbg/repull-revenue/blob/main/LICENSE.md';

const SISTER_REPO = 'https://github.com/ivannikolovbg/repull-channel-manager';

export function AppFooter() {
  return (
    <div className="px-6 py-3 border-t border-white/[0.06] text-[11px] muted flex flex-wrap items-center justify-between gap-2">
      <div>
        Powered by{' '}
        <a
          className="underline decoration-dotted hover:text-white"
          href="https://repull.dev"
          target="_blank"
          rel="noopener noreferrer"
        >
          Repull
        </a>{' '}
        &middot; Pricing intelligence + market data &middot;{' '}
        <a
          className="underline decoration-dotted hover:text-white"
          href={LICENSE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Repull Community License
        </a>
      </div>
      <div className="flex items-center gap-3">
        <a
          className="underline decoration-dotted hover:text-white"
          href={SISTER_REPO}
          target="_blank"
          rel="noopener noreferrer"
        >
          Need a channel manager? See repull-channel-manager &rarr;
        </a>
        <span className="opacity-60">v0.1.0-alpha</span>
      </div>
    </div>
  );
}

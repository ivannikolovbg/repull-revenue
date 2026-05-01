import { Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function StrategyPage() {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-[0.2em]" style={{ color: '#ff7a2b' }}>
          strategy
        </div>
        <h1 className="text-2xl font-semibold mt-1 flex items-center gap-3">
          <Sparkles className="w-6 h-6" /> Strategy
        </h1>
        <p className="muted text-sm mt-2 max-w-2xl">
          Named rule sets &mdash; min/max floors, day-of-week multipliers, lead-time curves, gap-night
          discounts, event boosts.
        </p>
      </div>
      <div className="card p-8 text-center">
        <div className="text-sm">This surface is wired by the <code>strategy</code> agent.</div>
        <p className="muted text-xs mt-2">
          The schema, sidebar, auth, and demo workspace are already in place &mdash; the page body
          will drop in next.
        </p>
      </div>
    </div>
  );
}

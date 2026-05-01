import Link from 'next/link';
import { ArrowRight, LineChart, Map, LayoutGrid, Sparkles } from 'lucide-react';
import { requireSessionWorkspace } from '@/core/lib/session';

export const dynamic = 'force-dynamic';

interface OverviewStat {
  label: string;
  value: string;
  hint: string;
}

export default async function OverviewPage() {
  const ctx = await requireSessionWorkspace();

  // Foundation alpha: real numbers come once sibling agents wire the
  // Markets / Listings / Pricing services. We render placeholders here so
  // the page is fully styled and the sidebar nav has a landing target.
  const stats: OverviewStat[] = [
    { label: 'Markets tracked', value: '—', hint: 'Add a market to start pulling comp data' },
    { label: 'Listings under management', value: '—', hint: 'Sync from Repull on /listings' },
    { label: 'Recommendations pending', value: '—', hint: 'New suggestions land on /pricing' },
    { label: 'Active strategies', value: '—', hint: 'Configure rule sets on /strategy' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.2em]" style={{ color: '#ff7a2b' }}>
          overview
        </div>
        <h1 className="text-2xl font-semibold mt-1">Welcome, {ctx.email.split('@')[0]}.</h1>
        <p className="muted text-sm mt-2 max-w-2xl">
          Repull Revenue is a fork-and-deploy revenue manager. Track the markets you operate in,
          push your listings through the pricing engine, and turn the strategy knobs that fit your
          portfolio. This overview will fill in once you connect data.
        </p>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-xs uppercase tracking-wide muted">{s.label}</div>
            <div className="text-3xl font-semibold mt-2">{s.value}</div>
            <div className="text-[11px] muted mt-2">{s.hint}</div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NextStep
          href="/markets"
          Icon={Map}
          title="Define a market"
          body="Pick a city or bounding box. We pull comp occupancy, ADR, and pace from Repull's market index."
        />
        <NextStep
          href="/listings"
          Icon={LayoutGrid}
          title="Sync listings"
          body="Connect your Airbnb / Booking listings via Repull. Each listing anchors to a market for benchmarking."
        />
        <NextStep
          href="/pricing"
          Icon={LineChart}
          title="Generate recommendations"
          body="The engine produces per-night price suggestions with a confidence score and a one-line reason."
        />
        <NextStep
          href="/strategy"
          Icon={Sparkles}
          title="Configure a strategy"
          body="Encode min/max floors, day-of-week multipliers, lead-time curves, and event boosts."
        />
      </section>
    </div>
  );
}

function NextStep({
  href,
  Icon,
  title,
  body,
}: {
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="card p-5 group hover:border-white/[0.16] transition-colors block"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-md p-2 bg-repull/10 text-repull">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            {title}
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="muted text-xs mt-1.5 leading-relaxed">{body}</p>
        </div>
      </div>
    </Link>
  );
}

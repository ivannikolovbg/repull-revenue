import Link from 'next/link';
import { LineChart, Map, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen px-6 py-12 md:py-20 max-w-5xl mx-auto">
      <div className="text-xs uppercase tracking-[0.2em]" style={{ color: '#ff7a2b' }}>
        repull · revenue starter
      </div>
      <h1 className="text-4xl md:text-6xl font-semibold mt-3 leading-tight">
        Open-source revenue management.
        <br />
        <span className="muted font-normal">PriceLabs + AirDNA in one fork.</span>
      </h1>
      <p className="muted mt-6 max-w-2xl text-lg">
        A forkable, self-hostable revenue manager for short-term rentals. Pricing intelligence and
        market data, in the same repo, on top of <code>@repull/sdk</code>. Clone, deploy to
        Vercel, point at your channels &mdash; you control the model, the rules, and the data.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link href="/sign-in" className="btn btn-primary">
          Try the live demo
        </Link>
        <a
          href="https://github.com/ivannikolovbg/repull-revenue"
          className="btn btn-ghost"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on GitHub
        </a>
        <a
          href="https://vercel.com/new/clone?repository-url=https://github.com/ivannikolovbg/repull-revenue"
          className="btn btn-ghost"
          target="_blank"
          rel="noopener noreferrer"
        >
          Deploy to Vercel
        </a>
      </div>
      <p className="muted text-xs mt-3">
        The demo loads a pre-seeded workspace. One click, no email required.
      </p>

      <section className="mt-16 grid md:grid-cols-3 gap-4">
        <Tile
          Icon={Map}
          title="Markets"
          body="Track occupancy, ADR, RevPAR, and pace for the cities you operate in. Comp sets sourced from Repull's market index."
        />
        <Tile
          Icon={LineChart}
          title="Pricing"
          body="Per-night recommendations with a confidence score and a one-line reason. Manual override always wins. Push back to channels in one click."
        />
        <Tile
          Icon={Sparkles}
          title="Strategy"
          body="Encode floors, ceilings, day-of-week multipliers, lead-time curves, gap-night discounts, and event boosts."
        />
      </section>

      <section className="mt-16 card p-6">
        <div className="text-xs uppercase tracking-wide muted">Quick start</div>
        <pre className="mt-3 text-sm overflow-x-auto p-4 rounded-md bg-black/40 font-mono leading-relaxed">{`git clone https://github.com/ivannikolovbg/repull-revenue
cd repull-revenue
cp .env.example .env.local
docker compose up -d        # local Postgres on :5433
pnpm install && pnpm db:push
pnpm dev                    # http://localhost:3031`}</pre>
      </section>

      <section className="mt-16 card p-6">
        <div className="text-xs uppercase tracking-wide muted">License</div>
        <h3 className="text-lg font-semibold mt-2">Repull Community License</h3>
        <p className="muted text-sm mt-3 leading-relaxed">
          Free for personal use, research, evaluation, and operating against your own listings up
          to <strong className="text-white/90">100 active listings</strong> under management.
          Commercial license required if you operate a service against third-party listings AND
          either cross 100 listings or $1M ARR derived from this template. Llama-style threshold
          &mdash; the template is free, the upstream API is what costs us money to keep alive.
        </p>
        <div className="mt-4 flex gap-3">
          <a
            href="https://github.com/ivannikolovbg/repull-revenue/blob/main/LICENSE.md"
            className="btn btn-ghost text-xs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Full license
          </a>
          <a
            href="mailto:hello@repull.dev?subject=Repull%20Revenue%20Commercial%20License"
            className="btn btn-ghost text-xs"
          >
            Commercial inquiries
          </a>
        </div>
      </section>

      <section className="mt-16 card p-6 border-repull/30 bg-repull/[0.04]">
        <div className="text-xs uppercase tracking-wide muted">Sister project</div>
        <h3 className="text-lg font-semibold mt-2">Need a channel manager too?</h3>
        <p className="muted text-sm mt-3 leading-relaxed">
          Pair this with <code>repull-channel-manager</code> for the full stack: connect Airbnb /
          Booking / VRBO, sync calendars and reservations, then layer revenue management on top.
          Same license, same SDK, designed to be deployed side-by-side.
        </p>
        <div className="mt-4">
          <a
            href="https://github.com/ivannikolovbg/repull-channel-manager"
            className="btn btn-primary text-xs"
            target="_blank"
            rel="noopener noreferrer"
          >
            See repull-channel-manager &rarr;
          </a>
        </div>
      </section>

      <footer className="mt-20 pt-6 border-t border-white/[0.06] text-xs muted">
        Powered by{' '}
        <a
          className="underline decoration-dotted hover:text-white"
          href="https://repull.dev"
          target="_blank"
          rel="noopener noreferrer"
        >
          Repull
        </a>{' '}
        &middot; Pricing models tuned by{' '}
        <a
          className="underline decoration-dotted hover:text-white"
          href="https://vanio.ai"
          target="_blank"
          rel="noopener noreferrer"
        >
          Vanio AI
        </a>{' '}
        &middot;{' '}
        <a
          className="underline decoration-dotted hover:text-white"
          href="https://github.com/ivannikolovbg/repull-revenue/blob/main/LICENSE.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          Repull Community License
        </a>
      </footer>
    </main>
  );
}

function Tile({
  Icon,
  title,
  body,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-repull" />
        <div className="text-sm font-medium">{title}</div>
      </div>
      <p className="muted text-sm mt-2">{body}</p>
    </div>
  );
}

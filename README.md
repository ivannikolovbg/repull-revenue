# Repull Revenue

> **Status:** v0.1.0-alpha — early preview. Forkable starter, not a hosted product.

**Open-source revenue management** for short-term rentals. Pricing intelligence + market data in one fork-and-deploy template, on top of [`@repull/sdk`](https://github.com/ivannikolovbg/repull-sdk) and [api.repull.dev](https://api.repull.dev).

Pricing engine and market intelligence in one repo, that you own.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ivannikolovbg/repull-revenue&env=DATABASE_URL,AUTH_SECRET,AUTH_URL,REPULL_API_BASE_URL&envDescription=Postgres%20connection%20string%2C%20NextAuth%20secret%2C%20your%20app%20URL%2C%20Repull%20API%20base&envLink=https%3A%2F%2Fgithub.com%2Fivannikolovbg%2Frepull-revenue%23env-vars)

---

## Why this exists

Every short-term rental operator past five listings ends up paying for two separate products: a pricing tool and a market intelligence product. They are expensive, opinionated, and you don't control the model or the data.

**Repull Revenue gives you both, as code, in one Next.js app you fork and deploy.** The pricing engine is yours to tune. The market data lands in your own Postgres. Manual override always wins. No vendor lock-in, no per-listing pricing tax.

## What you get

- **Markets** — geographic comp sets with daily occupancy, ADR, RevPAR, median price, and 7-day pace
- **Listings** — your own properties synced via Repull, anchored to a market for benchmarking
- **Pricing** — per-night recommendations with a confidence score and a one-line reason. Push back to channels in one click
- **Strategy** — named rule sets for floors/ceilings, day-of-week multipliers, lead-time curves, gap-night discounts, event boosts
- **Multi-tenant workspaces** (one per signed-in user, model already supports multi-seat invites)
- **Email magic-link auth** (NextAuth v5, no third-party account required to start)
- **AES-256-GCM encryption** for per-workspace Repull API keys at rest
- **Drizzle ORM** schema with migrations checked in
- **Tailwind + Lucide** UI — dark, no UI framework lock-in, easy to fork

## Pair it with the channel manager

Need OAuth + reservations + calendar sync too? [`repull-channel-manager`](https://github.com/ivannikolovbg/repull-channel-manager) is the sister template — same SDK, same license, designed to be deployed side-by-side. Channel manager handles the connection, Repull Revenue handles the prices.

## Quick start

```bash
git clone https://github.com/ivannikolovbg/repull-revenue
cd repull-revenue
cp .env.example .env.local              # then edit
docker compose up -d                    # local Postgres on :5433
pnpm install
pnpm db:push                            # apply schema
pnpm seed                               # seed demo workspace
pnpm dev                                # http://localhost:3031
```

Sign in (the magic link is printed to the server console in dev), open `/settings`, paste your Repull API key, then go to `/markets` to start tracking comps.

## Architecture

```
+------------------------------------------------------------------+
|                     Browser / Next.js UI                          |
|   /dashboard  /markets  /listings  /pricing  /strategy  /settings |
+------------------------------------------------------------------+
                         |           |
                         v           v
              NextAuth session  ------>  app routes (per-workspace)
                         |
                         v
+------------------------------------------------------------------+
|                       Postgres (Drizzle)                          |
|  workspaces -+-> markets -+-> market_metrics                      |
|              +-> listings -+-> recommendations <-+-- pricing_runs |
|              +-> strategies                                       |
+------------------------------------------------------------------+
                         ^                          ^
                         |                          |
                  full / incremental         signed webhook
                       sync                   POST /api/webhooks/repull
                         |                          |
                         v                          v
                   @repull/sdk  ------->  api.repull.dev
                         |                          |
                         +-> /v1/markets <----------+
                         +-> /v1/properties <-------+
                         +-> /v1/pricing <----------+
```

## Stack

| Layer        | Choice                | Why |
|--------------|-----------------------|-----|
| Framework    | Next.js 16 (Turbopack) | Vercel-native, App Router, server actions |
| ORM          | Drizzle ORM           | Type-safe, no codegen step, plays with Vercel/Neon/Supabase |
| DB           | Postgres              | Vercel Postgres, Neon, Supabase, or any plain PG |
| Auth         | NextAuth v5 (email)   | Free, no external service required to start |
| API client   | `@repull/sdk`         | One SDK, one auth header, every channel |
| UI           | Tailwind + Lucide     | Easy to fork; swap for shadcn-ui in 10 min |
| Cron         | Vercel Cron           | Native, zero infra |

## Env vars

See [`.env.example`](./.env.example) for the full list. Minimum to run:

| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL`            | yes  | Any Postgres URL. Vercel Postgres / Neon / Supabase / docker. |
| `AUTH_SECRET`             | yes  | `openssl rand -base64 32` |
| `AUTH_URL`                | yes  | Your public URL. `http://localhost:3031` in dev. |
| `REPULL_API_BASE_URL`     | no   | Defaults to `https://api.repull.dev`. |
| `EMAIL_SERVER` + `EMAIL_FROM` | no | If unset, magic links print to the server console. |
| `CRON_SECRET`             | no   | If set, scheduled pricing runs require `Authorization: Bearer ${CRON_SECRET}`. |
| `ENCRYPTION_KEY`          | no   | 32-byte base64. If set, workspace API keys are encrypted at rest. |
| `DEMO_REPULL_API_KEY`     | no   | Real Repull key applied to the seeded `demo@repull.dev` workspace on every demo signin. |
| `DEMO_SIGNIN`             | no   | Set to `off` to disable the one-click demo button on `/sign-in`. |

## DB schema

Tables (all FK-linked back to `workspaces.id` with `ON DELETE CASCADE`):

- `users`, `accounts`, `sessions`, `verification_tokens` — NextAuth
- `workspaces`, `workspace_members` — multi-tenant root
- `markets` — geographic comp sets you operate in
- `market_metrics` — daily KPIs per market (occupancy, ADR, RevPAR, pace)
- `listings` — your own properties under management
- `strategies` — named pricing rule sets
- `pricing_runs` — every batch of recommendations the engine produced
- `recommendations` — per-listing-per-night price suggestions with status

## Roadmap

**v0.1 (this release)** — auth, multi-tenant, schema, sidebar, demo signin, marketing landing, license. Foundation only — sibling agents fill the markets / listings / pricing / strategy surfaces.

**v0.2 (planned)** — full Markets surface with Atlas-backed comp data, Listings sync via `@repull/sdk`, Pricing recommendations table, Strategy rule editor.

**v0.3+** — multi-listing bulk operations, public iCal calendar export, Stripe-Connect billing hook point, optional ML pricing model trained on per-workspace booking history.

## Benchmarks

Coming soon. The current pricing models are in active fine-tuning against real customer data (the in-app honesty banner says so on every page, and we mean it). When the public benchmarks land they will live at `https://github.com/ivannikolovbg/repull-revenue#benchmarks` and will report RevPAR uplift on a fixed reference portfolio.

## Contributing

Issues and PRs welcome. Please:

1. Open an issue first for non-trivial changes so we can talk shape.
2. Run `pnpm typecheck` before opening a PR.
3. Sign your commits if you can.

## Limitations / honest disclosures

- **Single workspace per user** for v1. Multi-workspace switching is a Phase 2 polish — the data model already supports `workspace_members`, but the UI doesn't expose a switcher yet.
- **Pricing models are in active fine-tuning.** The honesty banner in the bottom-right of every page exists because we mean it. Manual override always wins, and the engine surfaces a confidence score on every recommendation so you can ignore low-confidence noise.
- **Foundation alpha**: Markets / Listings / Pricing / Strategy surfaces are scaffolded as placeholders in this initial commit. Sibling-agent PRs fill them in. The schema, auth, multi-tenancy, and demo flow are production-shaped and stable.
- **API surface, schema, and routes may break before v1.0.** Pin a commit if you ship a fork.

## License

This template is **NOT** MIT-licensed. See [`LICENSE.md`](./LICENSE.md).

Free for personal use, research, evaluation, and operating against your own listings up to **100 active listings under management**. Commercial license required if you operate a service against third-party listings AND exceed 100 listings or $1M ARR derived. See [`COMMERCIAL.md`](./COMMERCIAL.md) for the plain-English summary.

Inquiries: `hello@repull.dev`.

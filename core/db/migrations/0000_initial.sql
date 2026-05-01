-- Repull Revenue — initial schema (foundation alpha).
-- Mirrors `core/db/schema.ts`. Run `pnpm db:generate` to refresh once the
-- schema diverges, or `pnpm db:push` to sync directly without a migration.

-- ============================================================================
-- Auth tables (NextAuth / @auth/drizzle-adapter shape)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  "name" text,
  "email" text NOT NULL UNIQUE,
  "email_verified" timestamp,
  "image" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "accounts" (
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "provider" text NOT NULL,
  "provider_account_id" text NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text,
  PRIMARY KEY ("provider", "provider_account_id")
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "session_token" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "identifier" text NOT NULL,
  "token" text NOT NULL,
  "expires" timestamp NOT NULL,
  PRIMARY KEY ("identifier", "token")
);

-- ============================================================================
-- Workspaces — the multi-tenant root
-- ============================================================================

CREATE TABLE IF NOT EXISTS "workspaces" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "owner_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "repull_api_key" text,
  "repull_api_key_encrypted" boolean NOT NULL DEFAULT false,
  "base_currency" varchar(8) NOT NULL DEFAULT 'USD',
  "auto_apply_pricing" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "workspace_members" (
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" varchar(32) NOT NULL DEFAULT 'owner',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("workspace_id", "user_id")
);

-- ============================================================================
-- Markets + market_metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS "markets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "country" varchar(2) NOT NULL,
  "region" text,
  "city" text,
  "bbox" jsonb,
  "comps_count" integer NOT NULL DEFAULT 0,
  "last_synced_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "markets_ws_slug_uq"
  ON "markets" ("workspace_id", "name");

CREATE TABLE IF NOT EXISTS "market_metrics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "market_id" uuid NOT NULL REFERENCES "markets"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "occupancy" numeric(5, 4),
  "adr" numeric(12, 2),
  "revpar" numeric(12, 2),
  "median_price" numeric(12, 2),
  "pace_7d" integer,
  "raw" jsonb,
  "synced_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "market_metrics_market_date_uq"
  ON "market_metrics" ("market_id", "date");

-- ============================================================================
-- Listings
-- ============================================================================

CREATE TABLE IF NOT EXISTS "listings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "market_id" uuid REFERENCES "markets"("id") ON DELETE SET NULL,
  "repull_property_id" text NOT NULL,
  "external_listing_id" text,
  "name" text,
  "address" text,
  "city" text,
  "country" text,
  "photos" jsonb,
  "max_guests" integer,
  "bedrooms" integer,
  "bathrooms" numeric(4, 1),
  "currency" varchar(8),
  "timezone" varchar(64),
  "strategy_id" uuid,
  "min_price" numeric(12, 2),
  "max_price" numeric(12, 2),
  "raw" jsonb,
  "synced_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "listings_ws_repull_uq"
  ON "listings" ("workspace_id", "repull_property_id");

-- ============================================================================
-- Strategies
-- ============================================================================

CREATE TABLE IF NOT EXISTS "strategies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "enabled" boolean NOT NULL DEFAULT true,
  "rules" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "strategies_ws_name_uq"
  ON "strategies" ("workspace_id", "name");

-- Add the FK from listings.strategy_id now that strategies exists.
ALTER TABLE "listings"
  DROP CONSTRAINT IF EXISTS "listings_strategy_id_fk";
ALTER TABLE "listings"
  ADD CONSTRAINT "listings_strategy_id_fk"
  FOREIGN KEY ("strategy_id") REFERENCES "strategies"("id") ON DELETE SET NULL;

-- ============================================================================
-- Pricing — runs + recommendations
-- ============================================================================

CREATE TABLE IF NOT EXISTS "pricing_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "trigger" varchar(16) NOT NULL,
  "started_at" timestamptz NOT NULL DEFAULT now(),
  "finished_at" timestamptz,
  "status" varchar(16) NOT NULL DEFAULT 'running',
  "stats" jsonb,
  "error" text
);

CREATE TABLE IF NOT EXISTS "recommendations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "listing_id" uuid NOT NULL REFERENCES "listings"("id") ON DELETE CASCADE,
  "run_id" uuid REFERENCES "pricing_runs"("id") ON DELETE SET NULL,
  "date" date NOT NULL,
  "base_price" numeric(12, 2),
  "recommended_price" numeric(12, 2) NOT NULL,
  "confidence" numeric(4, 3),
  "reason" text,
  "status" varchar(16) NOT NULL DEFAULT 'pending',
  "decided_at" timestamptz,
  "applied_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "recommendations_listing_date_run_uq"
  ON "recommendations" ("listing_id", "date", "run_id");

/**
 * Drizzle schema for repull-revenue.
 *
 * Multi-tenant by `workspaceId`. Every domain table FKs to `workspaces.id`
 * with ON DELETE CASCADE so deleting a workspace cleanly tears down all data.
 *
 * Auth tables (users / accounts / sessions / verification_tokens) follow
 * the @auth/drizzle-adapter conventions so NextAuth wires up out-of-the-box.
 *
 * Domain tables cover the revenue-management use case:
 *   - markets          — geographic comp sets (e.g. "Fernie BC", "Whistler")
 *   - market_metrics   — daily KPIs per market (occupancy, ADR, RevPAR, …)
 *   - listings         — your own properties under management
 *   - pricing_runs     — every batch of recommendations the engine produced
 *   - recommendations  — per-listing-per-night price suggestions
 *   - strategies       — named pricing strategies / rule sets
 */

import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// ============================================================================
// Auth tables (NextAuth / @auth/drizzle-adapter shape)
// ============================================================================

export const users = pgTable('users', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()::text`),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  'accounts',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
  }),
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.identifier, t.token] }),
  }),
);

// ============================================================================
// Workspaces — the multi-tenant root
// ============================================================================

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  ownerUserId: text('owner_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** Encrypted Repull API key (AES-GCM). May be plaintext in dev when ENCRYPTION_KEY is unset. */
  repullApiKey: text('repull_api_key'),
  /** Whether the stored key is encrypted (GCM ciphertext) or plaintext. */
  repullApiKeyEncrypted: boolean('repull_api_key_encrypted').notNull().default(false),
  /** Default currency for revenue figures shown in the UI. */
  baseCurrency: varchar('base_currency', { length: 8 }).notNull().default('USD'),
  /**
   * When true, generated recommendations are auto-applied (i.e. pushed back
   * via Repull) once approved by a strategy. When false, they stay as
   * suggestions until a human accepts them.
   */
  autoApplyPricing: boolean('auto_apply_pricing').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Workspace membership — for v1 only the owner is a member, but the table
 * exists so multi-seat invites are an additive change later.
 */
export const workspaceMembers = pgTable(
  'workspace_members',
  {
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 32 }).notNull().default('owner'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.workspaceId, t.userId] }),
  }),
);

// ============================================================================
// Markets — geographic comp sets the revenue engine pulls metrics for
// ============================================================================

export const markets = pgTable(
  'markets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** ISO 3166-1 alpha-2 country code. */
    country: varchar('country', { length: 2 }).notNull(),
    /** State / province / region — free-form. */
    region: text('region'),
    city: text('city'),
    /** Optional bounding box for finer-grained comp scopes. */
    bbox: jsonb('bbox').$type<{ north: number; south: number; east: number; west: number }>(),
    /** Total number of comparable listings tracked in this market. */
    compsCount: integer('comps_count').notNull().default(0),
    /** Last time market metrics were refreshed from upstream. */
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uq: uniqueIndex('markets_ws_slug_uq').on(t.workspaceId, t.name),
  }),
);

/**
 * Daily KPI snapshot for a market. One row per (market, date).
 * Sourced from Atlas comp aggregations; written by the sync job.
 */
export const marketMetrics = pgTable(
  'market_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    marketId: uuid('market_id')
      .notNull()
      .references(() => markets.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    /** 0..1 — share of comps booked on this date. */
    occupancy: numeric('occupancy', { precision: 5, scale: 4 }),
    /** Average daily rate across booked comps (workspace base currency). */
    adr: numeric('adr', { precision: 12, scale: 2 }),
    /** Revenue per available room — `occupancy * adr`. */
    revpar: numeric('revpar', { precision: 12, scale: 2 }),
    /** Median comp nightly price (booked + available). */
    medianPrice: numeric('median_price', { precision: 12, scale: 2 }),
    /** Pace metric — bookings made in the last 7 days for stays on this date. */
    pace7d: integer('pace_7d'),
    /** Raw metric blob for forward-compat / extra dimensions. */
    raw: jsonb('raw').$type<Record<string, unknown>>(),
    syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uq: uniqueIndex('market_metrics_market_date_uq').on(t.marketId, t.date),
  }),
);

// ============================================================================
// Listings — the user's own properties (synced via Repull)
// ============================================================================

export const listings = pgTable(
  'listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    /** The market this listing belongs to (used to anchor recommendations). */
    marketId: uuid('market_id').references(() => markets.id, { onDelete: 'set null' }),
    /** Repull-side property id — primary external identifier. */
    repullPropertyId: text('repull_property_id').notNull(),
    /** Channel listing id (Airbnb listing id, Booking property id, etc.). */
    externalListingId: text('external_listing_id'),
    name: text('name'),
    address: text('address'),
    city: text('city'),
    country: text('country'),
    photos: jsonb('photos').$type<string[]>(),
    maxGuests: integer('max_guests'),
    bedrooms: integer('bedrooms'),
    bathrooms: numeric('bathrooms', { precision: 4, scale: 1 }),
    currency: varchar('currency', { length: 8 }),
    timezone: varchar('timezone', { length: 64 }),
    /** Active strategy id — null means use workspace default behavior. */
    strategyId: uuid('strategy_id'),
    /** Per-listing min nightly price floor — recommendations never go below this. */
    minPrice: numeric('min_price', { precision: 12, scale: 2 }),
    /** Per-listing max nightly price ceiling. */
    maxPrice: numeric('max_price', { precision: 12, scale: 2 }),
    /** Full raw payload from Repull for forward-compat / debugging. */
    raw: jsonb('raw').$type<Record<string, unknown>>(),
    syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uq: uniqueIndex('listings_ws_repull_uq').on(t.workspaceId, t.repullPropertyId),
  }),
);

// ============================================================================
// Strategies — named rule sets (e.g. "Aggressive winter peak", "Conservative shoulder")
// ============================================================================

export const strategies = pgTable(
  'strategies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    /** When false, the strategy is paused and its listings fall back to defaults. */
    enabled: boolean('enabled').notNull().default(true),
    /**
     * Strategy rules — flexible JSON schema so users can encode
     * occupancy-based adjustments, day-of-week multipliers, lead-time curves,
     * event boosts, gap-night discounts, etc.
     */
    rules: jsonb('rules').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uq: uniqueIndex('strategies_ws_name_uq').on(t.workspaceId, t.name),
  }),
);

// ============================================================================
// Pricing — runs + per-night recommendations
// ============================================================================

export const pricingRuns = pgTable('pricing_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  /** 'manual' | 'scheduled' | 'webhook' */
  trigger: varchar('trigger', { length: 16 }).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  /** 'running' | 'success' | 'partial' | 'error' */
  status: varchar('status', { length: 16 }).notNull().default('running'),
  /** Counts: { listings: 50, nights: 4500, applied: 0 } */
  stats: jsonb('stats').$type<Record<string, unknown>>(),
  error: text('error'),
});

export const recommendations = pgTable(
  'recommendations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    runId: uuid('run_id').references(() => pricingRuns.id, { onDelete: 'set null' }),
    date: date('date').notNull(),
    /** Current base price on the channel (snapshot at recommendation time). */
    basePrice: numeric('base_price', { precision: 12, scale: 2 }),
    /** Recommended new nightly price. */
    recommendedPrice: numeric('recommended_price', { precision: 12, scale: 2 }).notNull(),
    /** Confidence score 0..1 emitted by the engine. */
    confidence: numeric('confidence', { precision: 4, scale: 3 }),
    /** Short human-readable rationale (e.g. "occupancy 92%, +18% boost"). */
    reason: text('reason'),
    /** 'pending' | 'accepted' | 'rejected' | 'applied' | 'expired' */
    status: varchar('status', { length: 16 }).notNull().default('pending'),
    /** When status moved out of 'pending'. */
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    /** Optional reference back to a successful Repull push. */
    appliedAt: timestamp('applied_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uq: uniqueIndex('recommendations_listing_date_run_uq').on(t.listingId, t.date, t.runId),
  }),
);

// ============================================================================
// Relations
// ============================================================================

export const workspacesRelations = relations(workspaces, ({ many, one }) => ({
  owner: one(users, { fields: [workspaces.ownerUserId], references: [users.id] }),
  members: many(workspaceMembers),
  markets: many(markets),
  listings: many(listings),
  strategies: many(strategies),
}));

export const marketsRelations = relations(markets, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [markets.workspaceId], references: [workspaces.id] }),
  metrics: many(marketMetrics),
  listings: many(listings),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [listings.workspaceId], references: [workspaces.id] }),
  market: one(markets, { fields: [listings.marketId], references: [markets.id] }),
  strategy: one(strategies, { fields: [listings.strategyId], references: [strategies.id] }),
  recommendations: many(recommendations),
}));

export const strategiesRelations = relations(strategies, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [strategies.workspaceId], references: [workspaces.id] }),
  listings: many(listings),
}));

export const recommendationsRelations = relations(recommendations, ({ one }) => ({
  workspace: one(workspaces, { fields: [recommendations.workspaceId], references: [workspaces.id] }),
  listing: one(listings, { fields: [recommendations.listingId], references: [listings.id] }),
  run: one(pricingRuns, { fields: [recommendations.runId], references: [pricingRuns.id] }),
}));

// ============================================================================
// Convenience type exports
// ============================================================================

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type Market = typeof markets.$inferSelect;
export type NewMarket = typeof markets.$inferInsert;
export type MarketMetric = typeof marketMetrics.$inferSelect;
export type NewMarketMetric = typeof marketMetrics.$inferInsert;
export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
export type Strategy = typeof strategies.$inferSelect;
export type NewStrategy = typeof strategies.$inferInsert;
export type PricingRun = typeof pricingRuns.$inferSelect;
export type NewPricingRun = typeof pricingRuns.$inferInsert;
export type Recommendation = typeof recommendations.$inferSelect;
export type NewRecommendation = typeof recommendations.$inferInsert;

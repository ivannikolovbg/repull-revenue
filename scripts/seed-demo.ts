/**
 * Demo seeder for the public hosted preview at
 * https://repull-revenue.vercel.app.
 *
 *   pnpm tsx scripts/seed-demo.ts
 *
 * Idempotent — safe to re-run. Wipes the demo workspace's domain rows first
 * so the demo always shows a fresh, plausible snapshot.
 *
 * Foundation alpha scope:
 *   - Demo user            demo@repull.dev
 *   - Demo workspace       slug `demo`
 *   - Owner workspace_member row
 *
 * Real market / listing / pricing-run data is seeded by the sibling agents
 * (markets, listings, pricing, strategy). This script only guarantees that
 * `/api/auth/demo-signin` resolves a real user row and that the dashboard
 * renders without 500-ing.
 *
 * SAFETY — DEMO_REPULL_API_KEY:
 *   If you set DEMO_REPULL_API_KEY to enable live API calls from this
 *   workspace, it MUST be customer 1's key (Ivan's own FantasticStay
 *   account). NEVER use a real paying customer's key (e.g. customer 10) —
 *   this preview is publicly accessible.
 */

import { eq } from 'drizzle-orm';
import { db } from '../core/db';
import {
  markets,
  marketMetrics,
  listings,
  pricingRuns,
  recommendations,
  strategies,
  users,
  workspaceMembers,
  workspaces,
} from '../core/db/schema';
import { encryptApiKey } from '../core/lib/crypto';

const DEMO_EMAIL = 'demo@repull.dev';
const DEMO_NAME = 'Demo Host';
const DEMO_SLUG = 'demo';

async function main() {
  console.log('[seed-demo] starting');

  // 1. User
  let user = (await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1))[0];
  if (!user) {
    const inserted = await db
      .insert(users)
      .values({ email: DEMO_EMAIL, name: DEMO_NAME, emailVerified: new Date() })
      .returning();
    user = inserted[0]!;
    console.log(`[seed-demo] created user ${user.id}`);
  } else {
    console.log(`[seed-demo] user ${user.id} already exists`);
  }

  // 2. Workspace
  let ws = (await db.select().from(workspaces).where(eq(workspaces.slug, DEMO_SLUG)).limit(1))[0];
  if (!ws) {
    const inserted = await db
      .insert(workspaces)
      .values({
        name: 'Demo workspace',
        slug: DEMO_SLUG,
        ownerUserId: user.id,
        baseCurrency: 'USD',
        autoApplyPricing: false,
      })
      .returning();
    ws = inserted[0]!;
    console.log(`[seed-demo] created workspace ${ws.id}`);
  } else if (ws.ownerUserId !== user.id) {
    await db.update(workspaces).set({ ownerUserId: user.id }).where(eq(workspaces.id, ws.id));
    console.log(`[seed-demo] re-pointed workspace ${ws.id} owner to ${user.id}`);
  } else {
    console.log(`[seed-demo] workspace ${ws.id} already exists`);
  }

  // 3. Membership
  await db
    .insert(workspaceMembers)
    .values({ workspaceId: ws.id, userId: user.id, role: 'owner' })
    .onConflictDoNothing();

  // 4. Wipe domain rows so re-seeds are idempotent. Sibling agents extend
  //    this section with their own seeded data.
  await db.delete(recommendations).where(eq(recommendations.workspaceId, ws.id));
  await db.delete(pricingRuns).where(eq(pricingRuns.workspaceId, ws.id));
  await db.delete(listings).where(eq(listings.workspaceId, ws.id));
  await db.delete(strategies).where(eq(strategies.workspaceId, ws.id));
  await db.delete(marketMetrics).where(eq(marketMetrics.workspaceId, ws.id));
  await db.delete(markets).where(eq(markets.workspaceId, ws.id));

  // 5. (Optional) apply DEMO_REPULL_API_KEY so live data works on the preview.
  const demoKey = process.env.DEMO_REPULL_API_KEY?.trim();
  if (demoKey) {
    const { value, encrypted } = encryptApiKey(demoKey);
    await db
      .update(workspaces)
      .set({ repullApiKey: value, repullApiKeyEncrypted: encrypted, updatedAt: new Date() })
      .where(eq(workspaces.id, ws.id));
    console.log('[seed-demo] applied DEMO_REPULL_API_KEY to demo workspace');
  } else {
    console.log('[seed-demo] DEMO_REPULL_API_KEY not set — demo will browse without live data');
  }

  console.log('[seed-demo] done');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[seed-demo] failed:', e);
    process.exit(1);
  });

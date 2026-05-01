/**
 * GET /api/markets/browse — server proxy to Repull's
 * `GET /v1/markets/browse` paginated catalog. Accepts the same query string
 * (`q`, `country`, `cursor`, `limit`, `min_listings`, `sort`) and forwards
 * them with the workspace API key attached.
 *
 * Why a proxy: the workspace's Repull API key is encrypted at rest in this
 * app's DB and must never reach the browser. The search-first markets UI
 * calls this route from a client component; auth comes from the NextAuth
 * session.
 *
 * Returns 503 with `{ error: "..." }` if the upstream `/v1/markets/browse`
 * endpoint hasn't been deployed yet (404 from Repull) so the UI can render
 * a graceful "search coming soon" state.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWorkspace } from '@/core/lib/session';
import {
  marketsBrowse,
  RepullFetchError,
} from '@/core/services/repull-fetch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await requireSessionWorkspace();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!ctx.workspace.hasApiKey) {
    return NextResponse.json(
      { error: 'No Repull API key configured for this workspace.' },
      { status: 412 },
    );
  }

  const sp = req.nextUrl.searchParams;
  const limitRaw = sp.get('limit');
  const limit = limitRaw ? Math.min(MAX_LIMIT, Math.max(1, parseInt(limitRaw, 10) || 30)) : 30;
  const minListingsRaw = sp.get('min_listings');
  const minListings = minListingsRaw
    ? Math.max(0, parseInt(minListingsRaw, 10) || 0)
    : undefined;

  try {
    const result = await marketsBrowse(ctx.workspace.id, {
      q: sp.get('q') ?? undefined,
      country: sp.get('country') ?? undefined,
      cursor: sp.get('cursor') ?? undefined,
      limit,
      minListings,
      sort: sp.get('sort') ?? undefined,
    });
    if (result == null) {
      return NextResponse.json(
        {
          error:
            'Browse catalog is not available yet. The Repull API rollout is in progress — check back shortly.',
          code: 'browse_endpoint_unavailable',
        },
        { status: 503 },
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof RepullFetchError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status || 502 },
      );
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

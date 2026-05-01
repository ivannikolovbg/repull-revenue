/**
 * POST /api/listings/pricing/bulk — bulk apply / decline across many listings
 * in one call. Thin proxy to Repull's `POST /v1/listings/pricing/bulk`.
 *
 * Body: { action: 'apply' | 'decline', items: [{ listing_id, dates }] }
 *   - items capped at 500 entries (matches upstream).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWorkspace } from '@/core/lib/session';
import { repullFetch, RepullFetchError } from '@/core/services/repull-fetch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ITEMS = 500;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await requireSessionWorkspace();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { action?: unknown; items?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON' }, { status: 400 });
  }

  const action = body?.action;
  if (action !== 'apply' && action !== 'decline') {
    return NextResponse.json({ error: '`action` must be "apply" or "decline"' }, { status: 400 });
  }
  const items = body?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: '`items` must be a non-empty array' }, { status: 400 });
  }
  if (items.length > MAX_ITEMS) {
    return NextResponse.json(
      { error: `\`items\` cannot exceed ${MAX_ITEMS} entries per request` },
      { status: 422 },
    );
  }
  for (let i = 0; i < items.length; i++) {
    const it = items[i] as { listing_id?: unknown; dates?: unknown };
    const lid = Number(it?.listing_id);
    if (!Number.isFinite(lid) || lid <= 0) {
      return NextResponse.json(
        { error: `items[${i}].listing_id must be a positive number` },
        { status: 400 },
      );
    }
    if (!Array.isArray(it?.dates) || it.dates.length === 0) {
      return NextResponse.json(
        { error: `items[${i}].dates must be a non-empty array of YYYY-MM-DD strings` },
        { status: 400 },
      );
    }
    for (const d of it.dates) {
      if (typeof d !== 'string' || !DATE_RE.test(d)) {
        return NextResponse.json(
          { error: `items[${i}].dates contains an invalid date (expected YYYY-MM-DD)` },
          { status: 400 },
        );
      }
    }
  }

  try {
    const result = await repullFetch<{
      processed: number;
      succeeded: number;
      failed: Array<{ listing_id: number; dates: string[]; error_code: string; error: string }>;
    }>(ctx.workspace.id, 'POST', '/v1/listings/pricing/bulk', {
      body: { action, items },
      timeoutMs: 180_000,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof RepullFetchError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status || 502 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

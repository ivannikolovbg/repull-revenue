/**
 * POST /api/listings/[id]/pricing — apply or decline Atlas pricing
 * recommendations for one or more dates. Thin proxy to Repull's
 * `POST /v1/listings/{id}/pricing` (action endpoint).
 *
 * Auth: NextAuth session → workspace → workspace API key. The browser never
 * sees the Repull API key.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWorkspace } from '@/core/lib/session';
import { repullFetch, RepullFetchError } from '@/core/services/repull-fetch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireSessionWorkspace();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await props.params;
  let body: { dates?: unknown; action?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON' }, { status: 400 });
  }

  const action = body?.action;
  if (action !== 'apply' && action !== 'decline') {
    return NextResponse.json({ error: '`action` must be "apply" or "decline"' }, { status: 400 });
  }
  const dates = body?.dates;
  if (!Array.isArray(dates) || dates.length === 0) {
    return NextResponse.json({ error: '`dates` must be a non-empty array' }, { status: 400 });
  }
  for (const d of dates) {
    if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return NextResponse.json(
        { error: '`dates` entries must be YYYY-MM-DD strings' },
        { status: 400 },
      );
    }
  }

  try {
    const result = await repullFetch<unknown>(
      ctx.workspace.id,
      'POST',
      `/v1/listings/${id}/pricing`,
      { body: { dates, action }, timeoutMs: 90_000 },
    );
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    if (err instanceof RepullFetchError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status || 502 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

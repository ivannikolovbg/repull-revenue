/**
 * GET / PUT /api/listings/[id]/pricing/strategy — read or update the per-listing
 * pricing strategy. Thin proxy to Repull's `/v1/listings/{id}/pricing/strategy`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSessionWorkspace } from '@/core/lib/session';
import { repullFetch, RepullFetchError } from '@/core/services/repull-fetch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireSessionWorkspace();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await props.params;
  try {
    const result = await repullFetch<unknown>(
      ctx.workspace.id,
      'GET',
      `/v1/listings/${id}/pricing/strategy`,
    );
    return NextResponse.json(result ?? {});
  } catch (err) {
    if (err instanceof RepullFetchError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await requireSessionWorkspace();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await props.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body must be an object' }, { status: 400 });
  }
  try {
    const result = await repullFetch<unknown>(
      ctx.workspace.id,
      'PUT',
      `/v1/listings/${id}/pricing/strategy`,
      { body },
    );
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    if (err instanceof RepullFetchError) {
      return NextResponse.json({ error: err.message }, { status: err.status || 502 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

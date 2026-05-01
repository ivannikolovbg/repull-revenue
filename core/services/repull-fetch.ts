/**
 * Workspace-scoped raw fetch against api.repull.dev.
 *
 * The hand-written `@repull/sdk` (v0.1.0-alpha) only ships a subset of the
 * markets/listings/pricing surface — `markets.list()`, `listings.pricing.get`
 * and `listings.pricing.recommendations`/`action` are typed, but the deep-dive
 * routes added at vanio-repull-api (markets/{city}, markets/{city}/calendar,
 * listings, listings/{id}/comps, listings/pricing/bulk,
 * listings/{id}/pricing/history, listings/{id}/pricing/strategy) are not yet
 * exposed.
 *
 * Every call here will be replaced by a typed SDK method after the next
 * `@repull/sdk` regen — this helper exists to unblock UI work.
 *
 * Usage (server-side only — never import from a client component):
 *
 *   const { markets } = await repullFetch<MarketsResponse>(
 *     workspaceId, 'GET', '/v1/markets'
 *   );
 */

import { eq } from 'drizzle-orm';
import { db } from '@/core/db';
import { workspaces } from '@/core/db/schema';
import { decryptApiKey } from '@/core/lib/crypto';

const BASE_URL = process.env.REPULL_API_BASE_URL ?? 'https://api.repull.dev';

export class RepullFetchError extends Error {
  status: number;
  code: string | null;
  constructor(opts: { message: string; status: number; code?: string | null }) {
    super(opts.message);
    this.name = 'RepullFetchError';
    this.status = opts.status;
    this.code = opts.code ?? null;
  }
}

export interface RepullFetchOptions {
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  /** Override default fetch timeout (ms). Default 60s. */
  timeoutMs?: number;
}

async function getWorkspaceApiKey(workspaceId: string): Promise<string> {
  const rows = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  const ws = rows[0];
  if (!ws?.repullApiKey) {
    throw new RepullFetchError({
      status: 401,
      code: 'no_api_key',
      message: 'Workspace has no Repull API key. Configure your Repull API key in Settings.',
    });
  }
  return decryptApiKey(ws.repullApiKey, ws.repullApiKeyEncrypted);
}

export async function repullFetch<T = unknown>(
  workspaceId: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  opts: RepullFetchOptions = {},
): Promise<T> {
  const apiKey = await getWorkspaceApiKey(workspaceId);
  const url = new URL(path.startsWith('/') ? path : `/${path}`, BASE_URL);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 60_000);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: ctrl.signal,
    });
  } catch (err) {
    clearTimeout(t);
    throw new RepullFetchError({
      status: 0,
      code: 'network_error',
      message: `Network error calling Repull: ${(err as Error).message}`,
    });
  }
  clearTimeout(t);

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const errBody = parsed as { error?: { code?: string; message?: string } | string } | null;
    const errObj = typeof errBody?.error === 'object' ? errBody?.error : null;
    throw new RepullFetchError({
      status: res.status,
      code: errObj?.code ?? null,
      message:
        errObj?.message ??
        (typeof errBody?.error === 'string' ? errBody.error : null) ??
        `Repull ${method} ${path} returned ${res.status}`,
    });
  }

  return parsed as T;
}

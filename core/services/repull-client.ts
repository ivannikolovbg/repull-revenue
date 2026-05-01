/**
 * Per-workspace Repull SDK factory.
 *
 * Wraps `@repull/sdk` with the workspace's stored API key (decrypted on read).
 * Use this in any server-side route or pricing job.
 *
 * Note: `@repull/sdk` is currently consumed via dynamic import so a fresh
 * `pnpm install` of this template doesn't fail when the package isn't
 * published yet (foundation alpha). Once the SDK is on npm, switch to a
 * static `import { Repull } from '@repull/sdk'`.
 */

import { eq } from 'drizzle-orm';
import { db } from '@/core/db';
import { workspaces } from '@/core/db/schema';
import { decryptApiKey } from '@/core/lib/crypto';

const BASE_URL = process.env.REPULL_API_BASE_URL ?? 'https://api.repull.dev';

interface RepullCtor {
  new (opts: { apiKey: string; baseUrl: string }): unknown;
}

async function loadRepullSdk(): Promise<RepullCtor | null> {
  // Hide the specifier from the bundler so the build succeeds before the SDK
  // is published. Sibling agents will switch this to a static import.
  const spec = '@repull/' + 'sdk';
  try {
    const mod = (await import(/* webpackIgnore: true */ spec).catch(() => null)) as
      | { Repull?: RepullCtor }
      | null;
    return mod?.Repull ?? null;
  } catch {
    return null;
  }
}

export async function getRepullForWorkspace(workspaceId: string): Promise<unknown> {
  const rows = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const ws = rows[0];
  if (!ws?.repullApiKey) {
    throw new Error(
      `Workspace ${workspaceId} has no Repull API key. Add one in /settings before pulling market data.`,
    );
  }
  const apiKey = decryptApiKey(ws.repullApiKey, ws.repullApiKeyEncrypted);
  const Repull = await loadRepullSdk();
  if (!Repull) {
    throw new Error(
      '@repull/sdk is not installed. Run `pnpm add @repull/sdk` once the package is published.',
    );
  }
  return new Repull({ apiKey, baseUrl: BASE_URL });
}

export async function getRepullWithKey(apiKey: string): Promise<unknown> {
  const Repull = await loadRepullSdk();
  if (!Repull) {
    throw new Error(
      '@repull/sdk is not installed. Run `pnpm add @repull/sdk` once the package is published.',
    );
  }
  return new Repull({ apiKey, baseUrl: BASE_URL });
}

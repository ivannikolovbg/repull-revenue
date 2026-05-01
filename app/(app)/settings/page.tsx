import { Cog } from 'lucide-react';
import { requireSessionWorkspace } from '@/core/lib/session';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const ctx = await requireSessionWorkspace();
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <div className="text-xs uppercase tracking-[0.2em]" style={{ color: '#ff7a2b' }}>
          settings
        </div>
        <h1 className="text-2xl font-semibold mt-1 flex items-center gap-3">
          <Cog className="w-6 h-6" /> Settings
        </h1>
      </div>

      <div className="card p-5">
        <div className="text-sm font-medium">Workspace</div>
        <dl className="mt-3 space-y-2 text-sm">
          <Row label="Name">{ctx.workspace.name}</Row>
          <Row label="Slug">{ctx.workspace.slug}</Row>
          <Row label="Base currency">{ctx.workspace.baseCurrency}</Row>
          <Row label="Auto-apply pricing">
            {ctx.workspace.autoApplyPricing ? 'On' : 'Off (manual approval)'}
          </Row>
        </dl>
      </div>

      <div className="card p-5">
        <div className="text-sm font-medium">Repull API key</div>
        <p className="muted text-xs mt-1">
          Required for live market data and pushing recommended prices back to channels.
          {ctx.workspace.hasApiKey ? ' A key is on file.' : ' No key on file yet.'}
        </p>
        <p className="muted text-xs mt-3">
          Key management UI is wired by the <code>settings</code> sibling agent.
        </p>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="muted text-xs uppercase tracking-wide w-32 shrink-0">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

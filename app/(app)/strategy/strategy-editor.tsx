'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2, Save } from 'lucide-react';
import { cn } from '@/core/lib/cn';

interface ListingRow {
  id: number;
  name: string | null;
  city: string | null;
}

interface Strategy {
  mode?: 'recommend' | 'auto' | string;
  minPrice?: number | null;
  maxPrice?: number | null;
  maxDailyChangePct?: number | null;
  weekendMarkupPct?: number | null;
  dayOfWeekMultipliers?: Record<string, number> | null;
  targetOccupancyPct?: number | null;
  targetMonthlyRevenue?: number | null;
  ownerMinMonthlyPayout?: number | null;
  compPositionTarget?: 'below' | 'match' | 'above' | string | null;
  compAdjustPct?: number | null;
  eventBoostEnabled?: boolean | null;
  eventBoostMaxPct?: number | null;
  [key: string]: unknown;
}

interface Props {
  listings: ListingRow[];
  initialListingId: string | null;
  initial: Strategy | null;
  baseCurrency: string;
  autoApplyPricing: boolean;
  loadError: string | null;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function StrategyEditor({
  listings,
  initialListingId,
  initial,
  baseCurrency,
  autoApplyPricing,
  loadError,
}: Props) {
  const router = useRouter();
  const [listingId, setListingId] = useState<string>(initialListingId ?? '');
  const [strategy, setStrategy] = useState<Strategy>(() => initial ?? defaultStrategy());
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(loadError);
  const [, startTransition] = useTransition();

  function update<K extends keyof Strategy>(k: K, v: Strategy[K]) {
    setStrategy((s) => ({ ...s, [k]: v }));
  }

  function updateDow(idx: number, v: number) {
    setStrategy((s) => ({
      ...s,
      dayOfWeekMultipliers: {
        ...(s.dayOfWeekMultipliers ?? defaultDow()),
        [String(idx)]: v,
      },
    }));
  }

  function changeListing(id: string) {
    setListingId(id);
    setSavedAt(null);
    setError(null);
    const sp = new URLSearchParams();
    if (id) sp.set('listingId', id);
    startTransition(() => {
      router.push(`/strategy${sp.toString() ? `?${sp.toString()}` : ''}`);
    });
  }

  async function save() {
    if (!listingId) {
      setError('Pick a listing first. Workspace-default strategies are coming soon — for now, save against a listing.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/listings/${listingId}/pricing/strategy`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(strategy),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? `${res.status}`);
      setSavedAt(new Date().toLocaleTimeString());
      startTransition(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="muted">Editing</span>
          <select
            className="input max-w-xs"
            value={listingId}
            onChange={(e) => changeListing(e.target.value)}
          >
            <option value="">— Workspace default —</option>
            {listings.map((l) => (
              <option key={l.id} value={String(l.id)}>
                {l.name ?? `Listing #${l.id}`}
                {l.city ? ` (${l.city})` : ''}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex items-center gap-2">
          {savedAt ? <span className="text-[11px] muted">Saved at {savedAt}</span> : null}
          <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save strategy
          </button>
        </div>
      </div>

      {error ? (
        <div className="card p-3 border-red-500/20 bg-red-500/[0.04] text-xs text-red-300 font-mono whitespace-pre-wrap">
          {error}
        </div>
      ) : null}

      {!listingId ? (
        <div className="card p-4 border-amber-500/20 bg-amber-500/[0.04] text-xs text-amber-200">
          You&apos;re editing the workspace default. The Repull strategy endpoint is per-listing today —
          select a listing above to persist these settings. Workspace-level defaults applied
          via{' '}
          <code>autoApplyPricing</code> are toggled in{' '}
          <a className="underline decoration-dotted" href="/settings">Settings</a> (currently{' '}
          <strong>{autoApplyPricing ? 'on' : 'off'}</strong>).
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Mode" hint="Recommend = manual approval; Auto = push without approval">
          <div className="grid grid-cols-2 gap-2">
            {(['recommend', 'auto'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => update('mode', m)}
                className={cn(
                  'btn btn-ghost text-sm',
                  strategy.mode === m ? 'border-repull/60 text-white' : '',
                )}
              >
                {m === 'recommend' ? 'Recommend' : 'Auto-apply'}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Price floor / ceiling" hint={`Hard ${baseCurrency} bounds — recommendations clamp to this range.`}>
          <div className="grid grid-cols-2 gap-3">
            <NumInput
              label={`Min ${baseCurrency}`}
              value={strategy.minPrice ?? null}
              onChange={(v) => update('minPrice', v)}
            />
            <NumInput
              label={`Max ${baseCurrency}`}
              value={strategy.maxPrice ?? null}
              onChange={(v) => update('maxPrice', v)}
            />
          </div>
        </Card>

        <Card title="Day-over-day cap" hint="Limits how much the price can swing between adjacent nights.">
          <NumInput
            label="Max daily change %"
            value={strategy.maxDailyChangePct ?? null}
            onChange={(v) => update('maxDailyChangePct', v)}
          />
        </Card>

        <Card title="Weekend markup" hint="Applied to Friday + Saturday nights only.">
          <NumInput
            label="Weekend markup %"
            value={strategy.weekendMarkupPct ?? null}
            onChange={(v) => update('weekendMarkupPct', v)}
          />
        </Card>

        <Card title="Day-of-week multipliers" hint="1.0 = no change. 0.95 = -5%, 1.10 = +10%.">
          <div className="grid grid-cols-7 gap-2">
            {WEEKDAY_LABELS.map((lbl, i) => (
              <label key={i} className="flex flex-col items-center gap-1 text-[10px] muted">
                {lbl}
                <input
                  type="number"
                  step="0.01"
                  min="0.5"
                  max="2"
                  className="input text-center px-1"
                  value={
                    strategy.dayOfWeekMultipliers?.[String(i)] ??
                    defaultDow()[String(i) as keyof ReturnType<typeof defaultDow>] ??
                    1
                  }
                  onChange={(e) => updateDow(i, Number(e.target.value))}
                />
              </label>
            ))}
          </div>
        </Card>

        <Card title="Targets" hint="Optional — guides the engine toward an occupancy / revenue goal.">
          <div className="grid grid-cols-1 gap-3">
            <NumInput
              label="Target occupancy %"
              value={strategy.targetOccupancyPct ?? null}
              onChange={(v) => update('targetOccupancyPct', v)}
            />
            <NumInput
              label={`Target monthly revenue (${baseCurrency})`}
              value={strategy.targetMonthlyRevenue ?? null}
              onChange={(v) => update('targetMonthlyRevenue', v)}
            />
            <NumInput
              label={`Owner min monthly payout (${baseCurrency})`}
              value={strategy.ownerMinMonthlyPayout ?? null}
              onChange={(v) => update('ownerMinMonthlyPayout', v)}
            />
          </div>
        </Card>

        <Card title="Comp position" hint="Where to sit relative to the comp median.">
          <div className="grid grid-cols-3 gap-2">
            {(['below', 'match', 'above'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => update('compPositionTarget', p)}
                className={cn(
                  'btn btn-ghost text-sm',
                  strategy.compPositionTarget === p ? 'border-repull/60 text-white' : '',
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <NumInput
              label="Extra adjustment vs comp median (%)"
              value={strategy.compAdjustPct ?? null}
              onChange={(v) => update('compAdjustPct', v)}
            />
          </div>
        </Card>

        <Card title="Event boost" hint="Bumps for sport / concert / festival dates Atlas detects.">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!strategy.eventBoostEnabled}
              onChange={(e) => update('eventBoostEnabled', e.target.checked)}
            />
            Enable event boost
          </label>
          <div className="mt-3">
            <NumInput
              label="Max event boost %"
              value={strategy.eventBoostMaxPct ?? null}
              onChange={(v) => update('eventBoostMaxPct', v)}
              disabled={!strategy.eventBoostEnabled}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <div className="text-sm font-medium">{title}</div>
      {hint ? <div className="text-[11px] muted mt-0.5">{hint}</div> : null}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function NumInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide muted">{label}</span>
      <input
        type="number"
        className="input"
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value === '' ? null : Number(e.target.value);
          onChange(v != null && Number.isNaN(v) ? null : v);
        }}
      />
    </label>
  );
}

function defaultDow() {
  return { '0': 1, '1': 1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1 } as const;
}

function defaultStrategy(): Strategy {
  return {
    mode: 'recommend',
    minPrice: null,
    maxPrice: null,
    maxDailyChangePct: 15,
    weekendMarkupPct: null,
    dayOfWeekMultipliers: { '0': 1, '1': 1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1 },
    targetOccupancyPct: null,
    targetMonthlyRevenue: null,
    ownerMinMonthlyPayout: null,
    compPositionTarget: 'match',
    compAdjustPct: null,
    eventBoostEnabled: false,
    eventBoostMaxPct: null,
  };
}

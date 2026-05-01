'use client';

import { useMemo } from 'react';
import { cn } from '@/core/lib/cn';

interface Props {
  priceDistribution: Array<{ bucket: string; count: number }> | null;
  bedroomBreakdown: Array<{ bedrooms: number; count: number }> | null;
  propertyTypeMix: Array<{ type: string; count: number }> | null;
  baseCurrency: string;
}

export function DistributionCharts({
  priceDistribution,
  bedroomBreakdown,
  propertyTypeMix,
  baseCurrency,
}: Props) {
  if (!priceDistribution?.length && !bedroomBreakdown?.length && !propertyTypeMix?.length) {
    return null;
  }
  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {priceDistribution?.length ? (
        <BarCard
          title={`Price distribution (${baseCurrency})`}
          data={priceDistribution.map((p) => ({ label: p.bucket, value: p.count }))}
        />
      ) : null}
      {bedroomBreakdown?.length ? (
        <BarCard
          title="Bedrooms"
          data={bedroomBreakdown.map((b) => ({
            label: `${b.bedrooms} BR`,
            value: b.count,
          }))}
        />
      ) : null}
      {propertyTypeMix?.length ? (
        <BarCard
          title="Property type"
          data={propertyTypeMix.slice(0, 8).map((p) => ({ label: p.type, value: p.count }))}
          orientation="row"
        />
      ) : null}
    </section>
  );
}

function BarCard({
  title,
  data,
  orientation = 'col',
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  orientation?: 'col' | 'row';
}) {
  const max = useMemo(() => Math.max(1, ...data.map((d) => d.value)), [data]);
  return (
    <div className="card p-4">
      <div className="text-sm font-medium mb-3">{title}</div>
      {orientation === 'col' ? (
        <div className="flex items-end gap-1 h-32">
          {data.map((d) => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div
                className="w-full bg-repull/40 rounded-t"
                style={{ height: `${Math.round((d.value / max) * 100)}%` }}
                title={`${d.label}: ${d.value}`}
              />
              <div className="text-[10px] muted truncate w-full text-center">{d.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {data.map((d) => (
            <div key={d.label} className="flex items-center gap-2 text-xs">
              <div className="w-24 truncate muted">{d.label}</div>
              <div className="flex-1 bg-white/[0.04] h-2 rounded overflow-hidden">
                <div
                  className={cn('h-full bg-repull/50 rounded')}
                  style={{ width: `${Math.round((d.value / max) * 100)}%` }}
                />
              </div>
              <div className="w-10 text-right">{d.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

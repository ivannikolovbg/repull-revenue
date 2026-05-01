'use client';

import { Calendar, Music, Trophy } from 'lucide-react';
import { cn } from '@/core/lib/cn';

interface Event {
  title: string;
  category: string | null;
  rank: number | null;
  attendance: number | null;
  startDate?: string | null;
  endDate?: string | null;
}

export function MarketEvents({ events }: { events: Event[] }) {
  return (
    <section>
      <h2 className="text-sm font-medium mb-2">Upcoming market events</h2>
      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          {events.map((e, i) => {
            const tone = pickTone(e.rank);
            const Icon = pickIcon(e.category);
            return (
              <div
                key={`${e.title}-${i}`}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs',
                  tone === 'high'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : tone === 'med'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : 'bg-white/[0.04] border-white/[0.1] text-white/70',
                )}
                title={[e.startDate, e.endDate].filter(Boolean).join(' – ')}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="font-medium">{e.title}</span>
                {e.attendance ? (
                  <span className="opacity-70">· {e.attendance.toLocaleString()}</span>
                ) : null}
                {e.startDate ? (
                  <span className="opacity-60">· {e.startDate.slice(5)}</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function pickTone(rank: number | null): 'high' | 'med' | 'low' {
  if (rank == null) return 'low';
  if (rank >= 80) return 'high';
  if (rank >= 50) return 'med';
  return 'low';
}

function pickIcon(category: string | null) {
  const c = (category ?? '').toLowerCase();
  if (c.includes('sport')) return Trophy;
  if (c.includes('music') || c.includes('concert') || c.includes('festival')) return Music;
  return Calendar;
}

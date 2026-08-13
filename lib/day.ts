// Calendar days in Maldives time (UTC+5), as YYYY-MM-DD.
//
// The server runs on UTC. A UTC day rolls over at 5am in Malé, so "today" in a
// UTC-keyed chart would mix the tail of last night's traffic into this morning
// and cut the evening peak — the busiest hours — off the wrong end. The newsroom
// reads these numbers against their own working day, so that is the day used.
//
// Fixed offset, no DST: the Maldives has never observed it.
const MV_OFFSET_MINUTES = 5 * 60;

export function maldivesDay(at: Date = new Date()): string {
  const shifted = new Date(at.getTime() + MV_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** The last `n` days ending today, oldest first — including days with no rows. */
export function recentDays(n: number, at: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(maldivesDay(new Date(at.getTime() - i * 86_400_000)));
  }
  return out;
}

/** Every day from `from` to `to` inclusive, oldest first. */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  for (let t = start; t <= end; t += 86_400_000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

const shift = (day: string, by: number) =>
  new Date(new Date(`${day}T00:00:00Z`).getTime() + by * 86_400_000).toISOString().slice(0, 10);

export type RangeKey =
  | 'today' | 'yesterday' | 'last7' | 'last28' | 'last30' | 'thisMonth' | 'lastMonth';

export const RANGE_LABELS: Record<RangeKey, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  last7: 'Last 7 days',
  last28: 'Last 28 days',
  last30: 'Last 30 days',
  thisMonth: 'This month',
  lastMonth: 'Last month',
};

/**
 * Resolve a named range to concrete days, in Maldives time.
 *
 * The multi-day ranges END YESTERDAY rather than today, matching Analytics:
 * including a part-finished day drags every average down and makes each morning
 * look like a collapse in traffic.
 */
export function resolveRange(key: RangeKey, at: Date = new Date()): { from: string; to: string } {
  const today = maldivesDay(at);
  const yesterday = shift(today, -1);
  switch (key) {
    case 'today': return { from: today, to: today };
    case 'yesterday': return { from: yesterday, to: yesterday };
    case 'last7': return { from: shift(yesterday, -6), to: yesterday };
    case 'last28': return { from: shift(yesterday, -27), to: yesterday };
    case 'last30': return { from: shift(yesterday, -29), to: yesterday };
    case 'thisMonth': return { from: `${today.slice(0, 7)}-01`, to: today };
    case 'lastMonth': {
      const firstOfThis = `${today.slice(0, 7)}-01`;
      const lastOfPrev = shift(firstOfThis, -1);
      return { from: `${lastOfPrev.slice(0, 7)}-01`, to: lastOfPrev };
    }
  }
}

/** A YYYY-MM-DD string, or null. Used to validate custom ranges from the URL. */
export function asDay(raw: unknown): string | null {
  const s = String(raw ?? '');
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

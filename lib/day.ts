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

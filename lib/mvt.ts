// Interpret a datetime-local string (no timezone — entered by an admin who is in
// the Maldives) as Maldives time (UTC+5, no DST) and return a UTC Date for
// storage. Returns null for empty/invalid input.
export function mvtLocalToDate(v?: string | null): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  // "YYYY-MM-DDTHH:mm" -> add seconds if absent, then pin the offset to +05:00.
  const withSecs = /T\d{2}:\d{2}$/.test(s) ? `${s}:00` : s;
  const d = new Date(`${withSecs}+05:00`);
  return isNaN(d.getTime()) ? null : d;
}

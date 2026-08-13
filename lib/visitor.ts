import crypto from 'node:crypto';
import { clientIp } from '@/lib/rate-limit';

// A stable, one-way id for a reader — enough to count people rather than page
// loads, and not enough to identify anyone.
//
// sha256 over a server-side salt + address + user agent. It cannot be reversed
// to an IP, it is never shown anywhere, and no cookie is set — so nothing
// follows a reader between sites and there is nothing to ask consent for.
//
// The salt matters: without it, an IP could be confirmed by hashing a guess and
// comparing. NEXTAUTH_SECRET is reused because it already exists and is already
// secret; a dedicated value would be no stronger. If it is ever rotated, every
// visitor simply looks new for a day — the counts move, nothing breaks.
//
// Known imprecision, accepted deliberately: a phone whose address changes counts
// twice, and an office behind one address counts once. This measures a trend,
// not a headcount, and the dashboard says so.
const SALT = process.env.NEXTAUTH_SECRET || 'xeetimes-visitor-salt';

export function visitorId(request: Request): string {
  const ua = request.headers.get('user-agent') || '';
  return crypto.createHash('sha256').update(`${SALT}|${clientIp(request)}|${ua}`).digest('hex').slice(0, 32);
}

/**
 * Two-letter country, from Cloudflare's edge.
 *
 * 'XX' is what Cloudflare sends for addresses it cannot place, and 'T1' for Tor
 * — both stored as unknown rather than shown as if they were countries.
 */
export function visitorCountry(request: Request): string | null {
  const c = (request.headers.get('cf-ipcountry') || '').toUpperCase();
  return /^[A-Z]{2}$/.test(c) && c !== 'XX' && c !== 'T1' ? c : null;
}

// Cloudflare Turnstile (login + comments). Activates only when the env keys are
// set, so the site keeps working without them.
//   NEXT_PUBLIC_TURNSTILE_SITE_KEY  — public, rendered into the widget
//   TURNSTILE_SECRET_KEY            — server-only, used to verify tokens

export const turnstileSiteKey = () => process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
export const turnstileEnabled = () => !!process.env.TURNSTILE_SECRET_KEY && !!turnstileSiteKey();

// Verify a token with Cloudflare's siteverify. Returns true when Turnstile is
// not configured (no secret), so login/comments work in the meantime.
export async function verifyTurnstile(token: string | null | undefined, ip?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured -> no-op
  if (!token) return false;
  try {
    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', token);
    if (ip) body.set('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };
    return !!data.success;
  } catch {
    return false;
  }
}

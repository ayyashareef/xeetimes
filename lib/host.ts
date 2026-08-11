/**
 * Is this request for a staging hostname rather than the live newspaper?
 *
 * beta and the live site are the SAME build on the SAME server, so nothing can
 * be decided from an environment variable — it has to follow the host the
 * reader actually arrived on. Three separate places need that answer (robots,
 * the noindex meta, and whether to load analytics) and each had its own copy of
 * the pattern, which is three chances for them to drift apart and for beta to
 * start reporting itself as production.
 */
export function isStagingHost(host: string | null | undefined): boolean {
  return /^(beta|staging|localhost|127\.0\.0\.1)/i.test(host || '');
}

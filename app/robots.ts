import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { isStagingHost } from '@/lib/host';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

// Staging is decided by the host the request ARRIVED on, not by SITE_URL.
// Both names point at this one server, so a single build has to answer
// differently for each: beta.xeetimes.com must stay out of Google while
// xeetimes.com is indexed. Keying off SITE_URL could only ever give one answer
// for both, which made the go-live order matter — set it early and beta became
// crawlable, set it late and the live domain launched saying noindex.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const isStaging = isStagingHost((await headers()).get('host'));

  if (isStaging) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/login'] }],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/news-sitemap.xml`],
  };
}

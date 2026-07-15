import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

// /robots.txt — invite crawlers in (staging stays blocked) and point them at
// both sitemaps. Cloudflare prepends its content-signals policy block.
const IS_STAGING = /beta\.|staging\.|localhost|127\.0\.0\.1/.test(SITE_URL);

export default function robots(): MetadataRoute.Robots {
  if (IS_STAGING) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/login'] }],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/news-sitemap.xml`],
  };
}

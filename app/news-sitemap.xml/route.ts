import { db } from '@/lib/db';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const xml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Google News sitemap: only articles published in the last 48 hours (that is
// all Google News reads). Submit alongside sitemap.xml in Search Console.
export async function GET() {
  const since = new Date(Date.now() - 48 * 3600 * 1000);
  const articles = await db.article.findMany({
    where: { status: 'PUBLISHED', publishedAt: { gte: since }, category: { isActive: true } },
    orderBy: { publishedAt: 'desc' },
    take: 1000,
    select: { id: true, title_dv: true, shortTitle_dv: true, publishedAt: true },
  });

  const urls = articles
    .map((a) => {
      const wpId = a.id.replace(/^art_/, '');
      const title = a.shortTitle_dv || a.title_dv || '';
      return `  <url>
    <loc>${SITE_URL}/dv/${wpId}</loc>
    <news:news>
      <news:publication>
        <news:name>XeeTimes</news:name>
        <news:language>dv</news:language>
      </news:publication>
      <news:publication_date>${a.publishedAt?.toISOString()}</news:publication_date>
      <news:title>${xml(title)}</news:title>
    </news:news>
  </url>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}

import { db } from '@/lib/db';

// RSS 2.0 feed of the latest published (Dhivehi) articles — served at /feed for
// aggregators (e.g. Adafi). Public; cached briefly.
export const dynamic = 'force-dynamic';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://xeetimes.com').replace(/\/+$/, '');

function esc(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function stripTags(s: string | null | undefined): string {
  return String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
function absUrl(u: string | null | undefined): string {
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : `${SITE}${u.startsWith('/') ? '' : '/'}${u}`;
}

export async function GET() {
  const articles = await db.article.findMany({
    where: { status: 'PUBLISHED', category: { isActive: true } },
    orderBy: { publishedAt: 'desc' },
    take: 25,
    select: {
      id: true, title_dv: true, title_en: true, shortTitle_dv: true,
      excerpt_dv: true, content_dv: true, featuredImage: true, publishedAt: true,
      category: { select: { name_dv: true } },
      author: { select: { name_dv: true, name: true } },
    },
  });

  // MIME by extension for enclosure/media tags (parsers care less than the
  // spec does, but be correct).
  const mime = (u: string) =>
    /\.png(\?|$)/i.test(u) ? 'image/png' : /\.webp(\?|$)/i.test(u) ? 'image/webp' : /\.gif(\?|$)/i.test(u) ? 'image/gif' : 'image/jpeg';

  const items = articles.map((a) => {
    const id = (a.id || '').replace(/^art_/, '');
    const link = `${SITE}/dv/${id}`;
    const title = a.title_dv || a.shortTitle_dv || a.title_en || 'XeeTimes';
    const desc = a.excerpt_dv || stripTags(a.content_dv).slice(0, 400);
    const pub = a.publishedAt ? new Date(a.publishedAt).toUTCString() : new Date().toUTCString();
    const img = absUrl(a.featuredImage);
    // Lead with the featured image in content:encoded — many aggregator apps
    // take the first <img> in content as the card image.
    const body = `${img ? `<p><img src="${esc(img)}" alt="${esc(title)}" /></p>` : ''}${a.content_dv || ''}`;
    return [
      '  <item>',
      `    <title>${esc(title)}</title>`,
      `    <link>${esc(link)}</link>`,
      `    <guid isPermaLink="true">${esc(link)}</guid>`,
      `    <pubDate>${pub}</pubDate>`,
      a.category?.name_dv ? `    <category>${esc(a.category.name_dv)}</category>` : '',
      a.author ? `    <dc:creator>${esc(a.author.name_dv || a.author.name || '')}</dc:creator>` : '',
      // length is REQUIRED by RSS 2.0 — strict parsers drop items without it.
      img ? `    <enclosure url="${esc(img)}" length="0" type="${mime(img)}" />` : '',
      img ? `    <media:content url="${esc(img)}" medium="image" type="${mime(img)}" />` : '',
      `    <description>${esc(desc)}</description>`,
      body ? `    <content:encoded><![CDATA[${body.replace(/]]>/g, ']]&gt;')}]]></content:encoded>` : '',
      '  </item>',
    ].filter(Boolean).join('\n');
  }).join('\n');

  const now = new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
  <title>XeeTimes</title>
  <link>${SITE}</link>
  <description>XeeTimes — the latest news from the Maldives.</description>
  <language>dv</language>
  <lastBuildDate>${now}</lastBuildDate>
  <atom:link href="${SITE}/feed" rel="self" type="application/rss+xml" />
  <image>
    <url>${SITE}/xt-logo.png</url>
    <title>XeeTimes</title>
    <link>${SITE}</link>
  </image>
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}

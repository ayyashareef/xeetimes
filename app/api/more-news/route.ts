import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { newsCard, type Art, type Lang } from '@/app/preview/markup';

export const dynamic = 'force-dynamic';

const PAGE = 8;

// Returns the next page of latest published articles as ready-to-append card
// HTML for the home page "load more" button. Skips hidden categories.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang: Lang = searchParams.get('lang') === 'en' ? 'en' : 'dv';
  const skip = Math.max(0, Math.min(1000, parseInt(searchParams.get('skip') || '0', 10) || 0));
  const category = (searchParams.get('category') || '').trim();

  // The Dhivehi-only site has no English article feed.
  if (lang === 'en') return NextResponse.json({ html: '', hasMore: false, count: 0 });

  const rows = (await db.article.findMany({
    where: {
      status: 'PUBLISHED',
      category: category ? { slug: category, isActive: true } : { isActive: true },
    },
    orderBy: { publishedAt: 'desc' },
    skip,
    take: PAGE + 1, // one extra to know if there's another page
    select: {
      id: true,
      slug: true,
      title_dv: true,
      title_en: true,
      shortTitle_dv: true,
      shortTitle_en: true,
      excerpt_dv: true,
      excerpt_en: true,
      featuredImage: true,
      publishedAt: true,
      category: { select: { name_dv: true, name_en: true, slug: true } },
      author: { select: { id: true, name_dv: true, name: true, avatar: true } },
      tags: { select: { name_dv: true, name_en: true, slug: true }, take: 1 },
    },
  })) as unknown as Art[];

  const hasMore = rows.length > PAGE;
  const items = rows.slice(0, PAGE);
  const html = items.map((a, i) => newsCard(a, skip + i, lang)).join('');

  return NextResponse.json({ html, hasMore, count: items.length });
}

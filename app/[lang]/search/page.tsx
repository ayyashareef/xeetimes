import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getActiveAds } from '@/lib/ads';
import { getHiddenCategorySlugs } from '@/lib/categories';
import { getSiteSettings } from '@/lib/settings';
import XtShell from '../../preview/XtShell';
import { searchHtml, type Art, type Lang } from '../../preview/markup';

export const dynamic = 'force-dynamic';
const LANGS = ['dv', 'en'];

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { lang } = await params;
  if (!LANGS.includes(lang)) notFound();
  const L = lang as Lang;

  const { q } = await searchParams;
  const query = (q || '').trim();

  let articles: Art[] = [];
  if (query && L !== 'en') {
    articles = (await db.article.findMany({
      where: {
        status: 'PUBLISHED',
        category: { isActive: true },
        OR: [
          { title_dv: { contains: query, mode: 'insensitive' } },
          { title_en: { contains: query, mode: 'insensitive' } },
          { content_dv: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: 30,
      select: {
        id: true,
        slug: true,
        title_dv: true,
        title_en: true,
        shortTitle_dv: true,
        shortTitle_en: true,
        featuredImage: true,
        publishedAt: true,
        category: { select: { name_dv: true, name_en: true, slug: true } },
      },
    })) as unknown as Art[];
  }

  const [ads, hidden, site] = await Promise.all([getActiveAds(), getHiddenCategorySlugs(), getSiteSettings()]);
  return <XtShell html={searchHtml(query, articles, L, ads, hidden, site)} dir={L === 'dv' ? 'rtl' : 'ltr'} />;
}

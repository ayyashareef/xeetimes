import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getActiveAds } from '@/lib/ads';
import { getHiddenCategorySlugs } from '@/lib/categories';
import { getSiteSettings } from '@/lib/settings';
import XtShell from '@/app/preview/XtShell';
import { authorHtml, authorPageCount, AUTHOR_PER_PAGE, type Art, type Lang } from '@/app/preview/markup';

export const dynamic = 'force-dynamic';

export default async function AuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const rawPage = Math.max(1, parseInt(String(Array.isArray(sp.page) ? sp.page[0] : sp.page ?? '1'), 10) || 1);
  const lang = 'dv';
  const L = lang as Lang;

  const author = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, name_dv: true, avatar: true, bio_dv: true, bio_en: true, isActive: true },
  });
  if (!author || !author.isActive) notFound();

  // Paginated like the live author pages: a uniform 10-per-page grid.
  const authorWhere = { status: 'PUBLISHED' as const, authorId: id, category: { isActive: true } };
  const total = await db.article.count({ where: authorWhere });
  const page = Math.min(rawPage, authorPageCount(total));

  const articles = (await db.article.findMany({
    where: authorWhere,
    orderBy: { publishedAt: 'desc' },
    skip: (page - 1) * AUTHOR_PER_PAGE,
    take: AUTHOR_PER_PAGE,
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

  const [ads, hidden, site] = await Promise.all([getActiveAds(), getHiddenCategorySlugs(), getSiteSettings()]);
  return <XtShell html={authorHtml(author, articles, L, ads, hidden, site, total, page)} dir={L === 'dv' ? 'rtl' : 'ltr'} />;
}
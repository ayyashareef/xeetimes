import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getActiveAds } from '@/lib/ads';
import { getHiddenCategorySlugs } from '@/lib/categories';
import { getSiteSettings } from '@/lib/settings';
import XtShell from '../../../preview/XtShell';
import { authorHtml, type Art, type Lang } from '../../../preview/markup';

export const dynamic = 'force-dynamic';
const LANGS = ['dv', 'en'];

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  if (!LANGS.includes(lang)) notFound();
  const L = lang as Lang;

  const author = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, name_dv: true, avatar: true, bio_dv: true, bio_en: true, isActive: true },
  });
  if (!author || !author.isActive) notFound();

  const articles = (await db.article.findMany({
    where: { status: 'PUBLISHED', authorId: id, category: { isActive: true } },
    orderBy: { publishedAt: 'desc' },
    take: 24,
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
  return <XtShell html={authorHtml(author, articles, L, ads, hidden, site)} dir={L === 'dv' ? 'rtl' : 'ltr'} />;
}

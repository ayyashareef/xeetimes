import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getActiveAds } from '@/lib/ads';
import { getHiddenCategorySlugs } from '@/lib/categories';
import { getSiteSettings } from '@/lib/settings';
import { SITE_URL } from '@/lib/seo';
import XtShell from '@/app/preview/XtShell';
import { categoryHtml, sectionLabel, catPageCount, CAT_PER_PAGE, type Art, type CatPage, type Lang } from '@/app/preview/markup';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const lang = 'dv';
  const c = await db.category.findUnique({
    where: { slug },
    select: { name_dv: true, name_en: true, description_dv: true, description_en: true, isActive: true },
  });
  if (!c || !c.isActive) return {};
  const en = lang === 'en';
  const name = (en ? c.name_en || c.name_dv : c.name_dv) || slug;
  const description = (en ? c.description_en || c.description_dv : c.description_dv)
    || (en ? `Latest ${name} news from the Maldives — XeeTimes.` : `${name} — ޒީ ޓައިމްސް، ރާއްޖޭގެ އެންމެ ފަހުގެ ޚަބަރު.`);
  const canonical = `${SITE_URL}/category/${slug}`;
  // Browser-tab title in English: the curated nav label when we have one,
  // else the capitalised slug (category names in the DB are Thaana).
  const tabName = sectionLabel(slug, 'en' as Lang, slug.charAt(0).toUpperCase() + slug.slice(1));
  return {
    title: tabName,
    description,
    alternates: {
      canonical,
    },
    openGraph: { title: name, description, url: canonical, siteName: 'XeeTimes', type: 'website' },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const rawPage = Math.max(1, parseInt(String(Array.isArray(sp.page) ? sp.page[0] : sp.page ?? '1'), 10) || 1);
  const lang = 'dv';
  const L = lang as Lang;
  const pick = <T,>(en: T, dv: T) => (L === 'en' ? en : dv);

  const category = await db.category.findUnique({
    where: { slug },
    select: {
      name_dv: true,
      name_en: true,
      description_dv: true,
      description_en: true,
      isActive: true,
      children: {
        where: { isActive: true },
        orderBy: { order: 'asc' },
        select: { name_dv: true, name_en: true, slug: true },
      },
    },
  });
  if (!category) notFound();
  // Hidden (deactivated) category: don't expose its page — send visitors home.
  if (!category.isActive) redirect('/');

  // An article belongs to this section if it's the primary category OR a
  // secondary (alt) one — WordPress allowed multiple categories per post.
  const catWhere = { status: 'PUBLISHED' as const, OR: [{ category: { slug } }, { altCategories: { some: { slug } } }] };
  const total = await db.article.count({ where: catWhere });
  // Page 1: lead + 8-card grid. Pages 2+: an 8-card grid. Clamp to range.
  const page = Math.min(rawPage, Math.max(1, catPageCount(total)));
  const skip = page === 1 ? 0 : (CAT_PER_PAGE + 1) + (page - 2) * CAT_PER_PAGE;
  const take = page === 1 ? CAT_PER_PAGE + 1 : CAT_PER_PAGE;
  const articles = (await db.article.findMany({
      where: catWhere,
      orderBy: { publishedAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        slug: true,
        title_dv: true,
        title_en: true,
        shortTitle_dv: true,
        shortTitle_en: true,
        excerpt_dv: true,
        excerpt_en: true,
        // content_en is a Dhivehi mirror; fetch only content_dv (en falls back to it)
        content_dv: true,
        featuredImage: true,
        publishedAt: true,
        category: { select: { name_dv: true, name_en: true, slug: true } },
        author: { select: { id: true, name_dv: true, name: true, avatar: true } },
        tags: { select: { name_dv: true, name_en: true, slug: true }, take: 1 },
      },
    })) as unknown as Art[];

  const children = category.children.map((c) => ({
    name: sectionLabel(c.slug, L, (pick(c.name_en, c.name_dv) || c.name_dv) as string),
    slug: c.slug,
  }));

  // Dhivehi-only site: /en category pages show the masthead but no articles.
  const enEmpty = L === 'en';
  const cp: CatPage = {
    name: sectionLabel(slug, L, (pick(category.name_en, category.name_dv) || category.name_dv) as string),
    slug,
    subtitle: children[0]?.name,
    description: pick(category.description_en, category.description_dv),
    total: enEmpty ? 0 : total,
    page,
    children,
    lead: enEmpty || page > 1 ? null : (articles[0] ?? null),
    mostRead: [],
    grid: enEmpty ? [] : (page === 1 ? articles.slice(1) : articles),
  };

  const [ads, hidden, site] = await Promise.all([getActiveAds(), getHiddenCategorySlugs(), getSiteSettings()]);
  return <XtShell html={categoryHtml(cp, L, ads, hidden, site)} dir={L === 'dv' ? 'rtl' : 'ltr'} />;
}
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { SITE_URL, jsonLd, newsArticleJsonLd } from '@/lib/seo';
import { getActiveAds } from '@/lib/ads';
import { getHiddenCategorySlugs } from '@/lib/categories';
import { getSiteSettings } from '@/lib/settings';
import XtShell from '@/app/preview/XtShell';
import SocialEmbedRenderer from '@/components/public/SocialEmbedRenderer';
import ArticleViewBeacon from '@/components/public/ArticleViewBeacon';
import { articleHtml, type Art, type Cmt, type Lang } from '@/app/preview/markup';

export const dynamic = 'force-dynamic';

// Resolve /<lang>/<id> to the article, matching the page's id/slug logic.
function idForms(id: string): string[] {
  const forms = new Set<string>([id]);
  for (const fn of [decodeURIComponent, encodeURIComponent]) {
    try {
      forms.add(fn(id));
    } catch {
      /* ignore */
    }
  }
  return [...forms];
}

// Share/SEO metadata: short title + description. The og:image comes from the
// sibling opengraph-image.tsx automatically, so we don't set images here.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const lang = 'dv';
  const en = lang === 'en';
  const a = await db.article.findFirst({
    where: { OR: [{ id }, { id: `art_${id}` }, { slug: { in: idForms(id) } }], status: 'PUBLISHED' },
    select: {
      id: true, publishedAt: true, updatedAt: true,
      shortTitle_dv: true, shortTitle_en: true, title_dv: true, title_en: true,
      metaTitle_dv: true, metaTitle_en: true, metaDescription_dv: true, metaDescription_en: true,
      excerpt_dv: true, excerpt_en: true,
    },
  });
  if (!a) return { title: 'XeeTimes' };
  // Share/SEO text title: the English/Latin title (entered in the "SEO Dhivehi"
  // Meta Title field), falling back to the Dhivehi short/full title. The OG
  // IMAGE keeps the Dhivehi short heading (handled in opengraph-image.tsx).
  const textTitle =
    a.metaTitle_dv || a.metaTitle_en ||
    (en
      ? a.shortTitle_en || a.shortTitle_dv || a.title_en || a.title_dv
      : a.shortTitle_dv || a.shortTitle_en || a.title_dv || a.title_en) ||
    'XeeTimes';
  const desc = (en
    ? a.metaDescription_en || a.excerpt_en || a.metaDescription_dv || a.excerpt_dv
    : a.metaDescription_dv || a.excerpt_dv) || undefined;
  const wpId = a.id.replace(/^art_/, '');
  const canonical = `${SITE_URL}/${wpId}`;
  // Browser-tab title must be Latin (Thaana renders poorly in tab strips):
  // the Latin meta title when the editor set one, else a generic English
  // fallback. OG/twitter keep the full text title for share cards.
  const hasLatin = (s: string | null | undefined) => !!s && /[A-Za-z]/.test(s);
  const tabTitle = [a.metaTitle_dv, a.metaTitle_en, a.shortTitle_en, a.title_en].find(hasLatin);
  return {
    title: tabTitle ? tabTitle : { absolute: 'XeeTimes · Maldives News' },
    description: desc,
    alternates: {
      canonical,
    },
    openGraph: {
      title: textTitle,
      description: desc,
      type: 'article',
      siteName: 'XeeTimes',
      url: canonical,
      locale: en ? 'en_US' : 'dv_MV',
      publishedTime: a.publishedAt?.toISOString(),
      modifiedTime: (a.updatedAt || a.publishedAt)?.toISOString(),
    },
    twitter: { card: 'summary_large_image', title: textTitle, description: desc },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lang = 'dv';
  const L = lang as Lang;

  // /<lang>/15196 -> Article.id "art_15196"; also accept legacy slugs.
  const forms = new Set<string>([id]);
  for (const fn of [decodeURIComponent, encodeURIComponent]) {
    try {
      forms.add(fn(id));
    } catch {
      /* ignore */
    }
  }

  const article = (await db.article.findFirst({
    where: { OR: [{ id }, { id: `art_${id}` }, { slug: { in: [...forms] } }] },
    select: {
      id: true,
      slug: true,
      status: true,
      title_dv: true,
      title_en: true,
      shortTitle_dv: true,
      shortTitle_en: true,
      excerpt_dv: true,
      excerpt_en: true,
      metaTitle_dv: true,
      metaTitle_en: true,
      metaDescription_dv: true,
      metaDescription_en: true,
      content_dv: true,
      content_en: true,
      featuredImage: true,
      featuredImageCaption_dv: true,
      featuredImageCaption_en: true,
      galleryImages: true,
      publishedAt: true,
      updatedAt: true,
      categoryId: true,
      category: { select: { name_dv: true, name_en: true, slug: true, isActive: true } },
      author: { select: { id: true, name_dv: true, name: true, avatar: true } },
      tags: { select: { name_dv: true, name_en: true, slug: true } },
    },
  })) as (Art & { id: string; categoryId: string; status: string }) | null;

  if (!article) notFound();

  // Only PUBLISHED articles in an active category are public. Drafts/scheduled/
  // archived, and posts in a hidden (deactivated) category, are visible only to
  // a signed-in admin (so the editor "Preview" button still works) — this stops
  // unpublished or hidden-category content leaking to anyone who guesses the URL.
  const catActive = (article.category as { isActive?: boolean } | null)?.isActive !== false;
  if (article.status !== 'PUBLISHED' || !catActive) {
    const session = await auth();
    if (!session?.user) notFound();
  }

  const comments = (await db.comment.findMany({
    where: { articleId: article.id, isApproved: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { authorName: true, content: true, createdAt: true },
  })) as Cmt[];

  const relSelect = {
    id: true,
    slug: true,
    title_dv: true,
    title_en: true,
    shortTitle_dv: true,
    shortTitle_en: true,
    featuredImage: true,
    publishedAt: true,
    category: { select: { name_dv: true, name_en: true, slug: true } },
  } as const;

  // Bottom "related" grid (4, same category) + sidebar "latest" list (6, any
  // active category) — kept as separate queries so the sidebar is truly latest.
  const [related, latest] = (await Promise.all([
    db.article.findMany({
      where: { status: 'PUBLISHED', categoryId: article.categoryId, slug: { not: article.slug } },
      orderBy: { publishedAt: 'desc' },
      take: 4,
      select: relSelect,
    }),
    db.article.findMany({
      where: { status: 'PUBLISHED', category: { isActive: true }, slug: { not: article.slug } },
      orderBy: { publishedAt: 'desc' },
      take: 6,
      select: relSelect,
    }),
  ])) as unknown as [Art[], Art[]];

  const reactionRows = await db.reaction.groupBy({
    by: ['type'],
    where: { articleId: article.id },
    _count: { type: true },
  });
  const rc: Record<string, number> = {};
  for (const r of reactionRows) rc[r.type] = r._count.type;
  // Same order as the reaction bar in markup.ts (reactionBar TYPES).
  const reactionCounts = ['ANGRY', 'SAD', 'WOW', 'HAHA', 'LIKE', 'LOVE', 'WINK'].map((t) => rc[t] || 0);

  const [ads, hidden, site] = await Promise.all([getActiveAds(), getHiddenCategorySlugs(), getSiteSettings()]);
  const artForLd = article as unknown as { updatedAt?: Date | null; excerpt_dv?: string | null; metaDescription_dv?: string | null };
  const articleLd = newsArticleJsonLd({
    wpId: article.id.replace(/^art_/, ''),
    lang: L,
    headline: (L === 'en' ? article.shortTitle_en || article.title_en : article.shortTitle_dv || article.title_dv) || article.title_dv || '',
    description: artForLd.metaDescription_dv || artForLd.excerpt_dv,
    image: article.featuredImage,
    publishedAt: article.publishedAt as Date | null,
    updatedAt: artForLd.updatedAt,
    authorName: article.author?.name_dv || article.author?.name,
    authorId: article.author?.id,
    section: L === 'en' ? article.category?.name_en || article.category?.name_dv : article.category?.name_dv,
  }, site);
  return (
    <XtShell html={articleHtml(article, related, comments, L, ads, hidden, site, reactionCounts, latest)} dir={L === 'dv' ? 'rtl' : 'ltr'}>
      {/* NewsArticle structured data — required for Google News / Top Stories. */}
      {article.status === 'PUBLISHED' && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(articleLd) }} />
      )}
      {/* Turns the article's X/Facebook [data-social-embed] placeholders into real embeds. */}
      <SocialEmbedRenderer />
      {/* Count a view (real browsers only; published articles only). */}
      {article.status === 'PUBLISHED' && <ArticleViewBeacon id={article.id} />}
    </XtShell>
  );
}
import type { Metadata } from 'next';
import { redirect, permanentRedirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getActiveAds } from '@/lib/ads';
import { getHiddenCategorySlugs } from '@/lib/categories';
import { getSiteSettings } from '@/lib/settings';
import { SITE_URL, jsonLd, organizationJsonLd, webSiteJsonLd } from '@/lib/seo';
import XtShell from '@/app/preview/XtShell';
import { homeHtml, type Art, type Lang } from '@/app/preview/markup';

export const dynamic = 'force-dynamic';


export async function generateMetadata({ params }: { params: Promise<Record<string, never>> }): Promise<Metadata> {
  const lang = 'dv';
  void params;
  const en = lang === 'en';
  // Browser-tab title stays Latin (Thaana next to the favicon is unreadable
  // on most systems); the Dhivehi name lives in description/JSON-LD instead.
  const title = 'XeeTimes — Maldives News | Latest Dhivehi News';
  const description = en
    ? 'XeeTimes (ޒީ ޓައިމްސް) — the latest news from the Maldives: politics, sports, business, world news and reports, updated daily in Dhivehi.'
    : 'ޒީ ޓައިމްސް — ރާއްޖޭގެ އެންމެ ފަހުގެ ޚަބަރު: ސިޔާސީ، ކުޅިވަރު، ވިޔަފާރި، ދުނިޔެ އަދި ރިޕޯޓް. Latest Maldives news in Dhivehi from XeeTimes.';
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: `${SITE_URL}`,
    },
    openGraph: { title, description, url: `${SITE_URL}`, siteName: 'XeeTimes', type: 'website', locale: en ? 'en_US' : 'dv_MV' },
  };
}

const cardSelect = {
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
} as const;

async function byCategory(slug: string, take: number, withContent = false) {
  return db.article.findMany({
    where: { status: 'PUBLISHED', category: { slug, isActive: true } },
    orderBy: { publishedAt: 'desc' },
    take,
    select: withContent ? { ...cardSelect, content_dv: true, content_en: true } : cardSelect,
  }) as unknown as Promise<Art[]>;
}

// XeeTimes home stacks every nav section (4 cards each), in the live site's order.
const SECTION_DEFS: { slug: string; accent: string }[] = [
  { slug: 'farudhun', accent: 'var(--red)' },
  { slug: 'report', accent: 'var(--red)' },
  { slug: 'business', accent: 'var(--red)' },
  { slug: 'religion', accent: 'var(--red)' },
  { slug: 'health', accent: 'var(--red)' },
  { slug: 'ilmaai_hilmu', accent: 'var(--red)' },
  { slug: 'talent', accent: 'var(--red)' },
  { slug: 'badhige', accent: 'var(--red)' },
  { slug: 'history', accent: 'var(--red)' },
  { slug: 'haadhisaa', accent: 'var(--red)' },
  { slug: 'photo', accent: 'var(--red)' },
  { slug: 'video', accent: 'var(--red)' },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ p?: string; page_id?: string; feed?: string }> }) {
  // Legacy WordPress internal links: /?feed=rss2 and /?p=15380.
  const sp = await searchParams;
  if (sp?.feed) redirect('/feed');
  const legacyId = sp?.p || sp?.page_id;
  if (legacyId && /^\d+$/.test(legacyId)) permanentRedirect(`/${legacyId}`);
  const lang = 'dv';
  const L = lang as Lang;

  const [featured, recent] = await Promise.all([
    db.article.findFirst({
      where: { status: 'PUBLISHED', isFeatured: true, category: { isActive: true } },
      orderBy: { publishedAt: 'desc' },
      select: cardSelect,
    }) as unknown as Promise<Art | null>,
    db.article.findMany({
      where: { status: 'PUBLISHED', category: { isActive: true } },
      orderBy: { publishedAt: 'desc' },
      take: 16,
      select: cardSelect,
    }) as unknown as Promise<Art[]>,
  ]);

  const [sectionArts, ads, hidden, site] = await Promise.all([
    Promise.all(SECTION_DEFS.map((def) => byCategory(def.slug, 4))),
    getActiveAds(),
    getHiddenCategorySlugs(),
    getSiteSettings(),
  ]);
  const sections = SECTION_DEFS.map((def, i) => {
    const articles = sectionArts[i];
    if (!articles.length) return null;
    const cat = articles[0].category;
    const name = (L === 'en' ? cat?.name_en || cat?.name_dv : cat?.name_dv) || '';
    return { name, slug: def.slug, accent: def.accent, articles };
  }).filter((s): s is NonNullable<typeof s> => s !== null);

  const hero = featured ?? recent[0] ?? null;
  const heroSlug = hero?.slug;
  const rest = recent.filter((a) => a.slug !== heroSlug);

  // The site is Dhivehi-only — there is no English news yet, so /en shows the
  // chrome (header/banner/footer) with an empty state instead of Dhivehi cards.
  const data = L === 'en'
    ? { hero: null, topStories: [], news: [], worldFeature: null, worldList: [], sections: [], ads, hidden, site }
    : {
        hero,
        topStories: rest.slice(0, 3),
        news: rest.slice(3, 11),
        worldFeature: null,
        worldList: [],
        sections,
        ads,
        hidden,
        site,
      };

  return (
    <XtShell html={homeHtml(data, L)} dir={L === 'dv' ? 'rtl' : 'ltr'}>
      {/* Structured data: news organization + site search box for Google. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd([organizationJsonLd(site), webSiteJsonLd(site, L)]) }} />
    </XtShell>
  );
}
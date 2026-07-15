import type { SiteData } from './settings';

// Shared SEO helpers: canonical base URL, absolute-URL helper, and the JSON-LD
// builders (NewsMediaOrganization/WebSite for the home page, NewsArticle for
// article pages). Structured data is what earns the Google rich treatment
// (favicon + sitelinks + Top Stories) that established news sites get.

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://xeetimes.com').replace(/\/+$/, '');

export const absUrl = (p: string | null | undefined): string | undefined =>
  !p ? undefined : p.startsWith('http') ? p : `${SITE_URL}${p.startsWith('/') ? '' : '/'}${p}`;

// JSON.stringify for inline <script> — escape "<" so a "</script>" inside
// content can't break out of the tag.
export const jsonLd = (data: unknown): string => JSON.stringify(data).replace(/</g, '\\u003c');

// Public social profiles for Organization.sameAs (from Admin → Settings, with
// the site's known profiles as fallback).
const sameAs = (site: SiteData): string[] => {
  const links = Object.values(site.socialLinks || {}).filter((u) => typeof u === 'string' && u.startsWith('http'));
  return links.length ? links : ['https://www.facebook.com/xeetimes', 'https://www.instagram.com/xeetimes'];
};

export function organizationJsonLd(site: SiteData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    '@id': `${SITE_URL}#org`,
    name: site.siteName_en || 'XeeTimes',
    alternateName: site.siteName_dv || 'ޒީ ޓައިމްސް',
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: absUrl(site.logo) || `${SITE_URL}/xt-logo.png` },
    sameAs: sameAs(site),
  };
}

export function webSiteJsonLd(site: SiteData, lang: 'dv' | 'en') {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.siteName_en || 'XeeTimes',
    alternateName: site.siteName_dv || 'ޒީ ޓައިމްސް',
    url: SITE_URL,
    inLanguage: lang,
    publisher: { '@id': `${SITE_URL}#org` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/${lang}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function newsArticleJsonLd(a: {
  wpId: string;
  lang: 'dv' | 'en';
  headline: string;
  description?: string | null;
  image?: string | null;
  publishedAt?: Date | null;
  updatedAt?: Date | null;
  authorName?: string | null;
  authorId?: string | null;
  section?: string | null;
}, site: SiteData) {
  const url = `${SITE_URL}/${a.lang}/${a.wpId}`;
  const images = [absUrl(a.image), `${url}/opengraph-image`].filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: a.headline.slice(0, 110),
    description: a.description || undefined,
    image: images,
    datePublished: a.publishedAt?.toISOString(),
    dateModified: (a.updatedAt || a.publishedAt)?.toISOString(),
    inLanguage: a.lang,
    articleSection: a.section || undefined,
    isAccessibleForFree: true,
    author: a.authorName
      ? [{ '@type': 'Person', name: a.authorName, url: a.authorId ? `${SITE_URL}/${a.lang}/author/${encodeURIComponent(a.authorId)}` : undefined }]
      : [{ '@type': 'Organization', name: site.siteName_en || 'XeeTimes' }],
    publisher: organizationJsonLd(site),
  };
}

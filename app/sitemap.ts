import { MetadataRoute } from 'next';
import { db } from '@/lib/db';

// Rendered on-demand (not prerendered at build) so the build never needs the DB.
export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://beta.xeetimes.com';
const wpId = (id: string) => id.replace(/^art_/, '');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}`, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
  ];

  try {
    const [articles, categories] = await Promise.all([
      db.article.findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, updatedAt: true },
        orderBy: { publishedAt: 'desc' },
        take: 5000,
      }),
      db.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    ]);

    return [
      ...base,
      ...articles.map((a) => ({
        url: `${BASE_URL}/${wpId(a.id)}`,
        lastModified: a.updatedAt,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      })),
      ...categories.map((c) => ({
        url: `${BASE_URL}/category/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: 'daily' as const,
        priority: 0.6,
      })),
    ];
  } catch {
    // DB unreachable (e.g. during a CI build) — return just the static entry.
    return base;
  }
}

import { db } from './db';

// Slugs of categories hidden from the public site (Admin → Categories → eye
// toggle). Used to drop them from the header nav + home sections so the whole
// front end reflects the hide/show toggle for any category.
export async function getHiddenCategorySlugs(): Promise<string[]> {
  const rows = await db.category.findMany({ where: { isActive: false }, select: { slug: true } });
  return rows.map((r) => r.slug);
}

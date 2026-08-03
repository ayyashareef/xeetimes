import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { getActiveAds } from '@/lib/ads';
import { getHiddenCategorySlugs } from '@/lib/categories';
import { getSiteSettings } from '@/lib/settings';
import { SITE_URL } from '@/lib/seo';
import XtShell from '@/app/preview/XtShell';
import { teamHtml, type TeamMember, type Lang } from '@/app/preview/markup';

export const dynamic = 'force-dynamic';

const DESCRIPTION = 'ޒީ ޓައިމްސްގެ ޓީމް — އެޑިޓަރުންނާއި ނޫސްވެރިން.';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Our Team',
    description: DESCRIPTION,
    alternates: { canonical: `${SITE_URL}/our-team` },
    openGraph: { title: 'Our Team', description: DESCRIPTION, url: `${SITE_URL}/our-team`, siteName: 'XeeTimes', type: 'website' },
  };
}

// Seniority first, then how much they've written — the closest thing to the
// hand-ordered hierarchy the design is copied from, given no explicit rank field.
const ROLE_RANK: Record<string, number> = { SUPER_ADMIN: 0, EDITOR: 1, JOURNALIST: 2, MODERATOR: 3 };

export default async function OurTeamPage() {
  const L = 'dv' as Lang;

  // Only people who have actually published: the WP import left behind author
  // records with no articles, and they would pad the page with strangers.
  const users = await db.user.findMany({
    where: { isActive: true, articles: { some: { status: 'PUBLISHED' } } },
    select: {
      id: true,
      name: true,
      name_dv: true,
      avatar: true,
      role: true,
      _count: { select: { articles: { where: { status: 'PUBLISHED' } } } },
    },
  });

  // The house byline ("ޒީ ޓައިމްސް") is the masthead, not a person — it carries
  // the most articles of any account and would otherwise lead the team page.
  const isHouse = (u: { name: string; name_dv: string | null }) =>
    /ޓައިމްސް|xeetimes/i.test(`${u.name || ''} ${u.name_dv || ''}`);

  const members: TeamMember[] = users
    .filter((u) => !isHouse(u))
    .sort((a, b) =>
      (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9) ||
      b._count.articles - a._count.articles ||
      (a.name_dv || a.name).localeCompare(b.name_dv || b.name))
    .map((u) => ({ id: u.id, name: u.name, name_dv: u.name_dv, avatar: u.avatar, role: u.role }));

  const [ads, hidden, site] = await Promise.all([getActiveAds(), getHiddenCategorySlugs(), getSiteSettings()]);
  return <XtShell html={teamHtml(members, L, ads, hidden, site)} dir="rtl" />;
}

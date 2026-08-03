import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { getActiveAds } from '@/lib/ads';
import { getHiddenCategorySlugs } from '@/lib/categories';
import { getSiteSettings } from '@/lib/settings';
import { SITE_URL } from '@/lib/seo';
import XtShell from '@/app/preview/XtShell';
import { teamHtml, type TeamMember, type Lang } from '@/app/preview/markup';

export const dynamic = 'force-dynamic';

const DESCRIPTION = 'ޒީ ޓައިމްސްގެ ލިޔުންތެރިންނާއި ކޮންޓްރިބިއުޓަރުން.';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'XeeTimes Writers and Contributors',
    description: DESCRIPTION,
    alternates: { canonical: `${SITE_URL}/our-team` },
    openGraph: { title: 'XeeTimes Writers and Contributors', description: DESCRIPTION, url: `${SITE_URL}/our-team`, siteName: 'XeeTimes', type: 'website' },
  };
}

// The roster is CURATED, not derived from the database: it is the masthead, so
// who appears and in what order is an editorial decision, not a by-product of
// who happens to have published. `id` links a person to their User record (for
// the photo, the Thaana name and their author page); `name` is only used for
// people with no account yet, who render unlinked with a placeholder portrait.
//
// Order and titles as supplied by the newsroom. Only the chief editor carries a
// title — the rest are listed plainly, matching how the list was given.
const ROSTER: { id?: string; name?: string; title?: string }[] = [
  { id: 'usr_5', title: 'Founder and Chief Editor' },  // Zeena Zahir
  { id: 'usr_42' },                                     // Dr. Aminath Shafiya Adam
  { name: 'Professor Dr. Hassan Ugail' },               // no User record yet
  { id: 'usr_11' },                                     // Dr. Anara Naeem
  { name: 'Dr. Mohamed Shifan' },                       // no User record yet
  { id: 'usr_6' },                                      // Mariyam Shaneeza
  { id: 'usr_14' },                                     // Al-Usthaaza Mariyam Shabana
  { id: 'usr_32' },                                     // Husna Fahmy
  { id: 'usr_16' },                                     // Ahmed Fayaz Hassan
  { id: 'usr_30' },                                     // Sama Ibrahim Didi
  { id: 'usr_31' },                                     // Al-Usthaaz Hussain Amir
  { id: 'usr_19' },                                     // Ahmed Thasneef Rasheed
  { id: 'usr_24' },                                     // Mamdhoodha Abdulla
  { id: 'usr_21' },                                     // Dhimna Fakir
  { id: 'usr_18' },                                     // Azfa Rasheed
  { id: 'usr_29' },                                     // Mohamed Eeman
  { id: 'usr_35' },                                     // Anjum Ismail Mohamed
  { id: 'usr_17' },                                     // Juwayriya Wajdy
  { id: 'usr_7' },                                      // Salih Ahmed
  { id: 'usr_40' },                                     // Aminath Aala Ali
  { id: 'usr_27' },                                     // Aishath Liusha
  { id: 'usr_15' },                                     // Athika Mohamed
  { id: 'usr_36' },                                     // Fathimath Mohamedfulhu
  { id: 'usr_41' },                                     // Yashfa Abdul Ghanee
  { id: 'usr_37' },                                     // Ahmed Mujahid
  { id: 'usr_38' },                                     // Javiz Abdul Kareem
];

export default async function OurTeamPage() {
  const L = 'dv' as Lang;

  const ids = ROSTER.map((r) => r.id).filter((x): x is string => !!x);
  const users = await db.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, name_dv: true, avatar: true, role: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  // Keep the roster's order. An id that no longer resolves (a deleted account)
  // is dropped rather than rendered blank.
  const members: TeamMember[] = ROSTER.flatMap((r): TeamMember[] => {
    if (!r.id) return [{ id: null, name: r.name || '', name_dv: null, avatar: null, role: '', title: r.title ?? null }];
    const u = byId.get(r.id);
    if (!u) return [];
    return [{ id: u.id, name: u.name, name_dv: u.name_dv, avatar: u.avatar, role: u.role, title: r.title ?? null }];
  });

  const [ads, hidden, site] = await Promise.all([getActiveAds(), getHiddenCategorySlugs(), getSiteSettings()]);
  return <XtShell html={teamHtml(members, L, ads, hidden, site)} dir="rtl" />;
}

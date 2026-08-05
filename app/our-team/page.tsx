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

// The page lists every ACTIVE user, so the masthead is managed from admin:
// deactivate someone and they drop off. ROSTER below doesn't decide who appears
// any more — it only fixes the ORDER (and the chief editor's title) for the
// people the newsroom listed. Anyone active but not in ROSTER is appended after
// them, so a newly created account shows up without a code change.
// Titles are NOT here — they live on the User record and are edited in
// admin -> Users -> Title, so the newsroom can change them without a deploy.
const ROSTER: { id: string; lead?: boolean; fit?: 'contain' }[] = [
  { id: 'usr_5', lead: true },                          // Zeena Zahir
  { id: 'usr_42' },                                     // Dr. Aminath Shafiya Adam
  { id: 'cmsef2sj10002bsmxxr37ifdb' },                  // Professor Dr. Hassan Ugail
  { id: 'usr_11' },                                     // Dr. Anara Naeem
  { id: 'cmsef964c0007bsmxvvgc7ok2' },                  // Dr. Mohamed Shifan
  { id: 'usr_6' },                                      // Mariyam Shaneeza
  { id: 'usr_14' },                                     // Al-Usthaaza Mariyam Shabana
  { id: 'usr_32' },                                     // Husna Fahmy
  { id: 'usr_16' },                                     // Ahmed Fayaz Hassan
  { id: 'usr_30' },                                     // Sama Ibrahim Didi
  { id: 'usr_31' },                                     // Al-Usthaaz Hussain Amir
  { id: 'usr_19' },                                     // Ahmed Thasneef Rasheed
  { id: 'usr_24' },                                     // Mamdhoodha Abdulla
  { id: 'usr_21' },                                     // Dhimna Fakir
  { id: 'usr_12' },                                     // Zamath Ahmed Waheed
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

  const order = new Map(ROSTER.map((r, i) => [r.id, i] as const));

  // ROSTER decides who appears — it is the masthead, and it stays limited to the
  // people the newsroom listed. `isActive` can still drop someone (deactivate
  // them in admin and they disappear), but an account being active is no longer
  // enough on its own: that pulled in old WordPress author records and the
  // company accounts. Add an id to ROSTER to put someone on the page.
  const users = await db.user.findMany({
    where: { isActive: true, id: { in: [...order.keys()] } },
    select: { id: true, name: true, name_dv: true, avatar: true, role: true, title: true },
  });

  const byRoster = (id: string) => order.get(id) ?? Number.MAX_SAFE_INTEGER;

  // Everyone except the chief editor is a Contributor unless given a title.
  const members: TeamMember[] = users
    .sort((a, b) => byRoster(a.id) - byRoster(b.id))
    .map((u) => ({
      id: u.id,
      name: u.name,
      name_dv: u.name_dv,
      avatar: u.avatar,
      role: u.role,
      // Falls back to Contributor so a new account is never left blank.
      title: u.title?.trim() || 'Contributor',
      lead: ROSTER.find((x) => x.id === u.id)?.lead,
      fit: ROSTER.find((x) => x.id === u.id)?.fit,
    }));

  const [ads, hidden, site] = await Promise.all([getActiveAds(), getHiddenCategorySlugs(), getSiteSettings()]);
  return <XtShell html={teamHtml(members, L, ads, hidden, site)} dir="rtl" />;
}

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
// `photo` overrides the account's avatar, and is the ONLY way to give a picture
// to someone with no account — drop the file in public/uploads/team/ and point
// at it here.
const ROSTER: { id?: string; name?: string; nameDv?: string; title?: string; photo?: string; lead?: boolean }[] = [
  { id: 'usr_5', title: 'Founder and Chief Editor', lead: true },  // Zeena Zahir
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

  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, name_dv: true, avatar: true, role: true },
  });

  // Accounts that are not people: the house byline (the masthead itself) and the
  // built-in admin logins. They are active because they must be able to sign in,
  // but they have no place on a page of writers.
  const SYSTEM_LOGINS = new Set(['Admin', 'Administrator']);
  const isNotAPerson = (u: { name: string; name_dv: string | null }) =>
    SYSTEM_LOGINS.has((u.name || '').trim()) ||
    /ޓައިމްސް|xeetimes/i.test(`${u.name || ''} ${u.name_dv || ''}`);

  const order = new Map(ROSTER.map((r, i) => [r.id, i] as const));
  const byRoster = (id: string) => order.get(id) ?? Number.MAX_SAFE_INTEGER;
  const roleRank: Record<string, number> = { SUPER_ADMIN: 0, EDITOR: 1, CONTRIBUTOR: 2, JOURNALIST: 3, MODERATOR: 4 };

  // Everyone except the chief editor is a Contributor unless given a title.
  const members: TeamMember[] = users
    .filter((u) => !isNotAPerson(u))
    .sort((a, b) =>
      byRoster(a.id) - byRoster(b.id) ||
      (roleRank[a.role] ?? 9) - (roleRank[b.role] ?? 9) ||
      (a.name_dv || a.name).localeCompare(b.name_dv || b.name))
    .map((u) => {
      const r = ROSTER.find((x) => x.id === u.id);
      return {
        id: u.id,
        name: u.name,
        name_dv: u.name_dv,
        avatar: r?.photo ?? u.avatar,
        role: u.role,
        title: r?.title ?? 'Contributor',
        lead: r?.lead,
      };
    });

  const [ads, hidden, site] = await Promise.all([getActiveAds(), getHiddenCategorySlugs(), getSiteSettings()]);
  return <XtShell html={teamHtml(members, L, ads, hidden, site)} dir="rtl" />;
}

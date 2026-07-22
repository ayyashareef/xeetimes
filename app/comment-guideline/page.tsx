import type { Metadata } from 'next';
import { getActiveAds } from '@/lib/ads';
import { getHiddenCategorySlugs } from '@/lib/categories';
import { getSiteSettings } from '@/lib/settings';
import { SITE_URL } from '@/lib/seo';
import XtShell from '@/app/preview/XtShell';
import { header, footer, type Lang } from '@/app/preview/markup';

export const dynamic = 'force-dynamic';

const TITLE = 'ކޮމެންޓް ގައިޑްލައިން';
const INTRO = 'ކިޔުންތެރިން ފޮނުވާ ޚިޔާލު ތިރީގައިވާ ކަންކަމާއި ޚިލާފުވާނަމަ ޝާއިޢު ނުކުރެވޭނެ އެވެ.';
const ITEMS = [
  'އިސްލާމްދީނާއި ދެކޮޅަށް ހިތްވަރު ލިބޭ ލިޔުންތައް',
  'އެއްވެސް މީހަކަށް ޒާތީގޮތުން ނިސްބަތްކޮށް، އިންސާނީ ހައްޤަށް އަރައިގަންނަގޮތަށް ފޮނުވާފައި ހުންނަ ލިޔުންތައް',
  'މާރާމާރީ އާއި ވައްކަންފަދަ ތަފާތު ކުށްތަކަށް ހިތްވަރުދޭ ލިޔުންތައް',
  'ޤާނޫނާއި ޤަވާއިދާއި ޚިލާފު ލިޔުންތައް',
  'އާންމު މުޖުތަމައު ޤަބޫލުނުކުރާ ބަސްމަގުން ފޮނުވާފައި ހުންނަ ލިޔުންތައް',
  'ޚާއްސަ އުފެއްދުމެއް ނުވަތަ ފަރާތެއް އިޝްތިހާރު ކުރުމަށް ނުވަތަ ޚާއްސަ އުފެއްދުމެއް ނުވަތަ ފަރާތެއް ބަދުނާމް ކުރުމުގެ ބޭނުމުގައި ފޮނުވާ ލިޔުންތައް',
];

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Comment Guideline',
    description: INTRO,
    alternates: { canonical: `${SITE_URL}/comment-guideline` },
  };
}

export default async function CommentGuidelinePage() {
  const L = 'dv' as Lang;
  const [ads, hidden, site] = await Promise.all([getActiveAds(), getHiddenCategorySlugs(), getSiteSettings()]);
  const html = `${header(L, false, '', ads, hidden, site)}
    <main class="xt-wrap" style="padding:36px 26px 48px;">
      <h1 style="margin:0 0 20px;font-size:30px;font-weight:700;color:var(--ink);font-family:'Ammu','Faruma',sans-serif;">${TITLE}</h1>
      <p style="margin:0 0 22px;font-size:20px;line-height:1.9;color:#26262b;font-family:'Faruma','MV Utheemu',sans-serif;">${INTRO}</p>
      <ul style="margin:0;padding-right:24px;font-family:'Faruma','MV Utheemu',sans-serif;">
        ${ITEMS.map((i) => `<li style="margin:0 0 14px;font-size:20px;line-height:1.9;color:#26262b;">${i}</li>`).join('')}
      </ul>
    </main>
    ${footer(L, site)}`;
  return <XtShell html={html} dir="rtl" />;
}

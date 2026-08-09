import type { Metadata } from 'next';
import { getActiveAds } from '@/lib/ads';
import { getHiddenCategorySlugs } from '@/lib/categories';
import { getSiteSettings } from '@/lib/settings';
import XtShell from '@/app/preview/XtShell';
import { header, footer, type Lang } from '@/app/preview/markup';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'ޞަފްޙާ ނުފެނުނު',
  robots: { index: false, follow: false },
};

// The default Next 404 is a bare black page with English text — jarring on a
// Dhivehi site, and it drops the reader with nowhere to go. This one carries
// the site's own chrome, so the nav and the footer are still there to leave by.
export default async function NotFound() {
  const L = 'dv' as Lang;
  const [ads, hidden, site] = await Promise.all([getActiveAds(), getHiddenCategorySlugs(), getSiteSettings()]);

  const html = `${header(L, false, '', ads, hidden, site)}
    <main class="xt-wrap" style="padding:64px 26px 84px;text-align:center;">
      <div style="max-width:620px;margin:0 auto;">
        <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:22px;">
          <span class="xt-skew"><span></span><span></span></span>
          <span style="${'font-family:var(--en);'}font-size:74px;font-weight:800;line-height:1;color:var(--red);letter-spacing:-.02em;">404</span>
        </div>
        <h1 style="margin:0 0 14px;font-size:30px;font-weight:700;color:var(--ink);font-family:'Ammu','Faruma',sans-serif;line-height:1.6;">
          ތިޔަ ހޯއްދަވާ ޞަފްޙާ ނުފެނުނު
        </h1>
        <p style="margin:0 0 32px;font-size:19px;line-height:1.9;color:var(--ink2);font-family:'Faruma','MV Utheemu',sans-serif;">
          އެ ޞަފްޙާ ބަދަލުވެފައި ނުވަތަ ފުހެވިފައި ވެދާނެ އެވެ.
        </p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          <a href="/" style="display:inline-block;background:var(--red);color:#fff;font-family:'Ammu','Faruma',sans-serif;font-size:17px;font-weight:700;padding:13px 30px;">
            މައި ޞަފްޙާ
          </a>
          <a href="/search" style="display:inline-block;border:1px solid var(--line);color:var(--ink);font-family:'Ammu','Faruma',sans-serif;font-size:17px;font-weight:700;padding:13px 30px;">
            ހޯއްދަވާ
          </a>
        </div>
      </div>
    </main>
    ${footer(L, site)}`;

  return <XtShell html={html} dir="rtl" />;
}

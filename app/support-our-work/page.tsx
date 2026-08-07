import type { Metadata } from 'next';
import { getActiveAds } from '@/lib/ads';
import { getHiddenCategorySlugs } from '@/lib/categories';
import { getSiteSettings } from '@/lib/settings';
import { SITE_URL } from '@/lib/seo';
import XtShell from '@/app/preview/XtShell';
import { header, footer, type Lang } from '@/app/preview/markup';

export const dynamic = 'force-dynamic';

const TITLE = 'Support Our Work';
const DESCRIPTION =
  'XeeTimes is dedicated to serving the community by promoting social causes, raising awareness, and supporting people in need. Sponsor, partner with, or otherwise support our social initiatives.';

const BODY = [
  'Greetings from XeeTimes',
  'Our magazine is dedicated to serving the community by promoting social causes, raising awareness, and supporting people in need. We kindly request your support to help us continue these meaningful social initiatives. Your contribution, whether through sponsorship, partnership, or any other form of assistance, will make a positive impact on the communities we serve.',
  'Thank you for your kindness and support. We look forward to working together for a better society.',
];

// The page is written in English, so it renders LTR inside the RTL chrome —
// hence dir="ltr" on the <main> rather than on the shell, which would flip the
// header and footer too.
const CONTACTS: { label: string; value: string; href?: string }[] = [
  { label: 'Email', value: 'marketing@xeetimes.com', href: 'mailto:marketing@xeetimes.com' },
  { label: 'Contact', value: '7625573', href: 'tel:+9607625573' },
  { label: 'Account Number', value: '7730000499907 (XeeTimes)' },
];

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: `${SITE_URL}/support-our-work` },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url: `${SITE_URL}/support-our-work`,
      siteName: 'XeeTimes',
      type: 'website',
    },
  };
}

export default async function SupportOurWorkPage() {
  const L = 'dv' as Lang;
  const [ads, hidden, site] = await Promise.all([getActiveAds(), getHiddenCategorySlugs(), getSiteSettings()]);

  // Colours come from tokens, never literals — a hardcoded near-black here is
  // invisible in dark mode, which is exactly what it was.
  const para = (t: string, i: number) =>
    `<p style="margin:0 0 ${i === 0 ? '26' : '22'}px;font-size:${i === 0 ? '22' : '18'}px;line-height:1.85;color:${i === 0 ? 'var(--ink)' : 'var(--body-ink)'};font-weight:${i === 0 ? '700' : '400'};">${t}</p>`;

  const rows = CONTACTS.map(
    (c) => `
        <div style="display:flex;flex-wrap:wrap;gap:8px;padding:13px 0;border-bottom:1px solid var(--line2);">
          <span style="min-width:150px;font-weight:700;color:var(--ink);">${c.label}:</span>
          <span style="color:var(--body-ink);">${c.href ? `<a href="${c.href}" style="color:var(--red);">${c.value}</a>` : c.value}</span>
        </div>`,
  ).join('');

  const html = `${header(L, false, '', ads, hidden, site)}
    <main class="xt-wrap xt-support" style="padding:40px 26px 56px;" dir="ltr">
      <div style="max-width:760px;margin:0 auto;font-family:var(--en);">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:26px;">
          <span class="xt-skew"><span></span><span></span></span>
          <h1 style="margin:0;font-size:30px;font-weight:700;color:var(--ink);font-family:var(--en);letter-spacing:.01em;">${TITLE}</h1>
        </div>
        ${BODY.map(para).join('')}
        <div style="margin-top:34px;border-top:2px solid var(--ink);padding-top:6px;font-size:17px;">
          ${rows}
        </div>
      </div>
    </main>
    ${footer(L, site)}`;

  return <XtShell html={html} dir="rtl" />;
}

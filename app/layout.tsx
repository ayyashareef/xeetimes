import type { Metadata } from 'next';
import { Archivo } from 'next/font/google';
import { getSiteSettings } from '@/lib/settings';
import './globals.css';
import { headers } from 'next/headers';

// Archivo — the Latin display/UI face used across the XeeTimes design (dates,
// labels, numerals). Exposed as --font-archivo so the public builders can use it.
const archivo = Archivo({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'], variable: '--font-archivo' });

// Keep the beta/staging site out of Google — only the real domain gets indexed.
// Decided by the REQUEST host, not SITE_URL: both names resolve to this same
// server and this same build, so the noindex has to follow whichever one the
// reader arrived on.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://beta.xeetimes.com';

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  const host = (await headers()).get('host') || '';
  const IS_STAGING = /^(beta|staging|localhost|127\.0\.0\.1)/i.test(host);
  return {
    // Absolute base for OG/twitter image + canonical URLs (share cards need it).
    metadataBase: new URL(SITE_URL),
    title: { default: site.siteName_en || 'XeeTimes', template: `%s · ${site.siteName_en || 'XeeTimes'}` },
    description:
      'XeeTimes (ޒީ ޓައިމްސް) — the latest news from the Maldives: politics, sports, business, world news and in-depth reports in Dhivehi.',
    applicationName: 'XeeTimes',
    robots: IS_STAGING ? { index: false, follow: false } : undefined,
    // Next fills the image in from the sibling opengraph-image.tsx; without a
    // card declared here the tags default to the small square preview.
    twitter: { card: 'summary_large_image' },
    // Favicon from Admin → Settings (falls back to the app's default icon).
    icons: site.favicon ? { icon: site.favicon } : undefined,
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Runs before first paint, so a reader who chose dark never sees a light
  // flash first. Light is the default: the OS preference is deliberately NOT
  // consulted, so a first-time visitor always lands on the newspaper's own
  // look and only gets dark by asking for it. Wrapped in try/catch because
  // localStorage throws outright in some privacy modes, and a throw here would
  // leave the document with no theme at all.
  const themeScript = `(function(){var t='light';try{if(localStorage.getItem('xt-theme')==='dark')t='dark';}` +
    `catch(e){}document.documentElement.setAttribute('data-xt-theme',t);})();`;
  return (
    <html lang="en" className={archivo.variable} suppressHydrationWarning>
      <head>
        {/* Stop Chrome offering to "translate this page" for the Dhivehi content. */}
        <meta name="google" content="notranslate" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={archivo.className}>{children}</body>
    </html>
  );
}

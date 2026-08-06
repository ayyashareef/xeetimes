import type { Metadata } from 'next';
import { Archivo } from 'next/font/google';
import { getSiteSettings } from '@/lib/settings';
import './globals.css';

// Archivo — the Latin display/UI face used across the XeeTimes design (dates,
// labels, numerals). Exposed as --font-archivo so the public builders can use it.
const archivo = Archivo({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'], variable: '--font-archivo' });

// Keep the beta/staging site out of Google — only the real domain gets indexed.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://beta.xeetimes.com';
const IS_STAGING = /beta\.|staging\.|localhost|127\.0\.0\.1/.test(SITE_URL);

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    // Absolute base for OG/twitter image + canonical URLs (share cards need it).
    metadataBase: new URL(SITE_URL),
    title: { default: site.siteName_en || 'XeeTimes', template: `%s · ${site.siteName_en || 'XeeTimes'}` },
    description:
      'XeeTimes (ޒީ ޓައިމްސް) — the latest news from the Maldives: politics, sports, business, world news and in-depth reports in Dhivehi.',
    applicationName: 'XeeTimes',
    robots: IS_STAGING ? { index: false, follow: false } : undefined,
    // Favicon from Admin → Settings (falls back to the app's default icon).
    icons: site.favicon ? { icon: site.favicon } : undefined,
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Runs before first paint, so the page never flashes light then swaps to dark.
  // A saved choice wins; otherwise the OS preference decides. Wrapped in
  // try/catch because localStorage throws outright in some privacy modes, and a
  // throw here would leave the document with no theme at all.
  const themeScript = `(function(){try{var t=localStorage.getItem('xt-theme');` +
    `if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}` +
    `document.documentElement.setAttribute('data-xt-theme',t);}` +
    `catch(e){document.documentElement.setAttribute('data-xt-theme','light');}})();`;
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

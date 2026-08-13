import type { Metadata } from 'next';
import { Archivo } from 'next/font/google';
import { getSiteSettings } from '@/lib/settings';
import './globals.css';
import { headers } from 'next/headers';
import Script from 'next/script';
import { isStagingHost } from '@/lib/host';

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
  const IS_STAGING = isStagingHost((await headers()).get('host'));
  return {
    // Absolute base for OG/twitter image + canonical URLs (share cards need it).
    metadataBase: new URL(SITE_URL),
    title: { default: site.siteName_en || 'XeeTimes', template: `%s · ${site.siteName_en || 'XeeTimes'}` },
    description:
      'XeeTimes (ޒީޓައިމްސް) — the latest news from the Maldives: politics, sports, business, world news and in-depth reports in Dhivehi.',
    applicationName: 'XeeTimes',
    robots: IS_STAGING ? { index: false, follow: false } : undefined,
    // Brand name for share previews. The public pages each set this themselves,
    // but anything that does not — /login, /admin — fell through to Telegram
    // guessing a name from the domain, which capitalises only the first letter
    // and rendered the masthead as "Xeetimes". Declaring it at the root means
    // every page, present and future, carries the correct casing.
    openGraph: { siteName: 'XeeTimes', locale: 'dv_MV', type: 'website' },
    // Next fills the image in from the sibling opengraph-image.tsx; without a
    // card declared here the tags default to the small square preview.
    twitter: { card: 'summary_large_image' },
    // Favicon from Admin → Settings (falls back to the app's default icon).
    icons: site.favicon ? { icon: site.favicon } : undefined,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Google Analytics 4. Loaded only on the live hostname: beta and production
  // are the same build on the same server, so without the host check every
  // internal test and every page the newsroom previews would land in the
  // newspaper's real traffic figures.
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID || '';
  const analytics = GA_ID && !isStagingHost((await headers()).get('host'));

  // Runs before first paint, so a reader who chose dark never sees a light
  // flash first. Light is the default: the OS preference is deliberately NOT
  // consulted, so a first-time visitor always lands on the newspaper's own
  // look and only gets dark by asking for it. Wrapped in try/catch because
  // localStorage throws outright in some privacy modes, and a throw here would
  // leave the document with no theme at all.
  const themeScript = `(function(){var t='light';try{if(localStorage.getItem('xt-theme')==='dark')t='dark';}` +
    `catch(e){}document.documentElement.setAttribute('data-xt-theme',t);})();`;
  return (
    // dv, not en. The newspaper publishes in Dhivehi, and this attribute is what
    // tells Google (and every screen reader) which language the page is in. It
    // said "en" while every headline on the page was Thaana. The admin, which is
    // genuinely English, overrides it on its own wrapper.
    <html lang="dv" className={archivo.variable} suppressHydrationWarning>
      <head>
        {/* Stop Chrome offering to "translate this page" for the Dhivehi content. */}
        <meta name="google" content="notranslate" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={archivo.className}>
        {children}
        {analytics ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            {/* Public pages are plain server-rendered HTML with ordinary <a>
                links, so every article is a real page load and GA's automatic
                page_view is enough — no router hook needed. */}
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}

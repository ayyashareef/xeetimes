import { ImageResponse } from 'next/og';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { getSiteSettings } from '@/lib/settings';

// Default share card for every page that has no card of its own — the homepage
// above all, plus category, author and static pages like /support-our-work.
// Next cascades this file down the route tree, and app/[id]/opengraph-image.tsx
// overrides it for articles, so each article keeps its own photo + headline.
//
// Without this, sharing xeetimes.com on Facebook or WhatsApp produced a preview
// with no image at all: a bare grey link. The homepage is the single most-shared
// URL on the site, so it was the worst possible page to be missing one.
//
// Deliberately photo-free and DB-light: there is no "the" image for a homepage
// that changes hourly, and a card built from the current lead story would go
// stale inside Facebook's cache the moment the lead changed. A fixed masthead
// card is always accurate.
export const runtime = 'nodejs';
export const alt = 'XeeTimes';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/jpeg';

const WAHEED = path.join(process.cwd(), 'public/fonts/MVWaheed.ttf');
const FARUMA = path.join(process.cwd(), 'public/fonts/Faruma.ttf');
const CACHE_DIR = path.join(process.cwd(), '.og-cache');
// Bump to invalidate the cached card whenever the artwork changes.
const OG_VERSION = 'v2';
const HEADERS = {
  'Content-Type': 'image/jpeg',
  'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
};

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Thaana needs real shaping, which the OG renderer's font stack does not do —
// same sharp/Pango trick as the article card: render to a transparent PNG first.
async function renderText(
  text: string,
  opts: { width: number; sizePt: number; color: string },
): Promise<{ src: string; w: number; h: number } | null> {
  try {
    const buf = await sharp({
      text: {
        text: `<span foreground="${opts.color}">${escapeXml(text)}</span>`,
        fontfile: WAHEED,
        font: `Waheed ${opts.sizePt}`,
        rgba: true,
        width: opts.width,
        align: 'centre',
        spacing: 8,
      },
    })
      .png()
      .toBuffer();
    const m = await sharp(buf).metadata();
    return {
      src: `data:image/png;base64,${buf.toString('base64')}`,
      w: m.width ?? opts.width,
      h: m.height ?? opts.sizePt,
    };
  } catch {
    return null;
  }
}

export default async function OgImage() {
  const site = await getSiteSettings();
  const nameDv = site.siteName_dv || 'ޒީ ޓައިމްސް';

  // Static art, so the cache key is just the version and whatever name the
  // settings currently carry — rename the site and the card follows.
  const key = crypto.createHash('md5').update(`${OG_VERSION}|${nameDv}`).digest('hex');
  const cacheFile = path.join(CACHE_DIR, `home-${key}.jpg`);
  try {
    await stat(cacheFile);
    return new Response(new Uint8Array(await readFile(cacheFile)), { headers: HEADERS });
  } catch {
    /* not cached yet */
  }

  const [faruma, logo] = await Promise.all([
    readFile(FARUMA),
    readFile(path.join(process.cwd(), 'public/xt-logo.png')),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;
  const nameImg = await renderText(nameDv, { width: 900, sizePt: 68, color: '#ffffff' });

  const png = await new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          // XeeTimes red rather than the article card's blue — this card IS the
          // masthead, so it carries the brand colour instead of receding behind
          // a photo. #c8102e is the same red as the logo and the section rules.
          background: 'radial-gradient(circle at 100% 0%, #e11d3a 0%, #c8102e 46%, #8b0a1f 100%)',
          fontFamily: 'Faruma',
        }}
      >
        {/* Same white rounded logo box as the article card, so the two read as
            one family when they appear side by side in a feed. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 168,
            height: 168,
            borderRadius: 38,
            background: '#ffffff',
            padding: 22,
          }}
        >
          <img src={logoSrc} width={124} height={124} style={{ width: 124, height: 124, objectFit: 'contain' }} alt="XeeTimes" />
        </div>

        {nameImg ? (
          <img src={nameImg.src} width={nameImg.w} height={nameImg.h} style={{ marginTop: 34 }} alt="" />
        ) : (
          <div style={{ display: 'flex', marginTop: 34, color: '#fff', fontSize: 62 }}>{nameDv}</div>
        )}

        {/* White, not the brand red it used to be — on a red panel that rule
            would have been invisible. */}
        <div style={{ display: 'flex', width: 190, height: 6, borderRadius: 999, background: '#ffffff', marginTop: 30 }} />

        <div
          style={{
            display: 'flex',
            marginTop: 28,
            color: 'rgba(255,255,255,0.9)',
            fontSize: 40,
            fontWeight: 600,
            letterSpacing: 0.6,
          }}
        >
          xeetimes.com
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Faruma', data: faruma, style: 'normal', weight: 400 }] },
  ).arrayBuffer();

  const jpeg = await sharp(Buffer.from(png)).jpeg({ quality: 88 }).toBuffer();
  mkdir(CACHE_DIR, { recursive: true })
    .then(() => writeFile(cacheFile, jpeg))
    .catch(() => {});

  return new Response(new Uint8Array(jpeg), { headers: HEADERS });
}

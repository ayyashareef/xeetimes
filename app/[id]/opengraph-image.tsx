import { ImageResponse } from 'next/og';
import { headers } from 'next/headers';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { db } from '@/lib/db';

// Share card for a single article: the featured photo full-bleed, washed dark
// at the bottom, with the Dhivehi headline centred over it. Nothing else — the
// photo already carries the XT watermark from the uploader, so the card adds no
// logo or domain of its own. Dhivehi is
// rendered with MV Waheed via sharp/Pango (correct Thaana shaping) and embedded.
// Output is JPEG + disk-cached per article/updatedAt so scrapers get it fast.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const alt = 'XeeTimes';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/jpeg';

const WAHEED = path.join(process.cwd(), 'public/fonts/MVWaheed.ttf');
const FARUMA = path.join(process.cwd(), 'public/fonts/Faruma.ttf');
// Where the 1200x630 crop is anchored. Named so it can go into the photo cache
// key — see loadPhoto.
const CROP = 'bottom-left';
const CACHE_DIR = path.join(process.cwd(), '.og-cache');
const IMG_CACHE = path.join(CACHE_DIR, 'img');
// Bumping this invalidates every card on disk — required whenever the artwork
// changes, or readers keep getting the previous design from the cache.
const OG_VERSION = 'v19';
const HEADERS = {
  'Content-Type': 'image/jpeg',
  'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
};

const md5 = (s: string) => crypto.createHash('md5').update(s).digest('hex');
const dataUri = (buf: Buffer) => `data:image/jpeg;base64,${buf.toString('base64')}`;

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function hasNonAscii(s: string): boolean {
  for (const ch of s) if (ch.charCodeAt(0) > 127) return true;
  return false;
}

// Render Dhivehi text -> transparent PNG with proper Thaana shaping (Pango, MV Waheed).
async function renderText(
  text: string,
  opts: { width: number; sizePt: number; color: string; align?: 'left' | 'right' | 'centre' },
): Promise<{ src: string; w: number; h: number } | null> {
  try {
    const markup = `<span foreground="${opts.color}">${escapeXml(text)}</span>`;
    const buf = await sharp({
      text: { text: markup, fontfile: WAHEED, font: `Waheed ${opts.sizePt}`, rgba: true, width: opts.width, align: opts.align ?? 'right', spacing: 8 },
    })
      .png()
      .toBuffer();
    const m = await sharp(buf).metadata();
    return { src: `data:image/png;base64,${buf.toString('base64')}`, w: m.width ?? opts.width, h: m.height ?? opts.sizePt };
  } catch {
    return null;
  }
}

// Full-bleed background: the featured photo fills the whole 1200x630 card.
//
// Anchored bottom-left, not 'attention'. The uploader stamps the XT watermark
// into the bottom-left corner of every featured photo, and an attention crop
// slides its window toward whatever it judges interesting — which dragged the
// watermark up the frame, or clipped it against the edge, differently on every
// article. Anchoring the crop to the corner the mark lives in keeps it exactly
// where the newsroom put it, at the size they chose.
//
// The cost is that on a tall photo the crop now takes the bottom rather than the
// subject, so a head can go. Featured images are overwhelmingly landscape, where
// the vertical crop is a few dozen pixels and the two choices barely differ.
const resizePhoto = (input: Buffer) =>
  sharp(input).resize(1200, 630, { fit: 'cover', position: 'left bottom' }).jpeg({ quality: 82 }).toBuffer();

// Featured image -> data URI. Cached locally by URL (the xeetimes.com host is
// flaky from the droplet); retried; null only when genuinely unavailable.
async function loadPhoto(src: string | null | undefined): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith('/')) {
    try {
      return dataUri(await resizePhoto(await readFile(path.join(process.cwd(), 'public', src.replace(/^\/+/, '')))));
    } catch {
      return null;
    }
  }
  // Crop settings are part of the key. They were not, so changing the crop left
  // every already-downloaded photo serving its old framing for a week — the code
  // looked fixed while the cards did not change.
  const cacheKey = path.join(IMG_CACHE, `${md5(`${src}|${CROP}`)}.jpg`);
  try {
    return dataUri(await readFile(cacheKey));
  } catch {
    /* not cached yet */
  }
  // Fetch through the wsrv.nl image proxy: it resizes on its (fast) servers so
  // the droplet only downloads a small (~45KB) result. The droplet's own link to
  // xeetimes.com is too slow for the multi-MB WP originals (they time out).
  // a=bottom-left for the same reason resizePhoto anchors there: keep the
  // watermark in its corner instead of letting a smart crop wander off it.
  const proxied = `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=1200&h=630&fit=cover&a=bottom-left&output=jpg&q=82`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(proxied, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) return null;
      const out = await sharp(Buffer.from(await res.arrayBuffer())).jpeg({ quality: 82 }).toBuffer();
      mkdir(IMG_CACHE, { recursive: true }).then(() => writeFile(cacheKey, out)).catch(() => {});
      return dataUri(out);
    } catch {
      /* retry */
    }
  }
  return null;
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = 'dv';

  const forms = new Set<string>([id]);
  for (const fn of [decodeURIComponent, encodeURIComponent]) {
    try {
      forms.add(fn(id));
    } catch {
      /* ignore */
    }
  }

  const article = await db.article.findFirst({
    where: { OR: [{ id }, { id: `art_${id}` }, { slug: { in: [...forms] } }], status: 'PUBLISHED' },
    select: {
      shortTitle_dv: true,
      shortTitle_en: true,
      title_dv: true,
      title_en: true,
      featuredImage: true,
      metaDescription_dv: true,
      excerpt_dv: true,
      updatedAt: true,
      category: { select: { name_dv: true, name_en: true } },
    },
  });

  // The BRANDED card (headline + logo baked in) is only for social-share
  // scrapers, which render it under their own UI. Aggregator apps (Adafi's
  // Android client fetches this URL with okhttp) overlay their own headline,
  // so they get the PLAIN featured photo instead — no doubled text.
  const ua = ((await headers()).get('user-agent') || '').toLowerCase();
  const socialBot = /facebookexternalhit|facebot|meta-externalagent|twitterbot|telegrambot|whatsapp|viber|linkedinbot|discordbot|slackbot|skypeuripreview|pinterest|line\//.test(ua);
  if (!socialBot && article?.featuredImage) {
    const plain = await loadPhoto(article.featuredImage);
    if (plain) {
      return new Response(new Uint8Array(Buffer.from(plain.split(',')[1], 'base64')), { headers: HEADERS });
    }
  }

  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
  const stamp = article?.updatedAt ? new Date(article.updatedAt).getTime() : 0;
  const goodFile = path.join(CACHE_DIR, `${OG_VERSION}-${lang}-${safeId}-${stamp}.jpg`);
  const tmpFile = path.join(CACHE_DIR, `${OG_VERSION}-${lang}-${safeId}-${stamp}.tmp.jpg`);
  try {
    const st = await stat(goodFile);
    if (Date.now() - st.mtimeMs < 7 * 86400000) return new Response(new Uint8Array(await readFile(goodFile)), { headers: HEADERS });
  } catch {
    /* not cached */
  }
  try {
    const st = await stat(tmpFile);
    if (Date.now() - st.mtimeMs < 20 * 60000) return new Response(new Uint8Array(await readFile(tmpFile)), { headers: HEADERS });
  } catch {
    /* not cached */
  }

  const en = lang === 'en';
  const heading = article
    ? (en
        ? article.shortTitle_en || article.shortTitle_dv || article.title_en || article.title_dv
        : article.shortTitle_dv || article.shortTitle_en || article.title_dv || article.title_en)
    : 'ޒީ ޓައިމްސް';

  const [faruma, photo] = await Promise.all([
    readFile(FARUMA),
    loadPhoto(article?.featuredImage),
  ]);
  const withPhoto = !!photo;

  const textW = 1000;
  const long = heading.length > 90;
  const mid = heading.length > 50;
  const headSizePt = long ? 49 : mid ? 57 : 68;
  // Headline sits bottom-centre and is centre-aligned ('centre' is symmetric,
  // so no logical/visual RTL flip to worry about — unlike 'left'/'right').
  const headImg = await renderText(heading, { width: textW, sizePt: headSizePt, color: '#ffffff', align: 'centre' });

  // The romanised headline, printed under the Thaana one.
  //
  // Facebook is the reason this exists. It receives og:description perfectly
  // well and simply does not draw it — its preview is the site name and the
  // headline, nothing else — while Telegram shows it. The only way to put the
  // romanisation in front of a Facebook reader is to make it part of the image.
  //
  // Guarded by hasNonAscii: the field usually holds a romanisation but is free
  // text, and if the newsroom typed Thaana into it, this would render it as raw
  // unshaped codepoints (no Pango here, unlike the headline above). Latin only.
  const latinRaw = (article?.metaDescription_dv || article?.excerpt_dv || '').trim();
  const latin = latinRaw && !hasNonAscii(latinRaw)
    ? (latinRaw.length > 120 ? `${latinRaw.slice(0, 117).trimEnd()}…` : latinRaw)
    : '';
  let hW = headImg?.w ?? 0;
  let hH = headImg?.h ?? 0;
  const MAX_H = 340;
  if (hH > MAX_H) {
    const s = MAX_H / hH;
    hW = Math.round(hW * s);
    hH = Math.round(hH * s);
  }

  // No corner logo box and no xeetimes.com line any more. The featured photo
  // already carries the XT watermark baked in by the uploader, so both were
  // branding the same card a second and third time — and the top-left corner is
  // exactly where Facebook's composer puts its own swap/delete buttons, so the
  // logo sat underneath them anyway. Photo and headline only.

  const png = await new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', background: '#0a2350', fontFamily: 'Faruma' }}>
        {/* full-bleed featured photo (or a blue radial panel when there is none) */}
        {photo ? (
          <img src={photo} width={1200} height={630} style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, objectFit: 'cover' }} alt="" />
        ) : (
          <div style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, display: 'flex', background: 'radial-gradient(circle at 100% 0%, #2f6fd0 0%, #14509c 46%, #0a2f70 100%)' }} />
        )}
        {/* Legibility wash behind the headline. The matching wash across the top
            went with the logo it existed to protect — nothing sits up there now,
            so it was only darkening the photo. */}
        {photo ? (
          <div style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, display: 'flex', background: 'linear-gradient(to top, rgba(6,18,45,0.92) 0%, rgba(6,18,45,0.6) 32%, rgba(6,18,45,0) 60%)' }} />
        ) : null}

        {/* content: the Thaana headline, with the romanisation beneath it */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', width: 1200, height: 630, padding: '42px 54px 38px' }}>
          {/* The 36px stands in for the footer row that used to sit below the
              headline, so removing it leaves the text at the same height. */}
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 36 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {headImg ? (
                <img src={headImg.src} width={hW} height={hH} alt="" />
              ) : (
                <div style={{ direction: en ? 'ltr' : 'rtl', textAlign: 'center', color: '#fff', fontSize: 34, lineHeight: 1.7 }}>{heading}</div>
              )}
            </div>
            {latin ? (
              // Dimmer and much smaller than the Thaana above it: a subtitle for
              // readers who do not read Thaana, not a competing headline. Inset
              // well clear of the watermark's corner.
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  textAlign: 'center',
                  marginTop: 16,
                  maxWidth: 880,
                  color: 'rgba(255,255,255,0.82)',
                  fontSize: 25,
                  lineHeight: 1.35,
                }}
              >
                {latin}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Faruma', data: faruma, style: 'normal', weight: 400 }] },
  ).arrayBuffer();

  const jpeg = await sharp(Buffer.from(png)).jpeg({ quality: 86 }).toBuffer();
  const good = !article?.featuredImage || withPhoto;
  mkdir(CACHE_DIR, { recursive: true })
    .then(() => writeFile(good ? goodFile : tmpFile, jpeg))
    .catch(() => {});

  return new Response(new Uint8Array(jpeg), { headers: HEADERS });
}
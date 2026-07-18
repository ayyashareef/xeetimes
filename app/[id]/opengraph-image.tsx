import { ImageResponse } from 'next/og';
import { headers } from 'next/headers';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { db } from '@/lib/db';

// Branded share card (imported "OG Image.dc.html" design): featured photo on the
// left blending into a blue radial brand panel — logo-in-a-box masthead, accent
// rule, the Dhivehi headline, and a category pill + xeetimes.com. Dhivehi is
// rendered with MV Waheed via sharp/Pango (correct Thaana shaping) and embedded.
// Output is JPEG + disk-cached per article/updatedAt so scrapers get it fast.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const alt = 'XeeTimes';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/jpeg';

const WAHEED = path.join(process.cwd(), 'public/fonts/MVWaheed.ttf');
const FARUMA = path.join(process.cwd(), 'public/fonts/Faruma.ttf');
const CACHE_DIR = path.join(process.cwd(), '.og-cache');
const IMG_CACHE = path.join(CACHE_DIR, 'img');
const OG_VERSION = 'v13';
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
const resizePhoto = (input: Buffer) =>
  sharp(input).resize(1200, 630, { fit: 'cover', position: 'attention' }).jpeg({ quality: 82 }).toBuffer();

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
  const cacheKey = path.join(IMG_CACHE, `${md5(src)}.jpg`);
  try {
    return dataUri(await readFile(cacheKey));
  } catch {
    /* not cached yet */
  }
  // Fetch through the wsrv.nl image proxy: it resizes on its (fast) servers so
  // the droplet only downloads a small (~45KB) result. The droplet's own link to
  // xeetimes.com is too slow for the multi-MB WP originals (they time out).
  const proxied = `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=1200&h=630&fit=cover&a=attention&output=jpg&q=82`;
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
  const cat = article?.category ? (en ? article.category.name_en || article.category.name_dv : article.category.name_dv) : '';

  const [faruma, logo, photo] = await Promise.all([
    readFile(FARUMA),
    readFile(path.join(process.cwd(), 'public/xt-logo.png')),
    loadPhoto(article?.featuredImage),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;
  const withPhoto = !!photo;

  const textW = 1000;
  const long = heading.length > 90;
  const mid = heading.length > 50;
  const headSizePt = long ? 49 : mid ? 57 : 68;
  // Headline sits bottom-centre and is centre-aligned ('centre' is symmetric,
  // so no logical/visual RTL flip to worry about — unlike 'left'/'right').
  const [mastImg, headImg, catImg] = await Promise.all([
    renderText('ޒީ ޓައިމްސް', { width: 440, sizePt: 34, color: '#ffffff', align: en ? 'right' : 'left' }),
    renderText(heading, { width: textW, sizePt: headSizePt, color: '#ffffff', align: 'centre' }),
    cat ? renderText(cat, { width: 340, sizePt: 29, color: '#ffffff', align: 'centre' }) : Promise.resolve(null),
  ]);
  let hW = headImg?.w ?? 0;
  let hH = headImg?.h ?? 0;
  const MAX_H = 340;
  if (hH > MAX_H) {
    const s = MAX_H / hH;
    hW = Math.round(hW * s);
    hH = Math.round(hH * s);
  }

  // Masthead order mirrors per language: logo sits on the outer edge (right for
  // Dhivehi, left for English) with the wordmark beside it.
  const logoBox = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 78, height: 78, borderRadius: 18, background: '#ffffff', padding: 10 }}>
      <img src={logoSrc} width={58} height={58} style={{ width: 58, height: 58, objectFit: 'contain' }} alt="XeeTimes" />
    </div>
  );
  const wordmark = mastImg ? <img src={mastImg.src} width={mastImg.w} height={mastImg.h} alt="" /> : <div style={{ display: 'flex' }} />;
  const siteTag = <div style={{ display: 'flex', color: 'rgba(255,255,255,0.85)', fontSize: 29, fontWeight: 600, letterSpacing: 0.4 }}>xeetimes.com</div>;
  const catPill = catImg ? (
    <div style={{ display: 'flex', alignItems: 'center', background: '#c8102e', borderRadius: 999, padding: '13px 28px' }}>
      <img src={catImg.src} width={catImg.w} height={catImg.h} alt="" />
    </div>
  ) : (
    <div style={{ display: 'flex' }} />
  );

  const png = await new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', background: '#0a2350', fontFamily: 'Faruma' }}>
        {/* full-bleed featured photo (or a blue radial panel when there is none) */}
        {photo ? (
          <img src={photo} width={1200} height={630} style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, objectFit: 'cover' }} alt="" />
        ) : (
          <div style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, display: 'flex', background: 'radial-gradient(circle at 100% 0%, #2f6fd0 0%, #14509c 46%, #0a2f70 100%)' }} />
        )}
        {/* legibility overlays: strong at the bottom (behind the headline),
            light at the top (behind the masthead) */}
        {photo ? (
          <div style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, display: 'flex', background: 'linear-gradient(to top, rgba(6,18,45,0.92) 0%, rgba(6,18,45,0.6) 32%, rgba(6,18,45,0) 60%)' }} />
        ) : null}
        {photo ? (
          <div style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, display: 'flex', background: 'linear-gradient(to bottom, rgba(6,18,45,0.55) 0%, rgba(6,18,45,0) 24%)' }} />
        ) : null}

        {/* content: logo pinned top-left, category + centred headline in the
            middle, xeetimes.com centred at the bottom */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', width: 1200, height: 630, padding: '42px 54px 38px' }}>
          {/* masthead — logo box in the top-left corner */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 16 }}>
            {logoBox}
            {wordmark}
          </div>

          {/* centre block: the centred headline, pushed toward the bottom */}
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {headImg ? (
                <img src={headImg.src} width={hW} height={hH} alt="" />
              ) : (
                <div style={{ direction: en ? 'ltr' : 'rtl', textAlign: 'center', color: '#fff', fontSize: 34, lineHeight: 1.7 }}>{heading}</div>
              )}
            </div>
          </div>

          {/* footer: site tag on the left, category pill on the right (bottom) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {siteTag}
            {catPill}
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
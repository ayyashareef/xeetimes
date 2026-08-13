import { NextResponse } from 'next/server';
import path from 'node:path';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { uploadFile, deleteFile } from '@/lib/supabase-storage';
import sharp from 'sharp';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';

// Watermark options. Both lists are whitelists — wmLogo becomes part of a
// filesystem path, so it can never come straight from the request.
const WM_LOGOS = new Set([
  'red-word-white', 'red-word-dark', 'red-mark',
  'black-word-white', 'black-word-dark', 'black-mark',
  'white-word', 'white-mark',
]);
// Fraction of the image WIDTH, so a mark looks the same size on every photo
// once it is shown at a fixed container width. 'cover' is the one that hides
// something — a face — rather than signing the picture.
const WM_SIZES: Record<string, number> = { small: 0.08, medium: 0.105, large: 0.17, cover: 0.34 };
// The newsroom's house photo size. Watermarked photos are cropped to this shape
// first, so the mark lands in the same spot relative to the frame every time and
// featured images stop arriving in a dozen different aspect ratios.
const WM_CANVAS = { width: 1640, height: 924 };
const WM_CANVAS_AR = WM_CANVAS.width / WM_CANVAS.height;
type WmPos = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'center';
const WM_POSITIONS = new Set<string>(['bottom-left', 'bottom-right', 'top-left', 'top-right', 'center']);

// SVG is intentionally excluded: it can embed <script> and would be served
// same-origin, making it a stored-XSS vector. We only accept raster images.
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  // Video. Only formats a browser can play natively, so an upload is always
  // watchable without a transcode step on the server.
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/ogg': 'ogv', 'video/quicktime': 'mp4',
};
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']);
const ALLOWED_TYPES = Object.keys(EXT_BY_TYPE);
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB for images
// Video needs its own ceiling: 5MB is a few seconds of 1080p. Anything longer
// belongs on YouTube and gets embedded, which the article body already supports.
// Kept UNDER nginx's client_max_body_size (80M) — above it, nginx answers 413
// before the request ever reaches this handler and the app's own message never
// gets a chance to explain the limit.
const MAX_VIDEO_SIZE = 64 * 1024 * 1024;
const OPTIMIZE_THRESHOLD = 1 * 1024 * 1024; // optimize if over 1MB
const MAX_DIMENSION = 2000; // max width/height after resize

// Keep folder names to a safe whitelist so a crafted value can't escape the
// upload directory via path traversal (e.g. "../../app").
function safeFolder(raw: unknown): string {
  const s = String(raw ?? '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
  return s || 'general';
}

// Burn the chosen mark into a clip. Same logo, position, size and opacity the
// image path uses, so a photo and a video from the same story carry an
// identical mark. Returns null on any failure -- a clip that could not be
// watermarked is still worth storing, exactly as with images.
async function watermarkVideo(input: Buffer, formData: FormData): Promise<Buffer | null> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'xtwm-'));
  try {
    const wmLogo = WM_LOGOS.has(String(formData.get('wmLogo') || '')) ? String(formData.get('wmLogo')) : 'red-word-white';
    const wmPos = WM_POSITIONS.has(String(formData.get('wmPos') || '')) ? String(formData.get('wmPos')) : 'bottom-left';
    const wmSize = WM_SIZES[String(formData.get('wmSize') || '')] ?? WM_SIZES.small;
    const wmOpacity = Math.min(100, Math.max(20, parseInt(String(formData.get('wmOpacity') || '100'), 10) || 100)) / 100;

    const src = path.join(dir, 'in');
    const logo = path.join(dir, 'logo.png');
    const out = path.join(dir, 'out.mp4');
    await writeFile(src, input);
    await writeFile(logo, await readFile(path.join(process.cwd(), 'public/watermarks', `${wmLogo}.png`)));

    // The mark scales to a fraction of the VIDEO's width, matching how it
    // scales to a fraction of an image's width — so it looks the same size on
    // a still and a clip of the same story.
    const m = '(main_w*0.055)';   // matches the still-image inset above
    const pos = wmPos === 'center' ? 'x=(main_w-overlay_w)/2:y=(main_h-overlay_h)/2'
      : `x=${wmPos.endsWith('left') ? m : `main_w-overlay_w-${m}`}:y=${wmPos.startsWith('top') ? m : `main_h-overlay_h-${m}`}`;
    // scale2ref scales its FIRST input using the SECOND as the reference, so the
    // mark leads and the video follows — the other way round scales the video.
    // main_w is the reference's width, giving the same width-fraction sizing the
    // image path uses.
    const chain = `[1:v]format=rgba,colorchannelmixer=aa=${wmOpacity}[wm];` +
      `[wm][0:v]scale2ref=w=main_w*${wmSize}:h=ow/mdar[wm2][base];` +
      `[base][wm2]overlay=${pos}:format=auto`;

    const args = ['-y', '-i', src, '-i', logo, '-filter_complex', chain,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
      '-c:a', 'copy', '-movflags', '+faststart', out];

    const code = await new Promise<number>((resolve) => {
      const ps = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let err = '';
      ps.stderr.on('data', (d) => { err += d.toString().slice(0, 400); });
      // One core: a long clip must not hold the request open indefinitely.
      const kill = setTimeout(() => ps.kill('SIGKILL'), 240_000);
      ps.on('close', (c) => { clearTimeout(kill); if (c !== 0) console.error('ffmpeg watermark failed:', err.slice(-400)); resolve(c ?? 1); });
      ps.on('error', (e) => { clearTimeout(kill); console.error('ffmpeg spawn failed:', e.message); resolve(1); });
    });
    if (code !== 0) return null;
    return await readFile(out);
  } catch (e) {
    console.error('Video watermark failed:', e);
    return null;
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const folder = safeFolder(formData.get('folder'));

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }
  const isVideo = VIDEO_TYPES.has(file.type);
  const cap = isVideo ? MAX_VIDEO_SIZE : MAX_UPLOAD_SIZE;
  if (file.size > cap) {
    return NextResponse.json({ error: `File too large (max ${Math.round(cap / 1048576)}MB)` }, { status: 400 });
  }

  let buffer: Buffer = Buffer.from(await file.arrayBuffer());
  let contentType = file.type;

  // Video takes its own path: the sharp pipeline below assumes a raster it can
  // decode, so it is skipped wholesale rather than guarded step by step. The
  // watermark is burned in with ffmpeg instead.
  if (isVideo) {
    // QuickTime .mov files are H.264 in practice and play as video/mp4, so they
    // are relabelled rather than rejected.
    if (contentType === 'video/quicktime') contentType = 'video/mp4';
    if (String(formData.get('watermark') || '') === '1') {
      const marked = await watermarkVideo(buffer, formData);
      if (marked) { buffer = marked; contentType = 'video/mp4'; }
    }
    const ext = EXT_BY_TYPE[contentType] || 'mp4';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const url = await uploadFile(folder, buffer, filename, contentType);
    let mediaId: string | undefined;
    try {
      const media = await db.media.create({
        data: { url, filename, mimeType: contentType, size: buffer.length, folder, uploadedById: session.user.id },
      });
      mediaId = media.id;
    } catch (e) {
      console.error('Media record create failed:', e);
    }
    return NextResponse.json({ url, mediaId, kind: 'video' });
  }

  // Auto-compress EVERY raster image (not just large ones), preserving the
  // format so transparency isn't lost. Resize down to a sane max and re-encode
  // at high (near-lossless) quality — visually the same, much smaller on disk.
  // GIFs are left untouched (they may be animated).
  void OPTIMIZE_THRESHOLD;
  if (contentType !== 'image/gif') {
    const img = sharp(buffer).rotate().resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true });
    if (contentType === 'image/png') {
      buffer = await img.png({ compressionLevel: 9 }).toBuffer();
    } else if (contentType === 'image/webp') {
      buffer = await img.webp({ quality: 82 }).toBuffer();
    } else {
      buffer = await img.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      contentType = 'image/jpeg';
    }
  }

  // XeeTimes-owned photos get the logo watermark, composited with a soft drop
  // shadow so it reads on light or dark photos.
  if (String(formData.get('watermark') || '') === '1') {
    try {
      // Whitelisted, never interpolated from the request: this value ends up in
      // a filesystem path, and a free-form one would be a traversal.
      const wmLogo = WM_LOGOS.has(String(formData.get('wmLogo') || '')) 
        ? String(formData.get('wmLogo'))
        : 'red-word-white';
      const wmPos = WM_POSITIONS.has(String(formData.get('wmPos') || ''))
        ? (String(formData.get('wmPos')) as WmPos)
        : 'bottom-left';
      const wmSize = WM_SIZES[String(formData.get('wmSize') || '')] ?? WM_SIZES.small;
      // Clamped rather than trusted: an opacity outside 20-100 would either
      // erase the mark or do nothing, and neither is worth honouring.
      const wmOpacity = Math.min(100, Math.max(20, parseInt(String(formData.get('wmOpacity') || '100'), 10) || 100)) / 100;

      // Crop to the house shape BEFORE stamping, so the mark is placed against
      // the final frame rather than against whatever the camera happened to
      // produce and then re-cropped later by a card or a thumbnail.
      //
      // Never upscales. sharp's withoutEnlargement would have been the obvious
      // way to express that, but combined with fit:cover it declines to crop a
      // small image AT ALL — a 1200x900 photo came back untouched at 1200x900,
      // so the shape would not have been normalised for exactly the photos that
      // need it most. Capping the target instead keeps the 1640:924 shape at
      // whatever resolution the source can honestly fill.
      const src = await sharp(buffer).metadata();
      const sw = src.width || 0, sh = src.height || 0;
      if (sw && sh) {
        let tw = Math.min(WM_CANVAS.width, sw);
        let th = Math.round(tw / WM_CANVAS_AR);
        if (th > sh) {
          th = Math.min(WM_CANVAS.height, sh);
          tw = Math.round(th * WM_CANVAS_AR);
        }
        // No explicit output format: keep whatever came in, or a PNG upload
        // would become JPEG bytes while contentType still said image/png.
        buffer = await sharp(buffer)
          .resize(tw, th, { fit: 'cover', position: 'attention' })
          .toBuffer();
      }

      const meta = await sharp(buffer).metadata();
      const imgW = meta.width || 1200, imgH = meta.height || 800;
      // A consistent proportion of the image width (no tight min/max caps) so the
      // logo appears the SAME size on every photo once it's displayed at a fixed
      // container width — earlier caps made small vs large photos differ.
      const logoW = Math.max(60, Math.min(wmSize >= 0.3 ? 900 : 400, Math.round(imgW * wmSize)));
      let logo = await sharp(path.join(process.cwd(), 'public/watermarks', `${wmLogo}.png`))
        .resize({ width: logoW }).ensureAlpha().png().toBuffer();
      if (wmOpacity < 1) {
        // Scale the existing alpha rather than flattening: the mark already has
        // soft edges and transparent regions, and a blanket alpha would harden
        // both.
        const px = await sharp(logo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        for (let i = 3; i < px.data.length; i += 4) px.data[i] = Math.round(px.data[i] * wmOpacity);
        logo = await sharp(px.data, { raw: px.info }).png().toBuffer();
      }
      const rm = await sharp(logo).metadata();
      const lw = rm.width || logoW, lh = rm.height || logoW;
      // Soft shadow from the logo's own alpha for legibility on busy photos.
      const alpha = await sharp(logo).extractChannel('alpha').toColourspace('b-w').raw().toBuffer();
      const shadowAlpha = Buffer.from(alpha.map((v) => Math.round(v * 0.5 * wmOpacity)));
      const shadow = await sharp({ create: { width: lw, height: lh, channels: 3, background: '#000000' } })
        .joinChannel(shadowAlpha, { raw: { width: lw, height: lh, channels: 1 } }).png().blur(4).toBuffer();

      // Measured off the old site's own watermarks: the mark sat 6.2% of the
      // width in from the left and 12.6% of the height up from the bottom. The
      // previous 2.5%+6px put it about half that far in, so it read as stuck to
      // the corner. Proportional to width on both axes so it holds at any size.
      const margin = Math.round(imgW * 0.055);
      const atStart = wmPos.endsWith('left');
      const atTop = wmPos.startsWith('top');
      const left = wmPos === 'center' ? Math.round((imgW - lw) / 2)
        : atStart ? margin : Math.max(0, imgW - lw - margin);
      const top = wmPos === 'center' ? Math.round((imgH - lh) / 2)
        : atTop ? margin : Math.max(0, imgH - lh - margin);

      buffer = await sharp(buffer)
        .composite([
          { input: shadow, left: left + 2, top: top + 4 },
          { input: logo, left, top },
        ])
        .jpeg({ quality: 85 })
        .toBuffer();
      contentType = 'image/jpeg';
    } catch (e) {
      console.error('Watermark failed:', e);
    }
  }

  // Extension is derived from the validated content type, never from the
  // user-supplied filename.
  const ext = EXT_BY_TYPE[contentType] || 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const url = await uploadFile(folder, buffer, filename, contentType);

  // record it in the Media library (categorized by folder)
  let mediaId: string | undefined;
  try {
    const media = await db.media.create({
      data: { url, filename, mimeType: contentType, size: buffer.length, folder, uploadedById: session.user.id },
    });
    mediaId = media.id;
  } catch (e) {
    console.error('Media record create failed:', e);
  }

  return NextResponse.json({ id: mediaId, url, filename, size: buffer.length, type: contentType });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

  await deleteFile(url);
  return NextResponse.json({ success: true });
}

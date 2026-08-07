import { NextResponse } from 'next/server';
import path from 'node:path';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { uploadFile, deleteFile } from '@/lib/supabase-storage';
import sharp from 'sharp';

// Watermark options. Both lists are whitelists — wmLogo becomes part of a
// filesystem path, so it can never come straight from the request.
const WM_LOGOS = new Set([
  'red-word-white', 'red-word-dark', 'red-mark',
  'black-word-white', 'black-word-dark', 'black-mark',
]);
type WmPos = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'center';
const WM_POSITIONS = new Set<string>(['bottom-left', 'bottom-right', 'top-left', 'top-right', 'center']);

// SVG is intentionally excluded: it can embed <script> and would be served
// same-origin, making it a stored-XSS vector. We only accept raster images.
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
};
const ALLOWED_TYPES = Object.keys(EXT_BY_TYPE);
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB upload limit
const OPTIMIZE_THRESHOLD = 1 * 1024 * 1024; // optimize if over 1MB
const MAX_DIMENSION = 2000; // max width/height after resize

// Keep folder names to a safe whitelist so a crafted value can't escape the
// upload directory via path traversal (e.g. "../../app").
function safeFolder(raw: unknown): string {
  const s = String(raw ?? '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
  return s || 'general';
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
  if (file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
  }

  let buffer: Buffer = Buffer.from(await file.arrayBuffer());
  let contentType = file.type;

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

      const meta = await sharp(buffer).metadata();
      const imgW = meta.width || 1200, imgH = meta.height || 800;
      // A consistent proportion of the image width (no tight min/max caps) so the
      // logo appears the SAME size on every photo once it's displayed at a fixed
      // container width — earlier caps made small vs large photos differ.
      // Centre is the "cover this" mark (a face, a plate), so it is much larger:
      // a corner-sized mark in the middle of a photo reads as a mistake.
      const scale = wmPos === 'center' ? 0.34 : 0.12;
      const logoW = Math.max(70, Math.min(wmPos === 'center' ? 900 : 360, Math.round(imgW * scale)));
      const logo = await sharp(path.join(process.cwd(), 'public/watermarks', `${wmLogo}.png`))
        .resize({ width: logoW }).ensureAlpha().png().toBuffer();
      const rm = await sharp(logo).metadata();
      const lw = rm.width || logoW, lh = rm.height || logoW;
      // Soft shadow from the logo's own alpha for legibility on busy photos.
      const alpha = await sharp(logo).extractChannel('alpha').toColourspace('b-w').raw().toBuffer();
      const shadowAlpha = Buffer.from(alpha.map((v) => Math.round(v * 0.5)));
      const shadow = await sharp({ create: { width: lw, height: lh, channels: 3, background: '#000000' } })
        .joinChannel(shadowAlpha, { raw: { width: lw, height: lh, channels: 1 } }).png().blur(4).toBuffer();

      const margin = Math.round(imgW * 0.025) + 6;
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

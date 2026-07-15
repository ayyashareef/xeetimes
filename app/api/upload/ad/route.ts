import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadFile } from '@/lib/supabase-storage';
import { AD_SLOT_MAP } from '@/lib/ad-slots';
import sharp from 'sharp';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const slot = String(formData.get('slot') || '');

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  const def = AD_SLOT_MAP[slot];
  if (!def) return NextResponse.json({ error: 'Invalid ad slot' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use JPG, PNG, WebP, or GIF.' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
  }

  const input: Buffer = Buffer.from(await file.arrayBuffer());
  let out: Buffer = input;
  let ext = 'jpg';
  let contentType = 'image/jpeg';

  if (file.type === 'image/gif') {
    // Keep GIFs as-is so animation is preserved (banners are usually animated).
    ext = 'gif';
    contentType = 'image/gif';
  } else {
    // Raster: scale to the slot width, keep the aspect ratio (no cropping) so
    // the whole ad shows — tall/portrait creatives aren't chopped.
    out = await sharp(input)
      .resize({ width: def.w, withoutEnlargement: false })
      .jpeg({ quality: 88 })
      .toBuffer();
  }

  const filename = `ad-${slot.toLowerCase()}-${Date.now()}.${ext}`;
  const url = await uploadFile('ads', out, filename, contentType);

  return NextResponse.json({ url, filename, size: out.length, type: contentType, width: def.w, height: def.h });
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadFile } from '@/lib/supabase-storage';
import { AD_SLOT_MAP } from '@/lib/ad-slots';
import sharp from 'sharp';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
// What may be UPLOADED. Bigger than what is served: the file is compressed
// below, and the old 5MB cap rejected animated banners before that could
// happen. Well under nginx's 80M so the app's own message is what the desk
// sees, not a bare 413 from the web server.
const MAX_SIZE = 25 * 1024 * 1024;

// Animated GIFs are the one format that used to be stored exactly as sent, to
// keep the animation — so an advertiser's 12MB export was 12MB on every page
// for every reader. sharp can re-encode animation (libvips carries GIF output),
// so they are now resized and re-encoded like everything else.
//
// Not resized to the slot's 4000px design width: that would ENLARGE a banner
// GIF and make the file worse. A top banner is never displayed wider than
// ~1400 CSS px, and a 256-colour animation gains nothing past this.
const GIF_MAX_WIDTH = 1600;
// Tried in order until the result fits. Fewer colours and a higher inter-frame
// tolerance are what actually shrink a GIF; dropping the frame rate would
// change the animation, so it is not touched.
//
// TWO passes, not three. Each one re-decodes the whole filmstrip — measured at
// ~17s for a real 4000x800, 198-frame banner — so a third attempt buys a little
// size at the cost of another 17 seconds with the desk watching a progress bar.
const GIF_PASSES = [
  { colours: 256, interFrameMaxError: 4 },
  { colours: 64, interFrameMaxError: 16 },
];
// effort 4, not sharp's 7. Measured on that same banner: 946 KB in 17s against
// 904 KB in 26s — a third of the time for 5% more file.
const GIF_EFFORT = 4;
// What a reader should have to download for a banner that appears on every page.
const GIF_TARGET_BYTES = 2 * 1024 * 1024;

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
    ext = 'gif';
    contentType = 'image/gif';
    // animated: true reads every frame; without it sharp takes frame one and
    // the banner silently stops moving.
    //
    // limitInputPixels: false is not optional here. An animated GIF is decoded
    // as one tall filmstrip — width x height x frames — and a real banner
    // (4000x800, 198 frames) is 633 megapixels, far past sharp's default
    // ceiling. Without it every large GIF threw, the catch below stored the
    // original, and the compression silently never ran on the exact files it
    // exists for.
    try {
      const meta = await sharp(input, { animated: true, limitInputPixels: false }).metadata();
      const width = Math.min(GIF_MAX_WIDTH, meta.width || GIF_MAX_WIDTH);
      for (const pass of GIF_PASSES) {
        const candidate = await sharp(input, { animated: true, limitInputPixels: false })
          .resize({ width, withoutEnlargement: true })
          .gif({ effort: GIF_EFFORT, ...pass })
          .toBuffer();
        out = candidate;
        if (candidate.length <= GIF_TARGET_BYTES) break;
      }
      // Never ship something worse than what was handed to us. A short, already
      // optimised GIF can come out bigger after a re-encode.
      if (out.length >= input.length) out = input;
    } catch {
      // A GIF sharp cannot decode is still a usable ad — store the original
      // rather than failing the upload in front of the advertiser.
      out = input;
    }
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

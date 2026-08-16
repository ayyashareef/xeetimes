import { renderShareCard } from '@/lib/share-card';

// Facebook, WhatsApp, Telegram, Viber and the rest read og:image and land here.
// The romanised headline is printed on this one because Facebook receives
// og:description and refuses to draw it — putting it in the picture is the only
// way it reaches a Facebook reader.
//
// X has its own file next to this one; see twitter-image.tsx for why.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const alt = 'XeeTimes';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/jpeg';

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return renderShareCard({ id, withLatin: true });
}

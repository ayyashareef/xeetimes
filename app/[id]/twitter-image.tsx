import { renderShareCard } from '@/lib/share-card';

// X's card, without the romanised line under the headline.
//
// This exists as a SEPARATE ROUTE rather than a branch inside the OG image
// because both platforms were being handed the same URL. Which version each
// received then came down to the user agent that fetched that URL — and X does
// not fetch the picture with the same agent it fetches the page, so it kept
// getting Facebook's version no matter what the page said.
//
// Next emits twitter:image pointing here on its own, so the URL itself now
// carries the decision and nothing has to be sniffed.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const alt = 'XeeTimes';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/jpeg';

export default async function TwitterImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The headline stays on this card. X also prints its own title in a box over
  // the image, so the Dhivehi appears twice — the newsroom looked at both and
  // chose the large headline over a clean photograph.
  return renderShareCard({ id, withLatin: false });
}

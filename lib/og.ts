// The site-wide default share card, as an explicit metadata value.
//
// Next merges a file-based opengraph-image into a page's metadata only when the
// two sit in the SAME route segment. A page deeper in the tree that returns its
// own `openGraph` object shadows the ancestor card completely — so /category/*,
// /our-team and /support-our-work were shipping with no og:image at all while
// the homepage, which lives beside app/opengraph-image.tsx, was fine.
//
// Spreading this into those pages' openGraph is the fix. Any new page that sets
// its own openGraph should do the same unless it supplies a card of its own.
export const DEFAULT_OG_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: 'XeeTimes',
};

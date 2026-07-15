'use client';

import { useEffect } from 'react';

// Records one view per article page load. Kept client-side (like ad impressions)
// so only real browsers count — social scrapers and crawlers that don't run JS
// don't inflate the number. Rendered only for PUBLISHED articles by the page.
export default function ArticleViewBeacon({ id }: { id: string }) {
  useEffect(() => {
    if (!id) return;
    fetch('/api/articles/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
      keepalive: true,
    }).catch(() => {});
  }, [id]);
  return null;
}

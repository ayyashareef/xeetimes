import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { maldivesDay } from '@/lib/day';

// Increment an article's view counter. Only PUBLISHED articles are counted
// (the where-clause guard), so admin previews of drafts can never inflate it.
export async function POST(request: Request) {
  let id = '';
  try {
    const body = await request.json();
    if (typeof body?.id === 'string') id = body.id;
  } catch {
    id = new URL(request.url).searchParams.get('id') || '';
  }

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const hit = await db.article.updateMany({
    where: { id, status: 'PUBLISHED' },
    data: { viewCount: { increment: 1 } },
  });

  // Same view, counted a second time against the day, so the dashboard can show
  // a trend rather than only a lifetime total. Guarded on `hit.count` so a bad
  // or unpublished id cannot inflate the daily figure after the article update
  // above declined it.
  if (hit.count > 0) {
    const day = maldivesDay();
    // Racing writers are fine: the increment happens in the database, and the
    // create only runs when the row does not exist yet.
    await db.dailyStat
      .upsert({ where: { day }, update: { views: { increment: 1 } }, create: { day, views: 1 } })
      // A failed stat write must never cost the reader their view — the article
      // counter has already been incremented and that is the number that matters.
      .catch(() => {});
  }

  return NextResponse.json({ success: true });
}

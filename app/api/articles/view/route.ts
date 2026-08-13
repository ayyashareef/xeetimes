import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { maldivesDay } from '@/lib/day';
import { visitorId, visitorCountry } from '@/lib/visitor';

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
    const vid = visitorId(request);
    const country = visitorCountry(request);

    // Three counters, all upserts, so concurrent readers cannot collide:
    //   dailyStat   — page loads that day
    //   visitorDay  — one row per person per day (uniques, country, realtime)
    //   visitor     — the day this person was first seen ever (new vs returning)
    //
    // Every one swallows its own errors: a statistics failure must never cost a
    // reader their view, which has already been counted above.
    await Promise.all([
      db.dailyStat
        .upsert({ where: { day }, update: { views: { increment: 1 } }, create: { day, views: 1 } })
        .catch(() => {}),
      db.visitorDay
        .upsert({
          where: { day_vid: { day, vid } },
          // lastSeen is refreshed on every view — it is what "active in the last
          // 30 minutes" reads.
          update: { lastSeen: new Date(), ...(country ? { country } : {}) },
          create: { day, vid, country },
        })
        .catch(() => {}),
      // create-only: firstDay must keep the FIRST day, so a returning reader is
      // never quietly re-labelled as new.
      db.visitor.upsert({ where: { vid }, update: {}, create: { vid, firstDay: day } }).catch(() => {}),
    ]);
  }

  return NextResponse.json({ success: true });
}

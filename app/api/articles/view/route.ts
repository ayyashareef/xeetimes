import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

  await db.article.updateMany({
    where: { id, status: 'PUBLISHED' },
    data: { viewCount: { increment: 1 } },
  });

  return NextResponse.json({ success: true });
}

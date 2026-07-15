import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // updateMany (not update) so a stale/unknown id is a no-op instead of a 500.
  await db.advertisement.updateMany({
    where: { id },
    data: { clickCount: { increment: 1 } },
  });

  return NextResponse.json({ success: true });
}

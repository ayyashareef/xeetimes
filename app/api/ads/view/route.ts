import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Record an impression for each rendered ad. Called once per page load by the
// public shell with the ids of the ads actually shown on that page (so slots
// that aren't rendered on this page don't get counted).
export async function POST(request: Request) {
  let ids: string[] = [];
  try {
    const body = await request.json();
    if (Array.isArray(body?.ids)) {
      ids = body.ids.filter((x: unknown): x is string => typeof x === 'string');
    }
  } catch {
    const id = new URL(request.url).searchParams.get('id');
    if (id) ids = [id];
  }

  ids = Array.from(new Set(ids)).slice(0, 50);
  if (!ids.length) return NextResponse.json({ error: 'Missing ids' }, { status: 400 });

  await db.advertisement.updateMany({
    where: { id: { in: ids } },
    data: { viewCount: { increment: 1 } },
  });

  return NextResponse.json({ success: true, counted: ids.length });
}

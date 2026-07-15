import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slot = searchParams.get('slot');

  if (!slot) return NextResponse.json(null);

  const now = new Date();

  const ad = await db.advertisement.findFirst({
    where: {
      slot: slot as any,
      isActive: true,
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: now }, endDate: null },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: { gte: now } },
      ],
    },
    select: { id: true, imageUrl: true, linkUrl: true, title: true },
  });

  if (ad) {
    // Increment view count (fire and forget)
    db.advertisement.update({
      where: { id: ad.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});
  }

  return NextResponse.json(ad);
}

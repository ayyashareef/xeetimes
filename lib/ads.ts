import { db } from '@/lib/db';
import type { AdsMap } from '@/lib/ad-slots';

// Fetch the active ad for every slot (respecting the optional schedule window)
// and return a slot -> ad map for the public builders. Newest wins per slot.
export async function getActiveAds(): Promise<AdsMap> {
  const now = new Date();
  const ads = await db.advertisement.findMany({
    where: {
      isActive: true,
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: now }, endDate: null },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: { gte: now } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, imageUrl: true, linkUrl: true, title: true, slot: true },
  });
  const map: AdsMap = {};
  for (const a of ads) {
    if (!map[a.slot]) map[a.slot] = { id: a.id, imageUrl: a.imageUrl, linkUrl: a.linkUrl, title: a.title };
  }
  return map;
}

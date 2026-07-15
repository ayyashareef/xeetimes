import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';

export async function GET() {
  const ads = await db.advertisement.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(ads);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';
  if (!hasPermission(userRole, 'ad:manage')) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const { title, imageUrl, linkUrl, slot, isActive, startDate, endDate } = await request.json();

  const ad = await db.advertisement.create({
    data: {
      title,
      imageUrl,
      linkUrl,
      slot,
      isActive: isActive ?? true,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  await logAudit({ userId: session.user.id, action: 'create', entity: 'Ad', entityId: ad.id, details: { title: ad.title, slot: ad.slot } });
  return NextResponse.json(ad, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';
  if (!hasPermission(userRole, 'ad:manage')) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const { id, title, imageUrl, linkUrl, slot, isActive, startDate, endDate } = await request.json();

  const ad = await db.advertisement.update({
    where: { id },
    data: {
      title,
      imageUrl,
      linkUrl,
      slot,
      isActive,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  await logAudit({ userId: session.user.id, action: 'update', entity: 'Ad', entityId: ad.id, details: { title: ad.title, slot: ad.slot, isActive: ad.isActive } });
  return NextResponse.json(ad);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';
  if (!hasPermission(userRole, 'ad:manage')) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  await db.advertisement.delete({ where: { id } });
  await logAudit({ userId: session.user.id, action: 'delete', entity: 'Ad', entityId: id });
  return NextResponse.json({ success: true });
}

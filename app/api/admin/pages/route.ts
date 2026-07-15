import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';

export async function GET() {
  const pages = await db.page.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(pages);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';
  if (!hasPermission(userRole, 'settings:manage')) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const { slug, title_en, title_dv, content_en, content_dv, isActive } = await request.json();

  const page = await db.page.create({
    data: { slug, title_en, title_dv, content_en, content_dv, isActive: isActive ?? true },
  });

  await logAudit({ userId: session.user.id, action: 'create', entity: 'Page', entityId: page.id, details: { slug: page.slug } });
  return NextResponse.json(page, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';
  if (!hasPermission(userRole, 'settings:manage')) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const { id, title_en, title_dv, content_en, content_dv, isActive } = await request.json();

  const page = await db.page.update({
    where: { id },
    data: { title_en, title_dv, content_en, content_dv, isActive },
  });

  await logAudit({ userId: session.user.id, action: 'update', entity: 'Page', entityId: page.id, details: { slug: page.slug, isActive: page.isActive } });
  return NextResponse.json(page);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';
  if (!hasPermission(userRole, 'settings:manage')) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  await db.page.delete({ where: { id } });
  await logAudit({ userId: session.user.id, action: 'delete', entity: 'Page', entityId: id });
  return NextResponse.json({ success: true });
}

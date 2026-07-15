import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import slugify from 'slugify';

export async function GET() {
  const tags = await db.tag.findMany({
    orderBy: { name_en: 'asc' },
    include: { _count: { select: { articles: true } } },
  });

  return NextResponse.json(tags);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';
  if (!hasPermission(userRole, 'tag:manage')) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const { name_dv, name_en } = await request.json();
  if (!name_dv && !name_en) {
    return NextResponse.json({ error: 'Tag name required' }, { status: 400 });
  }
  // Thaana names slugify to '' (strict strips non-Latin) — fall back to a
  // unique generated slug so Dhivehi-only tags can be created.
  let slug = slugify(name_en || name_dv || '', { lower: true, strict: true })
    || `tag-${Date.now().toString(36)}`;

  let tag;
  try {
    tag = await db.tag.create({ data: { slug, name_dv, name_en } });
  } catch (e) {
    // Slug taken — retry once with a unique suffix.
    if ((e as { code?: string })?.code !== 'P2002') throw e;
    slug = `${slug}-${Date.now().toString(36)}`;
    tag = await db.tag.create({ data: { slug, name_dv, name_en } });
  }

  await logAudit({ userId: session.user.id, action: 'create', entity: 'Tag', entityId: tag.id, details: { name: tag.name_dv || tag.name_en } });
  return NextResponse.json(tag, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';
  if (!hasPermission(userRole, 'tag:manage')) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const { id, name_dv, name_en } = await request.json();

  const tag = await db.tag.update({
    where: { id },
    data: { name_dv, name_en },
  });

  await logAudit({ userId: session.user.id, action: 'update', entity: 'Tag', entityId: tag.id, details: { name: tag.name_dv || tag.name_en } });
  return NextResponse.json(tag);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';
  if (!hasPermission(userRole, 'tag:manage')) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  await db.tag.delete({ where: { id } });
  await logAudit({ userId: session.user.id, action: 'delete', entity: 'Tag', entityId: id });
  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import slugify from 'slugify';

export async function GET() {
  const categories = await db.category.findMany({
    orderBy: { order: 'asc' },
    include: {
      parent: { select: { name_en: true, name_dv: true } },
      _count: { select: { articles: true } },
    },
  });

  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';
  if (!hasPermission(userRole, 'category:manage')) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const { name_dv, name_en, description_dv, description_en, parentId, order } = await request.json();

  const slug = slugify(name_en, { lower: true, strict: true });

  const category = await db.category.create({
    data: {
      slug,
      name_dv,
      name_en,
      description_dv,
      description_en,
      parentId: parentId || null,
      order: order || 0,
    },
  });

  await logAudit({ userId: session.user.id, action: 'create', entity: 'Category', entityId: category.id, details: { name: category.name_dv } });
  return NextResponse.json(category, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';
  if (!hasPermission(userRole, 'category:manage')) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const { id, name_dv, name_en, description_dv, description_en, parentId, order, isActive } = await request.json();

  const category = await db.category.update({
    where: { id },
    data: {
      name_dv,
      name_en,
      description_dv,
      description_en,
      parentId: parentId || null,
      order,
      isActive,
    },
  });

  await logAudit({ userId: session.user.id, action: 'update', entity: 'Category', entityId: category.id, details: { name: category.name_dv, isActive: category.isActive } });
  return NextResponse.json(category);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';
  if (!hasPermission(userRole, 'category:manage')) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  // Check for articles using this category
  const articleCount = await db.article.count({ where: { categoryId: id } });
  if (articleCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${articleCount} articles use this category` },
      { status: 400 }
    );
  }

  await db.category.delete({ where: { id } });
  await logAudit({ userId: session.user.id, action: 'delete', entity: 'Category', entityId: id });
  return NextResponse.json({ success: true });
}

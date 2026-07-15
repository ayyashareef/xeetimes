import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const filter = searchParams.get('filter'); // 'pending', 'approved', 'all'

  const where: Record<string, unknown> = {};
  if (filter === 'pending') where.isApproved = false;
  if (filter === 'approved') where.isApproved = true;

  const [comments, total] = await Promise.all([
    db.comment.findMany({
      where: where as any,
      include: {
        article: { select: { title_en: true, title_dv: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.comment.count({ where: where as any }),
  ]);

  return NextResponse.json({ comments, total, page, totalPages: Math.ceil(total / limit) });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';
  if (!hasPermission(userRole, 'comment:moderate')) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const { id, isApproved, content } = await request.json();

  const comment = await db.comment.update({
    where: { id },
    data: {
      ...(isApproved !== undefined && { isApproved }),
      ...(content !== undefined && { content }),
    },
  });

  await logAudit({
    userId: session.user.id,
    action: isApproved === true ? 'approve' : isApproved === false ? 'reject' : 'update',
    entity: 'Comment',
    entityId: comment.id,
  });
  return NextResponse.json(comment);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';
  if (!hasPermission(userRole, 'comment:moderate')) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  await db.comment.delete({ where: { id } });
  await logAudit({ userId: session.user.id, action: 'delete', entity: 'Comment', entityId: id });
  return NextResponse.json({ success: true });
}

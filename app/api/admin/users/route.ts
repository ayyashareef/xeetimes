import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';
  const canManage = hasPermission(userRole, 'user:manage');
  // Editors (article:edit_any) may fetch a limited author list so they can
  // reassign an article's author — no emails/usernames, just display fields.
  if (!canManage && !hasPermission(userRole, 'article:edit_any')) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const users = await db.user.findMany({
    select: canManage
      ? { id: true, name: true, name_dv: true, email: true, username: true, role: true, isActive: true, createdAt: true, avatar: true }
      : { id: true, name: true, name_dv: true, role: true, avatar: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';
  if (!hasPermission(userRole, 'user:manage')) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const { name, name_dv, email, username, password, role, isActive, avatar } = await request.json();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 400 });

  const cleanUsername = typeof username === 'string' && username.trim() ? username.trim() : null;
  if (cleanUsername) {
    const taken = await db.user.findUnique({ where: { username: cleanUsername } });
    if (taken) return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await db.user.create({
    data: { name, name_dv, email, username: cleanUsername, password: hashedPassword, role, isActive: isActive ?? true, avatar: avatar || null },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  await logAudit({ userId: session.user.id, action: 'create', entity: 'User', entityId: user.id, details: { email: user.email, role: user.role } });
  return NextResponse.json(user, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';
  if (!hasPermission(userRole, 'user:manage')) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const { id, name, name_dv, email, username, password, role, isActive, avatar } = await request.json();

  const data: Record<string, unknown> = { name, name_dv, email, role, isActive };
  if (typeof avatar === 'string') data.avatar = avatar || null;
  if (typeof username === 'string') {
    const cleanUsername = username.trim() || null;
    if (cleanUsername) {
      const taken = await db.user.findUnique({ where: { username: cleanUsername } });
      if (taken && taken.id !== id) return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }
    data.username = cleanUsername;
  }
  if (password) {
    data.password = await bcrypt.hash(password, 12);
  }

  const user = await db.user.update({
    where: { id },
    data: data as any,
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  await logAudit({ userId: session.user.id, action: 'update', entity: 'User', entityId: user.id, details: { email: user.email, role: user.role, isActive: user.isActive } });
  return NextResponse.json(user);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session.user as { role: string }).role as 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';
  if (!hasPermission(userRole, 'user:manage')) {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  if (id === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  }

  await db.user.delete({ where: { id } });
  await logAudit({ userId: session.user.id, action: 'delete', entity: 'User', entityId: id });
  return NextResponse.json({ success: true });
}

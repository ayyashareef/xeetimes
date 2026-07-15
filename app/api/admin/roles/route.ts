import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  ALL_PERMISSIONS,
  defaultRolePermissions,
  type Permission,
} from '@/lib/permissions';
import type { Role } from '@prisma/client';
import { logAudit } from '@/lib/audit';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role: string }).role;
  if (userRole !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  try {
    const settings = await db.siteSettings.findUnique({
      where: { id: 'default' },
    });

    if (settings?.rolePermissions) {
      const stored = settings.rolePermissions as Record<string, string[]>;
      // Always ensure SUPER_ADMIN has all permissions
      const result: Record<string, string[]> = {
        SUPER_ADMIN: [...ALL_PERMISSIONS],
        EDITOR: stored.EDITOR ?? defaultRolePermissions.EDITOR,
        JOURNALIST: stored.JOURNALIST ?? defaultRolePermissions.JOURNALIST,
        MODERATOR: stored.MODERATOR ?? defaultRolePermissions.MODERATOR,
      };
      return NextResponse.json(result);
    }

    return NextResponse.json(defaultRolePermissions);
  } catch {
    return NextResponse.json(defaultRolePermissions);
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role: string }).role;
  if (userRole !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const permissions = body as Record<string, string[]>;

    // Validate all permission values
    const validRoles: Role[] = ['EDITOR', 'JOURNALIST', 'MODERATOR'];
    for (const role of validRoles) {
      if (permissions[role]) {
        const invalid = permissions[role].filter(
          (p: string) => !ALL_PERMISSIONS.includes(p as Permission)
        );
        if (invalid.length > 0) {
          return NextResponse.json(
            { error: `Invalid permissions: ${invalid.join(', ')}` },
            { status: 400 }
          );
        }
      }
    }

    // Always enforce SUPER_ADMIN has all permissions
    const toStore: Record<string, string[]> = {
      SUPER_ADMIN: [...ALL_PERMISSIONS],
      EDITOR: permissions.EDITOR ?? defaultRolePermissions.EDITOR,
      JOURNALIST: permissions.JOURNALIST ?? defaultRolePermissions.JOURNALIST,
      MODERATOR: permissions.MODERATOR ?? defaultRolePermissions.MODERATOR,
    };

    await db.siteSettings.upsert({
      where: { id: 'default' },
      update: {
        rolePermissions: toStore,
      },
      create: {
        id: 'default',
        siteName_dv: 'ޒީ ޓައިމްސް',
        siteName_en: 'XeeTimes',
        rolePermissions: toStore,
      },
    });

    await logAudit({ userId: session.user.id, action: 'update', entity: 'Role', details: { roles: Object.keys(toStore) } });
    return NextResponse.json(toStore);
  } catch (error) {
    console.error('Error saving role permissions:', error);
    return NextResponse.json(
      { error: 'Failed to save role permissions' },
      { status: 500 }
    );
  }
}

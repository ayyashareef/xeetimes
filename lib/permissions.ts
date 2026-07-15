import { Role } from '@prisma/client';

export type Permission =
  | 'article:create'
  | 'article:edit_own'
  | 'article:edit_any'
  | 'article:delete'
  | 'article:publish'
  | 'article:schedule'
  | 'article:view_all'
  | 'category:manage'
  | 'tag:manage'
  | 'media:manage'
  | 'user:manage'
  | 'settings:manage'
  | 'comment:moderate'
  | 'audit:view'
  | 'ad:manage';

export const ALL_PERMISSIONS: Permission[] = [
  'article:create',
  'article:edit_own',
  'article:edit_any',
  'article:delete',
  'article:publish',
  'article:schedule',
  'article:view_all',
  'category:manage',
  'tag:manage',
  'media:manage',
  'user:manage',
  'settings:manage',
  'comment:moderate',
  'audit:view',
  'ad:manage',
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  'article:create': 'Create Articles',
  'article:edit_own': 'Edit Own Articles',
  'article:edit_any': 'Edit Any Article',
  'article:delete': 'Delete Articles',
  'article:publish': 'Publish Articles',
  'article:schedule': 'Schedule Articles',
  'article:view_all': 'View All Articles',
  'category:manage': 'Manage Categories',
  'tag:manage': 'Manage Tags',
  'media:manage': 'Manage Media',
  'user:manage': 'Manage Users',
  'settings:manage': 'Manage Settings',
  'comment:moderate': 'Moderate Comments',
  'audit:view': 'View Audit Log',
  'ad:manage': 'Manage Advertisements',
};

export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: 'Articles',
    permissions: [
      'article:create',
      'article:edit_own',
      'article:edit_any',
      'article:delete',
      'article:publish',
      'article:schedule',
      'article:view_all',
    ],
  },
  {
    label: 'Content Management',
    permissions: [
      'category:manage',
      'tag:manage',
      'media:manage',
      'comment:moderate',
      'ad:manage',
    ],
  },
  {
    label: 'Administration',
    permissions: [
      'user:manage',
      'settings:manage',
      'audit:view',
    ],
  },
];

export const ALL_ROLES: Role[] = ['SUPER_ADMIN', 'EDITOR', 'JOURNALIST', 'MODERATOR'];

export const defaultRolePermissions: Record<Role, Permission[]> = {
  SUPER_ADMIN: [...ALL_PERMISSIONS],
  EDITOR: [
    'article:create',
    'article:edit_own',
    'article:edit_any',
    'article:delete',
    'article:publish',
    'article:schedule',
    'article:view_all',
    'category:manage',
    'tag:manage',
    'media:manage',
    'comment:moderate',
    'audit:view',
    'ad:manage',
  ],
  JOURNALIST: [
    'article:create',
    'article:edit_own',
    'tag:manage',
    'media:manage',
  ],
  MODERATOR: [
    'comment:moderate',
  ],
};

/**
 * Fetch role permissions from the database, falling back to hardcoded defaults.
 * This is used server-side to get the current effective permissions.
 */
export async function getRolePermissions(): Promise<Record<Role, Permission[]>> {
  try {
    const { db } = await import('@/lib/db');
    const settings = await db.siteSettings.findUnique({ where: { id: 'default' } });

    if (settings?.rolePermissions) {
      const stored = settings.rolePermissions as Record<string, string[]>;
      // Always ensure SUPER_ADMIN has all permissions
      const result: Record<Role, Permission[]> = {
        SUPER_ADMIN: [...ALL_PERMISSIONS],
        EDITOR: (stored.EDITOR as Permission[]) ?? defaultRolePermissions.EDITOR,
        JOURNALIST: (stored.JOURNALIST as Permission[]) ?? defaultRolePermissions.JOURNALIST,
        MODERATOR: (stored.MODERATOR as Permission[]) ?? defaultRolePermissions.MODERATOR,
      };
      return result;
    }
  } catch {
    // Fall back to defaults on any error
  }

  return { ...defaultRolePermissions };
}

/**
 * Check if a role has a specific permission.
 * Uses the hardcoded defaults for synchronous checks (e.g., in middleware).
 * For database-backed checks, use hasPermissionAsync.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return defaultRolePermissions[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has a specific permission, loading from database.
 */
export async function hasPermissionAsync(role: Role, permission: Permission): Promise<boolean> {
  const perms = await getRolePermissions();
  return perms[role]?.includes(permission) ?? false;
}

export function canEditArticle(role: Role, authorId: string, currentUserId: string): boolean {
  if (hasPermission(role, 'article:edit_any')) return true;
  if (hasPermission(role, 'article:edit_own') && authorId === currentUserId) return true;
  return false;
}

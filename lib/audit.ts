import { headers } from 'next/headers';
import { db } from './db';

type AuditInput = {
  userId: string;
  action: string; // create | update | delete | publish | approve | reject | login ...
  entity: string; // Article | Category | Comment | User | Ad | Media | Tag | Page | Settings | Role
  entityId?: string | null;
  details?: unknown; // small JSON summary (e.g. { title, status })
};

// Record an admin action in the AuditLog. Never throws — audit logging must not
// break the actual request. Captures IP + user-agent from the request headers.
export async function logAudit({ userId, action, entity, entityId, details }: AuditInput): Promise<void> {
  try {
    let ipAddress: string | null = null;
    let userAgent: string | null = null;
    try {
      const h = await headers();
      ipAddress = (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || null;
      userAgent = h.get('user-agent') || null;
    } catch {
      /* headers() not available in this context */
    }
    await db.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entityId ?? null,
        // Prisma Json column — undefined omits it.
        details: (details as object | undefined) ?? undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (e) {
    console.error('[audit] failed to write log:', e);
  }
}

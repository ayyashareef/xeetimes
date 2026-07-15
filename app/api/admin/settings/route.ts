import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function GET() {
  const settings = await db.siteSettings.findUnique({ where: { id: 'default' } });
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = (session.user as { role: string }).role;
  if (userRole !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'No permission' }, { status: 403 });
  }

  const body = await request.json();

  const settings = await db.siteSettings.upsert({
    where: { id: 'default' },
    update: {
      siteName_dv: body.siteName_dv,
      siteName_en: body.siteName_en,
      siteDescription_dv: body.siteDescription_dv,
      siteDescription_en: body.siteDescription_en,
      registrationNo: body.registrationNo,
      phone: body.phone,
      email: body.email,
      copyright: body.copyright,
      socialLinks: body.socialLinks,
      logo: body.logo,
      logoWhite: body.logoWhite,
      favicon: body.favicon,
      analyticsId: body.analyticsId,
      ...(typeof body.commentsEnabled === 'boolean' ? { commentsEnabled: body.commentsEnabled } : {}),
    },
    create: {
      id: 'default',
      siteName_dv: body.siteName_dv || 'ޒީ ޓައިމްސް',
      siteName_en: body.siteName_en || 'XeeTimes',
      siteDescription_dv: body.siteDescription_dv,
      siteDescription_en: body.siteDescription_en,
      registrationNo: body.registrationNo,
      phone: body.phone,
      email: body.email,
      copyright: body.copyright,
      socialLinks: body.socialLinks,
    },
  });

  await logAudit({ userId: session.user.id, action: 'update', entity: 'Settings', entityId: 'default' });
  return NextResponse.json(settings);
}

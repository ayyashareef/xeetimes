import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const folder = searchParams.get('folder') || '';

  const media = await db.media.findMany({
    where: folder ? { folder } : {},
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: { uploadedBy: { select: { name: true } } },
  });

  return NextResponse.json({ media });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { url, filename, mimeType, size, altText_dv, altText_en } = await request.json();

  const media = await db.media.create({
    data: {
      url,
      filename,
      mimeType,
      size,
      altText_dv,
      altText_en,
      uploadedById: session.user.id,
    },
  });

  await logAudit({ userId: session.user.id, action: 'create', entity: 'Media', entityId: media.id, details: { filename: media.filename } });
  return NextResponse.json(media, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  await db.media.delete({ where: { id } });
  await logAudit({ userId: session.user.id, action: 'delete', entity: 'Media', entityId: id });
  return NextResponse.json({ success: true });
}

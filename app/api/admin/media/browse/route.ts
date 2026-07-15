import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const folder = searchParams.get('folder') || '';
  const search = searchParams.get('search') || '';

  try {
    const where = {
      ...(folder ? { folder } : {}),
      ...(search ? { filename: { contains: search, mode: 'insensitive' as const } } : {}),
    };

    const [media, folderRows] = await Promise.all([
      db.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 300,
        select: { id: true, url: true, filename: true, mimeType: true, size: true, createdAt: true },
      }),
      db.media.findMany({
        where: { folder: { not: null } },
        distinct: ['folder'],
        select: { folder: true },
        orderBy: { folder: 'desc' },
      }),
    ]);

    const files = media.map((m) => ({
      id: m.id,
      url: m.url,
      filename: m.filename,
      name: m.filename,
      mimeType: m.mimeType,
      size: m.size,
      createdAt: m.createdAt.toISOString(),
    }));
    const folders = folderRows.map((f) => f.folder).filter(Boolean);

    return NextResponse.json({ files, folders });
  } catch (error) {
    console.error('Media browse error:', error);
    return NextResponse.json({ files: [], folders: [] });
  }
}

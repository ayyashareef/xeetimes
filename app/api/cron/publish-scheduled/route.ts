import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function GET(request: Request) {
  // Verify cron secret (for Vercel Cron)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  const scheduledArticles = await db.article.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: now },
    },
  });

  let published = 0;

  for (const article of scheduledArticles) {
    await db.article.update({
      where: { id: article.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: article.scheduledAt || now,
      },
    });

    revalidatePath(`/dv/news/${article.slug}`);
    revalidatePath(`/en/news/${article.slug}`);
    revalidatePath('/dv');
    revalidatePath('/en');

    published++;
  }

  return NextResponse.json({
    published,
    message: `Published ${published} scheduled articles`,
  });
}

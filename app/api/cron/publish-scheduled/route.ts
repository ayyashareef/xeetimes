import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function GET(request: Request) {
  // Fails CLOSED. The previous check compared the header against
  // `Bearer ${process.env.CRON_SECRET}` with the secret unset, so the expected
  // value was the literal string "Bearer undefined" — sending exactly that got
  // a 200 and published every scheduled article early. A missing secret now
  // refuses the request instead of accidentally naming one.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('CRON_SECRET is not set — refusing to run the scheduled publisher');
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }
  const authHeader = request.headers.get('authorization') || '';
  const expected = `Bearer ${secret}`;
  // Constant-time compare so the secret cannot be recovered a byte at a time.
  const ok = authHeader.length === expected.length &&
    timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  if (!ok) {
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

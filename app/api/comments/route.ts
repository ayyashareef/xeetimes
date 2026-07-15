import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyTurnstile } from '@/lib/turnstile';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get('articleId');

  if (!articleId) return NextResponse.json({ comments: [] });

  const comments = await db.comment.findMany({
    where: { articleId, isApproved: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      authorName: true,
      content: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  const { articleId, authorName, content, turnstileToken } = await request.json();

  if (!articleId || !authorName || !content) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Cloudflare Turnstile — no-op when TURNSTILE_SECRET_KEY is unset.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  }

  // Sanitize
  const cleanName = authorName.trim().slice(0, 100);
  const cleanContent = content.trim().slice(0, 2000);

  const comment = await db.comment.create({
    data: {
      articleId,
      authorName: cleanName,
      content: cleanContent,
      isApproved: false, // Requires moderation
    },
  });

  return NextResponse.json({ success: true, id: comment.id }, { status: 201 });
}

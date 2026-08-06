import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

// Same cookie the article reactions use: one long-lived id per browser. The
// unique([commentId, sessionId]) constraint is what actually enforces one vote
// per comment — the cookie only identifies who is voting.
function getSessionId(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return (
    cookieStore.get('reaction_session')?.value ||
    `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  );
}

const TYPES = new Set(['LIKE', 'DISLIKE']);

export async function POST(request: Request) {
  const { commentId, type } = await request.json();
  if (!commentId || !TYPES.has(type)) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
  }

  // Only vote on a comment that exists and is visible to readers.
  const comment = await db.comment.findFirst({
    where: { id: commentId, isApproved: true },
    select: { id: true },
  });
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const cookieStore = await cookies();
  const sessionId = getSessionId(cookieStore);

  const existing = await db.commentVote.findUnique({
    where: { commentId_sessionId: { commentId, sessionId } },
  });

  if (existing && existing.type === type) {
    // Same button again — take the vote back.
    await db.commentVote.delete({ where: { id: existing.id } });
  } else if (existing) {
    // Switched from like to dislike (or back).
    await db.commentVote.update({ where: { id: existing.id }, data: { type } });
  } else {
    await db.commentVote.create({ data: { commentId, type, sessionId } });
  }

  const [likes, dislikes] = await Promise.all([
    db.commentVote.count({ where: { commentId, type: 'LIKE' } }),
    db.commentVote.count({ where: { commentId, type: 'DISLIKE' } }),
  ]);

  const mine = existing?.type === type ? null : type;
  const response = NextResponse.json({ success: true, likes, dislikes, mine });
  response.cookies.set('reaction_session', sessionId, { maxAge: 365 * 24 * 60 * 60, path: '/' });
  return response;
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

function getSessionId(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  let sessionId = cookieStore.get('reaction_session')?.value;
  if (!sessionId) {
    sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
  return sessionId;
}

export async function POST(request: Request) {
  const { articleId, type } = await request.json();

  if (!articleId || !type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const sessionId = getSessionId(cookieStore);

  // Check if user already reacted to this article
  const existing = await db.reaction.findUnique({
    where: { articleId_sessionId: { articleId, sessionId } },
  });

  if (existing) {
    if (existing.type === type) {
      // Toggle off - remove reaction
      await db.reaction.delete({ where: { id: existing.id } });
      const response = NextResponse.json({ removed: true });
      response.cookies.set('reaction_session', sessionId, { maxAge: 365 * 24 * 60 * 60, path: '/' });
      return response;
    } else {
      // Change reaction type
      await db.reaction.update({
        where: { id: existing.id },
        data: { type },
      });
      const response = NextResponse.json({ changed: true, type });
      response.cookies.set('reaction_session', sessionId, { maxAge: 365 * 24 * 60 * 60, path: '/' });
      return response;
    }
  }

  // New reaction
  await db.reaction.create({
    data: { articleId, type, sessionId },
  });

  const response = NextResponse.json({ added: true, type });
  response.cookies.set('reaction_session', sessionId, { maxAge: 365 * 24 * 60 * 60, path: '/' });
  return response;
}

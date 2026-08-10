import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

const schema = z.object({
  name: z.string().min(2, 'Name is too short').max(100),
  email: z.string().email('Invalid email').max(255),
  phone: z.string().max(30).optional().or(z.literal('')),
  subject: z.string().min(3, 'Subject is too short').max(200),
  message: z.string().min(10, 'Message is too short').max(2000),
});

export async function POST(request: NextRequest) {
  try {
    // The contact form had length validation but nothing to stop a script
    // submitting it in a loop — every submission is a row in ContactMessage.
    const wait = rateLimit(request, 'contact', 3, 60 * 60_000);
    if (wait !== null) {
      return NextResponse.json(
        { success: false, error: 'Too many messages. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(wait) } },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const { name, email, phone, subject, message } = parsed.data;
    await db.contactMessage.create({
      data: { name, email, phone: phone || null, subject, message },
    });

    return NextResponse.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('[POST /api/contact]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message. Please try again.' },
      { status: 500 },
    );
  }
}

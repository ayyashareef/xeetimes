import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth(() => {
  // Admin route protection is handled by the authorized callback in auth.config.
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};

import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  // Behind nginx + Cloudflare the Host header is the real domain; trust it so
  // Auth.js doesn't reject requests with UntrustedHost in production.
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.avatar = (user as { avatar?: string }).avatar;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
        (session.user as { avatar?: string }).avatar = token.avatar as string | undefined;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdmin = nextUrl.pathname.startsWith('/admin');
      const isAdminApi = nextUrl.pathname.startsWith('/api/admin');

      if (isAdmin || isAdminApi) {
        if (!isLoggedIn) return false;
      }

      return true;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [], // Added in auth.ts with credentials provider
} satisfies NextAuthConfig;

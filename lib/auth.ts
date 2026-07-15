import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { authConfig } from '@/lib/auth.config';
import { verifyTurnstile } from '@/lib/turnstile';
import { verifyPassword } from '@/lib/wp-password';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        turnstileToken: { label: 'Turnstile', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Cloudflare Turnstile — no-op when TURNSTILE_SECRET_KEY is unset.
        const human = await verifyTurnstile(credentials.turnstileToken as string | undefined);
        if (!human) return null;

        // The single login field accepts either an email or a username.
        const identifier = (credentials.email as string).trim();
        const user = await db.user.findFirst({
          where: { OR: [{ email: identifier }, { username: identifier }] },
        });

        if (!user || !user.isActive) return null;

        // Verify against bcrypt (our users) or WordPress hashes ($P$ phpass,
        // $wp$ bcrypt-prehash) imported from the old site.
        const passwordMatch = await verifyPassword(credentials.password as string, user.password);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        };
      },
    }),
  ],
});

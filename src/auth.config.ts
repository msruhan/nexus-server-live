import type { NextAuthConfig } from 'next-auth';

/** Idle session lifetime for admin and user roles (seconds). */
export const SESSION_MAX_AGE_SEC = 60 * 60;

const authUrl =
  process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
const useSecureCookies = authUrl.startsWith('https://');
// Unique names so IndoTeknizi + NexusServer can run on localhost together
// (browser cookies are scoped by host, not port).
const cookiePrefix = useSecureCookies ? '__Secure-nexus.' : 'nexus.';

// Edge-safe config — used by middleware. No Credentials provider,
// no Prisma, no bcrypt here.
export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE_SEC, updateAge: SESSION_MAX_AGE_SEC },
  pages: { signIn: '/login' },
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      name: `${cookiePrefix}csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
  },
  providers: [], // populated in auth.ts at the node-runtime layer
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: string }).id = token.id as string;
        (session.user as { id?: string; role?: string }).role = token.role as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

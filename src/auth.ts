import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifySecondFactor } from '@/lib/auth/verify-2fa';
import { authConfig } from './auth.config';
import {
  canSignInDuringLicenseLock,
  getLicenseEnforcementState,
  isLicenseRuntimeLocked,
} from '@/lib/license-state';

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  totp: z.string().optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        totp: { label: 'TOTP', type: 'text' },
      },
      async authorize(creds) {
        const parsed = credsSchema.safeParse(creds);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase().trim();
        const totp = parsed.data.totp?.trim() ?? '';

        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user || !user.isActive) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.password);
        if (!ok) return null;

        if (user.twoFactorEnabled) {
          const ok2fa = await verifySecondFactor({
            userId: user.id,
            input: totp,
            totpSecret: user.twoFactorSecret,
          });
          if (!ok2fa) return null;
        }

        const licenseState = await getLicenseEnforcementState();
        if (
          isLicenseRuntimeLocked(licenseState) &&
          !canSignInDuringLicenseLock(user.role)
        ) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});

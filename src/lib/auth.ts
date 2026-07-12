import type { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export const authOptions: AuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: Number(process.env.SESSION_MAX_AGE_MINUTES ?? 480) * 60,
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        const username = credentials?.username?.trim();
        const password = credentials?.password ?? '';
        const ipAddress =
          (req?.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
          undefined;

        if (!username || !password) return null;

        const user = await prisma.user.findUnique({
          where: { username },
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        });

        const logAttempt = (success: boolean) =>
          prisma.loginLog.create({
            data: { userId: user?.id, username, success, ipAddress },
          });

        if (!user || user.deletedAt) {
          await logAttempt(false);
          return null;
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await logAttempt(false);
          return null;
        }

        if (!user.isActive) {
          await logAttempt(false);
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);

        if (!valid) {
          const failedCount = user.failedLoginCount + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: failedCount,
              lockedUntil:
                failedCount >= MAX_FAILED_ATTEMPTS
                  ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
                  : null,
            },
          });
          await logAttempt(false);
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
        });
        await logAttempt(true);

        return {
          id: user.id,
          name: user.fullName,
          username: user.username,
          email: user.email ?? undefined,
          roleKey: user.role.key,
          roleName: user.role.name,
          canViewCost: user.canViewCost,
          mustChangePassword: user.mustChangePassword,
          permissions: user.role.permissions.map((rp) => rp.permission.key),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as {
          id: string;
          username: string;
          roleKey: string;
          roleName: string;
          canViewCost: boolean;
          mustChangePassword: boolean;
          permissions: string[];
        };
        token.userId = u.id;
        token.username = u.username;
        token.roleKey = u.roleKey;
        token.roleName = u.roleName;
        token.canViewCost = u.canViewCost;
        token.mustChangePassword = u.mustChangePassword;
        token.permissions = u.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.username = token.username as string;
        session.user.roleKey = token.roleKey as string;
        session.user.roleName = token.roleName as string;
        session.user.canViewCost = token.canViewCost as boolean;
        session.user.mustChangePassword = token.mustChangePassword as boolean;
        session.user.permissions = (token.permissions as string[]) ?? [];
      }
      return session;
    },
  },
};

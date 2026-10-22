import { verify } from 'argon2';
import { AppError } from '../errors/AppError.ts';
import type {
  UserRole,
  LoginInput,
  UpdateProfileInput,
} from '../schemas/authSchema.ts';
import { parseSessionEnv } from '../config/env.ts';
import {
  newRefreshToken,
  nextRefreshToken,
  refreshReuseWindowMs,
  hashRefreshToken,
  signAccessToken,
  readAccessToken,
  accessLifetimeSeconds,
  sessionLifetimeMs,
} from '../utils/sessionTokens.ts';
import type { db as database } from '../prisma/db.ts';
type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];
const decoyHash =
  '$argon2id$v=19$m=65536,p=1,t=3$C9dvqS5ukKaSWq0Gdjcl+g$5vg9xVhtrFj7JUmajFHKJY5jVscmNVnFlIvKrnQP9/o';
function unauthorized() {
  return new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
}
function publicUser(user: {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  language: string;
  emailVerifiedAt: string | null;
  createdAt: string;
}) {
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    language: user.language,
    emailVerifiedAt: user.emailVerifiedAt
      ? new Date(user.emailVerifiedAt).toISOString()
      : null,
    createdAt: new Date(user.createdAt).toISOString(),
  };
}
export type AuthContext = {
  user: ReturnType<typeof publicUser>;
  sessionId: string;
};
async function issueTokens(
  tx: Transaction,
  user: Parameters<typeof publicUser>[0],
  session: { id: string; expiresAt: string },
  refreshToken = newRefreshToken(),
) {
  await tx.orm.public.RefreshToken.create({
    sessionId: session.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: session.expiresAt,
  });
  return tokenResponse(user, session, refreshToken);
}
async function tokenResponse(
  user: Parameters<typeof publicUser>[0],
  session: { id: string; expiresAt: string },
  refreshToken: string,
) {
  return {
    user: publicUser(user),
    accessToken: await signAccessToken(user.id, session.id, user.role),
    expiresIn: accessLifetimeSeconds,
    refreshToken,
    refreshExpiresAt: new Date(session.expiresAt).toISOString(),
  };
}
export const sessionService = {
  async login({ email, password }: LoginInput) {
    parseSessionEnv(process.env);
    const { db } = await import('../prisma/db.ts');
    const result = await db.transaction(async (tx) => {
      await tx.execute(
        db.raw.sql`SELECT pg_advisory_xact_lock(hashtextextended(${email}, 0))`
          .affectedCount()
          .build(),
      );
      const user = await tx.orm.public.User.where({ email }).first();
      const validPassword = await verify(
        user?.passwordHash ?? decoyHash,
        password,
      );
      if (!user) return null;
      if (user.lockedUntil && Date.parse(user.lockedUntil) > Date.now())
        return null;
      if (!validPassword) {
        const failures = user.lockedUntil
          ? 1
          : Math.min(5, user.loginFailures + 1);
        await tx.orm.public.User.where({ id: user.id }).update({
          loginFailures: failures,
          lockedUntil:
            failures >= 5 ? new Date(Date.now() + 900000).toISOString() : null,
        });
        return null;
      }
      if (!user.emailVerifiedAt || !user.isActive) return null;
      await tx.orm.public.User.where({ id: user.id }).update({
        loginFailures: 0,
        lockedUntil: null,
      });
      const session = await tx.orm.public.Session.create({
        userId: user.id,
        expiresAt: new Date(Date.now() + sessionLifetimeMs).toISOString(),
      });
      return await issueTokens(tx, user, session);
    });
    if (!result)
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'Unable to sign in with these credentials',
      );
    return result;
  },
  async refresh(token: string) {
    parseSessionEnv(process.env);
    const { db } = await import('../prisma/db.ts');
    const candidate = await db.orm.public.RefreshToken.where({
      tokenHash: hashRefreshToken(token),
    }).first();
    if (!candidate) throw unauthorized();
    const result = await db.transaction(async (tx) => {
      await tx.execute(
        db.raw
          .sql`SELECT "id" FROM "public"."Session" WHERE "id" = ${candidate.sessionId} FOR UPDATE`
          .affectedCount()
          .build(),
      );
      const session = await tx.orm.public.Session.where({
        id: candidate.sessionId,
      }).first();
      const current = await tx.orm.public.RefreshToken.where({
        id: candidate.id,
      }).first();
      if (
        !session ||
        !current ||
        session.revokedAt ||
        Date.parse(session.expiresAt) <= Date.now() ||
        Date.parse(current.expiresAt) <= Date.now()
      )
        return null;
      const user = await tx.orm.public.User.where({
        id: session.userId,
      }).first();
      if (!user || !user.isActive || !user.emailVerifiedAt) {
        await tx.orm.public.Session.where({ id: session.id }).update({
          revokedAt: new Date().toISOString(),
        });
        return null;
      }
      const successorToken = nextRefreshToken(token);
      if (current.usedAt) {
        const age = Date.now() - Date.parse(current.usedAt);
        if (age >= 0 && age <= refreshReuseWindowMs) {
          const successor = await tx.orm.public.RefreshToken.where({
            sessionId: session.id,
            tokenHash: hashRefreshToken(successorToken),
            usedAt: null,
          }).first();
          // Only the immediate, still-unused successor can be recovered. Never rotate again.
          if (successor && Date.parse(successor.expiresAt) > Date.now())
            return await tokenResponse(user, session, successorToken);
        }
        await tx.orm.public.Session.where({ id: session.id }).update({
          revokedAt: new Date().toISOString(),
        });
        return null; // Commit replay revocation before responding 401.
      }
      await tx.orm.public.RefreshToken.where({ id: current.id }).update({
        usedAt: new Date().toISOString(),
      });
      return await issueTokens(tx, user, session, successorToken);
    });
    if (!result) throw unauthorized();
    return result;
  },
  async authenticateAccessToken(token: string): Promise<AuthContext> {
    let claims;
    try {
      claims = await readAccessToken(token);
    } catch {
      throw unauthorized();
    }
    const { db } = await import('../prisma/db.ts');
    const session = await db.orm.public.Session.where({
      id: claims.sessionId,
      userId: claims.userId,
    })
      .include('user')
      .first();
    if (
      !session ||
      session.revokedAt ||
      Date.parse(session.expiresAt) <= Date.now() ||
      !session.user.isActive ||
      !session.user.emailVerifiedAt
    )
      throw unauthorized();
    return { user: publicUser(session.user), sessionId: session.id };
  },
  async updateProfile(userId: string, input: UpdateProfileInput) {
    const { db } = await import('../prisma/db.ts');
    // Identity comes from requireAuth, never the submitted body. Only these fields can change.
    const user = await db.orm.public.User.where({
      id: userId,
      isActive: true,
    }).update({
      name: input.name,
      phone: input.phone,
    });
    if (!user) throw unauthorized();
    return publicUser(user);
  },
  async logout(token?: string): Promise<void> {
    if (!token) return;
    const { db } = await import('../prisma/db.ts');
    const refresh = await db.orm.public.RefreshToken.where({
      tokenHash: hashRefreshToken(token),
    }).first();
    if (refresh)
      await db.orm.public.Session.where({ id: refresh.sessionId }).update({
        revokedAt: new Date().toISOString(),
      });
  },
  async logoutAll(userId: string): Promise<void> {
    const { db } = await import('../prisma/db.ts');
    const user = await db.orm.public.User.where({ id: userId }).first();
    if (!user) return;
    await db.transaction(async (tx) => {
      await tx.execute(
        db.raw
          .sql`SELECT pg_advisory_xact_lock(hashtextextended(${user.email}, 0))`
          .affectedCount()
          .build(),
      );
      await tx.orm.public.Session.where({ userId, revokedAt: null }).updateAll({
        revokedAt: new Date().toISOString(),
      });
    });
  },
};
export type SessionService = typeof sessionService;

import { hash, argon2id } from 'argon2';
import { AppError } from '../errors/AppError.ts';
import { parseAuthEnv } from '../config/env.ts';
import {
  newVerificationCode,
  hashPasswordResetCode,
  matchesPasswordResetCode,
  encryptPasswordResetCode,
} from '../utils/authCrypto.ts';
import type { ResetPasswordInput } from '../schemas/passwordResetSchema.ts';
export const passwordResetService = {
  async requestReset(email: string): Promise<void> {
    parseAuthEnv(process.env);
    const { db } = await import('../prisma/db.ts');
    await db.transaction(async (tx) => {
      await tx.execute(
        db.raw.sql`SELECT pg_advisory_xact_lock(hashtextextended(${email}, 0))`
          .affectedCount()
          .build(),
      );
      const user = await tx.orm.public.User.where({ email }).first();
      if (!user || !user.isActive) return;
      const previous = await tx.orm.public.PasswordReset.where({
        userId: user.id,
      }).first();
      const now = Date.now();
      const sameWindow =
        previous && now - Date.parse(previous.windowStartedAt) < 3600000;
      if (
        previous &&
        (Date.parse(previous.resendAfter) > now ||
          (sameWindow && previous.sendCount >= 5))
      )
        return;
      let code = newVerificationCode();
      while (
        previous?.codeHash &&
        hashPasswordResetCode(user.id, code) === previous.codeHash
      )
        code = newVerificationCode();
      const challenge = {
        userId: user.id,
        codeHash: hashPasswordResetCode(user.id, code),
        expiresAt: new Date(now + 600000).toISOString(),
        consumedAt: null,
        attempts: 0,
        resendAfter: new Date(now + 60000).toISOString(),
        windowStartedAt: sameWindow
          ? previous.windowStartedAt
          : new Date(now).toISOString(),
        sendCount: sameWindow ? previous.sendCount + 1 : 1,
      };
      if (previous)
        await tx.orm.public.PasswordReset.where({ id: previous.id }).update(
          challenge,
        );
      else await tx.orm.public.PasswordReset.create(challenge);
      await tx.orm.public.EmailOutbox.where({
        userId: user.id,
        purpose: 'PASSWORD_RESET',
      }).deleteAll();
      await tx.orm.public.EmailOutbox.create({
        userId: user.id,
        purpose: 'PASSWORD_RESET',
        encryptedCode: encryptPasswordResetCode(user.id, code),
        expiresAt: challenge.expiresAt,
      });
    });
  },
  async resetPassword({
    email,
    code,
    newPassword,
  }: ResetPasswordInput): Promise<void> {
    parseAuthEnv(process.env);
    const passwordHash = await hash(newPassword, {
      type: argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
    const { db } = await import('../prisma/db.ts');
    const reset = await db.transaction(async (tx) => {
      await tx.execute(
        db.raw.sql`SELECT pg_advisory_xact_lock(hashtextextended(${email}, 0))`
          .affectedCount()
          .build(),
      );
      const user = await tx.orm.public.User.where({ email }).first();
      if (!user || !user.isActive) return false;
      const challenge = await tx.orm.public.PasswordReset.where({
        userId: user.id,
      }).first();
      if (
        !challenge ||
        challenge.consumedAt ||
        !challenge.codeHash ||
        challenge.attempts >= 5 ||
        Date.parse(challenge.expiresAt) <= Date.now()
      )
        return false;
      if (!matchesPasswordResetCode(user.id, code, challenge.codeHash)) {
        await tx.orm.public.PasswordReset.where({ id: challenge.id }).update({
          attempts: challenge.attempts + 1,
        });
        return false;
      }
      const now = new Date().toISOString();
      // Proving mailbox ownership also recovers a pending, unverified registration.
      await tx.orm.public.User.where({ id: user.id }).update({
        passwordHash,
        emailVerifiedAt: user.emailVerifiedAt ?? now,
        loginFailures: 0,
        lockedUntil: null,
      });
      await tx.orm.public.Session.where({
        userId: user.id,
        revokedAt: null,
      }).updateAll({ revokedAt: now });
      await tx.orm.public.PasswordReset.where({ id: challenge.id }).update({
        codeHash: null,
        consumedAt: now,
      });
      await tx.orm.public.EmailVerification.where({
        userId: user.id,
      }).deleteAll();
      for (const purpose of ['VERIFY_EMAIL', 'PASSWORD_RESET'] as const)
        await tx.orm.public.EmailOutbox.where({
          userId: user.id,
          purpose,
        }).deleteAll();
      await tx.orm.public.EmailOutbox.create({
        userId: user.id,
        purpose: 'PASSWORD_CHANGED',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });
      return true;
    });
    if (!reset)
      throw new AppError(
        400,
        'INVALID_RESET_CODE',
        'Invalid or expired password reset code',
      );
  },
};
export type PasswordResetService = typeof passwordResetService;

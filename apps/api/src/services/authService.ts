import { lockAccountEmail } from './accountSecurity.ts';
import { hash, argon2id } from 'argon2';
import type { db as database } from '../prisma/db.ts';
import type {
  RegisterInput,
  VerifyEmailInput,
  ResendVerificationInput,
} from '../schemas/authSchema.ts';
import { AppError } from '../errors/AppError.ts';
import {
  newVerificationCode,
  hashVerificationCode,
  matchesVerificationCode,
  encryptVerificationCode,
} from '../utils/authCrypto.ts';
type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];
async function queueVerification(
  tx: Transaction,
  userId: string,
  previous: {
    id: string;
    windowStartedAt: string;
    sendCount: number;
    codeHash: string | null;
  } | null,
) {
  const now = Date.now();
  let code = newVerificationCode();
  while (
    previous?.codeHash &&
    hashVerificationCode(userId, code) === previous.codeHash
  )
    code = newVerificationCode();
  const sameWindow =
    previous && now - Date.parse(previous.windowStartedAt) < 3600000;
  const challenge = {
    userId,
    codeHash: hashVerificationCode(userId, code),
    expiresAt: new Date(now + 600000).toISOString(),
    attempts: 0,
    resendAfter: new Date(now + 60000).toISOString(),
    windowStartedAt: sameWindow
      ? previous.windowStartedAt
      : new Date(now).toISOString(),
    sendCount: sameWindow ? previous.sendCount + 1 : 1,
  };
  // Replacing the code invalidates every older queued/sent verification email.
  await tx.orm.public.EmailOutbox.where({
    userId,
    purpose: 'VERIFY_EMAIL',
  }).deleteAll();
  const verification = previous
    ? await tx.orm.public.EmailVerification.where({ id: previous.id }).update(
        challenge,
      )
    : await tx.orm.public.EmailVerification.create(challenge);
  if (!verification) throw new Error('Verification record missing');
  await tx.orm.public.EmailOutbox.create({
    userId,
    encryptedCode: encryptVerificationCode(userId, code),
    expiresAt: challenge.expiresAt,
  });
  return verification.id;
}
export const authService = {
  async register(input: RegisterInput): Promise<string> {
    // Keep expensive hashing outside the transaction and email lock.
    const passwordHash = await hash(input.password, {
      type: argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
    const { db } = await import('../prisma/db.ts');
    return await db.transaction(async (tx) => {
      await lockAccountEmail(tx, db, input.email);
      if (await tx.orm.public.User.where({ email: input.email }).first())
        throw new AppError(
          409,
          'EMAIL_ALREADY_EXISTS',
          'Email address is already registered',
        );
      const user = await tx.orm.public.User.create({
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        language: input.language,
      });
      return await queueVerification(tx, user.id, null);
    });
  },
  async resendVerification({
    email,
    verificationId,
  }: ResendVerificationInput): Promise<void> {
    const { db } = await import('../prisma/db.ts');
    await db.transaction(async (tx) => {
      await lockAccountEmail(tx, db, email);
      const user = await tx.orm.public.User.where({ email }).first();
      if (!user || user.emailVerifiedAt) return;
      const previous = await tx.orm.public.EmailVerification.where({
        userId: user.id,
      }).first();
      if (!previous || previous.id !== verificationId) return;
      if (
        previous &&
        (Date.parse(previous.resendAfter) > Date.now() ||
          (Date.now() - Date.parse(previous.windowStartedAt) < 3600000 &&
            previous.sendCount >= 5))
      )
        return;
      await queueVerification(tx, user.id, previous);
    });
  },
  async verifyEmail({
    email,
    code,
    verificationId,
  }: VerifyEmailInput): Promise<void> {
    const { db } = await import('../prisma/db.ts');
    const verified = await db.transaction(async (tx) => {
      await lockAccountEmail(tx, db, email);
      const user = await tx.orm.public.User.where({ email }).first();
      if (!user || user.emailVerifiedAt) return false;
      const challenge = await tx.orm.public.EmailVerification.where({
        userId: user.id,
      }).first();
      if (
        !challenge ||
        !challenge.codeHash ||
        challenge.id !== verificationId ||
        challenge.attempts >= 5 ||
        Date.parse(challenge.expiresAt) <= Date.now()
      )
        return false;
      if (!matchesVerificationCode(user.id, code, challenge.codeHash)) {
        await tx.orm.public.EmailVerification.where({
          id: challenge.id,
        }).update({ attempts: challenge.attempts + 1 });
        return false; // Commit the failed attempt; throwing here would roll it back.
      }
      await tx.orm.public.User.where({ id: user.id }).update({
        emailVerifiedAt: new Date().toISOString(),
      });
      await tx.orm.public.EmailVerification.where({
        id: challenge.id,
      }).delete();
      await tx.orm.public.EmailOutbox.where({
        userId: user.id,
        purpose: 'VERIFY_EMAIL',
      }).deleteAll();
      return true;
    });
    if (!verified)
      throw new AppError(
        400,
        'INVALID_VERIFICATION_CODE',
        'Invalid or expired verification code',
      );
  },
};
export type AuthService = typeof authService;

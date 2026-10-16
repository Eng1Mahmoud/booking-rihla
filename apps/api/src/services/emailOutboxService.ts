import {
  decryptVerificationCode,
  matchesVerificationCode,
  decryptPasswordResetCode,
  matchesPasswordResetCode,
} from '../utils/authCrypto.ts';
import { sendAccountMail, type SendAccountMail } from './mailService.ts';

export async function processEmailOutbox(
  send: SendAccountMail = sendAccountMail,
  userId?: string,
) {
  const { db } = await import('../prisma/db.ts');
  const query = db.orm.public.EmailOutbox.where({
    sentAt: null,
    discardedAt: null,
  }).where((email) => email.nextAttemptAt.lte(new Date().toISOString()));
  const pending = await (userId ? query.where({ userId }) : query)
    .orderBy((email) => email.createdAt.asc())
    .limit(20)
    .all();
  const counts = { sent: 0, failed: 0, discarded: 0 };
  for (const candidate of pending) {
    const outcome = await db.transaction(async (tx) => {
      await tx.execute(
        db.raw
          .sql`SELECT "id" FROM "public"."EmailOutbox" WHERE "id" = ${candidate.id} FOR UPDATE`
          .affectedCount()
          .build(),
      );
      const message = await tx.orm.public.EmailOutbox.where({
        id: candidate.id,
      }).first();
      if (
        !message ||
        message.sentAt ||
        message.discardedAt ||
        Date.parse(message.nextAttemptAt) > Date.now()
      )
        return null;
      async function discard() {
        await tx.orm.public.EmailOutbox.where({ id: candidate.id }).update({
          discardedAt: new Date().toISOString(),
          encryptedCode: null,
        });
        return 'discarded' as const;
      }
      const user = await tx.orm.public.User.where({
        id: message.userId,
      }).first();
      if (
        !user ||
        message.attempts >= 5 ||
        Date.parse(message.expiresAt) <= Date.now()
      )
        return await discard();
      try {
        let code: string | undefined;
        if (message.purpose !== 'PASSWORD_CHANGED') {
          if (!user.isActive || !message.encryptedCode) return await discard();
          if (message.purpose === 'VERIFY_EMAIL') {
            const verification = await tx.orm.public.EmailVerification.where({
              userId: user.id,
            }).first();
            if (
              user.emailVerifiedAt ||
              !verification ||
              verification.attempts >= 5 ||
              Date.parse(verification.expiresAt) <= Date.now()
            )
              return await discard();
            code = decryptVerificationCode(user.id, message.encryptedCode);
            if (!matchesVerificationCode(user.id, code, verification.codeHash))
              return await discard();
          } else {
            const reset = await tx.orm.public.PasswordReset.where({
              userId: user.id,
            }).first();
            if (
              !reset ||
              reset.consumedAt ||
              !reset.codeHash ||
              reset.attempts >= 5 ||
              Date.parse(reset.expiresAt) <= Date.now()
            )
              return await discard();
            code = decryptPasswordResetCode(user.id, message.encryptedCode);
            if (!matchesPasswordResetCode(user.id, code, reset.codeHash))
              return await discard();
          }
        }
        await send({
          id: message.id,
          email: user.email,
          language: user.language,
          purpose: message.purpose,
          ...(code ? { code } : {}),
        });
        await tx.orm.public.EmailOutbox.where({ id: message.id }).update({
          sentAt: new Date().toISOString(),
          attempts: message.attempts + 1,
          encryptedCode: null,
        });
        return 'sent' as const;
      } catch {
        const attempts = message.attempts + 1;
        await tx.orm.public.EmailOutbox.where({ id: message.id }).update({
          attempts,
          nextAttemptAt: new Date(
            Date.now() + Math.min(900000, 30000 * 2 ** (attempts - 1)),
          ).toISOString(),
          ...(attempts >= 5
            ? { discardedAt: new Date().toISOString(), encryptedCode: null }
            : {}),
        });
        return 'failed' as const;
      }
    });
    if (outcome) counts[outcome]++;
  }
  return counts;
}

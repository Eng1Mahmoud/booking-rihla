import {
  decryptVerificationCode,
  matchesVerificationCode,
} from '../utils/authCrypto.ts';
import {
  sendVerificationMail,
  type SendVerificationMail,
} from './mailService.ts';

export async function processEmailOutbox(
  send: SendVerificationMail = sendVerificationMail,
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
      const user = await tx.orm.public.User.where({
        id: message.userId,
      }).first();
      const verification = await tx.orm.public.EmailVerification.where({
        userId: message.userId,
      }).first();
      if (
        !user ||
        user.emailVerifiedAt ||
        !verification ||
        verification.attempts >= 5 ||
        !message.encryptedCode ||
        message.attempts >= 5 ||
        Date.parse(message.expiresAt) <= Date.now()
      ) {
        await tx.orm.public.EmailOutbox.where({ id: message.id }).update({
          discardedAt: new Date().toISOString(),
          encryptedCode: null,
        });
        return 'discarded' as const;
      }
      try {
        const code = decryptVerificationCode(user.id, message.encryptedCode);
        if (
          !matchesVerificationCode(user.id, code, verification.codeHash) ||
          Date.parse(verification.expiresAt) <= Date.now()
        ) {
          await tx.orm.public.EmailOutbox.where({ id: message.id }).update({
            discardedAt: new Date().toISOString(),
            encryptedCode: null,
          });
          return 'discarded' as const;
        }
        await send({
          id: message.id,
          email: user.email,
          code,
          language: user.language,
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

import { processMailBatch } from './mailDeliveryService.ts';
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
  return processMailBatch(
    db,
    pending,
    'account',
    async ({ tx, message, exhausted }) => {
      const user = await tx.orm.public.User.where({
        id: message.userId,
      }).first();
      if (!user || exhausted || Date.parse(message.expiresAt) <= Date.now())
        return 'discarded' as const;
      return async () => {
        let code: string | undefined;
        if (message.purpose !== 'PASSWORD_CHANGED') {
          if (!user.isActive || !message.encryptedCode)
            return 'discarded' as const;
          if (message.purpose === 'VERIFY_EMAIL') {
            const verification = await tx.orm.public.EmailVerification.where({
              userId: user.id,
            }).first();
            if (
              user.emailVerifiedAt ||
              !verification ||
              !verification.codeHash ||
              verification.attempts >= 5 ||
              Date.parse(verification.expiresAt) <= Date.now()
            )
              return 'discarded' as const;
            code = decryptVerificationCode(user.id, message.encryptedCode);
            if (!matchesVerificationCode(user.id, code, verification.codeHash))
              return 'discarded' as const;
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
              return 'discarded' as const;
            code = decryptPasswordResetCode(user.id, message.encryptedCode);
            if (!matchesPasswordResetCode(user.id, code, reset.codeHash))
              return 'discarded' as const;
          }
        }
        await send({
          id: message.id,
          email: user.email,
          language: user.language,
          purpose: message.purpose,
          ...(code ? { code } : {}),
        });
      };
    },
  );
}

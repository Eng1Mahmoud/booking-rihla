import { lockAccountEmail } from './accountSecurity.ts';
export const authRetentionMs = 24 * 60 * 60 * 1000;
export function authCleanupCutoffs(now: number) {
  if (
    !Number.isFinite(now) ||
    Math.abs(now) > 8640000000000000 - authRetentionMs
  )
    throw new Error('Invalid cleanup timestamp');
  return {
    expiredAt: new Date(now).toISOString(),
    deleteBefore: new Date(now - authRetentionMs).toISOString(),
  };
}
// Each category is bounded separately. Expiry is rechecked after the relevant lock.
export async function cleanupAuthData({
  limit = 100,
  now = Date.now(),
}: { limit?: number; now?: number } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000)
    throw new Error('Invalid cleanup batch size');
  const { expiredAt, deleteBefore } = authCleanupCutoffs(now);
  const { db } = await import('../prisma/db.ts');
  const counts = {
    verificationCodesCleared: 0,
    resetCodesCleared: 0,
    mailCodesCleared: 0,
    expiredEmailsDeleted: 0,
    expiredSessionsDeleted: 0,
  };
  const verifications = await db.orm.public.EmailVerification.where((row) =>
    row.expiresAt.lte(expiredAt),
  )
    .where((row) => row.codeHash.isNotNull())
    .select('id', 'userId')
    .include('user', (user) => user.select('email'))
    .orderBy([(row) => row.expiresAt.asc(), (row) => row.id.asc()])
    .limit(limit)
    .all();
  for (const candidate of verifications) {
    const email = candidate.user?.email;
    if (!email) continue;
    const cleared = await db.transaction(async (tx) => {
      // Same email advisory lock as verify/resend; keep id and throttle state intact.
      await lockAccountEmail(tx, db, email);
      return tx.orm.public.EmailVerification.where({ id: candidate.id })
        .where((row) => row.expiresAt.lte(expiredAt))
        .where((row) => row.codeHash.isNotNull())
        .update({ codeHash: null });
    });
    if (cleared) counts.verificationCodesCleared++;
  }
  const resets = await db.orm.public.PasswordReset.where((row) =>
    row.expiresAt.lte(expiredAt),
  )
    .where((row) => row.codeHash.isNotNull())
    .select('id', 'userId')
    .include('user', (user) => user.select('email'))
    .orderBy([(row) => row.expiresAt.asc(), (row) => row.id.asc()])
    .limit(limit)
    .all();
  for (const candidate of resets) {
    const email = candidate.user?.email;
    if (!email) continue;
    const cleared = await db.transaction(async (tx) => {
      await lockAccountEmail(tx, db, email);
      return tx.orm.public.PasswordReset.where({ id: candidate.id })
        .where((row) => row.expiresAt.lte(expiredAt))
        .where((row) => row.codeHash.isNotNull())
        .update({ codeHash: null });
    });
    if (cleared) counts.resetCodesCleared++;
  }
  const emails = await db.orm.public.EmailOutbox.where((row) =>
    row.expiresAt.lte(expiredAt),
  )
    .where((row) => row.encryptedCode.isNotNull())
    .select('id')
    .orderBy([(row) => row.expiresAt.asc(), (row) => row.id.asc()])
    .limit(limit)
    .all();
  for (const candidate of emails) {
    const cleared = await db.transaction(async (tx) => {
      // Do not take the account advisory lock after an outbox row lock.
      await tx.execute(
        db.raw
          .sql`SELECT "id" FROM "public"."EmailOutbox" WHERE "id" = ${candidate.id} FOR UPDATE`
          .affectedCount()
          .build(),
      );
      return tx.orm.public.EmailOutbox.where({ id: candidate.id })
        .where((row) => row.expiresAt.lte(expiredAt))
        .where((row) => row.encryptedCode.isNotNull())
        .update({ encryptedCode: null });
    });
    if (cleared) counts.mailCodesCleared++;
  }
  const oldEmails = await db.orm.public.EmailOutbox.where((row) =>
    row.expiresAt.lte(deleteBefore),
  )
    .select('id')
    .orderBy([(row) => row.expiresAt.asc(), (row) => row.id.asc()])
    .limit(limit)
    .all();
  for (const candidate of oldEmails) {
    const removed = await db.transaction(async (tx) => {
      await tx.execute(
        db.raw
          .sql`SELECT "id" FROM "public"."EmailOutbox" WHERE "id" = ${candidate.id} FOR UPDATE`
          .affectedCount()
          .build(),
      );
      return tx.orm.public.EmailOutbox.where({ id: candidate.id })
        .where((row) => row.expiresAt.lte(deleteBefore))
        .delete();
    });
    if (removed) counts.expiredEmailsDeleted++;
  }
  const sessions = await db.orm.public.Session.where((row) =>
    row.expiresAt.lte(deleteBefore),
  )
    .select('id')
    .orderBy([(row) => row.expiresAt.asc(), (row) => row.id.asc()])
    .limit(limit)
    .all();
  for (const candidate of sessions) {
    const removed = await db.transaction(async (tx) => {
      // Refresh locks this same Session first. Never delete used tokens by usedAt.
      await tx.execute(
        db.raw
          .sql`SELECT "id" FROM "public"."Session" WHERE "id" = ${candidate.id} FOR UPDATE`
          .affectedCount()
          .build(),
      );
      // FK cascade removes only this expired session's refresh-token family.
      return tx.orm.public.Session.where({ id: candidate.id })
        .where((row) => row.expiresAt.lte(deleteBefore))
        .delete();
    });
    if (removed) counts.expiredSessionsDeleted++;
  }
  return counts;
}

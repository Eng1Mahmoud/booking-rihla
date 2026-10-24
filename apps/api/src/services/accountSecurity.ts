import type { db as database } from '../prisma/db.ts';

type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];

// Use the existing account email key, before User/Session row locks.
// Staff management takes lockAdministrators first; Refresh keeps its Session lock.
export async function lockAccountEmail(
  tx: Transaction,
  db: typeof database,
  email: string,
) {
  await tx.execute(
    db.raw.sql`SELECT pg_advisory_xact_lock(hashtextextended(${email}, 0))`
      .affectedCount()
      .build(),
  );
}

// The caller owns the transaction and decides when revocation is required.
// Password reset supplies its existing timestamp for all related updates.
export function revokeAccountSessions(
  tx: Transaction,
  userId: string,
  revokedAt = new Date().toISOString(),
) {
  return tx.orm.public.Session.where({ userId, revokedAt: null }).updateAll({
    revokedAt,
  });
}

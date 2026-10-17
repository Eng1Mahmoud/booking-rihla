import type { db as database } from '../prisma/db.ts';
type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];
// Shared with local bootstrap; serialize staff changes before taking account/email locks.
export async function lockAdministrators(tx: Transaction, db: typeof database) {
  await tx.execute(
    db.raw
      .sql`SELECT pg_advisory_xact_lock(hashtextextended('bus-platform:first-super-admin', 0))`
      .affectedCount()
      .build(),
  );
}

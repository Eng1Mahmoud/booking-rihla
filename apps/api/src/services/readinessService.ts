import { setTimeout as delay } from 'node:timers/promises';
let pending: Promise<void> | undefined;
async function probe() {
  const { db } = await import('../prisma/db.ts');
  await db.transaction(async (tx) => {
    await tx.execute(
      db.raw.sql`SET LOCAL statement_timeout = '2000ms'`
        .affectedCount()
        .build(),
    );
    await tx.execute(db.raw.sql`SELECT 1`.affectedCount().build());
  });
}
export const readinessService = {
  async check(): Promise<void> {
    // Share one probe while connecting, so repeated checks cannot exhaust the pool.
    pending ??= probe().finally(() => {
      pending = undefined;
    });
    const controller = new AbortController();
    const timeout = delay(2500, undefined, { signal: controller.signal }).then(
      () => {
        throw new Error('Readiness timeout');
      },
    );
    try {
      await Promise.race([pending, timeout]);
    } finally {
      controller.abort();
    }
  },
};
export type ReadinessService = typeof readinessService;

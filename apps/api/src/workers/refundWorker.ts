import { setTimeout as delay } from 'node:timers/promises';
import { configuredRefundService } from '../services/refundService.ts';
let stopping = false;
const stop = new AbortController();
process.once('SIGINT', () => {
  stopping = true;
  stop.abort();
});
process.once('SIGTERM', () => {
  stopping = true;
  stop.abort();
});
const once = process.argv.includes('--once');
let close: (() => Promise<void>) | undefined;
try {
  const service = configuredRefundService();
  const { db } = await import('../prisma/db.ts');
  close = () => db.close();
  do {
    const rows = await db.orm.public.Refund.where((r) =>
      r.status.in(['REQUESTED', 'UNKNOWN']),
    )
      .orderBy((r) => r.updatedAt.asc())
      .limit(20)
      .all();
    for (const row of rows) {
      if (stopping) break;
      try {
        await service.reconcile(row.id);
      } catch {
        console.error('Refund inquiry failed');
        if (once) process.exitCode = 1;
      }
    }
    if (once || stopping) break;
    await delay(30000, undefined, { signal: stop.signal }).catch(() => {});
  } while (!stopping);
} catch {
  console.error('Refund worker unavailable; check TEST configuration');
  process.exitCode = 1;
} finally {
  await close?.();
}

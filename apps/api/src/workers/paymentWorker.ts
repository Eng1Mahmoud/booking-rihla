import { setTimeout as delay } from 'node:timers/promises';
import { configuredPaymentReconciliation } from '../services/paymentReconciliationService.ts';
const once = process.argv.includes('--once');
let stopping = false;
const stop = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    stopping = true;
    stop.abort();
  });
let opened = false;
try {
  const service = configuredPaymentReconciliation();
  if (!service)
    console.log(
      'Payment reconciliation is disabled. No provider request was sent.',
    );
  else {
    opened = true;
    do {
      try {
        const result = await service.runBatch();
        if (!once && (result.failed || result.review || result.mismatched))
          console.error('Payment reconciliation needs attention');
        if (once) {
          console.log(JSON.stringify(result));
          if (
            result.failed ||
            result.retry ||
            result.review ||
            result.mismatched
          )
            process.exitCode = 1;
        }
      } catch {
        console.error('Payment reconciliation failed');
        if (once) process.exitCode = 1;
      }
      if (!once && !stopping)
        await delay(30000, undefined, { signal: stop.signal }).catch(() => {});
    } while (!once && !stopping);
  }
} catch {
  console.error('Payment reconciliation configuration is invalid');
  process.exitCode = 1;
} finally {
  if (opened) {
    const { db } = await import('../prisma/db.ts');
    await db.close();
  }
}

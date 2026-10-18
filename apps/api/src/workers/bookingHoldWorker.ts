import { setTimeout as delay } from 'node:timers/promises';
import { expireBookingHolds } from '../services/bookingHoldService.ts';
// Lazy expiry on checkout keeps correctness even when this optional worker is stopped.
const once = process.argv.includes('--once');
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
try {
  do {
    try {
      const result = await expireBookingHolds();
      if (once) console.log(JSON.stringify(result));
    } catch {
      console.error('Booking hold expiry failed');
      if (once) {
        process.exitCode = 1;
        break;
      }
    }
    if (!once && !stopping)
      await delay(30000, undefined, { signal: stop.signal }).catch(() => {});
  } while (!once && !stopping);
} finally {
  const { db } = await import('../prisma/db.ts');
  await db.close();
}

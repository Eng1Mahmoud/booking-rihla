import { setTimeout as delay } from 'node:timers/promises';
import { expireBookingHolds } from '../services/bookingHoldService.ts';
// Lazy expiry on checkout keeps correctness even when this optional worker is stopped.
const once = process.argv.includes('--once');
let stopping = false;
process.once('SIGINT', () => {
  stopping = true;
});
process.once('SIGTERM', () => {
  stopping = true;
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
    if (!once && !stopping) await delay(30000);
  } while (!once && !stopping);
} finally {
  const { db } = await import('../prisma/db.ts');
  await db.close();
}

import { processBookingNotices } from '../services/bookingNoticeService.ts';
import { processDepartureReminders } from '../services/departureReminderService.ts';
import { processTicketOutbox } from '../services/ticketOutboxService.ts';
import 'dotenv/config';
import { setTimeout } from 'node:timers/promises';
import { parseAuthEnv } from '../config/env.ts';
import { processEmailOutbox } from '../services/emailOutboxService.ts';
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
let close: (() => Promise<void>) | undefined;
try {
  parseAuthEnv(process.env);
  const { db } = await import('../prisma/db.ts');
  close = () => db.close();
  const once = process.argv.includes('--once');
  const queues = [
    { name: 'booking-notices', process: processBookingNotices },
    { name: 'account', process: processEmailOutbox },
    { name: 'tickets', process: processTicketOutbox },
    { name: 'departure-reminders', process: processDepartureReminders },
  ];
  console.log(
    once ? 'Processing one email outbox batch' : 'Email worker running',
  );
  do {
    const result = { sent: 0, failed: 0, discarded: 0 };
    // A failed queue must not prevent the remaining queues from running.
    for (const queue of queues) {
      try {
        const counts = await queue.process();
        result.sent += counts.sent;
        result.failed += counts.failed;
        result.discarded += counts.discarded;
      } catch {
        console.error(
          `Email queue "${queue.name}" failed; check local database and mail configuration`,
        );
        if (once) process.exitCode = 1;
      }
    }
    if (result.sent || result.failed || result.discarded)
      console.log(JSON.stringify(result));
    if (once || stopping) break;
    await setTimeout(2000, undefined, { signal: stop.signal }).catch(() => {});
  } while (!stopping);
} catch {
  console.error('Email worker could not start; check configuration');
  process.exitCode = 1;
} finally {
  await close?.();
}
